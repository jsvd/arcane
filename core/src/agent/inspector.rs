use std::sync::mpsc;
use std::thread::{self, JoinHandle};
use std::time::Duration;

use super::{InspectorRequest, InspectorResponse, RequestSender};

/// Start the HTTP inspector server on a background thread.
/// Returns a join handle for the server thread.
pub fn start_inspector(port: u16, request_tx: RequestSender) -> JoinHandle<()> {
    thread::spawn(move || {
        let addr = format!("0.0.0.0:{port}");
        let server = match tiny_http::Server::http(&addr) {
            Ok(s) => s,
            Err(e) => {
                eprintln!("[inspector] Failed to start on {addr}: {e}");
                return;
            }
        };

        eprintln!("[inspector] Listening on http://localhost:{port}");

        for mut request in server.incoming_requests() {
            let url = request.url().to_string();
            let method = request.method().as_str().to_uppercase();

            // Read body for POST requests
            let body = if method == "POST" {
                let mut buf = String::new();
                let _ = request.as_reader().read_to_string(&mut buf);
                buf
            } else {
                String::new()
            };

            let inspector_req = match parse_route(&method, &url, &body) {
                Some(req) => req,
                None => {
                    let resp = build_http_response(InspectorResponse::error(
                        404,
                        format!("Unknown route: {method} {url}"),
                    ));
                    let _ = request.respond(resp);
                    continue;
                }
            };

            // Create a one-shot response channel
            let (resp_tx, resp_rx) = mpsc::channel();

            // Send request to game loop
            if request_tx.send((inspector_req, resp_tx)).is_err() {
                let resp = build_http_response(InspectorResponse::error(
                    503,
                    "Game loop disconnected".into(),
                ));
                let _ = request.respond(resp);
                continue;
            }

            // Wait for response with timeout
            let inspector_resp = match resp_rx.recv_timeout(Duration::from_secs(5)) {
                Ok(resp) => resp,
                Err(_) => InspectorResponse::error(504, "Game loop timeout".into()),
            };

            let resp = build_http_response(inspector_resp);
            let _ = request.respond(resp);
        }
    })
}

fn parse_route(method: &str, url: &str, body: &str) -> Option<InspectorRequest> {
    // Strip query string for matching
    let path = url.split('?').next().unwrap_or(url);

    match (method, path) {
        ("GET", "/health") => Some(InspectorRequest::Health),
        ("GET", "/state") => Some(InspectorRequest::GetState { path: None }),
        ("GET", p) if p.starts_with("/state/") => {
            let state_path = p.strip_prefix("/state/").unwrap_or("");
            Some(InspectorRequest::GetState {
                path: Some(state_path.to_string()),
            })
        }
        ("GET", "/describe") => {
            // Parse verbosity from query string
            let verbosity = url
                .split('?')
                .nth(1)
                .and_then(|qs| {
                    qs.split('&')
                        .find(|p| p.starts_with("verbosity="))
                        .map(|p| p.strip_prefix("verbosity=").unwrap_or("").to_string())
                });
            Some(InspectorRequest::Describe { verbosity })
        }
        ("GET", "/actions") => Some(InspectorRequest::ListActions),
        ("GET", "/history") => Some(InspectorRequest::GetHistory),
        ("POST", "/action") => {
            // Parse action name and payload from JSON body
            // Simple JSON parsing: {"name": "...", "payload": ...}
            let (name, payload) = parse_action_body(body);
            Some(InspectorRequest::ExecuteAction { name, payload })
        }
        ("POST", "/rewind") => {
            // Parse steps from JSON body: {"steps": N}
            let steps = parse_rewind_body(body);
            Some(InspectorRequest::Rewind { steps })
        }
        ("POST", "/simulate") => {
            // Body is the action string/JSON
            Some(InspectorRequest::Simulate {
                action: body.to_string(),
            })
        }
        _ => None,
    }
}

fn parse_action_body(body: &str) -> (String, String) {
    // Simple extraction — find "name" and "payload" fields
    let name = extract_json_string(body, "name").unwrap_or_default();
    let payload = extract_json_value(body, "payload").unwrap_or_else(|| "{}".to_string());
    (name, payload)
}

fn parse_rewind_body(body: &str) -> u32 {
    extract_json_string(body, "steps")
        .and_then(|s| s.parse().ok())
        .unwrap_or(1)
}

/// Extract a string value for a given key from simple JSON.
fn extract_json_string(json: &str, key: &str) -> Option<String> {
    let pattern = format!("\"{}\"", key);
    let start = json.find(&pattern)?;
    let rest = &json[start + pattern.len()..];
    // Skip whitespace and colon
    let rest = rest.trim_start();
    let rest = rest.strip_prefix(':')?;
    let rest = rest.trim_start();

    if rest.starts_with('"') {
        // String value
        let rest = &rest[1..];
        let end = rest.find('"')?;
        Some(rest[..end].to_string())
    } else {
        // Number or other — read until comma, brace, or whitespace
        let end = rest
            .find(|c: char| c == ',' || c == '}' || c == ']' || c.is_whitespace())
            .unwrap_or(rest.len());
        Some(rest[..end].to_string())
    }
}

/// Extract a raw JSON value for a given key.
fn extract_json_value(json: &str, key: &str) -> Option<String> {
    let pattern = format!("\"{}\"", key);
    let start = json.find(&pattern)?;
    let rest = &json[start + pattern.len()..];
    let rest = rest.trim_start();
    let rest = rest.strip_prefix(':')?;
    let rest = rest.trim_start();

    if rest.starts_with('{') {
        // Find matching brace
        let mut depth = 0;
        for (i, c) in rest.char_indices() {
            match c {
                '{' => depth += 1,
                '}' => {
                    depth -= 1;
                    if depth == 0 {
                        return Some(rest[..=i].to_string());
                    }
                }
                _ => {}
            }
        }
        None
    } else if rest.starts_with('"') {
        let inner = &rest[1..];
        let end = inner.find('"')?;
        Some(format!("\"{}\"", &inner[..end]))
    } else {
        let end = rest
            .find(|c: char| c == ',' || c == '}' || c == ']' || c.is_whitespace())
            .unwrap_or(rest.len());
        Some(rest[..end].to_string())
    }
}

fn build_http_response(resp: InspectorResponse) -> tiny_http::Response<std::io::Cursor<Vec<u8>>> {
    let data = resp.body.into_bytes();
    let data_len = data.len();

    let status = tiny_http::StatusCode(resp.status);
    let content_type =
        tiny_http::Header::from_bytes(&b"Content-Type"[..], resp.content_type.as_bytes()).unwrap();
    let cors =
        tiny_http::Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap();
    let cors_headers = tiny_http::Header::from_bytes(
        &b"Access-Control-Allow-Headers"[..],
        &b"Content-Type"[..],
    )
    .unwrap();
    let cors_methods = tiny_http::Header::from_bytes(
        &b"Access-Control-Allow-Methods"[..],
        &b"GET, POST, OPTIONS"[..],
    )
    .unwrap();

    tiny_http::Response::new(
        status,
        vec![content_type, cors, cors_headers, cors_methods],
        std::io::Cursor::new(data),
        Some(data_len),
        None,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_route_health() {
        let req = parse_route("GET", "/health", "").unwrap();
        assert!(matches!(req, InspectorRequest::Health));
    }

    #[test]
    fn parse_route_state_with_path() {
        let req = parse_route("GET", "/state/player.hp", "").unwrap();
        match req {
            InspectorRequest::GetState { path } => {
                assert_eq!(path, Some("player.hp".to_string()));
            }
            _ => panic!("Expected GetState"),
        }
    }

    #[test]
    fn parse_route_describe_with_verbosity() {
        let req = parse_route("GET", "/describe?verbosity=full", "").unwrap();
        match req {
            InspectorRequest::Describe { verbosity } => {
                assert_eq!(verbosity, Some("full".to_string()));
            }
            _ => panic!("Expected Describe"),
        }
    }

    #[test]
    fn parse_route_unknown_returns_none() {
        assert!(parse_route("GET", "/unknown", "").is_none());
        assert!(parse_route("DELETE", "/health", "").is_none());
    }

    #[test]
    fn parse_action_body_extracts_name_and_payload() {
        let body = r#"{"name": "move", "payload": {"dx": 1, "dy": 0}}"#;
        let (name, payload) = parse_action_body(body);
        assert_eq!(name, "move");
        assert_eq!(payload, r#"{"dx": 1, "dy": 0}"#);
    }

    #[test]
    fn parse_rewind_body_extracts_steps() {
        assert_eq!(parse_rewind_body(r#"{"steps": 5}"#), 5);
        assert_eq!(parse_rewind_body(r#"{"steps": "3"}"#), 3);
        assert_eq!(parse_rewind_body("{}"), 1); // default
    }
}
