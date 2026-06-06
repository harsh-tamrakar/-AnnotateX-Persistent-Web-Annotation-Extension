// ============================================
// AnnotateX — Background Service Worker
// Message router + sidePanel lifecycle handler.
// Manifest V3 compliant — no persistent state.
// ============================================

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// ── Message Router ───────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // Content script → Background → Sidebar
  if (message.type === 'ANNOTATION_CREATED') {
    chrome.runtime.sendMessage({
      type: 'REFRESH_SIDEBAR',
      url: message.url,
    }).catch(() => {
      // Sidebar might not be open — that's fine
    });
  }

  // Sidebar → Background → Content script (toggle view)
  if (message.type === 'TOGGLE_VIEW') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'APPLY_TOGGLE',
          mode: message.mode,
        }).catch(() => {});
      }
    });
  }

  // Sidebar → Background → Content script (delete highlight)
  if (message.type === 'DELETE_ANNOTATION') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'ANNOTATION_DELETED',
          id: message.id,
        }).catch(() => {});
      }
    });
  }

  // Sidebar → Background → Content script (scroll to highlight)
  if (message.type === 'SCROLL_TO_ANNOTATION') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'SCROLL_TO_ANNOTATION',
          id: message.id,
        }).catch(() => {});
      }
    });
  }

  // Sidebar → Background → Content script (update note tooltip)
  if (message.type === 'UPDATE_NOTE') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'UPDATE_NOTE',
          id: message.id,
          note: message.note,
        }).catch(() => {});
      }
    });
  }
});
