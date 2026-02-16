const NOTE_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const TONE_NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const INTERVALS = {
  ROOT: 0, MINOR_2ND: 1, MAJOR_2ND: 2, MINOR_3RD: 3, MAJOR_3RD: 4,
  PERFECT_4TH: 5, TRITONE: 6, PERFECT_5TH: 7, MINOR_6TH: 8, MAJOR_6TH: 9,
  MINOR_7TH: 10, MAJOR_7TH: 11, OCTAVE: 12,
  FLAT_9TH: 13, NINTH: 14, SHARP_9TH: 15, ELEVENTH: 17, SHARP_11TH: 18,
  FLAT_13TH: 20, THIRTEENTH: 21,
};

const TRIAD = {
  major: [0, 4, 7], minor: [0, 3, 7], diminished: [0, 3, 6],
  augmented: [0, 4, 8], sus2: [0, 2, 7], sus4: [0, 5, 7],
};

export function triad(type) { return [...(TRIAD[type] || TRIAD.major)]; }

export function add7th(intervals, type = 'dominant') {
  const seventh = { major: 11, dominant: 10, minor: 10, diminished: 9 };
  return [...intervals, seventh[type] ?? 10];
}

export function extend(intervals, degree) {
  const extensions = { 9: 14, 11: 17, 13: 21 };
  return extensions[degree] ? [...intervals, extensions[degree]] : intervals;
}

export function alter(intervals, alterations) {
  const result = [...intervals];
  const altMap = {
    'b5': { from: 7, to: 6 }, '#5': { from: 7, to: 8 },
    'b9': { add: 13 }, '#9': { add: 15 }, 'b13': { add: 20 }, '#11': { add: 18 },
  };
  alterations.forEach(alt => {
    const rule = altMap[alt];
    if (rule) {
      if (rule.from !== undefined) {
        const idx = result.indexOf(rule.from);
        if (idx !== -1) result[idx] = rule.to;
      }
      if (rule.add !== undefined && !result.includes(rule.add)) result.push(rule.add);
    }
  });
  return result.sort((a, b) => a - b);
}

export const CHORD_TYPES = {
  '': { intervals: triad('major'), symbol: '', category: 'triad' },
  'm': { intervals: triad('minor'), symbol: 'm', category: 'triad' },
  'dim': { intervals: triad('diminished'), symbol: '°', category: 'triad' },
  'aug': { intervals: triad('augmented'), symbol: '+', category: 'triad' },
  'sus2': { intervals: [0, 2, 7], symbol: 'sus2', category: 'triad' },
  'sus4': { intervals: triad('sus4'), symbol: 'sus4', category: 'triad' },
  'sus': { intervals: triad('sus4'), symbol: 'sus', category: 'triad' },
  'maj7': { intervals: add7th(triad('major'), 'major'), symbol: 'Δ7', category: 'seventh' },
  '7': { intervals: add7th(triad('major'), 'dominant'), symbol: '7', category: 'dominant' },
  'm7': { intervals: add7th(triad('minor'), 'minor'), symbol: 'm7', category: 'seventh' },
  'm7b5': { intervals: add7th(triad('diminished'), 'minor'), symbol: 'ø7', category: 'seventh' },
  'dim7': { intervals: add7th(triad('diminished'), 'diminished'), symbol: '°7', category: 'seventh' },
  'mMaj7': { intervals: add7th(triad('minor'), 'major'), symbol: 'mΔ7', category: 'seventh' },
  '7sus4': { intervals: [0, 5, 7, 10], symbol: '7sus4', category: 'dominant' },
  '7sus': { intervals: [0, 5, 7, 10], symbol: '7sus', category: 'dominant' },
  'add9': { intervals: [0, 4, 7, 14], symbol: 'add9', category: 'triad' },
  'madd9': { intervals: [0, 3, 7, 14], symbol: 'm(add9)', category: 'triad' },
  '6': { intervals: [0, 4, 7, 9], symbol: '6', category: 'sixth' },
  'm6': { intervals: [0, 3, 7, 9], symbol: 'm6', category: 'sixth' },
  '69': { intervals: [0, 4, 7, 9, 14], symbol: '6/9', category: 'sixth' },
  'm69': { intervals: [0, 3, 7, 9, 14], symbol: 'm6/9', category: 'sixth' },
  'maj7#11': { intervals: [0, 4, 7, 11, 18], symbol: 'Δ7♯11', category: 'extended' },
  'maj7#5': { intervals: [0, 4, 8, 11], symbol: 'Δ7♯5', category: 'extended' },
  'maj9': { intervals: extend(add7th(triad('major'), 'major'), 9), symbol: 'Δ9', category: 'extended' },
  'maj9#11': { intervals: [0, 4, 7, 11, 14, 18], symbol: 'Δ9♯11', category: 'extended' },
  'maj13': { intervals: [0, 4, 7, 11, 14, 21], symbol: 'Δ13', category: 'extended' },
  '9': { intervals: extend(add7th(triad('major'), 'dominant'), 9), symbol: '9', category: 'dominant' },
  'm9': { intervals: extend(add7th(triad('minor'), 'minor'), 9), symbol: 'm9', category: 'extended' },
  '9sus': { intervals: [0, 5, 7, 10, 14], symbol: '9sus', category: 'dominant' },
  '9#11': { intervals: [0, 4, 7, 10, 14, 18], symbol: '9♯11', category: 'dominant' },
  '9#5': { intervals: [0, 4, 8, 10, 14], symbol: '9♯5', category: 'altered' },
  '9b5': { intervals: [0, 4, 6, 10, 14], symbol: '9♭5', category: 'altered' },
  '11': { intervals: extend(extend(add7th(triad('major'), 'dominant'), 9), 11), symbol: '11', category: 'dominant' },
  'm11': { intervals: extend(extend(add7th(triad('minor'), 'minor'), 9), 11), symbol: 'm11', category: 'extended' },
  '13': { intervals: [0, 4, 7, 10, 14, 21], symbol: '13', category: 'dominant' },
  '13#11': { intervals: [0, 4, 7, 10, 14, 18, 21], symbol: '13♯11', category: 'dominant' },
  '13#9': { intervals: [0, 4, 7, 10, 15, 21], symbol: '13♯9', category: 'altered' },
  '13b9': { intervals: [0, 4, 7, 10, 13, 21], symbol: '13♭9', category: 'altered' },
  '13sus': { intervals: [0, 5, 7, 10, 14, 21], symbol: '13sus', category: 'dominant' },
  '7b5': { intervals: alter(add7th(triad('major'), 'dominant'), ['b5']), symbol: '7♭5', category: 'altered' },
  '7#5': { intervals: alter(add7th(triad('major'), 'dominant'), ['#5']), symbol: '7♯5', category: 'altered' },
  '7b9': { intervals: alter(add7th(triad('major'), 'dominant'), ['b9']), symbol: '7♭9', category: 'altered' },
  '7#9': { intervals: alter(add7th(triad('major'), 'dominant'), ['#9']), symbol: '7♯9', category: 'altered' },
  '7#11': { intervals: [0, 4, 7, 10, 18], symbol: '7♯11', category: 'dominant' },
  '7b13': { intervals: [0, 4, 7, 10, 20], symbol: '7♭13', category: 'altered' },
  '7b9#11': { intervals: [0, 4, 7, 10, 13, 18], symbol: '7♭9♯11', category: 'altered' },
  '7#9#11': { intervals: [0, 4, 7, 10, 15, 18], symbol: '7♯9♯11', category: 'altered' },
  '7b5#9': { intervals: [0, 4, 6, 10, 15], symbol: '7♭5♯9', category: 'altered' },
  '7b5b9': { intervals: [0, 4, 6, 10, 13], symbol: '7♭5♭9', category: 'altered' },
  '7#5#9': { intervals: [0, 4, 8, 10, 15], symbol: '7♯5♯9', category: 'altered' },
  '7b9#5': { intervals: [0, 4, 8, 10, 13], symbol: '7♭9♯5', category: 'altered' },
  '7b9b13': { intervals: [0, 4, 7, 10, 13, 20], symbol: '7♭9♭13', category: 'altered' },
  '7b9sus': { intervals: [0, 5, 7, 10, 13], symbol: '7♭9sus', category: 'altered' },
  '7b13sus': { intervals: [0, 5, 7, 10, 20], symbol: '7♭13sus', category: 'altered' },
  '7alt': { intervals: alter(add7th(triad('major'), 'dominant'), ['b5', '#5', 'b9', '#9']), symbol: '7alt', category: 'altered' },
  'm7b9': { intervals: [0, 3, 7, 10, 13], symbol: 'm7♭9', category: 'extended' },
  'mb6': { intervals: [0, 3, 7, 8], symbol: 'm♭6', category: 'triad' },
  'maug': { intervals: [0, 3, 8], symbol: 'm+', category: 'triad' },
};

export class Chord {
  constructor(root, type = '') {
    this.root = root % 12;
    this.type = type;
    this.typeData = CHORD_TYPES[type] || CHORD_TYPES[''];
  }
  get intervals() { return this.typeData.intervals; }
  get pitchClasses() { return this.intervals.map(i => (this.root + i) % 12); }
  get symbol() { return NOTE_NAMES[this.root] + this.typeData.symbol; }
  get category() { return this.typeData.category; }
  encode() { return `${this.root}:${this.type}`; }
  static decode(encoded) {
    const [root, type] = encoded.split(':');
    return new Chord(parseInt(root), type || '');
  }
}

const VARIATION_GROUPS = {
  major: ['', 'maj7', 'maj9', '6', 'add9', 'sus2', 'sus4'],
  minor: ['m', 'm7', 'm9', 'm6', 'madd9', 'm11'],
  dominant: ['7', '9', '11', '13', '7sus4', '7b9', '7#9', '7alt'],
};

export function getVariations(chord) {
  const typeData = CHORD_TYPES[chord.type] || CHORD_TYPES[''];
  let group;
  if (chord.type.includes('m') && !chord.type.includes('maj')) group = VARIATION_GROUPS.minor;
  else if (typeData.category === 'dominant' || typeData.category === 'altered') group = VARIATION_GROUPS.dominant;
  else group = VARIATION_GROUPS.major;
  return group.map(type => new Chord(chord.root, type));
}

function matchChordType(intervals) {
  const normalized = [...new Set(intervals)].sort((a, b) => a - b);
  let bestMatch = null;
  let bestScore = -1;
  for (const [type, data] of Object.entries(CHORD_TYPES)) {
    const typeIntervals = data.intervals.map(i => i % 12);
    const matches = normalized.filter(i => typeIntervals.includes(i)).length;
    const score = matches / Math.max(normalized.length, typeIntervals.length);
    if (score > bestScore) { bestScore = score; bestMatch = type; }
  }
  return { type: bestMatch, score: bestScore };
}

export function detect(pitchClasses) {
  const pcs = [...new Set(pitchClasses.map(p => p % 12))];
  let bestResult = null;
  let bestScore = -1;
  for (const root of pcs) {
    const intervals = pcs.map(p => (p - root + 12) % 12).sort((a, b) => a - b);
    const match = matchChordType(intervals);
    if (match.score > bestScore) {
      bestScore = match.score;
      bestResult = { root, type: match.type, intervals, score: match.score };
    }
  }
  return bestResult ? new Chord(bestResult.root, bestResult.type) : null;
}

export { NOTE_NAMES, TONE_NOTE_NAMES, INTERVALS };

