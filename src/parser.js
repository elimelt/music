import { Chord, CHORD_TYPES } from './chord-theory.js';

const ROOT_MAP = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'Fb': 4, 'E#': 5,
  'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11
};

const QUALITY_ALIASES = {
  '0': 'dim', '07': 'dim7', 'o': 'dim', 'o7': 'dim7', 'ø': 'm7b5', 'ø7': 'm7b5',
  '+': 'aug', '+7': '7#5', 'Δ': 'maj7', 'Δ7': 'maj7', 'Δ9': 'maj9',
  '-': 'm', '-7': 'm7', '-9': 'm9', '-11': 'm11',
  'm/maj7': 'mMaj7', 'minmaj7': 'mMaj7', 'mmaj7': 'mMaj7',
  'min': 'm', 'min7': 'm7', 'min9': 'm9', 'min11': 'm11', 'min6': 'm6',
  'M7': 'maj7', 'M9': 'maj9', 'M13': 'maj13',
  'dom7': '7', 'dom9': '9', 'dom13': '13',
};

function simplifyQuality(q) {
  if (q.startsWith('maj13')) return 'maj13';
  if (q.startsWith('maj9#11')) return 'maj9#11';
  if (q.startsWith('maj9')) return 'maj9';
  if (q.startsWith('maj7#11')) return 'maj7#11';
  if (q.startsWith('maj7#5')) return 'maj7#5';
  if (q.startsWith('maj7')) return 'maj7';
  if (q.startsWith('m7b5')) return 'm7b5';
  if (q.startsWith('m69')) return 'm69';
  if (q.startsWith('m6')) return 'm6';
  if (q.startsWith('m11')) return 'm11';
  if (q.startsWith('m9')) return 'm9';
  if (q.startsWith('m7')) return 'm7';
  if (q === 'm' || q.startsWith('m(')) return 'm';
  if (q.startsWith('13#11')) return '13#11';
  if (q.startsWith('13#9')) return '13#9';
  if (q.startsWith('13b9')) return '13b9';
  if (q.startsWith('13sus')) return '13sus';
  if (q.startsWith('13')) return '13';
  if (q.startsWith('11')) return '11';
  if (q.startsWith('9#11')) return '9#11';
  if (q.startsWith('9#5')) return '9#5';
  if (q.startsWith('9b5')) return '9b5';
  if (q.startsWith('9sus')) return '9sus';
  if (q.startsWith('9')) return '9';
  if (q.startsWith('7b9b13')) return '7b9b13';
  if (q.startsWith('7b9#11')) return '7b9#11';
  if (q.startsWith('7b9#5')) return '7b9#5';
  if (q.startsWith('7b9sus')) return '7b9sus';
  if (q.startsWith('7b9')) return '7b9';
  if (q.startsWith('7#9#11')) return '7#9#11';
  if (q.startsWith('7#9')) return '7#9';
  if (q.startsWith('7#11')) return '7#11';
  if (q.startsWith('7b13sus')) return '7b13sus';
  if (q.startsWith('7b13')) return '7b13';
  if (q.startsWith('7b5#9')) return '7b5#9';
  if (q.startsWith('7b5b9')) return '7b5b9';
  if (q.startsWith('7b5')) return '7b5';
  if (q.startsWith('7#5#9')) return '7#5#9';
  if (q.startsWith('7#5')) return '7#5';
  if (q.startsWith('7alt')) return '7alt';
  if (q.startsWith('7sus')) return '7sus';
  if (q.startsWith('7')) return '7';
  if (q.startsWith('69')) return '69';
  if (q.startsWith('6')) return '6';
  if (q === '0' || q.startsWith('0/') || q.startsWith('0(')) return 'dim';
  if (q.startsWith('07')) return 'dim7';
  if (q.startsWith('aug')) return 'aug';
  if (q.startsWith('add9')) return 'add9';
  if (q === 'sus' || q.startsWith('sus(')) return 'sus';
  if (q.startsWith('sus4')) return 'sus4';
  if (q.startsWith('sus2')) return 'sus2';
  return '';
}

export function parseChordSymbol(symbol) {
  if (!symbol || symbol === 'NC' || symbol === 'N.C.' || symbol === '') return null;

  let str = symbol.trim();
  if (str.startsWith('(')) str = str.slice(1);
  if (str.includes('(')) str = str.split('(')[0];

  const rootMatch = str.match(/^([A-G][#b]?)/);
  if (!rootMatch) return null;

  const rootStr = rootMatch[1];
  const root = ROOT_MAP[rootStr];
  if (root === undefined) return null;

  let quality = str.slice(rootStr.length);
  const slashIdx = quality.indexOf('/');
  if (slashIdx !== -1) quality = quality.slice(0, slashIdx);

  if (QUALITY_ALIASES[quality]) quality = QUALITY_ALIASES[quality];
  if (CHORD_TYPES[quality]) return new Chord(root, quality);

  const simplified = simplifyQuality(quality);
  if (CHORD_TYPES[simplified]) return new Chord(root, simplified);

  return new Chord(root, '');
}

export function parseJazzStandard(song) {
  const sections = [];
  if (!song.Sections) return { title: song.Title, composer: song.Composer, sections };

  for (const section of song.Sections) {
    const chords = [];
    if (section.MainSegment?.Chords) {
      const bars = section.MainSegment.Chords.split('|');
      for (const bar of bars) {
        const barChords = bar.split(',').map(c => parseChordSymbol(c.trim())).filter(Boolean);
        if (barChords.length > 0) chords.push(barChords);
      }
    }
    if (section.Endings) {
      for (const ending of section.Endings) {
        if (ending.Chords) {
          const bars = ending.Chords.split('|');
          for (const bar of bars) {
            const barChords = bar.split(',').map(c => parseChordSymbol(c.trim())).filter(Boolean);
            if (barChords.length > 0) chords.push(barChords);
          }
        }
      }
    }
    sections.push({ label: section.Label, chords });
  }
  return { title: song.Title, composer: song.Composer, key: song.Key, rhythm: song.Rhythm, sections };
}

