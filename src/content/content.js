// ============================================
// AnnotateX — Content Script (Main Entry)
// Injected into every HTTP/HTTPS page at document_idle.
// Handles: init, selection events, messaging, MutationObserver.
// ============================================

let _currentMode = 'fresh';
let _currentUrl = '';
let _mutationObserver = null;
let _initComplete = false;

// ── Initialization ──────────────────────────────────────────────

/**
 * Main init: fetch annotations from storage, inject highlights.
 * Updates anchored status for any that fail to re-inject.
 */
async function init() {
  _currentUrl = normalizeUrl(window.location.href);
  if (_currentMode === 'fresh') {
    _initComplete = true;
    return;
  }
  const annotations = await getAnnotations(_currentUrl);
  if (annotations.length === 0) {
    _initComplete = true;
    return;
  }

  for (const annotation of annotations) {
    const anchored = findAndHighlight(annotation);
    // Update anchored status in storage if it changed
    if (anchored !== annotation.anchored) {
      await updateAnnotationAnchored(_currentUrl, annotation.id, anchored);
    }
  }
  _initComplete = true;
}

// ── Text Selection Listener ─────────────────────────────────────

document.addEventListener('mouseup', (e) => {
  // Ignore clicks on our own toolbar
  const toolbar = document.getElementById(CONFIG.TOOLBAR_ID);
  if (toolbar && toolbar.contains(e.target)) return;

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return;

  const text = selection.toString().trim();
  if (text.length < CONFIG.MIN_SELECTION_LENGTH) return;

  showMiniToolbar(selection, e.clientX, e.clientY);
});

// ── Save Annotation ──────────────────────────────────────────────

/**
 * Called by toolbar.js when user clicks Save.
 * Builds the annotation object, saves to storage, injects highlight.
 */
async function saveCurrentSelection(selection, color) {
  const selectedText = selection.toString().trim();
  if (!selectedText) return;

  let range;
  try {
    range = selection.getRangeAt(0);
  } catch {
    return;
  }

  // Build surrounding context from the common ancestor
  const container = range.commonAncestorContainer;
  const fullText = container.textContent || container.parentElement?.textContent || '';
  const offset = fullText.indexOf(selectedText);
  const surroundingContext = extractContext(selectedText, fullText, offset);

  const url = normalizeUrl(window.location.href);
  const annotation = {
    id: generateId(),
    url,
    selectedText,
    surroundingContext,
    note: '',
    color: color || 'yellow',
    timestamp: new Date().toISOString(),
    anchored: true,
  };

  // Save to storage
  await saveAnnotation(url, annotation);

  // Switch mode to annotated so the user sees their new highlight
  _currentMode = 'annotated';

  // Inject highlight into DOM
  // Clear selection first, then use anchor engine to highlight
  selection.removeAllRanges();
  findAndHighlight(annotation);

  // Remove toolbar
  removeMiniToolbar();

  // Notify background → sidebar
  chrome.runtime.sendMessage({
    type: MSG.ANNOTATION_CREATED,
    url,
  });
}

// ── Scroll to Annotation ─────────────────────────────────────────

/**
 * Scroll the page to a specific annotation highlight.
 * Satisfies FR-10.
 */
function scrollToAnnotation(id) {
  const mark = document.querySelector(`[data-annotatex-id="${id}"]`);
  if (!mark) return;

  mark.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Flash effect to draw attention
  mark.style.transition = 'outline 0.2s, box-shadow 0.2s';
  mark.style.outline = '3px solid #7F77DD';
  mark.style.boxShadow = '0 0 12px rgba(127, 119, 221, 0.5)';
  setTimeout(() => {
    mark.style.outline = '';
    mark.style.boxShadow = '';
  }, 1500);
}

// ── Message Listener ─────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === MSG.APPLY_TOGGLE) {
    if (message.mode === 'fresh') {
      removeAllHighlights();
      _currentMode = 'fresh';
    } else {
      _currentMode = 'annotated';
      init();
    }
  }

  if (message.type === MSG.ANNOTATION_DELETED) {
    removeHighlight(message.id);
  }

  if (message.type === MSG.SCROLL_TO_ANNOTATION) {
    scrollToAnnotation(message.id);
  }

  // Update tooltip when note is edited in sidebar
  if (message.type === MSG.UPDATE_NOTE) {
    const mark = document.querySelector(`[data-annotatex-id="${message.id}"]`);
    if (mark) {
      if (message.note) {
        mark.dataset.note = message.note;
      } else {
        delete mark.dataset.note;
      }
    }
  }
});

// ── MutationObserver (SRS 2.4.2) ────────────────────────────────

/**
 * Watch for dynamic DOM changes (lazy-loaded content, SPAs).
 * Re-runs anchoring for unanchored annotations when new content appears.
 */
function setupMutationObserver() {
  if (_mutationObserver) return;

  let debounceTimer = null;

  _mutationObserver = new MutationObserver((mutations) => {
    // Only react to added nodes (not our own marks)
    const hasNewContent = mutations.some(m =>
      m.addedNodes.length > 0 &&
      Array.from(m.addedNodes).some(n =>
        n.nodeType === Node.ELEMENT_NODE &&
        !n.classList?.contains(CONFIG.HIGHLIGHT_CLASS)
      )
    );

    if (hasNewContent && _initComplete && _currentMode === 'annotated') {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const annotations = await getAnnotations(_currentUrl);
        const unanchored = annotations.filter(a => !a.anchored);
        for (const annotation of unanchored) {
          const anchored = findAndHighlight(annotation);
          if (anchored) {
            await updateAnnotationAnchored(_currentUrl, annotation.id, true);
          }
        }
      }, 500);
    }
  });

  _mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Listen for clicks on highlights to show the delete button
document.addEventListener('click', (e) => {
  if (e.target.id === 'annotatex-delete-btn') return;

  const mark = e.target.closest(`.${CONFIG.HIGHLIGHT_CLASS}`);
  if (mark && _currentMode === 'annotated') {
    e.stopPropagation();
    showDeleteTooltip(mark);
  } else {
    hideDeleteTooltip();
  }
});

// Hide delete tooltip on scroll
window.addEventListener('scroll', hideDeleteTooltip);

let _deleteTooltip = null;

function showDeleteTooltip(mark) {
  hideDeleteTooltip();

  const id = mark.dataset.annotatexId;
  const rect = mark.getBoundingClientRect();

  _deleteTooltip = document.createElement('button');
  _deleteTooltip.id = 'annotatex-delete-btn';
  _deleteTooltip.innerHTML = '🗑 Delete Highlight';
  
  const fixedLeft = rect.left + rect.width / 2 - 60;
  const fixedTop = rect.top - 38;
  
  _deleteTooltip.setAttribute('style', `
    position: fixed !important;
    left: ${Math.max(10, Math.min(fixedLeft, window.innerWidth - 130))}px !important;
    top: ${Math.max(10, fixedTop)}px !important;
    z-index: 2147483647 !important;
    background: #1a1a2e !important;
    border: 1px solid #ff4d4d !important;
    border-radius: 6px !important;
    padding: 5px 10px !important;
    color: #ff4d4d !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    cursor: pointer !important;
    box-shadow: 0 4px 15px rgba(0,0,0,0.4) !important;
    display: flex !important;
    align-items: center !important;
    gap: 4px !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    transition: background 0.15s, color 0.15s !important;
  `);

  _deleteTooltip.addEventListener('mouseenter', () => {
    _deleteTooltip.style.background = '#ff4d4d';
    _deleteTooltip.style.color = '#ffffff';
  });
  _deleteTooltip.addEventListener('mouseleave', () => {
    _deleteTooltip.style.background = '#1a1a2e';
    _deleteTooltip.style.color = '#ff4d4d';
  });

  _deleteTooltip.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    const url = normalizeUrl(window.location.href);
    await deleteAnnotation(url, id);
    
    removeHighlight(id);
    hideDeleteTooltip();

    // Notify background → sidebar
    chrome.runtime.sendMessage({
      type: MSG.ANNOTATION_DELETED,
      id: id,
    });

    chrome.runtime.sendMessage({
      type: MSG.REFRESH_SIDEBAR,
      url: url,
    });
  });

  document.body.appendChild(_deleteTooltip);
}

function hideDeleteTooltip() {
  if (_deleteTooltip) {
    _deleteTooltip.remove();
    _deleteTooltip = null;
  }
}

// ── Boot ─────────────────────────────────────────────────────────

init().then(() => {
  setupMutationObserver();
});
