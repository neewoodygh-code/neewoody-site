# _inbox

Drop raw images here with a loose description. Tell Claude Code what they are and it will rename, sort, and commit them.

**How it works:**
1. Copy your image files into this folder
2. Open a Claude Code session and describe what each photo shows
3. Claude Code will rename them descriptively, copy them to the correct project folder under `images/projects/`, and commit everything

**Naming convention Claude Code uses:**
`images/projects/{project-slug}/{description}.jpg`

**Example:**
- You drop `IMG_20240515_143200.jpg` and say "this is the Jerksoul bar counter, half-built"
- Claude Code renames it to `images/projects/jerksoul/jerksoul-bar-counter-wip.jpg`

Files left in `_inbox/` after sorting are ones that haven't been described yet — list them and we'll sort them together.
