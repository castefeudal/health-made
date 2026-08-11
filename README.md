# Markov Health OS 2.0.0

Markov Health OS is a local-first personal health timeline for structured laboratory results, body/recovery data, sleep, training, nutrition, symptoms, medications, supplements, events and goals.

The product is designed around a temporal model: what happened, what changed, what context overlapped in time, what data is stale or uncertain, and what can be summarized for a clinician.

## Core principles

- Local-first structured health data. No account, analytics, trackers or telemetry by default.
- Laboratory reference intervals are report-specific. The app does not invent a universal medical "normal" range.
- Original lab values and units are retained after normalization.
- Unit conversion is analyte-specific and deterministic. Lp(a) mass-to-molar conversion is intentionally unsupported.
- Automated document extraction is review-first: extract -> review -> user confirmation -> save.
- `Code computes. AI explains.` Calculations are deterministic; AI receives prepared facts.
- AI/OCR transmission requires explicit user action and a same-origin gateway. Provider secrets never belong in frontend code.
- Missing data is not interpreted as poor health.

## Markov Health OS 2.0

### Schema v3

Schema v3 introduces first-class `labReports`, `labResults` and `events` while preserving the existing profile-scoped collections. A v2 state is migrated only after a safety copy is written, then validated and read back from storage. Existing v1.1 raw JSON backups are accepted and migrated.

### Laboratory workflow

- Russian analyte catalog with RU/EN aliases and abbreviations.
- Report-specific laboratory references.
- Numeric, qualitative, less-than and greater-than results.
- Analyte-specific normalization with original values preserved.
- Manual, CSV and text-layer PDF import.
- Image/scanned-PDF OCR gateway adapter with explicit consent and manual OCR-text fallback.
- Mandatory review before imported health data is persisted.
- Duplicate report detection.
- Report pages, result edit/delete, report deletion, report comparison and analyte history.

### Health timeline and dashboard

The dashboard is a decision surface rather than a score wall. It shows current metrics, a limited attention list, material changes, data freshness, body/recovery summaries, goals, context events and exploratory correlations with a minimum sample threshold.

The global timeline combines reports, measurements, sleep, training, symptoms, medications, supplements, events and goals for the active profile.

### Doctor Brief

A local Consultation Brief can be generated for a selected period and copied, exported as TXT/JSON or printed/saved as PDF through the browser.

### AI and OCR

The static frontend contains no provider API key. Configure same-origin gateway paths in Settings, for example:

```text
/api/health-ai
/api/health-ocr
```

AI requests use a structured context and validated structured response. OCR uploads are never sent unless the user checks the explicit consent control and starts the OCR action.

Provider deployment and credentials are external activation steps; the core Health OS remains usable without them.

## Privacy and storage

Structured data is stored in the browser under the existing key:

```text
markovHealthOSData
```

The schema version is now `3`. The app keeps a safety copy under `markovHealthOSDataSafetyBackup` before migration/restore transactions.

JSON backups are portable but unencrypted. `.mhos` backups use PBKDF2-SHA256 and AES-GCM through Web Crypto and remain compatible with the v1.1 `MHOS_ENCRYPTED_BACKUP` envelope.

Original uploaded documents are not persisted by default. They are processed for extraction and converted into user-reviewed structured records.

## Run locally

```bash
python -m http.server 8000
```

Open `http://localhost:8000/`.

## Validation

```bash
npm run qa
```

`npm run qa` последовательно выполняет syntax check, статический security-lint, unit/integration tests и release build invariants.

The current deterministic suite contains 24 tests covering migration, state integrity, backup compatibility, lab aliases, reference normalization, unit conversion guardrails, CSV/text parsing, upload validation, duplicate detection, AI/OCR same-origin contracts, Doctor Brief section isolation, profile isolation, encrypted backups, checksum tamper detection, CSP-sensitive rendering invariants, Service Worker privacy rules and correlation thresholds. Browser E2E release scenarios are documented in `tests/E2E.md`.

## Project structure

```text
index.html
manifest.webmanifest
sw.js
src/
  catalog/labs.js
  v3/
    app.js
    schema.js
    storage.js
    labs.js
    importers.js
    ai.js
    ocr.js
    analytics.js
    brief.js
    crypto.js
    styles.css
tests/
  v3.test.mjs
  E2E.md
scripts/
  lint.mjs
  build-check.mjs
docs/
privacy.html
terms.html
```

## Important limitations

- This is an informational personal data tool, not a medical device and not a diagnostic system.
- The built-in PDF extractor targets accessible text-layer PDFs. Scanned or heavily encoded PDFs require OCR; the gateway adapter is implemented, but an OCR service must be deployed/configured to invoke an external OCR provider.
- AI provider invocation requires a deployed same-origin gateway and server-side provider credentials.
- Correlations are exploratory observations and do not establish causation.

## Release

- Application: **2.0.0**
- Data schema: **3**
- Service Worker cache: **markov-health-os-v2.0.0**

`RELEASE-MANIFEST.sha256` verifies every file supplied by the 2.0.0 working-tree overlay. Files intentionally inherited unchanged from the merged v2 baseline (for example the existing base analyte catalog, legacy legal stylesheet and binary icons) remain protected by Git history and are not replaced by the overlay.

Product concept & development: Pavel Markov.
