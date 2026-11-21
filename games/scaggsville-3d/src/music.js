// music.js — Scaggsville 3D background music that plays WITHOUT showing
// anything, using the exact mechanism proven in Toad City Baltimore
// (Hawk games/toad-city/game.js, "B-MORE 410 RADIO"): the official YouTube
// IFrame Player API in a hidden box — 2x2 px, opacity .01,
// pointer-events:none, z-index:-1, fixed at the bottom-left corner — with
// the iframe created as allow="autoplay", tabindex=-1, aria-hidden=true
// and src params enablejsapi=1&playsinline=1&controls=0&fs=0&disablekb=1&
// rel=0&iv_load_policy=3&modestbranding=1. No audio is downloaded or
// shipped with the game; YouTube serves it from the official embed.
//
// Starts on the first tap / keypress (capture-phase gesture listeners),
// exactly like Baltimore: browsers only let a page start audible media
// from a gesture. Before the gesture the first track is cued, not played.
//
// Playlist (Cherie, 2026-11-21):
//   1. "Dog Shit" — Wu-Tang Clan (xexyzoz5ylQ) — ALWAYS plays first.
//   2. "Wu-Tang Forever" FULL ALBUM (PRtJsvZg6zI, uploader WU-TANG
//      FAMILIA) — entered at a RANDOM offset, freshly picked every time
//      the album is entered: skip the first 20 s (album intro), never
//      start in the final 240 s (leave at least a song's worth of play).
//      When the album eventually ends, a fresh random offset is picked
//      and it plays again — the music never stops on its own.
//
// Volume: YT scale 0..100, goal 40 — a background bed under the game
// sounds (Baltimore's radio, which IS the scene, runs at 70). Faded in
// from 0 over ~1.6 s like Baltimore. The game's 🔊 button
// (gameAudio.toggleMute) also mutes this player: the volume tick polls
// gameAudio.isMuted() and calls player.mute()/unMute() — mute() works
// even on iOS Safari, which ignores setVolume.
//
// ?music=0 disables the whole thing. Test hook: window.__music.

import { gameAudio } from './audio.js';

const FIRST_ID = 'xexyzoz5ylQ';   // "Dog Shit" — Wu-Tang Clan
const ALBUM_ID = 'PRtJsvZg6zI';   // "Wu-Tang Forever" full album
const MUSIC_VOL = 40;             // goal volume on the YT 0..100 scale
const FADE_S = 1.6;               // fade-in length, as Baltimore
const START_PAD = 20;             // s of album intro skipped by the offset
const END_PAD = 240;              // never start within the last 240 s
const ALBUM_LEN_GUESS = 6683;     // measured (yt-dlp, android_vr client):
                                  // 6,683 s = 111 min. Fallback only; the
                                  // real length is read from the player
                                  // (getDuration) at runtime

export function createMusic() {
  let silenced = false;
  const api = {
    started: false, ready: false, playing: false, noSignal: false,
    failed: false, current: null, albumStart: null, vol: 0, state,
    setSilenced(flag) { silenced = !!flag; },
    next() { // the same advance onState runs on ENDED (also a skip hook)
      if (api.current === 'first' || api.current === 'album') playAlbum();
    },
  };
  if (typeof window === 'undefined' || typeof document === 'undefined') return api;
  if (new URLSearchParams(location.search).get('music') === '0') return api;

  let player = null, goal = 0, tickTimer = null;

  // ---- hidden box (Baltimore's #rplay, verbatim values) ----
  const css = document.createElement('style');
  css.textContent = `
  #splay { position: fixed; left: 0; bottom: 0; width: 2px; height: 2px; overflow: hidden; opacity: .01; pointer-events: none; z-index: -1; }
  #splay iframe, #splay > div { width: 2px !important; height: 2px !important; border: 0; pointer-events: none; }`;
  document.head.appendChild(css);
  const box = document.createElement('div');
  box.id = 'splay';
  document.body.appendChild(box);

  function state() {
    let ytState = null, dur = 0, t = 0, ytMuted = null;
    try {
      if (player && player.getPlayerState) ytState = player.getPlayerState();
      if (player && player.getDuration) dur = player.getDuration() || 0;
      if (player && player.getCurrentTime) t = player.getCurrentTime() || 0;
      if (player && player.isMuted) ytMuted = player.isMuted();
    } catch (_) {}
    return {
      started: api.started, ready: api.ready, playing: api.playing,
      noSignal: api.noSignal, failed: api.failed, current: api.current,
      albumStart: api.albumStart, vol: Math.round(api.vol),
      muted: gameAudio.isMuted(), ytMuted, ytState, duration: dur, time: t,
    };
  }

  /* ------------------------- album sequencing ------------------------ */
  function pickOffset(len) {
    const L = len > 0 ? len : ALBUM_LEN_GUESS;
    const hi = Math.max(START_PAD + 1, L - END_PAD);
    return Math.floor(START_PAD + Math.random() * (hi - START_PAD));
  }
  function playAlbum() {
    if (!player || !api.ready) return;
    api.current = 'album';
    // Cue first so getDuration() reports the album's real length, then
    // load at the random offset (Baltimore cues/loads the same way).
    let waited = 0;
    const go = () => {
      let len = 0;
      try { len = player.getDuration() || 0; } catch (_) {}
      if (len <= 0 && waited < 3000) { waited += 150; setTimeout(go, 150); return; }
      api.albumStart = pickOffset(len);
      try { player.loadVideoById({ videoId: ALBUM_ID, startSeconds: api.albumStart }); } catch (_) {}
      goal = MUSIC_VOL;
    };
    try { player.cueVideoById(ALBUM_ID); } catch (_) {}
    go();
  }

  /* --------------------------- YT player ----------------------------- */
  function onReady() {
    api.ready = true;
    try { player.setVolume(0); } catch (_) {}
    if (api.started) {
      api.current = 'first';
      try { player.loadVideoById(FIRST_ID); } catch (_) {}
      goal = MUSIC_VOL;
    } else {
      try { player.cueVideoById(FIRST_ID); } catch (_) {}
    }
  }
  function onState(e) {
    const s = e.data; // -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
    if (s === 1) api.playing = true;
    else if (s === 0) {
      api.playing = false;
      if (api.current === 'first') playAlbum();       // song 1 done -> album, random spot
      else if (api.current === 'album') playAlbum();  // album done -> fresh random spot
    } else if (s === 2) api.playing = false;
  }
  function onError() { // embedding refused / video gone: advance like Baltimore, never loop on the album
    api.playing = false;
    if (api.current === 'first') playAlbum();
    else { api.failed = true; goal = 0; }
  }
  function noSignal() { // YouTube unreachable (offline, blocked): the game just stays music-free
    if (api.ready) return;
    api.noSignal = true;
  }
  function makeYT() {
    const f = document.createElement('iframe');
    f.id = 'splayer'; f.title = 'Scaggsville 3D music audio'; f.setAttribute('allow', 'autoplay');
    f.setAttribute('tabindex', '-1'); f.setAttribute('aria-hidden', 'true');
    f.width = 2; f.height = 2; f.frameBorder = '0';
    f.src = 'https://www.youtube.com/embed/' + FIRST_ID + '?enablejsapi=1&playsinline=1&controls=0&fs=0&disablekb=1&rel=0&iv_load_policy=3&modestbranding=1&origin=' + encodeURIComponent(location.origin);
    box.appendChild(f);
    const mk = () => { player = new YT.Player('splayer', { events: { onReady, onStateChange: onState, onError } }); };
    if (window.YT && YT.Player) mk();
    else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev && prev(); mk(); };
      const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true;
      s.onerror = noSignal; setTimeout(() => { if (!api.ready) noSignal(); }, 15000);
      document.head.appendChild(s);
    }
  }

  /* ------------------------- start on gesture ------------------------ */
  function start() {
    if (api.started) return;
    api.started = true;
    if (player && api.ready) {
      api.current = 'first';
      try { player.setVolume(0); player.loadVideoById(FIRST_ID); } catch (_) {}
      api.vol = 0; goal = MUSIC_VOL;
    }
    // volume fade + mute sync tick (Baltimore ramps vol in its main tick)
    if (!tickTimer) {
      tickTimer = setInterval(() => {
        if (!player || !api.ready) return;
        try {
          if (gameAudio.isMuted() || silenced) { if (!player.isMuted || !player.isMuted()) player.mute(); }
          else if (player.isMuted && player.isMuted()) player.unMute();
        } catch (_) {}
        if (api.vol !== goal) {
          const stp = MUSIC_VOL / (FADE_S / 0.12);
          api.vol = api.vol < goal ? Math.min(goal, api.vol + stp) : Math.max(goal, api.vol - stp);
          try { player.setVolume(Math.round(api.vol)); } catch (_) {}
        }
      }, 120);
    }
  }
  const gesture = () => start();
  addEventListener('pointerdown', gesture, { capture: true });
  addEventListener('touchstart', gesture, { capture: true, passive: true });
  addEventListener('keydown', gesture, { capture: true });

  /* ------------- test stub (?musicstub=1), Baltimore's ?radiotest idea:
     same player interface, no network. Track 1 runs 6 s once loaded so
     the real ENDED -> album advance fires quickly in headless tests;
     the album reports its true measured length (6,683 s). ------------- */
  function makeStub() {
    const P = { vid: null, pos: 0, on: false, dur: 0, v: 0, mutedFlag: false, _tick: null,
      setVolume(v) { this.v = v; }, getVolume() { return this.v; },
      mute() { this.mutedFlag = true; }, unMute() { this.mutedFlag = false; }, isMuted() { return this.mutedFlag; },
      getPlayerState() { return this.on ? 1 : (this.vid ? 5 : -1); },
      getDuration() { return this.dur; }, getCurrentTime() { return this.pos; },
      cueVideoById(a) { const id = typeof a === 'object' ? a.videoId : a; this.vid = id; this.pos = 0; this.dur = id === ALBUM_ID ? ALBUM_LEN_GUESS : 200; },
      loadVideoById(a) { const id = typeof a === 'object' ? a.videoId : a; this.vid = id; this.pos = (typeof a === 'object' && a.startSeconds) || 0;
        this.dur = id === ALBUM_ID ? ALBUM_LEN_GUESS : 6; this.on = true;
        setTimeout(() => onState({ data: 1 }), 30);
        clearInterval(this._tick);
        this._tick = setInterval(() => { if (!this.on) return; this.pos += 0.25;
          if (this.pos >= this.dur) { this.on = false; clearInterval(this._tick); onState({ data: 0 }); } }, 250); },
    };
    player = P;
    setTimeout(() => onReady(), 50);
  }

  if (new URLSearchParams(location.search).get('musicstub') === '1') makeStub();
  else makeYT();
  window.__music = api;
  return api;
}

// Singleton: importing this module wires the hidden player up.
export const music = createMusic();
