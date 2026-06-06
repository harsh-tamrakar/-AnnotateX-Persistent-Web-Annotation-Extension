# Control Flow Diagrams

This document outlines the four key control flows within the AnnotateX Chrome Extension:
1. **User Creates a New Annotation**
2. **Page Load — Re-injection of Saved Highlights**
3. **Toggle — Fresh View / Annotated View**
4. **Delete Annotation**

---

## Flow 1: User Creates a New Annotation

### Visual Sequence
```mermaid
graph TD
    A[User selects text on page] --> B[content.js mouseup event fires]
    B --> C["window.getSelection() &rarr; get selected text + range"]
    C --> D["Extract surroundingContext <br/> (100 chars before & after)"]
    D --> E[Show mini floating toolbar near selection]
    E --> F[User clicks 'Save' on toolbar]
    F --> G[Generate UUID for annotation]
    G --> H["storage.js.saveAnnotation(url, annotationObject)"]
    H --> I["chrome.storage.local.set({ [url]: [...existing, newAnnotation] })"]
    I --> J["Inject &lt;mark&gt; element into DOM at selection range"]
    J --> K["chrome.runtime.sendMessage({ type: ANNOTATION_CREATED, url })"]
    K --> L[background.js receives message]
    L --> M["background.js.sendMessage to sidebar &rarr; REFRESH_SIDEBAR"]
    M --> N[sidebar.js re-fetches annotations for current URL]
    N --> O[Annotation card appears in side panel]

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style O fill:#bbf,stroke:#333,stroke-width:2px
```

### Text Flow
```
User selects text on page
        │
        ▼
content.js mouseup event fires
        │
        ▼
window.getSelection() → get selected text + range
        │
        ▼
Extract surroundingContext (100 chars before + after)
        │
        ▼
Show mini floating toolbar near selection
        │
        ▼
User clicks "Save" on toolbar
        │
        ▼
Generate UUID for annotation
        │
        ▼
storage.js.saveAnnotation(url, annotationObject)
        │
        ▼
chrome.storage.local.set({ [url]: [...existing, newAnnotation] })
        │
        ▼
Inject <mark> element into DOM at selection range
        │
        ▼
chrome.runtime.sendMessage({ type: ANNOTATION_CREATED, url })
        │
        ▼
background.js receives message
        │
        ▼
background.js.sendMessage to sidebar → REFRESH_SIDEBAR
        │
        ▼
sidebar.js re-fetches annotations for current URL
        │
        ▼
Annotation card appears in side panel
```

---

## Flow 2: Page Load — Re-injection of Saved Highlights

### Visual Sequence
```mermaid
graph TD
    A[User navigates to / refreshes page] --> B[content.js fires at document_idle]
    B --> C["Get URL: window.location.href"]
    C --> D["storage.js.getAnnotations(url)"]
    D --> E{annotations.length === 0?}
    E -- YES --> F[Exit / Do nothing]
    E -- NO --> G[Iterate each annotation]
    G --> H["anchor.js.findAndHighlight(annotation)"]
    H --> I[TreeWalker iterates all TEXT_NODE elements]
    I --> J[Search for annotation.surroundingContext]
    J --> K{Found exact match?}
    K -- YES --> L[Create Range & locate selectedText]
    L --> M["document.createRange() &rarr; surround with &lt;mark&gt;"]
    M --> N[Apply color class & data-id]
    N --> O[Return success &rarr; Mark as anchored in sidebar]
    K -- NO --> P[Attempt fuzzy match Levenshtein on sliding window]
    P --> Q{Fuzzy match found?}
    Q -- YES --> R[Highlight with relocated indicator]
    Q -- NO --> S["Mark annotation as unanchored in sidebar <br/> (Warning icon, keep in storage)"]

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style F fill:#ccc,stroke:#333,stroke-width:1px
    style O fill:#bbf,stroke:#333,stroke-width:2px
    style S fill:#ff9,stroke:#333,stroke-width:2px
```

### Text Flow
```
User navigates to / refreshes any page
        │
        ▼
content.js fires at document_idle
        │
        ▼
Get current URL: window.location.href
        │
        ▼
storage.js.getAnnotations(url) → returns array of annotations
        │
        ▼
annotations.length === 0?
    YES → exit, do nothing
    NO  → continue
        │
        ▼
For each annotation in array:
        │
        ▼
  anchor.js.findAndHighlight(annotation)
        │
        ▼
  TreeWalker iterates all TEXT_NODE elements
        │
        ▼
  Search for annotation.surroundingContext in text content
        │
        ├── FOUND (exact match)
        │       │
        │       ▼
        │   Create Range, locate selectedText within context
        │       │
        │       ▼
        │   document.createRange() → surround with <mark>
        │       │
        │       ▼
        │   Apply color class, attach data-id attribute
        │       │
        │       ▼
        │   Return success → mark as anchored in sidebar
        │
        └── NOT FOUND (exact match fails)
                │
                ▼
            Attempt fuzzy match (Levenshtein on sliding window)
                │
                ├── Fuzzy match found → highlight with "relocated" indicator
                │
                └── No match → mark annotation as "unanchored" in sidebar
                              (show warning icon, keep annotation in storage)
```

---

## Flow 3: Toggle — Fresh View / Annotated View

### Visual Sequence
```mermaid
graph TD
    A[User clicks toggle in sidebar] --> B[sidebar.js reads current toggle state]
    B --> C{Current state?}
    
    C -- ANNOTATED --> D[Switching to FRESH]
    D --> E["sendMessage: { type: TOGGLE_VIEW, mode: 'fresh' }"]
    E --> F[background.js forwards to content.js in active tab]
    F --> G["content.js: querySelectorAll('.annotate-highlight')"]
    G --> H["Unwrap: replace &lt;mark&gt;text&lt;/mark&gt; with text node"]
    H --> I[Page looks clean, no highlights visible]

    C -- FRESH --> J[Switching to ANNOTATED]
    J --> K["sendMessage: { type: TOGGLE_VIEW, mode: 'annotated' }"]
    K --> L[background.js forwards to content.js]
    L --> M[content.js: re-run full anchor injection]
    M --> N[All highlights reappear]

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style I fill:#bbf,stroke:#333,stroke-width:2px
    style N fill:#bbf,stroke:#333,stroke-width:2px
```

### Text Flow
```
User clicks toggle in sidebar
        │
        ▼
sidebar.js reads current toggle state
        │
        ├── Current: ANNOTATED → switching to FRESH
        │       │
        │       ▼
        │   sendMessage: { type: TOGGLE_VIEW, mode: 'fresh' }
        │       │
        │       ▼
        │   background.js forwards to content.js in active tab
        │       │
        │       ▼
        │   content.js: document.querySelectorAll('.annotate-highlight')
        │       │
        │       ▼
        │   For each mark: unwrap — replace <mark>text</mark> with text node
        │       │
        │       ▼
        │   Page looks clean, no highlights visible
        │
        └── Current: FRESH → switching to ANNOTATED
                │
                ▼
            sendMessage: { type: TOGGLE_VIEW, mode: 'annotated' }
                │
                ▼
            content.js: re-run full anchor injection (same as Flow 2)
                │
                ▼
            All highlights reappear
```

---

## Flow 4: Delete Annotation

### Visual Sequence
```mermaid
graph TD
    A[User clicks delete on annotation card in sidebar] --> B["sidebar.js: sendMessage { type: DELETE_ANNOTATION, url, id }"]
    B --> C[background.js forwards to content.js and calls storage.js]
    C --> D["storage.js.deleteAnnotation(url, id)"]
    D --> E["getAnnotations(url)"]
    E --> F[Filter out annotation with matching id]
    F --> G["setAnnotations(url, filtered array)"]
    G --> H["content.js: querySelector(data-id=id)"]
    H --> I["Unwrap the &lt;mark&gt; element"]
    I --> J[sidebar.js: remove card from UI]

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style J fill:#bbf,stroke:#333,stroke-width:2px
```

### Text Flow
```
User clicks delete on annotation card in sidebar
        │
        ▼
sidebar.js: sendMessage { type: DELETE_ANNOTATION, url, id }
        │
        ▼
background.js forwards to content.js and calls storage.js
        │
        ▼
storage.js.deleteAnnotation(url, id):
    - getAnnotations(url)
    - filter out annotation with matching id
    - setAnnotations(url, filtered array)
        │
        ▼
content.js: document.querySelector(`[data-id="${id}"]`)
    - unwrap the <mark> element
        │
        ▼
sidebar.js: remove card from UI
```
