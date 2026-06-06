// ============================================
// AnnotateX — Shared Utilities
// ============================================

/**
 * Generate a unique annotation ID.
 * Format: ann_<random>_<timestamp> — collision-safe for single-user.
 */
function generateId() {
  return 'ann_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

/**
 * Normalize a URL for consistent storage keys.
 * Strips hash fragments and trailing slashes.
 */
function normalizeUrl(url) {
  try {
    const u = new URL(url);
    // Remove hash fragment
    u.hash = '';
    // Remove trailing slash from pathname (except root "/")
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return url; // fallback if URL is malformed
  }
}

/**
 * Extract surrounding context around the selected text.
 * Captures CONFIG.CONTEXT_CHARS before and after the selection offset.
 *
 * @param {string} selectedText  — the highlighted text
 * @param {string} fullText      — the full text of the container node
 * @param {number} offset        — the index of selectedText in fullText
 * @returns {string}             — context string for anchoring
 */
function extractContext(selectedText, fullText, offset) {
  if (offset === -1) offset = 0;
  const chars = CONFIG.CONTEXT_CHARS;
  const before = fullText.substring(Math.max(0, offset - chars), offset);
  const after  = fullText.substring(
    offset + selectedText.length,
    offset + selectedText.length + chars
  );
  return before + selectedText + after;
}
