# Markov Health OS 2.0 browser E2E matrix

This matrix is the release browser checklist. It is intentionally separate from deterministic Node tests because the current execution container could not launch Chromium reliably (system D-Bus/headless limitation).

## Desktop

- [ ] First launch renders onboarding with no console errors.
- [ ] Create first profile and land on Dashboard.
- [ ] Add weight, BP, sleep, symptom, event, training, medication, supplement, nutrition, note, and goal through Quick Add.
- [ ] Open command palette with Ctrl/Cmd+K; search a page, an analyte alias, and an add command.
- [ ] Import CSV -> review -> edit mapping/value/unit/reference -> confirm -> LabReport appears.
- [ ] Import text PDF -> review -> confirm.
- [ ] Upload unsupported/scanned PDF -> clear OCR/manual fallback state; no automatic save.
- [ ] Open LabReport; edit/delete one result; delete report confirms cascading result count.
- [ ] Compare two reports; compatible units normalize, incompatible units show an explicit comparison limitation.
- [ ] Open analyte details; history and reference bands retain per-result reference context.
- [ ] Timeline filters/search render records from multiple domains.
- [ ] Doctor Brief period/section controls affect output; clipboard/TXT/JSON/print paths work.
- [ ] AI screen previews minimized context before consent; unconfigured/offline/invalid gateway responses fail safely.
- [ ] Export JSON backup; restore preview/confirmation works; tampered checksum is rejected.
- [ ] Export encrypted .mhos; decrypt/import with correct password; reject incorrect password.
- [ ] Switch profiles; confirm records never cross profile boundaries.
- [ ] Demo mode uses isolated synthetic profile and never mutates real records.
- [ ] Delete profile shows linked record count; delete-all requires explicit confirmation.
- [ ] PWA update asks before activating waiting worker.

## Mobile / responsive

Run at 320, 360, 375, 390, 430, and 768 CSS px:

- [ ] No page-level horizontal overflow.
- [ ] Bottom navigation is reachable and does not overlap content/safe-area.
- [ ] Quick Add is thumb-reachable; forms remain usable with software keyboard.
- [ ] Import review table/card view is usable without losing edit/remove controls.
- [ ] Dashboard keeps the attention list concise and readable.
- [ ] Lab report/analyte/Doctor Brief screens remain legible.

## Theme / accessibility

- [ ] Light and dark themes: readable text, borders, statuses, charts, hover/focus.
- [ ] Full keyboard route through navigation, dialogs, forms, import review, search, and destructive confirmations.
- [ ] Visible focus; modal focus is contained and returns to trigger.
- [ ] Screen-reader labels exist for icon-only controls, charts have text summaries, errors use live regions.
- [ ] `prefers-reduced-motion` disables nonessential motion.

## Offline

- [ ] After one online load, Dashboard/labs/timeline/search/settings/local add/edit/export work offline.
- [ ] AI/OCR external functions state that network/provider is required and never crash the app.
- [ ] Sensitive `/api/` and `/ai/` requests are not stored by the Service Worker.
