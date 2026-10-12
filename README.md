# session-crew

A Claude Code mod (function hooks) that shows the **side sessions** a Claude Code
desktop session starts, each as one of savvy-progress's pixel crabs in a costume:
it walks (and works its prop) while the session works, rests with closed eyes while
it's idle, and celebrates when it's done. It's a sibling of
[savvy-progress](https://github.com/JohnnyVizz/claude-kit/tree/main/plugins/savvy-progress),
which does the same for subagents.

Early-access mod API; built and tested on Claude Code 2.1.295 (desktop) and 2.1.286 (terminal).

## What it shows

`/crew` toggles a pane of the sessions linked to this one (and any imported). It stays calm by default:

- **The main list**: sessions **working**; ones that **need you** (the turn ended asking you something) or are
  **stalled** (it ended promising to check back later) in the last hour; ones **idle** after a turn that ended with a
  report, in the last 15 minutes; and ones that **finished recently** (in the last `recentMinutes`, default 30). Each is
  on two lines: the crab and the label, under it what it asked, what it promised, or the title and PR, and a status pill
  on the right ("working · 12m", "needs you · 3m", "stalled · 3m", "idle · 3m", "done · PR #226").
- **"13 sleeping · show"**: every other idle session, folded into one row; opened, each is one compact line
  (crab, label, "idle 8m"). `/crew sleeping show|hide` sets it, and it's remembered.
- **"5 finished · show"**: older finished sessions, folded, one line each ("done · PR #199").
- **Never shown**: archived sessions, and any session a hide rule matches (`/crew hide`, the `hidePatterns` option).

Hover a row for the whole title, the session's handle and the app's note ("started by …"). Each row's **Open**
button shows that session in the app's main pane (see "Opening a session" below). Each row shows:

| | |
| --- | --- |
| crab | its costume from your `faces` rules or `/crew face`, else the next one in turn (kept for the session's life) |
| label | a short human label (see Labels below), not the app's handle |
| title, PR | on a main row's second line: the title when it says more than the label, and the PR |
| status | the pill: working, needs you, stalled, idle, proposed, done (with its PR) |

Buttons under the rows: **Crabs only** (the main list as a strip of crabs) and **Refresh**. The status line also
carries `crew: 2 working · 1 needs you · 1 stalled · 14 idle`.

### The strip above the prompt

Always in view, above the prompt box: a card per session that needs a glance, the crab (1.5× by default) beside a
short label, with a coloured status pill under it. The pill is the signal, and each has its own icon and words, so
colour is never the only cue:

| pill | when |
| --- | --- |
| **`! needs you`** (solid) | its last turn, in the past hour, ended asking you something (see below) |
| `◷ stalled` | its last turn, in the past hour, ended promising to check back later ("I'll check in about 2 minutes"): nothing will wake it to, so message it |
| `● working 12m` | working, for that long |
| `○ idle` | its last turn, in the past 15 minutes, ended with a report or a statement (or how it ended isn't known yet) |
| `✓ done` / `✓ done · PR #226` | finished while you watched: celebrates for 5 s, then goes muted (still readable) and stays until your next prompt, at least a minute |

Order: needs you, stalled, working, idle, done.

**How a turn ended** is read from the session's last message: the app's "finished a turn. It reported: …" note for
sessions this one started, or, when that note was cut short (the app quotes about 400 characters) or there was none (a
poll or an import saw it go idle), the session's transcript through `list_events`, once per idle spell. It **asks** when
any sentence ends in "?" or hands you the next move: "want me to", "should I", "would you like", "your call", "which
option", "let me know", "please confirm", "once you approve", "needs your go-ahead", "decisions needed". Else it is a
**promise** when its closing lines say it will check back by itself ("I'll check in about 2½ minutes", "will verify
after the restart", "I'll deploy when the build finishes"). Anything else is a **report**. The app doesn't tell a mod
about pending permission prompts, so those don't count. Hover a card for the question or promise it read. Sleeping sessions never draw a crab here; when everyone is asleep the strip
is just their count, `z 13`, which opens the pane. With more than six (or more than fit), the needs-you, stalled and working cards
show and the rest fold into **`+N more`**. On the desktop there are no summary words beside the crabs, which say it
already: the one control after them opens the pane, `+N more` when cards are folded, else a quiet `⋯`. The terminal
keeps its counts after the cards ("5 sessions · 2 working · 1 needs you · …", or `● 2  ! 1  ◷ 1  ○ 1  ✓ 1  z 13` when
narrow; `○` counts idle), which open the pane. Hover a card for the session's full title and status.

### Opening a session

In the desktop app, a card's label (the button beside its crab) and a pane row's **Open** button show that session in the
main pane, as clicking its sidebar row does, through the app's `open_session_in` (`ccd_window`, target `focus`). The
mod API has no press on an `Svg` and a `Button` holds only text, so the crab picture itself isn't the click target; its
label beside it is. The app only does this for sessions this one started, and not while the cursor is in a text field
or this session is off screen. When it refuses, the pane opens with that row tinted and the reason above the list, and
a toast says so; the mark clears on your next prompt. The terminal can't switch sessions, so there the cards and rows
are as before.

**Labels** come from, in order: a `labels` rule or `/crew label`; else a 1–3 word label a small model (Haiku, low
effort) writes from the title, once per session and kept across sessions (`aiLabels: false` turns that off); else
the title shortened by rule (its opening verb dropped, cut at a word). Up to 16 characters show.

Sessions first seen already idle or done (an import, the app's note at start) show only in the pane, so the strip
holds what changed while you watched. It sits on top of anything else in that band (savvy-progress's bar); while
savvy-progress shows a flow and is higher in the chain it draws alone, and the strip is back when the flow ends.
The terminal draws the same cards in text: `▣ Label` and a coloured `● working 12m`, ` ! needs you ` or `✓ done`.

### Commands

- `/crew`: show or hide the pane
- `/crew face <name-or-glob> <costume>`: dress matching sessions (kept across sessions in `$.store`); without a costume it removes the rule
- `/crew faces`: list the rules and who wears what
- `/crew import [parent <local_id>] [<name-glob>] [--archived]`: bring in sessions that already exist (see below); `/crew import off` stops
- `/crew refresh`: ask the app for the sessions now
- `/crew sleeping show|hide`: open or fold the sleeping sessions in the pane (kept across sessions)
- `/crew hide <name-or-glob>`: leave matching sessions out of the pane and the strip; `/crew unhide <glob>` (or bare, all) brings them back
- `/crew strip on|off`: show or hide the strip above the prompt (kept across sessions); bare `/crew strip` toggles
- `/crew label <name-or-glob> <label>`: the strip's label for matching sessions (kept across sessions); without a label it removes the rule
- `/crew labels`: list the label rules and every session's label
- `/crew compact`: toggle the crabs-only rows in the pane
- `/crew clear`: drop finished sessions
- `/crew debug`: dump the crew, poll and strip state as JSON (`strip.band` counts the band's draws, and names the surface asking)

## The crabs

| costume | prop while working |
| --- | --- |
| `astronaut` | floats in a glass dome; antenna and star blink |
| `detective` | sweeps the magnifier, which glints |
| `engineer` | turns the wrench |
| `chef` | tosses the omelette |
| `racer` | runs at double pace with a fluttering flag |
| `pirate` | fences with the cutlass |
| `plain` | just walks |

Sessions without a rule take the first six in turn. By status:

- **working**: walks, prop in motion
- **idle**: rests, body sunk onto tucked legs, eyes closed, z's drifting up
- **done**: hops with happy eyes and both claws up, under confetti
- **proposed**: faded, with a blinking `?`
- **dismissed**: faded further

`prefers-reduced-motion` stops every animation and keeps the poses. The terminal draws
savvy-progress's `▣` in the costume's color, with a spinner, `zZz` or `\o/` beside it.

### Holiday outfits (preview only)

`hooks/holidays.ts` and `hooks/holidays/*.ts` draw seasonal outfits (Halloween, Christmas, Hanukkah and more) with the
same frame, body and motion as the costumes above. They aren't switched on yet. To see them all, build the gallery with
`bun scripts/build-preview.ts` and open `preview/holidays.html`: every outfit working, needing you and idle, at the
strip's real size and three times larger, on the app's light and dark grounds, with the proposal for when they'd switch on.

## Importing sessions that already exist

A session's panel starts with only the sessions *it* starts (and the family the app lists in its
"Linked sessions now" note). Sessions started from an older session, before the mod was loaded, come in with `/crew import`:

```text
/crew import                                   every open session
/crew import parent local_bf88e5a0-…           only sessions that session started
/crew import nut-*                             only names or titles matching the glob
/crew import parent local_bf88e5a0-… --archived   archived ones too (shown as done)
/crew import off                               stop importing in new sessions
```

The mod lists the sessions itself (`list_sessions` through the app's MCP server, else through a
tool call in the session's loop) and imports at once. Where it can't, it asks Claude to call
`mcp__ccd_session_mgmt__list_sessions` and then `mcp__session-crew__sync`, which reads that result
(the model doesn't repeat the list).

The filter is kept in `$.store`, so **every new session imports with it by itself** at start, and keeps
imported sessions fresh: on each prompt (at most every 15 s), on the poll timer, and whenever
`list_sessions` runs. Archived sessions stay out unless `--archived`; an imported session that gets archived (it drops off a
complete list of open sessions) turns done, and comes back if it is unarchived. `/crew import off` stops new
imports, while the sessions already imported keep refreshing until they're done or `/crew clear` drops them. Each session's crab is recorded in
`$.store` the first time it gets one, so it wears the same costume in every session's panel.

## How it learns the status

The app has no "session status changed" event a mod can hook, so the mod reads
everything the app already tells the session:

1. **`tool.call` hooks** on the app's own tools: `mcp__ccd_session__start_session`
   (`Started session "…" (session_id: local_…, name: …)` → working; `Proposed "…" (task_id: task_…)` → proposed),
   `mcp__ccd_session__dismiss_task` (→ dismissed), and `mcp__ccd_session_mgmt__list_sessions` / `get_session`
   (`isRunning` → working or idle, `isArchived` → done).
2. **`session.append`**: the desktop app writes `Linked sessions now (…): name = local_… (idle); …` and
   `The user started your proposal task_… ("…") as session local_…` into the user-side text of each prompt
   and delivery it sends. The mod parses those rows (never tool results) and takes them as the authority,
   including `done`.
3. **Polling**: at start, then every `pollSeconds` (default 30) while any session works or an import filter
   is set, `$.mcp.call('ccd_session_mgmt', 'list_sessions', …)` (linked family, or the import's list),
   falling back to `$.tool.call`. Early in a session the app's server may still be connecting: a failed
   fetch is tried again after 10 s, then about once a minute, and the pane says so meanwhile.
4. **`mcp__session-crew__status`**, a tool the mod registers, for Claude to report a status the mod missed:
   `{ "sessions": [{ "id": "local_…", "name": "…", "status": "idle", "note": "PR #12" }] }`.
5. **`mcp__session-crew__sync`**, the import tool: `{ "parent": "local_…", "match": "glob", "includeArchived": false }`,
   importing from the last `list_sessions` result, or from `sessions: [{ id, name, title, status, startedBy, prNumber }]`.

## Options (`pluginConfigs`)

```json
"pluginConfigs": {
  "session-crew": {
    "options": {
      "faces": ["nut-*=engineer", "prismarr*=chef", "*dns*=detective"],
      "labels": ["todo-mod=To-do mod", "add-nic-*=NIC sensors"],
      "aiLabels": true,
      "stripScale": 1.5,
      "recentMinutes": 30,
      "hidePatterns": ["mod-ideas"],
      "pollSeconds": 30,
      "autoOpen": true,
      "strip": true
    }
  }
}
```

`hidePatterns` are globs matched like `faces`, leaving those sessions out (as `/crew hide` does); `recentMinutes` is how
long a finished session stays in the main list. `labels` rules are `pattern=label`, matched like `faces`, and win over the model's labels; `stripScale` sizes the
strip's crabs (0.8 to 2.5). `strip: false` starts sessions without the strip (`/crew strip on` still shows it). `faces` rules are `pattern=costume`, matched against a session's name, title or id with `*` and `?`;
the first match wins, and `/crew face` rules win over these. A rule naming no costume is ignored.
savvy-flow's tier names (`fable`, `heavy`, `careful`, `medium`, `light`, `explore`) work as costumes too.

## Running it

Loaded from this folder, for one terminal session:

```bash
claude --plugin-dir ~/dev/session-crew
```

For desktop-app sessions, name the folder in `~/.claude/settings.json`:

```json
"env": {
  "CLAUDE_CODE_PLUGIN_DIRS": "/Users/david/dev/session-crew"
}
```

(Several folders are separated by `:`.)

## Credits

The crab art, costumes and their motion (`hooks/crab.ts`) are copied from
[savvy-progress](https://github.com/JohnnyVizz/claude-kit/tree/main/plugins/savvy-progress) by
[johnnyvizz](https://github.com/johnnyvizz), MIT License; its notice is in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). savvy-progress in turn credits the pixel crab to
DockCrab (Clawdy), whose license was not found; check it before publishing this mod.
The resting and cheering poses are new here.

## Developing

```bash
claude plugin validate ~/dev/session-crew
claude plugin test ~/dev/session-crew
```

The tests need the test kit of 2.1.295 or later (older kits have no `mock.session`, which the `session.append` tests
use). If the terminal's `claude` is older, run the desktop app's own CLI:
`"$HOME/Library/Application Support/Claude/claude-code/2.1.295/<build>/claude.app/Contents/MacOS/claude" plugin test ~/dev/session-crew`.

`hooks/parse.ts` holds the parsing, merging and costume logic as pure functions; `hooks/crab.ts`
the crab art; `hooks/register.tsx` the hooks and drawing; `types/index.d.ts` the `$.state` contract.
