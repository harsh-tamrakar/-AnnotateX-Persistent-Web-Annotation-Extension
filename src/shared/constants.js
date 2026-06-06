// ============================================
// AnnotateX — Shared Constants
// ============================================

/**
 * Message types used across all extension layers.
 * background.js, content.js, and sidebar.js all reference these.
 */
const MSG = Object.freeze({
  ANNOTATION_CREATED:   'ANNOTATION_CREATED',
  REFRESH_SIDEBAR:      'REFRESH_SIDEBAR',
  TOGGLE_VIEW:          'TOGGLE_VIEW',
  APPLY_TOGGLE:         'APPLY_TOGGLE',
  DELETE_ANNOTATION:    'DELETE_ANNOTATION',
  ANNOTATION_DELETED:   'ANNOTATION_DELETED',
  SCROLL_TO_ANNOTATION: 'SCROLL_TO_ANNOTATION',
  UPDATE_NOTE:          'UPDATE_NOTE',
});

/**
 * Highlight color definitions.
 * Each key maps to a display name and CSS class suffix.
 */
const COLORS = Object.freeze({
  yellow: { name: 'Yellow', bg: 'rgba(255, 235, 59, 0.55)', border: '#f5c842' },
  green:  { name: 'Green',  bg: 'rgba(76, 175, 80, 0.35)',  border: '#4caf50' },
  blue:   { name: 'Blue',   bg: 'rgba(33, 150, 243, 0.35)', border: '#2196f3' },
  pink:   { name: 'Pink',   bg: 'rgba(233, 30, 99, 0.30)',  border: '#e91e63' },
});

/**
 * Configuration constants.
 */
const CONFIG = Object.freeze({
  CONTEXT_CHARS: 100,          // characters before + after selection for anchoring
  MIN_SELECTION_LENGTH: 3,     // minimum characters to trigger toolbar
  URLS_INDEX_KEY: '_annotatedUrls',
  HIGHLIGHT_CLASS: 'annotatex-highlight',
  TOOLBAR_ID: 'annotatex-toolbar',
  TOOLTIP_CLASS: 'annotatex-tooltip',
});
