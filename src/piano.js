export function createPiano(container, startMidi = 48, endMidi = 84) {
  container.innerHTML = '';

  for (let midi = startMidi; midi <= endMidi; midi++) {
    const pc = midi % 12;
    if (![1, 3, 6, 8, 10].includes(pc)) {
      const key = document.createElement('div');
      key.className = 'white-key';
      key.dataset.midi = midi;
      container.appendChild(key);
    }
  }

  const whiteKeys = [...container.querySelectorAll('.white-key')];
  let whiteIndex = 0;

  for (let midi = startMidi; midi <= endMidi; midi++) {
    const pc = midi % 12;
    if ([1, 3, 6, 8, 10].includes(pc)) {
      const key = document.createElement('div');
      key.className = 'black-key';
      key.dataset.midi = midi;
      const whiteKey = whiteKeys[whiteIndex - 1];
      key.style.left = `${whiteKey.offsetLeft + whiteKey.offsetWidth - 9}px`;
      container.appendChild(key);
    } else {
      whiteIndex++;
    }
  }
}

export function highlightKeys(container, midiNotes) {
  container.querySelectorAll('.active').forEach(k => k.classList.remove('active'));
  midiNotes.forEach(midi => {
    const key = container.querySelector(`[data-midi="${midi}"]`);
    if (key) key.classList.add('active');
  });
}

export function getPianoKeys() {
  return window.innerWidth < 600 ? 2 * 12 + 1 : 4 * 12 + 1;
}

