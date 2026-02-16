import { Chord } from './chord-theory.js';

const SCALE_DEGREES = {
  I: 0, bII: 1, II: 2, bIII: 3, III: 4, IV: 5,
  '#IV': 6, bV: 6, V: 7, '#V': 8, bVI: 8, VI: 9, bVII: 10, VII: 11,
};

const PROGRESSION_RULES = {
  'I': [
    { degree: 'II', type: 'm7', category: 'diatonic', name: 'ii-V setup' },
    { degree: 'IV', type: 'maj7', category: 'diatonic', name: 'subdominant' },
    { degree: 'IV', type: 'm', category: 'modal', name: 'iv (minor plagal)' },
    { degree: 'V', type: '7', category: 'diatonic', name: 'dominant' },
    { degree: 'VI', type: 'm7', category: 'diatonic', name: 'relative minor' },
    { degree: 'III', type: 'm7', category: 'diatonic', name: 'mediant' },
    { degree: 'bVII', type: '7', category: 'modal', name: '♭VII (mixolydian)' },
    { degree: 'bIII', type: 'maj7', category: 'modal', name: '♭III (borrowed)' },
    { degree: 'bVI', type: 'maj7', category: 'modal', name: '♭VI (borrowed)' },
    { degree: 'II', type: '7', category: 'substitution', name: 'II7 (V/V)' },
    { degree: 'III', type: '7', category: 'substitution', name: 'III7 (V/vi)' },
    { degree: 'VI', type: '7', category: 'substitution', name: 'VI7 (V/ii)' },
    { degree: 'bVI', type: '7', category: 'substitution', name: '♭VI7 (Coltrane)' },
    { degree: '#IV', type: 'dim7', category: 'substitution', name: '#iv° (to V)' },
  ],
  'ii': [
    { degree: 'V', type: '7', category: 'diatonic', name: 'V7 (ii-V)' },
    { degree: 'V', type: '7b9', category: 'diatonic', name: 'V7♭9' },
    { degree: 'V', type: '7alt', category: 'diatonic', name: 'V7alt' },
    { degree: 'bII', type: '7', category: 'substitution', name: 'tritone sub of V' },
    { degree: 'bV', type: 'dim7', category: 'substitution', name: 'dim approach to V' },
  ],
  'V': [
    { degree: 'I', type: 'maj7', category: 'resolution', name: 'resolve to I' },
    { degree: 'I', type: '', category: 'resolution', name: 'resolve to I (triad)' },
    { degree: 'VI', type: 'm7', category: 'deceptive', name: 'deceptive to vi' },
    { degree: 'bVI', type: 'maj7', category: 'deceptive', name: 'deceptive to ♭VI' },
    { degree: 'IV', type: 'maj7', category: 'backdoor', name: 'backdoor IV' },
    { degree: 'II', type: 'm7', category: 'turnaround', name: 'back to ii' },
    { degree: 'bII', type: '7', category: 'substitution', name: 'tritone sub' },
  ],
  'IV': [
    { degree: 'IV', type: 'm', category: 'modal', name: 'IV → iv' },
    { degree: 'V', type: '7', category: 'diatonic', name: 'to dominant' },
    { degree: 'I', type: 'maj7', category: 'plagal', name: 'plagal to I' },
    { degree: 'II', type: 'm7', category: 'diatonic', name: 'to ii' },
    { degree: 'bVII', type: '7', category: 'modal', name: 'backdoor dominant' },
  ],
  'iv': [
    { degree: 'I', type: 'maj7', category: 'plagal', name: 'minor plagal to I' },
    { degree: 'V', type: '7', category: 'diatonic', name: 'to dominant' },
    { degree: 'bVII', type: '7', category: 'modal', name: 'backdoor dominant' },
    { degree: 'bVI', type: 'maj7', category: 'modal', name: 'to ♭VI' },
  ],
  'vi': [
    { degree: 'II', type: 'm7', category: 'diatonic', name: 'to ii' },
    { degree: 'IV', type: 'maj7', category: 'diatonic', name: 'to IV' },
    { degree: 'V', type: '7', category: 'diatonic', name: 'to V' },
    { degree: 'III', type: '7', category: 'secondary', name: 'V/vi (secondary dom)' },
  ],
  'bVII': [
    { degree: 'I', type: 'maj7', category: 'resolution', name: 'backdoor resolve' },
    { degree: 'IV', type: 'maj7', category: 'diatonic', name: 'to IV' },
    { degree: 'bVI', type: 'maj7', category: 'modal', name: 'to ♭VI' },
  ],
  'bVI': [
    { degree: 'bVII', type: '7', category: 'modal', name: 'to ♭VII' },
    { degree: 'V', type: '7', category: 'diatonic', name: 'to V' },
    { degree: 'I', type: 'maj7', category: 'resolution', name: 'to I' },
    { degree: 'IV', type: 'm7', category: 'modal', name: 'to iv' },
  ],
  'bII': [
    { degree: 'I', type: 'maj7', category: 'resolution', name: 'resolve to I' },
    { degree: 'bVI', type: 'maj7', category: 'deceptive', name: 'deceptive to ♭VI' },
    { degree: 'V', type: '7', category: 'substitution', name: 'V7 (original dom)' },
  ],
  'any': [
    { degree: 'II', type: 'm7', category: 'diatonic', name: 'ii (reorient)' },
    { degree: 'V', type: '7', category: 'diatonic', name: 'V7 (reorient)' },
    { degree: 'I', type: 'maj7', category: 'resolution', name: 'I (home)' },
    { degree: 'IV', type: 'maj7', category: 'diatonic', name: 'IV' },
    { degree: 'bVII', type: '7', category: 'modal', name: '♭VII' },
    { degree: 'bVI', type: 'maj7', category: 'modal', name: '♭VI' },
  ],
};

function getChordFunction(chordRoot, keyRoot, chordType) {
  const degree = (chordRoot - keyRoot + 12) % 12;
  const isMinor = chordType.includes('m') && !chordType.includes('maj');
  const isDom = chordType.includes('7') && !chordType.includes('maj') && !isMinor;
  const isDim = chordType.includes('dim');

  if (degree === 0) return 'I';
  if (degree === 1 && isDom) return 'bII';
  if (degree === 2 && isMinor) return 'ii';
  if (degree === 2 && isDom) return 'II';
  if (degree === 3) return 'bIII';
  if (degree === 4 && isMinor) return 'iii';
  if (degree === 5 && isMinor) return 'iv';
  if (degree === 5) return 'IV';
  if (degree === 6 && isDim) return '#iv';
  if (degree === 7) return 'V';
  if (degree === 8) return 'bVI';
  if (degree === 9 && isMinor) return 'vi';
  if (degree === 9 && isDom) return 'VI';
  if (degree === 10) return 'bVII';

  return 'any';
}

export function getNextChords(currentChord, keyRoot = 0) {
  const func = getChordFunction(currentChord.root, keyRoot, currentChord.type);
  const rules = PROGRESSION_RULES[func] || PROGRESSION_RULES['I'];

  return rules.map(rule => {
    const newRoot = (keyRoot + SCALE_DEGREES[rule.degree]) % 12;
    const chord = new Chord(newRoot, rule.type);
    return { chord, category: rule.category, description: rule.name };
  });
}

export function getCommonProgressions(keyRoot = 0) {
  return {
    diatonic: [
      new Chord(keyRoot, 'maj7'),
      new Chord((keyRoot + 2) % 12, 'm7'),
      new Chord((keyRoot + 4) % 12, 'm7'),
      new Chord((keyRoot + 5) % 12, 'maj7'),
      new Chord((keyRoot + 7) % 12, '7'),
      new Chord((keyRoot + 9) % 12, 'm7'),
    ],
    dominants: [
      new Chord((keyRoot + 7) % 12, '7'),
      new Chord((keyRoot + 7) % 12, '9'),
      new Chord((keyRoot + 7) % 12, '7b9'),
      new Chord((keyRoot + 7) % 12, '7#9'),
      new Chord((keyRoot + 7) % 12, '7alt'),
    ],
    substitutions: [
      new Chord((keyRoot + 1) % 12, '7'),
      new Chord((keyRoot + 10) % 12, '7'),
      new Chord((keyRoot + 3) % 12, 'maj7'),
      new Chord((keyRoot + 8) % 12, 'maj7'),
      new Chord((keyRoot + 5) % 12, 'm7'),
      new Chord((keyRoot + 6) % 12, 'dim7'),
      new Chord((keyRoot + 1) % 12, 'maj7'),
    ],
  };
}

export function getRandomChords(count = 6) {
  const types = ['maj7', 'm7', '7', 'm7b5', 'dim7', '9', 'm9', '7b9', '7#9'];
  const chords = [];
  for (let i = 0; i < count; i++) {
    const root = Math.floor(Math.random() * 12);
    const type = types[Math.floor(Math.random() * types.length)];
    chords.push(new Chord(root, type));
  }
  return chords;
}

