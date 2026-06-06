// ============================================
// AnnotateX — Anchor Resolution Engine
// Finds saved annotations in the DOM and wraps them with <mark> elements.
// Uses TreeWalker for O(N) text node traversal.
// ============================================

/**
 * Get all text nodes in the document, filtering out script/style/noscript.
 * @param {Node} [root=document.body]
 * @returns {Text[]}
 */
function getAllTextNodes(root) {
  const walker = document.createTreeWalker(
    root || document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const tag = node.parentElement?.tagName?.toLowerCase();
        if (['script', 'style', 'noscript', 'mark'].includes(tag)) {
          return NodeFilter.FILTER_REJECT;
        }
        // Skip empty text nodes
        if (!node.textContent.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  const nodes = [];
  let node;
  while ((node = walker.nextNode())) {
    nodes.push(node);
  }
  return nodes;
}

/**
 * Build a full-text map from all text nodes.
 * Returns { fullText, nodeMap } where nodeMap is an array of { node, start }.
 */
function buildTextMap() {
  const textNodes = getAllTextNodes();
  let fullText = '';
  const nodeMap = [];
  for (const node of textNodes) {
    nodeMap.push({ node, start: fullText.length });
    fullText += node.textContent;
  }
  return { fullText, nodeMap };
}

/**
 * Find an annotation's text in the DOM and wrap it with a <mark> element.
 * Two-pass algorithm:
 *   Pass 1: Exact match on surroundingContext → locate selectedText within
 *   Pass 2: Direct match on selectedText (fallback when context changed)
 *
 * @param {Object} annotation — annotation object from storage
 * @returns {boolean} — true if successfully anchored
 */
function findAndHighlight(annotation) {
  // Don't double-highlight
  if (document.querySelector(`[data-annotatex-id="${annotation.id}"]`)) {
    return true;
  }

  const { fullText, nodeMap } = buildTextMap();

  // Pass 1: Exact match on surroundingContext
  if (annotation.surroundingContext) {
    const contextIndex = fullText.indexOf(annotation.surroundingContext);
    if (contextIndex !== -1) {
      const textOffset = annotation.surroundingContext.indexOf(annotation.selectedText);
      if (textOffset !== -1) {
        const globalOffset = contextIndex + textOffset;
        return wrapRange(globalOffset, annotation.selectedText.length, nodeMap, annotation);
      }
    }
  }

  // Pass 2: Direct match on selectedText
  const textIndex = fullText.indexOf(annotation.selectedText);
  if (textIndex !== -1) {
    return wrapRange(textIndex, annotation.selectedText.length, nodeMap, annotation);
  }

  // Annotation cannot be anchored
  return false;
}

/**
 * Wrap a text range with a <mark> highlight element.
 *
 * @param {number} globalOffset — character offset in the full text
 * @param {number} length       — length of text to highlight
 * @param {Array}  nodeMap      — array of { node, start }
 * @param {Object} annotation   — annotation object
 * @returns {boolean}
 */
function wrapRange(globalOffset, length, nodeMap, annotation) {
  let startNode = null, startOffset = 0;
  let endNode = null, endOffset = 0;
  let remaining = length;
  let started = false;

  for (let i = 0; i < nodeMap.length; i++) {
    const { node, start } = nodeMap[i];
    const nodeEnd = start + node.textContent.length;

    if (!started && globalOffset >= start && globalOffset < nodeEnd) {
      startNode = node;
      startOffset = globalOffset - start;
      started = true;
    }

    if (started) {
      const localStart = (node === startNode) ? startOffset : 0;
      const available = node.textContent.length - localStart;

      if (remaining <= available) {
        endNode = node;
        endOffset = localStart + remaining;
        break;
      }
      remaining -= available;
    }
  }

  if (!startNode || !endNode) return false;

  try {
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);

    const mark = document.createElement('mark');
    mark.className = `${CONFIG.HIGHLIGHT_CLASS} color-${annotation.color}`;
    mark.dataset.annotatexId = annotation.id;

    // Styled tooltip via data attribute
    if (annotation.note) {
      mark.dataset.note = annotation.note;
    }

    range.surroundContents(mark);
    return true;
  } catch (e) {
    // Range spans multiple block elements — cannot use surroundContents
    console.warn('[AnnotateX] Could not wrap range for annotation:', annotation.id, e.message);
    return false;
  }
}

/**
 * Remove a single highlight by annotation ID.
 * Unwraps the <mark> element, preserving the text content.
 */
function removeHighlight(id) {
  const mark = document.querySelector(`[data-annotatex-id="${id}"]`);
  if (!mark) return;
  const parent = mark.parentNode;
  while (mark.firstChild) {
    parent.insertBefore(mark.firstChild, mark);
  }
  parent.removeChild(mark);
  parent.normalize(); // merge adjacent text nodes
}

/**
 * Remove all highlights from the page.
 */
function removeAllHighlights() {
  const marks = document.querySelectorAll(`.${CONFIG.HIGHLIGHT_CLASS}`);
  marks.forEach(mark => {
    const parent = mark.parentNode;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
    parent.normalize();
  });
}
