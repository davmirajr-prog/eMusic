/*
 * Minijuego de dictado: suena una nota y hay que identificarla antes de que acabe el tiempo.
 * Mano derecha: teclado numérico (1..8 = Do..Do'). Mano izquierda: letras de control.
 */
(function () {
  'use strict';

  const L = window.MusicLogic;
  const A = window.MusicAudio;
  const STORAGE_KEY = 'dictado-musical';
  const REFERENCE = 60; // Do central

  const $ = (sel) => document.querySelector(sel);
  const ui = {
    level: $('#level'), levelName: $('#level-name'), score: $('#score'), best: $('#best'),
    streak: $('#streak'), accuracy: $('#accuracy'), status: $('#status'), answer: $('#answer'),
    timer: $('#timer-bar'), card: $('#card'), modifier: $('#modifier'),
    progress: $('#level-progress'), pads: document.querySelectorAll('.pad[data-key]'),
  };

  let state = L.createState(load());
  let phase = 'idle'; // idle | listening | answering | feedback
  let current = null;
  let modifier = null;
  let replays = 0;
  let deadline = 0;
  let rafId = null;
  let needsReference = true;
  let roundId = 0; // invalida rondas antiguas si se pausa a mitad

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch (e) { return null; }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ level: state.level, best: state.best }));
    } catch (e) { /* sin almacenamiento: no pasa nada */ }
  }

  function levelConfig() { return L.LEVELS[state.level]; }

  // ---------- Render ----------

  function render() {
    ui.level.textContent = state.level + 1;
    ui.levelName.textContent = levelConfig().name;
    ui.score.textContent = state.score;
    ui.best.textContent = state.best;
    ui.streak.textContent = state.streak;
    ui.accuracy.textContent = state.total ? Math.round((100 * state.hits) / state.total) + '%' : '—';
    ui.progress.style.width = (100 * state.streak) / L.STREAK_TO_LEVEL_UP + '%';
    ui.modifier.textContent = modifier === 'sharp' ? '♯ activo' : modifier === 'flat' ? '♭ activo' : '';

    const notes = levelConfig().notes;
    const chromatic = notes.some((n) => !L.DEGREES.some((d) => d.midi === n));
    ui.pads.forEach((pad) => {
      const midi = L.keyToMidi(Number(pad.dataset.key), null);
      pad.classList.toggle('inactive', !chromatic && !notes.includes(midi));
    });
  }

  function setStatus(text, answer = '', tone = '') {
    ui.status.textContent = text;
    ui.answer.textContent = answer;
    ui.card.dataset.tone = tone;
  }

  function flashPad(key, cls) {
    const pad = document.querySelector(`.pad[data-key="${key}"]`);
    if (!pad) return;
    pad.classList.add(cls);
    setTimeout(() => pad.classList.remove(cls), 350);
  }

  // ---------- Flujo del juego ----------

  async function startRound() {
    stopTimer();
    const id = ++roundId;
    phase = 'listening';
    replays = 0;
    modifier = null;
    current = L.pickNote(state.level, current);
    render();

    if (needsReference) {
      setStatus('Referencia: Do', 'Escucha…');
      await A.playNote(REFERENCE, 1);
      await wait(300);
      needsReference = false;
      if (id !== roundId || phase !== 'listening') return;
    }

    setStatus('¿Qué nota es?', '♪');
    await A.playNote(current, 1.2);
    if (id !== roundId || phase !== 'listening') return;
    phase = 'answering';
    startTimer();
  }

  function startTimer() {
    const total = levelConfig().time * 1000;
    deadline = performance.now() + total;
    const tick = () => {
      const left = deadline - performance.now();
      ui.timer.style.width = Math.max(0, (100 * left) / total) + '%';
      ui.timer.classList.toggle('low', left < total * 0.3);
      if (left <= 0) { finishRound(false, null, true); return; }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  function stopTimer() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function answer(midi) {
    if (phase !== 'answering') return;
    finishRound(midi === current, midi, false);
  }

  async function finishRound(correct, given, timeout) {
    stopTimer();
    const id = roundId;
    phase = 'feedback';
    const cfg = levelConfig();
    const timeLeft = Math.max(0, (deadline - performance.now()) / 1000);
    const points = correct ? L.scoreFor(state.level, timeLeft, cfg.time, replays) : 0;
    const result = L.applyResult(state, correct, points);
    state = result.state;
    save();
    render();

    if (correct) {
      setStatus(`¡Correcto! +${points}`, L.noteName(current), 'ok');
    } else if (timeout) {
      setStatus('Se acabó el tiempo', 'Era ' + L.noteName(current), 'ko');
      await A.playNote(current, 1);
    } else {
      setStatus(`Has dicho ${L.noteName(given)}`, 'Era ' + L.noteName(current), 'ko');
      await A.playNote(given, 0.7);
      await A.playNote(current, 1);
    }

    if (result.change) {
      needsReference = true;
      const msg = result.change === 'up' ? '⬆ ¡Subes de nivel!' : '⬇ Bajas de nivel';
      setStatus(msg, `Nivel ${state.level + 1}: ${levelConfig().name}`, result.change);
      await wait(1800);
    } else {
      await wait(900);
    }
    if (id === roundId && phase === 'feedback') startRound();
  }

  function pause() {
    stopTimer();
    roundId++;
    phase = 'idle';
    needsReference = true;
    ui.timer.style.width = '100%';
    setStatus('En pausa', 'Pulsa D o Intro para seguir');
  }

  function replay() {
    if (phase !== 'answering' || current === null) return;
    replays += 1;
    A.playNote(current, 1);
  }

  function playReference() {
    if (phase === 'answering' || phase === 'idle') A.playNote(REFERENCE, 1);
  }

  function resetProgress() {
    if (!confirm('¿Borrar progreso y récord?')) return;
    pause();
    state = L.createState(null);
    save();
    render();
    setStatus('Progreso borrado', 'Pulsa D o Intro para empezar');
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- Entrada ----------

  function pressNumber(key) {
    const midi = L.keyToMidi(key, modifier);
    flashPad(key, 'pressed');
    modifier = null;
    render();
    if (midi !== null) answer(midi);
  }

  function toggleModifier(kind) {
    modifier = modifier === kind ? null : kind;
    render();
  }

  function onKey(e) {
    if (e.repeat) return;
    const num = /^(Numpad|Digit)([1-8])$/.exec(e.code);
    if (num) { e.preventDefault(); pressNumber(Number(num[2])); return; }

    switch (e.code) {
      case 'KeyD': case 'Enter': case 'NumpadEnter':
        if (phase === 'idle') startRound();
        break;
      case 'KeyA': replay(); break;
      case 'KeyS': playReference(); break;
      case 'KeyQ': toggleModifier('flat'); break;
      case 'KeyW': toggleModifier('sharp'); break;
      case 'KeyF': case 'Escape':
        if (phase !== 'idle') pause();
        break;
      default: return;
    }
    e.preventDefault();
  }

  document.addEventListener('keydown', onKey);
  ui.pads.forEach((pad) => pad.addEventListener('click', () => pressNumber(Number(pad.dataset.key))));
  document.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'start' && phase === 'idle') startRound();
      if (action === 'replay') replay();
      if (action === 'reference') playReference();
      if (action === 'flat') toggleModifier('flat');
      if (action === 'sharp') toggleModifier('sharp');
      if (action === 'pause' && phase !== 'idle') pause();
      if (action === 'reset') resetProgress();
      btn.blur();
    });
  });

  render();
  setStatus('Dictado musical', 'Pulsa D o Intro para empezar');
})();
