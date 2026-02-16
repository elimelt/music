import './styles.css';
import { Chord, NOTE_NAMES, detect, getVariations } from './chord-theory.js';
import { getNextChords, getCommonProgressions, getRandomChords } from './progressions.js';
import { analyzeChordChoice } from './analysis.js';
import { getNgramPredictions } from './ngram.js';
import VoiceController from './voice-controller.js';
import AudioEngine from './audio-engine.js';
import { createPiano, highlightKeys, getPianoKeys } from './piano.js';
import { renderSheetMusic, createStaveNoteForClef, BARS_PER_LINE, BAR_WIDTH, STAVE_HEIGHT, STAVE_GAP, CHORD_SYMBOL_HEIGHT, SYSTEM_HEIGHT, MIDI_SPLIT_POINT, Renderer, Stave, Voice, Formatter, StaveConnector } from './sheet-music.js';
import { fullHistory, chordHistory, loadHistory, saveHistory, addToHistory, clearFullHistory, setFullHistory, exportHistory, importHistoryFromFile } from './history.js';
import { initStandards } from './standards.js';

const NUM_VOICES = 5;
const controller = new VoiceController(NUM_VOICES);
let audio = null;
let touchAudio = null;
let currentKey = 0;
let currentChord = null;
let transposeAmount = 0;

const pianoEl = document.getElementById('piano');
const chordDisplayContainerEl = document.getElementById('chord-display-container');
const chordHistoryEl = document.getElementById('chord-history');
const chordNameEl = document.getElementById('chord-name');
const sheetMusicEl = document.getElementById('sheet-music');
const chordButtonsEl = document.getElementById('chord-buttons');
const startBtn = document.getElementById('start-btn');
const bassToggle = document.getElementById('bass-toggle');
const volChordSlider = document.getElementById('vol-chord');
const volBassSlider = document.getElementById('vol-bass');
const volPianoSlider = document.getElementById('vol-piano');
const octaveUpBtn = document.getElementById('octave-up');
const octaveDownBtn = document.getElementById('octave-down');
const inversionUpBtn = document.getElementById('inversion-up');
const inversionDownBtn = document.getElementById('inversion-down');
const voicingResetBtn = document.getElementById('voicing-reset');
const keyboardLeftBtn = document.getElementById('keyboard-left');
const keyboardRightBtn = document.getElementById('keyboard-right');
const historyTimeline = document.getElementById('history-timeline');
const historyReplayBtn = document.getElementById('history-replay');
const historyExportBtn = document.getElementById('history-export');
const historyImportBtn = document.getElementById('history-import');
const historyClearBtn = document.getElementById('history-clear');
const historyFileInput = document.getElementById('history-file-input');
const transposeSelect = document.getElementById('transpose-select');
const contextMenu = document.getElementById('context-menu');
const contextMenuSubs = document.getElementById('context-menu-subs');
const standardsSearch = document.getElementById('standards-search');
const standardsResults = document.getElementById('standards-results');

let pianoKeys = getPianoKeys();
let pianoStartMidi = 48;
const PIANO_MIN_START = 24;
const PIANO_MAX_START = 84;

let isDragging = false;
let dragStartVoicing = null;
let dragNoteIndex = -1;
let lastDragMidi = -1;
let editingIndex = -1;
let contextMenuIdx = -1;
let isReplaying = false;
let replayIndex = 0;
let replayInterval = null;
const pressedKeys = new Set();

loadHistory();

function getTransposedSymbol(chord) {
  if (!chord) return '—';
  const transposedRoot = (chord.root + transposeAmount) % 12;
  return NOTE_NAMES[transposedRoot] + chord.typeData.symbol;
}

function updateKeyboardButtons() {
  keyboardLeftBtn.disabled = pianoStartMidi <= PIANO_MIN_START;
  keyboardRightBtn.disabled = pianoStartMidi + pianoKeys - 1 >= 108;
}

function rebuildPiano() {
  pianoKeys = getPianoKeys();
  createPiano(pianoEl, pianoStartMidi, pianoStartMidi + pianoKeys - 1);
  if (controller.currentVoicing && controller.currentVoicing.length > 0) {
    highlightKeys(pianoEl, controller.currentVoicing);
  }
  updateKeyboardButtons();
}

rebuildPiano();

let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    const newKeys = getPianoKeys();
    if (newKeys !== pianoKeys) rebuildPiano();
  }, 150);
});

function updateSheetMusicDisplay() {
  const voicing = controller.currentVoicing || [];
  const playing = [...pressedKeys];
  renderSheetMusic(sheetMusicEl, voicing, playing, currentChord, bassToggle.classList.contains('active'));

  const allNotes = [...new Set([...voicing, ...playing])];
  if (allNotes.length > 0) {
    updateChordSymbol(allNotes);
  }
}

function updateChordSymbol(midiNotes, rebuildUI = true) {
  if (!midiNotes || midiNotes.length === 0) {
    chordNameEl.textContent = '—';
    return null;
  }

  const pitchClasses = midiNotes.map(m => m % 12);
  const detectedChord = detect(pitchClasses);

  if (detectedChord) {
    chordNameEl.textContent = getTransposedSymbol(detectedChord);
    if (rebuildUI && (!currentChord || detectedChord.symbol !== currentChord.symbol)) {
      currentChord = detectedChord;
      buildChordUI();
    }
    return detectedChord;
  } else {
    const noteNames = [...new Set(pitchClasses)].sort((a, b) => a - b).map(pc => NOTE_NAMES[(pc + transposeAmount) % 12]);
    chordNameEl.textContent = noteNames.join(' ');
    return null;
  }
}

function renderHistory() {
  chordHistoryEl.innerHTML = '';
  chordHistory.forEach((chord) => {
    const item = document.createElement('span');
    item.className = 'history-chip';
    item.textContent = getTransposedSymbol(chord);
    item.title = `Click to play ${getTransposedSymbol(chord)}`;
    item.addEventListener('click', () => playChord(chord));
    chordHistoryEl.appendChild(item);
  });
}

function attachChordSymbolHandlers(svg) {
  const chordGroups = svg.querySelectorAll('g.vf-chordsymbol');
  chordGroups.forEach((group, idx) => {
    if (idx >= fullHistory.length) return;
    const entry = fullHistory[idx];
    const chord = entry.chord;
    group.style.cursor = 'pointer';
    if (currentChord && chord.encode() === currentChord.encode()) group.classList.add('current-chord');
    if (idx === editingIndex) group.classList.add('editing-chord');
    group.addEventListener('click', (e) => { e.stopPropagation(); jumpToHistoryEntry(entry); });
    group.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); showContextMenu(e, idx); });
  });
}

function renderTimeline() {
  historyTimeline.innerHTML = '';
  historyTimeline.className = 'lead-sheet';

  if (fullHistory.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'lead-sheet-empty';
    empty.textContent = 'Play chords or load a standard...';
    historyTimeline.appendChild(empty);
    return;
  }

  const numLines = Math.ceil(fullHistory.length / BARS_PER_LINE);
  const clefWidth = 60;
  const totalWidth = clefWidth + BARS_PER_LINE * BAR_WIDTH + 20;
  const totalHeight = numLines * SYSTEM_HEIGHT;

  try {
    const renderer = new Renderer(historyTimeline, Renderer.Backends.SVG);
    renderer.resize(totalWidth, totalHeight);
    const context = renderer.getContext();

    for (let line = 0; line < numLines; line++) {
      const systemY = line * SYSTEM_HEIGHT + CHORD_SYMBOL_HEIGHT;
      const entriesInLine = fullHistory.slice(line * BARS_PER_LINE, (line + 1) * BARS_PER_LINE);
      const staveX = 10;
      const staveWidth = totalWidth - 20;

      const trebleStave = new Stave(staveX, systemY, staveWidth);
      const bassStave = new Stave(staveX, systemY + STAVE_HEIGHT + STAVE_GAP, staveWidth);

      if (line === 0) {
        trebleStave.addClef('treble');
        bassStave.addClef('bass');
      }

      trebleStave.setContext(context).draw();
      bassStave.setContext(context).draw();

      if (line === 0) {
        const brace = new StaveConnector(trebleStave, bassStave);
        brace.setType(StaveConnector.type.BRACE);
        brace.setContext(context).draw();
      }

      const connector = new StaveConnector(trebleStave, bassStave);
      connector.setType(StaveConnector.type.SINGLE_LEFT);
      connector.setContext(context).draw();

      const trebleNotes = [];
      const bassNotes = [];

      entriesInLine.forEach((entry) => {
        const chord = entry.chord;
        const voicing = entry.voicing || [];
        const allNotes = voicing.filter(m => m >= 24 && m <= 108).sort((a, b) => a - b);
        const trebleMidi = allNotes.filter(m => m >= MIDI_SPLIT_POINT);
        const bassMidi = allNotes.filter(m => m < MIDI_SPLIT_POINT);
        trebleNotes.push(createStaveNoteForClef('treble', trebleMidi, chord, getTransposedSymbol));
        bassNotes.push(createStaveNoteForClef('bass', bassMidi));
      });

      trebleNotes.forEach(note => note.setStave(trebleStave));
      bassNotes.forEach(note => note.setStave(bassStave));

      const trebleVoice = new Voice({ num_beats: entriesInLine.length * 4, beat_value: 4 }).setStrict(false);
      trebleVoice.addTickables(trebleNotes);

      const bassVoice = new Voice({ num_beats: entriesInLine.length * 4, beat_value: 4 }).setStrict(false);
      bassVoice.addTickables(bassNotes);

      new Formatter().joinVoices([trebleVoice]).formatToStave([trebleVoice], trebleStave);
      new Formatter().joinVoices([bassVoice]).formatToStave([bassVoice], bassStave);

      trebleVoice.draw(context, trebleStave);
      bassVoice.draw(context, bassStave);
    }

    const svg = historyTimeline.querySelector('svg');
    attachChordSymbolHandlers(svg);
  } catch (e) {
    console.error('Failed to render lead sheet:', e);
  }
}

async function jumpToChord(chord) {
  if (!audio) await startAudio();
  if (!audio) return;
  currentChord = chord;
  const voicing = controller.getVoicing(chord);
  audio.glideTo(voicing, chord.root);
  chordDisplayContainerEl.classList.remove('inactive');
  chordNameEl.textContent = getTransposedSymbol(chord);
  updateSheetMusicDisplay();
  highlightKeys(pianoEl, voicing);
  buildChordUI();
  renderTimeline();
}

async function jumpToHistoryEntry(entry) {
  if (!audio) await startAudio();
  if (!audio) return;
  currentChord = entry.chord;
  const voicing = entry.voicing && entry.voicing.length > 0 ? entry.voicing : controller.getVoicing(entry.chord);
  controller.currentVoicing = voicing;
  audio.glideTo(voicing, entry.chord.root);
  chordDisplayContainerEl.classList.remove('inactive');
  chordNameEl.textContent = getTransposedSymbol(entry.chord);
  updateSheetMusicDisplay();
  highlightKeys(pianoEl, voicing);
  buildChordUI();
  renderTimeline();
}

function showContextMenu(e, idx) {
  contextMenuIdx = idx;
  editingIndex = idx;
  const entry = fullHistory[idx];
  const chord = entry.chord;
  contextMenuSubs.innerHTML = '';

  const seen = new Set();
  seen.add(chord.encode());

  const historyUpToIdx = fullHistory.slice(0, idx + 1);
  const ngramPreds = getNgramPredictions(historyUpToIdx, 6);
  for (const pred of ngramPreds) {
    if (seen.has(pred.chord.encode())) continue;
    seen.add(pred.chord.encode());
    const btn = document.createElement('button');
    btn.className = 'context-menu-item hint-classic';
    btn.textContent = getTransposedSymbol(pred.chord);
    btn.title = `${pred.source} pattern (${pred.count}×)`;
    btn.addEventListener('click', () => { substituteChord(idx, pred.chord); hideContextMenu(); });
    contextMenuSubs.appendChild(btn);
  }

  const variations = getVariations(chord);
  const nextChords = getNextChords(chord, 0);
  const allSubs = [...variations, ...nextChords.map(n => n.chord)];

  for (const sub of allSubs) {
    if (seen.has(sub.encode())) continue;
    seen.add(sub.encode());
    const btn = document.createElement('button');
    btn.className = 'context-menu-item';
    const hint = analyzeChordChoice(chord, sub, 0);
    if (hint) btn.classList.add(`hint-${hint}`);
    btn.textContent = getTransposedSymbol(sub);
    btn.addEventListener('click', () => { substituteChord(idx, sub); hideContextMenu(); });
    contextMenuSubs.appendChild(btn);
  }

  contextMenu.style.left = `${e.clientX}px`;
  contextMenu.style.top = `${e.clientY}px`;
  contextMenu.classList.add('open');
  renderTimeline();
}

function hideContextMenu() {
  contextMenu.classList.remove('open');
  editingIndex = -1;
  contextMenuIdx = -1;
  renderTimeline();
}

function substituteChord(idx, newChord) {
  let newVoicing = [];
  if (idx > 0) {
    const prevVoicing = fullHistory[idx - 1].voicing;
    if (prevVoicing && prevVoicing.length > 0) controller.currentVoicing = prevVoicing;
  }
  newVoicing = controller.getVoicing(newChord);
  if (bassToggle.classList.contains('active')) {
    const bassNote = 36 + newChord.root;
    if (!newVoicing.includes(bassNote)) newVoicing.unshift(bassNote);
  }
  fullHistory[idx] = { chord: newChord, voicing: newVoicing };
  if (idx >= fullHistory.length - chordHistory.length) {
    const chordIdx = idx - (fullHistory.length - chordHistory.length);
    chordHistory[chordIdx] = newChord;
  }
  saveHistory();
  renderHistory();
  jumpToHistoryEntry(fullHistory[idx]);
}



function stopReplay() {
  isReplaying = false;
  if (replayInterval) { clearInterval(replayInterval); replayInterval = null; }
  historyReplayBtn.textContent = '▶ Replay';
}

async function replayHistory() {
  if (fullHistory.length === 0) return;
  if (isReplaying) { stopReplay(); return; }

  isReplaying = true;
  replayIndex = 0;
  historyReplayBtn.textContent = '⏹ Stop';

  if (!audio) await startAudio();
  if (!audio) { stopReplay(); return; }

  await jumpToHistoryEntry(fullHistory[0]);

  replayInterval = setInterval(async () => {
    replayIndex++;
    if (replayIndex >= fullHistory.length) { stopReplay(); return; }
    await jumpToHistoryEntry(fullHistory[replayIndex]);
  }, 1200);
}

async function playChord(chord) {
  if (!audio) await startAudio();
  if (!audio) return;

  if (currentChord && currentChord.symbol !== chord.symbol) {
    addToHistory(currentChord, controller.currentVoicing || [], bassToggle.classList.contains('active'));
  }

  currentChord = chord;
  const voicing = controller.getVoicing(chord);
  audio.glideTo(voicing, chord.root);
  chordDisplayContainerEl.classList.remove('inactive');
  chordNameEl.textContent = getTransposedSymbol(chord);
  updateSheetMusicDisplay();
  highlightKeys(pianoEl, voicing);
  buildChordUI();
  renderHistory();
  renderTimeline();
}

const HINT_LABELS = { safe: 'Smooth voice leading', interesting: 'Adds color/tension', classic: 'Classic jazz move' };

function createChordGroup(label, options, container) {
  if (!options || options.length === 0) return;
  const row = document.createElement('div');
  row.className = 'chord-row';
  const labelEl = document.createElement('div');
  labelEl.className = 'chord-row-label';
  labelEl.textContent = label;
  row.appendChild(labelEl);
  const buttons = document.createElement('div');
  buttons.className = 'chord-row-buttons';
  options.forEach(opt => {
    const chord = opt.chord || opt;
    const btn = document.createElement('button');
    btn.className = 'chord-btn';
    btn.textContent = getTransposedSymbol(chord);
    if (currentChord) {
      const hintType = analyzeChordChoice(currentChord, chord, currentKey);
      if (hintType) {
        btn.classList.add(`hint-${hintType}`);
        btn.title = opt.description ? `${opt.description} • ${HINT_LABELS[hintType]}` : HINT_LABELS[hintType];
      }
    }
    if (opt.description && !btn.title) btn.title = opt.description;
    btn.addEventListener('click', () => playChord(chord));
    buttons.appendChild(btn);
  });
  row.appendChild(buttons);
  container.appendChild(row);
}

function buildChordUI() {
  chordButtonsEl.innerHTML = '';

  if (!currentChord) {
    const progressions = getCommonProgressions(currentKey);
    createChordGroup('Current', [new Chord(currentKey, 'maj7')], chordButtonsEl);
    createChordGroup('Diatonic', progressions.diatonic, chordButtonsEl);
    createChordGroup('Resolution', [new Chord(currentKey, 'maj7')], chordButtonsEl);
    createChordGroup('Modal', progressions.substitutions, chordButtonsEl);
    createChordGroup('Substitution', progressions.dominants, chordButtonsEl);
    createChordGroup('Random', getRandomChords(6), chordButtonsEl);
    return;
  }

  const ngramPreds = getNgramPredictions(fullHistory, 10).filter(p => p.chord.encode() !== currentChord.encode());
  if (ngramPreds.length > 0) {
    const ngramOptions = ngramPreds.slice(0, 8).map(p => ({ chord: p.chord, description: `${p.source} pattern (${p.count}×)` }));
    createChordGroup('N-gram', ngramOptions, chordButtonsEl);
  }

  const nextOptions = getNextChords(currentChord, currentKey);
  const grouped = { current: [], diatonic: [], resolution: [], modal: [], substitution: [] };
  nextOptions.forEach(opt => {
    const cat = opt.category || 'diatonic';
    if (cat === 'diatonic' || cat === 'turnaround' || cat === 'secondary') grouped.diatonic.push(opt);
    else if (cat === 'resolution' || cat === 'plagal' || cat === 'backdoor') grouped.resolution.push(opt);
    else if (cat === 'modal' || cat === 'deceptive') grouped.modal.push(opt);
    else if (cat === 'substitution' || cat === 'altered') grouped.substitution.push(opt);
    else grouped.diatonic.push(opt);
  });

  createChordGroup('Current', getVariations(currentChord), chordButtonsEl);
  const progressions = getCommonProgressions(currentKey);
  if (grouped.diatonic.length === 0) grouped.diatonic = progressions.diatonic.map(c => ({ chord: c }));
  if (grouped.resolution.length === 0) grouped.resolution = [{ chord: new Chord(currentKey, 'maj7') }, { chord: new Chord(currentKey, '6') }];
  if (grouped.modal.length === 0) grouped.modal = progressions.substitutions.slice(2).map(c => ({ chord: c }));
  if (grouped.substitution.length === 0) grouped.substitution = progressions.dominants.map(c => ({ chord: c }));
  createChordGroup('Diatonic', grouped.diatonic, chordButtonsEl);
  createChordGroup('Resolution', grouped.resolution, chordButtonsEl);
  createChordGroup('Modal', grouped.modal, chordButtonsEl);
  createChordGroup('Substitution', grouped.substitution, chordButtonsEl);
  createChordGroup('Random', getRandomChords(6), chordButtonsEl);
}

async function startAudio() {
  if (audio) return;
  startBtn.textContent = '⏳';
  startBtn.disabled = true;
  audio = new AudioEngine(NUM_VOICES, 0.2);
  await audio.init();
  audio.setChordVolume(parseInt(volChordSlider.value));
  audio.setBassVolume(parseInt(volBassSlider.value));
  audio.setTouchVolume(parseInt(volPianoSlider.value));
  audio.setBassEnabled(bassToggle.classList.contains('active'));
  touchAudio = null;
  playChord(new Chord(currentKey, 'maj7'));
  startBtn.textContent = '■';
  startBtn.classList.add('playing');
  startBtn.disabled = false;
}

function stopAudio() {
  if (!audio) return;
  audio.stop();
  if (audio.touchSynths.length > 0) touchAudio = audio;
  audio = null;
  currentChord = null;
  controller.reset();
  startBtn.textContent = '▶';
  startBtn.classList.remove('playing');
  chordDisplayContainerEl.classList.add('inactive');
  chordNameEl.textContent = '—';
  sheetMusicEl.innerHTML = '';
  chordHistoryEl.innerHTML = '';
  highlightKeys(pianoEl, []);
  buildChordUI();
}

function toggleAudio() { audio ? stopAudio() : startAudio(); }


function shiftOctave(direction) {
  if (!controller.currentVoicing || controller.currentVoicing.length === 0) return;
  const shift = direction * 12;
  const newVoicing = controller.currentVoicing.map(n => n + shift).filter(n => n >= 36 && n <= 96);
  if (newVoicing.length !== controller.currentVoicing.length) return;
  controller.currentVoicing = newVoicing;
  if (audio) audio.glideTo(newVoicing, currentChord?.root ?? null);
  updateSheetMusicDisplay();
  highlightKeys(pianoEl, newVoicing);
  if (fullHistory.length > 0) {
    fullHistory[fullHistory.length - 1].voicing = newVoicing.slice();
    saveHistory();
    renderTimeline();
  }
}

function shiftInversion(direction) {
  if (!controller.currentVoicing || controller.currentVoicing.length < 2) return;
  const sorted = [...controller.currentVoicing].sort((a, b) => a - b);
  let newVoicing;
  if (direction > 0) {
    const lowest = sorted[0];
    newVoicing = [...sorted.slice(1), lowest + 12];
  } else {
    const highest = sorted[sorted.length - 1];
    newVoicing = [highest - 12, ...sorted.slice(0, -1)];
  }
  newVoicing = newVoicing.filter(n => n >= 36 && n <= 96).sort((a, b) => a - b);
  if (newVoicing.length !== controller.currentVoicing.length) return;
  controller.currentVoicing = newVoicing;
  if (audio) audio.glideTo(newVoicing, currentChord?.root ?? null);
  updateSheetMusicDisplay();
  highlightKeys(pianoEl, newVoicing);
  if (fullHistory.length > 0) {
    fullHistory[fullHistory.length - 1].voicing = newVoicing.slice();
    saveHistory();
    renderTimeline();
  }
}

function resetVoicing() {
  if (!currentChord) return;
  controller.reset();
  const voicing = controller.getVoicing(currentChord);
  if (audio) audio.glideTo(voicing, currentChord.root);
  updateSheetMusicDisplay();
  highlightKeys(pianoEl, voicing);
  if (fullHistory.length > 0) {
    fullHistory[fullHistory.length - 1].voicing = voicing.slice();
    saveHistory();
    renderTimeline();
  }
}

function getTouchEngine() { return audio || touchAudio; }

async function ensureTouchAudio() {
  if (touchAudio) return touchAudio;
  touchAudio = new AudioEngine(NUM_VOICES, 0.2);
  await touchAudio.init();
  touchAudio.setTouchVolume(parseInt(volPianoSlider.value));
  return touchAudio;
}

function startNoteDrag(midi) {
  if (!audio || !controller.currentVoicing || controller.currentVoicing.length === 0) return false;
  const noteIndex = controller.currentVoicing.indexOf(midi);
  if (noteIndex === -1) return false;
  isDragging = true;
  dragStartVoicing = [...controller.currentVoicing];
  dragNoteIndex = noteIndex;
  lastDragMidi = midi;
  document.body.style.cursor = 'ew-resize';
  return true;
}

function updateNoteDrag(newMidi) {
  if (!isDragging || dragNoteIndex === -1) return;
  if (newMidi === lastDragMidi) return;
  if (newMidi < 36 || newMidi > 96) return;
  if (controller.currentVoicing.includes(newMidi) && newMidi !== lastDragMidi) return;
  lastDragMidi = newMidi;
  const newVoicing = [...controller.currentVoicing];
  newVoicing[dragNoteIndex] = newMidi;
  newVoicing.sort((a, b) => a - b);
  dragNoteIndex = newVoicing.indexOf(newMidi);
  controller.currentVoicing = newVoicing;
  const detectedChord = updateChordSymbol(newVoicing);
  if (detectedChord) currentChord = detectedChord;
  audio.glideTo(newVoicing, currentChord?.root ?? null);
  updateSheetMusicDisplay();
  highlightKeys(pianoEl, newVoicing);
}

function endNoteDrag() {
  if (!isDragging) return;
  const changed = !dragStartVoicing.every(m => controller.currentVoicing.includes(m)) ||
                  !controller.currentVoicing.every(m => dragStartVoicing.includes(m));
  if (changed && fullHistory.length > 0) {
    const lastEntry = fullHistory[fullHistory.length - 1];
    if (lastEntry.chord.symbol === currentChord?.symbol) {
      const updatedVoicing = controller.currentVoicing.slice();
      if (bassToggle.classList.contains('active') && currentChord) {
        const bassNote = 36 + currentChord.root;
        if (!updatedVoicing.includes(bassNote)) updatedVoicing.unshift(bassNote);
      }
      lastEntry.voicing = updatedVoicing;
      saveHistory();
      renderTimeline();
    }
  }
  isDragging = false;
  dragStartVoicing = null;
  dragNoteIndex = -1;
  lastDragMidi = -1;
  document.body.style.cursor = '';
}

function isInCurrentVoicing(midi) { return controller.currentVoicing && controller.currentVoicing.includes(midi); }

function getMidiFromPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  const key = el?.closest('[data-midi]');
  return key ? parseInt(key.dataset.midi) : null;
}

async function midiNoteOn(midi) {
  const engine = getTouchEngine() || await ensureTouchAudio();
  if (!engine) return;
  if (engine.touchNoteOn(midi)) {
    pressedKeys.add(midi);
    const keyEl = pianoEl.querySelector(`[data-midi="${midi}"]`);
    if (keyEl) keyEl.classList.add('playing');
    updateSheetMusicDisplay();
  }
}

function midiNoteOff(midi) {
  if (!pressedKeys.has(midi)) return;
  const engine = getTouchEngine();
  if (engine) engine.touchNoteOff(midi);
  pressedKeys.delete(midi);
  const keyEl = pianoEl.querySelector(`[data-midi="${midi}"]`);
  if (keyEl) keyEl.classList.remove('playing');
  updateSheetMusicDisplay();
}

function clearHistory() {
  stopReplay();
  clearFullHistory();
  currentChord = null;
  controller.reset();
  chordDisplayContainerEl.classList.add('inactive');
  chordNameEl.textContent = '—';
  sheetMusicEl.innerHTML = '';
  highlightKeys(pianoEl, []);
  renderHistory();
  renderTimeline();
  buildChordUI();
  hideContextMenu();
}


function loadSong(parsed) {
  stopReplay();
  const newHistory = [];
  for (const section of parsed.sections) {
    for (const bar of section.chords) {
      for (const chord of bar) {
        if (chord) newHistory.push({ chord, voicing: [] });
      }
    }
  }
  setFullHistory(newHistory);
  renderHistory();
  renderTimeline();
  hideContextMenu();
  if (newHistory.length > 0) jumpToChord(newHistory[0].chord);
}

// Event Listeners
startBtn.addEventListener('click', toggleAudio);
bassToggle.addEventListener('click', () => {
  bassToggle.classList.toggle('active');
  if (audio) audio.setBassEnabled(bassToggle.classList.contains('active'));
});

octaveUpBtn.addEventListener('click', () => shiftOctave(1));
octaveDownBtn.addEventListener('click', () => shiftOctave(-1));
inversionUpBtn.addEventListener('click', () => shiftInversion(1));
inversionDownBtn.addEventListener('click', () => shiftInversion(-1));
voicingResetBtn.addEventListener('click', resetVoicing);

keyboardLeftBtn.addEventListener('click', () => {
  if (pianoStartMidi > PIANO_MIN_START) { pianoStartMidi -= 12; rebuildPiano(); }
});
keyboardRightBtn.addEventListener('click', () => {
  if (pianoStartMidi + pianoKeys - 1 < 108) { pianoStartMidi += 12; rebuildPiano(); }
});

volChordSlider.addEventListener('input', () => { if (audio) audio.setChordVolume(parseInt(volChordSlider.value)); });
volBassSlider.addEventListener('input', () => { if (audio) audio.setBassVolume(parseInt(volBassSlider.value)); });
volPianoSlider.addEventListener('input', () => {
  const engine = getTouchEngine();
  if (engine) engine.setTouchVolume(parseInt(volPianoSlider.value));
});

transposeSelect.addEventListener('change', () => {
  transposeAmount = parseInt(transposeSelect.value);
  if (currentChord) chordNameEl.textContent = getTransposedSymbol(currentChord);
  renderHistory();
  renderTimeline();
  buildChordUI();
});

historyReplayBtn.addEventListener('click', replayHistory);
historyExportBtn.addEventListener('click', exportHistory);
historyImportBtn.addEventListener('click', () => historyFileInput.click());
historyFileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) {
    importHistoryFromFile(e.target.files[0], (imported) => {
      renderHistory();
      renderTimeline();
      hideContextMenu();
      if (imported.length > 0) jumpToChord(imported[0].chord);
    });
  }
  e.target.value = '';
});
historyClearBtn.addEventListener('click', clearHistory);

document.addEventListener('click', (e) => { if (!contextMenu.contains(e.target)) hideContextMenu(); });
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.code === 'Space') { e.preventDefault(); toggleAudio(); }
  else if (e.code === 'Escape') hideContextMenu();
  else if (e.code === 'ArrowRight') { e.preventDefault(); shiftInversion(1); }
  else if (e.code === 'ArrowLeft') { e.preventDefault(); shiftInversion(-1); }
  else if (e.code === 'Period') { e.preventDefault(); resetVoicing(); }
});

// Piano touch events
const touchMidiMap = new Map();

pianoEl.addEventListener('mousedown', async (e) => {
  const key = e.target.closest('[data-midi]');
  if (!key) return;
  const midi = parseInt(key.dataset.midi);
  if (isInCurrentVoicing(midi) && audio && startNoteDrag(midi)) {
    e.preventDefault();
    e.stopPropagation();
  } else {
    await midiNoteOn(midi);
  }
}, { capture: true });

pianoEl.addEventListener('mouseup', (e) => {
  const key = e.target.closest('[data-midi]');
  if (key) midiNoteOff(parseInt(key.dataset.midi));
});

pianoEl.addEventListener('mouseleave', (e) => {
  const key = e.target.closest('[data-midi]');
  if (key) midiNoteOff(parseInt(key.dataset.midi));
});

pianoEl.addEventListener('mouseover', async (e) => {
  if (e.buttons !== 1) return;
  const key = e.target.closest('[data-midi]');
  if (key) await midiNoteOn(parseInt(key.dataset.midi));
});

pianoEl.addEventListener('mouseout', (e) => {
  if (e.buttons !== 1) return;
  const key = e.target.closest('[data-midi]');
  if (key) midiNoteOff(parseInt(key.dataset.midi));
});

document.addEventListener('mousemove', (e) => {
  if (isDragging) {
    e.preventDefault();
    const midi = getMidiFromPoint(e.clientX, e.clientY);
    if (midi !== null) updateNoteDrag(midi);
  }
});
document.addEventListener('mouseup', () => endNoteDrag());

pianoEl.addEventListener('touchstart', (e) => {
  for (const touch of e.changedTouches) {
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const key = el?.closest('[data-midi]');
    if (key) {
      const midi = parseInt(key.dataset.midi);
      touchMidiMap.set(touch.identifier, midi);
      if (isInCurrentVoicing(midi) && audio && startNoteDrag(midi)) {
        e.preventDefault();
        e.stopPropagation();
      } else {
        midiNoteOn(midi);
      }
    }
  }
}, { passive: false, capture: true });

pianoEl.addEventListener('touchend', (e) => {
  for (const touch of e.changedTouches) {
    const midi = touchMidiMap.get(touch.identifier);
    if (midi !== undefined) {
      midiNoteOff(midi);
      touchMidiMap.delete(touch.identifier);
    }
  }
}, { passive: true, capture: true });

document.addEventListener('touchmove', (e) => {
  if (isDragging && e.touches.length === 1) {
    e.preventDefault();
    const midi = getMidiFromPoint(e.touches[0].clientX, e.touches[0].clientY);
    if (midi !== null) updateNoteDrag(midi);
  }
}, { passive: false });
document.addEventListener('touchend', () => endNoteDrag());

// MIDI Support
async function initMIDI() {
  if (!navigator.requestMIDIAccess) return;
  try {
    const midiAccess = await navigator.requestMIDIAccess();
    function onMIDIMessage(e) {
      const [status, note, velocity] = e.data;
      const command = status & 0xf0;
      if (command === 0x90 && velocity > 0) midiNoteOn(note);
      else if (command === 0x80 || (command === 0x90 && velocity === 0)) midiNoteOff(note);
    }
    function connectInputs(access) {
      for (const input of access.inputs.values()) {
        input.onmidimessage = onMIDIMessage;
      }
    }
    connectInputs(midiAccess);
    midiAccess.onstatechange = (e) => {
      if (e.port.type === 'input' && e.port.state === 'connected') {
        e.port.onmidimessage = onMIDIMessage;
      }
    };
  } catch (err) {}
}

// Initialization
initStandards(standardsSearch, standardsResults, loadSong);
initMIDI();
buildChordUI();
renderHistory();
renderTimeline();
