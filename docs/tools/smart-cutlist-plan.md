# Smart generator: plan and construction standard (draft)

> Drafted 2026-11-17 from a conversation with the owner. **Nothing is built.**
>
> **Owner decisions 2026-11-17:** (1) the Smart Generator is its **own build**, listed under Tools as **Experimental**; it does NOT refactor `cutlist.html`. If it proves itself, it replaces the existing tools later. (2) **Groove depth is the member's own setting**, not a standard (router or saw, depth varies): it belongs in the Construction tab of shop settings. (3) F1–F3 below are fixed in `cutlist.html` (see `docs/tools/cutlist.md`). Status: waiting for the owner to correct the rule book (section 4) from his own practice. Everything marked **[OWNER]** is a question only he can answer.

## 1. What it is

One generator for every sheet-goods job (wardrobes, kitchens, TV units, vanities, shelving, office units), instead of a separate page per item. Almost everything is **carcasses joined together**, so the tool works with a small set of parts and one construction standard.

The pitch to members: **describe it or snap the sketch, check the drawing, print the cutting-shop sheet.**

Who it is for: professionals. Nobody starts from a blank page or hands the job to the AI. The AI guides and suggests; the carpenter decides.

## 2. How it fits together

```
 words / sketch photo ──► AI (suggests a spec) ─┐
                                                ▼
                    member's own choices ──► SPEC (JSON) ◄── spec editor + front-view drawing
                    (shop settings)             │
                                                ▼
                               ENGINE (plain code, tested)
                               applies the joint rules, sizes every part
                                                │
                     CHECKS (plain code) ──► warnings shown beside the drawing
                                                │
                                                ▼
                          PARTS LIST ──► existing Cut Sheet
                                         (board packing, edge band ticks, print)
```

Three firm rules:

1. **Every number on the printed sheet comes from the engine, never from the AI.** The AI only fills in or changes the spec. The member sees the drawing and confirms before any parts are made.
2. **Joint rules change dimensions; checks do not.** They are kept apart in code and on screen.
3. **Every default shows its reason and can be changed in the member's own settings** (the shared Settings panel built 2026-11-17 gets a "Construction" tab). An overridden rule is marked on the drawing and the print, so the workshop knows the job differs from the standard.

The back half already exists: `cut-sheet.html` takes parts and gives board count, guillotine packing, edge-band ticks and the printed machine-shop sheet. The work is the spec, the engine, the editor and the checks. The AI comes last.

## 3. The spec (first sketch, to be refined in build step 2)

```json
{
  "job": "Kitchen, East Legon",
  "material": { "carcass": "18mm white melamine", "fronts": "18mm oak melamine", "back": "3mm hardboard" },
  "units": [
    { "type": "base",  "w": 600, "h": 720, "d": 560, "interior": [ { "kind": "drawers", "count": 3 } ], "front": "drawer-fronts" },
    { "type": "base",  "w": 800, "h": 720, "d": 560, "interior": [ { "kind": "shelf", "fixed": false, "count": 1 } ], "front": { "doors": 2 } },
    { "type": "wall",  "w": 800, "h": 700, "d": 320, "interior": [ { "kind": "shelf", "fixed": true, "count": 2 } ], "front": { "doors": 2 } },
    { "type": "tall",  "w": 600, "h": 2100, "d": 560, "interior": [ { "kind": "zones", "zones": [] } ], "front": { "doors": 2 } }
  ],
  "run": { "plinth": 100, "worktop": "separate", "fillers": [] },
  "overrides": { }
}
```

Unit types to start with: **base, wall, tall, wardrobe section, open shelf unit**. Interior parts: fixed shelf, adjustable shelf, divider, drawer stack, hanging rail, open. Fronts: hinged doors (1 or 2), drawer fronts, lift-up flap (later), sliding (wardrobe only, later).

`overrides` holds any joint rule the member changed for this job only (their shop default lives in settings).

## 4. Construction standard: first draft for the owner to correct

The guiding principle, from the owner: **load should put screws in shear (pushed sideways), never in withdrawal (pulled out of the hole).** Many rules below follow from it. The second principle: **never rely on a screw into chipboard end grain to carry load; use a confirmat or a dowel there.**

### 4a. Joint rules (these change cut sizes)

| # | Rule | Draft default | Why | What it changes | [OWNER] |
|---|---|---|---|---|---|
| J1 | Top and bottom vs sides (base, tall, wardrobe) | Top and bottom sit **between** the sides | Sides run to the floor/plinth and carry the load; fixings through the sides are in shear | Top/bottom width = W − 2T; side height = H | Confirm. Matches the current wardrobe tool. |
| J2 | Wall unit bottom | **Between** the sides, fixed through the sides | Weight of the contents pushes the bottom down; through-side screws are in shear. A bottom hung under the sides pulls the screws out | Bottom width = W − 2T | Confirm. |
| J3 | Wall unit top | Between the sides | Same as J2; also lets the hanging rail sit under the top | Top width = W − 2T | Some shops put the top over the sides for a clean top line. Which do you use? |
| J4 | Fixed shelves | Fixed **through the sides** into the shelf ends with confirmats (or dowels + glue) | Shelf load in shear on the fixing; the owner's example | Shelf width = opening width exactly | Confirmat or dowel as default? Screw size? |
| J5 | Adjustable shelves | Sit on pins, **2 mm clearance each side**, set back from the front | Easy to lift in and out | Shelf width = opening − 4; depth = carcass depth − set-back | Set-back now 50 mm from the front in the wardrobe tool. Right for kitchens too? |
| J6 | Back panel | 3 mm hardboard **in a groove** in sides, top and bottom | Squares the carcass and hides the edge | Back size = opening + 2 × (groove depth − 1 mm play); top/bottom depth = D − (groove set-in + back) | **Decided:** groove depth is the member's own setting (default 8). Still open: how far in from the back edge is the groove? |
| J7 | Hanging (wall units) | Hanging rail (18 mm, about 80 mm tall) across the back under the top, screwed to the wall; back panel stops at or is notched for the rail | The rail carries the unit, not screws through a 3 mm back | Adds a rail part; back height shortened | Rail, French cleat or hanging brackets as your default? |
| J8a | Wardrobe subframe | **Owner 2026-11-19:** a gridwork between the sides; the sides run to the floor and are screwed to it from inside before the bottom goes on. A separate plinth with box carcasses on top only for several units fitted in (toggle) | | Side height, rail lengths | Decided; setback toe-kick details still open |
| J8 | Base units: plinth | Separate subframe/plinth (as the wardrobe tool: front, back and mid rails, face panel with 3 mm gap, optional set-back) | Levels on uneven floors, protects the carcass from mopping water | Side height = H − plinth (kitchen) | Kitchens: subframe like wardrobes, or adjustable legs? Same set-back? |
| J9 | Doors | **Full overlay**: outer edge 2 mm in from the side's outer face; over a shared divider each door covers **half the divider less half the door gap** | Clean, even reveals; doors on a shared divider must not overlap each other | Door width (see F2) | Confirm 2 mm. Inset doors needed as an option? |
| J10 | Drawer boxes | **Owner 2026-11-19:** box width = opening − **27 mm** (play so the runners never bind when a cut runs over; member-editable); front and back full width, sides between them, base underneath. Was: box width = opening − 26 mm (13 mm each side for ball-bearing runners); box height = front height − 24 mm; box depth = nearest runner length below carcass depth | Runner makers fix the side clearance; the box length must match a runner you can buy | Drawer box sides, front/back, base | Which runners do you stock (lengths)? Soft-close undermount ever? Box sides 16 or 18 mm? |
| J11 | Worktop | Not cut in the generator; base units get front and back top rails (100 mm strips) instead of a full top | Saves board; worktop is stone/solid wood, priced separately | Base top = 2 rails, not a panel | Do you use rails or a full top under stone? |
| J13 | Drawers behind a door | **Separate drawer chest** set back 80 mm; 60 mm filler strips on the outside front of the chest sides fill the gap to the carcass; 69 mm face strips (gap + 9 mm overlap; ≥ 60 mm for the edge bander, overlap < board so drawer boxes clear) glued to the fillers cover the joint; drawer fronts sit between the face strips with 3 mm gaps (owner's method, Bortianor wardrobe) | The set back clears hinges and the open door; the chest is built square on the bench; the strips hide the gap | Chest parts, fillers, face strips, inside fronts, drawer boxes sized to the chest | **Decided 2026-11-17** (already built in `cutlist.html`); defaults owner-corrected 2026-11-18 |
| J12 | Applied end panels | Separate finished panel on exposed ends, proud of the door face by door thickness + clearance | Matches the wardrobe tool | Adds end panel parts | Confirm for kitchens. |

### 4a-k. Kitchen rules: owner's answers 2026-11-21 (first test job: the Prampram kitchen)

These settle the kitchen [OWNER] questions above where they differ from the draft.

- **Base units stand on legs, not a plinth frame.** Adjustable cabinet legs, sold in sets of 4, 10 cm or 15 cm high; the owner usually uses **10 cm**. Sides do not run to the floor.
- **Rails (80 mm), not a full top.** Base units get **4 rails**: two flat at the top (front and back), and two upright at the back (top and bottom). The upright rails keep the carcass square and are what the carcass is screwed through to the wall. Wall units get **2 rails at the back, top and bottom** (the wall fixing). Rail length = unit width − 2 × board.
- **Depths:** standard is 580 base / 280 wall carcass, but the client's own depths win when given (Prampram: 60/40/30/28 cm including the door).
- **Toe kick set back 80 mm.**
- **Back panels are screwed on from the back, not grooved.** That adds 4 mm at the back, which is why applied side/end panels get **+5 mm on their width (depth)**. **Exception: the sink unit has no back** (left open for the pipes).
- **Doors with a J-profile are shortened by the profile's height.**
- **Drawers follow the wardrobe drawer rules (side-mount runners).** An undermount toggle comes later.
- **Adjustable shelves in wall units are set back 20 mm** (the 50 mm wardrobe set-back is too much in a 280 carcass).
- **L-shaped corner units:** the L top and bottom are **one piece, routed out of a square cut at the larger of the two leg sizes**. The cut list gives the square; the routing is a note.
- **Worktop riser:** a 2 cm riser (offcuts of the quartz or laminate strips) sits between the carcass and the 2 cm slab, so the doubled 4 cm front edge finishes flush with the top of the carcass instead of dropping over the doors. So the **carcass top = worktop height − 4 cm**, and on 10 cm legs the **base side height = worktop height − 4 − 10** (a 90 worktop gives 760 mm sides).
- **Legs per unit:** 4 up to 80 cm wide, 6 over 80 cm, and an L corner unit may take 8.
- **Toe kick:** the leg height (10 cm), set back 80 mm, **one long board per run**. Bought in 3 m lengths, silver or black, GH₵150 each (for the price list).
- **J-profile height:** a member setting, default **35 mm** (the common size for 18 mm doors, for example a 35 × 19 mm J-profile listed for 18 mm board). The member measures their own stock; the door is shortened by this height.
- **Later, each probably with its own logic:** the tall appliance unit (oven/microwave openings, lift-up flap), the folding-door pantry, the island (back-to-back units, sliding doors, the 10 cm band) and the laundry (unit under a floating steel frame).

### 4b. Checks (warnings only; nothing is resized)

| # | Check | Draft limit | Suggested fix shown |
|---|---|---|---|
| C1 | Shelf span | 18 mm chipboard/melamine shelf longer than **800 mm** (loaded) | Add a divider, use thicker board, or add a front lipping |
| C2 | Hinges per door | Up to 900 mm tall: 2 · 900–1600: 3 · 1600–2000: 4 · over 2000: 5 | Hinge count printed on the sheet |
| C3 | Door width | Hinged door wider than **600 mm** | Split into two doors |
| C4 | Wall unit fixing | Wall unit with no hanging rail or cleat | Add J7 |
| C5 | Drawer runner fit | Carcass depth shorter than the shortest runner + 10 mm | Pick a shorter runner or deepen the unit |
| C6 | Doors meet | Door total width does not equal unit width minus reveals (catches mistakes like F2) | Shows the difference in mm |
| C7 | Tall unit tipping | Tall unit or wardrobe over 1800 mm with no wall fixing noted | Add anti-tip fixing to the notes |
| C8 | Board fit | Any part longer than the sheet (2440 × 1220) | Split the part or join |

**[OWNER]:** correct the limits from experience, and add the checks you find yourself telling apprentices again and again. Those are the ones members will value most.

### 4c. Shop settings (member-level, not rules)

Board thickness (18/16), back thickness (3/6), sheet size (2440 × 1220), kerf, edge band thickness, plinth height, runner lengths stocked, hinge type, standard heights (base 720, wall 700, worktop 900 from the floor, wall unit bottom 1450 from the floor). These go in the shared Settings panel, Construction tab.

## 5. Findings in the current wardrobe cutlist (`cutlist.html`)

Found while drafting this plan, 2026-11-17. **F1–F3 FIXED 2026-11-17** (details in `docs/tools/cutlist.md`). Two more found while fixing, left for the owner: the shared-divider unit join sizes each unit as if it had two sides (tops ~9 mm short), and drawers behind a full-height door get external-size fronts.

- **F1. Groove depth equals back thickness.** The inset back is cut at opening + 2 × back thickness, so a 3 mm back assumes a 3 mm-deep groove. Grooves are usually about 8–10 mm deep in 18 mm board. If the workshop cuts deeper grooves, the back panel comes out up to about 12 mm short each way and rattles. Needs a separate "groove depth" setting. **[OWNER]: how deep do you groove?**
- **F2. Doors overlap on dividers (real bug).** Every hinged door gets the full outer overlay (board − clearance, 16 mm) on **both** sides, even where it meets a shared divider. On the default wardrobe (one carcass, 3 sections, 18 mm board) the three doors add up to **24 mm wider than the carcass**, and neighbouring doors overlap by about 14 mm on each divider. A member cutting the default would have to trim the doors. Fix: over a divider each door covers (divider − door gap) / 2. Small change in `calculate()`, needs a before/after check on a printed sheet.
- F3 (minor). The drawer-front formula uses the "Edge clearance" input as overlay (default 11 in the code, 2 in the field), while doors use board − clearance. Drawer fronts and doors in the same section can come out different widths. Fold into the J9 rule.

The engine is a separate build (owner decision), so there is no part-for-part parity requirement; the fixed `cutlist.html` is still a useful cross-check for plain wardrobes.

## 6. Where the AI helps (and where it does not)

Helps:
- **Words → spec:** "kitchen L-shape, 3.2 m by 2.1 m, sink under the window, tall unit for the oven" → a spec filled into the editor, with its guesses marked.
- **Sketch photo → spec:** the hand drawing or WhatsApp photo jobs actually arrive as. Measurements it can't read are left blank and flagged, never guessed.
- **Explain a rule or a check** in plain words, using the "why" column above.
- **Suggest** ("this 1000 mm wall unit will sag at the shelf; split it into 2 × 500?"). The member presses accept.

Does not:
- size any part, count boards, or touch the printed sheet;
- change a member's shop settings or overrides by itself.

How: Claude API via `concierge-api` (key stored as a Worker secret, never in the browser), with the spec format as a strict output schema and a few worked examples. No training. Members only, with a daily cap per member. Cost per call is small; check the actual figure at build time.

Later: keep each member's edits to AI-suggested specs (with their consent) and use their own past jobs as examples, so the suggestions follow how their workshop builds.

## 7. Build order (one step per session)

0. **Owner:** correct section 4 (and answer F1). Check the cutlist/cut-sheet usage numbers in Concierge admin Insights to confirm the demand is there.
1. ~~Fix F1–F3 in the current wardrobe tool.~~ ✅ DONE 2026-11-17.
2. **Spec format + engine** (`js/smart/engine.js`, no UI): wardrobe units first, written fresh against the construction standard. Cross-check plain wardrobes against the fixed `cutlist.html`. New page `smart-generator.html` listed under Tools as **Experimental** (member-first). **Engine DONE 2026-11-19 (owner: "yes" to starting the wardrobe engine):**
   - `js/smart/engine.js` (`window.SmartEngine`): **positions first**: every part is placed as a box (mm; x right, y up, z front to back) and the cut list is read off the boxes (`cutList`), so the list and the 3D model cannot disagree. `build(spec)` returns `{boxes, parts, clashes, warnings}`; `forViewer(boxes)` gives the shape `js/cutlist-3d.js` draws (`Cutlist3D.mount(host, boxes)`).
   - **Spec (wardrobe):** `{ w, h, d, units, sections:[{zones:[{type:'shelves'|'hanging'|'drawers', h, shelves, drawers}], door:{on, count, type:'hinged'|'sliding', bottom:'full'|'panel'}}], shop:{...} }`. `SHOP` holds the standard (board 18, inset back 3 in an 8 mm groove with 1 mm play, shelf clearance 2 and set back 50, edge clearance 2, door gap 2, top/bottom gap 2, runner gap 27, box set back 100, drawer chest 80/60/9/3, subframe built-in 100 high set back 60 with 18 mm rails and 3 mm face gap, flush end panels, no pelmet); `shop` overrides any of it (deep merge), which is where a member's own clearances and the future Construction tab plug in.
   - **Zones are stacked from the bottom at their real heights** and the top zone takes what is left (the cutlist stretches zones to fit, so its 3D positions are approximate); a warning is raised if zones add up to more than the inside height.
   - **Parity test** `node scripts/test-smart-engine.mjs` (Playwright + a local server): 9 wardrobes (default; 2 units × 4 sections; outside drawers; nail-on back + flush toe kick; separate plinth; sliding doors; extended end panels + pelmet; 5 sections with a member's own clearances; 3 units × 6 sections with manual mid-rails): **every part name, size and count matches `cutlist.html`, and no parts clash.** Proven to catch errors: a planted drawer-box set-back change and a planted long mid-rail were both reported (the mid-rail as a size difference AND a clash with the back rail).
   - Kept for parity, worth the owner's eye later: shelf depth = depth − 50 ignores the back panel; end panel depth adds the *shelf* clearance; sliding leaves are 55% of the opening. Next: the experimental page (spec editor + 3D + cut list) or kitchen units once the owner answers the kitchen questions.
   - **Experimental page DONE 2026-11-20 (owner: "go with A … put an under construction label so people can try it out but we don't bear liability"):** `smart-generator.html` (plain HTML on `css/app.css`, noindex, not in the sitemap). Open to everyone so people can try it; client 3D file and SketchUp file are members only (same as the cutlist). Spec editor: size, carcasses (1–4), sections (1–8), per section a front (no door / 1 or 2 hinged / sliding) and up to 4 spaces listed top to bottom (shelves, hanging, drawers; the top space takes the rest). Construction settings (board, back type/thickness, groove, edge gap, door gap, runner gap, toe kick height/set back, subframe mode) remembered per device in `nwd-smart-prefs`, Reset to standard. Output: warnings + clashes (or a green "no clashes"), the shared 3D viewer, the cut list grouped by carcass/subframe/doors/shelves/drawers/end panels with piece count and board m² (backs excluded); on phones notes move under the part name. **Liability:** a yellow "Under construction" banner (experiment, not fully checked, may change or be removed, check every size before cutting, Neewoody and Carpentry Concierge accept no responsibility for material cut, work done or money spent; WhatsApp link to report problems); a tick box "I will check every size myself before cutting" is required before Send to the Cut Sheet, Print or the exports (remembered per device, `nwd-smart-ack`); the printout carries the same notice in a box. A disclaimer limits exposure but is not legal advice. **Send to the Cut Sheet:** writes `nwd-smart-handoff` `{from, at, name, parts:[{name,L,W,qty}], thick}`; `cut-sheet.html` `takeSmartHandoff()` reads it once on load (ignored after 30 min), asks before replacing a list that has parts (the current list stays in its project; `newList()` offers to save an unsaved one), names the list "Wardrobe WxHxD (Smart Generator, check sizes)". Edge banding comes on as standard (2026-11-20): `SmartEngine.edges(part)` (same rules as the cutlist's `ebDefault`, enforced by the parity test) shows per part on the page ("all round", "1 long, 2 short"…) with the total metres, and travels in the handoff as `eb {t,r,b,l}` so the Cut Sheet opens with the edges marked; length = the longer size (grain), so the long edges are l/r. Members tap off what a job does not need. Listed on `/tools` and in the member Tools tab as Experimental; What's new #44. Tested in Playwright: default and changed specs build with no clashes, bad sizes show "Fix these first", the tick box blocks sending, handoff lands 29 parts with thickness 18 and is removed after use, no horizontal scroll at 375 px.
3. **Kitchen units:** base, wall, tall, drawers, plinth, hanging rail. Test against a real past Neewoody kitchen's cut list.
   **Started 2026-11-21 (owner: "yes, start building"), first test job the Prampram kitchen:**
   - `kitchen(spec)` in `js/smart/engine.js`, reached through `build()` when `spec.type === 'kitchen'`. Wardrobe output is unchanged (old and new engine compared: identical).
   - **Spec:** worktop height, room width, and runs. A run is a wall (back, left or right), a start position, a stand-off from the wall, a carcass depth, base or wall, and for wall runs a bottom height, a height and a ceiling filler.
   - **Units:**
     - `base` (drawers listed top to bottom, or doors)
     - `sink` (no back; warns about the sink cut-out against the rail gap)
     - `wall` (shelves; `fixed` = how many of the lowest shelves are fixed)
     - `panel` (18 mm side panel between units, floor to carcass top, +5 mm deep)
     - `filler`
     - `cornerL` (back leg, return, return depth, side; the L bottom/top/shelves are one routed blank each; bi-fold pair; carousel optional)
   - **Base units:** legs, 4 rails, J-profile-shortened fronts. A `hob` warning fires when the cut-out is deeper than the gap between the top rails.
   - **Hardware tallies:** legs, J-profiles, hinges by door height, bi-fold sets, runners by length, toe-kick 3 m boards per run, carousel.
   - **Ceiling filler strips** are listed as parts (≤ 2400 pieces).
   - **Test:** `node scripts/test-kitchen-prampram.mjs` (plain Node, no browser): main U run, right run and both wall-cabinet runs. 304 pieces, **no clashes**, 24 boards by the Cut Sheet's packing (backs excluded).
   - **It found two real problems in the job:** the hob cut-out (490) was deeper than the 420 between D's top rails, and the sink cut-out (420) had 0 mm to spare between E's rails. **Owner's fixes (2026-11-21), now built:**
     - **Under a hob,** the front rail is stood upright, the flat back rail is left out, and the upright back rail comes up to the top. That gives 544 mm for the hob, and the top drawer box stays under the front rail.
     - **Under a sink,** the flat rails are 60 wide (`sinkRail`), giving 460 mm, so 40 mm spare.
   - ~~Not yet:~~ **Built 2026-11-23:** tall unit A, pantry K, the island, the laundry (owner: their own logic).
   - **Owner's answers 2026-11-23:** (1) tall units stay within the board: 240 overall max, 230 box on 10 cm legs for a 4×8 (engine: box ≤ board length − 140, so 2300); a board-size setting (4×8, 4×9, 6×9; the owner avoids 4×9 and 6×9 because they almost never come in laminate, always chipboard). Amina's 270 units are two stacked boxes, one holding both appliances and one above. (2) K's door: one fold, full height. (3) Island: legs and a toe kick (no plinth frame). (4) Island sliding doors: bottom-rolling track.
   - **Built:** `tall` unit with zones bottom to top (`drawer h [xN]`, `oven`, `micro` (shelf + lift-up flap, J at the bottom edge), `cubby h RxC`, `shelves N`, `|` = upper box), fixed shelves between zones, internal dividers stop at the back rails, oven niche checks (560 wide, 600 high inside) and a vent note; doors over shelves/cubbies (hinged per box, or one fold over all); a warning when a top-edge J-profile ends above 1800. Tall end panels (`panel` with `h`, `extraD`) split at the box joint when longer than the board. Island run (x, z, axis, depth, top = quartz underside): units on legs, carcass = top − 100 band − legs; `slide` units are back-to-back pairs with two overlapping leaves on a bottom track; one-sided units get a back cover; end panels and the 100 gloss band all round; toe kick all round. Laundry: run `carcTop`, unit `frontTop`, run `items` (bought items). `price.js` packs on the chosen board.
   - **Owner's follow-up 2026-11-23:** tall units usually have cup-hinge or lift-up doors; K's fold is a customer request. Lift-ups come in two kinds: on hinges with a gas or mechanical spring stay, and hingeless fittings. Accra sliding attachments (flat track below, bigger track above) don't suit a full-depth carcass and side panel: the carcass is set back by the top track's depth. What matters inside most units is how many shelves (the cut list); the installer places them on site; exact positions are an option for the 3D and drawings. Drawer boxes are lower than their faces (a settings section). Decide A's heights from the oven and microwave. Pulls at hand height. Laundry wall cabinets copy C's height. Islands with an overhang: one large panel the size of the top less the doubled edge (usually 8 cm all round), not strips. B gets a vertical divider. Island where Amina drew it.
   - **Built the same day:** door type per tall box (`boxDoors`: hinged, liftHinge, liftFree, slide, fold), microwave flap `lift`, `slidePair()` with the carcass set back `slideD` (50; tracks `slideBot` 10, `slideTop` 30, all settings), `drawerBox()` (front − `drawerDrop` 50, min 80), J edge by `reach` 1800, shelf `at` / `shelfAt`, centre divider over 800, island `topW`/`ohStart`/`ohEnd` + Island Top Panel (no banding). Track depths and the drawer drop are first values for the owner to correct.
   - **Door types everywhere (owner 2026-11-23):** "base units and primary wall units are pretty much hinged doors but wall units can sometimes have multiple horizontal doors that lift up"; base units with doors get a type (useful for TV units, which usually drop down, supported or unsupported by a strut); wall units hinged or lift-up, and lift-ups follow the shelves behind them. Research (Blum AVENTOS, Grass Kinvaro, Sugatsune): lift-ups come as a flap on hinges with a stay (HK-type, single flaps about 350-600), parallel lift (HL, 350-600), up-and-over (HS, up to about 800), bi-fold lift (HF / F-20, cabinets about 480-1040); drop-downs use bottom hinges with a soft-down stay sized by door height x weight, the short stays suiting low TV-unit flaps. Built: `doorSet()` shared by base, wall and tall units; lift-ups split one per shelf space; bi-fold lift = upper panel (no handle) + lower panel; drop-downs pull on the top edge.
   - **Standard for everyone (owner 2026-11-23):** "I am not building this just for myself." L corners are non-standard (an option only); blind corners are standard and Euro modular rules apply; Amina's laundry and U are non-standard and come off the page. Owner's blind-corner rules: base 1000 or 1200; corner gap = an 8 cm filler; the blind part closed by a panel on the front; wall corners are blind corners too. Built: unit `blind` (side, otherD, doors/door type, shelves, optional magic corner / LeMans pull-out); starters straight (3000), L (3000 + left run), U (3600 + both side runs), laundry (sink unit, washer and dryer spaces, cupboard, wall units); side runs start at the blind run's carcass + back + door (581 base, 321 wall) and begin with the 80 filler. Prampram kitchen/laundry at `#prampram` / `#prampram-laundry` (not linked).
   - **Undermount vs side mount (owner 2026-11-23, "research undermount installation procedures and tolerances, Temax and Blum"):** Blum TANDEM/MOVENTO: inside drawer width = opening − 42 mm (tolerance +0/−1.5), drawer sides 16 mm max, bottom recess 13 mm, drawer length = nominal length − 10, minimum clearances about 7 mm above and 14 mm below the box, rear notches and a hole for the tilt/hook device per the runner sheet, locking devices on the front. Knape & Vogt MuV: the same 42 mm deduction, 12.7 recess, 16 mm sides. Temax: no installation sheet found; a supplier lists Temax runners 250–550 mm in 16 and 18 mm side versions. Built as the kitchen setting `runner` with every value editable.
   - **To confirm with the owner:** (older list) the heights inside A (drawer 300, oven niche 600, microwave 450) and K (drawers 300/2×300/3×200, cubbies 300); which side Island A faces; how the quartz is carried over the band; the laundry wall-cabinet height; whether tall doors pull from the top edge (Amina's rule) when the edge is at 2.7 m.
   - **Kitchen editor on the page DONE 2026-11-21 (owner: "build the kitchen editor on the Smart Generator page"):** `smart-generator.html` has a Wardrobe / Kitchen switch (remembered per device in `nwd-smart-mode`; `#kitchen` in the URL opens it). Kitchen side:
     - worktop height and back wall length; "Start a straight kitchen" and "Load a U-shaped example" (the Prampram job without names: gives exactly the test's 218 rows / 304 pieces, no clashes).
     - **Runs** (name, base or wall, which wall, depth, starts at, off the wall; wall runs add bottom height, height, ceiling filler) and **units** in each run (type, name, width, move left/right, remove). Per type: base = drawers (heights top down, shared out to fit) or doors + shelves, and a hob cut-out depth; sink = doors + cut-out size; wall = doors, shelves, fixed; L corner = side, return, return depth, carousel or shelves; note shown in the checks.
     - Kitchen construction settings (board, back, legs, J-profile, rails, sink rails, door edge gap, gap between fronts, runner gap), remembered in `nwd-smart-kprefs`; the kitchen itself is kept in `nwd-smart-kitchen`.
     - Checks before building (sizes in range, sink/hob cut-outs fit, L corner legs longer than the depths) and, after, how each run adds up against the back wall.
     - Output shares the wardrobe's: 3D (kitchen z flipped for the viewer), cut list grouped Carcass / Rails / Shelves / Doors / Drawers / Side panels and fillers, a **Hardware and bought items** list, print, Send to the Cut Sheet (name "Kitchen, worktop 900 (Smart Generator, check sizes)"; the Cut Sheet counts the 3 mm backs too, so the U example shows 29 boards there against the test's 24 without backs), client 3D and SketchUp files for members.
   - **Handle type (owner 2026-11-21: "normally we would have to choose handle type to shorten drawer faces like that"):** the starter kitchen showed gaps above every front because the J-profile shortening was always on. Now `kshop.handle` = `'bar'` (bar handles or knobs: full-height fronts; hardware list says "Handles or knobs (one per front)") or `'jprofile'` (fronts shortened by `jH`; the engine default, so `test-kitchen-prampram.mjs` is unchanged). The editor has a Handles select in the Kitchen card; a new or straight kitchen starts on bar handles, the U-shaped example on J-profile. Example (straight kitchen, unit A top drawer): bar 596 × 134, J-profile 596 × 99. `engine.js?v=20261121c`.
   - **Playwright installed 2026-11-21** (owner's go-ahead) in the main checkout's `node_modules` (`--no-save`) + its Chromium; the wardrobe parity test passes 9/9 on Windows (it now starts `python` on Windows, `python3` elsewhere).
   - **Confirmed by the owner (2026-11-21):**
     - **L blanks** are a square at the larger leg size (B: 979 × 979). The machine shop cuts the square and the workshop cuts the L out, since shops don't cut complicated shapes.
     - **Base carcass depth** = client's depth − 20.
     - Amina's wall depths (30 / 28) are her carcass depths without doors.
4. **Checks** (section 4b) + **Construction tab** in the shared Settings panel.
5. **Spec editor + front-view drawing** (new member tool page), sending parts straight into the Cut Sheet (one cut list per material).
6. **AI: words → spec.** Then **sketch photo → spec.**
7. TV units, vanities, office desks as presets of the same units. Beds (mostly solid timber) only after this, as their own thing.

Each step ships on its own and is useful without the next one.

## 8. Open questions for the owner

- The answers marked [OWNER] in sections 4 and 5.
- Name on the member tools page: "Smart generator" (owner liked it) or "Smart cut list"?
- Should the Construction standard also become an Academy series? It's the knowledge members can't get anywhere else.
- Member-first per the tools rule (the wardrobe cutlist stays free). Does the AI part need a usage cap beyond membership?
