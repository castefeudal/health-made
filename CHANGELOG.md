# Changelog

## 1.1.0 — Final perfection pass

- Canonical source восстановлен из проверенного v1.0 release artifact; устранён release drift между source и ZIP.
- Расширена персонализация для всех основных приоритетов и персонализированы веса качества данных.
- Health Score и качество данных получили прозрачные компоненты и объяснение формулы.
- «Что изменилось» теперь явно показывает период и метод сравнения.
- Поиск получил строгий ranking exact → prefix → title substring → detail substring и русские типы результатов.
- Canvas-графики поддерживают devicePixelRatio до 3 для более чёткого Retina-рендеринга.
- Усилены backup UX, Import preview и предупреждения о незашифрованном JSON / невосстанавливаемом пароле `.mhos`.
- PWA обновляется по явному действию пользователя; Service Worker использует versioned cache v1.1.0.
- Улучшены navigation ARIA, русскоязычная консистентность интерфейса и maintainability `app.js`.
- Финально синхронизированы Welcome/Privacy/Terms с реальной моделью JSON и защищённых `.mhos` резервных копий.

## 1.0.0 — Initial public release

- Local-first персональные health-профили и изоляция записей по `profileId`.
- Пошаговый onboarding и персонализированный dashboard.
- Health Snapshot, What Changed, Today, deterministic Insights, Health Score и Data Quality.
- Тело, сон, активность, тренировки, питание, анализы, лекарства, добавки, симптомы, цели и заметки.
- Timeline, Quick Add, поиск и responsive mobile navigation.
- Demo Mode с изолированными вымышленными данными.
- Transactional localStorage writes с rollback при ошибке сохранения.
- Data schema v2 и migration pipeline.
- Strict backup validation, import preview и safety rollback.
- JSON backup и защищённый `.mhos` backup через Web Crypto API.
- CSV export.
- Health Brief и Consultation Brief с Print / Save as PDF.
- Light / Dark / System themes и отключаемые модули.
- PWA manifest и offline application shell.
- CSP, reduced-motion support, keyboard/focus improvements и accessibility hardening.
