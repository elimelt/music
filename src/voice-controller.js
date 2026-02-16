import VoiceLeader from './voicing.js';

export default class VoiceController {
  constructor(numVoices = 5) {
    this.voiceLeader = new VoiceLeader({ octaveRange: 2 });
    this.currentVoicing = null;
    this.numVoices = numVoices;
  }

  buildDefaultVoicing(chord) {
    const pcs = chord.pitchClasses;
    const voicing = [48 + pcs[0]];
    let baseOctave = 60;

    for (let i = 1; i < this.numVoices; i++) {
      const pc = i < pcs.length ? pcs[i] : pcs[(i - pcs.length) % (pcs.length - 1) + 1];
      let note = baseOctave + pc;
      if (voicing.length > 0 && note <= voicing[voicing.length - 1]) note += 12;
      if (note > 84) note -= 12;
      voicing.push(note);
    }

    return voicing.sort((a, b) => a - b);
  }

  getVoicing(chord) {
    let pitchClasses = chord.pitchClasses.slice(0, this.numVoices);

    while (pitchClasses.length < this.numVoices) {
      const doubleIdx = (pitchClasses.length - chord.pitchClasses.length) % (chord.pitchClasses.length - 1) + 1;
      pitchClasses.push(chord.pitchClasses[doubleIdx]);
    }

    if (!this.currentVoicing) {
      this.currentVoicing = this.buildDefaultVoicing(chord);
    } else {
      this.currentVoicing = this.voiceLeader.findClosestVoicingGreedy(this.currentVoicing, pitchClasses);
    }
    return [...this.currentVoicing];
  }

  setCustomVoicing(midiNotes) {
    this.currentVoicing = [...midiNotes].sort((a, b) => a - b);
    this.numVoices = midiNotes.length;
  }

  reset() {
    this.currentVoicing = null;
  }
}

