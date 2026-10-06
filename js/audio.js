// Synthesised sound effects, a gentle music box and ambient sounds of the season (Web Audio, no audio files).
(function (g) {
  const DG = (g.DG = g.DG || {});
  let ctx = null, sfxGain = null, musicGain = null, chipGain = null, ambGain = null, reverb = null, musicTimer = 0, step = 0;
  const vol = { music: 0.4, sfx: 0.7, ambient: 0.5 };

  function ensure() {
    if (!ctx) {
      const AC = g.AudioContext || g.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      sfxGain = ctx.createGain();
      musicGain = ctx.createGain();
      ambGain = ctx.createGain();
      chipGain = ctx.createGain();   // Agent Adam's chiptune: dry, no music-box reverb
      chipGain.connect(ctx.destination);
      sfxGain.connect(ctx.destination);
      // the music box sits in a small room: a soft, short reverb
      reverb = ctx.createConvolver();
      const len = Math.floor(ctx.sampleRate * 1.8), ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
      reverb.buffer = ir;
      const wet = ctx.createGain(); wet.gain.value = 0.35;
      musicGain.connect(ctx.destination);
      musicGain.connect(reverb); reverb.connect(wet); wet.connect(ctx.destination);
      ambGain.connect(ctx.destination);
      apply();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function apply() {
    if (!ctx) return;
    sfxGain.gain.value = vol.sfx * 0.6;
    musicGain.gain.value = vol.music * 0.22;
    ambGain.gain.value = vol.ambient * 0.5;
    chipGain.gain.value = vol.music * 0.5;
  }

  function tone(freq, dur, type = 'sine', v = 0.3, when = 0, dest, slide = 0) {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime + when;
    const o = c.createOscillator(), gn = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(v, t + 0.012);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn);
    gn.connect(dest || sfxGain);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  const SFX = {
    click: () => tone(700, 0.05, 'triangle', 0.12),
    coin: () => { tone(988, 0.08, 'square', 0.08); tone(1319, 0.25, 'square', 0.08, 0.08); },
    stitch: () => tone(240, 0.07, 'square', 0.15, 0, null, 0.5),
    snip: () => { tone(2400, 0.03, 'square', 0.05); tone(1900, 0.03, 'square', 0.05, 0.05); },
    good: () => tone(880, 0.12, 'triangle', 0.18),
    perfect: () => { tone(988, 0.1, 'triangle', 0.18); tone(1480, 0.18, 'triangle', 0.15, 0.08); },
    bad: () => tone(170, 0.25, 'sawtooth', 0.08, 0, null, 0.7),
    squish: () => tone(150, 0.12, 'sine', 0.3, 0, null, 0.6),
    steam: () => tone(3000, 0.12, 'sawtooth', 0.02, 0, null, 0.5),
    fanfare: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.16, i * 0.11)),
    meow: () => { tone(620, 0.18, 'sine', 0.16, 0, null, 1.5); tone(900, 0.25, 'sine', 0.14, 0.17, null, 0.6); },
    // the sewing machine: a short run of the needle over the motor's hum
    machine: () => { tone(92, 0.36, 'sawtooth', 0.035, 0, null, 1.06); for (let i = 0; i < 7; i++) tone(1500 + (i % 2) * 220, 0.018, 'square', 0.03, 0.02 + i * 0.045); },
    // the shop bell: two bright dings with a long ring
    bell: () => { [0, 0.2].forEach(w => { tone(1760, 1.1, 'sine', 0.14, w); tone(2637, 0.7, 'sine', 0.05, w); tone(4186, 0.25, 'sine', 0.02, w); }); },
    purr: () => { for (let i = 0; i < 10; i++) tone(55 + (i % 2) * 6, 0.12, 'sawtooth', 0.06, i * 0.11); },
    // a page turning: a short whisper of filtered noise
    page: () => {
      const c = ensure(); if (!c) return;
      const len = Math.floor(c.sampleRate * 0.22), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(Math.sin(Math.PI * i / len), 2);
      const src = c.createBufferSource(), f = c.createBiquadFilter(), gn = c.createGain();
      src.buffer = buf; f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.7; gn.gain.value = 0.22;
      src.connect(f); f.connect(gn); gn.connect(sfxGain); src.start();
    },
    crack: () => { tone(1200, 0.05, 'square', 0.08, 0, null, 0.3); tone(400, 0.2, 'sawtooth', 0.06, 0.05, null, 0.5); },
  };

  // A slow music box: I–vi–IV–V in C, a soft bass note, and a melody that wanders over the chord
  // (it rests now and then, so it never feels like a loop).
  const CHORDS = [[523, 659, 784], [440, 523, 659], [349, 440, 523], [392, 494, 587]];
  const PENTA = [523, 587, 659, 784, 880, 1047];
  let mel = 2;
  function musicTick() {
    if (!ctx || vol.music <= 0) return;
    const bar = Math.floor(step / 8), beat = step % 8, chord = CHORDS[bar % 4];
    if (beat === 0) tone(chord[0] / 2, 2.4, 'triangle', 0.1, 0, musicGain);
    if (beat % 2 === 0) tone(chord[[0, 1, 2, 1][beat / 2]], 0.9, 'sine', 0.13, 0, musicGain);
    if (Math.random() < (beat % 2 ? 0.35 : 0.55)) {
      mel = Math.max(0, Math.min(PENTA.length - 1, mel + [-1, -1, 0, 1, 1, 2, -2][Math.floor(Math.random() * 7)]));
      tone(PENTA[mel] * (bar % 8 < 4 ? 1 : 0.5), 0.7, 'sine', 0.09, 0.02, musicGain);
    }
    step++;
  }

  // ---- ambience: birds, rain, wind or a crackling fire, depending on season and weather ----
  let noiseBuf = null, ambKind = null, ambNodes = [], ambTimer = 0;
  const noise = () => {
    if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true; return src;
  };
  function bed(type, freq, q, level, lfo) {   // a steady filtered-noise bed (rain, wind)
    const src = noise(), f = ctx.createBiquadFilter(), gn = ctx.createGain();
    f.type = type; f.frequency.value = freq; f.Q.value = q; gn.gain.value = 0;
    gn.gain.linearRampToValueAtTime(level, ctx.currentTime + 2);
    src.connect(f); f.connect(gn); gn.connect(ambGain); src.start();
    ambNodes.push(src, gn);
    if (lfo) { const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = lfo; og.gain.value = level * 0.6; o.connect(og); og.connect(gn.gain); o.start(); ambNodes.push(o); }
  }
  function chirp() {   // a little bird: two to five quick whistles
    const base = 2600 + Math.random() * 1600, n = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) tone(base * (1 + (Math.random() - 0.5) * 0.2), 0.07 + Math.random() * 0.05, 'sine', 0.05, i * 0.11, ambGain, 1.25 + Math.random() * 0.3);
  }
  function crackle() {   // a log settling in the fire
    for (let i = 0; i < 1 + Math.floor(Math.random() * 3); i++) tone(900 + Math.random() * 2500, 0.015, 'square', 0.03, i * 0.05 + Math.random() * 0.05, ambGain, 0.4);
  }
  function drip() { tone(1400 + Math.random() * 900, 0.05, 'sine', 0.04, 0, ambGain, 0.6); }
  function stopAmbience() {
    clearTimeout(ambTimer); ambTimer = 0;
    ambNodes.forEach(n => { try { if (n.gain) { n.gain.cancelScheduledValues(ctx.currentTime); n.gain.setValueAtTime(n.gain.value, ctx.currentTime); n.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2); } else n.stop(ctx.currentTime + 1.3); } catch (e) { /* already stopped */ } });
    ambNodes = [];
  }
  function startAmbience(kind) {
    if (!ctx || vol.ambient <= 0) return;
    const every = { birds: [3000, 9000, chirp], rain: [600, 2200, drip], wind: [8000, 15000, chirp], fire: [250, 1400, crackle], night: [5000, 12000, () => {}] }[kind];
    if (kind === 'rain') bed('bandpass', 1400, 0.6, 0.18);
    if (kind === 'wind') bed('lowpass', 500, 0.8, 0.12, 0.08);
    if (kind === 'fire') bed('lowpass', 260, 0.7, 0.07);
    if (kind === 'night') bed('lowpass', 300, 0.5, 0.03);
    if (every) {
      const loop = () => { if (ambKind !== kind) return; every[2](); ambTimer = setTimeout(loop, every[0] + Math.random() * (every[1] - every[0])); };
      ambTimer = setTimeout(loop, 800);
    }
  }

  DG.Audio = {
    play(name) { if (vol.sfx > 0 && SFX[name]) try { SFX[name](); } catch (e) { /* audio unavailable */ } },
    setVolumes(music, sfx, ambient = vol.ambient) {
      const ambWas = vol.ambient;
      vol.music = music; vol.sfx = sfx; vol.ambient = ambient; apply();
      if (music > 0) this.startMusic(); else this.stopMusic();
      if (ctx && (ambWas > 0) !== (ambient > 0)) { const k = ambKind; ambKind = null; this.ambience(k); }
    },
    // must be called from a user gesture (iOS)
    unlock() { if (vol.music > 0 || vol.sfx > 0 || vol.ambient > 0) { ensure(); if (vol.music > 0) this.startMusic(); const k = ambKind; ambKind = null; this.ambience(k); } },
    startMusic() { if (!ctx || musicTimer) return; musicTimer = setInterval(musicTick, 480); },
    // 'birds' | 'rain' | 'wind' | 'fire' | 'night' | null; only changes anything when the kind changes
    ambience(kind) {
      if (kind === ambKind) return;
      ambKind = kind;
      if (!ctx) return;   // remembered until the first touch unlocks audio
      stopAmbience();
      if (kind) startAmbience(kind);
    },
    stopMusic() { clearInterval(musicTimer); musicTimer = 0; },
    // for Agent Adam: one synthesised note (music: true plays on the music volume) and a burst of noise
    chip(freq, dur, type = 'square', v = 0.2, when = 0, music = false) {
      if ((music ? vol.music : vol.sfx) <= 0) return;
      try { if (ensure()) tone(freq, dur, type, v, when, music ? chipGain : sfxGain); } catch (e) { /* audio unavailable */ }
    },
    noise(dur = 0.3, v = 0.3, freq = 900) {
      if (vol.sfx <= 0) return;
      try {
        const c = ensure(); if (!c) return;
        const len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
        const src = c.createBufferSource(), f = c.createBiquadFilter(), gn = c.createGain();
        src.buffer = buf; f.type = 'lowpass'; f.frequency.value = freq; gn.gain.value = v;
        src.connect(f); f.connect(gn); gn.connect(sfxGain); src.start();
      } catch (e) { /* audio unavailable */ }
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
