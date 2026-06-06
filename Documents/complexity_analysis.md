# 6. Complexity Analysis

## 6.1 `anchor.js` — `findAndHighlight()`

This is the most computationally significant function in the entire extension.

### Algorithm

| Step | Operation | Complexity |
| :--- | :--- | :--- |
| 1 | TreeWalker traversal | O(N), where N = number of text nodes in the DOM |
| 2 | String concatenation of all text nodes | O(N × avg_node_length) |
| 3 | Exact search for `surroundingContext` | O(N × M), where M = length of context string *(JavaScript `String.indexOf` uses Boyer-Moore-Horspool internally → average O(N))* |
| 4 | Range creation and DOM wrapping | O(1) once the node is found |

**Overall**: O(N × M) worst case, effectively **O(N)** on average due to JS engine's string search optimization.

- For a typical documentation page: **N ≈ 500–2000** text nodes, **M ≈ 200** chars. Executes in **under 10ms** per annotation.
- For K annotations on one page: **O(K × N × M)** — linear in number of annotations.

---

## 6.2 Fuzzy Match Fallback — Levenshtein on Sliding Window

Used **only** when exact context match fails.

| Parameter | Value |
| :--- | :--- |
| Window size W | `surroundingContext.length` |
| Text length T | Full concatenated page text |
| Per-window comparison | O(W²) — standard Levenshtein DP |
| **Overall** | **O(T × W²)** |

> [!WARNING]
> This is expensive. The following mitigations keep it practical:

- **Rare execution**: Only runs when exact match fails (page content has changed)
- **Cap W at 200 characters**: Limits the DP matrix size
- **Heuristic pre-filter**: Abort early if first 20 chars don't match at all

**Practical performance**: < 50ms on modern hardware even for long pages.

---

## 6.3 Storage Operations

| Operation | Complexity | Details |
| :--- | :--- | :--- |
| `getAnnotations(url)` | O(1) | Direct key lookup in `chrome.storage` |
| `saveAnnotation(url, obj)` | O(K) | Read array of K annotations, append, write back |
| `deleteAnnotation(url, id)` | O(K) | Read array, filter by id, write back |
| `getAllAnnotatedUrls()` | O(1) | Direct key lookup on `_annotatedUrls` index |

---

## 6.4 DOM Injection (Re-injection on page load)

For **K** annotations:

| Operation | Complexity |
| :--- | :--- |
| K × TreeWalker traversal | O(K × N) |
| K × Range creation | O(K) |
| K × DOM mutation | O(K) |
| **Total** | **O(K × N)** |

This runs at `document_idle` (after page is loaded), so it **does not block the initial render**.

> [!NOTE]
> For K = 20 annotations and N = 1000 text nodes, this is 20,000 operations — **under 5ms** in practice.

---

## 6.5 Toggle (Fresh → Annotated or Annotated → Fresh)

### Fresh View (remove highlights)

| Operation | Complexity |
| :--- | :--- |
| `querySelectorAll('.annotate-highlight')` | O(K) |
| For each: unwrap DOM node | O(1) |
| **Total** | **O(K)** |

### Annotated View (re-inject)

| Operation | Complexity |
| :--- | :--- |
| Same as page load re-injection | **O(K × N)** |

---

## 6.6 Space Complexity

| Component | Space | Details |
| :--- | :--- | :--- |
| In-memory DOM marks (per page) | O(K) | K injected `<mark>` elements |
| `chrome.storage.local` | O(U × K) | U = annotated URLs, K = annotations per URL |
| Sidebar React state | O(K) | Annotation list for current URL |
| TreeWalker traversal | O(N) | Text node array built during search |
