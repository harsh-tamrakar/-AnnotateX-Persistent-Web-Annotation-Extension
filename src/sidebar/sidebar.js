// ============================================
// AnnotateX — Sidebar Panel Logic
// Renders annotation list, toggle, annotated pages.
// ============================================

let currentUrl = '';
let annotations = [];
let viewMode = 'fresh';

// ── Boot ─────────────────────────────────────────────────────────

async function boot() {
  const tabs = await new Promise(resolve =>
    chrome.tabs.query({ active: true, currentWindow: true }, resolve)
  );
  currentUrl = normalizeUrl(tabs[0]?.url || '');
  await loadAnnotations();
  renderApp();
}

async function loadAnnotations() {
  annotations = await getAnnotations(currentUrl);
}

// ── Main Render ──────────────────────────────────────────────────

function renderApp() {
  const root = document.getElementById('root');
  root.innerHTML = '';

  // Header
  root.appendChild(createHeader());

  // URL indicator
  root.appendChild(createUrlLabel());

  // Annotations list
  root.appendChild(createAnnotationsList());

  // Annotated pages section
  root.appendChild(createSectionDivider('All Annotated Pages'));
  const urlListEl = document.createElement('div');
  urlListEl.id = 'url-list';
  urlListEl.className = 'url-list';
  urlListEl.innerHTML = '<div class="empty loading-pulse">Loading...</div>';
  root.appendChild(urlListEl);

  // Bind events
  bindEvents();
  loadUrlList();
}

// ── Component Builders ───────────────────────────────────────────

function createHeader() {
  const header = document.createElement('div');
  header.className = 'header';

  const logo = document.createElement('div');
  logo.className = 'logo';
  logo.innerHTML = '<span class="logo-icon">✦</span> AnnotateX';

  const toggleContainer = document.createElement('div');
  toggleContainer.className = 'toggle-container';

  const freshBtn = document.createElement('button');
  freshBtn.id = 'btn-fresh';
  freshBtn.className = `toggle-btn${viewMode === 'fresh' ? ' active' : ''}`;
  freshBtn.textContent = '◯ Fresh';

  const annotatedBtn = document.createElement('button');
  annotatedBtn.id = 'btn-annotated';
  annotatedBtn.className = `toggle-btn${viewMode === 'annotated' ? ' active' : ''}`;
  annotatedBtn.textContent = '● Annotated';

  toggleContainer.appendChild(freshBtn);
  toggleContainer.appendChild(annotatedBtn);
  header.appendChild(logo);
  header.appendChild(toggleContainer);
  return header;
}

function createUrlLabel() {
  const label = document.createElement('div');
  label.className = 'url-label';
  const displayUrl = currentUrl.length > 55 ? currentUrl.substring(0, 55) + '…' : currentUrl;
  label.textContent = displayUrl;
  label.title = currentUrl;
  return label;
}

function createAnnotationsList() {
  const container = document.createElement('div');
  container.className = 'annotations-list';
  container.id = 'annotations-list';

  if (annotations.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.innerHTML = 'No annotations on this page yet.<br/><span class="empty-hint">Select text on the page to start highlighting.</span>';
    container.appendChild(empty);
  } else {
    // Stats bar
    const stats = document.createElement('div');
    stats.className = 'stats-bar';
    const anchored = annotations.filter(a => a.anchored !== false).length;
    const total = annotations.length;
    stats.textContent = `${total} annotation${total !== 1 ? 's' : ''}${anchored < total ? ` · ${total - anchored} unanchored` : ''}`;
    container.appendChild(stats);

    annotations.forEach(a => {
      container.appendChild(createAnnotationCard(a));
    });
  }
  return container;
}

function createAnnotationCard(a) {
  const card = document.createElement('div');
  card.className = `annotation-card color-${a.color}${a.anchored === false ? ' unanchored' : ''}`;
  card.dataset.id = a.id;

  // Click card to scroll to annotation on page (FR-10)
  card.addEventListener('click', (e) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
    chrome.runtime.sendMessage({
      type: MSG.SCROLL_TO_ANNOTATION,
      id: a.id,
    });
  });

  // Unanchored warning
  if (a.anchored === false) {
    const warning = document.createElement('div');
    warning.className = 'unanchored-warning';
    warning.textContent = '⚠ Could not find this text on the page';
    card.appendChild(warning);
  }

  // Color dot + highlight text
  const textRow = document.createElement('div');
  textRow.className = 'card-text-row';

  const colorDot = document.createElement('span');
  colorDot.className = `color-dot dot-${a.color}`;

  const highlightText = document.createElement('div');
  highlightText.className = 'highlight-text';
  const displayText = a.selectedText.length > 100
    ? '"' + a.selectedText.substring(0, 100) + '…"'
    : '"' + a.selectedText + '"';
  highlightText.textContent = displayText;

  textRow.appendChild(colorDot);
  textRow.appendChild(highlightText);
  card.appendChild(textRow);

  // Note textarea
  const noteInput = document.createElement('textarea');
  noteInput.id = `note-${a.id}`;
  noteInput.className = 'note-input';
  noteInput.placeholder = 'Add a note…';
  noteInput.value = a.note || '';
  noteInput.rows = 2;
  card.appendChild(noteInput);

  // Footer with timestamp and delete
  const footer = document.createElement('div');
  footer.className = 'card-footer';

  const timestamp = document.createElement('span');
  timestamp.className = 'timestamp';
  timestamp.textContent = formatDate(a.timestamp);

  const delBtn = document.createElement('button');
  delBtn.id = `del-${a.id}`;
  delBtn.className = 'del-btn';
  delBtn.textContent = '✕ Delete';

  footer.appendChild(timestamp);
  footer.appendChild(delBtn);
  card.appendChild(footer);

  return card;
}

function createSectionDivider(title) {
  const div = document.createElement('div');
  div.className = 'section-title';
  div.textContent = title;
  return div;
}

// ── Event Binding ────────────────────────────────────────────────

function bindEvents() {
  // Toggle buttons
  document.getElementById('btn-fresh')?.addEventListener('click', () => setMode('fresh'));
  document.getElementById('btn-annotated')?.addEventListener('click', () => setMode('annotated'));

  // Note editing (debounced save on blur)
  annotations.forEach(a => {
    const noteEl = document.getElementById(`note-${a.id}`);
    if (noteEl) {
      noteEl.addEventListener('blur', () => {
        const newNote = noteEl.value.trim();
        if (newNote !== (a.note || '')) {
          updateAnnotationNote(currentUrl, a.id, newNote);
          // Notify content script to update tooltip
          chrome.runtime.sendMessage({
            type: MSG.UPDATE_NOTE,
            id: a.id,
            note: newNote,
          });
        }
      });
    }

    const delBtn = document.getElementById(`del-${a.id}`);
    if (delBtn) {
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await deleteAnnotation(currentUrl, a.id);
        chrome.runtime.sendMessage({
          type: MSG.DELETE_ANNOTATION,
          id: a.id,
        });
        await loadAnnotations();
        renderApp();
      });
    }
  });
}

// ── Annotated Pages List ─────────────────────────────────────────

async function loadUrlList() {
  const urls = await getAllAnnotatedUrls();
  const container = document.getElementById('url-list');
  if (!container) return;

  const otherUrls = urls.filter(u => u !== currentUrl);

  if (!otherUrls.length) {
    container.innerHTML = '<div class="empty">No other annotated pages.</div>';
    return;
  }

  container.innerHTML = '';
  otherUrls.forEach(u => {
    const item = document.createElement('div');
    item.className = 'url-item';
    item.title = u;

    // Try to show just the meaningful part of the URL
    try {
      const parsed = new URL(u);
      const display = parsed.hostname + (parsed.pathname.length > 1 ? parsed.pathname : '');
      item.textContent = display.length > 50 ? display.substring(0, 50) + '…' : display;
    } catch {
      item.textContent = u.substring(0, 55) + '…';
    }

    container.appendChild(item);
  });
}

// ── Toggle Mode ──────────────────────────────────────────────────

function setMode(mode) {
  viewMode = mode;
  chrome.runtime.sendMessage({ type: MSG.TOGGLE_VIEW, mode });
  renderApp();
}

// ── Helpers ──────────────────────────────────────────────────────

function formatDate(isoString) {
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diff = now - d;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.type === MSG.REFRESH_SIDEBAR) {
    const messageUrl = message.url ? normalizeUrl(message.url) : '';
    if (messageUrl === currentUrl || !messageUrl) {
      viewMode = 'annotated'; // Switch to annotated mode to show new highlights
      await loadAnnotations();
      renderApp();
    }
  }
});

// Also refresh when the active tab changes
chrome.tabs.onActivated?.addListener(async () => {
  const tabs = await new Promise(resolve =>
    chrome.tabs.query({ active: true, currentWindow: true }, resolve)
  );
  const newUrl = normalizeUrl(tabs[0]?.url || '');
  if (newUrl !== currentUrl) {
    currentUrl = newUrl;
    viewMode = 'fresh'; // reset toggle to fresh on tab switch
    await loadAnnotations();
    renderApp();
  }
});

// Refresh on tab URL change (navigation within same tab)
chrome.tabs.onUpdated?.addListener(async (tabId, changeInfo) => {
  if (changeInfo.url) {
    const tabs = await new Promise(resolve =>
      chrome.tabs.query({ active: true, currentWindow: true }, resolve)
    );
    if (tabs[0]?.id === tabId) {
      currentUrl = normalizeUrl(changeInfo.url);
      viewMode = 'fresh'; // reset toggle to fresh on navigation
      await loadAnnotations();
      renderApp();
    }
  }
});

// ── Boot ─────────────────────────────────────────────────────────
boot();
