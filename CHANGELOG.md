# Changelog

## 2.0.0 - Production health timeline architecture

### Data integrity
- Added schema v3 with `labReports`, `labResults` and `events`.
- Added v2 -> v3 migration with pre-migration safety copy, validation and storage read-back verification.
- Added compatibility with legacy v1.1 raw JSON backup payloads.
- Preserved profile isolation and original migrated lab records in provenance.

### Labs
- Added first-class laboratory reports/results and provenance.
- Expanded Russian analyte catalog coverage while keeping unverified LOINC/FSLI mappings empty.
- Added analyte-specific unit normalization and converted reference ranges when values are normalized.
- Preserved original values, units and original references.
- Kept Lp(a) mass/molar universal conversion intentionally unsupported.
- Added review-first manual/CSV/PDF import, OCR adapter, duplicate detection, report comparison, analyte history and result management.

### Health model
- Added context events and a unified timeline.
- Added body/recovery summary metrics, calculated BMI/waist-to-height labels, sleep summaries and exploratory correlation UI.
- Added broader Quick Add support for body, BP, sleep, symptoms, events, training, medications, supplements, nutrition, notes and goals.
- Added multiple-profile switching, cascade-safe profile deletion and isolated demo data.

### AI / OCR
- Added same-origin AI and OCR gateway adapters with explicit consent.
- Added context minimization and structured AI response validation.
- Provider secrets remain server-side; the local core has no dependency on AI/OCR availability.

### Backup / privacy / security
- Restored encrypted `.mhos` export/import using the existing `MHOS_ENCRYPTED_BACKUP` envelope with PBKDF2-SHA256 + AES-GCM.
- Added optional SHA-256 backup checksum metadata.
- Hardened upload extension/MIME/size validation.
- Removed inline event handlers and generic dynamic `innerHTML` rendering from the v3 shell.
- Service Worker bypasses API/AI requests and uses explicit update confirmation.

### UI / accessibility
- Rebuilt the primary shell as a premium clinical-neutral decision interface with a stronger information hierarchy, quieter surfaces and higher-density analytical layouts.
- Added persistent global Quick Add on desktop and mobile so frequent health entries are available from every core screen.
- Added mobile search access, icon-based navigation, local-first privacy status and clearer profile context.
- Added a dedicated non-medical data freshness surface on the dashboard; freshness is explicitly separated from health quality.
- Completed Russian UI copy across dashboard analytics, correlations, settings, review flows and AI response sections.
- Added full light/dark tokens, mobile bottom navigation, 44px primary controls, reduced-motion support and text descriptions for analytical visualizations.

### Quality
- Added zero-dependency Node tests for critical domain logic and compatibility paths.
- Added syntax checks, static security lint, release build invariants and CI workflow.
- Expanded deterministic coverage to 24 tests, including OCR same-origin boundaries, Doctor Brief section isolation and backup tamper detection.
- Added an explicit browser E2E release matrix for environments where a browser runner is unavailable.

## 1.1.0

Previous production release and Health OS 2.0 laboratory foundation.
