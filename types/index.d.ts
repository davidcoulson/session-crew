export type CrewStatus = 'proposed' | 'working' | 'idle' | 'done' | 'dismissed'

/**
 * How a session's last turn ended, read from its last message: it `asks` you
 * something (a question, "want me to…", "approve"), it made a `promise` to
 * check back later (nothing will wake it), or it is a `report`.
 */
export type TurnEnd = 'asks' | 'promise' | 'report'

export type CrewSession = {
  /** `local_…` once it runs; `task_…` while it is a proposal card. */
  id: string
  /** The proposal's task id, kept once it became a session. */
  taskId?: string
  /** The short handle the app gives a session (`nut-pr-review-fixes`). */
  name: string
  title: string
  status: CrewStatus
  /** First seen by this mod (or the proposal's time); not the app's createdAt. */
  startedAt: number
  /** When the status last changed. */
  changedAt: number
  /** When this crew last saw the status change (not just learned it): the strip shows only such changes. */
  changeSeenAt?: number
  /** Set while done or dismissed. */
  endedAt?: number
  /** Extra words from the app's note: `PR #199`, `started by x`. */
  note?: string
  /** Order it joined the crew; picks its costume when no rule and no `costume` does. */
  slot?: number
  /** The costume it was given when it first joined any crew (kept in $.store), when no rule picks one. */
  costume?: string
  /** Archived in the app (listed so, or dropped off a complete list): never shown. Kept apart from `note`, so a PR survives it. */
  isArchived?: true
  /** Brought in by /crew import or the sync tool rather than seen being started. */
  isImported?: true
  /** How its last finished turn ended, read from the app's "It reported" note or its transcript. */
  turnEnd?: TurnEnd
  /** When `turnEnd` was read: it describes the current idle spell only when at or after `changedAt`. */
  turnEndAt?: number
  /** The words that decided `turnEnd` (the question, the promise), for the hover; at most 160 characters. */
  turnHint?: string
  /** What last told us the status (`start_session`, `linked-note`, `poll`, `tool`). */
  source: string
}

export type CrewPanel = {
  isCompact: boolean
  /** The older finished sessions' group is folded. */
  isDoneHidden: boolean
  /** The sleeping sessions' group is open (/crew sleeping show, kept in $.store). */
  isSleepingShown?: boolean
}

export type CrewPoll = {
  /** False once the mod could not fetch list_sessions itself, by either route. */
  isAvailable: boolean
  /** How the last fetch got through: the MCP server directly, or the session's own tool call. */
  via?: 'mcp' | 'tool'
  lastAt: number
  lastError?: string
}

export type CrewListed = {
  id: string
  name?: string
  title?: string
  isRunning?: boolean
  isArchived?: boolean
  startedBy?: string
  prNumber?: number
  status?: string
  /** The app's ISO time of the session's last activity. */
  lastActivityAt?: string
}

export type CrewFocusMiss = {
  id: string
  /** The app's answer, or the error, in a few words. */
  reason: string
  at: number
}

export type CrewImport = {
  parent?: string
  match?: string
  includeArchived?: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'session-crew': {
      crew: CrewSession[]
      panel: CrewPanel
      poll: CrewPoll
      now: number
      /** The last list_sessions result seen, for the sync tool to import from. */
      listing: CrewListed[]
      /** The /crew import filter in force (mirrored in $.store), or null. */
      importing: CrewImport | null
      /** Whether the strip above the prompt shows (the `strip` option, overridden by /crew strip, kept in $.store). */
      stripOn: boolean
      /** When the person last sent a prompt: finished sessions leave the strip after it. */
      lastPromptAt: number
      /** The strip's own clock, ticked only while a finished crab is due to change. */
      bandNow: number
      /** Hide rules set with /crew hide (globs), mirrored from $.store. */
      hidden: string[]
      /** Label rules set with /crew label (pattern to label), mirrored from $.store. */
      labels: Record<string, string>
      /** Short labels the model wrote from titles, by session id, mirrored from $.store. */
      written: Record<string, string>
      /** The session a press on its crab or row could not switch to, shown highlighted in the pane with why. */
      focusMiss: CrewFocusMiss | null
      /** Costume rules set with /crew face (pattern to costume), mirrored from $.store. */
      faces: Record<string, string>
    }
  }
}
