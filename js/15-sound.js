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
  let sfxFilter = null;   // gentle lowpass that rounds off harsh SFX highs
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

    // SFX are finished through a warm lowpass so sharp edges, clicks and hiss
    // get gently rounded off — the music bus stays untouched.
    sfxFilter = ctx.createBiquadFilter();
    sfxFilter.type = 'lowpass';
    sfxFilter.frequency.value = 6800;
    sfxFilter.Q.value = 0.3;
    sfxGain.connect(sfxFilter);
    sfxFilter.connect(master);

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

  // --- Sound definitions: soft, warm and harmonic by design ---
  // Square/sawtooth are reserved for rare dramatic accents; the default is
  // sine/triangle plus lowpass-lassened noise so nothing pokes the ear.
  const SFX_DEFS = {
    shoot:      { minGap: 70,  fn: () => {
      tone({ f0: 680, f1: 460, dur: 0.09, vol: 0.16, attack: 0.010, type: 'triangle' });
      noise({ f0: 1400, f1: 500, dur: 0.06, vol: 0.05, filterType: 'lowpass', attack: 0.010 });
    }},
    shootAlt:   { minGap: 80,  fn: () => {
      tone({ f0: 540, f1: 880, dur: 0.08, vol: 0.15, attack: 0.010, type: 'triangle' });
      noise({ f0: 2000, f1: 800, dur: 0.05, vol: 0.04, filterType: 'lowpass', attack: 0.010 });
    }},
    lightning:  { minGap: 150, fn: () => {
      noise({ f0: 3000, f1: 400, dur: 0.20, vol: 0.22, q: 0.8, filterType: 'bandpass', attack: 0.010 });
      tone({ f0: 220, f1: 55, dur: 0.26, vol: 0.20, attack: 0.012, type: 'triangle' });
      tone({ f0: 440, f1: 880, dur: 0.10, vol: 0.08, type: 'sine', delay: 0.02 });
    }},
    blast:      { minGap: 250, fn: () => {
      tone({ f0: 120, f1: 38, dur: 0.35, vol: 0.45, attack: 0.015 });
      noise({ f0: 700, f1: 140, dur: 0.28, vol: 0.20, filterType: 'lowpass', attack: 0.015 });
      tone({ f0: 60, f1: 32, dur: 0.30, vol: 0.22, type: 'triangle', delay: 0.05, attack: 0.015 });
    }},
    shieldHit:  { minGap: 100, fn: () => {
      tone({ f0: 880, f1: 660, dur: 0.06, vol: 0.10, attack: 0.008, type: 'triangle' });
      chime(1320, 1240, 0.05, 0.06, 0, 'sine');
    }},
    sawHit:     { minGap: 100, fn: () => {
      tone({ f0: 560, f1: 300, dur: 0.07, vol: 0.13, attack: 0.010, type: 'triangle' });
      noise({ f0: 2400, f1: 700, dur: 0.08, vol: 0.07, filterType: 'lowpass', attack: 0.010 });
      tone({ f0: 1200, f1: 800, dur: 0.05, vol: 0.05, type: 'sine', attack: 0.010 });
    }},
    shieldBreak:{ minGap: 250, fn: () => {
      noise({ f0: 1800, f1: 500, dur: 0.22, vol: 0.20, filterType: 'bandpass', attack: 0.012 });
      tone({ f0: 700, f1: 240, dur: 0.20, vol: 0.16, type: 'triangle', attack: 0.012 });
      chime(1050, 1400, 0.12, 0.10, 0.02, 'sine');
    }},
    hit:        { minGap: 55,  fn: () => {
      tone({ f0: 240, f1: 160, dur: 0.06, vol: 0.09, attack: 0.010, type: 'triangle' });
      noise({ f0: 1200, f1: 500, dur: 0.03, vol: 0.03, filterType: 'lowpass' });
    }},
    die:        { minGap: 70,  fn: () => {
      tone({ f0: 520, f1: 160, dur: 0.16, vol: 0.16, attack: 0.012, type: 'triangle' });
      tone({ f0: 260, f1: 130, dur: 0.12, vol: 0.08, type: 'sine', delay: 0.03 });
      noise({ f0: 1600, f1: 400, dur: 0.08, vol: 0.05, filterType: 'lowpass', attack: 0.010 });
    }},
    dieElite:   { minGap: 150, fn: () => {
      tone({ f0: 500, f1: 150, dur: 0.22, vol: 0.22, attack: 0.012, type: 'triangle' });
      tone({ f0: 300, f1: 140, dur: 0.26, vol: 0.16, type: 'sine', delay: 0.02, attack: 0.012 });
      chime(660, 990, 0.14, 0.12, 0.08, 'sine');
      noise({ f0: 1200, f1: 300, dur: 0.16, vol: 0.10, filterType: 'lowpass', attack: 0.012 });
    }},
    dieBoss:    { minGap: 400, fn: () => {
      tone({ f0: 150, f1: 34, dur: 0.60, vol: 0.40, attack: 0.02 });
      tone({ f0: 300, f1: 90, dur: 0.45, vol: 0.18, type: 'triangle', delay: 0.05, attack: 0.02 });
      noise({ f0: 1000, f1: 160, dur: 0.50, vol: 0.20, filterType: 'lowpass', attack: 0.02 });
      chime(220, 330, 0.25, 0.12, 0.15, 'sine');
    }},
    hurt:       { minGap: 120, fn: () => {
      tone({ f0: 220, f1: 90, dur: 0.20, vol: 0.22, attack: 0.012, type: 'triangle' });
      tone({ f0: 110, f1: 60, dur: 0.18, vol: 0.10, type: 'sine', delay: 0.02 });
      noise({ f0: 900, f1: 250, dur: 0.14, vol: 0.10, filterType: 'lowpass', attack: 0.012 });
    }},
    gem:        { minGap: 90,  fn: () => {
      chime(950, 1560, 0.10, 0.16, 0, 'sine');
      chime(1425, 1900, 0.12, 0.10, 0.06, 'sine');
      chime(1900, 2400, 0.12, 0.06, 0.12, 'sine');
    }},
    levelup:    { minGap: 300, fn: () => {
      chime(440, 440, 0.18, 0.26, 0,   'sine');
      chime(660, 660, 0.18, 0.26, 0.10, 'sine');
      chime(880, 880, 0.24, 0.28, 0.20, 'sine');
      chime(1100, 1100, 0.30, 0.16, 0.30, 'sine');
    }},
    select:     { minGap: 40,  fn: () =>
      tone({ f0: 660, f1: 880, dur: 0.06, vol: 0.14, attack: 0.010, type: 'triangle' })
    },
    magnet:     { minGap: 800, fn: () => {
      tone({ f0: 330, f1: 990, dur: 0.28, vol: 0.22, attack: 0.015 });
      tone({ f0: 165, f1: 495, dur: 0.30, vol: 0.14, delay: 0.06, type: 'triangle' });
      noise({ f0: 2200, f1: 400, dur: 0.28, vol: 0.07, filterType: 'lowpass', attack: 0.015 });
    }},
    bossWarn:   { minGap: 8000, fn: () => {
      tone({ f0: 92, f1: 62, dur: 0.55, vol: 0.34, attack: 0.03 });
      tone({ f0: 70, f1: 48, dur: 0.55, vol: 0.30, delay: 0.35, attack: 0.03 });
      tone({ f0: 55, f1: 40, dur: 0.80, vol: 0.16, type: 'triangle', delay: 0.12, attack: 0.04 });
    }},
    eliteWarn:  { minGap: 5000, fn: () => {
      tone({ f0: 220, f1: 160, dur: 0.22, vol: 0.20, attack: 0.012 });
      chime(330, 240, 0.20, 0.14, 0.18, 'sine');
    }},
    storm:      { minGap: 1500, fn: () => {
      noise({ f0: 500, f1: 180, dur: 1.2, vol: 0.09, filterType: 'lowpass' });
      tone({ f0: 200, f1: 140, dur: 0.7, vol: 0.10, attack: 0.05, type: 'triangle' });
    }},
    gust:       { minGap: 700, fn: () => {
      noise({ f0: 900, f1: 300, dur: 0.5, vol: 0.05, filterType: 'lowpass' });
    }},
    recipe:     { minGap: 600, fn: () => {
      chime(523, 784, 0.22, 0.22, 0, 'sine');
      chime(659, 1046, 0.24, 0.18, 0.10, 'sine');
    }},
    portal:     { minGap: 600, fn: () => {
      chime(392, 523, 0.30, 0.20, 0, 'sine');
      chime(523, 659, 0.30, 0.16, 0.15, 'sine');
      noise({ f0: 3000, f1: 900, dur: 0.5, vol: 0.04, filterType: 'lowpass', delay: 0.2 });
    }},
    gameover:   { minGap: 500, fn: () => {
      chime(440, 440, 0.28, 0.26, 0,   'sine');
      chime(330, 330, 0.28, 0.26, 0.25, 'sine');
      chime(247, 247, 0.50, 0.28, 0.50, 'sine');
      tone({ f0: 110, f1: 55, dur: 1.10, vol: 0.16, delay: 0.15, attack: 0.02 });
    }},
    start:      { minGap: 300, fn: () => {
      chime(523, 523, 0.14, 0.24, 0,   'sine');
      chime(659, 659, 0.14, 0.24, 0.10, 'sine');
      chime(784, 784, 0.30, 0.26, 0.20, 'sine');
      noise({ f0: 4000, f1: 1800, dur: 0.14, vol: 0.04, filterType: 'lowpass', delay: 0.22 });
    }},
    pause:      { minGap: 100, fn: () =>
      tone({ f0: 520, f1: 380, dur: 0.16, vol: 0.20, attack: 0.012 })
    },
    unpause:    { minGap: 100, fn: () =>
      tone({ f0: 440, f1: 660, dur: 0.16, vol: 0.20, attack: 0.012 })
    }
  };

  // ============================================================
  // DYNAMIC PROCEDURAL MUSIC
  // Adapts tempo and layers to nearby enemy count.
  // Calm: 72 BPM, soft pads + steady arp.
  // Intense (30+ enemies within 350px): up to ~220 BPM, louder pads,
  // added kick/hi-hat percussion and thicker bass; arp stays fixed.
  //
  // The harmony is one long 16-bar loop in A minor (Am7 → Fmaj7 → Cmaj7
  // → G6 → Dm7 → Em7 → Am7 → E7 → back to Am7): each chord gets a unique
  // 16-note melodic contour, and every full pass through the loop the
  // contour shifts a few steps so the melody keeps evolving while always
  // staying on diatonic chord tones.
  // ============================================================
  const CALM_BEAT = 60 / 72;                // 0.833s — 72 BPM
  const HOT_BEAT  = 60 / 220;               // 0.273s — 220 BPM

  const CHORDS = [
    {
      bass: 110.00, pad: [220.00, 261.63, 329.63, 392.00],
      arp: [220, 329.63, 392, 440, 523.25, 440, 392, 329.63,
            261.63, 329.63, 392, 440, 392, 329.63, 261.63, 220]
    },   // Am7  — rising then falling home phrase
    {
      bass: 87.31,  pad: [174.61, 220.00, 261.63, 329.63],
      arp: [174.61, 261.63, 349.23, 440, 523.25, 440, 349.23, 261.63,
            220, 293.66, 349.23, 440, 349.23, 293.66, 261.63, 220]
    },   // Fmaj7 — gentle arch with a high C
    {
      bass: 130.81, pad: [164.81, 196.00, 246.94, 329.63],
      arp: [164.81, 196, 246.94, 293.66, 329.63, 392, 440, 329.63,
            261.63, 329.63, 392, 329.63, 293.66, 246.94, 196, 164.81]
    },   // Cmaj7 — bright middle, playful
    {
      bass: 98.00,  pad: [196.00, 246.94, 293.66, 329.63],
      arp: [196, 246.94, 293.66, 392, 493.88, 392, 329.63, 293.66,
            246.94, 293.66, 392, 587.33, 493.88, 392, 293.66, 246.94]
    },   // G6    — steps up to the highest peak of the loop
    {
      bass: 146.83, pad: [174.61, 220.00, 261.63, 349.23],
      arp: [146.83, 174.61, 220, 293.66, 349.23, 440, 349.23, 293.66,
            220, 261.63, 293.66, 349.23, 440, 523.25, 349.23, 220]
    },   // Dm7   — melancholic dip, new color
    {
      bass: 164.81, pad: [196.00, 246.94, 293.66, 392.00],
      arp: [164.81, 196, 246.94, 329.63, 493.88, 392, 329.63, 246.94,
            196, 246.94, 329.63, 392, 493.88, 392, 246.94, 196]
    },   // Em7   — darker, answers the Dm7
    {
      bass: 110.00, pad: [220.00, 261.63, 329.63, 392.00],
      arp: [440, 523.25, 440, 392, 329.63, 392, 440, 523.25,
            440, 392, 329.63, 261.63, 220, 261.63, 329.63, 440]
    },   // Am7   — higher echo of the opening, prepares the dominant
    {
      bass: 82.41,  pad: [164.81, 207.65, 246.94, 329.63],
      arp: [164.81, 207.65, 246.94, 329.63, 415.30, 493.88, 415.30, 329.63,
            246.94, 329.63, 415.30, 493.88, 415.30, 329.63, 246.94, 207.65]
    }    // E7    — harmonic-minor tension that resolves home
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
  let chordIntensity = 0;   // intensity locked for the whole 2-bar chord
  let grooveKick = 0;       // smoothed kick level 0..1
  let grooveHat = 0;        // smoothed hi-hat level 0..1

  function scheduleBars() {
    const lookAhead = ctx.currentTime + 1.0;
    while (nextBarTime < lookAhead) {
      const isChordStart = (musicBar % 2 === 0);
      // Tempo and levels are locked to the 2-bar chord: the arpeggio spans
      // both bars on ONE grid, so bass and percussion must use the very same
      // beat or they drift apart whenever intensity (and thus BPM) changes.
      if (isChordStart) chordIntensity = getIntensity();
      const i = chordIntensity;
      const beat = CALM_BEAT + (HOT_BEAT - CALM_BEAT) * i;
      const barDur = beat * 4;
      const playHop = Math.floor(musicBar / 2);   // one chord per 2 bars
      const chord = CHORDS[playHop % CHORDS.length];
      // Each full pass through the 16-bar loop shifts the melodic contour
      // forward a few steps, so a returning chord never plays identically
      // — but it always stays on the same diatonic note set.
      const arpRot = (Math.floor(playHop / CHORDS.length) * 5) % chord.arp.length;
      const t0 = nextBarTime;

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

      // --- Arpeggio / melody: a longer per-chord contour of sixteenth
      // note values (8 per bar), rotated slightly every loop pass ---
      const arpCount = chord.arp.length;
      const arpStep = (barDur * 2) / arpCount;
      const arpVol = 0.024;
      for (let e = 0; e < arpCount; e++) {
        const n = chord.arp[(e + arpRot) % arpCount];
        mTone(n, t0 + e * arpStep, arpStep * 1.5, arpVol, 'triangle');
      }

      // --- Percussion (smoothly fades in with intensity, locked to the chord) ---
      // A small anticipation push (PUSH) keeps the groove slightly AHEAD of the
      // melodic grid so the drums never sound like they are dragging behind.
      const PUSH = 0.045;
      const targetKick = clamp((i - 0.15) / 0.25, 0, 1);
      const targetHat  = clamp((i - 0.35) / 0.20, 0, 1);
      grooveKick += (targetKick - grooveKick) * 0.5;
      grooveHat  += (targetHat  - grooveHat)  * 0.5;
      if (grooveKick > 0.02) {
        const kv = grooveKick * 0.12;
        mKick(t0, kv);                               // downbeat stays locked
        mKick(t0 + beat * 2 - PUSH, kv);             // second kick anticipates
      }
      if (grooveHat > 0.02) {
        const hv = grooveHat * 0.10;
        for (let h = 1; h < 8; h += 2) {
          mHat(t0 + beat * 0.5 * h - PUSH, hv);      // 8th off-beats anticipate
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
    chordIntensity = 0;
    grooveKick = 0;
    grooveHat = 0;
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