use std::collections::{HashMap, HashSet};

use super::broadphase::SpatialHash;
use super::constraints::{solve_constraints, solve_constraints_position};
use super::integrate::integrate;
use super::narrowphase::{test_collision, test_collision_manifold};
use super::resolve::{
    initialize_contacts, initialize_manifolds, resolve_contacts_position,
    resolve_contacts_velocity_iteration, resolve_manifolds_position,
    resolve_manifolds_velocity_iteration, warm_start_contacts, warm_start_manifolds,
};
use super::sleep::update_sleep;
use super::types::*;

pub struct PhysicsWorld {
    bodies: Vec<Option<RigidBody>>,
    free_ids: Vec<BodyId>,
    next_id: BodyId,
    constraints: Vec<Constraint>,
    next_constraint_id: ConstraintId,
    gravity: (f32, f32),
    fixed_dt: f32,
    accumulator: f32,
    contacts: Vec<Contact>,
    /// Contact manifolds (TGS Soft): proper 2-point contacts with local anchors
    manifolds: Vec<ContactManifold>,
    /// Contacts accumulated across all sub-steps within a frame.
    /// Game code reads this via get_contacts() to see every collision that
    /// occurred during the frame, not just the last sub-step's contacts.
    /// De-duplicated by body pair (first contact per pair wins).
    frame_contacts: Vec<Contact>,
    /// Tracks which body pairs already have a contact in frame_contacts.
    frame_contact_pairs: HashSet<(BodyId, BodyId)>,
    broadphase: SpatialHash,
    solver_iterations: usize,
    /// Warm-start cache: maps (body_a, body_b) → (normal_impulse, friction_impulse)
    /// Legacy cache for single-contact mode
    warm_cache: HashMap<(BodyId, BodyId), (f32, f32)>,
    /// Warm-start cache for manifolds: maps (body_a, body_b, ContactID) → (jn, jt)
    manifold_warm_cache: HashMap<(BodyId, BodyId, ContactID), (f32, f32)>,
    /// Whether to use the new manifold-based solver (TGS Soft)
    use_manifolds: bool,
}

impl PhysicsWorld {
    pub fn new(gravity_x: f32, gravity_y: f32) -> Self {
        Self {
            bodies: Vec::new(),
            free_ids: Vec::new(),
            next_id: 0,
            constraints: Vec::new(),
            next_constraint_id: 0,
            gravity: (gravity_x, gravity_y),
            fixed_dt: 1.0 / 60.0,
            accumulator: 0.0,
            contacts: Vec::new(),
            manifolds: Vec::new(),
            frame_contacts: Vec::new(),
            frame_contact_pairs: HashSet::new(),
            broadphase: SpatialHash::new(64.0),
            // Increased from 6 to 10 for better constraint convergence (ropes/chains).
            // Box2D uses 4 velocity + 2 position with sub-stepping; we use more iterations.
            solver_iterations: 10,
            warm_cache: HashMap::new(),
            manifold_warm_cache: HashMap::new(),
            // Enable manifold solver (TGS Soft Phase 1)
            use_manifolds: true,
        }
    }

    /// Enable or disable the manifold-based solver (TGS Soft).
    /// When disabled, falls back to the legacy single-contact solver.
    pub fn set_use_manifolds(&mut self, use_manifolds: bool) {
        self.use_manifolds = use_manifolds;
    }

    /// Fixed-timestep physics step. Accumulates dt and runs sub-steps as needed.
    /// Uses 4 sub-steps per fixed step (Box2D v3 approach) for improved stack
    /// stability: sub-stepping is more effective than extra solver iterations.
    ///
    /// Contacts are accumulated across all sub-steps (de-duplicated by body pair)
    /// so that game code can see every collision via get_contacts().
    pub fn step(&mut self, dt: f32) {
        self.accumulator += dt;

        // Clear frame-level contact accumulator at the start of each step call
        self.frame_contacts.clear();
        self.frame_contact_pairs.clear();

        while self.accumulator >= self.fixed_dt {
            let sub_dt = self.fixed_dt / 4.0;
            for _ in 0..4 {
                self.sub_step(sub_dt);

                // Accumulate contacts from this sub-step (de-duplicate by pair)
                for contact in &self.contacts {
                    let key = (contact.body_a.min(contact.body_b), contact.body_a.max(contact.body_b));
                    if self.frame_contact_pairs.insert(key) {
                        self.frame_contacts.push(contact.clone());
                    }
                }
            }
            self.accumulator -= self.fixed_dt;
        }
    }

    fn sub_step(&mut self, dt: f32) {
        if self.use_manifolds {
            self.sub_step_manifolds(dt);
        } else {
            self.sub_step_legacy(dt);
        }
    }

    /// Legacy sub-step using single-contact solver
    fn sub_step_legacy(&mut self, dt: f32) {
        // 1. Integrate
        for body in self.bodies.iter_mut().flatten() {
            integrate(body, self.gravity.0, self.gravity.1, dt);
        }

        // 2. Broadphase
        self.broadphase.clear();
        for body in self.bodies.iter().flatten() {
            let (min_x, min_y, max_x, max_y) = get_shape_aabb(body);
            self.broadphase.insert(body.id, min_x, min_y, max_x, max_y);
        }
        let pairs = self.broadphase.get_pairs();

        // 3. Narrowphase
        self.contacts.clear();
        for (id_a, id_b) in pairs {
            let a_idx = id_a as usize;
            let b_idx = id_b as usize;

            // Layer/mask filtering
            let (layer_a, mask_a, sleeping_a) = match &self.bodies[a_idx] {
                Some(b) => (b.layer, b.mask, b.sleeping),
                None => continue,
            };
            let (layer_b, mask_b, sleeping_b) = match &self.bodies[b_idx] {
                Some(b) => (b.layer, b.mask, b.sleeping),
                None => continue,
            };

            // Both layers must pass each other's masks
            if (layer_a & mask_b) == 0 || (layer_b & mask_a) == 0 {
                continue;
            }

            // Skip if both sleeping
            if sleeping_a && sleeping_b {
                continue;
            }

            // We need to borrow both bodies immutably. Use index-based access.
            let body_a = self.bodies[a_idx].as_ref().unwrap();
            let body_b = self.bodies[b_idx].as_ref().unwrap();

            if let Some(contact) = test_collision(body_a, body_b) {
                self.contacts.push(contact);
            }
        }

        // 3b. Sort contacts bottom-up for stack stability.
        self.contacts.sort_by(|a, b| {
            let ay = self.bodies[a.body_a as usize]
                .as_ref()
                .map_or(0.0f32, |body| body.y)
                .max(
                    self.bodies[a.body_b as usize]
                        .as_ref()
                        .map_or(0.0f32, |body| body.y),
                );
            let by = self.bodies[b.body_a as usize]
                .as_ref()
                .map_or(0.0f32, |body| body.y)
                .max(
                    self.bodies[b.body_b as usize]
                        .as_ref()
                        .map_or(0.0f32, |body| body.y),
                );
            by.partial_cmp(&ay).unwrap_or(std::cmp::Ordering::Equal)
        });

        // 3c. Pre-compute velocity bias (restitution) and tangent direction for each contact.
        // Must happen BEFORE warm start so bias reflects post-integration velocities.
        let gravity_mag = (self.gravity.0 * self.gravity.0 + self.gravity.1 * self.gravity.1).sqrt();
        let restitution_threshold = gravity_mag * dt * 1.5;
        initialize_contacts(&self.bodies, &mut self.contacts, restitution_threshold);

        // 3d. Warm start: initialize accumulated impulses from previous frame's cache
        for contact in &mut self.contacts {
            let key = (contact.body_a.min(contact.body_b), contact.body_a.max(contact.body_b));
            if let Some(&(jn, jt)) = self.warm_cache.get(&key) {
                // Scale slightly to avoid overshoot when contacts shift between frames.
                // Island-based sleeping prevents the cascade that made 0.95 problematic
                // with per-body sleeping (no body sleeps until the whole stack settles).
                contact.accumulated_jn = jn * 0.95;
                contact.accumulated_jt = jt * 0.95;
            }
        }
        warm_start_contacts(&mut self.bodies, &self.contacts);

        // 3c. Reset soft constraint accumulated impulses for this sub-step
        // (Soft constraints apply force each sub-step based on current state,
        // not iteratively converge like rigid constraints)
        for constraint in &mut self.constraints {
            match constraint {
                Constraint::Distance { soft: Some(_), accumulated_impulse, .. } => {
                    *accumulated_impulse = 0.0;
                }
                Constraint::Revolute { soft: Some(_), accumulated_impulse, .. } => {
                    *accumulated_impulse = (0.0, 0.0);
                }
                _ => {}
            }
        }

        // 4. Velocity solve (contacts + constraints)
        for i in 0..self.solver_iterations {
            let reverse = i % 2 == 1;
            resolve_contacts_velocity_iteration(&mut self.bodies, &mut self.contacts, reverse);
            solve_constraints(&mut self.bodies, &mut self.constraints, dt);
        }

        // 4b. Save accumulated impulses to warm cache for next frame
        self.warm_cache.clear();
        for contact in &self.contacts {
            let key = (contact.body_a.min(contact.body_b), contact.body_a.max(contact.body_b));
            self.warm_cache.insert(key, (contact.accumulated_jn, contact.accumulated_jt));
        }

        // 5. Position correction (3 iterations per sub-step, matching Box2D v2).
        // With 4 sub-steps per frame, this gives 12 effective position corrections per
        // frame. Combined with a Baumgarte factor of 0.2 (Box2D standard) and max
        // correction clamping, this converges stably for large body stacks.
        for i in 0..3 {
            for contact in &mut self.contacts {
                let a = &self.bodies[contact.body_a as usize];
                let b = &self.bodies[contact.body_b as usize];
                if let (Some(a), Some(b)) = (a, b) {
                    if let Some(fresh) = test_collision(a, b) {
                        contact.penetration = fresh.penetration;
                        contact.normal = fresh.normal;
                        contact.contact_point = fresh.contact_point;
                    } else {
                        contact.penetration = 0.0;
                    }
                }
            }
            resolve_contacts_position(&mut self.bodies, &self.contacts, i % 2 == 1);
            solve_constraints_position(&mut self.bodies, &self.constraints);
        }

        // 6. Post-correction velocity clamping: after position correction, if bodies
        // are still penetrating, zero out any velocity component driving them deeper.
        // This prevents re-introduction of penetration on the next integration step.
        //
        // Contact normal points from body_a toward body_b.
        // Body A "into contact" = toward B = +normal direction.
        // Body B "into contact" = toward A = -normal direction.
        for contact in &self.contacts {
            let a_idx = contact.body_a as usize;
            let b_idx = contact.body_b as usize;

            // Re-test to get fresh penetration
            let still_penetrating = match (&self.bodies[a_idx], &self.bodies[b_idx]) {
                (Some(a), Some(b)) => test_collision(a, b).map_or(false, |c| c.penetration > 0.01),
                _ => false,
            };

            if !still_penetrating {
                continue;
            }

            let (nx, ny) = contact.normal;

            // Clamp velocity of body A: remove component toward B (along +normal)
            if let Some(a) = &mut self.bodies[a_idx] {
                if a.body_type == BodyType::Dynamic {
                    let vn = a.vx * nx + a.vy * ny;
                    if vn > 0.0 {
                        a.vx -= vn * nx;
                        a.vy -= vn * ny;
                    }
                }
            }
            // Clamp velocity of body B: remove component toward A (along -normal)
            if let Some(b) = &mut self.bodies[b_idx] {
                if b.body_type == BodyType::Dynamic {
                    let vn = b.vx * nx + b.vy * ny;
                    if vn < 0.0 {
                        b.vx -= vn * nx;
                        b.vy -= vn * ny;
                    }
                }
            }
        }

        // 7. Update sleep
        update_sleep(&mut self.bodies, &self.contacts, dt);
    }

    /// TGS Soft sub-step using manifold-based solver with 2-point contacts
    fn sub_step_manifolds(&mut self, dt: f32) {
        // 1. Integrate
        for body in self.bodies.iter_mut().flatten() {
            integrate(body, self.gravity.0, self.gravity.1, dt);
        }

        // 2. Broadphase
        self.broadphase.clear();
        for body in self.bodies.iter().flatten() {
            let (min_x, min_y, max_x, max_y) = get_shape_aabb(body);
            self.broadphase.insert(body.id, min_x, min_y, max_x, max_y);
        }
        let pairs = self.broadphase.get_pairs();

        // 3. Narrowphase - generate contact manifolds
        self.manifolds.clear();
        self.contacts.clear(); // Also keep legacy contacts for get_contacts() API
        for (id_a, id_b) in pairs {
            let a_idx = id_a as usize;
            let b_idx = id_b as usize;

            // Layer/mask filtering
            let (layer_a, mask_a, sleeping_a) = match &self.bodies[a_idx] {
                Some(b) => (b.layer, b.mask, b.sleeping),
                None => continue,
            };
            let (layer_b, mask_b, sleeping_b) = match &self.bodies[b_idx] {
                Some(b) => (b.layer, b.mask, b.sleeping),
                None => continue,
            };

            // Both layers must pass each other's masks
            if (layer_a & mask_b) == 0 || (layer_b & mask_a) == 0 {
                continue;
            }

            // Skip if both sleeping
            if sleeping_a && sleeping_b {
                continue;
            }

            let body_a = self.bodies[a_idx].as_ref().unwrap();
            let body_b = self.bodies[b_idx].as_ref().unwrap();

            if let Some(manifold) = test_collision_manifold(body_a, body_b) {
                // Also generate legacy Contact for get_contacts() API
                // Use first contact point from manifold
                if !manifold.points.is_empty() {
                    let point = &manifold.points[0];
                    let cos_a = body_a.angle.cos();
                    let sin_a = body_a.angle.sin();
                    let cpx = point.local_a.0 * cos_a - point.local_a.1 * sin_a + body_a.x;
                    let cpy = point.local_a.0 * sin_a + point.local_a.1 * cos_a + body_a.y;
                    self.contacts.push(Contact {
                        body_a: manifold.body_a,
                        body_b: manifold.body_b,
                        normal: manifold.normal,
                        penetration: point.penetration,
                        contact_point: (cpx, cpy),
                        accumulated_jn: 0.0,
                        accumulated_jt: 0.0,
                        velocity_bias: 0.0,
                        tangent: manifold.tangent,
                    });
                }
                self.manifolds.push(manifold);
            }
        }

        // 3b. Sort manifolds bottom-up for stack stability
        self.manifolds.sort_by(|a, b| {
            let ay = self.bodies[a.body_a as usize]
                .as_ref()
                .map_or(0.0f32, |body| body.y)
                .max(
                    self.bodies[a.body_b as usize]
                        .as_ref()
                        .map_or(0.0f32, |body| body.y),
                );
            let by = self.bodies[b.body_a as usize]
                .as_ref()
                .map_or(0.0f32, |body| body.y)
                .max(
                    self.bodies[b.body_b as usize]
                        .as_ref()
                        .map_or(0.0f32, |body| body.y),
                );
            by.partial_cmp(&ay).unwrap_or(std::cmp::Ordering::Equal)
        });

        // 3c. Pre-compute velocity bias
        let gravity_mag = (self.gravity.0 * self.gravity.0 + self.gravity.1 * self.gravity.1).sqrt();
        let restitution_threshold = gravity_mag * dt * 1.5;
        initialize_manifolds(&self.bodies, &mut self.manifolds, restitution_threshold);

        // 3d. Warm start from cache using ContactID
        for manifold in &mut self.manifolds {
            let pair_key = (
                manifold.body_a.min(manifold.body_b),
                manifold.body_a.max(manifold.body_b),
            );
            for point in &mut manifold.points {
                let key = (pair_key.0, pair_key.1, point.id);
                if let Some(&(jn, jt)) = self.manifold_warm_cache.get(&key) {
                    point.accumulated_jn = jn * 0.95;
                    point.accumulated_jt = jt * 0.95;
                }
            }
        }
        warm_start_manifolds(&mut self.bodies, &self.manifolds);

        // 3e. Reset soft constraint accumulated impulses for this sub-step
        for constraint in &mut self.constraints {
            match constraint {
                Constraint::Distance { soft: Some(_), accumulated_impulse, .. } => {
                    *accumulated_impulse = 0.0;
                }
                Constraint::Revolute { soft: Some(_), accumulated_impulse, .. } => {
                    *accumulated_impulse = (0.0, 0.0);
                }
                _ => {}
            }
        }

        // 4. Velocity solve (manifolds + constraints)
        for i in 0..self.solver_iterations {
            let reverse = i % 2 == 1;
            resolve_manifolds_velocity_iteration(&mut self.bodies, &mut self.manifolds, reverse);
            solve_constraints(&mut self.bodies, &mut self.constraints, dt);
        }

        // 4b. Save accumulated impulses to warm cache
        self.manifold_warm_cache.clear();
        for manifold in &self.manifolds {
            let pair_key = (
                manifold.body_a.min(manifold.body_b),
                manifold.body_a.max(manifold.body_b),
            );
            for point in &manifold.points {
                let key = (pair_key.0, pair_key.1, point.id);
                self.manifold_warm_cache.insert(key, (point.accumulated_jn, point.accumulated_jt));
            }
        }

        // 5. Position correction (re-run narrowphase for accurate penetration)
        // Note: Analytical updating (Phase 4) will eliminate these narrowphase calls
        for i in 0..3 {
            // Re-run narrowphase to get fresh penetration values
            for manifold in &mut self.manifolds {
                let a = &self.bodies[manifold.body_a as usize];
                let b = &self.bodies[manifold.body_b as usize];
                if let (Some(a), Some(b)) = (a, b) {
                    if let Some(fresh) = test_collision_manifold(a, b) {
                        manifold.normal = fresh.normal;
                        manifold.tangent = fresh.tangent;
                        // Update penetrations from fresh manifold
                        for (point, fresh_point) in manifold.points.iter_mut().zip(fresh.points.iter()) {
                            point.penetration = fresh_point.penetration;
                            point.local_a = fresh_point.local_a;
                            point.local_b = fresh_point.local_b;
                        }
                        // Handle point count changes
                        if manifold.points.len() != fresh.points.len() {
                            // Just use fresh points directly
                            manifold.points = fresh.points;
                        }
                    } else {
                        // No longer colliding
                        for point in &mut manifold.points {
                            point.penetration = 0.0;
                        }
                    }
                }
            }
            resolve_manifolds_position(&mut self.bodies, &self.manifolds, i % 2 == 1);
            solve_constraints_position(&mut self.bodies, &self.constraints);
        }

        // 6. Post-correction velocity clamping
        for manifold in &self.manifolds {
            let a_idx = manifold.body_a as usize;
            let b_idx = manifold.body_b as usize;

            // Check if still penetrating via analytical update
            let still_penetrating = manifold.points.iter().any(|p| p.penetration > 0.01);

            if !still_penetrating {
                continue;
            }

            let (nx, ny) = manifold.normal;

            if let Some(a) = &mut self.bodies[a_idx] {
                if a.body_type == BodyType::Dynamic {
                    let vn = a.vx * nx + a.vy * ny;
                    if vn > 0.0 {
                        a.vx -= vn * nx;
                        a.vy -= vn * ny;
                    }
                }
            }
            if let Some(b) = &mut self.bodies[b_idx] {
                if b.body_type == BodyType::Dynamic {
                    let vn = b.vx * nx + b.vy * ny;
                    if vn < 0.0 {
                        b.vx -= vn * nx;
                        b.vy -= vn * ny;
                    }
                }
            }
        }

        // 7. Update sleep
        update_sleep(&mut self.bodies, &self.contacts, dt);
    }

    pub fn add_body(
        &mut self,
        body_type: BodyType,
        shape: Shape,
        x: f32,
        y: f32,
        mass: f32,
        material: Material,
        layer: u16,
        mask: u16,
    ) -> BodyId {
        let id = if let Some(recycled) = self.free_ids.pop() {
            recycled
        } else {
            let id = self.next_id;
            self.next_id += 1;
            id
        };

        let (inv_mass, inertia, inv_inertia) = compute_mass_and_inertia(&shape, mass, body_type);

        let body = RigidBody {
            id,
            body_type,
            shape,
            material,
            x,
            y,
            angle: 0.0,
            vx: 0.0,
            vy: 0.0,
            angular_velocity: 0.0,
            fx: 0.0,
            fy: 0.0,
            torque: 0.0,
            mass,
            inv_mass,
            inertia,
            inv_inertia,
            layer,
            mask,
            sleeping: false,
            sleep_timer: 0.0,
        };

        let idx = id as usize;
        if idx >= self.bodies.len() {
            self.bodies.resize_with(idx + 1, || None);
        }
        self.bodies[idx] = Some(body);
        id
    }

    pub fn remove_body(&mut self, id: BodyId) {
        let idx = id as usize;
        if idx < self.bodies.len() {
            self.bodies[idx] = None;
            self.free_ids.push(id);
        }
    }

    pub fn get_body(&self, id: BodyId) -> Option<&RigidBody> {
        self.bodies.get(id as usize)?.as_ref()
    }

    pub fn get_body_mut(&mut self, id: BodyId) -> Option<&mut RigidBody> {
        self.bodies.get_mut(id as usize)?.as_mut()
    }

    pub fn set_velocity(&mut self, id: BodyId, vx: f32, vy: f32) {
        if let Some(body) = self.get_body_mut(id) {
            body.vx = vx;
            body.vy = vy;
            body.sleeping = false;
            body.sleep_timer = 0.0;
        }
    }

    pub fn set_angular_velocity(&mut self, id: BodyId, av: f32) {
        if let Some(body) = self.get_body_mut(id) {
            body.angular_velocity = av;
            body.sleeping = false;
            body.sleep_timer = 0.0;
        }
    }

    pub fn apply_force(&mut self, id: BodyId, fx: f32, fy: f32) {
        if let Some(body) = self.get_body_mut(id) {
            body.fx += fx;
            body.fy += fy;
            body.sleeping = false;
            body.sleep_timer = 0.0;
        }
    }

    pub fn apply_impulse(&mut self, id: BodyId, ix: f32, iy: f32) {
        if let Some(body) = self.get_body_mut(id) {
            body.vx += ix * body.inv_mass;
            body.vy += iy * body.inv_mass;
            body.sleeping = false;
            body.sleep_timer = 0.0;
        }
    }

    pub fn set_position(&mut self, id: BodyId, x: f32, y: f32) {
        if let Some(body) = self.get_body_mut(id) {
            body.x = x;
            body.y = y;
            body.sleeping = false;
            body.sleep_timer = 0.0;
        }
    }

    pub fn set_collision_layers(&mut self, id: BodyId, layer: u16, mask: u16) {
        if let Some(body) = self.get_body_mut(id) {
            body.layer = layer;
            body.mask = mask;
        }
    }

    pub fn add_constraint(&mut self, constraint: Constraint) -> ConstraintId {
        let id = self.next_constraint_id;
        self.next_constraint_id += 1;

        let constraint = match constraint {
            Constraint::Distance {
                body_a,
                body_b,
                distance,
                anchor_a,
                anchor_b,
                soft,
                ..
            } => Constraint::Distance {
                id,
                body_a,
                body_b,
                distance,
                anchor_a,
                anchor_b,
                soft,
                accumulated_impulse: 0.0,
            },
            Constraint::Revolute {
                body_a,
                body_b,
                anchor_a,
                anchor_b,
                soft,
                ..
            } => Constraint::Revolute {
                id,
                body_a,
                body_b,
                anchor_a,
                anchor_b,
                soft,
                accumulated_impulse: (0.0, 0.0),
            },
        };
        self.constraints.push(constraint);
        id
    }

    pub fn remove_constraint(&mut self, id: ConstraintId) {
        self.constraints.retain(|c| c.id() != id);
    }

    pub fn query_aabb(&self, min_x: f32, min_y: f32, max_x: f32, max_y: f32) -> Vec<BodyId> {
        let mut result = Vec::new();
        for body in self.bodies.iter().flatten() {
            let (bmin_x, bmin_y, bmax_x, bmax_y) = get_shape_aabb(body);
            if bmax_x >= min_x && bmin_x <= max_x && bmax_y >= min_y && bmin_y <= max_y {
                result.push(body.id);
            }
        }
        result
    }

    pub fn raycast(
        &self,
        ox: f32,
        oy: f32,
        dx: f32,
        dy: f32,
        max_dist: f32,
    ) -> Option<(BodyId, f32, f32, f32)> {
        let dir_len = (dx * dx + dy * dy).sqrt();
        if dir_len < 1e-8 {
            return None;
        }
        let ndx = dx / dir_len;
        let ndy = dy / dir_len;

        let mut closest: Option<(BodyId, f32, f32, f32)> = None;

        for body in self.bodies.iter().flatten() {
            let t = match &body.shape {
                Shape::Circle { radius } => {
                    ray_vs_circle(ox, oy, ndx, ndy, body.x, body.y, *radius)
                }
                Shape::AABB { half_w, half_h } => {
                    ray_vs_aabb(ox, oy, ndx, ndy, body.x, body.y, *half_w, *half_h)
                }
                Shape::Polygon { vertices } => {
                    ray_vs_polygon(ox, oy, ndx, ndy, body, vertices)
                }
            };

            if let Some(t) = t {
                if t >= 0.0 && t <= max_dist {
                    let hit_x = ox + ndx * t;
                    let hit_y = oy + ndy * t;
                    if closest.is_none() || t < closest.unwrap().3 {
                        closest = Some((body.id, hit_x, hit_y, t));
                    }
                }
            }
        }
        closest
    }

    /// Return all contacts that occurred during the last step() call.
    /// Accumulated across all sub-steps, de-duplicated by body pair.
    /// This ensures game code sees every collision, even if the bodies
    /// separated during a later sub-step.
    pub fn get_contacts(&self) -> &[Contact] {
        &self.frame_contacts
    }

    /// Return all contact manifolds from the last sub-step.
    /// Each manifold contains up to 2 contact points with feature-based IDs.
    /// Useful for debugging and visualization.
    pub fn get_manifolds(&self) -> &[ContactManifold] {
        &self.manifolds
    }

    /// Return all active (non-None) bodies.
    pub fn all_bodies(&self) -> Vec<&RigidBody> {
        self.bodies.iter().filter_map(|b| b.as_ref()).collect()
    }

    /// Return the world gravity.
    pub fn gravity(&self) -> (f32, f32) {
        self.gravity
    }

    /// Return the number of active bodies.
    pub fn body_count(&self) -> usize {
        self.bodies.iter().filter(|b| b.is_some()).count()
    }
}

fn ray_vs_circle(
    ox: f32, oy: f32,
    dx: f32, dy: f32,
    cx: f32, cy: f32,
    radius: f32,
) -> Option<f32> {
    let fx = ox - cx;
    let fy = oy - cy;
    let a = dx * dx + dy * dy;
    let b = 2.0 * (fx * dx + fy * dy);
    let c = fx * fx + fy * fy - radius * radius;
    let discriminant = b * b - 4.0 * a * c;
    if discriminant < 0.0 {
        return None;
    }
    let sqrt_d = discriminant.sqrt();
    let t1 = (-b - sqrt_d) / (2.0 * a);
    let t2 = (-b + sqrt_d) / (2.0 * a);
    if t1 >= 0.0 {
        Some(t1)
    } else if t2 >= 0.0 {
        Some(t2)
    } else {
        None
    }
}

fn ray_vs_aabb(
    ox: f32, oy: f32,
    dx: f32, dy: f32,
    cx: f32, cy: f32,
    hw: f32, hh: f32,
) -> Option<f32> {
    let min_x = cx - hw;
    let max_x = cx + hw;
    let min_y = cy - hh;
    let max_y = cy + hh;

    let (mut tmin, mut tmax) = if dx.abs() < 1e-8 {
        if ox < min_x || ox > max_x {
            return None;
        }
        (f32::MIN, f32::MAX)
    } else {
        let inv_dx = 1.0 / dx;
        let t1 = (min_x - ox) * inv_dx;
        let t2 = (max_x - ox) * inv_dx;
        (t1.min(t2), t1.max(t2))
    };

    let (tymin, tymax) = if dy.abs() < 1e-8 {
        if oy < min_y || oy > max_y {
            return None;
        }
        (f32::MIN, f32::MAX)
    } else {
        let inv_dy = 1.0 / dy;
        let t1 = (min_y - oy) * inv_dy;
        let t2 = (max_y - oy) * inv_dy;
        (t1.min(t2), t1.max(t2))
    };

    tmin = tmin.max(tymin);
    tmax = tmax.min(tymax);

    if tmin > tmax || tmax < 0.0 {
        return None;
    }

    Some(if tmin >= 0.0 { tmin } else { tmax })
}

fn ray_vs_polygon(
    ox: f32, oy: f32,
    dx: f32, dy: f32,
    body: &RigidBody,
    vertices: &[(f32, f32)],
) -> Option<f32> {
    let cos = body.angle.cos();
    let sin = body.angle.sin();
    let n = vertices.len();
    if n < 3 {
        return None;
    }

    let mut closest_t: Option<f32> = None;

    for i in 0..n {
        let (vx0, vy0) = vertices[i];
        let (vx1, vy1) = vertices[(i + 1) % n];

        // Transform to world space
        let ax = vx0 * cos - vy0 * sin + body.x;
        let ay = vx0 * sin + vy0 * cos + body.y;
        let bx = vx1 * cos - vy1 * sin + body.x;
        let by = vx1 * sin + vy1 * cos + body.y;

        if let Some(t) = ray_vs_segment(ox, oy, dx, dy, ax, ay, bx, by) {
            if closest_t.is_none() || t < closest_t.unwrap() {
                closest_t = Some(t);
            }
        }
    }
    closest_t
}

fn ray_vs_segment(
    ox: f32, oy: f32,
    dx: f32, dy: f32,
    ax: f32, ay: f32,
    bx: f32, by: f32,
) -> Option<f32> {
    let ex = bx - ax;
    let ey = by - ay;
    let denom = dx * ey - dy * ex;
    if denom.abs() < 1e-8 {
        return None;
    }
    let t = ((ax - ox) * ey - (ay - oy) * ex) / denom;
    let u = ((ax - ox) * dy - (ay - oy) * dx) / denom;
    if t >= 0.0 && u >= 0.0 && u <= 1.0 {
        Some(t)
    } else {
        None
    }
}
