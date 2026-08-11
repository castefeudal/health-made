# Privacy Model

- No analytics, tracking pixels, advertising SDKs or telemetry by default.
- Structured health records stay in browser local storage unless the user exports them or explicitly triggers AI/OCR transmission.
- Health values are not placed in URLs.
- Production code does not log health payloads.
- Service Worker caches static application assets and bypasses `/api/` and `/ai/` requests.
- JSON backup is unencrypted. `.mhos` is encrypted locally with a user password through Web Crypto.
- Original PDFs/images are not persisted by default.
- AI/OCR context or documents are transmitted only after explicit action to a configured same-origin gateway.
