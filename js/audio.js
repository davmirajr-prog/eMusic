/*
 * Síntesis sencilla de notas con Web Audio API (timbre tipo piano eléctrico).
 */
(function (root) {
  'use strict';

  let ctx = null;

  function getContext() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /** Toca una nota MIDI. Devuelve una promesa que se resuelve al terminar. */
  function playNote(midi, duration = 1.2) {
    const ac = getContext();
    const freq = root.MusicLogic.midiToFreq(midi);
    const now = ac.currentTime;

    const master = ac.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.12, now + 0.3);
    master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    master.connect(ac.destination);

    // Fundamental + armónicos con distinta intensidad.
    [[1, 1], [2, 0.4], [3, 0.15], [4, 0.08]].forEach(([mult, vol]) => {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = mult === 1 ? 'triangle' : 'sine';
      osc.frequency.value = freq * mult;
      g.gain.value = vol;
      osc.connect(g).connect(master);
      osc.start(now);
      osc.stop(now + duration + 0.05);
    });

    return new Promise((resolve) => setTimeout(resolve, duration * 1000));
  }

  /** Toca una secuencia de notas, una tras otra. */
  async function playSequence(midis, duration = 0.9, gap = 0.15) {
    for (const m of midis) {
      playNote(m, duration);
      await new Promise((r) => setTimeout(r, (duration + gap) * 1000));
    }
  }

  root.MusicAudio = { playNote, playSequence, getContext };
})(window);
