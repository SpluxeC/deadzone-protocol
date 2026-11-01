# Deadzone Protocol

Single-player top-down military zombie survival browser game for PC and landscape mobile.

## Development status

**Phase 1:** playable surface-survival prototype: movement, stamina, pistol aim/fire/reload, basic melee, slow zombie pursuit, crates, pause, camera, mobile dual virtual sticks, local browser autosave.

**Phase 2 foundation:** player-selected permanent Command Center site, basic resource costs, building footprints for Barracks, Storage, Workshop and Medical facilities, FOB boundary visualization, building management panel. Buildings use queued blueprints, incremental material commitments, timed progress, and cancellation refunds. Dedicated worker assignments, upgrades, demolition, defensive structures and production are not complete.

**Phase 3 foundation:** discoverable named survivors, capacity-limited recruitment at the FOB, simple following/holding and a personnel panel. Full recruit profiles, personalities, injuries, tactical AI, medical AI and work assignments are not complete.

Later milestones: full FOB economy and production, NPC squads, procedural catacomb dungeons, exploration regions, attacks, research, postgame. Follow the approved game-design handoff; do not treat prototype shortcuts as final game rules.

## Run

```sh
npm install
npm run dev
```

Build/typecheck:

```sh
npx tsc --noEmit
npm run build
```

## PC controls

WASD move, mouse aim, hold click to shoot, Shift sprint, R reload, E scavenge, Space melee, Esc pause. B opens building panel. P opens personnel panel. N recruits a nearby survivor when the Command Center, Barracks bed, food and water requirements are met.

## Mobile

Use landscape orientation. Left stick moves; right stick aims; FIRE, LOOT and RELOAD buttons perform actions. The FOB and personnel panels are available through top-right buttons. More touch polish is needed.

## Saving

Local autosave preserves the player, cleared caches, zombie kills and the initial FOB/recruits state. This is still a single-save prototype, not the approved multi-campaign and optional cloud-sync implementation. The save code accepts the Phase 1 format and migrates basic data into the expanded format.

## Verification

TypeScript source has been checked locally against the expanded development copy. A fresh dependency installation and Vite production build could not be completed in the local environment because package installation timed out. The GitHub Actions workflow should perform both tests in GitHub once available. Deployment has not been configured.
