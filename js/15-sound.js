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
  let sfxFilter = null;
  let musicGain = null;
  let noiseBuf = null;
  let muted = false;
  let lastAny = 0;
  const lastPlay = {};

  // --- Volume state (persisted) ---
  let musicVol = parseFloat(localStorage.getItem('shadow.volume.music'));
  if (!(musicVol >= 0)) musicVol = 0.6;

  let sfxVol = parseFloat(localStorage.getItem('shadow.volume.sfx'));
  if (!(sfxVol >= 0)) sfxVol = 0.8;

  // --- AudioContext setup ---
  function init() {
    if (ctx) return;

    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);

    sfxGain = ctx.createGain();
    musicGain = ctx.createGain();

    musicGain.connect(master);

    // SFX pass through a warm lowpass.
    // IMPORTANT: sfxGain is NOT also connected directly to master.
    sfxFilter = ctx.createBiquadFilter();
    sfxFilter.type = 'lowpass';
    sfxFilter.frequency.value = 6800;
    sfxFilter.Q.value = 0.3;

    sfxGain.connect(sfxFilter);
    sfxFilter.connect(master);

    applyVolumes(true);

    // Noise buffer
    noiseBuf = ctx.createBuffer(
      1,
      ctx.sampleRate * 2,
      ctx.sampleRate
    );

    const data = noiseBuf.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // Resume whenever the user interacts.
    const unlock = () => {
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
    };

    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
  }

  function applyVolumes(instant) {
    if (!sfxGain || !musicGain) return;

    const mt = instant ? 0 : 0.05;
    const target = v => muted ? 0 : v;

    sfxGain.gain.setTargetAtTime(
      target(sfxVol),
      ctx.currentTime,
      mt
    );

    musicGain.gain.setTargetAtTime(
      target(musicVol),
      ctx.currentTime,
      mt
    );
  }

  // ============================================================
  // LOW LEVEL SFX SYNTH
  // ============================================================

  function tone(o) {
    if (!ctx) return;

    const t0 = ctx.currentTime + (o.delay || 0);
    const dur = o.dur;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = o.type || 'sine';

    osc.frequency.setValueAtTime(
      Math.max(1, o.f0),
      t0
    );

    if (o.f1) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, o.f1),
        t0 + dur
      );
    }

    g.gain.setValueAtTime(0.0001, t0);

    g.gain.exponentialRampToValueAtTime(
      o.vol,
      t0 + (o.attack || 0.005)
    );

    g.gain.exponentialRampToValueAtTime(
      0.0001,
      t0 + dur
    );

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

    filter.frequency.setValueAtTime(
      Math.max(1, o.f0),
      t0
    );

    if (o.f1) {
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(1, o.f1),
        t0 + o.dur
      );
    }

    filter.Q.value = o.q || 0.5;

    const g = ctx.createGain();

    g.gain.setValueAtTime(0.0001, t0);

    g.gain.exponentialRampToValueAtTime(
      o.vol,
      t0 + (o.attack || 0.005)
    );

    g.gain.exponentialRampToValueAtTime(
      0.0001,
      t0 + o.dur
    );

    src.connect(filter);
    filter.connect(g);
    g.connect(sfxGain);

    src.start(t0);
    src.stop(t0 + o.dur + 0.02);
  }

  const chime = (
    f0,
    f1,
    dur,
    vol,
    delay,
    type
  ) =>
    tone({
      f0,
      f1,
      dur,
      vol,
      delay,
      type: type || 'sine'
    });

  // ============================================================
  // SOUND EFFECTS
  // ============================================================

  const SFX_DEFS = {

    shoot: {
      minGap: 70,
      fn: () => {
        tone({
          f0: 680,
          f1: 460,
          dur: 0.09,
          vol: 0.16,
          attack: 0.010,
          type: 'triangle'
        });

        noise({
          f0: 1400,
          f1: 500,
          dur: 0.06,
          vol: 0.05,
          filterType: 'lowpass',
          attack: 0.010
        });
      }
    },

    shootAlt: {
      minGap: 80,
      fn: () => {
        tone({
          f0: 540,
          f1: 880,
          dur: 0.08,
          vol: 0.15,
          attack: 0.010,
          type: 'triangle'
        });

        noise({
          f0: 2000,
          f1: 800,
          dur: 0.05,
          vol: 0.04,
          filterType: 'lowpass',
          attack: 0.010
        });
      }
    },

    lightning: {
      minGap: 150,
      fn: () => {
        noise({
          f0: 3000,
          f1: 400,
          dur: 0.20,
          vol: 0.22,
          q: 0.8,
          filterType: 'bandpass',
          attack: 0.010
        });

        tone({
          f0: 220,
          f1: 55,
          dur: 0.26,
          vol: 0.20,
          attack: 0.012,
          type: 'triangle'
        });

        tone({
          f0: 440,
          f1: 880,
          dur: 0.10,
          vol: 0.08,
          type: 'sine',
          delay: 0.02
        });
      }
    },

    blast: {
      minGap: 250,
      fn: () => {
        tone({
          f0: 120,
          f1: 38,
          dur: 0.35,
          vol: 0.45,
          attack: 0.015
        });

        noise({
          f0: 700,
          f1: 140,
          dur: 0.28,
          vol: 0.20,
          filterType: 'lowpass',
          attack: 0.015
        });

        tone({
          f0: 60,
          f1: 32,
          dur: 0.30,
          vol: 0.22,
          type: 'triangle',
          delay: 0.05,
          attack: 0.015
        });
      }
    },

    shieldHit: {
      minGap: 100,
      fn: () => {
        tone({
          f0: 880,
          f1: 660,
          dur: 0.06,
          vol: 0.10,
          attack: 0.008,
          type: 'triangle'
        });

        chime(
          1320,
          1240,
          0.05,
          0.06,
          0,
          'sine'
        );
      }
    },

    sawHit: {
      minGap: 100,
      fn: () => {
        tone({
          f0: 560,
          f1: 300,
          dur: 0.07,
          vol: 0.13,
          attack: 0.010,
          type: 'triangle'
        });

        noise({
          f0: 2400,
          f1: 700,
          dur: 0.08,
          vol: 0.07,
          filterType: 'lowpass',
          attack: 0.010
        });

        tone({
          f0: 1200,
          f1: 800,
          dur: 0.05,
          vol: 0.05,
          type: 'sine',
          attack: 0.010
        });
      }
    },

    shieldBreak: {
      minGap: 250,
      fn: () => {
        noise({
          f0: 1800,
          f1: 500,
          dur: 0.22,
          vol: 0.20,
          filterType: 'bandpass',
          attack: 0.012
        });

        tone({
          f0: 700,
          f1: 240,
          dur: 0.20,
          vol: 0.16,
          type: 'triangle',
          attack: 0.012
        });

        chime(
          1050,
          1400,
          0.12,
          0.10,
          0.02,
          'sine'
        );
      }
    },

    hit: {
      minGap: 55,
      fn: () => {
        tone({
          f0: 240,
          f1: 160,
          dur: 0.06,
          vol: 0.09,
          attack: 0.010,
          type: 'triangle'
        });

        noise({
          f0: 1200,
          f1: 500,
          dur: 0.03,
          vol: 0.03,
          filterType: 'lowpass'
        });
      }
    },

    die: {
      minGap: 70,
      fn: () => {
        tone({
          f0: 520,
          f1: 160,
          dur: 0.16,
          vol: 0.16,
          attack: 0.012,
          type: 'triangle'
        });

        tone({
          f0: 260,
          f1: 130,
          dur: 0.12,
          vol: 0.08,
          type: 'sine',
          delay: 0.03
        });

        noise({
          f0: 1600,
          f1: 400,
          dur: 0.08,
          vol: 0.05,
          filterType: 'lowpass',
          attack: 0.010
        });
      }
    },

    dieElite: {
      minGap: 150,
      fn: () => {
        tone({
          f0: 500,
          f1: 150,
          dur: 0.22,
          vol: 0.22,
          attack: 0.012,
          type: 'triangle'
        });

        tone({
          f0: 300,
          f1: 140,
          dur: 0.26,
          vol: 0.16,
          type: 'sine',
          delay: 0.02,
          attack: 0.012
        });

        chime(
          660,
          990,
          0.14,
          0.12,
          0.08,
          'sine'
        );

        noise({
          f0: 1200,
          f1: 300,
          dur: 0.16,
          vol: 0.10,
          filterType: 'lowpass',
          attack: 0.012
        });
      }
    },

    dieBoss: {
      minGap: 400,
      fn: () => {
        tone({
          f0: 150,
          f1: 34,
          dur: 0.60,
          vol: 0.40,
          attack: 0.02
        });

        tone({
          f0: 300,
          f1: 90,
          dur: 0.45,
          vol: 0.18,
          type: 'triangle',
          delay: 0.05,
          attack: 0.02
        });

        noise({
          f0: 1000,
          f1: 160,
          dur: 0.50,
          vol: 0.20,
          filterType: 'lowpass',
          attack: 0.02
        });

        chime(
          220,
          330,
          0.25,
          0.12,
          0.15,
          'sine'
        );
      }
    },

    hurt: {
      minGap: 120,
      fn: () => {
        tone({
          f0: 220,
          f1: 90,
          dur: 0.20,
          vol: 0.22,
          attack: 0.012,
          type: 'triangle'
        });

        tone({
          f0: 110,
          f1: 60,
          dur: 0.18,
          vol: 0.10,
          type: 'sine',
          delay: 0.02
        });

        noise({
          f0: 900,
          f1: 250,
          dur: 0.14,
          vol: 0.10,
          filterType: 'lowpass',
          attack: 0.012
        });
      }
    },

    gem: {
      minGap: 90,
      fn: () => {
        chime(
          950,
          1560,
          0.10,
          0.16,
          0,
          'sine'
        );

        chime(
          1425,
          1900,
          0.12,
          0.10,
          0.06,
          'sine'
        );

        chime(
          1900,
          2400,
          0.12,
          0.06,
          0.12,
          'sine'
        );
      }
    },

    levelup: {
      minGap: 300,
      fn: () => {
        chime(440, 440, 0.18, 0.26, 0, 'sine');
        chime(660, 660, 0.18, 0.26, 0.10, 'sine');
        chime(880, 880, 0.24, 0.28, 0.20, 'sine');
        chime(1100, 1100, 0.30, 0.16, 0.30, 'sine');
      }
    },

    select: {
      minGap: 40,
      fn: () =>
        tone({
          f0: 660,
          f1: 880,
          dur: 0.06,
          vol: 0.14,
          attack: 0.010,
          type: 'triangle'
        })
    },

    magnet: {
      minGap: 800,
      fn: () => {
        tone({
          f0: 330,
          f1: 990,
          dur: 0.28,
          vol: 0.22,
          attack: 0.015
        });

        tone({
          f0: 165,
          f1: 495,
          dur: 0.30,
          vol: 0.14,
          delay: 0.06,
          type: 'triangle'
        });

        noise({
          f0: 2200,
          f1: 400,
          dur: 0.28,
          vol: 0.07,
          filterType: 'lowpass',
          attack: 0.015
        });
      }
    },

    bossWarn: {
      minGap: 8000,
      fn: () => {
        tone({
          f0: 92,
          f1: 62,
          dur: 0.55,
          vol: 0.34,
          attack: 0.03
        });

        tone({
          f0: 70,
          f1: 48,
          dur: 0.55,
          vol: 0.30,
          delay: 0.35,
          attack: 0.03
        });

        tone({
          f0: 55,
          f1: 40,
          dur: 0.80,
          vol: 0.16,
          type: 'triangle',
          delay: 0.12,
          attack: 0.04
        });
      }
    },

    eliteWarn: {
      minGap: 5000,
      fn: () => {
        tone({
          f0: 220,
          f1: 160,
          dur: 0.22,
          vol: 0.20,
          attack: 0.012
        });

        chime(
          330,
          240,
          0.20,
          0.14,
          0.18,
          'sine'
        );
      }
    },

    storm: {
      minGap: 1500,
      fn: () => {
        noise({
          f0: 500,
          f1: 180,
          dur: 1.2,
          vol: 0.09,
          filterType: 'lowpass'
        });

        tone({
          f0: 200,
          f1: 140,
          dur: 0.7,
          vol: 0.10,
          attack: 0.05,
          type: 'triangle'
        });
      }
    },

    gust: {
      minGap: 700,
      fn: () => {
        noise({
          f0: 900,
          f1: 300,
          dur: 0.5,
          vol: 0.05,
          filterType: 'lowpass'
        });
      }
    },

    recipe: {
      minGap: 600,
      fn: () => {
        chime(
          523,
          784,
          0.22,
          0.22,
          0,
          'sine'
        );

        chime(
          659,
          1046,
          0.24,
          0.18,
          0.10,
          'sine'
        );
      }
    },

    portal: {
      minGap: 600,
      fn: () => {
        chime(
          392,
          523,
          0.30,
          0.20,
          0,
          'sine'
        );

        chime(
          523,
          659,
          0.30,
          0.16,
          0.15,
          'sine'
        );

        noise({
          f0: 3000,
          f1: 900,
          dur: 0.5,
          vol: 0.04,
          filterType: 'lowpass',
          delay: 0.2
        });
      }
    },

    gameover: {
      minGap: 500,
      fn: () => {
        chime(440, 440, 0.28, 0.26, 0, 'sine');
        chime(330, 330, 0.28, 0.26, 0.25, 'sine');
        chime(247, 247, 0.50, 0.28, 0.50, 'sine');

        tone({
          f0: 110,
          f1: 55,
          dur: 1.10,
          vol: 0.16,
          delay: 0.15,
          attack: 0.02
        });
      }
    },

    start: {
      minGap: 300,
      fn: () => {
        chime(523, 523, 0.14, 0.24, 0, 'sine');
        chime(659, 659, 0.14, 0.24, 0.10, 'sine');
        chime(784, 784, 0.30, 0.26, 0.20, 'sine');

        noise({
          f0: 4000,
          f1: 1800,
          dur: 0.14,
          vol: 0.04,
          filterType: 'lowpass',
          delay: 0.22
        });
      }
    },

    pause: {
      minGap: 100,
      fn: () =>
        tone({
          f0: 520,
          f1: 380,
          dur: 0.16,
          vol: 0.20,
          attack: 0.012
        })
    },

    unpause: {
      minGap: 100,
      fn: () =>
        tone({
          f0: 440,
          f1: 660,
          dur: 0.16,
          vol: 0.20,
          attack: 0.012
        })
    }
  };

  // ============================================================
  // REWRITTEN DYNAMIC MUSIC SYSTEM
  // ============================================================
  //
  // Musical goals:
  //
  // 1. Recognisable 8-bar themes
  // 2. A/B/A'/ending structure
  // 3. Rests and rhythmic space
  // 4. Distinct musical identity per biome
  // 5. Stable tempo
  // 6. Intensity expressed mainly through layers
  // 7. Different lead timbres
  //
  // ============================================================

  const SCALES = {

    minor: [
      0, 2, 3, 5, 7, 8, 10,
      12, 14, 15, 17, 19, 20, 22, 24
    ],

    major: [
      0, 2, 4, 5, 7, 9, 11,
      12, 14, 16, 17, 19, 21, 23, 24
    ],

    phrygian: [
      0, 1, 3, 5, 7, 8, 10,
      12, 13, 15, 17, 19, 20, 22, 24
    ],

    dorian: [
      0, 2, 3, 5, 7, 9, 10,
      12, 14, 15, 17, 19, 21, 22, 24
    ],

    harmonicminor: [
      0, 2, 3, 5, 7, 8, 11,
      12, 14, 15, 17, 19, 20, 23, 24
    ]

  };

  const sTone = (root, semi) =>
    root * Math.pow(2, semi / 12);

  // Melody event:
  //
  // step = sixteenth-note position
  // len  = duration in sixteenth notes
  // note = scale degree
  // accent = relative emphasis
  //
  const M = (
    step,
    note,
    len = 1,
    accent = 1
  ) => ({
    step,
    note,
    len,
    accent
  });

  // ============================================================
  // BIOME SONG DEFINITIONS
  // ============================================================

  const BIOME_SONGS = {

    // ----------------------------------------------------------
    // CORE / RUINS
    // Dark mysterious bell melody.
    // ----------------------------------------------------------

    core: {
      id: 'core',
      name: 'Ruins',

      root: 110,
      scale: SCALES.minor,

      bpm: 82,

      chords: [
        0, 0, 8, 5,
        10, 0, 8, 11
      ],

      chordQualities: [
        'minor7',
        'minor7',
        'major',
        'major',
        'minor',
        'minor',
        'minor7',
        'dominant'
      ],

      melodyType: 'bell',
      padType: 'sine',
      bassType: 'triangle',

      melody: [

        // Bar 1 — domanda, ingresso deciso, primo salto verso l'alto
        [
          M(0, 7, 3, 1.2),
          M(4, 9, 2),
          M(7, 10, 3, 1.1),
          M(12, 12, 2, 1.3)
        ],

        // Bar 2 — la domanda sale, picco di tensione, resta sospesa
        [
          M(0, 10, 2),
          M(3, 12, 2, 1.1),
          M(6, 14, 3, 1.3),
          M(11, 10, 2)
        ],

        // Bar 3 — risposta: discesa per gradi con nota di passaggio
        [
          M(0, 9, 2),
          M(2, 7, 1),
          M(4, 5, 2),
          M(8, 4, 2, 1.1),
          M(12, 5, 2)
        ],

        // Bar 4 — cadenza, si posa quasi sulla tonica
        [
          M(0, 7, 2),
          M(4, 5, 1),
          M(6, 4, 1),
          M(8, 2, 2),
          M(12, 2, 4, 1.2)
        ],

        // Bar 5 — nuova sotto-frase, sparsa e sospesa (respiro)
        [
          M(0, 4, 2),
          M(6, 5, 1),
          M(8, 7, 3, 1.1),
          M(13, 9, 2)
        ],

        // Bar 6 — riprende slancio verso il secondo climax
        [
          M(0, 7, 2),
          M(3, 9, 1),
          M(4, 10, 2, 1.1),
          M(9, 12, 2),
          M(13, 10, 2)
        ],

        // Bar 7 — salita finale
        [
          M(0, 9, 2, 1.1),
          M(4, 11, 2),
          M(8, 12, 2, 1.2),
          M(12, 14, 3, 1.3)
        ],

        // Bar 8 — climax assoluto del brano, poi discesa che richiude il loop
        [
          M(0, 14, 3, 1.4),
          M(4, 12, 2),
          M(8, 9, 2),
          M(12, 7, 4, 1.2)
        ]

      ],

      perc: {
        kick: [0, 8],
        snare: [12],
        hat: [2, 6, 10, 14]
      }

    },

    // ----------------------------------------------------------
    // FROZEN GRASS
    // Sparse crystalline melody.
    // ----------------------------------------------------------

    north: {
      id: 'north',
      name: 'Frozen Grass',

      root: 146.83,
      scale: SCALES.minor,

      bpm: 72,

      melodyType: 'glass',
      padType: 'sine',
      bassType: 'sine',

      chords: [
        0, 0, 8, 5,
        10, 0, 8, 10
      ],

      melody: [

        // Bar 1 — domanda, sale verso una tensione sospesa
        [
          M(0, 7, 3),
          M(5, 9, 2),
          M(9, 10, 3),
          M(14, 12, 1)
        ],

        // Bar 2 — la tensione continua a salire, poi si allenta
        [
          M(0, 10, 3),
          M(5, 12, 2),
          M(9, 9, 3),
          M(14, 7, 1)
        ],

        // Bar 3 — risposta, discesa per gradi
        [
          M(0, 9, 2),
          M(4, 7, 2),
          M(8, 5, 2),
          M(12, 4, 3)
        ],

        // Bar 4 — cadenza verso una nota più stabile
        [
          M(0, 5, 3),
          M(5, 4, 2),
          M(9, 3, 2),
          M(13, 2, 2)
        ],

        // Bar 5 — sotto-frase sparsa, respiro
        [
          M(0, 4, 4),
          M(8, 5, 3),
          M(13, 7, 2)
        ],

        // Bar 6 — nuovo slancio verso il climax
        [
          M(0, 9, 3),
          M(5, 10, 2),
          M(9, 12, 2),
          M(13, 10, 2)
        ],

        // Bar 7 — climax cristallino
        [
          M(0, 12, 3),
          M(5, 14, 2),
          M(9, 10, 3)
        ],

        // Bar 8 — discesa finale che richiude il loop
        [
          M(0, 9, 3),
          M(5, 7, 2),
          M(9, 5, 2),
          M(13, 3, 3)
        ]

      ],

      perc: {
        kick: [0, 8],
        snare: [],
        hat: [4, 12]
      }

    },

    // ----------------------------------------------------------
    // TAIGA
    // Fast plucked woodland motif.
    // ----------------------------------------------------------

    northeast: {
      id: 'northeast',
      name: 'Taiga',

      root: 164.81,
      scale: SCALES.dorian,

      bpm: 84,

      melodyType: 'pluck',
      padType: 'triangle',
      bassType: 'triangle',

      chords: [
        0, 0, 3, 10,
        5, 8, 10, 0
      ],

      melody: [

        // Bar 1 — motivo plucked, apertura
        [
          M(0, 4, 1),
          M(2, 4, 1),
          M(4, 7, 2),
          M(8, 9, 1),
          M(10, 7, 1),
          M(12, 4, 2)
        ],

        // Bar 2 — sale un po' più in alto
        [
          M(0, 4, 1),
          M(2, 4, 1),
          M(4, 7, 2),
          M(8, 12, 1),
          M(10, 9, 1),
          M(12, 7, 2)
        ],

        // Bar 3 — continua a salire invece di richiudersi subito
        [
          M(0, 2, 2),
          M(4, 4, 1),
          M(6, 7, 1),
          M(8, 9, 2),
          M(12, 11, 2)
        ],

        // Bar 4 — discende dal nuovo picco
        [
          M(0, 12, 1),
          M(2, 9, 1),
          M(4, 7, 2),
          M(8, 4, 2),
          M(12, 2, 2)
        ],

        // Bar 5 — anticipa il climax
        [
          M(0, 5, 2),
          M(4, 7, 2),
          M(8, 9, 2),
          M(12, 14, 2)
        ],

        // Bar 6 — ridiscende brevemente
        [
          M(0, 12, 1),
          M(2, 9, 1),
          M(4, 7, 2),
          M(8, 5, 2),
          M(12, 4, 2)
        ],

        // Bar 7 — climax vero e proprio
        [
          M(0, 4, 1),
          M(2, 7, 1),
          M(4, 9, 2),
          M(8, 12, 2),
          M(12, 14, 2)
        ],

        // Bar 8 — risoluzione discendente
        [
          M(0, 12, 2),
          M(4, 9, 2),
          M(8, 7, 2),
          M(12, 4, 4)
        ]

      ],

      perc: {
        kick: [0, 8],
        snare: [4, 12],
        hat: [2, 6, 10, 14]
      }

    },

    // ----------------------------------------------------------
    // SAVANNA
    // Bright major marimba theme.
    // ----------------------------------------------------------

    east: {
      id: 'east',
      name: 'Savanna',

      root: 220,
      scale: SCALES.major,

      bpm: 96,

      melodyType: 'marimba',
      padType: 'triangle',
      bassType: 'triangle',

      chords: [
        0, 5, 7, 0,
        9, 5, 0, 7
      ],

      melody: [

        // Bar 1 — tema marimba, apertura luminosa
        [
          M(0, 0, 1, 1.2),
          M(2, 2, 1),
          M(4, 4, 2, 1.1),
          M(8, 7, 1),
          M(10, 4, 1),
          M(12, 2, 2)
        ],

        // Bar 2 — variazione, sale un poco
        [
          M(0, 0, 1),
          M(2, 2, 1),
          M(4, 4, 2),
          M(8, 9, 1, 1.1),
          M(10, 7, 1),
          M(12, 4, 2)
        ],

        // Bar 3 — continua a salire invece di richiudere subito
        [
          M(0, 4, 1),
          M(2, 5, 1),
          M(4, 7, 2, 1.2),
          M(8, 9, 1),
          M(10, 11, 1),
          M(12, 9, 2)
        ],

        // Bar 4 — risposta, discende verso la tonica
        [
          M(0, 9, 2),
          M(4, 7, 2),
          M(8, 4, 2),
          M(12, 2, 3)
        ],

        // Bar 5 — nuovo slancio, più ampio del primo
        [
          M(0, 2, 1),
          M(2, 4, 1),
          M(4, 7, 2),
          M(8, 9, 2),
          M(12, 11, 2)
        ],

        // Bar 6 — sale ancora, preparando il climax
        [
          M(0, 9, 1),
          M(2, 7, 1),
          M(4, 9, 2),
          M(8, 11, 2),
          M(12, 12, 2)
        ],

        // Bar 7 — rincorsa finale
        [
          M(0, 7, 1),
          M(2, 9, 1),
          M(4, 11, 2),
          M(8, 12, 2),
          M(12, 14, 2)
        ],

        // Bar 8 — climax e risoluzione
        [
          M(0, 14, 2),
          M(4, 9, 2),
          M(8, 7, 2),
          M(12, 4, 4)
        ]

      ],

      perc: {
        kick: [0, 8],
        snare: [12],
        hat: [3, 7, 11, 15]
      }

    },

    // ----------------------------------------------------------
    // CANYON
    // Slow cinematic flute phrase.
    // ----------------------------------------------------------

    southeast: {
      id: 'southeast',
      name: 'Canyon',

      root: 110,
      scale: SCALES.minor,

      bpm: 78,

      melodyType: 'flute',
      padType: 'sine',
      bassType: 'triangle',

      chords: [
        0, 0, 8, 10,
        0, 8, 10, 0
      ],

      melody: [

        // Bar 1 — frase lenta di apertura
        [
          M(0, 0, 3),
          M(5, 3, 1),
          M(8, 5, 3),
          M(13, 3, 2)
        ],

        // Bar 2 — ripete e sale un poco
        [
          M(0, 0, 3),
          M(5, 3, 1),
          M(8, 7, 3),
          M(13, 5, 2)
        ],

        // Bar 3 — continua a salire
        [
          M(0, 5, 2),
          M(4, 7, 2),
          M(8, 10, 3),
          M(13, 8, 2)
        ],

        // Bar 4 — primo picco, poi respiro
        [
          M(0, 12, 2),
          M(4, 10, 2),
          M(8, 8, 3),
          M(13, 7, 2)
        ],

        // Bar 5 — sotto-frase più intima
        [
          M(0, 3, 3),
          M(5, 5, 2),
          M(9, 8, 3)
        ],

        // Bar 6 — rincorsa verso il climax
        [
          M(0, 5, 2),
          M(4, 8, 2),
          M(8, 10, 2),
          M(12, 12, 3)
        ],

        // Bar 7 — climax cinematico
        [
          M(0, 14, 2),
          M(4, 10, 2),
          M(8, 7, 3),
          M(13, 5, 2)
        ],

        // Bar 8 — chiusura che richiude il loop
        [
          M(0, 3, 3),
          M(5, 5, 2),
          M(9, 3, 2),
          M(13, 0, 3)
        ]

      ],

      perc: {
        kick: [0, 8],
        snare: [12],
        hat: [4, 12]
      }

    },

    // ----------------------------------------------------------
    // DESERT
    // Phrygian reed melody.
    // ----------------------------------------------------------

    south: {
      id: 'south',
      name: 'Desert',

      root: 146.83,
      scale: SCALES.phrygian,

      bpm: 88,

      melodyType: 'reed',
      padType: 'sine',
      bassType: 'sine',

      chords: [
        0, 0, 8, 10,
        0, 8, 10, 0
      ],

      melody: [

        // Bar 1 — motivo frigio con la seconda minore caratteristica
        [
          M(0, 0, 2),
          M(3, 1, 1),
          M(4, 3, 2),
          M(8, 5, 2),
          M(12, 3, 2)
        ],

        // Bar 2 — ripete e sale un poco
        [
          M(0, 0, 2),
          M(3, 1, 1),
          M(4, 3, 2),
          M(8, 7, 2),
          M(12, 5, 2)
        ],

        // Bar 3 — continua a salire
        [
          M(0, 3, 1),
          M(2, 5, 1),
          M(4, 7, 2),
          M(8, 10, 1),
          M(10, 8, 1),
          M(12, 7, 2)
        ],

        // Bar 4 — tensione più alta
        [
          M(0, 12, 2),
          M(4, 10, 2),
          M(8, 8, 2),
          M(12, 7, 2)
        ],

        // Bar 5 — sotto-frase, sale ancora
        [
          M(0, 1, 2),
          M(4, 3, 2),
          M(8, 5, 2),
          M(12, 8, 2)
        ],

        // Bar 6 — rincorsa verso il climax
        [
          M(0, 5, 1),
          M(2, 7, 1),
          M(4, 10, 2),
          M(8, 8, 2),
          M(12, 7, 2)
        ],

        // Bar 7 — climax, poi discesa
        [
          M(0, 14, 2),
          M(4, 10, 2),
          M(8, 8, 2),
          M(12, 5, 2)
        ],

        // Bar 8 — cadenza con la seconda minore che richiude il loop
        [
          M(0, 1, 2),
          M(4, 3, 2),
          M(8, 1, 2),
          M(12, 0, 4)
        ]

      ],

      perc: {
        kick: [0, 6, 8, 14],
        snare: [8],
        hat: [2, 10, 14]
      }

    },

    // ----------------------------------------------------------
    // PRAIRIE
    // Gentle open Dorian melody.
    // ----------------------------------------------------------

    southwest: {
      id: 'southwest',
      name: 'Prairie',

      root: 196,
      scale: SCALES.dorian,

      bpm: 80,

      melodyType: 'soft',
      padType: 'sine',
      bassType: 'sine',

      chords: [
        0, 3, 10, 5,
        0, 3, 10, 5
      ],

      melody: [

        // Bar 1 — salita gentile
        [
          M(0, 0, 2),
          M(4, 3, 2),
          M(8, 5, 2),
          M(12, 7, 2)
        ],

        // Bar 2 — risposta discendente
        [
          M(0, 7, 2),
          M(4, 5, 2),
          M(8, 3, 2),
          M(12, 2, 2)
        ],

        // Bar 3 — nuova salita, un grado più in alto
        [
          M(0, 3, 2),
          M(4, 5, 2),
          M(8, 7, 2),
          M(12, 9, 2)
        ],

        // Bar 4 — prosegue invece di rispecchiare la bar 2
        [
          M(0, 9, 2),
          M(4, 7, 2),
          M(8, 5, 2),
          M(12, 3, 3)
        ],

        // Bar 5 — variazione della bar 1, non identica
        [
          M(0, 2, 2),
          M(4, 5, 2),
          M(8, 7, 2),
          M(12, 9, 2)
        ],

        // Bar 6 — piccolo picco, il momento più alto del brano
        [
          M(0, 11, 2),
          M(4, 9, 2),
          M(8, 7, 2),
          M(12, 5, 2)
        ],

        // Bar 7 — si riavvicina alla frase iniziale
        [
          M(0, 2, 2),
          M(4, 3, 2),
          M(8, 5, 2),
          M(12, 7, 2)
        ],

        // Bar 8 — cadenza finale
        [
          M(0, 5, 2),
          M(4, 3, 2),
          M(8, 2, 2),
          M(12, 0, 4)
        ]

      ],

      perc: {
        kick: [0, 8],
        snare: [8],
        hat: [3, 11]
      }

    },

    // ----------------------------------------------------------
    // FOREST
    // Haunting harmonic-minor choir.
    // ----------------------------------------------------------

    west: {
      id: 'west',
      name: 'Forest',

      root: 110,
      scale: SCALES.harmonicminor,

      bpm: 74,

      melodyType: 'choir',
      padType: 'sine',
      bassType: 'triangle',

      chords: [
        0, 8, 10, 7,
        0, 8, 10, 7
      ],

      melody: [

        // Bar 1 — frase corale di apertura
        [
          M(0, 7, 3),
          M(5, 8, 1),
          M(8, 10, 3),
          M(13, 8, 2)
        ],

        // Bar 2 — sale un poco di più
        [
          M(0, 7, 3),
          M(5, 8, 1),
          M(8, 12, 3),
          M(13, 10, 2)
        ],

        // Bar 3 — prima tensione, senza toccare ancora il vero climax
        [
          M(0, 10, 2),
          M(4, 12, 2),
          M(8, 12, 3),
          M(13, 10, 2)
        ],

        // Bar 4 — respiro, discesa
        [
          M(0, 10, 2),
          M(4, 8, 2),
          M(8, 7, 3),
          M(13, 5, 2)
        ],

        // Bar 5 — riprende la frase corale
        [
          M(0, 7, 3),
          M(5, 8, 1),
          M(8, 10, 3),
          M(13, 12, 2)
        ],

        // Bar 6 — seconda tensione, ancora sotto il picco assoluto
        [
          M(0, 10, 2),
          M(4, 12, 2),
          M(8, 10, 3),
          M(13, 8, 2)
        ],

        // Bar 7 — rincorsa finale
        [
          M(0, 7, 2),
          M(4, 10, 2),
          M(8, 12, 2),
          M(12, 14, 2)
        ],

        // Bar 8 — unico vero climax del brano, poi risoluzione
        [
          M(0, 12, 2),
          M(4, 10, 2),
          M(8, 8, 2),
          M(12, 7, 4)
        ]

      ],

      perc: {
        kick: [0, 8],
        snare: [8],
        hat: [4, 12]
      }

    },

    // ----------------------------------------------------------
    // SWAMP
    // Slow, whispery and slightly unsettling.
    // ----------------------------------------------------------

    northwest: {
      id: 'northwest',
      name: 'Swamp',

      root: 123.47,
      scale: SCALES.minor,

      bpm: 68,

      melodyType: 'whisper',
      padType: 'sine',
      bassType: 'sine',

      chords: [
        0, 0, 8, 5,
        0, 8, 5, 0
      ],

      melody: [

        // Bar 1 — motivo minimale, quasi immobile
        [
          M(0, 0, 2),
          M(4, 2, 1),
          M(6, 3, 2),
          M(12, 2, 2)
        ],

        // Bar 2 — variazione leggerissima
        [
          M(0, 0, 2),
          M(4, 2, 1),
          M(6, 5, 2),
          M(12, 3, 2)
        ],

        // Bar 3 — inizia a salire
        [
          M(0, 3, 2),
          M(4, 5, 1),
          M(6, 7, 2),
          M(12, 8, 2)
        ],

        // Bar 4 — salto inatteso, il primo momento inquietante
        [
          M(0, 10, 2),
          M(4, 7, 1),
          M(6, 5, 2),
          M(12, 3, 2)
        ],

        // Bar 5 — torna alla calma iniziale
        [
          M(0, 0, 2),
          M(4, 2, 1),
          M(6, 3, 2),
          M(12, 5, 2)
        ],

        // Bar 6 — sale verso il momento più teso del brano
        [
          M(0, 5, 2),
          M(4, 8, 1),
          M(6, 10, 2),
          M(12, 8, 2)
        ],

        // Bar 7 — eco del salto inquietante
        [
          M(0, 10, 2),
          M(4, 7, 1),
          M(6, 5, 2),
          M(12, 3, 2)
        ],

        // Bar 8 — si dissolve verso la tonica
        [
          M(0, 3, 2),
          M(4, 2, 1),
          M(8, 0, 4)
        ]

      ],

      perc: {
        kick: [0, 8],
        snare: [4, 12],
        hat: [2, 10]
      }

    }
  };

  // ============================================================
  // MUSIC SYNTH HELPERS
  // ============================================================

  function mTone(
    f0,
    t0,
    dur,
    vol,
    type = 'sine',
    attack = 0.04,
    release = 0.12
  ) {
    if (!ctx || dur <= 0 || vol <= 0) return;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = type;

    osc.frequency.setValueAtTime(
      Math.max(1, f0),
      t0
    );

    g.gain.setValueAtTime(
      0.0001,
      t0
    );

    g.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, vol),
      t0 + Math.min(
        attack,
        dur * 0.35
      )
    );

    g.gain.setValueAtTime(
      Math.max(0.0001, vol),
      Math.max(
        t0 + dur - release,
        t0 + attack
      )
    );

    g.gain.exponentialRampToValueAtTime(
      0.0001,
      t0 + dur
    );

    osc.connect(g);
    g.connect(musicGain);

    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // ============================================================
  // LEAD INSTRUMENTS
  // ============================================================

  function mLead(
    f0,
    t0,
    dur,
    vol,
    instrument = 'sine',
    accent = 1
  ) {

    const types = {

      bell: 'sine',

      glass: 'sine',

      pluck: 'triangle',

      marimba: 'triangle',

      flute: 'sine',

      reed: 'triangle',

      soft: 'sine',

      choir: 'sine',

      whisper: 'triangle'
    };

    const type =
      types[instrument] || 'sine';

    const attack =
      instrument === 'pluck' ||
      instrument === 'marimba'
        ? 0.008
        : 0.035;

    const release =
      instrument === 'bell' ||
      instrument === 'glass'
        ? 0.30
        : 0.12;

    mTone(
      f0,
      t0,
      dur,
      vol * accent,
      type,
      attack,
      release
    );

    // Crystalline shimmer.
    if (
      instrument === 'bell' ||
      instrument === 'glass'
    ) {
      mTone(
        f0 * 2,
        t0 + 0.015,
        Math.min(dur, 0.42),
        vol * accent * 0.18,
        'sine',
        0.01,
        0.22
      );
    }

    // Slight detuning for choir.
    if (instrument === 'choir') {
      mTone(
        f0 * 0.997,
        t0 + 0.025,
        dur * 0.92,
        vol * 0.18,
        'sine',
        0.06,
        0.18
      );
    }

    // Whisper gets a quiet lower octave.
    if (instrument === 'whisper') {
      mTone(
        f0 * 0.5,
        t0,
        Math.min(dur, 0.25),
        vol * 0.08,
        'sine',
        0.03,
        0.12
      );
    }
  }

  // ============================================================
  // PERCUSSION
  // ============================================================

  function mKick(t0, vol) {
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = 'sine';

    osc.frequency.setValueAtTime(
      145,
      t0
    );

    osc.frequency.exponentialRampToValueAtTime(
      42,
      t0 + 0.13
    );

    g.gain.setValueAtTime(
      0.0001,
      t0
    );

    g.gain.exponentialRampToValueAtTime(
      vol,
      t0 + 0.008
    );

    g.gain.exponentialRampToValueAtTime(
      0.0001,
      t0 + 0.20
    );

    osc.connect(g);
    g.connect(musicGain);

    osc.start(t0);
    osc.stop(t0 + 0.24);
  }

  function mHat(t0, vol) {
    if (!ctx || !noiseBuf) return;

    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();

    src.buffer = noiseBuf;

    filter.type = 'highpass';
    filter.frequency.value = 6500;

    g.gain.setValueAtTime(
      0.0001,
      t0
    );

    g.gain.exponentialRampToValueAtTime(
      vol,
      t0 + 0.003
    );

    g.gain.exponentialRampToValueAtTime(
      0.0001,
      t0 + 0.055
    );

    src.connect(filter);
    filter.connect(g);
    g.connect(musicGain);

    src.start(t0);
    src.stop(t0 + 0.08);
  }

  function mSnare(t0, vol) {
    if (!ctx || !noiseBuf) return;

    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();

    src.buffer = noiseBuf;

    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 0.7;

    g.gain.setValueAtTime(
      0.0001,
      t0
    );

    g.gain.exponentialRampToValueAtTime(
      vol,
      t0 + 0.004
    );

    g.gain.exponentialRampToValueAtTime(
      0.0001,
      t0 + 0.12
    );

    src.connect(filter);
    filter.connect(g);
    g.connect(musicGain);

    src.start(t0);
    src.stop(t0 + 0.14);
  }

  // ============================================================
  // HARMONY
  // ============================================================

  function chordFrequencies(
    song,
    chordIndex
  ) {
    const degree =
      song.chords[
        chordIndex % song.chords.length
      ];

    const root =
      sTone(
        song.root,
        song.scale[degree] || degree
      );

    const quality =
      song.chordQualities &&
      song.chordQualities[
        chordIndex % song.chordQualities.length
      ];

    const third =
      sTone(
        root,
        quality === 'major' ||
        quality === 'dominant'
          ? 4
          : 3
      );

    const fifth =
      sTone(
        root,
        7
      );

    const seventh =
      sTone(
        root,
        song.chordQualities &&
        song.chordQualities[
          chordIndex % song.chordQualities.length
        ] === 'dominant'
          ? 10
          : 10
      );

    return {
      root,
      third,
      fifth,
      seventh
    };
  }

  function mPad(
    song,
    chordIndex,
    t0,
    dur,
    vol
  ) {
    if (!ctx) return;

    const chord =
      chordFrequencies(song, chordIndex);

    const frequencies = [
      chord.root,
      chord.third,
      chord.fifth,
      chord.seventh
    ];

    frequencies.forEach((f, i) => {
      mTone(
        f,
        t0,
        dur,
        vol * (i === 0 ? 0.55 : 0.30),
        song.padType || 'sine',
        0.20,
        0.35
      );
    });
  }

  function mBass(
    song,
    chordIndex,
    t0,
    dur,
    vol
  ) {
    if (!ctx) return;

    const degree =
      song.chords[
        chordIndex % song.chords.length
      ];

    const f =
      sTone(
        song.root * 0.5,
        song.scale[degree] || degree
      );

    mTone(
      f,
      t0,
      dur,
      vol,
      song.bassType || 'triangle',
      0.025,
      0.16
    );
  }

  // ============================================================
  // MUSIC STATE
  // ============================================================

  let musicEnabled = true;
  let musicIntensity = 0;
  let currentSongId = null;
  let currentSong = null;

  let musicTimer = null;
  let musicNextTime = 0;

  let musicBar = 0;
  let musicPhrase = 0;
  let musicBeat = 0;

  let musicIntensityTarget = 0;
  let musicIntensitySmooth = 0;

  const MUSIC_LOOKAHEAD = 0.20;
  const MUSIC_SCHEDULE_INTERVAL = 80;

  // ============================================================
  // MUSIC UTILITY FUNCTIONS
  // ============================================================

  function musicStepDuration(song) {
    return 60 / song.bpm / 4;
  }

  function musicBarDuration(song) {
    return musicStepDuration(song) * 16;
  }

  function musicPhraseDuration(song) {
    return musicBarDuration(song) * 8;
  }

  function getMusicSong(id) {
    return BIOME_SONGS[id] ||
      BIOME_SONGS.core;
  }

  function setMusicIntensity(value) {
    musicIntensityTarget =
      Math.max(
        0,
        Math.min(1, value || 0)
      );
  }

  function updateMusicIntensity() {
    musicIntensitySmooth +=
      (
        musicIntensityTarget -
        musicIntensitySmooth
      ) * 0.035;
  }

  // ============================================================
  // MELODY SCHEDULING
  // ============================================================

  function scheduleMelodyBar(
    song,
    barIndex,
    startTime,
    intensity
  ) {
    if (!song || !song.melody) return;

    const phraseIndex =
      Math.floor(barIndex / 8) % 2;

    const bar =
      song.melody[
        barIndex % song.melody.length
      ];

    if (!bar) return;

    const stepDur =
      musicStepDuration(song);

    const leadVolume =
      0.075 +
      intensity * 0.045;

    bar.forEach(note => {
      if (!note) return;

      const degree =
        song.scale[
          note.note % song.scale.length
        ];

      const octave =
        Math.floor(
          note.note / song.scale.length
        );

      const frequency =
        sTone(
          song.root * 2,
          degree + octave * 12
        );

      const noteStart =
        startTime +
        note.step * stepDur;

      const noteDuration =
        Math.max(
          0.04,
          note.len * stepDur * 0.92
        );

      mLead(
        frequency,
        noteStart,
        noteDuration,
        leadVolume,
        song.melodyType,
        note.accent || 1
      );
    });
  }

  // ============================================================
  // RHYTHM SCHEDULING
  // ============================================================

  function schedulePercussionBar(
    song,
    barIndex,
    startTime,
    intensity
  ) {
    if (!song || !song.perc) return;

    const stepDur =
      musicStepDuration(song);

    const kickVolume =
      0.035 +
      intensity * 0.035;

    const snareVolume =
      0.025 +
      intensity * 0.025;

    const hatVolume =
      0.012 +
      intensity * 0.015;

    const perc = song.perc;

    (perc.kick || []).forEach(step => {
      mKick(
        startTime + step * stepDur,
        kickVolume
      );
    });

    (perc.snare || []).forEach(step => {
      mSnare(
        startTime + step * stepDur,
        snareVolume
      );
    });

    (perc.hat || []).forEach(step => {
      mHat(
        startTime + step * stepDur,
        hatVolume
      );
    });

    // Additional rhythm layer at higher intensity.
    if (intensity > 0.55) {
      [4, 12].forEach(step => {
        mKick(
          startTime + step * stepDur,
          kickVolume * 0.38
        );
      });
    }
  }

  // ============================================================
  // FULL BAR SCHEDULING
  // ============================================================

  function scheduleMusicBar(
    song,
    barIndex,
    startTime
  ) {
    if (!song || !ctx) return;

    updateMusicIntensity();

    const intensity =
      musicIntensitySmooth;

    const barDur =
      musicBarDuration(song);

    const chordIndex =
      barIndex % 8;

    // Harmony.
    mPad(
      song,
      chordIndex,
      startTime,
      barDur * 0.98,
      0.025 + intensity * 0.018
    );

    // Bass becomes more present during combat.
    if (
      intensity > 0.12 ||
      barIndex % 2 === 0
    ) {
      mBass(
        song,
        chordIndex,
        startTime,
        barDur * 0.72,
        0.035 + intensity * 0.035
      );
    }

    // Main melody.
    scheduleMelodyBar(
      song,
      barIndex,
      startTime,
      intensity
    );

    // Percussion layer.
    if (intensity > 0.18) {
      schedulePercussionBar(
        song,
        barIndex,
        startTime,
        intensity
      );
    }

    // Atmospheric accent at the end of each phrase.
    if (
      barIndex % 8 === 7 &&
      intensity < 0.65
    ) {
      mTone(
        song.root * 2,
        startTime + barDur * 0.72,
        barDur * 0.24,
        0.018,
        song.padType || 'sine',
        0.12,
        0.28
      );
    }
  }

  // ============================================================
  // MUSIC SCHEDULER
  // ============================================================

  // Follow the player into a new biome and let nearby danger
  // gradually lift the intensity layers.
  function syncMusicState() {
    if (typeof playerBiome === 'function') {
      const bm = playerBiome();
      const song = getMusicSong(bm);

      if (song && song.id !== currentSong.id) {
        changeMusic(bm);
      }
    }

    if (typeof getIntensity === 'function') {
      setMusicIntensity(getIntensity());
    }
  }

  function musicScheduler() {
    if (!ctx || !musicEnabled) return;
    if (!currentSong) return;

    syncMusicState();

    const now =
      ctx.currentTime;

    while (
      musicNextTime <
      now + MUSIC_LOOKAHEAD
    ) {
      scheduleMusicBar(
        currentSong,
        musicBar,
        musicNextTime
      );

      musicNextTime +=
        musicBarDuration(currentSong);

      musicBar++;

      if (
        musicBar >=
        currentSong.melody.length
      ) {
        musicBar = 0;
      }
    }
  }

  function startMusicScheduler() {
    stopMusicScheduler();

    musicTimer =
      setInterval(
        musicScheduler,
        MUSIC_SCHEDULE_INTERVAL
      );

    musicScheduler();
  }

  function stopMusicScheduler() {
    if (musicTimer) {
      clearInterval(musicTimer);
      musicTimer = null;
    }
  }

  // ============================================================
  // START / CHANGE MUSIC
  // ============================================================

  function startMusic(songId = 'core') {
    init();

    if (!ctx) return;

    const song =
      getMusicSong(songId);

    currentSongId =
      song.id;

    currentSong =
      song;

    musicBar = 0;
    musicPhrase = 0;
    musicBeat = 0;

    musicNextTime =
      ctx.currentTime + 0.05;

    startMusicScheduler();
  }

  function changeMusic(songId) {
    if (!musicEnabled) return;

    const song =
      getMusicSong(songId);

    if (
      currentSong &&
      currentSong.id === song.id
    ) {
      return;
    }

    currentSongId =
      song.id;

    currentSong =
      song;

    musicBar = 0;
    musicPhrase = 0;
    musicBeat = 0;

    musicNextTime =
      ctx
        ? ctx.currentTime + 0.08
        : 0;
  }

  function stopMusic() {
    stopMusicScheduler();

    currentSongId = null;
    currentSong = null;

    musicBar = 0;
    musicPhrase = 0;
    musicBeat = 0;
  }

  function pauseMusic() {
    stopMusicScheduler();

    if (
      ctx &&
      ctx.state === 'running'
    ) {
      ctx.suspend();
    }
  }

  function resumeMusic() {
    if (!ctx) return;

    const resume =
      ctx.state === 'suspended'
        ? ctx.resume()
        : Promise.resolve();

    resume.then(() => {
      if (
        musicEnabled &&
        currentSong
      ) {
        musicNextTime =
          ctx.currentTime + 0.08;

        startMusicScheduler();
      }
    });
  }

  // ============================================================
  // PUBLIC MUSIC API
  // ============================================================

  window.ShadowMusic = {

    start: startMusic,

    stop: stopMusic,

    pause: pauseMusic,

    resume: resumeMusic,

    change: changeMusic,

    intensity: setMusicIntensity,

    enable() {
      musicEnabled = true;

      if (
        currentSong &&
        ctx
      ) {
        musicNextTime =
          ctx.currentTime + 0.08;

        startMusicScheduler();
      }
    },

    disable() {
      musicEnabled = false;
      stopMusicScheduler();
    },

    getState() {
      return {
        enabled: musicEnabled,
        songId: currentSongId,
        intensity: musicIntensitySmooth,
        targetIntensity: musicIntensityTarget,
        bar: musicBar
      };
    }

  };

  // ============================================================
  // GAME INTENSITY
  // ============================================================

  function getIntensity() {
    if (
      !game ||
      !game.running ||
      !game.player
    ) {
      return 0;
    }

    const px = game.player.x;
    const py = game.player.y;

    let count = 0;

    for (const e of game.enemies) {
      const dx = e.x - px;
      const dy = e.y - py;

      if (
        dx * dx + dy * dy <
        122500
      ) {
        count++;
      }
    }

    return Math.min(
      1,
      count / 30
    );
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  function play(
    name,
    opts
  ) {
    if (
      muted ||
      !name
    ) {
      return;
    }

    init();

    if (!ctx) {
      return;
    }

    if (
      ctx.state ===
      'suspended'
    ) {
      ctx.resume();
    }

    const def =
      SFX_DEFS[name];

    if (!def) {
      return;
    }

    const now =
      performance.now();

    if (
      lastPlay[name] &&
      now -
        lastPlay[name] <
        def.minGap
    ) {
      return;
    }

    // Global gate:
    // prevents huge SFX spam.
    if (
      now -
        lastAny <
        20
    ) {
      return;
    }

    lastAny = now;

    lastPlay[name] =
      now;

    def.fn(opts);
  }

  // ============================================================
  // MUTE
  // ============================================================

  function toggleMute() {
    muted = !muted;

    applyVolumes();

    return muted;
  }

  // ============================================================
  // MUSIC VOLUME
  // ============================================================

  function setMusicVolume(v) {
    musicVol =
      Math.max(
        0,
        Math.min(
          1,
          v
        )
      );

    localStorage.setItem(
      'shadow.volume.music',
      String(musicVol)
    );

    applyVolumes();
  }

  // ============================================================
  // SFX VOLUME
  // ============================================================

  function setSfxVolume(v) {
    sfxVol =
      Math.max(
        0,
        Math.min(
          1,
          v
        )
      );

    localStorage.setItem(
      'shadow.volume.sfx',
      String(sfxVol)
    );

    applyVolumes();
  }

  // Compatibility with older code.
  function setVolume(v) {
    setSfxVolume(v);
  }

  // ============================================================
  // RETURN PUBLIC API
  // ============================================================

  return {

    play,

    toggleMute,

    setVolume,

    startMusic,

    stopMusic,

    setSfxVolume,

    setMusicVolume,

    get sfxVolume() {
      return sfxVol;
    },

    get musicVolume() {
      return musicVol;
    },

    get muted() {
      return muted;
    }
  };

})();

// ============================================================
// M KEY TOGGLE
// ============================================================

document.addEventListener(
  'keydown',
  e => {

    if (
      e.code === 'KeyM'
    ) {

      Sound.toggleMute();

      e.preventDefault();
    }
  }
);