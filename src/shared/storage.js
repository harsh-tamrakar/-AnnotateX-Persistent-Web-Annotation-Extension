// ============================================
// AnnotateX — Storage Layer
// Single source of truth for chrome.storage.local
// ============================================

/**
 * Get all annotations for a given URL.
 * @param {string} url — normalized page URL
 * @returns {Promise<Array>} — array of annotation objects
 */
async function getAnnotations(url) {
  return new Promise((resolve) => {
    chrome.storage.local.get([url], (result) => {
      resolve(result[url] || []);
    });
  });
}

/**
 * Save a new annotation for a URL.
 * Appends to the existing array and updates the URL index.
 */
async function saveAnnotation(url, annotation) {
  const existing = await getAnnotations(url);
  const updated = [...existing, annotation];
  await new Promise((resolve) => {
    chrome.storage.local.set({ [url]: updated }, resolve);
  });
  await addToUrlIndex(url);
}

/**
 * Update the note text of a specific annotation.
 */
async function updateAnnotationNote(url, id, newNote) {
  const existing = await getAnnotations(url);
  const updated = existing.map(a =>
    a.id === id ? { ...a, note: newNote } : a
  );
  await new Promise((resolve) => {
    chrome.storage.local.set({ [url]: updated }, resolve);
  });
}

/**
 * Update the anchored status of a specific annotation.
 * Called after re-injection to mark annotations that couldn't be found.
 */
async function updateAnnotationAnchored(url, id, anchored) {
  const existing = await getAnnotations(url);
  const updated = existing.map(a =>
    a.id === id ? { ...a, anchored } : a
  );
  await new Promise((resolve) => {
    chrome.storage.local.set({ [url]: updated }, resolve);
  });
}

/**
 * Delete a specific annotation by ID.
 * If it was the last annotation for that URL, removes the URL key and index entry.
 */
async function deleteAnnotation(url, id) {
  const existing = await getAnnotations(url);
  const updated = existing.filter(a => a.id !== id);
  if (updated.length === 0) {
    await new Promise((resolve) => {
      chrome.storage.local.remove(url, resolve);
    });
    await removeFromUrlIndex(url);
  } else {
    await new Promise((resolve) => {
      chrome.storage.local.set({ [url]: updated }, resolve);
    });
  }
}

/**
 * Get the list of all URLs that have at least one annotation.
 * Uses the _annotatedUrls index key for O(1) lookup.
 */
async function getAllAnnotatedUrls() {
  return new Promise((resolve) => {
    chrome.storage.local.get([CONFIG.URLS_INDEX_KEY], (result) => {
      resolve(result[CONFIG.URLS_INDEX_KEY] || []);
    });
  });
}

/**
 * Add a URL to the annotated URLs index (if not already present).
 */
async function addToUrlIndex(url) {
  const urls = await getAllAnnotatedUrls();
  if (!urls.includes(url)) {
    await new Promise((resolve) => {
      chrome.storage.local.set({
        [CONFIG.URLS_INDEX_KEY]: [...urls, url]
      }, resolve);
    });
  }
}

/**
 * Remove a URL from the annotated URLs index.
 */
async function removeFromUrlIndex(url) {
  const urls = await getAllAnnotatedUrls();
  const updated = urls.filter(u => u !== url);
  await new Promise((resolve) => {
    chrome.storage.local.set({
      [CONFIG.URLS_INDEX_KEY]: updated
    }, resolve);
  });
}
