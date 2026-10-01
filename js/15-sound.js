// ============================================================
// PROCEDURAL AUDIO: SFX + CINEMATIC DARK-FANTASY SCORE (Web Audio API)
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
  let musicBus = null;
  const musicWaves = new Map();
  const musicSources = new Set();
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
    // One shared, filtered echo gives the score space without per-note effects.
    const echo = ctx.createDelay(1);
    const echoFilter = ctx.createBiquadFilter();
    const feedback = ctx.createGain(), wet = ctx.createGain();
    echo.delayTime.value = 0.31;
    echoFilter.type = 'lowpass'; echoFilter.frequency.value = 2300;
    feedback.gain.value = 0.18; wet.gain.value = 0.13;
    musicGain.connect(echo); echo.connect(echoFilter);
    echoFilter.connect(feedback); feedback.connect(echo);
    echoFilter.connect(wet); wet.connect(master);

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

  // Original score: "The Last Light". A sixteen-bar question, answer,
  // development and return; the same motif binds the nine landscapes.
  // Pitches and chord roots are semitone offsets, never scale-array indices.
  const SCORE_THEME = [
    [M(0,0,4,0.85), M(6,7,2), M(8,3,4), M(14,2,2,0.7)],
    [M(0,0,6), M(8,-2,2,0.7), M(12,0,3,0.8)],
    [M(0,8,4), M(6,7,2,0.8), M(8,3,6)],
    [M(0,5,4), M(6,3,2), M(8,2,6,0.75)],
    [M(0,0,3), M(4,3,3), M(8,7,4,1.05), M(14,5,2)],
    [M(0,3,6), M(8,2,3), M(12,0,3,0.8)],
    [M(0,2,3), M(4,5,3), M(8,7,4), M(14,11,2,0.75)],
    [M(0,7,8,0.9)],
    [M(0,0,4,0.8), M(6,7,2), M(8,10,4), M(14,7,2)],
    [M(0,5,6), M(8,3,3), M(12,2,3,0.75)],
    [M(0,8,4), M(6,10,2), M(8,12,6,1.05)],
    [M(0,10,6), M(8,7,4), M(14,5,2)],
    [M(0,7,3), M(4,10,3), M(8,12,4,1.12), M(14,14,2)],
    [M(0,15,6,1.08), M(8,14,2), M(12,12,3)],
    [M(0,11,4), M(6,7,2), M(8,5,3), M(12,2,3,0.7)],
    [M(0,0,10,0.8)]
  ];
  const SCORE_LANDSCAPES = {
    core: { name:'The Last Light — Ruins', root:146.832, bpm:76, lead:'horn', pad:'strings', mode:'minor', pulse:[0,3,7,3], drums:[0,10] },
    north: { name:'Under Frozen Stars', root:164.814, bpm:64, lead:'glass', pad:'choir', mode:'minor', octave:12, pulse:[0,7,12,7], drums:[0] },
    northeast: { name:'The Ancient Pines', root:130.813, bpm:72, lead:'flute', pad:'strings', mode:'dorian', pulse:[0,7,3,7], drums:[0,8] },
    east: { name:'Across the Golden Plain', root:146.832, bpm:88, lead:'marimba', pad:'strings', mode:'major', pulse:[0,7,4,7], drums:[0,6,10] },
    southeast: { name:'Stone Remembers', root:110, bpm:68, lead:'horn', pad:'choir', mode:'minor', pulse:[0,7,12,7], drums:[0,10] },
    south: { name:'Ashes of the Crown', root:130.813, bpm:104, lead:'horn', pad:'strings', mode:'minor', pulse:[0,7,3,7], drums:[0,6,8,14] },
    southwest: { name:'The Drowned Cathedral', root:123.471, bpm:62, lead:'choir', pad:'choir', mode:'phrygian', pulse:[0,1,7,3], drums:[0] },
    west: { name:'Where the Forest Breathes', root:146.832, bpm:74, lead:'flute', pad:'strings', mode:'dorian', pulse:[0,3,7,9], drums:[0,10] },
    northwest: { name:'Whispers Beneath the Mire', root:110, bpm:66, lead:'reed', pad:'choir', mode:'phrygian', pulse:[0,7,1,7], drums:[0,12] }
  };
  const BIOME_SONGS = Object.fromEntries(Object.entries(SCORE_LANDSCAPES).map(([id,c]) => {
    const major = c.mode === 'major';
    const chords = major ? [0,0,9,9,5,5,7,7,0,9,5,5,2,7,7,0]
      : c.mode==='dorian' ? [0,0,10,10,5,5,7,7,0,10,5,5,2,7,7,0]
      : c.mode==='phrygian' ? [0,0,1,1,5,5,7,7,0,10,8,5,1,7,7,0]
      : [0,0,8,8,5,5,7,7,0,10,8,5,2,7,7,0];
    const qualities = chords.map(n => major ? (n===9||n===2?'minor':'major')
      : n===7?'dominant':n===8||n===10||n===1||(c.mode==='dorian'&&n===5)?'major':n===2?'minor7':'minor');
    const pitch = n => {
      const pc=((n%12)+12)%12, octave=n-pc;
      if(major)return octave+({3:4,8:9,10:11,11:11}[pc]??pc);
      if(c.mode==='dorian'&&pc===8)return octave+9;
      if(c.mode==='phrygian'&&pc===2)return octave+1;
      return n;
    };
    return [id, { ...c,id,scale:Array.from({length:25},(_,i)=>i),
      melodyType:c.lead,padType:c.pad,bassType:'triangle',chords,chordQualities:qualities,
      melody:SCORE_THEME.map((bar,i)=>bar.map(n=>({...n,note:pitch(n.note)+(c.octave||0),accent:n.accent*(i>=12?1:0.9)}))),
      perc:{kick:c.drums,snare:id==='south'?[12]:[],hat:id==='south'||id==='east'?[2,6,10,14]:[6,14]}
    }];
  }));

  // ============================================================
  // MUSIC SYNTH HELPERS
  // ============================================================

  function trackMusicSource(source, nodes) {
    musicSources.add(source);
    source.onended = () => {
      musicSources.delete(source);
      source.disconnect();
      nodes.forEach(node => node.disconnect());
    };
  }

  function openMusicBus() {
    if (!ctx) return;
    const old = musicBus;
    if (old) {
      old.gain.cancelScheduledValues(ctx.currentTime);
      old.gain.setTargetAtTime(0, ctx.currentTime, 0.16);
      setTimeout(() => old.disconnect(), 1800);
    }
    musicBus = ctx.createGain();
    musicBus.gain.setValueAtTime(0, ctx.currentTime);
    musicBus.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.65);
    musicBus.connect(musicGain);
  }

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

    if (['strings', 'horn', 'choir'].includes(type)) {
      if (!musicWaves.has(type)) {
        const partials = type === 'horn' ? [0,1,0.55,0.30,0.16,0.06]
          : type === 'choir' ? [0,1,0.18,0.32,0.08,0.04]
          : [0,1,0.42,0.23,0.14,0.08,0.04];
        musicWaves.set(type, ctx.createPeriodicWave(new Float32Array(partials.length), new Float32Array(partials)));
      }
      osc.setPeriodicWave(musicWaves.get(type));
    } else osc.type = type;

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
        t0 + Math.min(attack, dur * 0.35)
      )
    );

    g.gain.exponentialRampToValueAtTime(
      0.0001,
      t0 + dur
    );

    osc.connect(g);
    g.connect(musicBus || musicGain);

    trackMusicSource(osc, [g]);
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

      horn: 'horn',

      whisper: 'triangle'
    };

    const type =
      types[instrument] || 'sine';

    const attack =
      instrument === 'pluck' ||
      instrument === 'marimba'
        ? 0.008
        : instrument === 'horn' ? 0.12 : instrument === 'choir' ? 0.20 : 0.055;

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
    g.connect(musicBus || musicGain);

    trackMusicSource(osc, [g]);
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
    g.connect(musicBus || musicGain);

    trackMusicSource(src, [filter, g]);
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
    g.connect(musicBus || musicGain);

    trackMusicSource(src, [filter, g]);
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
        degree
      );

    const quality =
      song.chordQualities &&
      song.chordQualities[
        chordIndex % song.chordQualities.length
      ];

    const third =
      sTone(
        root,
        quality === 'major' || quality === 'major7' ||
        quality === 'dominant'
          ? 4
          : 3
      );

    const fifth =
      sTone(
        root,
        7
      );

    const seventh = sTone(root, quality === 'major7' ? 11 :
      quality === 'minor' || quality === 'major' ? 12 : 10);

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
        degree
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
      ) * 0.18;
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
      0.052 +
      intensity * 0.025;

    bar.forEach(note => {
      if (!note) return;

      const frequency = sTone(song.root * 2, note.note);

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

    const intensity =
      musicIntensitySmooth;

    const barDur =
      musicBarDuration(song);

    const chordIndex = barIndex % song.chords.length;

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

    // A restrained string pulse leaves room for the theme during exploration;
    // combat adds subdivisions instead of simply turning everything up.
    const chord = chordFrequencies(song, chordIndex);
    if (intensity > 0.18 || barIndex % 16 >= 8) {
      const steps = intensity > 0.65 && !IS_MOBILE ? [0,2,4,6,8,10,12,14] : [0,4,8,12];
      const stepDur = musicStepDuration(song);
      steps.forEach((step, i) => mTone(sTone(chord.root, song.pulse[i % song.pulse.length]),
        startTime + step * stepDur, stepDur * 1.5,
        0.009 + intensity * 0.010, 'strings', 0.025, 0.07));
    }
    // Low brass answers the upper melody in the development and climax.
    if (barIndex % 16 >= 8 && barIndex % 2 === 0) {
      mLead(chord.fifth, startTime + barDur * 0.5, barDur * 0.42,
        0.013 + intensity * 0.010, 'horn', 0.9);
    }

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

      if (song && (!currentSong || song.id !== currentSong.id)) {
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
    updateMusicIntensity();

    const now =
      ctx.currentTime;

    // Browser backgrounding must not replay a backlog of expired bars.
    if (musicNextTime < now - 0.25) musicNextTime = now + 0.04;

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

    openMusicBus();
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

    openMusicBus();
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
    if (ctx) {
      for (const source of musicSources) {
        try { source.stop(ctx.currentTime + 0.12); } catch (e) {}
      }
      if (musicBus) musicBus.gain.setTargetAtTime(0, ctx.currentTime, 0.035);
    }

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
        bar: musicBar,
        activeVoices: musicSources.size,
        title: currentSong ? currentSong.name : null
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

      if (!e.dead &&
        dx * dx + dy * dy <
        122500
      ) {
        count++;
      }
    }

    return Math.min(
      1,
      Math.max(count / 30, game.guardian ? 0.85 : 0)
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
