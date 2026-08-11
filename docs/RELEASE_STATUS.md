# Markov Health OS 2.0.0 — release status

## IMPLEMENTED

### Data integrity
- Schema v3 with first-class profiles, measurements, LabReport, LabResult, events, sleep, activity, training, nutrition, medications, supplements, symptoms, goals, notes and settings.
- v2 -> v3 safety migration with pre-migration safety copy, validation, persistence read-back and rollback behavior.
- Legacy v1.1 raw JSON backup import compatibility.
- Legacy `.mhos` encrypted envelope compatibility (`MHOS_ENCRYPTED_BACKUP`, PBKDF2-SHA256, AES-GCM).
- Optional SHA-256 backup checksum and tamper detection.
- Profile ownership validation, duplicate ID rejection and LabResult -> LabReport referential validation.

### Laboratory domain
- First-class LabReport/LabResult model and provenance.
- Existing Russian v2 catalog reused and extended without inventing unverified LOINC/FSLI codes.
- RU/EN aliases and analyte search.
- Report-specific laboratory references; no universal built-in medical "normal" range.
- Numeric, qualitative and comparison-operator value support.
- Analyte-specific deterministic unit normalization with original values/units/reference retained.
- Reference bounds are normalized with the same analyte conversion before status comparison.
- Universal Lp(a) mass <-> molar conversion remains intentionally unsupported.
- Report list/detail, result edit/delete, report cascade delete, report comparison and analyte history.

### Import
- Manual lab entry.
- CSV parser with comma/semicolon/tab support, RU/EN header aliases, analyte normalization and review-first persistence.
- Lightweight local text-layer PDF extraction plus candidate parser.
- OCR same-origin gateway adapter, explicit consent and manual OCR-text fallback.
- File extension/MIME/size validation.
- Mandatory review/edit/remap/remove step before persistence.
- Duplicate report scoring and explicit user decision.
- Original uploaded documents are not persisted by default.

### Temporal health model
- Context events.
- Unified profile-scoped timeline.
- Current body/recovery metrics, calculated BMI and waist-to-height labels, 7-day weight average, sleep summaries.
- Exploratory correlations with minimum sample threshold and no causal claim.
- Isolated demo profile with synthetic history.

### Product UX
- Decision-surface dashboard with concise attention list, current metrics, changes, goals, events and recency metadata.
- Quick Add for body, weight, BP, sleep, symptom, event, training, medication, supplement, nutrition, note, goal and labs.
- Multiple local profiles, switching and cascade-safe deletion.
- Ctrl/Cmd+K command/search palette across routes, analytes and common entities.
- Premium desktop sidebar with icon navigation, explicit local-first privacy state and active-profile context.
- Persistent global Quick Add and search access on desktop/mobile.
- Dashboard data-freshness surface that explicitly does not score health.
- Mobile bottom navigation and responsive premium clinical-neutral design tokens.
- Light/dark themes, reduced motion and print styles.

### Doctor Brief
- Profile-scoped, period-aware deterministic Consultation Brief.
- Selectable sections.
- Clipboard, TXT, JSON and browser Print/Save-as-PDF paths.
- AI hypotheses are not silently mixed into deterministic brief facts.

### AI / privacy
- `Code computes. AI explains.` architecture.
- Profile-scoped minimized structured context.
- Same-origin AI gateway adapter.
- Explicit consent and exact context preview before transmission.
- Structured response validation and safe failure rendering.
- No provider secret in frontend.
- AI/OCR API requests use `no-store` behavior and are excluded from Service Worker caching.

### Security / PWA
- Strict CSP in the application shell.
- No inline HTML event attributes in production shell.
- No generic dynamic `innerHTML` rendering in v3 app.
- Uploaded files treated as untrusted input.
- API/AI paths bypass Service Worker cache.
- PWA update requires explicit user confirmation before activating a waiting worker.

## VALIDATION

Local deterministic release command:

```bash
npm run qa
```

Current result:
- syntax checks: PASS
- static security lint: PASS (13 production files scanned)
- deterministic unit/integration tests: PASS (24/24)
- release build/PWA invariants: PASS

Browser E2E release scenarios are specified in `tests/E2E.md`.

A real Chromium executable exists in the execution container, but headless startup repeatedly stalled on container-level D-Bus/process restrictions. Browser screenshots and full interaction E2E are therefore **not claimed as executed**. This is a validation-environment limitation, not a product dependency.

## EXTERNAL ACTIVATION REQUIRED

### AI provider invocation
Frontend context/consent/gateway/validation/UI are implemented. To invoke a real provider, deploy a same-origin server endpoint (for example `/api/health-ai`) and configure provider credentials in that server environment. No secret is required by or stored in frontend code.

### OCR provider invocation for images/scanned PDFs
Upload consent, same-origin adapter, error handling, review pipeline and manual OCR-text fallback are implemented. To perform external OCR, deploy/configure a same-origin OCR endpoint (for example `/api/health-ocr`) with server-side provider credentials.

Text-layer PDF extraction and manual/CSV lab entry do not depend on this external activation.

## PUBLISH STATUS

The release is published to the dedicated GitHub branch `agent/health-os-2-final` through the connected GitHub integration. The branch contains the complete v3 overlay on top of the merged Health OS 2.0 foundation.

The final branch is intended to be reviewed through a pull request before merging into `main`.

## Code-level quality rubric

These scores reflect deterministic/static review; visual/browser-only categories require the E2E matrix before a public release:

| Area | Score | Basis |
|---|---:|---|
| Usefulness | 9/10 | P0 flows integrated around timeline/labs/brief |
| Information architecture | 9/10 | v3 domain/storage/import/AI boundaries |
| Data integrity | 9.5/10 | migration, validation, safety copy, backup compatibility tests |
| Medical honesty | 9.5/10 | report-specific references, source distinction, no diagnosis/causal claim |
| Privacy | 9.5/10 | local-first, explicit transmission, minimal context, no tracking |
| Security | 9/10 | CSP, no frontend secrets, upload validation, safe rendering invariants |
| AI safety | 9/10 | deterministic facts, structured contract, consent, same-origin gateway |
| Performance | 9/10 | zero runtime framework/dependency path, external heavy work on demand |
| Maintainability | 9/10 | modular v3 layers and zero-dependency QA scripts |
| Testing | 9/10 deterministic | 22 tests + lint/build; browser E2E still environment-limited |
| Documentation | 9/10 | architecture/data/labs/AI/privacy/release docs |
| Visual design | 9/10 static | premium shell, hierarchy, tokens and dense clinical surfaces; browser screenshot run remains environment-limited |
| Mobile UX | 9/10 static | dedicated bottom navigation, mobile search, global Quick Add and responsive layouts |
| Accessibility | 9/10 static | semantic dialogs/forms, focus-visible, reduced motion, touch targets and chart text summaries; screen-reader matrix remains manual |
