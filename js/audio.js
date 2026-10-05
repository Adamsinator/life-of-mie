// Synthesised sound effects and a gentle music-box loop (Web Audio, no audio files).
(function (g) {
  const DG = (g.DG = g.DG || {});
  let ctx = null, sfxGain = null, musicGain = null, musicTimer = 0, step = 0;
  const vol = { music: 0.4, sfx: 0.7 };

  function ensure() {
    if (!ctx) {
      const AC = g.AudioContext || g.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      sfxGain = ctx.createGain();
      musicGain = ctx.createGain();
      sfxGain.connect(ctx.destination);
      musicGain.connect(ctx.destination);
      apply();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function apply() {
    if (!ctx) return;
    sfxGain.gain.value = vol.sfx * 0.6;
    musicGain.gain.value = vol.music * 0.25;
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
    purr: () => { for (let i = 0; i < 10; i++) tone(55 + (i % 2) * 6, 0.12, 'sawtooth', 0.06, i * 0.11); },
    crack: () => { tone(1200, 0.05, 'square', 0.08, 0, null, 0.3); tone(400, 0.2, 'sawtooth', 0.06, 0.05, null, 0.5); },
  };

  // I–vi–IV–V in C as a music-box arpeggio
  const CHORDS = [[523, 659, 784], [440, 523, 659], [349, 440, 523], [392, 494, 587]];
  function musicTick() {
    if (!ctx || vol.music <= 0) return;
    const chord = CHORDS[Math.floor(step / 8) % 4];
    const n = chord[[0, 1, 2, 1, 0, 2, 1, 2][step % 8]];
    tone(n, 0.5, 'sine', 0.22, 0, musicGain);
    if (step % 8 === 0) tone(chord[0] / 2, 1.4, 'triangle', 0.12, 0, musicGain);
    step++;
  }

  DG.Audio = {
    play(name) { if (vol.sfx > 0 && SFX[name]) try { SFX[name](); } catch (e) { /* audio unavailable */ } },
    setVolumes(music, sfx) {
      vol.music = music; vol.sfx = sfx; apply();
      if (music > 0) this.startMusic(); else this.stopMusic();
    },
    // must be called from a user gesture (iOS)
    unlock() { if (vol.music > 0 || vol.sfx > 0) { ensure(); if (vol.music > 0) this.startMusic(); } },
    startMusic() { if (!ctx || musicTimer) return; musicTimer = setInterval(musicTick, 340); },
    stopMusic() { clearInterval(musicTimer); musicTimer = 0; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
