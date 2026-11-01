# Deadzone Protocol

Phase 1 browser playable prototype (not the complete game). Includes top-down character movement, collision, stamina/sprinting, mouse aiming and pistol shooting, magazine reloads, basic melee, slow zombies with sight and sound pursuit, scavenging supply crates, camera follow and zoom, landscape touchscreen virtual sticks, and local browser autosaving.

## Run locally

```sh
npm install
npm run dev
```

For a production bundle: `npm run build`. No deployment has been configured.

## Controls

Desktop: WASD move, Shift sprint, mouse aim, hold left mouse to shoot, R reload, E scavenge, Space melee, Esc pause; mouse wheel zoom.

Mobile: hold in landscape, left joystick to move, right joystick to aim, FIRE, LOOT, RELOAD and pause buttons.

## Save behavior and limitations

The prototype autosaves the character, ammunition, supplies, defeated zombies, and collected supply caches to local browser storage. New Campaign resets this Phase 1 save. This simple prototype does not yet implement full multi-slot campaigns, cloud sync, medical systems, proper equipment loss/recovery, NPCs, FOB construction, procedural dungeons, or the full approved gameplay specification. Those belong to later development phases.

## QA status

Files have been committed to GitHub. A clean package installation and production build have not yet been verified in this environment. Developers should run `npm install && npm run build` before deployment and test both PC and mobile controls.
