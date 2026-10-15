/*
 * Lógica pura del juego (sin DOM ni audio) para poder testearla con Node.
 */
(function (root) {
  'use strict';

  // Grados de la escala de Do mayor asociados a las teclas 1..8 del teclado numérico.
  const DEGREES = [
    { key: 1, name: 'Do', midi: 60 },
    { key: 2, name: 'Re', midi: 62 },
    { key: 3, name: 'Mi', midi: 64 },
    { key: 4, name: 'Fa', midi: 65 },
    { key: 5, name: 'Sol', midi: 67 },
    { key: 6, name: 'La', midi: 69 },
    { key: 7, name: 'Si', midi: 71 },
    { key: 8, name: 'Do\'', midi: 72 },
  ];

  const CHROMATIC_NAMES = {
    60: 'Do', 61: 'Do♯ / Re♭', 62: 'Re', 63: 'Re♯ / Mi♭', 64: 'Mi', 65: 'Fa',
    66: 'Fa♯ / Sol♭', 67: 'Sol', 68: 'Sol♯ / La♭', 69: 'La', 70: 'La♯ / Si♭',
    71: 'Si', 72: 'Do\'',
  };

  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const DIATONIC = [60, 62, 64, 65, 67, 69, 71];

  // Cada nivel define las notas posibles y el tiempo (segundos) para responder.
  const LEVELS = [
    { name: 'Do y Sol', notes: [60, 67], time: 6 },
    { name: 'Tríada Do · Mi · Sol', notes: [60, 64, 67], time: 6 },
    { name: 'Pentacordo Do → Sol', notes: [60, 62, 64, 65, 67], time: 5.5 },
    { name: 'Escala de Do', notes: DIATONIC, time: 5 },
    { name: 'Escala + Do agudo', notes: [...DIATONIC, 72], time: 4.5 },
    { name: 'Escala veloz', notes: [...DIATONIC, 72], time: 3.5 },
    { name: 'Sostenidos y bemoles', notes: range(60, 72), time: 5 },
    { name: 'Cromática veloz', notes: range(60, 72), time: 3.5 },
  ];

  const STREAK_TO_LEVEL_UP = 6;
  const FAILS_TO_LEVEL_DOWN = 3;

  function noteName(midi) {
    return CHROMATIC_NAMES[midi] || String(midi);
  }

  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /**
   * Traduce una tecla numérica (1..8) y un modificador opcional
   * ('sharp' | 'flat' | null) a nota MIDI. Devuelve null si no es válida.
   */
  function keyToMidi(key, modifier) {
    const degree = DEGREES.find((d) => d.key === key);
    if (!degree) return null;
    let midi = degree.midi;
    if (modifier === 'sharp') midi += 1;
    if (modifier === 'flat') midi -= 1;
    if (midi < 60 || midi > 72) return null;
    return midi;
  }

  /** Elige una nota aleatoria del nivel evitando, si se puede, repetir la anterior. */
  function pickNote(level, previous, rand) {
    const r = rand || Math.random;
    const pool = LEVELS[level].notes.filter((n) => n !== previous);
    const options = pool.length ? pool : LEVELS[level].notes;
    return options[Math.floor(r() * options.length)];
  }

  /** Puntos de un acierto: base por nivel + bonus por rapidez, penalizando repeticiones. */
  function scoreFor(level, timeLeft, timeTotal, replays) {
    const base = 10 * (level + 1);
    const bonus = Math.round(10 * Math.max(0, timeLeft) / timeTotal) * (level + 1);
    const total = base + bonus;
    return replays > 0 ? Math.round(total / (replays + 1)) : total;
  }

  function createState(saved) {
    return {
      level: saved && Number.isInteger(saved.level) ? Math.min(saved.level, LEVELS.length - 1) : 0,
      best: (saved && saved.best) || 0,
      score: 0,
      streak: 0,
      fails: 0,
      hits: 0,
      total: 0,
    };
  }

  /**
   * Aplica el resultado de una ronda al estado y devuelve
   * { state, change } con change = 'up' | 'down' | null.
   */
  function applyResult(state, correct, points) {
    const s = Object.assign({}, state);
    let change = null;
    s.total += 1;
    if (correct) {
      s.hits += 1;
      s.score += points || 0;
      s.streak += 1;
      s.fails = 0;
      if (s.streak >= STREAK_TO_LEVEL_UP && s.level < LEVELS.length - 1) {
        s.level += 1;
        s.streak = 0;
        change = 'up';
      }
    } else {
      s.streak = 0;
      s.fails += 1;
      if (s.fails >= FAILS_TO_LEVEL_DOWN && s.level > 0) {
        s.level -= 1;
        s.fails = 0;
        change = 'down';
      }
    }
    s.best = Math.max(s.best, s.score);
    return { state: s, change };
  }

  const api = {
    DEGREES, LEVELS, STREAK_TO_LEVEL_UP, FAILS_TO_LEVEL_DOWN,
    noteName, midiToFreq, keyToMidi, pickNote, scoreFor, createState, applyResult,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MusicLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
