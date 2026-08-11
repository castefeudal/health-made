# Markov Health OS 2.0 — Premium Preview

**Markov Health OS** — local-first персональная система для организации показателей здоровья, физической формы, восстановления, лабораторных анализов, препаратов, симптомов и целей.

**Product concept & development — Pavel Markov.**

> Главный принцип: **Code computes. AI explains.** Детерминированные расчёты выполняются приложением; AI не должен подменять точные вычисления, лабораторные референсы или клиническое решение.

## Что нового в 2.0 preview

### Lab Intelligence

- Расширяемый русскоязычный каталог распространённых лабораторных показателей.
- Поиск по русским и английским названиям, сокращениям и алиасам: `ТТГ / TSH`, `ЛПНП / LDL`, `АЛТ / ALT`, `Ферритин` и др.
- Категории: ОАК, лейкоцитарная формула, биохимия, печень, почки, липиды, углеводный обмен, щитовидная железа, железо, витамины/минералы, воспаление, гормоны, коагулограмма, моча.
- Неподтверждённые LOINC/ФСЛИ mapping **не выдумываются** и остаются пустыми.
- Статус результата определяется только относительно референса, сохранённого вместе с конкретным лабораторным результатом.
- Повторные измерения показывают абсолютную и процентную динамику только при сопоставимых единицах.
- Analyte-specific unit conversion используется только там, где преобразование однозначно и явно задано.
- Опасные универсальные преобразования блокируются. Например, `Lp(a) mg/dL ↔ nmol/L` не конвертируется общим коэффициентом.

### Premium laboratory dashboard

На странице **Анализы** появился верхнеуровневый decision layer:

- количество уникальных показателей;
- число последних значений вне введённого лабораторного референса;
- количество повторных сопоставимых измерений;
- показатели без референса;
- блок «Требует внимания» без диагностической формулировки;
- блок «Что изменилось» с `Δ` и периодом сравнения.

### Review-first CSV import

CSV можно импортировать без автоматической записи в профиль. Workflow:

`CSV → parsing → preview → пользовательская проверка → явное подтверждение → запись`

Поддерживаются колонки:

```text
name,value,unit,referenceMin,referenceMax,date,laboratory
```

Распознанные данные не сохраняются до подтверждения.

### AI-ready Health Brief

Кнопка **Health AI** формирует локально структурированный контекст выбранного профиля:

- laboratory facts;
- изменения;
- measurements;
- sleep/activity/training;
- medications/supplements;
- symptoms;
- goals;
- правила безопасности для модели.

Контекст **не отправляется внешней AI-модели автоматически**. Пользователь сначала видит данные и сам решает, копировать ли их во внешний инструмент.

Внешний AI API в preview намеренно не подключён: секретный API key нельзя безопасно хранить в статическом frontend. Production AI требует отдельного server-side/serverless gateway, explicit consent и минимизации передаваемых health-data.

## Текущие возможности core

- Local-first state без обязательного аккаунта или backend.
- Несколько локальных профилей с изоляцией записей по `profileId`.
- Onboarding и персонализированный dashboard.
- Тело: масса, процент жира, талия, resting HR, давление, SpO₂, температура.
- Сон, активность, тренировки и питание.
- Анализы, лекарства, добавки, симптомы, цели и заметки.
- History/Timeline, Quick Add и глобальный поиск (`Ctrl/Cmd + K`).
- Demo Mode с вымышленными данными.
- Light / Dark / System themes.
- JSON backup, import preview и rollback-oriented storage flow.
- Защищённый `.mhos` backup через PBKDF2-SHA256 + AES-GCM.
- CSV export.
- Consultation Brief с Copy/TXT/Print → PDF.
- Installable PWA и offline application shell.

## Архитектура

Проект остаётся dependency-light и GitHub Pages compatible.

```text
index.html
styles.css
app.js                         # legacy/core application
src/
  catalog/
    labs.js                    # Russian analyte catalog + aliases
  core/
    health-engine.js           # deterministic calculations and contracts
  v2/
    premium.js                 # v2 integration/UI layer
    premium.css                # premium design layer
tests/
  health-engine.test.mjs
.github/workflows/
  health-os-v2-ci.yml
privacy.html
terms.html
manifest.webmanifest
sw.js
```

### Почему v2 сделан слоем, а не rewrite

Текущий core уже содержит рабочие профили, backup/import, PWA, onboarding, history и формы. Preview 2.0 добавляет новый лабораторный и аналитический слой поверх проверенного data model, не выполняя рискованный массовый rewrite и не ломая существующие пользовательские данные.

Полная миграция к `LabReport + LabResult` и schema v3 должна выполняться отдельным этапом с migration tests, safety backup и rollback QA.

## Медицинская модель

Markov Health OS различает:

1. **Исходный результат лаборатории** — значение и исходная единица.
2. **Лабораторный reference interval** — диапазон из конкретного отчёта.
3. **Детерминированный расчёт приложения** — delta, normalization и т.п.
4. **Общую медицинскую информацию** — справочный контекст.
5. **AI-гипотезу** — только как предположение с ограничениями.

Отсутствие данных не считается плохим здоровьем. Выход за лабораторный референс не является диагнозом.

### Номенклатура и interoperability

Ориентиры для дальнейшего подтверждённого mapping:

- ФСЛИ / НСИ Минздрава РФ;
- LOINC;
- UCUM;
- HL7 FHIR Observation / DiagnosticReport.

Коды не добавляются «по памяти». Mapping должен быть проверяемым.

## Privacy & security

- Health-data хранятся локально под ключом `markovHealthOSData`.
- Нет рекламных SDK, tracking pixels или скрытой телеметрии.
- CSP ограничивает источники ресурсов.
- Пользовательские строки должны выводиться безопасными DOM API.
- AI-ready context формируется локально.
- Service Worker кэширует application shell; он не отправляет записи о здоровье в облако.
- Secret AI keys в frontend не поддерживаются.

JSON backup остаётся незашифрованным чувствительным файлом. Для защищённой копии используйте `.mhos`.

## Запуск

```bash
python -m http.server 8000
```

Затем открыть:

```text
http://localhost:8000/
```

Или открыть `index.html` напрямую, учитывая ограничения некоторых Browser APIs при `file://`.

## Тесты

Node.js 22+:

```bash
node --test tests/health-engine.test.mjs
```

CI дополнительно запускает syntax checks:

```bash
node --check src/catalog/labs.js
node --check src/core/health-engine.js
node --check src/v2/premium.js
node --check app.js
node --check sw.js
```

## Ограничения 2.0 preview

- Нет server-side AI gateway и автоматической отправки данных модели.
- PDF/image OCR пока не реализован: это требует отдельного review-first extraction pipeline.
- Legacy structured storage остаётся в `localStorage`; переход к IndexedDB имеет смысл вместе с документами/OCR и schema v3, а не ради технологии как таковой.
- Не реализован собственный лекарственный interaction checker без надёжного медицинского источника данных.
- Health OS не является медицинским изделием и не предназначен для диагностики, назначения лечения или экстренной помощи.

## Backup и совместимость

Data schema core остаётся **v2**, чтобы существующие данные продолжали открываться без destructive migration. Перед будущей schema v3 миграцией обязательны:

- safety backup;
- deterministic migration;
- duplicate/orphan validation;
- rollback;
- migration tests.

## PWA

`sw.js` использует cache `markov-health-os-v2.0.0-premium` и включает новые локальные v2 assets. Основные локальные функции продолжают работать offline; внешний AI в будущей версии должен корректно деградировать без сети.

## License

MIT License. См. `LICENSE`.
