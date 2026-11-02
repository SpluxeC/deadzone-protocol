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

## Live playtest gameplay pass — personnel, squad and HUD

Waiting-list enlistment now uses the same operational Command Center prerequisite as recruiting an NPC directly. Regroup command uses a tighter radial follow goal to bring the squad together, and focus-fire selection ignores enemies already reduced to zero health. The surface HUD includes food, water and wood supplies alongside ammunition, medkits and scrap, while the construction directory summarizes operational buildings, blueprints and damaged facilities. All edits were committed to main, where the existing branch-publishing workflow can build the live site. No browser smoke test of this revision was performed by the assistant.

## Formation and tactical visibility increment

Recruited followers now support player-facing Column, Line and Diamond goal positions, selectable in the Personnel panel. The chosen formation is persisted in the existing local campaign save with a Column default for old saves. Regroup continues to reduce spacing. Recruited personnel have a small on-map HP bar, damaged FOB buildings show a condition bar, and the HUD labels the current formation. This is goal-position steering, not yet full collision-free formation pathfinding. Committed to main for the existing live playtest publishing workflow; build success and in-browser behavior for this revision have not been independently verified.

## Battlefield medical and zombie targeting update

Assigned living Medic recruits now perform limited automatic field first aid every eight active gameplay seconds: if an injured recruited ally is within 85 world units and below 40 HP, a medkit is consumed and 35 HP restored. This is preliminary field aid, not rescue/carry or incapacitation stabilization. Surface zombies may notice a recruited soldier at close range when the player is not their visible target. Player incapacitation returns to the established FOB when available, sets magazine to zero and applies the current reserve-ammo penalty. HUD shows wounded recruit count. Existing save clocks migrate with a zero default. These changes are committed but browser behavior still needs playtesting.

## FOB defender incapacitation slice

During active FOB waves, recruited defenders within the base perimeter are incapacitated at 1 HP rather than dying. Incapacitated personnel stop moving/fighting and are shown as down in the map, HUD and Personnel panel. When an attack resolves as victory or Command Center defeat, those defenders recover at 25 HP, remain injured and resume their saved Follow/Hold/Regroup movement status. Outside FOB battles, the existing surface expedition permadeath rule remains unchanged. These prototype changes have been committed to main; deployment and live-browser functionality of this revision have not been independently confirmed.

## FOB casualty rescue and wave recovery increment

Assigned living medics who are not incapacitated can now stabilize nearby downed defenders during active FOB battles, consuming one medkit and restoring 24 HP, after which the soldier resumes an eligible follow order. This is an initial field-stabilization feature, not full evacuation or carrying. FOB wave logic now resolves an attack even when the Command Center has already been disabled, preventing an indefinitely stuck battle state. After the warning threshold, the HUD shows a countdown in seconds to the next FOB wave. Existing local saves retain compatibility. These improvements are committed to main; the updated build and browser interactions still require verification.

## Three-phase delivery increment (November 2026)

This batch advances the requested six remaining major milestones in three grouped implementation passes. It is **not** the full completion of all six.

**Pass 1 — combat and FOB defense.** Staffed guard posts prioritize active attacking zombies instead of unrelated nearby zombies. Previously implemented rotating spawn directions, wave scaling, squad formations and medic stabilization remain in place. Full obstacle-navigation AI, evacuation/carrying and coordinated guard-position assignments remain open.

**Pass 2 — equipment and dungeons.** An operational Workshop provides immediate ammo (3 scrap for 36 rounds), medkit (5 scrap for one), and armor-repair prototype (7 scrap for 45 player HP) crafting. Workshop actions are blocked during base attacks. Dungeon extraction awards salvage, up to 48 rounds based on crates, and a first-clear bonus of two medkits and eight scrap. Clears and recovered-crate counts persist. This is not yet a queued manufacturing system, full inventory, boss dungeon or expansive scavenging world.

**Pass 3 — saves and campaign.** Main-menu slot selector lets players switch between three local campaign saves, including the active dungeon checkpoint. Existing single-slot saves default to slot 1. A persisted interim victory marker triggers after three successfully defended FOB waves and three dungeon extractions with a functioning Command Center. Endless survival remains possible afterward. This is a provisional, playable campaign milestone **not** the agreed final dungeon, victory ceremony, or complete endgame. Additional QA, independent save-slot regression testing, mobile UX, gear loss rules, boss progression and actual live deployment verification remain required.

All features in this batch were committed to `main`; the automatic GitHub Pages workflow should publish them after a successful build. The browser build has not been verified in this session.

## Milestone-completion priority: dungeon tiers and obstacle navigation

Added persistent dungeon tiers unlocked by previous successful extractions (tiers 1–3; tier 3 after four clears), with a tier-3 guardian at the extraction position. The guardian initially has four hit points and must be defeated with ranged attacks from within three tiles to extract. The guardian is shown by an orange extraction marker while alive and damages the player if approached too closely. The dungeon save stores tier and guardian HP, so an active expedition retains its tier. Existing saved dungeon checkpoints default to tier 1. Surface zombies now use BFS obstacle detours when they cannot see their last known target, with per-zombie cooldowns to limit path-search frequency. These are incremental gameplay features, not completion of the entire six-milestone plan. Real browser/build testing, comprehensive dungeon bosses, equipment inventory, expanded scavenging and full campaign ending remain open.

## Milestone priority pass: equipment and regression coverage

Added persistent armor inventory with spare craftable plates. The completed Workshop now produces an armor plate (7 scrap) rather than magically healing player HP. Players equip a plate from the FOB management screen to gain up to 50 protection (capped at 100), and worn armor absorbs up to 70% of a zombie hit while its durability lasts. An extraction with at least four looted dungeon caches awards one spare plate; failed expeditions strip equipped armor. Existing local saves default safely to zero armor/plates. The armor rules are in a pure module with unit tests, and the npm test script includes both dungeon and armor test files. FOB farms/water collection already regenerate provisions every 45 active gameplay seconds while outside scavenging remains finite. Still unfinished: full weapon equipment and item slots, queued manufacturing, final campaign ceremony, multi-floor dungeon/squad expedition, and complete gameplay/browser QA. This update is a focused feature slice, not closure of all six milestones.

## Connected equipment/manufacturing/dungeon/campaign loop (Nov 2026)

Workshop crafting is now time-based and queued (max six orders) for pistol ammunition, medkits, armor plates and, after two successful dungeon extractions, a rifle plus 60 rifle rounds. Crafting consumes scrap upon queuing. Workshop production pauses when the Workshop is offline or the FOB is being attacked; the latest queued job can be canceled for a half-scrap refund. Players can equip armor or switch between pistol and rifle from FOB management; rifle shots use rifle ammunition and deal higher damage. The save includes work orders, weapon unlock/equip/ammo state and guardian-victory flags with safe defaults for older saves. Dungeon clearing unlocks the rifle; the tier-3 guardian challenge must have been completed through a successful extraction after the fifth clear to trigger the persisted final guardian objective. The existing victory check also requires three successfully defended FOB waves and a functioning Command Center. Victory now shows an on-screen summary and allows endless survival. This is a connected playable implementation; manufacturing queues, campaign victory and live deployment have **not** been regression-tested end-to-end in a browser. Remaining work includes full multi-floor dungeons, party expeditions, stronger item/equipment constraints, full scavenging-world expansion, test automation and mobile QA.

## Stabilization and regression testing pass

Extracted pure manufacturing queue and campaign-eligibility logic into `src/progression.ts`, with Node tests in `src/progression.test.ts` covering queue costs, six-order capacity, pause/resume and completion, and final victory requirements. Runtime Workshop production now uses those same queue rules. Fixed the campaign final-guardian prerequisite: a dungeon extraction must explicitly report victory over the tier-3 guardian; clearing an arbitrary number of dungeons no longer counts. This pass does not implement multi-floor dungeons or squad expeditions, and no successful CI or interactive browser test is claimed.

## Three-floor squad expedition increment

Dungeons now generate three deterministic floors, with per-floor fog, enemy/loot state, checkpointed floor progress, and an extraction stair that advances floors one and two. Tier-three guardians appear on the final floor. After one successful solo clear, up to four living recruited NPCs can accompany the player. Surviving squad members provide a simple supporting shot, absorb nearby enemy attacks and retain their wounds; members reduced to zero HP permanently die and are removed from the FOB roster on successful extraction or player failure. Solo first-clear gating is maintained. The dungeon checkpoint includes floor, accumulated loot, companion IDs/HP/deaths and guardian state. This is an initial squad system without advanced formation movement, extraction by carrying, or independent squad tactical orders. End-to-end build, CI and browser behavior were not confirmed in this session.

## Completion-oriented dungeon and squad batch

Expeditions now support early voluntary extraction from the starting tile of any floor, with a dedicated button for touchscreen players. Early extraction returns acquired loot and the current squad health/death outcomes, but **does not increment dungeon clears**, trigger the first-clear bonus or unlock higher tiers. Successful extraction from the third floor remains the requirement for a full clear. A dungeon squad may switch between Cover and Assault orders: Cover allows nearby living companions to absorb attacks and assist with shorter-range supporting fire; Assault extends support-fire range but exposes the player to direct enemy damage. Orders persist with dungeon checkpoints. These are playable initial squad tactics, not full independent NPC movement or carrying wounded soldiers. Build/CI/browser verification still needs to happen before marking the six original milestones fully complete.

## Compact UI overhaul (November 2026)

Redesigned the startup menu with tactical typography, clearly grouped save-slot selection, continue/new actions and a collapsible controls guide. The game HUD is consolidated into a single compact status strip; FOB/Squad/Dungeon/Pause actions share one navigation bar instead of separately positioned buttons. The management panel now has a bounded scroll area below the nav bar, with viewport-aware width and height, consistent buttons and sticky section heading. The notice area, mobile landscape joysticks and action controls, and dungeon controls have reserved positioning and responsive size rules designed to avoid overlap. Portrait mobile retains a rotate overlay. Existing UI element IDs and gameplay handlers are preserved. Changes were committed to main; visual testing across actual screen sizes and successful deployment of this revision were not independently confirmed.

## Smooth dungeon navigation

Dungeon exploration now uses frame-based, continuous player coordinates instead of single-tile jumps. Hold WASD/arrow keys or hold the directional touch buttons to walk; diagonals are normalized to the same movement speed. A compact bounding radius prevents walking through tile walls and supports sliding along obstacles. Tile-based interactions and enemy encounter checks still occur in their nearest grid cell, while movement and positions are persisted during exploration. Floor transitions reset encounter tracking. Existing saved dungeon integer coordinates remain compatible with the new fractional positions. This source change has not been browser-playtested or verified by a successful production build.

## Dungeon stabilization and squad roster update

Continuous dungeon encounters now throttle damage to prevent repeatedly triggering lethal hits when crossing neighboring cells. Canvas bitmap dimensions are updated only when the dungeon dimensions change, rather than resetting the drawing surface on every animation frame. Personnel management now includes a selectable expedition roster capped at four eligible recruits. The roster saves with the campaign; a new expedition uses these choices after the first solo full clear. Downed or incapacitated troops cannot be selected, and returning soldiers retain health/death consequences. Roster choice does not retroactively modify an expedition already saved in progress. Live browser playtesting and CI success have not been verified for this revision.

## Squad movement and field aid milestone batch

Dungeon companions now track individual floating-point positions and follow the player's moving formation with smooth visual motion and wall-aware collision checks. When entering a new floor, companion positions are reset near the new entrance. Dungeon expeditions carry two persistent field-aid supplies; a new button treats the nearest living, injured companion within two tiles, healing 40 HP and consuming one supply. Field aid cannot revive deceased recruits; permanent death and extraction consequences remain unchanged. This is a limited escort/healing system, not full pathfinding or physical carry-and-evacuate mechanics. These changes were committed without confirmed CI or interactive browser validation.

## Companion pathfinding, wounded escort, and FOB spawn batch

Dungeon companions now use a bounded BFS waypoint search when direct formation positions are obstructed; searches are cached briefly and staggered, and caches clear between floors. Living companions under 40 HP can be selected for an escort from within two tiles, keeping them close to the player and slowing player movement until released. Escort state persists in active dungeon checkpoints, and this action does not resurrect dead NPCs. FOB assault waves now try alternative nearby approach positions when an initial zombie spawn collides with a wall. These changes are committed but remain unverified in interactive browser and CI tests; more complete carrying animations, autonomous squad tactics and broad balancing are still outstanding.

## Tactical carrying, supply balance, and extraction fixes

Carrying a wounded dungeon companion now has an orange carried marker and visible connection to the player, plus an explicit carrying HUD status. Carried companions do not provide squad supporting fire. Living companions support shots based on their own positions and line of sight, with Assault allowing up to two supporting shots versus Cover's one. FOB food/water balance was adjusted to improve sustainability for growing squads, while keeping farms and collection buildings essential. The dungeon early-extraction button now uses a near-entrance radius rather than exact integer tile coordinates, supporting smooth continuous movement. These changes need actual UI, gameplay and build verification; the full game has not yet passed an end-to-end validation run.

## Verification and save-slot repair (November 2026)

Fixed a multi-slot regression: starting a new campaign now deletes both the active campaign/dungeon keys and the selected slot's archived campaign/dungeon copy, preventing a deleted save from returning after a slot switch. Corrected the first-clear bonus message so voluntary early dungeon extraction does not misleadingly announce a first-clear bonus. Existing automated tests include procedural dungeon invariants, armor mitigation, manufacturing queues, campaign eligibility, deterministic floor transitions and companion death outcomes. Remaining manual acceptance checklist: create and switch all three slots; restart/reset one slot while confirming the other two are untouched; resume an active floor-two checkpoint; early-extract without increasing clears; complete a tier-three guardian; test FOB attack and loss, armor depletion, crafting pause, permanent deaths, and victory; verify desktop and mobile landscape navigation and touch controls. The available commit workflow query returned no runs for the latest commit, and the combined-status query returned no checks; therefore **a passing CI, deployed build, and full browser playtest are not confirmed**.
