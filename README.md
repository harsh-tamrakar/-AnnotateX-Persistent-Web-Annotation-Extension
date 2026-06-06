# AnnotateX — Persistent Web Annotation Extension

A Chrome extension that lets you **highlight any text** on any webpage, **attach notes**, and **persist them across refreshes**. Built on Manifest V3 with intelligent text re-anchoring.

## ✨ Features

| Feature | Status |
|---|---|
| Text selection → save as highlight | ✅ |
| Attach notes to highlights | ✅ |
| Highlights persist across page refresh & browser restart | ✅ |
| Intelligent re-anchoring when page content changes | ✅ |
| Color picker (yellow, green, blue, pink) | ✅ |
| Fresh / Annotated view toggle | ✅ |
| Sidebar panel with all annotations | ✅ |
| Click annotation → scroll to highlight | ✅ |
| Styled tooltip on hover | ✅ |
| All annotated pages list | ✅ |
| MutationObserver for lazy-loaded content | ✅ |
| Unanchored annotation warnings | ✅ |

## 📁 Project Structure

```
src/
├── manifest.json              # Chrome MV3 manifest
├── background.js              # Service worker (message router)
├── content/                   # Injected into web pages
│   ├── content.js             # Selection events, messaging
│   ├── anchor.js              # Text anchoring engine
│   └── toolbar.js             # Floating toolbar with color picker
├── sidebar/                   # Side panel UI
│   ├── sidebar.html           # Panel shell
│   ├── sidebar.js             # Panel logic
│   └── sidebar.css            # Dark theme styles
├── shared/                    # Shared modules (no duplication)
│   ├── constants.js           # Message types, colors, config
│   ├── utils.js               # ID gen, URL normalization
│   └── storage.js             # chrome.storage.local wrapper
├── styles/
│   └── highlights.css         # Highlight + tooltip styles
└── assets/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 🚀 Installation & Distribution

### Option A: Standard Users (Chrome Web Store)
To distribute this extension so users can add it with a single click (just like other extensions):
1. Register for a [Chrome Web Store Developer Account](https://chrome.google.com/webstore/devconsole).
2. Go to the Developer Dashboard and click **Add new item**.
3. Upload the pre-packaged zip file: **[AnnotateX.zip](file:///e:/Chrome/AnnotateX.zip)** (automatically generated in the project root).
4. Fill out the store listing details (description, screenshots, icons) and submit for review. Once approved, users can install it directly from the Chrome Web Store!

### Option B: Developers (Manual Install)
1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in top-right).
4. Click **Load unpacked**.
5. Select the `src/` folder.

## 📖 Usage

1. **Default Mode**: When you load a new page, it is **Fresh** by default (no highlights are visible).
2. **Highlighting**: Select any text on a webpage. A mini toolbar will float into view. Pick a color and click **✦ Save** (this automatically toggles the page to **Annotated** mode so you can see your highlight).
3. **Sidebar Workspace**: Click the **AnnotateX icon** in your extension toolbar to open the sidebar. Here, you can toggle between **Fresh** and **Annotated** modes, view all page annotations, type notes, or delete highlights.
4. **Direct Deletion**: In **Annotated** mode, simply **click on any highlight on the page** to show a floating **🗑 Delete Highlight** button. Click it to immediately remove the highlight from both the page and the sidebar.
5. **Scroll to Highlight**: Click any annotation card in the sidebar to smooth-scroll the page back to that highlight.

## 🔧 Technical Details

- **Manifest V3** compliant (service worker, no background pages)
- **chrome.storage.local** for persistence (10MB limit, ~20,000 annotations)
- **TreeWalker** for text node traversal and re-anchoring
- **Context-based anchoring** survives DOM changes (unlike XPath/CSS selectors)
- **MutationObserver** handles lazy-loaded content
- **No build step** required — plain JavaScript, no bundler needed

## 📋 Documentation

Full specification documents are in the `Documents/` folder:
- PRD, SRS, Architecture, Control Flow, Data Flow, Complexity Analysis

## 📄 License

MIT
