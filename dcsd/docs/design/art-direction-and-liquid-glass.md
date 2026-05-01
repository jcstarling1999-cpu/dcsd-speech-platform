# 9) Liquid Glass + Art Direction

Last updated: 2026-04-15

## Art Direction Options
1. Auralith Atlas (selected)
- Fraunces + Space Grotesk
- Maritime mineral palette
- Control-layer glass with subtle grain

2. Signal Forge
- Industrial operator aesthetics
- Dense, high-contrast telemetry surfaces

3. Quiet Broadcast
- Print-inspired editorial softness for long-form reading/listening

## Selected Direction: Auralith Atlas
- Typography personality: editorial precision + technical clarity.
- Color semantics:
  - Coral: action
  - Amber: caution/lossy
  - Lagoon: readiness/success
- Spacing rhythm: dense utility rails with breathing room in content panes.
- Iconography: geometric, not skeuomorphic.
- Motion: short rise + route-progress transitions with reduced-motion fallback.

## Non-Sameness Checklist
- No purple-first default identity.
- No template hero + card triplet patterns.
- No generic “AI blob” illustration fillers.
- Distinctive typographic voice enforced globally.

## Apple-Native Liquid Glass Module
Implemented in:
- `apps/apple-native/SpeechGlassKit/Sources/SpeechGlassKit/LiquidGlassControls.swift`

Design rules:
- Glass controls/navigation only.
- Keep dense content panes non-glass for legibility.
- Respect `reduceTransparency` and high contrast environments.

## Web Emulation Module
Implemented in:
- `apps/web/src/styles/tokens.css`
- `apps/web/src/styles/glass.css`
- `apps/web/src/styles/app.css`

Includes:
- blur scale tokens
- tint scale tokens
- edge highlight and border luminance
- depth shadows and fallback for missing `backdrop-filter`
