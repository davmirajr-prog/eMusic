// Ejecutar con: node --test
const test = require('node:test');
const assert = require('node:assert');
const L = require('../js/logic.js');

test('keyToMidi traduce teclas y alteraciones', () => {
  assert.strictEqual(L.keyToMidi(1, null), 60);
  assert.strictEqual(L.keyToMidi(5, null), 67);
  assert.strictEqual(L.keyToMidi(8, null), 72);
  assert.strictEqual(L.keyToMidi(1, 'sharp'), 61);
  assert.strictEqual(L.keyToMidi(2, 'flat'), 61);
  assert.strictEqual(L.keyToMidi(1, 'flat'), null); // fuera de rango
  assert.strictEqual(L.keyToMidi(9, null), null);
});

test('midiToFreq: La4 = 440 Hz y Do4 ≈ 261.63 Hz', () => {
  assert.strictEqual(L.midiToFreq(69), 440);
  assert.ok(Math.abs(L.midiToFreq(60) - 261.63) < 0.01);
});

test('pickNote devuelve notas del nivel y evita repetir la anterior', () => {
  for (let lvl = 0; lvl < L.LEVELS.length; lvl++) {
    for (let i = 0; i < 50; i++) {
      const n = L.pickNote(lvl, 60);
      assert.ok(L.LEVELS[lvl].notes.includes(n));
      assert.notStrictEqual(n, 60);
    }
  }
});

test('todas las notas de cada nivel se pueden introducir con el teclado', () => {
  const reachable = new Set();
  for (let k = 1; k <= 8; k++) {
    [null, 'sharp', 'flat'].forEach((m) => {
      const midi = L.keyToMidi(k, m);
      if (midi !== null) reachable.add(midi);
    });
  }
  L.LEVELS.forEach((lvl) => lvl.notes.forEach((n) => assert.ok(reachable.has(n), `nota ${n}`)));
});

test('se sube de nivel tras la racha necesaria', () => {
  let s = L.createState(null);
  let change = null;
  for (let i = 0; i < L.STREAK_TO_LEVEL_UP; i++) ({ state: s, change } = L.applyResult(s, true, 10));
  assert.strictEqual(change, 'up');
  assert.strictEqual(s.level, 1);
  assert.strictEqual(s.score, 10 * L.STREAK_TO_LEVEL_UP);
  assert.strictEqual(s.best, s.score);
});

test('se baja de nivel tras varios fallos seguidos, nunca por debajo de 0', () => {
  let s = L.createState({ level: 2, best: 0 });
  let change = null;
  for (let i = 0; i < L.FAILS_TO_LEVEL_DOWN; i++) ({ state: s, change } = L.applyResult(s, false));
  assert.strictEqual(change, 'down');
  assert.strictEqual(s.level, 1);

  s = L.createState(null);
  for (let i = 0; i < 10; i++) ({ state: s } = L.applyResult(s, false));
  assert.strictEqual(s.level, 0);
});

test('un acierto reinicia el contador de fallos', () => {
  let s = L.createState({ level: 1 });
  ({ state: s } = L.applyResult(s, false));
  ({ state: s } = L.applyResult(s, false));
  ({ state: s } = L.applyResult(s, true, 5));
  ({ state: s } = L.applyResult(s, false));
  assert.strictEqual(s.level, 1);
});

test('scoreFor premia rapidez y penaliza repeticiones', () => {
  const rapido = L.scoreFor(0, 6, 6, 0);
  const lento = L.scoreFor(0, 0, 6, 0);
  const repetido = L.scoreFor(0, 6, 6, 1);
  assert.ok(rapido > lento);
  assert.ok(repetido < rapido);
  assert.strictEqual(lento, 10);
});
