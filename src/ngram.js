import { Chord } from './chord-theory.js';
import ngramDataRaw from './ngrams.json';

let ngramData = ngramDataRaw;

function simplifyQualityForNgram(q) {
  if (!q) return 'maj';
  q = q.replace(/\(.*\)/, '');
  if (q === 'm' || q === 'min') return 'm';
  if (q === 'M7') return 'maj7';
  if (q === 'M9') return 'maj9';
  if (q === 'M13') return 'maj13';
  if (q === 'dim7' || q === 'o7' || q === '°7') return 'dim7';
  if (q === 'dim' || q === 'o' || q === '°') return 'dim';
  if (q === 'aug7' || q === '+7') return 'aug7';
  if (q === 'aug' || q === '+') return 'aug';
  return q;
}

function buildNgramKey(chords, baseRoot) {
  return chords.map(c => {
    const interval = ((c.root - baseRoot) % 12 + 12) % 12;
    return `${interval}:${simplifyQualityForNgram(c.type)}`;
  }).join('|');
}

function addNgramResults(results, seen, data, baseRoot, source, limit) {
  if (!data) return;
  for (const [encoded, count] of data) {
    if (results.length >= limit) break;
    const [intStr, quality] = encoded.split(':');
    const interval = parseInt(intStr);
    const root = (baseRoot + interval) % 12;
    const chord = new Chord(root, quality);
    const key = chord.encode();
    if (!seen.has(key)) {
      seen.add(key);
      results.push({ chord, count, source });
    }
  }
}

export function getNgramPredictions(history, limit = 8) {
  if (!ngramData || history.length === 0) return [];
  const chordHistory = history.map(h => h.chord || h);
  const results = [];
  const seen = new Set();

  if (chordHistory.length >= 4 && ngramData.fivegrams) {
    const chords = chordHistory.slice(-4);
    const baseRoot = chords[0].root;
    const key = buildNgramKey(chords, baseRoot);
    addNgramResults(results, seen, ngramData.fivegrams[key], baseRoot, '5-gram', limit);
  }

  if (results.length < limit && chordHistory.length >= 3 && ngramData.fourgrams) {
    const chords = chordHistory.slice(-3);
    const baseRoot = chords[0].root;
    const key = buildNgramKey(chords, baseRoot);
    addNgramResults(results, seen, ngramData.fourgrams[key], baseRoot, '4-gram', limit);
  }

  if (results.length < limit && chordHistory.length >= 2) {
    const chords = chordHistory.slice(-2);
    const baseRoot = chords[0].root;
    const key = buildNgramKey(chords, baseRoot);
    addNgramResults(results, seen, ngramData.trigrams[key], baseRoot, '3-gram', limit);
  }

  if (results.length < limit) {
    const lastChord = chordHistory[chordHistory.length - 1];
    const key = `0:${simplifyQualityForNgram(lastChord.type)}`;
    addNgramResults(results, seen, ngramData.bigrams[key], lastChord.root, '2-gram', limit);
  }

  return results;
}

