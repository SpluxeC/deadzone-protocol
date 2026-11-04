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

## CI-gated release and campaign-state verification pass (November 2026)

The GitHub Pages publishing workflow now runs `npm run typecheck && npm test` before building and publishing to the public playtest URL. If typechecking or regression tests fail, publication stops instead of shipping that commit. Save loading also filters malformed Workshop orders and caps the queue at six entries, matching gameplay limits. Migrated Tier-3 dungeon saves with missing guardian health now initialize the guardian rather than allowing an automatic final-boss clear. Code inspection also confirmed that the full-clear callback, guardian success flag, FOB defense counter, campaign gating and victory modal are connected. This is **source-path verification only**, not a simulated beginning-to-end playthrough. GitHub Actions statuses and live browser build remain unconfirmed in this execution environment, and desktop/mobile gameplay acceptance remains outstanding.

## Visual art overhaul increment (November 2026)

Replaced surface-world placeholder tile, player, NPC, zombie, supply crate, and building rendering with a shared procedural Canvas2D art module (`src/visuals.ts`). Buildings have distinct silhouettes for command, barracks, storage, workshop, medical, farm, water, and guardpost; the building construction menu now shows a name, cost, and gameplay description under every button. Added hand-illustrated SVG icons (`src/resourceIcons.ts`) for existing wood, scrap, food, water, medkits, ammo and armor, displayed in a compact HUD. These changes preserve the existing map coordinates and gameplay interactions. The concept art remains a high-detail direction reference: these scalable code-drawn assets are simpler than the painted mockup; matching its full lighting, isometric environmental artwork and high-resolution character sprites requires a dedicated sprite-sheet/art integration pass. No new fuel/power gameplay resources or unsupported wall/gate construction types were invented. Build/typecheck/interactive visual validation not independently confirmed.

## Batch 1: visual animation and squad AI refinement (Nov 2026)

Expanded procedural world rendering with deterministic trees and rocky ground clutter, visible distinction among infected variants, soldier equipment details, and frame-based limb animation. Surface character drawing now passes animation time through to the renderers. Recruited squad members prioritize wave attackers within their firing distance rather than selecting an arbitrary first nearby zombie, preserving explicit Focus Fire orders. This batch retains the existing route-cached formations, base guard positions and dungeon escort systems. **These are code-rendered visuals, not the full high-resolution painted sprite sheets from the concept mockup.** Browser screenshots, combat balance and mobile layout still need human acceptance after CI deployment.

## Batches 2 and 3: gameplay completion and release verification (Nov 2026)

Batch 2 hardens the existing FOB management/economy: inoperable buildings are no longer counted as operational, and destroyed Medical Tents cannot treat patients. Food and water production now runs through a deterministic shared simulation (`src/survival.ts`) with automated tests for sustainable production, shortages, and storage limits. Previously approved dungeon crafting/extraction, boss and wave progression remain in place without visual changes.

Batch 3 adds an automated multi-expedition progression regression (`src/campaign.test.ts`) exercising deterministic three-floor dungeons, the rifle manufacturing queue, armor damage, squad casualties, tier-three guardian eligibility, defense prerequisites and final campaign victory. The verification suite includes these and existing dungeon, combat/equipment and progression tests; GitHub Pages publication is gated on verification and a build. **This is not an interactive beginning-to-victory playthrough**: actual game input, stage transitions, browser performance, and mobile/touch polish must still be validated on the playable site. Further production adjustments should respond to test findings rather than visual development.

## Mechanics milestone: active dungeon squad combat and survival consequences (November 2026)

Dungeon companions now move their obstacle-aware formation routes every frame, even when the player stops. Recruited expedition allies have a finite per-expedition support-ammunition reserve (eight shots per recruited ally), retained in active dungeon checkpoints. Cover order shoots at a slower cadence and shorter range; Assault fires faster and reaches farther. Injured escorted recruits do not fire. Companion targeting requires line of sight and ignores killed enemies. Nearby living dungeon enemies can now attack a stationary player with cooldown-limited damage; Cover companions within interception distance can absorb these attacks. On the FOB, depleted food or water applies small, nonlethal fatigue to living hired recruits every production cycle, without lowering health below 20 from shortages alone. Disabled Medical Tents cannot auto-treat, inoperative barracks no longer grant beds, and assigned guards can move to a valid tower during raids. Regression tests cover squad sightlines/range, finite survival effects, and existing campaign mechanics. Changes retain version-2 campaign saves and the active dungeon checkpoint key; browser acceptance still required.

## Dungeon roguelite conversion — initial playable milestone (November 4, 2026)

The default entry point now loads `src/roguelite.ts`, replacing the FOB startup screen with a single-player dungeon wave run. The original FOB code is retained at `src/main.ts` and original campaign saves remain under their old keys; new roguelite progress is stored separately per save slot. The new playable prototype includes procedural expanding dungeon floors, finite reinforcements, increasing horde counts, boss waves every five, elimination-locked elevators, supply caches, simple rifleman allies, between-wave shop purchases (ammo, medical care, armor, weapon tier upgrade and recruitment), run credits, death/restart, and small permanent unlocks earned from completed waves and bosses. `src/rogueliteRules.ts` contains tested wave scaling and payout rules.

**Scope:** This is the first gameplay conversion milestone, not the complete approved roguelite design. The richer Hybrid Armory rotations, class-restricted weapon categories, individual weapon/attachment inventory and four attachment slots, multiple ammo types, tactical squad commands, player/ally downed revivals, advanced zombie pathfinding, and polished art still require further implementation and playtesting. The current shop and weapon simulation deliberately provide a working foundation rather than claiming those systems are finished.

## Phase 2: Advanced combat and zombies (November 4, 2026)

Completed Phase 2 systems in `src/roguelite.ts` and `src/combatSystems.ts`:

- **Horde AI and awareness:** zombies investigate nearby gunfire, acquire visible targets and pursue using an efficient shared breadth-first distance field that routes around walls, doors and corridors; they can attack nearby player or squad targets. Short-lived aggro state, enemy attacks, wound states, bosses and the player weapon loadout persist in the ongoing run save.
- **Four regular infected variants:** shamblers, fast runners (waves 4+), armored infected (waves 8+), and bruisers (waves 12+). Zombie health is not inflated with every successive wave, preserving approved Horde Scaling.
- **Boss waves:** boss enemy every fifth wave, with rotating telegraphed slam, charge and shockwave patterns and an enraged low-health phase. Boss must be defeated with all scheduled infected to unlock the elevator.
- **Weapons:** playable primary firearm, sidearm and ammo-free melee; switch with keys 1/2/3 or touch buttons. Weapon rate/range/damage differ. Primary and secondary maintain separate magazines/reserves; timed reloading interrupts shooting. Rifle upgrade tier affects primary magazine, damage and fire cadence. Supplies and Armory now replenish both rifle and sidearm ammunition.
- **Reinforcements:** individual enemies spawn on safe unoccupied floor tiles near designated entrances, falling back to more distant free tiles where needed; all spawns remain finite and elimination-gated.
- **Combat support:** existing rifleman companion behavior, armor absorption, in-run cash and checkpoints are preserved.
- **Validation:** unit tests cover zombie role unlocks and stats, ammo transfers, distinct weapon handling, corridor route selection, armor mitigation, boss pattern rotation and damage zones. Browser playtesting and balancing remain advisable.

**Not part of Phase 2:** the larger Phase 3 inventory/attachment system and five ammo categories, fully specialized recruit classes, tactical squad commands, downed/revive mechanics, permanent skill trees, and production sprite integration. The legacy FOB version remains preserved in `src/main.ts`.

## Phase 3 — Full Armory & Equipment (November 4, 2026)

The dungeon roguelite now has a connected equipment economy implemented in `src/equipmentArmory.ts` and used directly by `src/roguelite.ts`.

- **Five weapon tiers:** Common (T1), Uncommon (T2), Rare (T3), Epic (T4), Legendary (T5). Weapon models include pistols, SMGs, carbines, assault rifles, shotguns, automatic shotguns, LMGs, marksman rifles, sniper rifles, knives, and axes. Tier increases improve meaningful fire-rate/damage/range/reload stats without weapon durability.
- **Four attachment slots:** Optic, Barrel, Magazine, Underbarrel/Grip. Red dots, scopes, suppressors, compensators, extended barrels, extended and quick magazines, grips, and bipods provide real bonuses. Weapon-model compatibility is enforced, one mod per category; mods can be detached and transferred between compatible equipped weapons.
- **Five ammo types:** Pistol/SMG, Rifle, Shotgun, Heavy, Precision. Equipped firearms consume their associated ammunition and have independent magazines and timed reloads. All five ammunition types are purchasable between waves, and ammo is available from dungeon supply caches.
- **Limited-slot inventory:** 12 starting backpack slots, upgradable during the run to 16/20/24. Spare weapons and attachments each use one slot; ammo occupies slots in typed stacks, and medkits stack three per slot. Equipping a weapon frees its backpack slot; replacing or removing gear respects space limits. The inventory menu supports equipment swaps, mod installation/removal, dropped supplies, and credits from sales at the Armory.
- **Hybrid Armory:** Between-wave essentials (five ammo categories, medkits, HP and armor recovery, backpack upgrades) are always available. A seeded rotating set of three weapon and three attachment offers, plus a recruit slot, changes each wave. Paid rerolls, increasing rarity with wave progression, higher-tier direct purchases and credit-based item upgrades are implemented. Equipped guns and installed attachments can be upgraded without removing their mods.
- **Hybrid Dungeon Loot:** Supply and credit caches persist as collected in run saves; some crates reveal tiered equipment and do not consume their loot if the bag is full. Each boss guarantees an additional equipment reward (or credits when there is insufficient backpack capacity).
- **Compatibility:** The existing roguelite save keys, profile records, waves, checkpoint rules, and the preserved legacy FOB code remain unchanged. A missing `equipment` object in a Phase 1/2 run save is migrated to a starter carbine/pistol/knife loadout with its former tier, magazines and ammo reserves retained.
- **Testing:** Phase 3 pure-rule tests cover item rarity, independent ammo families, compatibility restrictions, tier scaling, attachments' stat effects, backpack stack capacity, stable rotating shop offers and guaranteed boss drops. TypeScript, unit tests and Vite builds run in the repository CI.

The Phase 4 specialized squad AI/abilities and downed/revive system, Phase 5 expanded metaprogression, Phase 6 asset rendering, and real-world browser acceptance tests remain separate milestones. The Phase 3 Armory currently rotates the Rifleman recruit offer; richer class recruitment arrives with Phase 4.

## Phase 4 — Specialist Squads & Revivals (November 4, 2026)

The active roguelite entry point now uses `src/squadSystems.ts` to manage the approved five specialist AI classes, tactical orders and bleed-out/revival system. Existing Phase 1–3 squad save records are migrated to Riflemen without replacing the player's saved equipment, inventory, waves, currencies or profile.

- **Squad roles:** Rifleman (general combat), Medic (field heals and rapid rescue), Heavy Gunner (suppression and heavier armor), Scout (long-range precision and visible enemy marking) and Engineer (nearby defensive traps and limited armor repair). Each role spawns with an appropriate class-restricted firearm, armor, skill cooldowns, and individual ammo reserves. Four companions plus the player remains the maximum team.
- **Class recruitment and management:** the rotating Armory recruit offer draws from all five classes. The TEAM button opens individual specialist status, gear and equipment; compatible weapons from the backpack can be assigned per teammate. Between waves, purchased treatment, armor, specialist ammunition and tiered class gear upgrades are available. Unwanted squad weapon swaps preserve old weapons in the backpack.
- **Tactical commands:** Q (or the Squad button) cycles Follow, Hold Position, Focus Fire, Regroup and Defensive. In Focus Fire, select an enemy on the dungeon map by clicking or tapping it. Companions navigate toward their assigned positions or targets and automatically shoot if a visible target is within their class range. Orders affect rescue priorities, movement and target selection.
- **Timed downed states:** the player is immobilized and unable to fire or use supplies at zero HP, with a 30-second bleed-out clock. AI teammates can rescue the player, with Medics faster. Squad members have 25-second bleed-out windows and can be rescued by eligible teammates or manually by standing near them and holding V/the touch REVIVE control. Expired teammate bleed-out permanently removes that recruit from the current run; expired player bleed-out ends the run and awards progression currency. Player and teammate HP/armor carry over; no automatic free recovery is added.
- **Enemy interactions:** zombies can injure or down companions; boss attacks affect both player and nearby AI. Squad gear, damage, rescue state and class order are serialized in the active run's existing save key.
- **Tests and verification:** `src/squadSystems.test.ts` covers specialist starting gear, class restrictions, recruitment, healing/revival rules, permanent casualties, legacy save migration, class tier upgrades and timed rescue priorities.

**Testing limitation:** automated TypeScript, unit tests and Vite production builds pass; complete manual browser combat playthrough and balancing are not yet done. Phase 5 metaprogression depth, Phase 6 artwork and Phase 7 final playtesting remain future milestones.

## Phase 5 — Hybrid Permanent Progression (November 4, 2026)

The roguelite now uses `src/metaprogression.ts` and the permanent-profile UI in `src/roguelite.ts` to implement approved long-term progression and customizable new-run loadouts.

- **Durable save migration:** Existing `deadzone-roguelite-v1-slot-<n>-profile` data from Phases 1–4 is loaded and migrated in place, retaining earned legacy tokens, best wave, run count, previously purchased starting credit bonuses and the starter teammate entitlement. Old active-run saves still use the same key and work without the new performance fields.
- **Permanent unlock store:** Spend legacy tokens to unlock starting SMG/assault rifle/shotgun/marksman rifle/fire axe, starting red-dot optic and grip, modest extra armor/medkit/backpack capacity, four additional recruitable specialist classes, and an expanded rotating Armory catalog. The prior +50 starting credits (max +200) and single starting teammate unlock remain intact.
- **Pre-run loadout screen:** Before deploying into a new run, select an unlocked Common-tier primary, sidearm (pistol), melee, compatible optic and grip, and an optional single starting teammate chosen from unlocked classes. The preparation screen revalidates selections against purchased unlocks; gear, ammo reserves, starting backpack and survival bonuses initialize on deployment. Higher-tier equipment remains exclusive to in-run acquisition and upgrades.
- **Metaprogression economy:** Separate in-run Armory credits from persistent legacy tokens. Every wave and every boss pay permanent tokens, and a bounded end-of-run bonus pays for kills, scavenging and flawless clears. Runs ending after at least one kill award a modest minimum bonus.
- **Nine one-time achievements:** First Clearance, Boss Breaker, Dedicated Survivor, Ten Deep, Against All Odds, Scavenger, Untouchable, Team Player and Exterminator. Each has an independent reward paid once per profile, with completed achievements retained across runs and resume sessions.
- **Wave performance:** A run tracks total infected killed, crates looted, completed waves without taking damage, and the largest squad successfully present at a wave clear. A run-ending summary itemizes wave/boss rewards, performance tokens and newly earned achievement tokens.
- **Armory specialization:** Advanced class recruit offers require permanent class unlocks; Riflemen remain available as the baseline choice. An expanded Armory catalog purchase adds two extra rotating equipment offers per wave.
- **Coverage:** `src/metaprogression.test.ts` verifies old-profile migration, unlock eligibility, starter loadout tier caps, class restrictions, one-time achievement payout and short-run rewards. Automated CI typechecks, unit tests and production builds validate the integrated game.

The game is still undergoing further development. Phase 6 art integration and Phase 7 full manual playtesting, visual polish and balance remain outstanding. The legacy FOB campaign code remains preserved.

## Phase 6 — Visual Asset Integration (November 4, 2026)

The default dungeon roguelite renderer has been rebuilt around original, source-controlled top-down vector artwork. The repository previously contained no character or dungeon sprite files, so this phase adds a new, unified style rather than claiming to have imported previously approved external illustrations.

- **Original sprite atlas:** `src/assets/deadzone-sprites.svg` contains fourteen distinct, integrated image cells: player, Rifleman, Medic, Heavy Gunner, Scout, Engineer, Shambler, Runner, Armored Infected, Bruiser, Boss, loot crate, extraction elevator and reinforcement entrance. These replace the gameplay placeholder squares. Squad class colors and zombie silhouettes differ; existing health bars, focus markers, and boss attack tells render above the image-backed actors.
- **Dynamic environment art:** `src/rogueliteVisuals.ts` paints detailed, deterministic floor and wall tiles with grungy surface variation, seams, rubble, stains, raised masonry and atmospheric shading. Texture variation is based on dungeon coordinates/seed, so it does not shuffle from frame to frame. A visual elevator switches into a luminous, unlocked state when the wave is cleared; loot containers and entrances use atlas sprites.
- **Following camera and aim:** Instead of squeezing entire later-wave maps into the screen, the viewport tracks the player and clamps to dungeon bounds. Mouse/touch-to-world conversion and focus-fire targeting now use the same camera transform as drawing to maintain aiming accuracy. Rendering avoids off-screen sprites and tiles.
- **Tactical HUD and menus:** `src/rogueliteTheme.css` styles the main header, Armory, inventory and starting-loadout screens in a cohesive industrial dark-green palette. An overlaid compact combat panel exposes live health/armor bars, equipped weapon, ammo, squad count and enemy status. Controls, overlays and status typography scale down on smaller displays, support keyboard focus and respect reduced-motion preferences.
- **Preserved gameplay:** Enemy quotas, bosses, specialist AI, squad orders, downing, medkits, weapon/attachment inventories, tiered Hybrid Armory, permanent unlocks and existing save keys are unchanged.
- **Validation:** `src/rogueliteVisuals.test.ts` verifies the sprite atlas cells, camera projection round-trips at desktop and mobile dimensions, scene culling and status coloring. All established tests and the production build run through the existing CI workflows.

**Scope notes:** This is a working original vector-art pass, not the final hand-painted/high-detail reference artwork; there were no previously approved image files available to integrate. Real-device/browser visual review and end-to-end tuning remain Phase 7 tasks. The preserved legacy FOB game remains in the repository but is not launched by default.

### Phase 6 equipment art addendum
A second original asset atlas, `src/assets/deadzone-gear.svg`, now supplies 24 image cells for all eleven weapon models, nine attachment models, medical supplies, armor, ammunition and currency. `src/gearIcons.ts` maps the game catalogs to the image cells. Icons display directly in the rotating Armory, weapon/attachment inventory listings, equipped loadout and configurable pre-run equipment preview. A dedicated regression test checks catalog coverage, atlas dimensions, and one-to-one sprite references.
