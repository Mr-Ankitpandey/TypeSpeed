# Socket contract

The shared package defines `ClientEvents`, `ServerEvents`, a discriminated `Command` union and runtime `commandSchema`. A single acknowledged `command` envelope keeps error handling and validation centralized. This replaces the suggested individual mutation event names without changing their authorization semantics.

Every command acknowledges `{ok:true, ...}` or `{ok:false,error:string}`. The client times out after 5 seconds (input: 3 seconds). Credential and ID are returned only to the creator/requester. Resume returns typing state and next-sequence context to that credential's active socket.

| Command                          | Required identity | Allowed state        | Effect / duplicates                                             |
| -------------------------------- | ----------------- | -------------------- | --------------------------------------------------------------- |
| create {name,settings}           | Unbound socket    | —                    | Creates host session; already-bound socket rejected             |
| join {name,code}                 | Unbound socket    | WAITING              | Pending only; duplicate name or bound socket rejected           |
| resume {token}                   | Valid credential  | Any existing room    | Rebinds session; old socket revoked                             |
| cancel                           | Pending guest     | Pending              | Removes request and credential; repeated cancel rejected        |
| approve/reject {id}              | Host              | WAITING              | Requires still-pending request; approval rechecks capacity      |
| ready {ready}                    | Approved          | WAITING              | Sets boolean; repeated same value harmless                      |
| settings {settings}              | Host              | WAITING              | Updates settings and resets ready states                        |
| kick {id}                        | Host              | WAITING              | Revokes membership and credential; cannot kick self             |
| leave                            | Approved          | Any                  | Revokes own session, transfers ownership if needed              |
| close                            | Host              | Any                  | Deletes room and sessions                                       |
| start                            | Host              | WAITING              | Requires 2+ connected ready players; repeated start rejected    |
| input {round,sequence,operation} | Approved          | Official race window | Strict consecutive sequence, bounded single-character operation |
| rematch                          | Host              | FINISHED             | Returns existing members to WAITING; repeated rematch rejected  |

Settings schema: 30/60/120 seconds; easy/medium/hard; capacity 2–8; punctuation and numbers booleans. Names are trimmed, 1–24 Unicode letters/numbers or spaces, underscore, dot and dash. Room code is six uppercase letters/digits from the generated alphabet.

`clock(ack)` returns server epoch milliseconds. The browser estimates clock offset with midpoint round-trip timing. Visual countdown is based on the server start time, not a separately started browser timer.

Server events:

- `request`: state and human-readable message, only to that guest.
- `room`: public settings, approved players, live metrics, race schedule and passage; only approved members. Pending request list is populated only for the current host. No token is included.
- `closed`: specific session invalidation or whole-room closure notification.

Final results are sent in FINISHED room snapshots. A 250 ms tick throttles progress snapshots; state-changing commands send immediately. There is no durable event replay. Refresh/resume gets current room state. Restart invalidates all credentials cleanly.
