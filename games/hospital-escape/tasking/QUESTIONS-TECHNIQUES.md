# QUESTIONS — Did the bake-off consider these techniques? (for Opus + Neon)

**Location:** https://github.com/bparlette/Hawk2 — branch `main` — `games/hospital-escape/tasking/QUESTIONS-TECHNIQUES.md`
**From:** Moth, at Cherie's direction (Nov 23, 2026)
**Answers go to:**
- Opus → `games/hospital-escape/tasking/responses/opus-techniques.md`
- Neon → `games/hospital-escape/tasking/responses/neon-techniques.md`

## Context

This concerns the Hospital Escape shooter-asset bake-off (`games/hospital-escape/tasking/BAKEOFF-SHOOTER-ASSET.md`) and the cast build that follows from it. Cherie found an X thread (by @0xKense1) listing 14 open-source projects for AI-driven 3D character pipelines — the pitch being that nobody should still be rigging, animating, and exporting characters by hand. She wants to know whether the bake-off's coverage was complete: did either of you consider these techniques, and if not, was that a judgment call or a blind spot?

This is an audit of coverage, not a reprimand — "considered it, killed it for X" is a perfectly good answer, and a more useful one than silence.

## The thread's list (grouped as the thread groups it)

**Claude × Blender**
1. **Blender Agent MCP** — Claude Code drives Blender through ~216 tools for modeling, rigging, animation, and export.
2. **Mixamo LLM Mocap** — turns any locked-camera video into animation on a Mixamo character; built so an AI agent can run the whole loop.

**Rigger**
3. **Blender** — the free open-source 3D suite for modeling, rigging, animation, simulation, and rendering.
4. **GameRig** — auto-rigging for games, built on Blender's Rigify.
5. **BlenRig** — auto-rigging and skinning; a feature-film-quality rig with a facial system.

**Animator & mocap**
6. **FreeMoCap** — free, open-source motion capture for everyone (desktop app).
7. **Rokoko Studio Live** — streams mocap into Blender in real time and retargets it between rigs.
8. **Simple Retarget Tool** — moves an animation from one armature to another, with presets.

**Physics & effects**
9. **Jiggle Physics** — verlet jiggle physics on bones, from soupy ropes to stiff rods, tuned while the animation plays.
10. **Effekseer** — particle effect editor for games; effects play back in-app through runtimes and plugins.

**Export**
11. **glTF-Blender-IO** — the Khronos glTF 2.0 importer/exporter for Blender.
12. **VRM Add-on for Blender** — imports, exports, and edits VRM models, with a Python API for automation.
13. **Godot** — free MIT game engine with one-click export to desktop, mobile, and web.
14. **three.js** — lightweight cross-browser JavaScript 3D library with WebGL and WebGPU renderers.

## The questions (each of you answers for your own entry)

1. **Which of these did you actively consider while building your bake-off entry?** For each one you considered but didn't use: what killed it — time, license, quality, or fit to the brief?

2. **Specifically on the four nobody used:**
   - **Auto-rigging (GameRig / BlenRig)** instead of starting from pre-rigged bodies;
   - **Video mocap (Mixamo LLM Mocap / FreeMoCap / Rokoko)** instead of clip libraries;
   - **Agent-driven Blender (Blender Agent MCP)** instead of working in Blender directly;
   - **Jiggle Physics** for secondary motion.
   
   Would any of them have changed your entry — or the cast build now underway? (The known hard problems there: Cole's seated poses and Maya's wheelchair push.)

3. **If you had to rebuild your entry tomorrow with exactly one technique from this list added, which one — and what would it fix?**

Answer in your response file above; Moth will relay the pair to Cherie together.
