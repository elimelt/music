import { parseJazzStandard } from './parser.js';

const STANDARDS_URL = 'https://raw.githubusercontent.com/mikeoliphant/JazzStandards/refs/heads/main/JazzStandards.json';
const STANDARDS_STORAGE_KEY = 'jazzStandards_library';

let jazzStandards = null;
let filteredStandards = [];
let selectedResultIdx = -1;
let onLoadSong = null;

export function initStandards(searchEl, resultsEl, loadCallback) {
  onLoadSong = loadCallback;

  searchEl.addEventListener('focus', () => openDropdown(searchEl, resultsEl));
  searchEl.addEventListener('input', () => filterStandards(searchEl.value, resultsEl));
  searchEl.addEventListener('blur', () => setTimeout(() => closeDropdown(resultsEl), 150));
  searchEl.addEventListener('keydown', (e) => handleKeydown(e, searchEl, resultsEl));
}

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STANDARDS_STORAGE_KEY);
    if (stored) {
      jazzStandards = JSON.parse(stored);
      return true;
    }
  } catch (e) {}
  return false;
}

async function fetchAndStore(resultsEl) {
  try {
    const resp = await fetch(STANDARDS_URL);
    jazzStandards = await resp.json();
    localStorage.setItem(STANDARDS_STORAGE_KEY, JSON.stringify(jazzStandards));
    filterStandards('', resultsEl);
  } catch (e) {
    console.error('Failed to load standards:', e);
  }
}

function filterStandards(query, resultsEl) {
  if (!jazzStandards) {
    filteredStandards = [];
    renderResults(resultsEl);
    return;
  }
  const q = query.toLowerCase().trim();
  filteredStandards = q
    ? jazzStandards.filter(s => s.Title?.toLowerCase().includes(q) || s.Composer?.toLowerCase().includes(q))
    : jazzStandards;
  selectedResultIdx = -1;
  renderResults(resultsEl);
}

function renderResults(resultsEl) {
  resultsEl.innerHTML = '';

  if (!jazzStandards) {
    const loadDiv = document.createElement('div');
    loadDiv.className = 'standards-load';
    loadDiv.textContent = 'Click to load library (917KB)';
    loadDiv.addEventListener('click', async () => {
      loadDiv.textContent = 'Loading...';
      await fetchAndStore(resultsEl);
    });
    resultsEl.appendChild(loadDiv);
    return;
  }

  const toShow = filteredStandards.slice(0, 15);
  toShow.forEach((song, idx) => {
    const div = document.createElement('div');
    div.className = 'standards-result';
    if (idx === selectedResultIdx) div.classList.add('selected');
    div.innerHTML = `<div class="standards-result-title">${song.Title || 'Untitled'}</div><div class="standards-result-composer">${song.Composer || ''}</div>`;
    div.addEventListener('click', () => loadSong(song, resultsEl));
    resultsEl.appendChild(div);
  });

  if (filteredStandards.length > 15) {
    const more = document.createElement('div');
    more.className = 'standards-load';
    more.textContent = `${filteredStandards.length - 15} more...`;
    resultsEl.appendChild(more);
  }
}

function openDropdown(searchEl, resultsEl) {
  if (!jazzStandards) loadFromStorage();
  filterStandards(searchEl.value, resultsEl);
  resultsEl.classList.add('open');
}

function closeDropdown(resultsEl) {
  resultsEl.classList.remove('open');
  selectedResultIdx = -1;
}

function loadSong(song, resultsEl) {
  const parsed = parseJazzStandard(song);
  if (onLoadSong) onLoadSong(parsed);
  closeDropdown(resultsEl);
}

function handleKeydown(e, searchEl, resultsEl) {
  if (!resultsEl.classList.contains('open')) return;

  if (e.code === 'ArrowDown') {
    e.preventDefault();
    selectedResultIdx = Math.min(selectedResultIdx + 1, Math.min(filteredStandards.length, 15) - 1);
    renderResults(resultsEl);
  } else if (e.code === 'ArrowUp') {
    e.preventDefault();
    selectedResultIdx = Math.max(selectedResultIdx - 1, 0);
    renderResults(resultsEl);
  } else if (e.code === 'Enter' && selectedResultIdx >= 0) {
    e.preventDefault();
    loadSong(filteredStandards[selectedResultIdx], resultsEl);
    searchEl.value = '';
    searchEl.blur();
  } else if (e.code === 'Escape') {
    closeDropdown(resultsEl);
    searchEl.blur();
  }
}

