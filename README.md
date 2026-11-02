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

## Individual tactical orders

The personnel panel now includes per-soldier Follow, Hold and Regroup commands. These update each recruit's persisted order and movement state without changing the rest of the squad. The existing per-soldier following toggle now updates the saved order consistently. Full command wheel, custom formations and individual destination selection remain pending. GitHub source commit verified; browser build and gameplay verification remain outstanding.

## Medical and squad separation increment

Recruited NPCs now take nonlethal injuries when struck by surface zombies (surface casualties now cause permanent death at 0 HP; proper stabilization and rescue before death remain to be implemented). The completed Medical Tent allows manual medkit-based treatment of the most injured recruit, or the player if recruits are healthy. Press M or use Medical Aid in the personnel panel. Treatment restores up to 35 HP and consumes one medkit; no automatic healing or tactical revival yet. Follow/Regroup movement adds local separation steering around other hired soldiers to reduce overlap. This does not replace dynamic pathfinding or solid-entity collision. All mechanics require a successful browser playtest before release.

During surface encounters, a recruit reaching 0 HP is marked permanently dead in the save, removed from the active roster and rendered world, and cannot be recruited again. This does NOT apply FOB attack invulnerability behavior yet, because full FOB attacks are not implemented. NPC medics and carrying injured soldiers remain unfinished.

## Medical AI increment

The worker assignment selector now includes a Medic role. When a completed Medical Tent exists, at least one living recruited medic is assigned, and medkits are available, the base runs automated triage on a 15-second in-game interval. It treats the lowest-health recruited patient under 65 HP within the established FOB radius, consuming one medkit and restoring up to 35 HP. Dead soldiers remain unavailable, and 0-HP soldiers cannot act in combat. This is an initial stationary FOB treatment policy, **not** the promised battlefield stabilization, rescue/carry, recovery penalties or full injury system. Only code presence and GitHub commits were verified; end-to-end TypeScript, production build and gameplay verification remain outstanding.

## Multi-milestone FOB defense and management slice

New Guard Post blueprints cost 9 scrap and 7 wood, use timed construction, and provide automated perimeter attacks when a living guard-role recruit is nearby. This is a preliminary guard-post defense simulation, not a complete horde/FOB attack system or ammunition-consuming turret. The FOB panel now includes a building directory with condition/status and a Locate action. Facility condition defaults to 100 for prior saves, providing a basis for later approved repairs; actual facility damage, repair authorization and defense event logic remain pending. These code changes were committed and fetched from GitHub, but no successful production build/browser playtest has been established yet.

## FOB wave defense and approved repair increment

A first prototype FOB wave now triggers periodically while the player is present at an established, completed Command Center. Incoming attackers approach from an indicated general direction and may damage completed buildings; losing Command Center HP ends the event in defeat. Eliminating the attacking wave ends it in victory. Spawned attackers, event stage and building condition persist in the existing browser save. NPCs inside the FOB radius cannot reach 0 HP during an active FOB attack, preserving the intended no-permadeath rule in this early implementation. The FOB directory provides per-building approved repairs and a Repair All command; each repair spends 2 scrap and 1 wood to restore up to 30 HP. The rest of the approved defense design—warnings before wave activation, breach responders, gate locking, defender incapacitation, multi-direction hordes, resource repair priority, and balancing—remains unimplemented. Code commits are verified; a passing TypeScript/Vite build and browser simulation are not yet verified.

## Attack warning, shelter, and damage safeguards

FOB attacks now give a warning 35 seconds before the simplified wave, with warning state persisted. Noncombat assigned workers within the FOB move toward an existing intact Command Center, Barracks, or Medical Tent during an attack rather than continuing their normal follow behavior. Destroyed guard posts no longer fire, and destroyed farms/water collectors/storage buildings no longer produce or increase capacity. If all proposed attack spawn locations are blocked, the wave is postponed instead of declaring a false victory. The current wave spawn geometry and shelter/navigation logic are provisional and still need a full playtest. A local npm registry connectivity check failed with EAI_AGAIN, so the production build is not verified.

## Current validation and FOB fixes

The active-wave timer no longer accumulates toward the following attack while the current horde is alive. Cancelling an unfinished Command Center is prohibited if dependent FOB blueprints have already been placed; this prevents leaving buildings behind without an established FOB. `npm run verify` now runs TypeScript checking, seeded dungeon tests and a Vite production build, and GitHub Actions runs the same command. A passing CI run has **not** been confirmed. The repository still needs a clean dependency install, compilation and real PC/mobile gameplay smoke tests before it can be called reliably playable.

## Save/recovery and regression batch

Simulation clocks for food/water, construction, medical treatment and guards now persist through the existing version-2 local save. Loading an old version-2 save fills missing clocks with zero. Loading a save with a stale active siege ends that dangling siege, and inactive saves discard stale special wave enemies. Siege defeat removes the failed wave's attackers to prevent residual attacks after defeat. Dungeon tests now check 200 more deterministic layouts for unique floor loot/enemy placements and verify a larger map. The repository verification command and workflow exist, but **no passing build or CI result was observed** during this change set.

## Branch-based live playtest publishing

The preview workflow now installs dependencies and builds the Vite site with `/deadzone-protocol/` as the base path before publishing compiled `dist` files to `gh-pages`. It deliberately does not gate preview publishing on the separate strict `npm run verify` suite, which still runs in CI. GitHub Pages should use **Deploy from a branch → gh-pages → /(root)**. The site's intended address is `https://spluxec.github.io/deadzone-protocol/`, but availability and a successful build were not independently verified in this change. The HUD now retains clear FOB attack warning/active indicators.

## Playtest deploy artifact check and save-load fixes

The branch-based preview workflow now validates that `dist/index.html` is compiled (not source TypeScript), uses the `/deadzone-protocol/assets/` base, and includes JS/CSS before publishing to `gh-pages`. This check helps surface malformed builds in GitHub Actions logs; a successful deployment is still unconfirmed. Continuing a saved game is now guarded against duplicate activation, saved facilities are replaced rather than duplicated on reload, and absent legacy taken/dead arrays are handled safely.

## Playtest gameplay improvements

Fixed the Personnel panel structure so squad commands and assignments appear only on the Personnel page rather than also under construction. Direct recruitment now requires a completed, operational Command Center. Completed non-Command-Center facilities can be demolished from the FOB directory after confirmation, recovering 50% of original scrap and wood rounded down; demolition is blocked during raids and when removing barracks would strand recruited residents. The management panel has improved touch targets and spacing on mobile. These changes have been committed to main for automatic preview publication; production build and browser interaction must still be verified.
