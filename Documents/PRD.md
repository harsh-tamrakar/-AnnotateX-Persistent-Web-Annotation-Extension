# Product Requirements Document (PRD)

## Product Name: AnnotateX — Persistent Web Annotation Extension
- **Version**: 1.0
- **Author**: Harsh Tamrakar
- **Date**: June 2026

---

## 1.1 Problem Statement
Developers and students reading technical documentation (Spring Boot docs, MDN, Javadoc, etc.) lose all their reading context on page refresh or revisit. Existing highlighter extensions store highlights by DOM position, which breaks when documentation pages update. There is no tool that combines persistent, context-anchored annotations with a clean reading toggle and a notes workspace — all without leaving the browser.

## 1.2 Goals
- Allow users to highlight any text on any webpage and attach a note to it
- Persist annotations across page refreshes and browser restarts
- Re-anchor highlights intelligently even when page content changes
- Provide a toggle between Fresh View (clean page) and Annotated View (highlights visible)
- Show a history of all previously annotated URLs in one panel

## 1.3 Non-Goals (v1.0)
- No cloud sync across devices
- No collaboration or shared annotations
- No PDF or local file annotation
- No AI summarization of notes
- No export to Notion/Obsidian (planned v2)

## 1.4 User Personas

### Persona 1 — Harsh (Primary)
Final-year CS student preparing for placements. Reads Spring Boot, Java, DSA docs daily. Needs to mark important concepts, attach "why this matters" notes, and return to annotated pages without redoing work.

### Persona 2 — Working Developer
Uses MDN and framework docs during feature development. Wants to mark decisions, edge cases, and gotchas directly on the doc page and revisit them later.

## 1.5 Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| **FR-01** | User can select any text on a webpage and save it as a highlight | P0 |
| **FR-02** | User can attach a text note to each highlight | P0 |
| **FR-03** | Highlights re-appear on page reload at the correct position | P0 |
| **FR-04** | Toggle button switches between Fresh View and Annotated View | P0 |
| **FR-05** | Side panel shows all annotations for the current URL | P0 |
| **FR-06** | Side panel shows list of all previously annotated URLs | P1 |
| **FR-07** | User can delete individual annotations | P0 |
| **FR-08** | User can choose highlight color (yellow, green, blue, pink) | P1 |
| **FR-09** | Hovering a highlight shows the attached note as a tooltip | P1 |
| **FR-10** | Clicking an annotation in the sidebar scrolls to it on the page | P1 |
| **FR-11** | Chrome history integration shows recently visited annotated URLs | P2 |

## 1.6 Non-Functional Requirements

| ID | Requirement |
|---|---|
| **NFR-01** | Highlight injection on reload must complete within 300ms |
| **NFR-02** | Storage reads must not block page rendering |
| **NFR-03** | Extension must not break any existing page styles or scripts |
| **NFR-04** | Must work on HTTPS pages (Chrome restricts extensions on chrome:// and file://) |
| **NFR-05** | Must follow Manifest V3 compliance (no background pages, only service workers) |
| **NFR-06** | Annotation data must survive browser restart (`chrome.storage.local`, not `sessionStorage`) |

## 1.7 User Stories
- **As a user**, I want to select text on a docs page and save it so that I can remember important points.
- **As a user**, I want my highlights to reappear when I reload the page so I don't lose my reading progress.
- **As a user**, I want to write a short note on each highlight so I can record why it matters to me.
- **As a user**, I want a clean toggle so I can read without distractions and switch to annotated mode when reviewing.
- **As a user**, I want to see which pages I have annotated so I can navigate back to them quickly.
