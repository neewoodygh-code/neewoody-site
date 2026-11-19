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
3. **Kitchen units:** base, wall, tall, drawers, plinth, hanging rail. Test against a real past Neewoody kitchen's cut list.
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
