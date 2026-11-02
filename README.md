# Deadzone Protocol

Single-player top-down military zombie survival browser game for PC and landscape mobile.

## Development status

**Phase 1:** playable surface-survival prototype: movement, stamina, pistol aim/fire/reload, basic melee, slow zombie pursuit, crates, pause, camera, mobile dual virtual sticks, local browser autosave.

**Phase 2 foundation:** player-selected permanent Command Center site, basic resource costs, building footprints for Barracks, Storage, Workshop and Medical facilities, FOB boundary visualization, building management panel. Buildings use queued blueprints, incremental material commitments, timed progress, and cancellation refunds. Dedicated worker assignments, upgrades, demolition, defensive structures and production are not complete.

**Phase 3 foundation:** discoverable named survivors, capacity-limited recruitment at the FOB, simple following/holding and a personnel panel. Full recruit profiles, personalities, injuries, tactical AI, medical AI and work assignments are not complete.

**Phase 4 prototype:** marked surface dungeon entrance (G key or Dungeon button), deterministic connected rooms, loot, slow-turn enemy encounters, health and ammunition, active-run save and physical extraction at the green exit. This is a simple solo prototype and is NOT the final full combat, multi-floor, squad, casualty, or progression system.

Later milestones: full FOB economy and production, advanced NPC squads, multi-floor dungeons, exploration regions, attacks, research, postgame. Follow the approved game-design handoff; do not treat prototype shortcuts as final game rules.

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

WASD move, mouse aim, hold click to shoot, Shift sprint, R reload, E scavenge, Space melee, Esc pause. B opens building panel. P opens personnel panel. N recruits a nearby survivor when the Command Center, completed Barracks bed, food and water requirements are met. G enters the dungeon at the marked physical entrance.

## Mobile

Use landscape orientation. Left stick moves; right stick aims; FIRE, LOOT and RELOAD buttons perform actions. The FOB and personnel panels are available through top-right buttons. More touch polish is needed.

## Saving

Local autosave preserves the player, cleared caches, zombie kills and the initial FOB/recruits state. This is still a single-save prototype, not the approved multi-campaign and optional cloud-sync implementation. The save code accepts the Phase 1 format and migrates basic data into the expanded format.

## Verification

TypeScript source has been checked locally against the expanded development copy. A fresh dependency installation and Vite production build could not be completed in the local environment because package installation timed out. The GitHub Actions workflow should perform both tests in GitHub once available. Deployment has not been configured.

## Outstanding quality gates

A clean npm installation and production Vite build remain unverified because the execution environment cannot fetch registry packages. GitHub Actions has a TypeScript check, seeded dungeon tests and a build job; do not claim a working deployment without a passing run and browser test. The dungeon prototype's recovery and rewards are simplified and not yet the approved final expedition-failure mechanics.

## November gameplay reliability update

- Dungeon fog of war now conceals unexplored rooms, enemies and loot, with discovery state saved across browser restarts.
- Dungeon incapacitation now ends the run as a loss rather than silently resetting its enemies and loot. The prototype returns the player injured and removes its currently tracked equipped ammunition/medical supplies; full gear inventory and NPC casualty handling remain unfinished.
- An active dungeon run is resumable after browser reopening from the Dungeon button or G shortcut. Starting a genuinely new campaign clears the pending run.
- The seeded dungeon generator is validated independently; browser production build and mobile playtests still require CI confirmation.

## Dungeon safety fixes

Dungeon exploration and shooting now respect intervening walls. The active dungeon is saved immediately on entry (even before the first move), and storage errors produce a warning instead of silently assuming progress is persistent. These fixes are committed but still require a full browser playtest and CI production-build verification.

## FOB resource economy increment

Farm and water collector facilities now have blueprint construction costs and timed completion. Once completed, they add food and water at each existing FOB consumption interval; recruited personnel consume both. These are simplified renewable-production prototypes, not full farming, rain, purification, weather, worker assignment or storage-capacity systems. The construction loop can skip materials-blocked projects while preserving the queue order for buildable projects. Build and browser verification still pending.

## Construction and storage correction

Fixed repeated farm/water pricing keys and included those facilities in the actual construction progression cost table. Building labor advances the first project that is currently buildable; projects blocked by missing materials can be bypassed. Food and water production now respects a base capacity of 20 units each plus 20 units per completed storage building (prototype balance only). The rest of the advanced central storage and refund protection systems are not implemented. The committed code still needs a passing browser build and gameplay test.

## NPC job assignment foundation

Recruited survivors can be assigned auto, guard, builder, farmer or water roles from the management panel. The selected role is saved with the recruit. Builder/auto roles contribute to construction progress; farmer/water/auto roles contribute to corresponding resource output. Guard-role NPCs can attack nearby zombies while holding their position, and following soldiers continue fighting. These are simplified role priorities, not yet complete schedule rotation, morale-free work AI, guarding posts, emergency shelter, or true individual work production. This change has been pushed but not browser-build verified.

## Squad command increment

The personnel panel includes squad-wide Follow, Hold and Regroup commands. On desktop, press 1, 2 or 3 respectively. Orders are saved per recruit; Follow moves personnel toward the player, Hold keeps their current location, and Regroup uses faster movement toward the player. Existing basic soldier threat engagement remains, but the approved tactical wheel, formations, independent pathfinding, medical response and per-soldier command overrides remain pending. Assigning a non-guard work role sets that survivor to holding position until given a squad order.

## NPC obstacle navigation update

Follow and Regroup now use bounded grid breadth-first search against permanent building walls rather than always walking directly at the player. Routes are recalculated at most every quarter-second per soldier or when the player moves significantly, reducing per-frame pathfinding cost. If no safe route exists, soldiers do not take a direct shortcut through walls. This is a foundation only: avoidance of other soldiers/zombies, formations, door interactions, dynamic obstructions and technical stuck recovery still need implementation and browser verification.

## Combat coordination increment

The personnel panel now provides Focus Fire (desktop shortcut 4), which designates the nearest currently visible zombie within 340 world units. Recruited fighters prioritize that target when within their own line-of-sight and firing range, reverting to autonomous threat selection otherwise. The shared target clears when killed. Following soldiers now take separated radial positions around the player rather than all aiming at exactly one point. These are prototype coordination rules; full tactical wheel, player-selected target designation, formations, NPC-to-NPC collision, and mobile combat validation are outstanding.
