# Software Requirements Specification (SRS)

## Project: AnnotateX Chrome Extension
- **Document Version**: 1.0

---

## 2.1 Scope
AnnotateX is a Chrome browser extension built on Manifest V3. It injects a content script into all HTTP/HTTPS pages, provides a React-based side panel for annotation management, and persists data using `chrome.storage.local`. It requires no backend server.

## 2.2 Overall Description

### 2.2.1 Product Perspective
AnnotateX operates entirely client-side within the Chrome browser. It has three runtime components:
1. A background service worker
2. A content script injected into web pages
3. A side panel UI

These three components communicate via Chrome's message passing API.

### 2.2.2 Operating Environment
- Chrome browser version 114 or higher (`chrome.sidePanel` API availability)
- Manifest V3 compliant
- No internet connection required after installation
- Tested on Windows, macOS, Linux

### 2.2.3 Assumptions
- User has Chrome 114+
- Pages being annotated are standard HTML documents
- User does not annotate the same URL from two different tabs simultaneously

## 2.3 System Features

### Feature 1: Text Selection and Annotation Creation
- **Trigger**: User selects text on any webpage and clicks "Save Highlight" in the mini toolbar that appears.
- **Inputs**:
  - Selected text string
  - Surrounding context (100 characters before and after selected text)
  - Page URL
  - Current timestamp
  - User-chosen color (default: yellow)
  - Optional note text
- **Processing**:
  1. Generate a UUID for the annotation
  2. Build an anchor object: `{ id, url, selectedText, surroundingContext, note, color, timestamp }`
  3. Save to `chrome.storage.local` under the key equal to the page URL
  4. Send a message to the side panel to refresh its annotation list
- **Output**: Highlight injected into DOM, annotation saved to storage.

### Feature 2: Annotation Re-injection on Page Load
- **Trigger**: `content.js` fires on every page load (`document_idle`).
- **Inputs**: Current page URL, all annotations stored under that URL key
- **Processing**:
  1. Retrieve annotations from `chrome.storage.local` for current URL
  2. For each annotation, call `anchor.js:findAndHighlight(annotation)`
  3. `anchor.js` uses `TreeWalker` to iterate all text nodes
  4. Search for `surroundingContext` string in concatenated text
  5. When found, identify the exact range matching `selectedText`
  6. Wrap that range in a `<mark class="annotate-highlight color-{color}" data-id="{id}">` element
- **Failure handling**: If `surroundingContext` is not found (page changed significantly), mark annotation as "unanchored" in sidebar UI but do not delete it.
- **Output**: All saved highlights visible on the page.

### Feature 3: Fresh / Annotated Toggle
- **Trigger**: User clicks the toggle button in the side panel.
- **Fresh View**: `content.js` removes all injected `<mark>` elements from the DOM. Annotations remain in storage — they are only visually hidden.
- **Annotated View**: `content.js` re-injects all marks by running the same anchor algorithm.
- **State**: Toggle state is stored in memory (not persisted — always defaults to Annotated View on new page load).

### Feature 4: Side Panel
- **Trigger**: User clicks the extension icon in the Chrome toolbar.
- **Contents**:
  - Toggle bar at the top (Fresh / Annotated)
  - List of all annotations for the current tab's URL
  - Each annotation card shows: highlighted text, note (editable inline), color indicator, delete button
  - "Annotated Pages" section below showing other URLs with saved annotations

## 2.4 External Interface Requirements

### 2.4.1 Chrome APIs Used
| API | Purpose |
|---|---|
| `chrome.storage.local` | Persist all annotation data |
| `chrome.sidePanel` | Render the sidebar UI |
| `chrome.runtime.sendMessage` | Communication between `content.js` and sidebar |
| `chrome.tabs.query` | Get current active tab URL in sidebar |
| `chrome.history.search` (Phase 3) | Fetch recently visited annotated URLs |
| `chrome.scripting` | Inject content scripts programmatically if needed |

### 2.4.2 DOM APIs Used
| API | Purpose |
|---|---|
| `document.createTreeWalker` | Walk all text nodes for anchor matching |
| `document.createRange` | Wrap found text in a highlight mark element |
| `window.getSelection` | Capture user's text selection |
| `MutationObserver` | Re-run anchor injection if DOM loads lazily |

## 2.5 Constraints
- `chrome.storage.local` has a 10MB total limit and 8KB per-item limit
- Manifest V3 service workers have no persistent state — all state must be in storage or passed via messages
- Content scripts cannot import ES modules directly — must be bundled or use `importScripts`
- `chrome.sidePanel` is only available in Chrome 114+
