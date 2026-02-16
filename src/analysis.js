function countCommonTones(chord1, chord2) {
  const set1 = new Set(chord1.pitchClasses);
  return chord2.pitchClasses.filter(pc => set1.has(pc)).length;
}

function isTritoneSubstitution(fromChord, toChord) {
  const interval = (toChord.root - fromChord.root + 12) % 12;
  return interval === 6;
}

function isChromaticMediant(fromChord, toChord) {
  const interval = (toChord.root - fromChord.root + 12) % 12;
  return interval === 3 || interval === 4 || interval === 8 || interval === 9;
}

function isIIVSetup(chord, keyRoot) {
  const iiRoot = (keyRoot + 2) % 12;
  return chord.root === iiRoot && (chord.type.includes('m7') || chord.type.includes('m9'));
}

function isDominant(chord, keyRoot) {
  const vRoot = (keyRoot + 7) % 12;
  return chord.root === vRoot && (chord.type.includes('7') || chord.type.includes('9') || chord.type.includes('13'));
}

export function analyzeChordChoice(fromChord, toChord, keyRoot) {
  if (!fromChord || !toChord) return null;

  const commonTones = countCommonTones(fromChord, toChord);
  const rootMotion = (toChord.root - fromChord.root + 12) % 12;

  if (isIIVSetup(toChord, keyRoot)) return 'classic';
  if (isDominant(fromChord, keyRoot) && toChord.root === keyRoot) return 'classic';
  if ((rootMotion === 5 || rootMotion === 7) && commonTones >= 2) return 'classic';

  if (commonTones >= 3) return 'safe';
  if (fromChord.root === toChord.root && fromChord.type !== toChord.type) return 'safe';
  if ((rootMotion === 1 || rootMotion === 2 || rootMotion === 10 || rootMotion === 11) && commonTones >= 2) return 'safe';

  if (isTritoneSubstitution(fromChord, toChord)) return 'interesting';
  if (isChromaticMediant(fromChord, toChord)) return 'interesting';

  const borrowedRoots = [(keyRoot + 5) % 12, (keyRoot + 10) % 12, (keyRoot + 8) % 12, (keyRoot + 3) % 12];
  if (borrowedRoots.includes(toChord.root) && commonTones <= 1) return 'interesting';

  if (toChord.type.includes('b9') || toChord.type.includes('#9') ||
      toChord.type.includes('#11') || toChord.type.includes('alt')) {
    return 'interesting';
  }

  return null;
}

