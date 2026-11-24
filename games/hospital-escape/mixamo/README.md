# Mixamo animations for Hospital Escape

This folder holds the Mixamo animation set for the Hospital Escape cast pass:
the Y Bot T-Pose (with skin — the retarget anchor / reference skeleton) plus
47 animation clips for the Gunman, Cole, and Maya, downloaded 2026-11-24.
One clip, `push-start.fbx` ("Start To Push A Heavy Object"), is still pending
re-download and is marked PENDING in MANIFEST.md.

## Why the files look like this

The GitHub connector corrupts raw binary files, so every `.fbx` is stored
gzip-compressed and base64-encoded as `<name>.fbx.gz.b64`. MANIFEST.md lists
each clip's Mixamo title, download settings, original byte size, and the
SHA-256 of the decoded `.fbx` so consumers can verify integrity.

## Decode

One file:

```sh
base64 -d pistol-walk.fbx.gz.b64 | gunzip > pistol-walk.fbx
```

All files:

```sh
for f in *.fbx.gz.b64; do base64 -d "$f" | gunzip > "${f%.gz.b64}"; done
```

## License note

Mixamo animations are licensed for use inside finished games. The raw files
live in this private repo only as a working step so the build team can share
one canonical set (Cherie's ruling, Nov 24, 2026). They are not a
redistribution of Mixamo content for outside use.

## Who consumes these

Opus and Neon, for their Hospital Escape cast passes (retargeting onto the
game's cast, starting from the Y Bot T-Pose anchor in `y-bot-tpose.fbx`).
