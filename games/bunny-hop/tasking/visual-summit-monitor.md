# Bunny Hop — Visual Summit Monitor (automation addendum)

This file governs **how** the visual summit runs. The summit itself — the ask, the required reading, the three rounds, the ground rules — is in `visual-summit.md` next to this file. Read both before your first cycle.

The point: Opus and Neon run the exchange **themselves**, on a timer, in the repo. No human relays messages between you. If you are reading this because the start instruction below was pasted to you, begin the loop now.

Repo: `bparlette/Hawk2`, branch `main`. Watched folder: `games/bunny-hop/tasking/responses/`.

---

## 1. The loop

- Poll every **5 minutes**, for **60 minutes** from when you start your loop, then stop.
- Each poll: fresh pull of `main`, then check for new or changed files in `games/bunny-hop/tasking/responses/` and any change to `games/bunny-hop/tasking/visual-summit.md`.
- Work only from the freshly pulled state — never from what you remember last cycle.
- Each completed step goes out as **one batched commit per cycle**. One step, one commit, then back to polling.
- Nothing changed and nothing for you to do → do nothing. No empty commits, no "still waiting" status files, no poll logs in the repo.

## 2. The state machine

Each cycle, find the **first** row that matches the current state of `responses/` and do exactly that:

| # | State | Action |
|---|-------|--------|
| 1 | My Round 1 file is missing | Write it and push. Opus → `responses/opus-on-neon.md`; Neon → `responses/neon-on-opus.md`. Content per `visual-summit.md` Round 1. |
| 2 | The other's Round 1 is present, my Round 2 Reply is missing | Read theirs in full, append my Reply to **my own** file (agreements, disagreements with reasons, changed minds), push. |
| 3 | Both Round 2 Replies are present, the joint plan is missing | Whoever polls first drafts `responses/visual-push-plan.md` and pushes. The other, next cycle: read it, then either append `Agreed — <your name>` at the end, **or** make ONE editing pass and put a one-line changelog at the top of the file saying what you changed and why. |
| 4 | The joint plan is present and agreed by both | Write `DONE` at the top of the plan file, push, and **stop polling early** — you are finished. |
| 5 | 60 minutes have elapsed without completion | Push whatever exists, put a one-line `STATUS:` at the top of your own response file saying exactly where it stopped, and stop. |

If no row matches (e.g. you are waiting on the other agent mid-round), do nothing this cycle.

## 3. Collision rules

- **Never edit the other agent's response file.** The only cross-file write allowed is appending your `Agreed — <name>` line to the joint plan.
- If a push conflicts: pull, rebase onto the new tip, retry **once**. Never force-push. If the retry also conflicts, wait for the next cycle and try again from a fresh pull.
- Every file keeps the summit ground rules: visual claims cite a reference frame, numbers are measured (renderer.info / frame timings) never self-reported, play proofs and touch controls are a hard floor.
- A seam that blocks the best visual result gets named as an explicit tradeoff in the joint plan — never silently obeyed, never silently broken.

## 4. Start instruction

Paste this verbatim to Opus, and separately to Neon:

> Start the visual-summit monitor loop now: read `games/bunny-hop/tasking/visual-summit.md` and `games/bunny-hop/tasking/visual-summit-monitor.md` in `bparlette/Hawk2`, then poll `games/bunny-hop/tasking/responses/` every 5 minutes for 60 minutes and run the state machine.
