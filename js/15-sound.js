// ============================================================
// PROCEDURAL AUDIO: SFX + CHILL BACKGROUND MUSIC (Web Audio API)
// All audio is synthesized in-code — no files needed, so it
// works from file:// and stays tiny.
//   SFX:    Sound.play('shoot'); Sound.play('gem');
//   Music:  Sound.startMusic(); Sound.stopMusic();
//   Volume: Sound.setSfxVolume(0..1); Sound.setMusicVolume(0..1)
//           (persisted in localStorage)
//   Mute:   M key or Sound.toggleMute().
// ============================================================
const Sound = (() => {
  let ctx = null;
  let master = null;
  let sfxGain = null;
  let musicGain = null;
  let noiseBuf = null;
  let muted = false;
  let lastAny = 0;
  let musicPlaying = false;
  let musicTimer = null;
  const lastPlay = {};

  // --- Volume state (persisted) ---
  let musicVol = parseFloat(localStorage.getItem('shadow.volume.music'));
  if (!(musicVol >= 0)) musicVol = 0.6;
  let sfxVol = parseFloat(localStorage.getItem('shadow.volume.sfx'));
  if (!(sfxVol >= 0)) sfxVol = 0.8;

  // --- AudioContext setup (lazy; autoplay policy requires a gesture) ---
  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    sfxGain = ctx.createGain();
    sfxGain.connect(master);
    musicGain = ctx.createGain();
    musicGain.connect(master);
    applyVolumes(true);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    // Resume whenever the user interacts (browsers block audio until then)
    const unlock = () => { if (ctx && ctx.state === 'suspended') ctx.resume(); };
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
  }

  function applyVolumes(instant) {
    if (!sfxGain || !musicGain) return;
    const mt = instant ? 0 : 0.05;
    const target = (v) => muted ? 0 : v;
    sfxGain.gain.setTargetAtTime(target(sfxVol), ctx.currentTime, mt);
    musicGain.gain.setTargetAtTime(target(musicVol), ctx.currentTime, mt);
  }

  // --- Low-level synth helpers (SFX route to sfxGain) ---
  function tone(o) {
    if (!ctx) return;
    const t0 = ctx.currentTime + (o.delay || 0);
    const dur = o.dur;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(Math.max(1, o.f0), t0);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol, t0 + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(o) {
    if (!ctx) return;
    const t0 = ctx.currentTime + (o.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = o.filterType || 'lowpass';
    filter.frequency.setValueAtTime(Math.max(1, o.f0), t0);
    if (o.f1) filter.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t0 + o.dur);
    filter.Q.value = o.q || 0.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol, t0 + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(sfxGain);
    src.start(t0);
    src.stop(t0 + o.dur + 0.02);
  }

  const chime = (f0, f1, dur, vol, delay, type) =>
    tone({ f0, f1, dur, vol, delay, type: type || 'sine' });

  // --- Sound definitions ---
  const SFX_DEFS = {
    shoot:      { minGap: 70,  fn: () => {
      tone({ f0: 720, f1: 220, dur: 0.09, vol: 0.20, type: 'square' });
      noise({ f0: 3000, f1: 600, dur: 0.07, vol: 0.10, filterType: 'highpass' });
    }},
    shootAlt:   { minGap: 80,  fn: () => {
      tone({ f0: 520, f1: 1250, dur: 0.08, vol: 0.18 });
      noise({ f0: 3800, dur: 0.05, vol: 0.08, filterType: 'highpass' });
    }},
    lightning:  { minGap: 150, fn: () => {
      noise({ f0: 5000, f1: 300, dur: 0.22, vol: 0.42, q: 1.2, filterType: 'bandpass' });
      tone({ f0: 150, f1: 35, dur: 0.30, vol: 0.32, type: 'square' });
    }},
    blast:      { minGap: 250, fn: () => {
      tone({ f0: 110, f1: 30, dur: 0.35, vol: 0.50 });
      noise({ f0: 900, f1: 120, dur: 0.30, vol: 0.30 });
      tone({ f0: 55, f1: 28, dur: 0.30, vol: 0.25, type: 'triangle', delay: 0.05 });
    }},
    shieldHit:  { minGap: 100, fn: () => {
      tone({ f0: 880, f1: 700, dur: 0.05, vol: 0.12, type: 'triangle' });
      chime(1320, 1200, 0.04, 0.08, 0);
    }},
    sawHit:     { minGap: 100, fn: () => {
      tone({ f0: 620, f1: 240, dur: 0.07, vol: 0.16, type: 'square' });
      noise({ f0: 4600, f1: 900, dur: 0.09, vol: 0.12, filterType: 'bandpass' });
      tone({ f0: 1800, f1: 700, dur: 0.04, vol: 0.06, type: 'triangle' });
    }},
    shieldBreak:{ minGap: 250, fn: () => {
      noise({ f0: 2500, f1: 500, dur: 0.25, vol: 0.35, filterType: 'bandpass' });
      tone({ f0: 900, f1: 220, dur: 0.20, vol: 0.24, type: 'square' });
    }},
    hit:        { minGap: 55,  fn: () =>
      tone({ f0: 260, f1: 150, dur: 0.06, vol: 0.11, type: 'triangle' })
    },
    die:        { minGap: 70,  fn: () => {
      tone({ f0: 600, f1: 120, dur: 0.16, vol: 0.20, type: 'square' });
      noise({ f0: 2000, f1: 400, dur: 0.10, vol: 0.12 });
    }},
    dieElite:   { minGap: 150, fn: () => {
      tone({ f0: 500, f1: 80, dur: 0.20, vol: 0.30, type: 'square' });
      tone({ f0: 300, f1: 100, dur: 0.25, vol: 0.24, type: 'triangle' });
      noise({ f0: 1500, f1: 300, dur: 0.20, vol: 0.20 });
    }},
    dieBoss:    { minGap: 400, fn: () => {
      tone({ f0: 160, f1: 30, dur: 0.60, vol: 0.50 });
      noise({ f0: 1200, f1: 100, dur: 0.55, vol: 0.40 });
      tone({ f0: 200, f1: 40, dur: 0.40, vol: 0.25, type: 'square' });
    }},
    hurt:       { minGap: 120, fn: () => {
      tone({ f0: 220, f1: 60, dur: 0.22, vol: 0.34, type: 'sawtooth' });
      noise({ f0: 1000, f1: 200, dur: 0.18, vol: 0.28 });
    }},
    gem:        { minGap: 90,  fn: () => {
      chime(950, 1550, 0.10, 0.20);
      chime(1425, 2325, 0.11, 0.14, 0.06);
    }},
    levelup:    { minGap: 300, fn: () => {
      chime(660, 660, 0.16, 0.32, 0, 'triangle');
      chime(880, 880, 0.16, 0.32, 0.09, 'triangle');
      chime(1320, 1320, 0.22, 0.36, 0.18, 'triangle');
      noise({ f0: 6000, dur: 0.12, vol: 0.07, filterType: 'highpass', delay: 0.18 });
    }},
    select:     { minGap: 40,  fn: () =>
      tone({ f0: 700, f1: 500, dur: 0.05, vol: 0.16, type: 'square' })
    },
    magnet:     { minGap: 800, fn: () => {
      tone({ f0: 320, f1: 920, dur: 0.30, vol: 0.28 });
      tone({ f0: 160, f1: 520, dur: 0.34, vol: 0.20, delay: 0.06, type: 'sawtooth' });
      noise({ f0: 4200, f1: 250, dur: 0.32, vol: 0.12, filterType: 'highpass' });
    }},
    bossWarn:   { minGap: 8000, fn: () => {
      tone({ f0: 90,  f1: 60,  dur: 0.55, vol: 0.45 });
      tone({ f0: 70,  f1: 45,  dur: 0.55, vol: 0.45, delay: 0.35 });
      tone({ f0: 55,  f1: 38,  dur: 0.80, vol: 0.22, type: 'sawtooth', delay: 0.10 });
    }},
    eliteWarn:  { minGap: 5000, fn: () => {
      tone({ f0: 220, f1: 150, dur: 0.22, vol: 0.26 });
      chime(330, 200, 0.20, 0.20, 0.20);
    }},
    gameover:   { minGap: 500, fn: () => {
      chime(440, 440, 0.30, 0.34, 0, 'triangle');
      chime(330, 330, 0.30, 0.34, 0.25, 'triangle');
      chime(247, 247, 0.50, 0.36, 0.50, 'triangle');
      tone({ f0: 120, f1: 50, dur: 1.10, vol: 0.25, delay: 0.15 });
    }},
    start:      { minGap: 300, fn: () => {
      chime(523, 523, 0.15, 0.30, 0,   'triangle');
      chime(659, 659, 0.15, 0.30, 0.10, 'triangle');
      chime(784, 784, 0.30, 0.34, 0.20, 'triangle');
      noise({ f0: 6000, dur: 0.16, vol: 0.08, filterType: 'highpass', delay: 0.20 });
    }},
    pause:      { minGap: 100, fn: () =>
      tone({ f0: 520, f1: 360, dur: 0.14, vol: 0.26 })
    },
    unpause:    { minGap: 100, fn: () =>
      tone({ f0: 500, f1: 700, dur: 0.14, vol: 0.26 })
    }
  };

  // ============================================================
  // DYNAMIC PROCEDURAL MUSIC
  // Adapts tempo and layers to nearby enemy count.
  // Calm: 72 BPM, soft pads + steady arp.
  // Intense (30+ enemies within 350px): up to ~220 BPM, louder pads,
  // added kick/hi-hat percussion and thicker bass; arp stays fixed.
  // ============================================================
  const CALM_BEAT = 60 / 72;                // 0.833s — 72 BPM
  const HOT_BEAT  = 60 / 220;               // 0.273s — 220 BPM

  const CHORDS = [
    { bass: 110.00, pad: [220.00, 261.63, 329.63, 392.00],
      arp: [220, 329.63, 261.63, 392, 440, 329.63, 261.63, 220] },   // Am7
    { bass: 87.31,  pad: [174.61, 220.00, 261.63, 329.63],
      arp: [174.61, 261.63, 329.63, 220, 349.23, 261.63, 220, 174.61] }, // Fmaj7
    { bass: 130.81, pad: [164.81, 196.00, 246.94, 329.63],
      arp: [196, 246.94, 329.63, 392, 493.88, 329.63, 246.94, 196] },  // Cmaj7
    { bass: 98.00,  pad: [196.00, 246.94, 293.66, 329.63],
      arp: [246.94, 293.66, 329.63, 392, 440, 329.63, 293.66, 246.94] } // G6
  ];

  // --- Music synth helpers (route to musicGain, take absolute ctx time) ---
  function mTone(f0, t0, dur, vol, type) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(f0, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.04);
    g.gain.setValueAtTime(vol, t0 + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(musicGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function mKick(t0, vol) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t0);
    osc.frequency.exponentialRampToValueAtTime(40, t0 + 0.12);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
    osc.connect(g);
    g.connect(musicGain);
    osc.start(t0);
    osc.stop(t0 + 0.22);
  }

  function mHat(t0, vol) {
    if (!ctx || !noiseBuf) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const flt = ctx.createBiquadFilter();
    flt.type = 'highpass';
    flt.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
    src.connect(flt);
    flt.connect(g);
    g.connect(musicGain);
    src.start(t0);
    src.stop(t0 + 0.08);
  }

  // --- Intensity: 0 (calm) → 1 (swarmed) ---
  function getIntensity() {
    if (!game || !game.running || !game.player) return 0;
    const px = game.player.x, py = game.player.y;
    let count = 0;
    for (const e of game.enemies) {
      const dx = e.x - px, dy = e.y - py;
      if (dx * dx + dy * dy < 122500) count++;   // 350^2
    }
    return Math.min(1, count / 30);
  }

  let musicBar = 0;
  let nextBarTime = 0;

  function scheduleBars() {
    const lookAhead = ctx.currentTime + 1.0;
    while (nextBarTime < lookAhead) {
      const i = getIntensity();
      const beat = CALM_BEAT + (HOT_BEAT - CALM_BEAT) * i;
      const barDur = beat * 4;
      const chord = CHORDS[Math.floor(musicBar / 2) % CHORDS.length];
      const t0 = nextBarTime;
      const isChordStart = (musicBar % 2 === 0);

      // --- Pad (sustains over the 2-bar chord) ---
      if (isChordStart) {
        const chordDur = barDur * 2;
        const padVol = 0.020 + i * 0.025;
        for (const f of chord.pad) mTone(f, t0, chordDur + 1.5, padVol, 'sine');
        // Subtle upper octave layer at high intensity
        if (i > 0.5) {
          const extra = (i - 0.5) * 2;           // 0 → 1
          for (const f of chord.pad) mTone(f * 2, t0, chordDur + 1.0, padVol * extra * 0.35, 'sine');
        }
      }

      // --- Bass ---
      const bassVol = 0.050 + i * 0.05;
      mTone(chord.bass, t0, barDur * 0.9, bassVol, 'sine');
      // Sub-bass at high intensity
      if (i > 0.3) mTone(chord.bass * 0.5, t0, barDur * 0.8, bassVol * (i - 0.3) * 0.5, 'sine');

      // --- Arpeggio (stays fixed at base count/volume in any intensity) ---
      const arpCount = 8;
      const arpStep = (barDur * 2) / arpCount;
      const arpVol = 0.030;
      for (let e = 0; e < arpCount; e++) {
        const n = chord.arp[e % chord.arp.length];
        mTone(n, t0 + e * arpStep, arpStep * 1.5, arpVol, 'triangle');
      }

      // --- Percussion (fades in with intensity) ---
      // Kick on beats 0 and 2
      if (i > 0.15) {
        const kv = (i - 0.15) * 0.12;
        mKick(t0, kv);
        mKick(t0 + beat * 2, kv);
      }
      // Hi-hat on every 8th-note off-beat
      if (i > 0.35) {
        const hv = (i - 0.35) * 0.10;
        for (let h = 1; h < 8; h += 2) {
          mHat(t0 + beat * 0.5 * h, hv);
        }
      }

      nextBarTime += barDur;
      musicBar++;
    }
  }

  function musicTick() {
    if (!ctx || !musicPlaying) return;
    if (ctx.state === 'suspended') ctx.resume();
    scheduleBars();
  }

  function startMusic() {
    init();
    if (!ctx || musicPlaying) return;
    musicPlaying = true;
    musicBar = 0;
    nextBarTime = ctx.currentTime + 0.1;
    musicTimer = setInterval(musicTick, 200);
    musicTick();
  }

  function stopMusic() {
    musicPlaying = false;
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  function play(name, opts) {
    if (muted || !name) return;
    init();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const def = SFX_DEFS[name];
    if (!def) return;
    const now = performance.now();
    if (lastPlay[name] && now - lastPlay[name] < def.minGap) return;
    if (now - lastAny < 20) return;          // global gate: no sound spam
    lastAny = now;
    lastPlay[name] = now;
    def.fn(opts);
  }

  function toggleMute() {
    muted = !muted;
    applyVolumes();
    return muted;
  }

  function setMusicVolume(v) {
    musicVol = Math.max(0, Math.min(1, v));
    localStorage.setItem('shadow.volume.music', String(musicVol));
    applyVolumes();
  }

  function setSfxVolume(v) {
    sfxVol = Math.max(0, Math.min(1, v));
    localStorage.setItem('shadow.volume.sfx', String(sfxVol));
    applyVolumes();
  }

  function setVolume(v) { setSfxVolume(v); }

  return {
    play, toggleMute, setVolume, startMusic, stopMusic,
    setSfxVolume, setMusicVolume,
    get sfxVolume() { return sfxVol; },
    get musicVolume() { return musicVol; },
    get muted() { return muted; }
  };
})();

// M toggles all audio on/off
document.addEventListener('keydown', e => {
  if (e.code === 'KeyM') {
    Sound.toggleMute();
    e.preventDefault();
  }
});