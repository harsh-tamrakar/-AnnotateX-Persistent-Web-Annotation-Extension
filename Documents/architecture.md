# Architectural Design Document (ADD)

## 3.1 System Architecture Overview
AnnotateX follows a 3-layer client-side architecture with Chrome message passing as the communication bus. There is no server, no database, and no authentication layer.

```
┌─────────────────────────────────────────────────────┐
│                   Chrome Browser                    │
│                                                     │
│  ┌──────────────┐        ┌─────────────────────┐   │
│  │  Web Page    │        │    Side Panel        │   │
│  │  (any URL)   │        │    (React UI)        │   │
│  │              │        │                      │   │
│  │ content.js   │◄──────►│  sidebar.js          │   │
│  │ highlights   │  msg   │  App.jsx             │   │
│  │ .css         │  passing│  storage.js calls   │   │
│  └──────┬───────┘        └──────────┬───────────┘   │
│         │                           │               │
│         ▼                           ▼               │
│  ┌────────────────────────────────────────────┐     │
│  │           background.js (service worker)   │     │
│  │   - icon click → open sidePanel            │     │
│  │   - route messages between layers          │     │
│  └────────────────────────────────────────────┘     │
│                        │                            │
│                        ▼                            │
│  ┌────────────────────────────────────────────┐     │
│  │         chrome.storage.local               │     │
│  │   { "https://docs.spring.io/...": [...] }  │     │
│  └────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────┘
```

---

## 3.2 Component Descriptions

### 3.2.1 `content.js` (Content Script Layer)
- **Responsibility**: All DOM interaction. It is the only component that can read or modify the page's HTML.
- **Sub-responsibilities**:
  - Detect text selection via `mouseup` event listener
  - Show mini toolbar near selection
  - Call `anchor.js` to inject `<mark>` elements on page load
  - Listen for messages from `background.js` to toggle highlight visibility
  - Send selected text + context to `background.js` on save
- **Runs in**: The context of the web page (isolated world — cannot access page's JS variables, but can access its DOM)

### 3.2.2 `background.js` (Service Worker Layer)
- **Responsibility**: Coordination. Acts as a message router and lifecycle handler.
- **Sub-responsibilities**:
  - On extension icon click: call `chrome.sidePanel.open()`
  - Receive messages from `content.js` (new annotation created) and forward to sidebar
  - Receive toggle command from sidebar and forward to `content.js`
  - Handle `chrome.history.search` queries (Phase 3)
- **Runs in**: Service worker context — no DOM access, wakes on events, sleeps when idle

### 3.2.3 `sidebar/` (Side Panel UI Layer)
- **Responsibility**: The visual workspace for the user.
- **Sub-responsibilities**:
  - Display annotation list for the current URL (fetched from storage on load)
  - Render toggle switch that sends a message to `content.js`
  - Allow inline editing of notes (saved back to storage on blur)
  - Allow deletion of annotations
  - Show all previously annotated URLs
- **Runs in**: A separate browser panel — its own HTML/JS/CSS context, isolated from the web page

### 3.2.4 `storage.js` (Data Access Layer)
- **Responsibility**: All reads and writes to `chrome.storage.local`. Acts as the single source of truth.
- **Details**: All other components import from `storage.js` — no component calls `chrome.storage` directly.

### 3.2.5 `anchor.js` (Anchor Resolution Engine)
- **Responsibility**: Given a saved annotation object, find its text in the current DOM and return a `Range` object that can be highlighted.
- **Details**: This is the most complex module. It uses a two-pass algorithm:
  - **Pass 1**: Exact match on `surroundingContext`
  - **Pass 2**: Fuzzy match using Levenshtein distance if exact match fails (handles minor doc updates)

---

## 3.3 Communication Architecture
All inter-component communication uses Chrome's message passing:

```
content.js  ──sendMessage──►  background.js  ──sendMessage──►  sidebar.js
                                    ▲
sidebar.js  ──sendMessage──────────►│
                                    │
content.js  ◄──sendMessage──────────┘
```

### Message Types
| Message Type | From | To | Payload |
| :--- | :--- | :--- | :--- |
| `ANNOTATION_CREATED` | `content.js` | `background.js` | annotation object |
| `REFRESH_SIDEBAR` | `background.js` | `sidebar.js` | `{ url }` |
| `TOGGLE_VIEW` | `sidebar.js` | `background.js` | `{ mode: 'fresh' \| 'annotated' }` |
| `APPLY_TOGGLE` | `background.js` | `content.js` | `{ mode }` |
| `DELETE_ANNOTATION` | `sidebar.js` | `background.js` | `{ url, id }` |
| `ANNOTATION_DELETED` | `background.js` | `content.js` | `{ id }` |

---

## 3.4 Technology Choices and Justification
| Technology | Choice | Reason |
| :--- | :--- | :--- |
| **Extension standard** | Manifest V3 | Required by Chrome; MV2 deprecated |
| **Sidebar API** | `chrome.sidePanel` | Persistent panel, not a popup (survives page navigation) |
| **Storage** | `chrome.storage.local` | Persistent, no network, 10MB limit is sufficient |
| **UI framework** | React (plain JS fallback) | Component model fits annotation list well |
| **Anchor strategy** | Text context matching | Survives DOM changes unlike XPath or CSS selector approaches |
| **Build tool** | Vite (optional) | Simple, fast; not needed if using plain JS |
