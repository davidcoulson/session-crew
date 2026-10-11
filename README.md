# session-crew

A Claude Code mod (function hooks) that shows the **side sessions** a Claude Code
desktop session starts, each as one of savvy-progress's pixel crabs in a costume:
it walks (and works its prop) while the session works, rests with closed eyes while
it's idle, and celebrates when it's done. It's a sibling of
[savvy-progress](https://github.com/JohnnyVizz/claude-kit/tree/main/plugins/savvy-progress),
which does the same for subagents.

Early-access mod API; built and tested on Claude Code 2.1.295 (desktop) and 2.1.286 (terminal).

## What it shows

`/crew` toggles a pane listing every session linked to this one:

| | |
| --- | --- |
| crab | its costume from your `faces` rules or `/crew face`, else the next one in turn (kept for the session's life) |
| name | the app's short handle (`nut-pr-review-fixes`) |
| title, note | the session's title, plus the app's extras (`PR #224`, `started by …`) |
| status | `proposed` (a card), `working`, `sleeping` (idle), `done`, `dismissed` |
| time | run length while working or done; `idle 4m` while sleeping |

Buttons under the rows: **Crabs only** (a compact strip), **finished · n** (hide or show done
sessions) and **Refresh**. The status line also carries `crew: 2 working · 1 sleeping`.

### Commands

- `/crew`: show or hide the pane
- `/crew face <name-or-glob> <costume>`: dress matching sessions (kept across sessions in `$.store`); without a costume it removes the rule
- `/crew faces`: list the rules and who wears what
- `/crew import [parent <local_id>] [<name-glob>] [--archived]`: bring in sessions that already exist (see below); `/crew import off` stops
- `/crew refresh`: ask the app for the sessions now
- `/crew compact`: toggle the crabs-only strip
- `/crew clear`: drop finished sessions
- `/crew debug`: dump the crew and poll state as JSON

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
`list_sessions` runs. Archived sessions stay out unless `--archived`. Each session's crab is recorded in
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
      "pollSeconds": 30,
      "autoOpen": true
    }
  }
}
```

`faces` rules are `pattern=costume`, matched against a session's name, title or id with `*` and `?`;
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

`hooks/parse.ts` holds the parsing, merging and costume logic as pure functions; `hooks/crab.ts`
the crab art; `hooks/register.tsx` the hooks and drawing; `types/index.d.ts` the `$.state` contract.
