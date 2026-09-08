# Hanami+ Interactions & Animation Presets

Motion Studio extends the existing Interactive Profile system. It does not replace the button, link, divider, tooltip, scrollbar, sound, or mini-game settings introduced by the earlier interactive-profile layer.

## Motion surfaces

Motion presets can independently apply to:
- the main published character profile
- Living Profile Scenes

The higher-level preset controls page entrance, widget reveal, scene-item motion, ambient decoration, route-transition styling, hover motion, and click feedback.

## Accessibility rule

The viewer controls motion accessibility. If the signed-in viewer has `account_preferences.reduced_motion = true`, or their browser reports `prefers-reduced-motion: reduce`, Hanami suppresses decorative profile motion regardless of the profile owner's selected preset.

This preference is not a Hanami+ feature and is never overridden by Hanami+.

## Hanami+ boundary

An active Hanami+ entitlement is required to initialize or edit character motion settings and save reusable personal presets. Previously saved motion remains attached to the character after Hanami+ expires.

## Starter presets

- Soft Petals
- Notebook Day
- Pixel Night
- Sparkle Pop
- Quiet Room

Members can also save their current combination as a character-specific reusable preset.
