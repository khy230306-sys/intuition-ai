# AIZIO Context Engine

## Purpose

Build one **Context** object that Skills and AIE can read. Missing fields stay empty — never invented.

## Shape (`AieContext`)

| Field | Source |
|-------|--------|
| `time` / `date` / `timezone` | Device clock |
| `location` | Settings city (+ permission flag; no forced GPS) |
| `network` | `navigator.onLine` |
| `currentScreen` | Optional active view from caller |
| `activeConversation` | Recent history length / last user text |
| `todaySchedule` | Local reminders (undone) |
| `familyEvents` | Life OS family profiles / notices |
| `goalProgress` | Life OS goals |
| `projectProgress` | Life OS projects (+ stalled days) |
| `weather` | Cached weather only |
| `navigationState` | Pending nav v2 candidates |
| `musicState` | Music session |
| `providerState` | Hybrid AI config |
| `deviceState` | Online / locale / platform |
| `dnaSnippet` | DNA context snippet |
| `availableSkills` | Skill Registry meta |
| `routinesDue` | Enabled routine names |

## Performance

- In-memory TTL **30s**
- Debounce **400ms**
- Optional `sessionStorage` cache
- `force: true` rebuilds (Daily Brief)

## API

- `buildAieContext(opts?)`
- `formatAieContextBlock(ctx?)`
- `invalidateAieContext()`
