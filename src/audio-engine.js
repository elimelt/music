import * as Tone from 'tone';
import { TONE_NOTE_NAMES } from './chord-theory.js';

const midiToNote = midi => `${TONE_NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;

export default class AudioEngine {
  constructor(numVoices, glideTime = 0.15) {
    this.synths = [];
    this.numVoices = numVoices;
    this.glideTime = glideTime;
    this.playing = false;
    this.bassSynth = null;
    this.bassEnabled = false;
    this.currentBassNote = null;
    this.currentNotes = [];
    this.touchSynths = [];
    this.touchSynthPool = [];
    this.activeTouches = new Map();
  }

  async init() {
    await Tone.start();

    for (let i = 0; i < this.numVoices; i++) {
      const synth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.05, decay: 0.1, sustain: 1, release: 0.3 },
        portamento: this.glideTime
      }).toDestination();
      synth.volume.value = -20;
      this.synths.push(synth);
    }

    this.bassSynth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.1 }
    }).toDestination();
    this.bassSynth.volume.value = -16;

    await this.initTouchSynths();
  }

  async initTouchSynths() {
    if (this.touchSynths.length > 0) return;
    await Tone.start();

    for (let i = 0; i < 16; i++) {
      const synth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.15 }
      }).toDestination();
      synth.volume.value = -18;
      this.touchSynths.push(synth);
      this.touchSynthPool.push(synth);
    }
  }

  touchNoteOn(midi) {
    if (this.activeTouches.has(midi)) return false;
    if (this.touchSynthPool.length === 0) return false;
    const synth = this.touchSynthPool.pop();
    synth.triggerAttack(midiToNote(midi));
    this.activeTouches.set(midi, synth);
    return true;
  }

  touchNoteOff(midi) {
    const synth = this.activeTouches.get(midi);
    if (!synth) return false;
    synth.triggerRelease();
    this.activeTouches.delete(midi);
    this.touchSynthPool.push(synth);
    return true;
  }

  isTouchNotePlaying(midi) { return this.activeTouches.has(midi); }
  canPlayTouchNote() { return this.touchSynthPool.length > 0; }

  glideTo(midiNotes, rootPitchClass = null) {
    midiNotes.forEach((midi, i) => {
      if (i < this.synths.length) {
        const noteName = midiToNote(midi);
        if (this.playing) this.synths[i].setNote(noteName);
        else this.synths[i].triggerAttack(noteName);
      }
    });

    for (let i = midiNotes.length; i < this.synths.length; i++) {
      if (this.currentNotes[i]) this.synths[i].triggerRelease();
    }

    this.currentNotes = midiNotes.slice();

    if (this.bassEnabled && rootPitchClass !== null) {
      const bassNote = 36 + rootPitchClass;
      const bassNoteName = midiToNote(bassNote);
      if (this.currentBassNote !== null) this.bassSynth.setNote(bassNoteName);
      else this.bassSynth.triggerAttack(bassNoteName);
      this.currentBassNote = bassNote;
    } else if (this.currentBassNote !== null) {
      this.bassSynth.triggerRelease();
      this.currentBassNote = null;
    }

    this.playing = true;
  }

  setBassEnabled(enabled) {
    this.bassEnabled = enabled;
    if (!enabled && this.currentBassNote !== null) {
      this.bassSynth.triggerRelease();
      this.currentBassNote = null;
    }
  }

  setVoiceCount(count) {
    while (this.synths.length < count) {
      const synth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.05, decay: 0.1, sustain: 1, release: 0.3 },
        portamento: this.glideTime
      }).toDestination();
      synth.volume.value = -20;
      this.synths.push(synth);
    }
    this.numVoices = count;
  }

  stop() {
    this.synths.forEach(s => s.triggerRelease());
    if (this.bassSynth && this.currentBassNote !== null) this.bassSynth.triggerRelease();
    this.currentNotes = [];
    this.currentBassNote = null;
    this.playing = false;
  }

  setChordVolume(percent) {
    const db = percent === 0 ? -Infinity : (percent / 100) * 55 - 60;
    this.synths.forEach(synth => synth.volume.value = db);
  }

  setBassVolume(percent) {
    const db = percent === 0 ? -Infinity : (percent / 100) * 55 - 60;
    if (this.bassSynth) this.bassSynth.volume.value = db;
  }

  setTouchVolume(percent) {
    const db = percent === 0 ? -Infinity : (percent / 100) * 55 - 60;
    this.touchSynths.forEach(synth => synth.volume.value = db);
  }
}

