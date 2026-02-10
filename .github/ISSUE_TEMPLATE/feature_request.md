---
name: Feature Request
about: Suggest a new feature or enhancement
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

## Feature Description

A clear and concise description of the feature you'd like to see.

## Use Case

Describe the problem this feature would solve or the workflow it would improve:

**Example:**
> As a game developer building a card game, I want to animate card movements between zones (hand, deck, discard) so that players can follow the game state visually.

## Proposed Solution

How do you envision this feature working?

```typescript
// Example API or code showing how you'd like to use this feature
const cardAnimation = animateBetweenZones(card, fromZone, toZone, {
  duration: 0.5,
  easing: "ease-out",
});
```

## Alternatives Considered

Have you considered alternative approaches? Why is this approach better?

## Implementation Notes

If you have thoughts on how this could be implemented, share them here. (Optional, but helpful!)

## Workarounds

Is there a current workaround for this? If so, what are its limitations?

## Priority

How important is this feature to your project?

- [ ] Critical — blocking my project
- [ ] High — significantly improves my workflow
- [ ] Medium — nice to have
- [ ] Low — minor improvement

## Additional Context

Screenshots, mockups, links to similar features in other engines, etc.

## Checklist

- [ ] I have searched existing issues to ensure this isn't a duplicate
- [ ] I have described the use case clearly
- [ ] I have considered alternatives
- [ ] This feature aligns with Arcane's goals (code-first, test-native, agent-native)
