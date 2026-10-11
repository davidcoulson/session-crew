# session-crew

A Claude Code mod (function hooks) that shows the **side sessions** a Claude Code
desktop session starts, each with a face of your choosing: it bobs while the
session works, dozes (floating z's) while it's idle, and parties when it's done.
It's a sibling of [savvy-progress](https://github.com/JohnnyVizz/claude-kit/tree/main/plugins/savvy-progress),
which does the same for subagents.

Early-access mod API; built and tested on Claude Code 2.1.295 (desktop) and 2.1.286 (terminal).

## What it shows

`/crew` toggles a pane listing every session linked to this one:

| | |
| --- | --- |
| face | from your `faces` rules or `/crew face`, else a random animal (stable per session, distinct within the crew) |
| name | the app's short handle (`nut-pr-review-fixes`) |
| title, note | the session's title, plus the app's extras (`PR #224`, `started by …`) |
| status | `proposed` (a card), `working`, `sleeping` (idle), `done`, `dismissed` |
| time | run length while working or done; `idle 4m` while sleeping |

Buttons under the rows: **Faces only** (a compact strip), **finished · n** (hide or show done
sessions) and **Refresh**. The status line also carries `crew: 2 working · 1 sleeping`.

### Commands

- `/crew`: show or hide the pane
- `/crew face <name-or-glob> <face>`: give matching sessions a face (kept across sessions in `$.store`); without a face it removes the rule
- `/crew faces`: list the rules and who has which face
- `/crew refresh`: ask the app for the linked sessions now
- `/crew compact`: toggle the faces-only strip
- `/crew clear`: drop finished sessions
- `/crew debug`: dump the crew and poll state as JSON

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
3. **Polling**: every `pollSeconds` (default 30) while any session works, `$.mcp.call('ccd_session_mgmt', 'list_sessions', { linked: true })`.
   If the app's server can't be reached from a mod, polling turns itself off and the pane says so.
4. **`mcp__session-crew__status`**, a tool the mod registers, for Claude to report a status the mod missed:
   `{ "sessions": [{ "id": "local_…", "name": "…", "status": "idle", "note": "PR #12" }] }`.

## Options (`pluginConfigs`)

```json
"pluginConfigs": {
  "session-crew": {
    "options": {
      "faces": ["nut-*=🔧", "prismarr*=🐙", "*dns*=(o_o)"],
      "pollSeconds": 30,
      "autoOpen": true
    }
  }
}
```

`faces` rules are `pattern=face`, matched against a session's name, title or id with `*` and `?`;
the first match wins, and `/crew face` rules win over these. A face is an emoji (drawn large) or
ASCII art (drawn in mono; its eyes close while asleep and turn to `^` at the party).

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

## Developing

```bash
claude plugin validate ~/dev/session-crew
claude plugin test ~/dev/session-crew
```

`hooks/parse.ts` holds the parsing, merging and face logic as pure functions; `hooks/register.tsx`
the hooks and drawing; `types/index.d.ts` the `$.state` contract.
