import { notesToChordSymbol } from 'jazzify';
import { detect as appDetect, Chord, NOTE_NAMES } from './chord-theory.js';

const JAZZIFY_TO_APP_TYPE = {
  'major': '',
  'minor': 'm',
  'major-seventh': 'maj7',
  'minor-seventh': 'm7',
  'dominant-seventh': '7',
  'minor-seventh-flat-five': 'm7b5',
  'half-diminished-seventh': 'm7b5',
  'diminished-seventh': 'dim7',
  'diminished': 'dim',
  'augmented': 'aug',
  'major-ninth': 'maj9',
  'minor-ninth': 'm9',
  'dominant-ninth': '9',
  'major-sixth': '6',
  'minor-sixth': 'm6',
  'suspended-fourth': 'sus4',
  'suspended-second': 'sus2',
  'seventh-suspended-fourth': '7sus4',
  'dominant-seventh-sharp-nine': '7#9',
  'dominant-seventh-flat-nine': '7b9',
  'dominant-seventh-sharp-five': '7#5',
  'dominant-seventh-flat-five': '7b5',
  'major-thirteenth': 'maj13',
  'dominant-thirteenth': '13',
  'minor-eleventh': 'm11',
  'dominant-eleventh': '11',
};

const ROOT_NAME_TO_INDEX = {
  'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
};

function parseJazzifyRoot(rootStr) {
  if (!rootStr || rootStr.length === 0) return null;
  const letter = rootStr[0].toUpperCase();
  let root = ROOT_NAME_TO_INDEX[letter];
  if (root === undefined) return null;
  
  for (let i = 1; i < rootStr.length; i++) {
    if (rootStr[i] === '#' || rootStr[i] === '♯') root++;
    else if (rootStr[i] === 'b' || rootStr[i] === '♭') root--;
  }
  return ((root % 12) + 12) % 12;
}

function parseJazzifySymbol(symbol) {
  if (!symbol) return null;
  const parts = symbol.split('-');
  if (parts.length < 2) return null;
  
  const rootStr = parts[0];
  const root = parseJazzifyRoot(rootStr);
  if (root === null) return null;
  
  const quality = parts.slice(1).join('-');
  const appType = JAZZIFY_TO_APP_TYPE[quality] || '';
  
  return new Chord(root, appType);
}

export function detectChordWithJazzify(midiNotes) {
  if (!midiNotes || midiNotes.length === 0) return null;
  
  try {
    const jazzifyResult = notesToChordSymbol(midiNotes, { format: 'verbose' });
    if (jazzifyResult) {
      const parsed = parseJazzifySymbol(jazzifyResult);
      if (parsed) return { chord: parsed, source: 'jazzify' };
    }
  } catch (e) {}
  
  const appResult = appDetect(midiNotes.map(m => m % 12));
  if (appResult) return { chord: appResult, source: 'app' };
  
  return null;
}

export function detectChordHybrid(midiNotes) {
  const pitchClasses = midiNotes.map(m => m % 12);
  return appDetect(pitchClasses);
}

export function getJazzifySymbol(midiNotes) {
  try {
    return notesToChordSymbol(midiNotes, { format: 'verbose' });
  } catch (e) {
    return null;
  }
}

export { notesToChordSymbol };

