# Hawk History Purge Report — Neon

- **Target Repository:** `https://github.com/bparlette/Hawk`
- **Spec:** [`NEON-HAWK-PURGE.md`](../NEON-HAWK-PURGE.md) · Authorized in [`NEON-NEXT.md`](../NEON-NEXT.md)
- **Status:** **COMPLETE & VERIFIED** — All `code/`, `media/`, `previews/`, and `tools/` history purged across all `86` refs (`79` branches + `7` tags), `refs/heads/main^{tree}` preserved byte-for-byte, `fsck` clean, GitHub Pages serving `200`.

---

## ⚠️ RE-CLONE WARNING FOR ALL EDITORS & AGENTS

**The `git push --mirror --force origin` rewriting every commit hash in `bparlette/Hawk` landed at:**

> **Force-Push Timestamp:** **`2026-11-24 21:01:43 UTC`** (**`2026-11-24 16:01:43 EST`**)

Every clone of `bparlette/Hawk` created before **`2026-11-24 21:01:43 UTC` (`16:01:43 EST`)** holds stale pre-purge SHAs (e.g. `c2961034fae2ad989caf6b5d78501570b6dcbcad` for `main`) and **MUST re-clone fresh (or hard-reset onto `origin/<branch>`) before pushing again**, or it will resurrect purged dead-tree history on GitHub.

---

## 1. Pre-Purge State & HARD GATE

- **Mirror Clone:** Fresh `--mirror` clone via `-c http.version=HTTP/1.1` (worked onto `hawk-purged.git` copy; `hawk-mirror.git` kept pristine locally during verification and removed cleanly afterwards).
- **Pre-Purge `refs/heads/main` Tip:** `c2961034fae2ad989caf6b5d78501570b6dcbcad`
- **Pre-Purge `refs/heads/main^{tree}`:** `7db05b71a129f8c7d25c31449ad2705c0b2190b3`
- **HARD GATE (`git ls-tree --name-only refs/heads/main`):**
  `.gitignore`, `.nojekyll`, `ARCHIVE.md`, `LICENSES.md`, `README.md`, `brad-demos`, `builder-brief`, `games`, `index.html`, `sat-english-boost`, `tasking`, `test`
  - **`code/`, `media/`, `previews/`, `tools/` all ABSENT at HEAD — GATE PASSED.**
- **Pre-Purge Refs:** `86` (`79 refs/heads` + `7 refs/tags`)
- **Pre-Purge Commits:** `2,385` total across all refs (`2,101` reachable from `refs/heads/main`)
- **Pre-Purge Pack:** `37,814` in-pack objects (`0` loose), `size-pack: 4.78 GiB` (`5,138,029,458 B`)
- **GitHub API Pre-Purge:** `size_kb: 5019622`, `pushed_at: 2026-11-24T03:42:22Z`, `default_branch: claude/new-session-z5ikqq`

---

## 2. Rewrite & All 5 Verification Invariants

Executed with `git-filter-repo` `2.47.0`:

```bash
git -C hawk-purged.git filter-repo --invert-paths --path code --path media --path previews --path tools --force
```

| Check / Metric | Before Purge | After Purge | Result |
|---|---:|---:|---|
| **`refs/heads/main` tip** | `c2961034fae2ad989caf6b5d78501570b6dcbcad` | `65efc789cd48294df50a805fae11316bc6c528b2` | Expected history rewrite |
| **`refs/heads/main^{tree}`** | `7db05b71a129f8c7d25c31449ad2705c0b2190b3` | `7db05b71a129f8c7d25c31449ad2705c0b2190b3` | **IDENTICAL** (byte-for-byte) |
| **Pack size (`size-pack`)** | `4.78 GiB` (`5,138,029,458 B`) | `2.00 GiB` (`2,148,995,472 B`) | **Saved `2.78 GiB` (`2,989,033,986 B`, `-58.17%`)** |
| **Pack objects (`in-pack`)** | `37,814` | `24,002` | `-13,812` objects (`0` loose) |
| **Total commits (`--all`)** | `2,385` | `2,137` | `248` empty commits pruned |
| **`main` commits** | `2,101` | `2,086` | `15` empty commits pruned |
| **Ref count (`heads + tags`)** | `86` (`79` + `7`) | `86` (`79` + `7`) | **Preserved** (`86 == 86`) |
| **Objects under `code\|media\|previews\|tools`** | Present in historical branches | `0` (`rev-list --objects --all` grep empty) | **PASS (`0`)** |
| **`git fsck --connectivity-only`** | — | Exit `0` | **PASS (clean)** |

---

## 3. Staged Force-Push Execution & Ref Audit

- **Why Staged Push Was Used:** A single direct `git push --mirror --force origin` over HTTPS attempts to push `19,475` non-shared objects (`1,667,150,465 B` / `1.553 GiB`) in one HTTP POST and failed at `363.58 MiB` with `RPC failed; HTTP 408`.
- **Execution (HTTP/1.1, Zero Disruption to Live `main`/Pages):**
  1. Verified quiet window (`origin refs/heads/main` still at `c2961034...`).
  2. Pushed `18` monotonic first-parent checkpoints along purged `main` (`41.3 MiB–99.9 MiB` per HTTP POST, ending at `65efc789cd48294df50a805fae11316bc6c528b2`) onto temporary `refs/heads/__purge_stage`.
  3. Confirmed quiet window (`ORIGIN_MAIN == c2961034fae2ad989caf6b5d78501570b6dcbcad`) immediately prior to swap.
  4. Executed atomic `git push --mirror --force origin`, deleting `__purge_stage` and updating all `79` branches + `7` tags (**`2026-11-24 21:01:43 UTC`** / **`2026-11-24 16:01:43 EST`**).
  5. Unset `remote.origin.fetch` and stripped local tracking refs created by step 2, then ran `git push --mirror --force origin` so GitHub retains zero stray `refs/remotes/origin/*` refs.
- **Remote Ref Verification (`git ls-remote https://github.com/bparlette/Hawk.git`):**
  `1 HEAD` + `79 refs/heads` + `7 refs/tags` = **`86` branch/tag refs** (`0` `refs/remotes`, `0` `__purge_stage`).

---

## 4. Post-Push Verification Evidence

| Check | Measured Output | Status |
|---|---|---|
| **GitHub Pages Root** (`curl -sI https://bparlette.github.io/Hawk/`) | `HTTP/2 200` (`last-modified: Tue, 24 Nov 2026 03:45:39 GMT`) | **PASS** |
| **GitHub Pages Game** (`curl -sI https://bparlette.github.io/Hawk/games/toad-city/`) | `HTTP/2 200` (`last-modified: Tue, 24 Nov 2026 03:45:38 GMT`) | **PASS** |
| **GitHub API Repo Metadata** (`gh api repos/bparlette/Hawk`) | `size_kb: 5019622`, `pushed_at: 2026-11-24T21:01:42Z`, `default_branch: claude/new-session-z5ikqq` | **Recorded** (pre-GC size normal until GitHub GC runs) |
| **GitHub API `commits/main`** | `sha: 65efc789cd48294df50a805fae11316bc6c528b2`, `tree_sha: 7db05b71a129f8c7d25c31449ad2705c0b2190b3` | **PASS** |
| **Shallow Wire Fetch** (`git fetch --depth=1 --filter=tree:0 origin refs/heads/main`) | `FETCH_HEAD = 65efc789cd48294df50a805fae11316bc6c528b2`, `FETCH_HEAD^{tree} = 7db05b71a129f8c7d25c31449ad2705c0b2190b3` | **PASS (`VERIFY_TREE == PRE_TREE`)** |
| **Scratch Cleanup** (`rm -rf /tmp/hawk-purge`) | Temporary mirror, purged mirror, and verify repos deleted | **PASS** |
