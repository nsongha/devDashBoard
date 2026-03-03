/**
 * Search Module — Global search & keyboard shortcuts for Dev Dashboard
 * Phase 4 Stream C — Search & Filter
 *
 * Features:
 * - Cmd+K / Ctrl+K command palette
 * - Fuzzy search across commits, files, versions, issues, decisions
 * - Arrow key navigation + Enter select
 * - Keyboard shortcuts (Cmd+1..6 tabs, Cmd+R refresh, Esc close, / focus)
 */

import { showTab } from './tabs.mjs';

// ─── State ───────────────────────────────────────
let getDataFn = null;
let selectedIdx = -1;
let currentResults = [];

// ─── Category Definitions ────────────────────────
const CATEGORIES = [
  { key: 'commits', label: '🔀 Commits', icon: '🔀', tabId: 'commits' },
  { key: 'files', label: '🔥 Hotspot Files', icon: '🔥', tabId: 'hotspots' },
  { key: 'versions', label: '🏷️ Versions', icon: '🏷️', tabId: 'versions' },
  { key: 'issues', label: '⚠️ Issues', icon: '⚠️', tabId: null },
  { key: 'decisions', label: '🧭 Decisions', icon: '🧭', tabId: 'decisions' },
];

const TAB_ORDER = ['commits', 'versions', 'hotspots', 'insights', 'workflows', 'decisions'];

// ─── Init ────────────────────────────────────────
/**
 * Initialize search module
 * @param {Function} dataGetter — returns current DATA object
 * @param {Object} appActions — { refreshData }
 */
export function initSearch(dataGetter, appActions = {}) {
  getDataFn = dataGetter;

  document.addEventListener('keydown', (e) => {
    // Cmd+K / Ctrl+K → open search
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
      return;
    }

    // Esc → close search or modals
    if (e.key === 'Escape') {
      const overlay = document.getElementById('searchOverlay');
      if (overlay?.classList.contains('open')) {
        closeSearch();
        return;
      }
      // Close any open modal
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
      return;
    }

    // / → focus search (when not typing in an input)
    if (e.key === '/' && !isTyping(e)) {
      e.preventDefault();
      openSearch();
      return;
    }

    // Cmd+1..6 → switch tabs
    if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '6') {
      const idx = parseInt(e.key) - 1;
      if (idx < TAB_ORDER.length) {
        e.preventDefault();
        navigateToTab(TAB_ORDER[idx]);
      }
      return;
    }

    // Cmd+R → refresh
    if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
      e.preventDefault();
      appActions.refreshData?.();
      return;
    }
  });
}

/**
 * Check if user is typing in an input/textarea
 */
function isTyping(e) {
  const tag = e.target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable;
}

// ─── Open / Close ────────────────────────────────
export function openSearch() {
  const overlay = document.getElementById('searchOverlay');
  if (!overlay) return;
  overlay.classList.add('open');
  const input = document.getElementById('searchInput');
  input.value = '';
  input.focus();
  selectedIdx = -1;
  currentResults = [];
  renderResults([]);
}

export function closeSearch() {
  const overlay = document.getElementById('searchOverlay');
  if (overlay) overlay.classList.remove('open');
}

/**
 * Handle search input
 */
export function onSearchInput(e) {
  const query = e.target.value.trim().toLowerCase();
  if (!query || query.length < 2) {
    renderResults([]);
    return;
  }
  const results = performSearch(query);
  currentResults = results;
  selectedIdx = results.length > 0 ? 0 : -1;
  renderResults(results);
}

/**
 * Handle keyboard navigation in search results
 */
export function onSearchKeydown(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (currentResults.length > 0) {
      selectedIdx = (selectedIdx + 1) % currentResults.length;
      highlightSelected();
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (currentResults.length > 0) {
      selectedIdx = selectedIdx <= 0 ? currentResults.length - 1 : selectedIdx - 1;
      highlightSelected();
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (selectedIdx >= 0 && selectedIdx < currentResults.length) {
      selectResult(currentResults[selectedIdx]);
    }
  }
}

// ─── Search Logic ────────────────────────────────
/**
 * Perform fuzzy search across all data categories
 * @param {string} query — lowercase search query
 * @returns {Array} — flat list of results with category info
 */
function performSearch(query) {
  const DATA = getDataFn?.();
  if (!DATA) return [];

  const results = [];

  // Search commits
  if (DATA.git?.recentCommits) {
    DATA.git.recentCommits
      .filter(c => c.hash.toLowerCase().includes(query) ||
                   c.message.toLowerCase().includes(query) ||
                   c.author.toLowerCase().includes(query))
      .slice(0, 5)
      .forEach(c => results.push({
        category: 'commits',
        title: c.message,
        subtitle: `${c.hash} · ${c.author} · ${c.ago}`,
        tabId: 'commits',
      }));
  }

  // Search hotspot files
  if (DATA.git?.hotspotFiles) {
    DATA.git.hotspotFiles
      .filter(f => f.file.toLowerCase().includes(query))
      .slice(0, 5)
      .forEach(f => results.push({
        category: 'files',
        title: f.file,
        subtitle: `${f.count} changes`,
        tabId: 'hotspots',
      }));
  }

  // Search versions
  if (DATA.changelog) {
    DATA.changelog
      .filter(v => v.version.toLowerCase().includes(query) ||
                   v.description.toLowerCase().includes(query))
      .slice(0, 5)
      .forEach(v => results.push({
        category: 'versions',
        title: `${v.version} — ${v.description}`,
        subtitle: v.date,
        tabId: 'versions',
      }));
  }

  // Search issues (issues might have items array or just counts)
  if (DATA.issues?.items && Array.isArray(DATA.issues.items)) {
    DATA.issues.items
      .filter(i => (i.title || i.description || '').toLowerCase().includes(query))
      .slice(0, 5)
      .forEach(i => results.push({
        category: 'issues',
        title: i.title || i.description,
        subtitle: `Priority: ${i.priority || 'N/A'}`,
        tabId: null,
      }));
  }

  // Search decisions
  if (DATA.decisions) {
    DATA.decisions
      .filter(d => d.title.toLowerCase().includes(query))
      .slice(0, 5)
      .forEach(d => results.push({
        category: 'decisions',
        title: `ADR-${String(d.id).padStart(3, '0')}: ${d.title}`,
        subtitle: '✅ Accepted',
        tabId: 'decisions',
      }));
  }

  return results;
}

// ─── Render ──────────────────────────────────────
function renderResults(results) {
  const container = document.getElementById('searchResults');
  if (!container) return;

  if (results.length === 0) {
    const query = document.getElementById('searchInput')?.value.trim();
    container.innerHTML = query && query.length >= 2
      ? '<div class="search-empty">Không tìm thấy kết quả</div>'
      : '<div class="search-hint">Gõ để tìm kiếm commits, files, versions...</div>';
    return;
  }

  // Group by category
  const grouped = {};
  results.forEach((r, i) => {
    r._index = i;
    if (!grouped[r.category]) grouped[r.category] = [];
    grouped[r.category].push(r);
  });

  let html = '';
  for (const cat of CATEGORIES) {
    const items = grouped[cat.key];
    if (!items || items.length === 0) continue;

    html += `<div class="search-category">${cat.label}</div>`;
    items.forEach(item => {
      const sel = item._index === selectedIdx ? 'selected' : '';
      html += `
        <div class="search-result-item ${sel}" data-index="${item._index}"
             onclick="window._app.selectSearchResult(${item._index})"
             onmouseenter="window._app.hoverSearchResult(${item._index})">
          <div class="search-result-title">${escapeHtml(item.title)}</div>
          <div class="search-result-subtitle">${escapeHtml(item.subtitle)}</div>
        </div>
      `;
    });
  }

  container.innerHTML = html;
}

function highlightSelected() {
  const container = document.getElementById('searchResults');
  if (!container) return;

  container.querySelectorAll('.search-result-item').forEach(el => {
    el.classList.toggle('selected', parseInt(el.dataset.index) === selectedIdx);
  });

  // Scroll into view
  const selected = container.querySelector('.search-result-item.selected');
  if (selected) selected.scrollIntoView({ block: 'nearest' });
}

// ─── Actions ─────────────────────────────────────
function selectResult(result) {
  closeSearch();
  if (result.tabId) {
    navigateToTab(result.tabId);
  }
}

export function selectSearchResult(index) {
  if (index >= 0 && index < currentResults.length) {
    selectResult(currentResults[index]);
  }
}

export function hoverSearchResult(index) {
  selectedIdx = index;
  highlightSelected();
}

function navigateToTab(tabId) {
  const btn = document.querySelector(`.tab[onclick*="'${tabId}'"]`);
  if (btn) {
    showTab(tabId, btn);
  }
}

// ─── Utility ─────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
