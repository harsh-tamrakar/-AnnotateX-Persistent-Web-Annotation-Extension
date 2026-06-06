// ============================================
// AnnotateX — Mini Floating Toolbar
// Appears near text selection with color picker and save button.
// Satisfies FR-08 (color selection) and FR-01/FR-02 (highlight + note).
// ============================================

let _selectedColor = 'yellow';

/**
 * Show the mini floating toolbar near the user's selection.
 * Includes color picker dots and a Save button.
 */
function showMiniToolbar(selection, x, y) {
  removeMiniToolbar();
  _selectedColor = 'yellow'; // reset default

  const toolbar = document.createElement('div');
  toolbar.id = CONFIG.TOOLBAR_ID;
  toolbar.setAttribute('style', `
    position: fixed !important;
    left: ${Math.min(x, window.innerWidth - 220)}px !important;
    top: ${Math.max(y - 55, 10)}px !important;
    z-index: 2147483647 !important;
    background: #1a1a2e !important;
    border: 1px solid #2d2d4a !important;
    border-radius: 10px !important;
    padding: 8px 14px !important;
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    box-shadow: 0 8px 24px rgba(0,0,0,0.45) !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
    animation: annotatex-fade-in 0.15s ease-out !important;
  `);

  // Color picker dots
  const colorContainer = document.createElement('div');
  colorContainer.setAttribute('style', 'display:flex !important; gap:5px !important; align-items:center !important;');

  Object.keys(COLORS).forEach(colorKey => {
    const dot = document.createElement('button');
    dot.setAttribute('style', `
      width: 18px !important;
      height: 18px !important;
      border-radius: 50% !important;
      border: 2px solid ${colorKey === 'yellow' ? '#fff' : 'transparent'} !important;
      background: ${COLORS[colorKey].bg.replace('0.55', '1').replace('0.35', '1').replace('0.30', '1')} !important;
      cursor: pointer !important;
      padding: 0 !important;
      transition: border-color 0.15s !important;
      outline: none !important;
    `);
    dot.title = COLORS[colorKey].name;
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      _selectedColor = colorKey;
      // Update border on all dots
      colorContainer.querySelectorAll('button').forEach(d => {
        d.style.borderColor = 'transparent';
      });
      dot.style.borderColor = '#fff';
    });
    colorContainer.appendChild(dot);
  });

  // Divider
  const divider = document.createElement('div');
  divider.setAttribute('style', 'width:1px !important; height:20px !important; background:#3a3a5c !important;');

  // Save button
  const saveBtn = document.createElement('button');
  saveBtn.textContent = '✦ Save';
  saveBtn.setAttribute('style', `
    background: #7F77DD !important;
    color: #fff !important;
    border: none !important;
    border-radius: 6px !important;
    padding: 5px 14px !important;
    cursor: pointer !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    font-family: inherit !important;
    letter-spacing: 0.02em !important;
    transition: background 0.15s !important;
    outline: none !important;
  `);
  saveBtn.addEventListener('mouseenter', () => { saveBtn.style.background = '#6b63cc'; });
  saveBtn.addEventListener('mouseleave', () => { saveBtn.style.background = '#7F77DD'; });
  saveBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    saveCurrentSelection(selection, _selectedColor);
  });

  toolbar.appendChild(colorContainer);
  toolbar.appendChild(divider);
  toolbar.appendChild(saveBtn);
  document.body.appendChild(toolbar);

  // Close on outside click (delayed to avoid immediate close)
  setTimeout(() => {
    document.addEventListener('mousedown', _handleOutsideClick, { once: true });
  }, 100);
}

/**
 * Handler for clicks outside the toolbar.
 */
function _handleOutsideClick(e) {
  const toolbar = document.getElementById(CONFIG.TOOLBAR_ID);
  if (toolbar && !toolbar.contains(e.target)) {
    removeMiniToolbar();
  }
}

/**
 * Remove the mini toolbar from the DOM.
 */
function removeMiniToolbar() {
  const t = document.getElementById(CONFIG.TOOLBAR_ID);
  if (t) t.remove();
  document.removeEventListener('mousedown', _handleOutsideClick);
}
