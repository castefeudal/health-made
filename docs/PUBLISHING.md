# Publishing Markov Health OS 2.0.0

Target branch: `agent/health-os-2-final`  
Base: `main`

The release branch contains the complete v3 production overlay on top of the merged Health OS 2 foundation.

## Validation before merge

```bash
npm run qa
```

Expected result:

- syntax checks: PASS
- static security lint: PASS
- tests: 24/24 PASS
- release/PWA build invariants: PASS

Browser interaction scenarios remain documented in `tests/E2E.md`; the execution container cannot reliably launch Chromium because of system D-Bus/zygote restrictions, so a screenshot/E2E pass must not be represented as completed by automation here.

## Suggested merge strategy

Use a squash merge after the PR checks are green.

Suggested squash title:

`Markov Health OS 2.0: production health timeline and premium interface`

## What must remain external

A real AI or OCR provider requires same-origin server endpoints and server-side provider credentials. The local application, structured context, consent, validation, review flows and failure states work without those providers.
