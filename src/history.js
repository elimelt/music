import { Chord } from './chord-theory.js';

const STORAGE_KEY = 'voiceLeadingSynth_chordHistory_v2';
const MAX_VISIBLE_HISTORY = 4;

export let fullHistory = [];
export let chordHistory = [];

export function loadHistory() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      fullHistory = parsed.map(item => ({
        chord: new Chord(item.root, item.quality),
        voicing: item.voicing || []
      }));
      chordHistory = fullHistory.slice(-MAX_VISIBLE_HISTORY).map(h => h.chord);
    }
  } catch (e) {
    fullHistory = [];
    chordHistory = [];
  }
}

export function saveHistory() {
  try {
    const toSave = fullHistory.map(h => ({
      root: h.chord.root,
      quality: h.chord.type,
      voicing: h.voicing
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {}
}

export function addToHistory(chord, voicing = [], bassEnabled = false) {
  if (!chord) return;
  if (fullHistory.length > 0 && fullHistory[fullHistory.length - 1].chord.symbol === chord.symbol) return;

  const storedVoicing = voicing.slice();
  if (bassEnabled) {
    const bassNote = 36 + chord.root;
    if (!storedVoicing.includes(bassNote)) storedVoicing.unshift(bassNote);
  }

  fullHistory.push({ chord, voicing: storedVoicing });
  saveHistory();

  chordHistory.push(chord);
  if (chordHistory.length > MAX_VISIBLE_HISTORY) chordHistory.shift();
}

export function clearFullHistory() {
  fullHistory = [];
  chordHistory = [];
  saveHistory();
}

export function setFullHistory(newHistory) {
  fullHistory = newHistory;
  chordHistory = fullHistory.slice(-MAX_VISIBLE_HISTORY).map(h => h.chord);
  saveHistory();
}

export function exportHistory() {
  const data = {
    history: fullHistory.map(h => ({
      chord: h.chord.encode(),
      voicing: h.voicing
    })),
    timestamp: Date.now()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chord-history-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importHistoryFromFile(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.history && Array.isArray(data.history)) {
        const imported = data.history.map(item => {
          if (typeof item === 'string') {
            const [root, type] = item.split(':');
            return { chord: new Chord(parseInt(root), type || ''), voicing: [] };
          }
          const [root, type] = item.chord.split(':');
          return { chord: new Chord(parseInt(root), type || ''), voicing: item.voicing || [] };
        });
        setFullHistory(imported);
        if (callback) callback(imported);
      }
    } catch (err) {
      console.error('Failed to import:', err);
    }
  };
  reader.readAsText(file);
}

