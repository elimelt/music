import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, ChordSymbol, StaveConnector } from 'vexflow';

const NOTE_LETTERS = ['c', 'c', 'd', 'd', 'e', 'f', 'f', 'g', 'g', 'a', 'a', 'b'];
const NOTE_ACCIDENTALS = ['', '#', '', '#', '', '', '#', '', '#', '', '#', ''];

export function midiToVexKey(midi) {
  const pitchClass = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return { key: `${NOTE_LETTERS[pitchClass]}/${octave}`, accidental: NOTE_ACCIDENTALS[pitchClass] };
}

export function renderSheetMusic(container, midiNotes, playingNotes = [], currentChord = null, bassEnabled = false) {
  container.innerHTML = '';

  const chordSet = new Set(midiNotes || []);
  const playingSet = new Set(playingNotes || []);
  const allNotesSet = new Set([...chordSet, ...playingSet]);

  if (allNotesSet.size === 0) return;

  try {
    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(200, 140);
    const context = renderer.getContext();
    context.scale(0.8, 0.8);

    let allNotes = [...allNotesSet];

    if (bassEnabled && currentChord) {
      const bassRootMidi = 36 + currentChord.root;
      if (!allNotes.includes(bassRootMidi)) allNotes.push(bassRootMidi);
    }

    const sorted = allNotes.sort((a, b) => a - b);
    const bassNotes = sorted.filter(m => m < 60);
    const trebleNotes = sorted.filter(m => m >= 60);

    const trebleStave = new Stave(0, 0, 220);
    trebleStave.addClef('treble');
    trebleStave.setContext(context).draw();

    const bassStave = new Stave(0, 70, 220);
    bassStave.addClef('bass');
    bassStave.setContext(context).draw();

    function drawNotes(notes, clef, stave) {
      if (notes.length === 0) return;

      const keys = notes.map(m => midiToVexKey(m));
      const staveNote = new StaveNote({
        clef: clef,
        keys: keys.map(k => k.key),
        duration: 'w'
      });

      keys.forEach((k, i) => {
        if (k.accidental) staveNote.addModifier(new Accidental(k.accidental), i);
        const midi = notes[i];
        if (playingSet.has(midi) && !chordSet.has(midi)) {
          staveNote.setKeyStyle(i, { fillStyle: '#2196F3', strokeStyle: '#2196F3' });
        }
      });

      const voice = new Voice({ num_beats: 4, beat_value: 4 }).setStrict(false);
      voice.addTickables([staveNote]);
      new Formatter().joinVoices([voice]).format([voice], 100);
      voice.draw(context, stave);
    }

    drawNotes(trebleNotes, 'treble', trebleStave);
    drawNotes(bassNotes, 'bass', bassStave);
  } catch (e) {
    console.error('Sheet music render error:', e);
  }
}

export const BARS_PER_LINE = 4;
export const BAR_WIDTH = 140;
export const STAVE_HEIGHT = 70;
export const STAVE_GAP = 60;
export const CHORD_SYMBOL_HEIGHT = 30;
export const SYSTEM_HEIGHT = STAVE_HEIGHT * 2 + STAVE_GAP + CHORD_SYMBOL_HEIGHT + 40;
export const MIDI_SPLIT_POINT = 60;

export function createStaveNoteForClef(clef, midiNotes, chord = null, getTransposedSymbol = null) {
  const restKey = clef === 'treble' ? 'b/4' : 'd/3';
  const hasNotes = midiNotes.length > 0;
  const keys = hasNotes ? midiNotes.map(m => midiToVexKey(m)) : [{ key: restKey, accidental: '' }];
  const duration = hasNotes ? 'w' : 'wr';

  const note = new StaveNote({
    clef,
    keys: keys.map(k => k.key),
    duration,
    auto_stem: true
  });

  if (hasNotes) {
    keys.forEach((k, i) => {
      if (k.accidental) note.addModifier(new Accidental(k.accidental), i);
    });
  }

  if (chord && clef === 'treble' && getTransposedSymbol) {
    const symbol = getTransposedSymbol(chord);
    const chordSym = new ChordSymbol()
      .setHorizontal('center')
      .setVertical('top')
      .addText(symbol)
      .setReportWidth(false);
    note.addModifier(chordSym, 0);
  }

  return note;
}

export { Renderer, Stave, Voice, Formatter, StaveConnector };

