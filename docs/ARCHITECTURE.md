# Architecture

## Runtime

Markov Health OS 2.0 remains a static local-first PWA. The frontend is intentionally dependency-light and uses native browser APIs.

## Boundaries

- `schema.js`: schema version, validation and deterministic migration.
- `storage.js`: transactional local persistence, safety copies, backup/restore.
- `labs.js`: analyte lookup, reference status, unit normalization and lab summaries.
- `importers.js`: untrusted file validation, CSV/text parsing, report construction and duplicate scoring.
- `crypto.js`: Web Crypto encrypted backup compatibility.
- `analytics.js`: deterministic correlation/pairing logic.
- `ai.js`: minimized AI context, response contract and same-origin gateway adapter.
- `ocr.js`: same-origin OCR gateway adapter.
- `brief.js`: deterministic local clinician brief generation.
- `app.js`: UI composition and user flows. It does not own storage primitives.

## Data flow

User input -> validation/normalization -> repository transaction -> read-back verified local state -> render.

Import flow: file -> validation -> extraction/parser -> analyte normalization -> review -> explicit confirmation -> LabReport/LabResults -> timeline/backup.

AI flow: local state -> deterministic calculations -> minimized context -> explicit consent -> same-origin gateway -> provider -> structured JSON -> validation -> safe text rendering.

## Storage choice

Structured v3 data remains in localStorage for compatibility and simplicity. Original medical documents are not persisted by default, so IndexedDB is not required for the current release. A future attachment feature should introduce an IndexedDB document repository behind the same storage boundary rather than moving data for fashion alone.
