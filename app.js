'use strict';
(() => {
    const STORAGE_KEY = 'markovHealthOSData';
    const SAFETY_BACKUP_KEY = 'markovHealthOSDataSafetyBackup';
    const ONBOARDING_DRAFT_KEY = 'markovHealthOSOnboardingDraft';
    const DATA_VERSION = 2;
    const APP_VERSION = '1.1.0';
    const MAX_IMPORT_BYTES = 8 * 1024 * 1024;
    const BACKUP_APP_ID = 'MARKOV_HEALTH_OS';
    const DEMO_PROFILE_ID = 'demo-alexey-smirnov';
    const RECORD_COLLECTIONS = [
        'measurements', 'labs', 'medications', 'supplements', 'symptoms',
        'sleep', 'activity', 'training', 'nutrition', 'goals', 'notes'
    ];
    const GOAL_OPTIONS = [
        'Общее здоровье', 'Снижение веса', 'Набор мышечной массы', 'Сохранение формы',
        'Силовые показатели', 'Выносливость', 'Сон', 'Восстановление',
        'Контроль анализов', 'Контроль давления', 'Профилактика', 'Долголетие',
        'Управление препаратами', 'Снижение стресса'
    ];
    const MODULE_LABELS = {
        body: 'Тело', labs: 'Анализы', sleep: 'Сон', activity: 'Активность',
        training: 'Тренировки', nutrition: 'Питание', medications: 'Лекарства',
        supplements: 'Добавки', symptoms: 'Симптомы', goals: 'Цели', notes: 'Заметки'
    };
    const DEFAULT_MODULES = {
        body: true, labs: true, sleep: true, activity: true, training: true,
        nutrition: true, medications: true, supplements: true, symptoms: true,
        goals: true, notes: true
    };
    const COMPLETENESS_WEIGHTS = {
        default: { profile: 14, body: 12, labs: 10, lifestyle: 12, sleep: 12, activity: 12, goals: 12, medications: 6, training: 0, nutrition: 0 },
        'Снижение веса': { profile: 8, body: 25, labs: 5, lifestyle: 10, sleep: 12, activity: 18, goals: 12, medications: 4, training: 3, nutrition: 3 },
        'Набор мышечной массы': { profile: 8, body: 20, labs: 5, lifestyle: 8, sleep: 14, activity: 7, goals: 12, medications: 4, training: 15, nutrition: 7 },
        'Сохранение формы': { profile: 9, body: 18, labs: 6, lifestyle: 10, sleep: 13, activity: 16, goals: 12, medications: 4, training: 8, nutrition: 4 },
        'Силовые показатели': { profile: 8, body: 16, labs: 5, lifestyle: 8, sleep: 14, activity: 7, goals: 12, medications: 4, training: 19, nutrition: 7 },
        'Выносливость': { profile: 8, body: 10, labs: 5, lifestyle: 8, sleep: 13, activity: 24, goals: 12, medications: 3, training: 17, nutrition: 0 },
        'Сон': { profile: 8, body: 6, labs: 4, lifestyle: 18, sleep: 30, activity: 12, goals: 12, medications: 4, training: 3, nutrition: 3 },
        'Восстановление': { profile: 8, body: 10, labs: 7, lifestyle: 12, sleep: 24, activity: 10, goals: 10, medications: 5, training: 10, nutrition: 4 },
        'Контроль анализов': { profile: 10, body: 8, labs: 30, lifestyle: 8, sleep: 8, activity: 6, goals: 10, medications: 20, training: 0, nutrition: 0 },
        'Контроль давления': { profile: 8, body: 30, labs: 8, lifestyle: 12, sleep: 12, activity: 12, goals: 10, medications: 8, training: 0, nutrition: 0 },
        'Профилактика': { profile: 10, body: 12, labs: 16, lifestyle: 14, sleep: 14, activity: 14, goals: 10, medications: 6, training: 2, nutrition: 2 },
        'Долголетие': { profile: 10, body: 12, labs: 16, lifestyle: 14, sleep: 14, activity: 14, goals: 10, medications: 6, training: 2, nutrition: 2 },
        'Управление препаратами': { profile: 10, body: 5, labs: 18, lifestyle: 6, sleep: 8, activity: 5, goals: 8, medications: 32, training: 4, nutrition: 4 },
        'Снижение стресса': { profile: 8, body: 6, labs: 4, lifestyle: 25, sleep: 25, activity: 12, goals: 12, medications: 4, training: 2, nutrition: 2 }
    };
    const LAB_SUGGESTIONS = [
        'Общий анализ крови', 'Глюкоза', 'HbA1c', 'Общий холестерин', 'LDL', 'HDL',
        'Триглицериды', 'ALT', 'AST', 'Креатинин', 'TSH', 'Ферритин', 'Витамин D', 'Тестостерон'
    ];
    const ROUTES = {
        overview: 'Обзор', profile: 'Профиль', body: 'Тело', labs: 'Анализы',
        lifestyle: 'Образ жизни', medications: 'Препараты', goals: 'Цели',
        history: 'История', settings: 'Настройки'
    };
    const ICONS = {
        overview: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>',
        profile: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4.2 3.5-6.2 8-6.2s7.2 2 8 6.2"/></svg>',
        body: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M5 7c2.4-1.3 4.7-2 7-2s4.6.7 7 2M7 17c1.7 1.3 3.3 2 5 2s3.3-.7 5-2"/></svg>',
        labs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/><path d="M7.5 15h9"/></svg>',
        lifestyle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h3l2-5 4 10 2-5h3"/><path d="M4 4h16v16H4z"/></svg>',
        medications: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.2 4.2a4 4 0 0 1 5.6 0l6 6a4 4 0 0 1-5.6 5.6l-6-6a4 4 0 0 1 0-5.6Z"/><path d="m11 7 6 6"/></svg>',
        goals: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 12 20 4"/></svg>',
        history: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.5"/><path d="M4 4v4.5h4.5M12 8v5l3 2"/></svg>',
        settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7.8 7.8 0 0 0-1.8-1L14.4 3h-4.8l-.3 3.1a7.8 7.8 0 0 0-1.8 1l-2.4-1-2 3.4L5.1 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7.8 7.8 0 0 0 1.8 1l.3 3.1h4.8l.3-3.1a7.8 7.8 0 0 0 1.8-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z"/></svg>',
        weight: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 10a3 3 0 0 1 6 0M12 10l2-2"/></svg>',
        sleep: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 15.5A7.5 7.5 0 0 1 8.5 5 7.5 7.5 0 1 0 19 15.5Z"/></svg>',
        activity: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 17c2.2 0 4-1.8 4-4s-1.8-4-4-4M18 7c-2.2 0-4 1.8-4 4s1.8 4 4 4"/><path d="M3 17h6M15 7h6"/></svg>',
        bp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-4.4 7-11a4.5 4.5 0 0 0-7-3.7A4.5 4.5 0 0 0 5 10c0 6.6 7 11 7 11Z"/><path d="M8 12h2l1-3 2 6 1-3h2"/></svg>',
        pulse: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l2-5 4 10 2-5h6"/></svg>',
        lab: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/></svg>',
        training: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9v6M9 7v10M15 7v10M19 9v6M3 12h18"/></svg>',
        goalsMini: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>'
    };
    const state = {
        persistentData: null,
        data: null,
        demoMode: false,
        route: 'overview',
        historyFilter: 'all',
        onboarding: null,
        onboardingMode: 'new',
        modalDirty: false,
        modalCloseBypass: false,
        pendingCharts: [],
        lastDeleted: null,
        idCounter: 0,
        storageStatus: 'idle',
        storageStatusAt: null,
        storageIssue: '',
        searchItems: [],
        searchActiveIndex: -1,
        historyLimit: 100,
        lastFocus: null
    };
    const dom = {};
    // ===== DOM & APPLICATION STATE =====
    function cacheDom() {
        [
            'app', 'welcome', 'onboarding', 'startOnboardingBtn', 'startDemoBtn', 'welcomeImportBtn', 'profileSwitcher', 'addProfileBtn',
            'desktopNav', 'mobileNav', 'desktopQuickAdd', 'mobileQuickAdd', 'mainContent', 'breadcrumb', 'searchBtn',
            'themeCycleBtn', 'themeIcon', 'demoBadge', 'exitDemoBtn', 'mobileBrandBtn', 'onboardingProgress',
            'onboardingStep', 'cancelOnboardingBtn', 'modal', 'modalEyebrow', 'modalTitle', 'modalBody', 'modalCloseBtn',
            'confirmDialog', 'confirmTitle', 'confirmText', 'confirmCancel', 'confirmOk', 'searchDialog', 'globalSearchInput',
            'searchResults', 'searchCloseBtn', 'toastRegion', 'importFileInput', 'storageStatus', 'appVersion'
        ].forEach(id => dom[id] = document.getElementById(id));
    }
    // ===== DATA MODEL, MIGRATIONS & VALIDATION =====
    function createEmptyData() {
        return {
            version: DATA_VERSION,
            activeProfileId: null,
            profiles: [],
            measurements: [],
            labs: [],
            medications: [],
            supplements: [],
            symptoms: [],
            sleep: [],
            activity: [],
            training: [],
            nutrition: [],
            goals: [],
            notes: [],
            settings: {
                theme: 'system',
                units: 'metric',
                modules: { ...DEFAULT_MODULES },
                lastBackupAt: null,
                lastBackupRecordCount: 0
            }
        };
    }
    function deepClone(value) {
        if (globalThis.structuredClone) {
            try {
                return globalThis.structuredClone(value);
            }
            catch (_) { }
        }
        return JSON.parse(JSON.stringify(value));
    }
    function normalizeProfileDefaults(profile) {
        if (!profile || typeof profile !== 'object')
            return profile;
        profile.dataDeclarations = {
            medications: 'unknown',
            supplements: 'unknown',
            ...((profile.dataDeclarations && typeof profile.dataDeclarations === 'object') ? profile.dataDeclarations : {})
        };
        return profile;
    }
    const MIGRATIONS = {
        1(data) {
            data.profiles = Array.isArray(data.profiles) ? data.profiles.map(p => normalizeProfileDefaults(p)) : [];
            data.settings = { ...createEmptyData().settings, ...(data.settings || {}) };
            data.version = 2;
            return data;
        }
    };
    function migrateData(input, { repairIds = true } = {}) {
        if (!input || typeof input !== 'object' || Array.isArray(input))
            return createEmptyData();
        let data = deepClone(input);
        let version = Number(data.version) || 1;
        if (version > DATA_VERSION)
            throw new Error('UNSUPPORTED_FUTURE_SCHEMA');
        while (version < DATA_VERSION) {
            const migrate = MIGRATIONS[version];
            if (typeof migrate !== 'function')
                throw new Error(`MISSING_MIGRATION_${version}`);
            data = migrate(data);
            version = Number(data.version);
        }
        data = { ...createEmptyData(), ...data, version: DATA_VERSION };
        data.settings = { ...createEmptyData().settings, ...(data.settings || {}) };
        data.settings.modules = { ...DEFAULT_MODULES, ...((data.settings && data.settings.modules) || {}) };
        data.profiles = Array.isArray(data.profiles) ? data.profiles.map(p => normalizeProfileDefaults(p)) : [];
        RECORD_COLLECTIONS.forEach(key => { data[key] = Array.isArray(data[key]) ? data[key] : []; });
        if (repairIds)
            ensureUniqueIds(data);
        if (!data.activeProfileId || !data.profiles.some(p => p && p.id === data.activeProfileId)) {
            data.activeProfileId = data.profiles[0]?.id || null;
        }
        return data;
    }
    function ensureUniqueIds(data) {
        const seen = new Set();
        const all = [data.profiles, ...RECORD_COLLECTIONS.map(key => data[key])];
        all.forEach(collection => {
            collection.forEach(item => {
                if (!item || typeof item !== 'object')
                    return;
                if (!item.id || seen.has(item.id))
                    item.id = uid(seen);
                seen.add(item.id);
            });
        });
    }
    function uid(existingSet = null) {
        let id;
        do {
            try {
                id = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : null;
            }
            catch (_) {
                id = null;
            }
            if (!id)
                id = `mh-${Date.now().toString(36)}-${(++state.idCounter).toString(36)}`;
        } while (existingSet?.has(id) || idExists(id));
        return id;
    }
    function idExists(id) {
        if (!state.data)
            return false;
        if (state.data.profiles.some(p => p?.id === id))
            return true;
        return RECORD_COLLECTIONS.some(key => state.data[key].some(item => item?.id === id));
    }
    function isIsoDateString(value) {
        if (value === '' || value === null || value === undefined)
            return true;
        return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Boolean(parseLocalDate(value));
    }
    function validateDataStructure(input, { allowLegacy = true } = {}) {
        const errors = [];
        const push = message => { if (errors.length < 100)
            errors.push(message); };
        if (!input || typeof input !== 'object' || Array.isArray(input))
            return { ok: false, errors: ['Корневой объект резервной копии некорректен.'] };
        const allowedTopLevel = new Set(['version', 'activeProfileId', 'profiles', ...RECORD_COLLECTIONS, 'settings']);
        Object.keys(input).forEach(key => { if (!allowedTopLevel.has(key))
            push(`Неподдерживаемое поле верхнего уровня: ${key}.`); });
        const version = Number(input.version) || (allowLegacy ? 1 : NaN);
        if (!Number.isInteger(version) || version < 1)
            push('Некорректная версия схемы данных.');
        if (Number.isInteger(version) && version > DATA_VERSION)
            push('Резервная копия создана более новой версией Markov Health OS.');
        if (!Array.isArray(input.profiles))
            push('Отсутствует массив profiles.');
        RECORD_COLLECTIONS.forEach(key => { if (!Array.isArray(input[key]))
            push(`Отсутствует массив ${key}.`); });
        if (errors.length)
            return { ok: false, errors };
        const seen = new Set();
        const profileIds = new Set();
        const registerId = (item, label) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
                push(`${label}: запись должна быть объектом.`);
                return false;
            }
            if (typeof item.id !== 'string' || !item.id.trim() || item.id.length > 200) {
                push(`${label}: отсутствует или некорректен id.`);
                return false;
            }
            if (seen.has(item.id))
                push(`${label}: найден повторяющийся id ${item.id}.`);
            seen.add(item.id);
            return true;
        };
        const finiteOrEmpty = (value) => value === '' || value === null || value === undefined || (typeof value === 'number' && Number.isFinite(value));
        const validTimestampOrEmpty = value => value === '' || value === null || value === undefined || (typeof value === 'string' && value.length <= 80 && Number.isFinite(Date.parse(value)));
        const allowedProfileFields = new Set(['id', 'name', 'dob', 'sex', 'heightCm', 'goals', 'priority', 'lifestyle', 'conditions', 'allergies', 'dataDeclarations', 'createdAt', 'updatedAt']);
        input.profiles.forEach((p, i) => {
            const label = `profiles[${i}]`;
            if (!registerId(p, label))
                return;
            Object.keys(p).forEach(field => { if (!allowedProfileFields.has(field))
                push(`${label}: неподдерживаемое поле ${field}.`); });
            profileIds.add(p.id);
            if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 80)
                push(`${label}: некорректное имя.`);
            if (!isIsoDateString(p.dob) || !p.dob)
                push(`${label}: некорректная дата рождения.`);
            if (!['male', 'female', 'intersex', 'unknown'].includes(p.sex))
                push(`${label}: некорректное значение биологического пола.`);
            if (!finiteOrEmpty(p.heightCm) || p.heightCm === null || p.heightCm === undefined)
                push(`${label}: рост должен быть конечным числом.`);
            if (typeof p.heightCm === 'number' && (p.heightCm < 50 || p.heightCm > 300))
                push(`${label}: рост находится за допустимыми техническими пределами.`);
            if (p.goals !== undefined && (!Array.isArray(p.goals) || p.goals.some(goal => typeof goal !== 'string' || !GOAL_OPTIONS.includes(goal))))
                push(`${label}: goals содержит неподдерживаемое значение.`);
            if (p.priority !== undefined && p.priority !== '' && !GOAL_OPTIONS.includes(p.priority))
                push(`${label}: priority содержит неподдерживаемое значение.`);
            if (p.priority && Array.isArray(p.goals) && !p.goals.includes(p.priority))
                push(`${label}: priority должен входить в выбранные goals.`);
            if (p.conditions !== undefined && (!Array.isArray(p.conditions) || p.conditions.some(v => typeof v !== 'string' || v.length > 500)))
                push(`${label}: conditions должен быть массивом строк.`);
            if (p.allergies !== undefined && (!Array.isArray(p.allergies) || p.allergies.some(v => typeof v !== 'string' || v.length > 500)))
                push(`${label}: allergies должен быть массивом строк.`);
            if (p.dataDeclarations !== undefined) {
                if (!p.dataDeclarations || typeof p.dataDeclarations !== 'object' || Array.isArray(p.dataDeclarations))
                    push(`${label}: dataDeclarations должен быть объектом.`);
                else {
                    Object.keys(p.dataDeclarations).forEach(k => { if (!['medications', 'supplements'].includes(k))
                        push(`${label}: dataDeclarations содержит неподдерживаемое поле ${k}.`); });
                    ['medications', 'supplements'].forEach(k => { if (!['unknown', 'none', 'has'].includes(p.dataDeclarations[k] ?? 'unknown'))
                        push(`${label}: dataDeclarations.${k} содержит неподдерживаемое значение.`); });
                }
            }
            if (p.lifestyle !== undefined) {
                const ls = p.lifestyle;
                if (!ls || typeof ls !== 'object' || Array.isArray(ls))
                    push(`${label}: lifestyle должен быть объектом.`);
                else {
                    const allowedLifestyle = new Set(['trainingsPerWeek', 'averageSteps', 'averageSleepHours', 'stress', 'stepGoal', 'sleepGoalHours', 'smoking', 'alcohol']);
                    Object.keys(ls).forEach(k => { if (!allowedLifestyle.has(k))
                        push(`${label}: lifestyle содержит неподдерживаемое поле ${k}.`); });
                    const ranges = { trainingsPerWeek: [0, 14], averageSteps: [0, 100000], averageSleepHours: [0, 24], stress: [1, 10], stepGoal: [0, 100000], sleepGoalHours: [0, 24] };
                    Object.entries(ranges).forEach(([k, [min, max]]) => { if (k in ls && ls[k] !== null && ls[k] !== '' && ls[k] !== undefined && (!finiteOrEmpty(ls[k]) || ls[k] < min || ls[k] > max))
                        push(`${label}: lifestyle.${k} находится за допустимыми пределами.`); });
                    if (ls.smoking !== undefined && ls.smoking !== '' && !['no', 'yes'].includes(ls.smoking))
                        push(`${label}: lifestyle.smoking некорректен.`);
                    if (ls.alcohol !== undefined && ls.alcohol !== '' && !['none', 'rarely', 'regularly'].includes(ls.alcohol))
                        push(`${label}: lifestyle.alcohol некорректен.`);
                }
            }
            ['createdAt', 'updatedAt'].forEach(k => { if (k in p && !validTimestampOrEmpty(p[k]))
                push(`${label}: ${k} содержит некорректный timestamp.`); });
        });
        const dateFields = ['date', 'startDate', 'endDate', 'deadline'];
        const numericFields = ['value', 'referenceMin', 'referenceMax', 'dosage', 'intensity', 'durationHours', 'quality', 'awakenings', 'steps', 'activeMinutes', 'cardioMinutes', 'distanceKm', 'durationMinutes', 'rpe', 'calories', 'protein', 'fat', 'carbs', 'fiber', 'waterLiters', 'startValue', 'targetValue', 'currentValue', 'systolic', 'diastolic', 'pulse'];
        const measurementTypes = new Set(['weight', 'bodyFat', 'waist', 'restingHeartRate', 'bloodPressure', 'spo2', 'temperature']);
        const medicationStatuses = new Set(['active', 'paused', 'completed']);
        const allowedFields = {
            measurements: new Set(['id', 'profileId', 'type', 'value', 'date', 'time', 'systolic', 'diastolic', 'pulse', 'note', 'createdAt', 'updatedAt']),
            labs: new Set(['id', 'profileId', 'name', 'value', 'unit', 'referenceMin', 'referenceMax', 'date', 'laboratory', 'comment', 'createdAt', 'updatedAt']),
            medications: new Set(['id', 'profileId', 'name', 'dosage', 'unit', 'frequency', 'startDate', 'endDate', 'reason', 'note', 'status', 'createdAt', 'updatedAt']),
            supplements: new Set(['id', 'profileId', 'name', 'dosage', 'unit', 'frequency', 'startDate', 'endDate', 'reason', 'note', 'status', 'createdAt', 'updatedAt']),
            symptoms: new Set(['id', 'profileId', 'name', 'date', 'intensity', 'duration', 'note', 'createdAt', 'updatedAt']),
            sleep: new Set(['id', 'profileId', 'date', 'durationHours', 'quality', 'bedtime', 'wakeTime', 'awakenings', 'note', 'createdAt', 'updatedAt']),
            activity: new Set(['id', 'profileId', 'date', 'steps', 'activeMinutes', 'cardioMinutes', 'distanceKm', 'createdAt', 'updatedAt']),
            training: new Set(['id', 'profileId', 'date', 'type', 'name', 'durationMinutes', 'rpe', 'note', 'createdAt', 'updatedAt']),
            nutrition: new Set(['id', 'profileId', 'date', 'calories', 'protein', 'fat', 'carbs', 'fiber', 'waterLiters', 'createdAt', 'updatedAt']),
            goals: new Set(['id', 'profileId', 'name', 'category', 'startValue', 'targetValue', 'currentValue', 'unit', 'startDate', 'deadline', 'createdAt', 'updatedAt']),
            notes: new Set(['id', 'profileId', 'date', 'time', 'text', 'createdAt', 'updatedAt'])
        };
        const hasString = (item, key, max = 20000) => typeof item[key] === 'string' && Boolean(item[key].trim()) && item[key].length <= max;
        const hasNumber = (item, key, min = -Infinity, max = Infinity) => typeof item[key] === 'number' && Number.isFinite(item[key]) && item[key] >= min && item[key] <= max;
        const requiredDate = (item, key) => typeof item[key] === 'string' && Boolean(item[key]) && isIsoDateString(item[key]);
        const validTimeOrEmpty = value => value === '' || value === null || value === undefined || (typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value));
        RECORD_COLLECTIONS.forEach(key => input[key].forEach((item, i) => {
            const label = `${key}[${i}]`;
            if (!registerId(item, label))
                return;
            if (typeof item.profileId !== 'string' || !profileIds.has(item.profileId))
                push(`${label}: profileId не соответствует существующему профилю.`);
            Object.keys(item).forEach(field => { if (!allowedFields[key].has(field))
                push(`${label}: неподдерживаемое поле ${field}.`); });
            dateFields.forEach(field => { if (field in item && !isIsoDateString(item[field]))
                push(`${label}: поле ${field} содержит некорректную дату.`); });
            numericFields.forEach(field => { if (field in item && !finiteOrEmpty(item[field]))
                push(`${label}: поле ${field} должно быть конечным числом.`); });
            ['createdAt', 'updatedAt'].forEach(field => { if (field in item && !validTimestampOrEmpty(item[field]))
                push(`${label}: ${field} содержит некорректный timestamp.`); });
            Object.entries(item).forEach(([field, value]) => { if (typeof value === 'string' && value.length > 20000)
                push(`${label}: поле ${field} слишком длинное.`); });
            if (key === 'measurements') {
                if (!measurementTypes.has(item.type))
                    push(`${label}: неподдерживаемый тип измерения.`);
                if (!requiredDate(item, 'date'))
                    push(`${label}: требуется корректная дата измерения.`);
                if (item.type === 'bloodPressure') {
                    if (!hasNumber(item, 'systolic', 50, 300) || !hasNumber(item, 'diastolic', 30, 200) || !hasNumber(item, 'pulse', 20, 250))
                        push(`${label}: давление или пульс находятся за техническими пределами.`);
                    if (!validTimeOrEmpty(item.time))
                        push(`${label}: некорректное время измерения.`);
                }
                else {
                    const ranges = { weight: [20, 400], bodyFat: [1, 75], waist: [25, 250], restingHeartRate: [20, 250], spo2: [50, 100], temperature: [30, 45] };
                    const range = ranges[item.type];
                    if (range && !hasNumber(item, 'value', range[0], range[1]))
                        push(`${label}: значение измерения отсутствует или находится за техническими пределами.`);
                }
            }
            if (key === 'labs') {
                if (!hasString(item, 'name', 120) || !hasNumber(item, 'value') || !hasString(item, 'unit', 40) || !requiredDate(item, 'date'))
                    push(`${label}: обязательные поля лабораторного результата некорректны.`);
                if (item.referenceMin !== null && item.referenceMin !== '' && item.referenceMin !== undefined && !hasNumber(item, 'referenceMin'))
                    push(`${label}: нижний референс должен быть числом.`);
                if (item.referenceMax !== null && item.referenceMax !== '' && item.referenceMax !== undefined && !hasNumber(item, 'referenceMax'))
                    push(`${label}: верхний референс должен быть числом.`);
                if (item.referenceMin !== null && item.referenceMax !== null && item.referenceMin !== '' && item.referenceMax !== '' && item.referenceMin !== undefined && item.referenceMax !== undefined && typeof item.referenceMin === 'number' && typeof item.referenceMax === 'number' && item.referenceMin > item.referenceMax)
                    push(`${label}: нижний референс выше верхнего.`);
            }
            if (key === 'medications' || key === 'supplements') {
                if (!hasString(item, 'name', 120) || !hasString(item, 'frequency', 120) || !requiredDate(item, 'startDate') || !medicationStatuses.has(item.status))
                    push(`${label}: обязательные поля препарата некорректны.`);
                if (item.dosage !== null && item.dosage !== '' && item.dosage !== undefined && !hasNumber(item, 'dosage', 0))
                    push(`${label}: дозировка должна быть неотрицательным числом.`);
                if (item.endDate && requiredDate(item, 'startDate') && parseLocalDate(item.endDate) < parseLocalDate(item.startDate))
                    push(`${label}: дата окончания раньше даты начала.`);
            }
            if (key === 'symptoms' && (!hasString(item, 'name', 120) || !requiredDate(item, 'date') || !hasNumber(item, 'intensity', 1, 10)))
                push(`${label}: обязательные поля симптома некорректны.`);
            if (key === 'sleep') {
                if (!requiredDate(item, 'date') || !hasNumber(item, 'durationHours', 0, 24) || !hasNumber(item, 'quality', 1, 10))
                    push(`${label}: обязательные поля сна некорректны.`);
                if (item.awakenings !== undefined && !hasNumber(item, 'awakenings', 0, 50))
                    push(`${label}: awakenings должен быть в диапазоне 0–50.`);
                if (!validTimeOrEmpty(item.bedtime) || !validTimeOrEmpty(item.wakeTime))
                    push(`${label}: некорректное время сна или пробуждения.`);
            }
            if (key === 'activity') {
                if (!requiredDate(item, 'date') || !hasNumber(item, 'steps', 0, 200000))
                    push(`${label}: обязательные поля активности некорректны.`);
                if (item.activeMinutes !== undefined && !hasNumber(item, 'activeMinutes', 0, 1440))
                    push(`${label}: activeMinutes вне диапазона.`);
                if (item.cardioMinutes !== undefined && !hasNumber(item, 'cardioMinutes', 0, 1440))
                    push(`${label}: cardioMinutes вне диапазона.`);
                if (item.distanceKm !== undefined && !hasNumber(item, 'distanceKm', 0, 1000))
                    push(`${label}: distanceKm вне диапазона.`);
            }
            if (key === 'training' && (!requiredDate(item, 'date') || !hasString(item, 'type', 80) || !hasString(item, 'name', 100) || !hasNumber(item, 'durationMinutes', 1, 600) || !hasNumber(item, 'rpe', 1, 10)))
                push(`${label}: обязательные поля тренировки некорректны.`);
            if (key === 'nutrition') {
                const ranges = { calories: [0, 20000], protein: [0, 1000], fat: [0, 1000], carbs: [0, 3000], fiber: [0, 300], waterLiters: [0, 20] };
                if (!requiredDate(item, 'date'))
                    push(`${label}: требуется корректная дата питания.`);
                Object.entries(ranges).forEach(([field, [min, max]]) => { if (!hasNumber(item, field, min, max))
                    push(`${label}: ${field} отсутствует или находится за техническими пределами.`); });
            }
            if (key === 'goals') {
                if (!hasString(item, 'name', 140) || !GOAL_OPTIONS.includes(item.category) || !hasNumber(item, 'startValue') || !hasNumber(item, 'targetValue') || !hasNumber(item, 'currentValue') || !hasString(item, 'unit', 30) || !requiredDate(item, 'startDate'))
                    push(`${label}: обязательные поля цели некорректны.`);
                if (item.deadline && parseLocalDate(item.deadline) < parseLocalDate(item.startDate))
                    push(`${label}: срок цели раньше даты начала.`);
            }
            if (key === 'notes') {
                if (!requiredDate(item, 'date') || !hasString(item, 'text', 3000))
                    push(`${label}: обязательные поля заметки некорректны.`);
                if (!validTimeOrEmpty(item.time))
                    push(`${label}: некорректное время заметки.`);
            }
        }));
        if (input.activeProfileId !== null && input.activeProfileId !== undefined && typeof input.activeProfileId !== 'string')
            push('activeProfileId должен быть строкой или null.');
        if (input.activeProfileId && !profileIds.has(input.activeProfileId))
            push('activeProfileId не соответствует существующему профилю.');
        if (input.settings === undefined || !input.settings || typeof input.settings !== 'object' || Array.isArray(input.settings))
            push('settings должен быть объектом.');
        else {
            const allowedSettings = new Set(['theme', 'units', 'modules', 'lastBackupAt', 'lastBackupRecordCount']);
            Object.keys(input.settings).forEach(k => { if (!allowedSettings.has(k))
                push(`settings содержит неподдерживаемое поле: ${k}.`); });
            if (!['light', 'dark', 'system'].includes(input.settings.theme))
                push('Некорректное значение темы.');
            if (!['metric', 'imperial'].includes(input.settings.units))
                push('Некорректная система единиц.');
            const modules = input.settings.modules;
            if (!modules || typeof modules !== 'object' || Array.isArray(modules))
                push('settings.modules должен быть объектом.');
            else {
                Object.keys(modules).forEach(k => { if (!(k in DEFAULT_MODULES))
                    push(`Неизвестный модуль: ${k}.`); });
                Object.keys(DEFAULT_MODULES).forEach(k => { if (typeof modules[k] !== 'boolean')
                    push(`settings.modules.${k} должен быть boolean.`); });
            }
            if (!validTimestampOrEmpty(input.settings.lastBackupAt))
                push('settings.lastBackupAt содержит некорректный timestamp.');
            if (input.settings.lastBackupRecordCount !== undefined && (!Number.isInteger(input.settings.lastBackupRecordCount) || input.settings.lastBackupRecordCount < 0))
                push('settings.lastBackupRecordCount должен быть неотрицательным целым числом.');
        }
        return { ok: errors.length === 0, errors };
    }
    // ===== PERSISTENCE & TRANSACTIONS =====
    function setStorageStatus(status, detail = '') {
        state.storageStatus = status;
        state.storageStatusAt = new Date();
        if (!dom.storageStatus)
            return;
        const labels = { saving: 'Сохранение…', saved: 'Сохранено локально', error: 'Не удалось сохранить', idle: 'Локальное хранение' };
        dom.storageStatus.textContent = detail || labels[status] || labels.idle;
        dom.storageStatus.dataset.state = status;
        if (status === 'saved') {
            const time = state.storageStatusAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            dom.storageStatus.textContent = `Сохранено локально · ${time}`;
        }
    }
    function loadPersistentData() {
        let parsed = null;
        let raw = '';
        try {
            raw = localStorage.getItem(STORAGE_KEY) || '';
            parsed = raw ? JSON.parse(raw) : null;
            if (parsed) {
                const preflight = validateDataStructure(parsed);
                if (!preflight.ok)
                    throw new Error(`INVALID_STORED_DATA: ${preflight.errors.slice(0, 3).join(' | ')}`);
            }
            state.persistentData = migrateData(parsed || createEmptyData(), { repairIds: false });
            state.data = deepClone(state.persistentData);
            setStorageStatus('idle');
        }
        catch (error) {
            state.storageIssue = 'Локальные данные не удалось безопасно прочитать. Исходное содержимое не перезаписано.';
            state.persistentData = createEmptyData();
            state.data = deepClone(state.persistentData);
            try {
                if (raw)
                    localStorage.setItem(`${SAFETY_BACKUP_KEY}-corrupt-${Date.now()}`, raw);
            }
            catch (_) { }
        }
    }
    function saveData({ quiet = false } = {}) {
        if (state.demoMode)
            return true;
        const candidate = deepClone(state.data);
        candidate.version = DATA_VERSION;
        const validation = validateDataStructure(candidate, { allowLegacy: false });
        if (!validation.ok) {
            state.data = deepClone(state.persistentData || createEmptyData());
            setStorageStatus('error');
            if (!quiet)
                showToast('Изменение отменено: данные не прошли внутреннюю проверку целостности.');
            return false;
        }
        setStorageStatus('saving');
        try {
            const serialized = JSON.stringify(candidate);
            localStorage.setItem(STORAGE_KEY, serialized);
            const verify = localStorage.getItem(STORAGE_KEY);
            if (verify !== serialized)
                throw new Error('STORAGE_VERIFY_FAILED');
            state.persistentData = deepClone(candidate);
            state.data = deepClone(candidate);
            setStorageStatus('saved');
            return true;
        }
        catch (error) {
            state.data = deepClone(state.persistentData || createEmptyData());
            setStorageStatus('error');
            if (!quiet)
                showToast('Не удалось сохранить данные на устройстве. Изменение отменено; предыдущие данные сохранены.');
            return false;
        }
    }
    function mutateAndSave(mutator, { successMessage = '', rerender = 'current' } = {}) {
        if (state.demoMode) {
            mutator(state.data);
            if (rerender === 'app')
                renderApp();
            else if (rerender === 'current')
                renderCurrentRoute();
            if (successMessage)
                showToast(successMessage);
            return true;
        }
        const before = deepClone(state.data);
        try {
            mutator(state.data);
        }
        catch (_) {
            state.data = before;
            showToast('Изменение не было применено.');
            return false;
        }
        if (!saveData()) {
            state.data = deepClone(state.persistentData || before);
            if (rerender === 'app')
                renderApp();
            else if (rerender === 'current')
                renderCurrentRoute();
            return false;
        }
        if (rerender === 'app')
            renderApp();
        else if (rerender === 'current')
            renderCurrentRoute();
        if (successMessage)
            showToast(successMessage);
        return true;
    }
    function setActiveProfile(id) {
        if (!state.data.profiles.some(p => p.id === id))
            return;
        mutateAndSave(data => { data.activeProfileId = id; }, { rerender: 'app' });
    }
    function getProfile() {
        return state.data?.profiles.find(p => p.id === state.data.activeProfileId) || null;
    }
    function profileRecords(collection, profileId = state.data.activeProfileId) {
        const arr = state.data?.[collection];
        if (!Array.isArray(arr))
            return [];
        return arr.filter(item => item.profileId === profileId);
    }
    // ===== DATE, UNITS & DOMAIN UTILITIES =====
    function todayISO() {
        return localDateISO(new Date());
    }
    function localDateISO(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    function shiftDate(days, base = new Date()) {
        const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
        d.setDate(d.getDate() + days);
        return localDateISO(d);
    }
    function dateTimeStamp(date = new Date()) {
        return date.toISOString();
    }
    function parseLocalDate(value) {
        if (!value || typeof value !== 'string')
            return null;
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
        if (!match)
            return null;
        const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        if (Number.isNaN(d.getTime()))
            return null;
        if (d.getFullYear() !== Number(match[1]) || d.getMonth() !== Number(match[2]) - 1 || d.getDate() !== Number(match[3]))
            return null;
        return d;
    }
    function daysBetween(dateA, dateB = todayISO()) {
        const a = parseLocalDate(dateA);
        const b = parseLocalDate(dateB);
        if (!a || !b)
            return Infinity;
        const dayA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) / 86400000;
        const dayB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) / 86400000;
        return Math.trunc(dayB - dayA);
    }
    function ageFromDob(dob) {
        const birth = parseLocalDate(dob);
        if (!birth)
            return null;
        const now = new Date();
        let age = now.getFullYear() - birth.getFullYear();
        const beforeBirthday = now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
        if (beforeBirthday)
            age--;
        return age >= 0 ? age : null;
    }
    function fmtDate(value, options = {}) {
        const d = parseLocalDate(value) || (value ? new Date(value) : null);
        if (!d || Number.isNaN(d.getTime()))
            return '—';
        return new Intl.DateTimeFormat('ru-RU', {
            day: '2-digit', month: options.long ? 'long' : 'short', year: options.year === false ? undefined : 'numeric'
        }).format(d);
    }
    function fmtNumber(value, digits = 1) {
        const n = Number(value);
        if (!Number.isFinite(n))
            return '—';
        return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(n);
    }
    function round(value, digits = 1) {
        const n = Number(value);
        if (!Number.isFinite(n))
            return null;
        const p = 10 ** digits;
        return Math.round(n * p) / p;
    }
    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }
    function mean(values) {
        const nums = values.map(Number).filter(Number.isFinite);
        return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
    }
    function latest(items, dateKey = 'date') {
        return sortedDesc(items, dateKey)[0] || null;
    }
    function createdAtTime(item) {
        const value = new Date(item?.createdAt || item?.updatedAt || 0).getTime();
        return Number.isFinite(value) ? value : 0;
    }
    function sortedDesc(items, dateKey = 'date') {
        return [...items].sort((a, b) => {
            const primary = itemDateTime(b, dateKey) - itemDateTime(a, dateKey);
            return primary || (createdAtTime(b) - createdAtTime(a));
        });
    }
    function sortedAsc(items, dateKey = 'date') {
        return [...items].sort((a, b) => {
            const primary = itemDateTime(a, dateKey) - itemDateTime(b, dateKey);
            return primary || (createdAtTime(a) - createdAtTime(b));
        });
    }
    function itemDateTime(item, dateKey = 'date') {
        const date = item?.[dateKey] || item?.createdAt;
        const time = item?.time || '12:00';
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            const d = parseLocalDate(date);
            if (!d)
                return 0;
            const [h, m] = String(time).split(':').map(Number);
            d.setHours(Number.isFinite(h) ? h : 12, Number.isFinite(m) ? m : 0, 0, 0);
            return d.getTime();
        }
        const stamp = new Date(date || 0).getTime();
        return Number.isFinite(stamp) ? stamp : 0;
    }
    function recordsInLastDays(items, days, dateKey = 'date') {
        const today = todayISO();
        return items.filter(item => {
            if (!parseLocalDate(item[dateKey]))
                return false;
            const diff = daysBetween(item[dateKey], today);
            return diff !== null && diff >= 0 && diff < days;
        });
    }
    function isEnabled(moduleKey) {
        return state.data?.settings?.modules?.[moduleKey] !== false;
    }
    function getUnits() {
        return state.data?.settings?.units === 'imperial' ? 'imperial' : 'metric';
    }
    function weightDisplay(kg) {
        const n = Number(kg);
        if (!Number.isFinite(n))
            return { value: null, unit: getUnits() === 'imperial' ? 'lb' : 'кг' };
        return getUnits() === 'imperial'
            ? { value: n * 2.2046226218, unit: 'lb' }
            : { value: n, unit: 'кг' };
    }
    function weightInputToKg(value) {
        const n = parseFlexibleNumber(value);
        if (!Number.isFinite(n))
            return null;
        return getUnits() === 'imperial' ? n / 2.2046226218 : n;
    }
    function lengthDisplay(cm) {
        const n = Number(cm);
        if (!Number.isFinite(n))
            return { value: null, unit: getUnits() === 'imperial' ? 'in' : 'см' };
        return getUnits() === 'imperial'
            ? { value: n / 2.54, unit: 'in' }
            : { value: n, unit: 'см' };
    }
    function lengthInputToCm(value) {
        const n = parseFlexibleNumber(value);
        if (!Number.isFinite(n))
            return null;
        return getUnits() === 'imperial' ? n * 2.54 : n;
    }
    function distanceDisplay(km) {
        const n = Number(km);
        if (!Number.isFinite(n))
            return { value: null, unit: getUnits() === 'imperial' ? 'mi' : 'км' };
        return getUnits() === 'imperial'
            ? { value: n * 0.6213711922, unit: 'mi' }
            : { value: n, unit: 'км' };
    }
    function distanceInputToKm(value) {
        const n = parseFlexibleNumber(value);
        if (!Number.isFinite(n))
            return null;
        return getUnits() === 'imperial' ? n / 0.6213711922 : n;
    }
    function tempDisplay(c) {
        const n = Number(c);
        if (!Number.isFinite(n))
            return { value: null, unit: getUnits() === 'imperial' ? '°F' : '°C' };
        return getUnits() === 'imperial'
            ? { value: n * 9 / 5 + 32, unit: '°F' }
            : { value: n, unit: '°C' };
    }
    function tempInputToC(value) {
        const n = parseFlexibleNumber(value);
        if (!Number.isFinite(n))
            return null;
        return getUnits() === 'imperial' ? (n - 32) * 5 / 9 : n;
    }
    function durationText(hours) {
        const n = Number(hours);
        if (!Number.isFinite(n))
            return '—';
        const total = Math.round(n * 60);
        const h = Math.floor(total / 60);
        const m = total % 60;
        return `${h} ч ${String(m).padStart(2, '0')} мин`;
    }
    function firstName(name) {
        return String(name || '').trim().split(/\s+/)[0] || 'пользователь';
    }
    function getGreeting() {
        const h = new Date().getHours();
        if (h < 6)
            return 'Доброй ночи';
        if (h < 12)
            return 'Доброе утро';
        if (h < 18)
            return 'Добрый день';
        return 'Добрый вечер';
    }
    // ===== SAFE DOM & UI PRIMITIVES =====
    function makeEl(tag, options = {}, children = []) {
        const el = document.createElement(tag);
        if (options.className)
            el.className = options.className;
        if (options.text !== undefined)
            el.textContent = options.text;
        if (options.html !== undefined)
            el.innerHTML = options.html;
        if (options.attrs)
            Object.entries(options.attrs).forEach(([key, val]) => {
                if (val !== null && val !== undefined)
                    el.setAttribute(key, String(val));
            });
        if (options.dataset)
            Object.entries(options.dataset).forEach(([key, val]) => { el.dataset[key] = String(val); });
        if (options.on)
            Object.entries(options.on).forEach(([event, handler]) => el.addEventListener(event, handler));
        const childList = Array.isArray(children) ? children : [children];
        childList.filter(Boolean).forEach(child => el.append(child.nodeType ? child : document.createTextNode(String(child))));
        return el;
    }
    function clear(node) {
        while (node.firstChild)
            node.removeChild(node.firstChild);
    }
    function setStaticHTML(node, html) {
        node.innerHTML = html;
    }
    function icon(name) {
        return makeEl('span', { className: 'nav-icon', html: ICONS[name] || ICONS.overview });
    }
    function showToast(message, options = {}) {
        if (!dom.toastRegion)
            return;
        const normalizedMessage = String(message || '').trim();
        if (!normalizedMessage)
            return;
        [...dom.toastRegion.querySelectorAll('.toast')].forEach(existing => {
            if (existing.dataset.message === normalizedMessage)
                existing.remove();
        });
        while (dom.toastRegion.children.length >= 3)
            dom.toastRegion.firstElementChild?.remove();
        const toast = makeEl('div', { className: 'toast', dataset: { message: normalizedMessage } });
        const copy = makeEl('div', { className: 'toast-copy', text: normalizedMessage });
        toast.append(copy);
        if (options.actionLabel && typeof options.onAction === 'function') {
            const action = makeEl('button', { className: 'toast-action', text: options.actionLabel, attrs: { type: 'button' } });
            action.addEventListener('click', () => {
                options.onAction();
                toast.remove();
            });
            toast.append(action);
        }
        dom.toastRegion.append(toast);
        const timeout = options.timeout || 4200;
        window.setTimeout(() => toast.isConnected && toast.remove(), timeout);
    }
    function downloadFile(filename, text, type = 'text/plain;charset=utf-8') {
        try {
            const blob = new Blob([text], { type });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.append(a);
            a.click();
            a.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
            return true;
        }
        catch (_) {
            showToast('Не удалось подготовить файл для скачивания.');
            return false;
        }
    }
    async function copyText(text) {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        }
        catch (_) { /* fallback below */ }
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.append(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        textarea.remove();
        return ok;
    }
    function askConfirm(title, text, okLabel = 'Продолжить', danger = true) {
        return new Promise(resolve => {
            dom.confirmTitle.textContent = title;
            dom.confirmText.textContent = text;
            dom.confirmOk.textContent = okLabel;
            dom.confirmOk.className = danger ? 'btn danger' : 'btn primary';
            const cleanup = (result) => {
                dom.confirmCancel.onclick = null;
                dom.confirmOk.onclick = null;
                dom.confirmDialog.oncancel = null;
                if (dom.confirmDialog.open)
                    dom.confirmDialog.close();
                resolve(result);
            };
            dom.confirmCancel.onclick = () => cleanup(false);
            dom.confirmOk.onclick = () => cleanup(true);
            dom.confirmDialog.oncancel = event => { event.preventDefault(); cleanup(false); };
            dom.confirmDialog.showModal();
        });
    }
    function applyTheme(theme = state.data?.settings?.theme || 'system') {
        const resolved = theme === 'system'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : theme;
        document.documentElement.dataset.theme = resolved;
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta)
            meta.setAttribute('content', resolved === 'dark' ? '#0d1115' : '#f4f6f8');
        if (dom.themeIcon)
            dom.themeIcon.textContent = theme === 'system' ? '◐' : (resolved === 'dark' ? '☾' : '☼');
    }
    function persistTheme(theme) {
        const ok = mutateAndSave(data => { data.settings.theme = theme; }, { rerender: 'none' });
        if (ok)
            applyTheme(theme);
    }
    function cycleTheme() {
        const current = state.data.settings.theme || 'system';
        const next = current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';
        persistTheme(next);
        if (state.route === 'settings')
            renderCurrentRoute();
        showToast(`Тема: ${next === 'system' ? 'системная' : next === 'light' ? 'светлая' : 'тёмная'}`);
    }
    function parseFlexibleNumber(value) {
        if (typeof value === 'number')
            return Number.isFinite(value) ? value : NaN;
        if (typeof value !== 'string')
            return NaN;
        const text = value.trim().replace(/\s+/g, '').replace(',', '.');
        if (!text || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text))
            return NaN;
        return Number(text);
    }
    function validateNumber(value, { min = -Infinity, max = Infinity, required = false } = {}) {
        if (value === '' || value === null || value === undefined)
            return required ? { ok: false, value: null } : { ok: true, value: null };
        const n = parseFlexibleNumber(value);
        return { ok: Number.isFinite(n) && n >= min && n <= max, value: Number.isFinite(n) ? n : null };
    }
    function validateDate(value, required = false) {
        if (!value)
            return !required;
        const d = parseLocalDate(value);
        return Boolean(d);
    }
    function formDataObject(form) {
        const fd = new FormData(form);
        const obj = {};
        for (const [key, value] of fd.entries()) {
            if (obj[key] !== undefined) {
                if (!Array.isArray(obj[key]))
                    obj[key] = [obj[key]];
                obj[key].push(value);
            }
            else
                obj[key] = value;
        }
        return obj;
    }
    // ===== DEMO & ONBOARDING =====
    function createDemoData() {
        const data = createEmptyData();
        data.activeProfileId = DEMO_PROFILE_ID;
        data.settings.theme = 'system';
        data.settings.units = 'metric';
        data.settings.lastBackupAt = shiftDate(-18);
        data.profiles = [{
                id: DEMO_PROFILE_ID,
                name: 'Алексей Смирнов',
                dob: '1990-04-12',
                sex: 'male',
                heightCm: 182,
                goals: ['Снижение веса', 'Сон', 'Контроль анализов'],
                priority: 'Снижение веса',
                lifestyle: {
                    trainingsPerWeek: 3,
                    averageSteps: 7600,
                    averageSleepHours: 6.8,
                    stress: 6,
                    smoking: 'no',
                    alcohol: 'rarely',
                    stepGoal: 9000,
                    sleepGoalHours: 7.5
                },
                conditions: ['Сезонный аллергический ринит'],
                allergies: ['Пыльца берёзы'],
                createdAt: `${shiftDate(-120)}T09:00:00.000Z`
            }];
        const add = (collection, record) => data[collection].push({ id: `demo-${collection}-${data[collection].length + 1}`, profileId: DEMO_PROFILE_ID, ...record });
        [
            [-35, 91.8], [-28, 91.1], [-21, 90.6], [-14, 90.0], [-10, 89.6], [-7, 89.2], [-4, 88.9], [-1, 88.6]
        ].forEach(([d, v]) => add('measurements', { type: 'weight', value: v, date: shiftDate(d), createdAt: dateTimeStamp() }));
        add('measurements', { type: 'bodyFat', value: 20.8, date: shiftDate(-20), createdAt: dateTimeStamp() });
        add('measurements', { type: 'waist', value: 92, date: shiftDate(-10), createdAt: dateTimeStamp() });
        [
            [-8, 128, 82, 68], [-5, 126, 80, 66], [-2, 124, 79, 65], [0, 125, 78, 64]
        ].forEach(([d, s, di, p]) => add('measurements', { type: 'bloodPressure', systolic: s, diastolic: di, pulse: p, date: shiftDate(d), time: '08:15', note: 'Утреннее измерение', createdAt: dateTimeStamp() }));
        add('measurements', { type: 'restingHeartRate', value: 63, date: shiftDate(-1), createdAt: dateTimeStamp() });
        add('measurements', { type: 'spo2', value: 98, date: shiftDate(-2), createdAt: dateTimeStamp() });
        [
            [-8, 6.2, 6], [-7, 6.5, 7], [-6, 6.9, 7], [-5, 7.2, 8], [-4, 7.0, 7], [-3, 7.4, 8], [-2, 7.6, 8], [-1, 7.3, 8]
        ].forEach(([d, h, q]) => add('sleep', { date: shiftDate(d), durationHours: h, quality: q, bedtime: '23:35', wakeTime: '07:05', awakenings: d % 3 === 0 ? 2 : 1, note: '', createdAt: dateTimeStamp() }));
        [
            [-8, 6900, 38, 20, 5.2], [-7, 7400, 43, 25, 5.8], [-6, 8100, 51, 30, 6.4], [-5, 8600, 55, 20, 6.7], [-4, 9200, 62, 35, 7.4], [-3, 8800, 58, 25, 7.0], [-2, 9600, 66, 30, 7.8], [-1, 9300, 63, 25, 7.5], [0, 6200, 41, 0, 4.8]
        ].forEach(([d, steps, active, cardio, distance]) => add('activity', { date: shiftDate(d), steps, activeMinutes: active, cardioMinutes: cardio, distanceKm: distance, createdAt: dateTimeStamp() }));
        [
            [-6, 'Силовая', 'Верх тела', 68, 8], [-4, 'Кардио', 'Зона 2', 38, 6], [-2, 'Силовая', 'Низ тела', 72, 8]
        ].forEach(([d, type, name, duration, rpe]) => add('training', { date: shiftDate(d), type, name, durationMinutes: duration, rpe, note: '', createdAt: dateTimeStamp() }));
        [
            [-3, 2250, 175, 70, 230, 29, 2.3], [-2, 2180, 168, 68, 220, 31, 2.5], [-1, 2240, 172, 72, 225, 30, 2.4]
        ].forEach(([d, cal, p, f, c, fiber, water]) => add('nutrition', { date: shiftDate(d), calories: cal, protein: p, fat: f, carbs: c, fiber, waterLiters: water, createdAt: dateTimeStamp() }));
        const labs = [
            ['Глюкоза', 5.0, 'ммоль/л', 3.9, 5.5, -78, 'Городская лаборатория'],
            ['HbA1c', 5.2, '%', 4.0, 5.6, -78, 'Городская лаборатория'],
            ['LDL', 3.2, 'ммоль/л', 0, 3.0, -78, 'Городская лаборатория'],
            ['HDL', 1.45, 'ммоль/л', 1.0, 2.2, -78, 'Городская лаборатория'],
            ['ALT', 28, 'Ед/л', 0, 41, -78, 'Городская лаборатория'],
            ['AST', 24, 'Ед/л', 0, 40, -78, 'Городская лаборатория'],
            ['Ферритин', 88, 'нг/мл', 30, 300, -78, 'Городская лаборатория'],
            ['Витамин D', 34, 'нг/мл', 30, 100, -78, 'Городская лаборатория'],
            ['LDL', 3.0, 'ммоль/л', 0, 3.0, -12, 'Городская лаборатория'],
            ['ALT', 26, 'Ед/л', 0, 41, -12, 'Городская лаборатория'],
            ['Ферритин', 91, 'нг/мл', 30, 300, -12, 'Городская лаборатория']
        ];
        labs.forEach(([name, value, unit, min, max, d, lab]) => add('labs', { name, value, unit, referenceMin: min, referenceMax: max, date: shiftDate(d), laboratory: lab, comment: '', createdAt: dateTimeStamp() }));
        add('medications', { name: 'Цетиризин', dosage: 10, unit: 'мг', frequency: 'по необходимости', startDate: shiftDate(-45), endDate: '', reason: 'Сезонная аллергия', note: '', status: 'active', createdAt: dateTimeStamp() });
        add('supplements', { name: 'Креатин моногидрат', dosage: 5, unit: 'г', frequency: 'ежедневно', startDate: shiftDate(-90), endDate: '', reason: 'Тренировочная программа', note: '', status: 'active', createdAt: dateTimeStamp() });
        add('supplements', { name: 'Омега-3', dosage: 2, unit: 'капсулы', frequency: 'ежедневно', startDate: shiftDate(-60), endDate: '', reason: 'Личный выбор', note: '', status: 'active', createdAt: dateTimeStamp() });
        add('symptoms', { name: 'Головная боль', date: shiftDate(-9), intensity: 4, duration: '2 часа', note: 'После напряжённого рабочего дня', createdAt: dateTimeStamp() });
        add('goals', { name: 'Вес 85 кг', category: 'Снижение веса', startValue: 92, targetValue: 85, currentValue: 88.6, unit: 'кг', startDate: shiftDate(-40), deadline: shiftDate(55), createdAt: dateTimeStamp() });
        add('goals', { name: 'Стабильный сон 7.5 ч', category: 'Сон', startValue: 6.3, targetValue: 7.5, currentValue: 7.3, unit: 'ч', startDate: shiftDate(-25), deadline: shiftDate(30), createdAt: dateTimeStamp() });
        add('notes', { date: shiftDate(-3), text: 'После переноса тренировки на более раннее время засыпать стало проще.', createdAt: dateTimeStamp() });
        return data;
    }
    function startOnboarding(mode = 'new') {
        clear(dom.toastRegion);
        state.onboardingMode = mode;
        const existing = mode === 'edit' ? getProfile() : null;
        let recoveredDraft = null;
        if (mode === 'new') {
            try {
                const saved = JSON.parse(localStorage.getItem(ONBOARDING_DRAFT_KEY) || 'null');
                if (saved?.draft && saved?.step >= 1 && saved?.step <= 5)
                    recoveredDraft = saved;
            }
            catch (_) { }
        }
        state.onboarding = recoveredDraft || {
            step: 1,
            draft: existing ? JSON.parse(JSON.stringify(existing)) : {
                id: null,
                name: '',
                dob: '',
                sex: '',
                heightCm: null,
                initialWeightKg: null,
                goals: [],
                priority: '',
                lifestyle: {
                    trainingsPerWeek: null,
                    averageSteps: null,
                    averageSleepHours: null,
                    stress: null,
                    smoking: '',
                    alcohol: '',
                    stepGoal: null,
                    sleepGoalHours: null
                },
                conditions: [],
                allergies: [],
                initialMedications: [],
                initialSupplements: []
            }
        };
        dom.app.hidden = true;
        dom.welcome.hidden = true;
        dom.onboarding.hidden = false;
        dom.cancelOnboardingBtn.hidden = mode === 'new' && state.data.profiles.length === 0;
        renderOnboardingStep();
    }
    function persistOnboardingDraft() {
        if (!state.onboarding || state.onboardingMode !== 'new')
            return;
        try {
            localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(state.onboarding));
        }
        catch (_) { }
    }
    function clearOnboardingDraft() { try {
        localStorage.removeItem(ONBOARDING_DRAFT_KEY);
    }
    catch (_) { } }
    function onboardingHeader(title, subtitle, eyebrow) {
        const wrap = makeEl('div');
        wrap.append(makeEl('p', { className: 'eyebrow', text: eyebrow }), makeEl('h1', { text: title }), makeEl('p', { text: subtitle }));
        return wrap;
    }
    function onboardingField(label, input) {
        const field = makeEl('div', { className: 'field' });
        const lab = makeEl('label', { text: label, attrs: { for: input.id } });
        field.append(lab, input);
        return field;
    }
    function renderOnboardingStep() {
        const { step, draft } = state.onboarding;
        dom.onboardingProgress.style.width = `${(step / 5) * 100}%`;
        dom.onboardingProgress.parentElement?.setAttribute('aria-valuenow', String(step));
        dom.onboardingProgress.parentElement?.setAttribute('aria-valuetext', `Шаг ${step} из 5`);
        clear(dom.onboardingStep);
        if (step === 1) {
            const form = makeEl('form', { className: 'form', attrs: { novalidate: 'novalidate' } });
            const head = onboardingHeader('Расскажите о себе', 'Базовые параметры нужны для персонализации интерфейса и единиц измерения.', 'Шаг 1 из 5 · Профиль');
            const grid = makeEl('div', { className: 'form-grid' });
            const name = makeEl('input', { className: 'input', attrs: { id: 'obName', name: 'name', type: 'text', maxlength: '80', autocomplete: 'name', required: 'required' } });
            name.value = draft.name || '';
            const dob = makeEl('input', { className: 'input', attrs: { id: 'obDob', name: 'dob', type: 'date', required: 'required', max: todayISO() } });
            dob.value = draft.dob || '';
            const sex = makeEl('select', { className: 'select', attrs: { id: 'obSex', name: 'sex', required: 'required' } });
            [['', 'Выберите'], ['male', 'Мужской'], ['female', 'Женский'], ['intersex', 'Интерсекс / другой биологический вариант'], ['unknown', 'Предпочитаю не указывать']].forEach(([v, t]) => {
                const o = makeEl('option', { text: t, attrs: { value: v } });
                if (draft.sex === v)
                    o.selected = true;
                sex.append(o);
            });
            const height = makeEl('input', { className: 'input', attrs: { id: 'obHeight', name: 'height', type: 'number', min: '80', max: '260', step: '0.1', inputmode: 'decimal', required: 'required' } });
            if (draft.heightCm)
                height.value = String(round(draft.heightCm, 1));
            const weight = makeEl('input', { className: 'input', attrs: { id: 'obWeight', name: 'weight', type: 'number', min: '20', max: '400', step: '0.1', inputmode: 'decimal', required: 'required' } });
            if (draft.initialWeightKg)
                weight.value = String(round(draft.initialWeightKg, 1));
            grid.append(onboardingField('Имя', name), onboardingField('Дата рождения', dob), onboardingField('Биологический пол', sex), onboardingField('Рост, см', height), onboardingField('Вес, кг', weight));
            const nav = onboardingNav(false, 'Продолжить');
            form.append(head, grid, nav);
            form.addEventListener('submit', e => {
                e.preventDefault();
                const fd = formDataObject(form);
                const h = validateNumber(fd.height, { min: 80, max: 260, required: true });
                const w = validateNumber(fd.weight, { min: 20, max: 400, required: true });
                if (!String(fd.name || '').trim() || !validateDate(fd.dob, true) || !fd.sex || !h.ok || !w.ok) {
                    showToast('Проверьте обязательные поля профиля.');
                    return;
                }
                draft.name = String(fd.name).trim();
                draft.dob = fd.dob;
                draft.sex = fd.sex;
                draft.heightCm = h.value;
                draft.initialWeightKg = w.value;
                state.onboarding.step = 2;
                persistOnboardingDraft();
                renderOnboardingStep();
            });
            dom.onboardingStep.append(form);
            window.setTimeout(() => name.focus(), 0);
            return;
        }
        if (step === 2) {
            const form = makeEl('form', { className: 'form' });
            const head = onboardingHeader('Выберите главные цели', 'Можно выбрать несколько. Они определят порядок модулей и акценты на главном экране.', 'Шаг 2 из 5 · Цели');
            const choices = makeEl('div', { className: 'checkbox-grid' });
            GOAL_OPTIONS.forEach(goal => {
                const label = makeEl('label', { className: 'choice-card' });
                const input = makeEl('input', { attrs: { type: 'checkbox', name: 'goals', value: goal } });
                if (draft.goals?.includes(goal))
                    input.checked = true;
                label.append(input, makeEl('span', { text: goal }));
                choices.append(label);
            });
            const nav = onboardingNav(true, 'Продолжить');
            form.append(head, choices, nav);
            form.addEventListener('submit', e => {
                e.preventDefault();
                const selected = [...form.querySelectorAll('input[name="goals"]:checked')].map(i => i.value);
                if (!selected.length) {
                    showToast('Выберите хотя бы одну цель.');
                    return;
                }
                draft.goals = selected;
                if (draft.priority && !selected.includes(draft.priority))
                    draft.priority = '';
                state.onboarding.step = 3;
                persistOnboardingDraft();
                renderOnboardingStep();
            });
            dom.onboardingStep.append(form);
            return;
        }
        if (step === 3) {
            const form = makeEl('form', { className: 'form' });
            const head = onboardingHeader('Опишите образ жизни', 'Эти данные задают исходный контекст. Их можно изменить позже в разделе «Образ жизни».', 'Шаг 3 из 5 · Образ жизни');
            const grid = makeEl('div', { className: 'form-grid' });
            const fields = [
                ['trainingsPerWeek', 'Тренировок в неделю', 'number', '0', '14', '1'],
                ['averageSteps', 'Среднее количество шагов', 'number', '0', '100000', '100'],
                ['averageSleepHours', 'Средняя длительность сна, ч', 'number', '0', '24', '0.1'],
                ['stress', 'Уровень стресса, 1–10', 'number', '1', '10', '1']
            ];
            fields.forEach(([name, label, type, min, max, stepVal]) => {
                const input = makeEl('input', { className: 'input', attrs: { id: `ob-${name}`, name, type, min, max, step: stepVal, required: 'required', inputmode: 'decimal' } });
                const val = draft.lifestyle?.[name];
                if (val !== null && val !== undefined)
                    input.value = String(val);
                grid.append(onboardingField(label, input));
            });
            const smoking = makeEl('select', { className: 'select', attrs: { id: 'obSmoking', name: 'smoking', required: 'required' } });
            [['', 'Выберите'], ['no', 'Нет'], ['yes', 'Да']].forEach(([v, t]) => { const o = makeEl('option', { text: t, attrs: { value: v } }); if (draft.lifestyle?.smoking === v)
                o.selected = true; smoking.append(o); });
            const alcohol = makeEl('select', { className: 'select', attrs: { id: 'obAlcohol', name: 'alcohol', required: 'required' } });
            [['', 'Выберите'], ['none', 'Нет'], ['rarely', 'Редко'], ['regularly', 'Регулярно']].forEach(([v, t]) => { const o = makeEl('option', { text: t, attrs: { value: v } }); if (draft.lifestyle?.alcohol === v)
                o.selected = true; alcohol.append(o); });
            grid.append(onboardingField('Курение', smoking), onboardingField('Алкоголь', alcohol));
            const nav = onboardingNav(true, 'Продолжить');
            form.append(head, grid, nav);
            form.addEventListener('submit', e => {
                e.preventDefault();
                const fd = formDataObject(form);
                const t = validateNumber(fd.trainingsPerWeek, { min: 0, max: 14, required: true });
                const s = validateNumber(fd.averageSteps, { min: 0, max: 100000, required: true });
                const sl = validateNumber(fd.averageSleepHours, { min: 0, max: 24, required: true });
                const st = validateNumber(fd.stress, { min: 1, max: 10, required: true });
                if (!t.ok || !s.ok || !sl.ok || !st.ok || !fd.smoking || !fd.alcohol) {
                    showToast('Проверьте данные образа жизни.');
                    return;
                }
                draft.lifestyle = { ...(draft.lifestyle || {}), trainingsPerWeek: t.value, averageSteps: s.value, averageSleepHours: sl.value, stress: st.value, smoking: fd.smoking, alcohol: fd.alcohol };
                state.onboarding.step = 4;
                persistOnboardingDraft();
                renderOnboardingStep();
            });
            dom.onboardingStep.append(form);
            return;
        }
        if (step === 4) {
            const form = makeEl('form', { className: 'form' });
            const head = onboardingHeader('Добавьте важный медицинский контекст', 'Шаг необязательный. Укажите только то, что хотите хранить локально в этой системе.', 'Шаг 4 из 5 · Здоровье');
            const blocks = makeEl('div', { className: 'form' });
            [
                ['conditions', 'Заболевания / состояния', draft.conditions],
                ['allergies', 'Аллергии', draft.allergies],
                ['initialMedications', 'Лекарства', draft.initialMedications],
                ['initialSupplements', 'Добавки', draft.initialSupplements]
            ].forEach(([key, label, items]) => blocks.append(createRepeatableBlock(key, label, items || [])));
            const nav = onboardingNav(true, 'Продолжить', true);
            form.append(head, blocks, nav);
            form.addEventListener('submit', e => {
                e.preventDefault();
                ['conditions', 'allergies', 'initialMedications', 'initialSupplements'].forEach(key => {
                    draft[key] = [...form.querySelectorAll(`[name="${key}"]`)].map(i => i.value.trim()).filter(Boolean);
                });
                state.onboarding.step = 5;
                persistOnboardingDraft();
                renderOnboardingStep();
            });
            dom.onboardingStep.append(form);
            return;
        }
        if (step === 5) {
            const form = makeEl('form', { className: 'form' });
            const head = onboardingHeader('Что сейчас наиболее важно?', 'Выберите один основной приоритет. Его можно изменить в любой момент.', 'Шаг 5 из 5 · Приоритет');
            const list = makeEl('div', { className: 'priority-grid' });
            (draft.goals || []).forEach(goal => {
                const label = makeEl('label', { className: 'choice-card' });
                const input = makeEl('input', { attrs: { type: 'radio', name: 'priority', value: goal, required: 'required' } });
                if (draft.priority === goal)
                    input.checked = true;
                label.append(input, makeEl('span', { text: goal }));
                list.append(label);
            });
            const nav = onboardingNav(true, state.onboardingMode === 'edit' ? 'Сохранить профиль' : 'Создать Health OS');
            form.append(head, list, nav);
            form.addEventListener('submit', e => {
                e.preventDefault();
                const fd = formDataObject(form);
                if (!fd.priority) {
                    showToast('Выберите основной приоритет.');
                    return;
                }
                draft.priority = fd.priority;
                completeOnboarding();
            });
            dom.onboardingStep.append(form);
        }
    }
    function createRepeatableBlock(key, label, items) {
        const wrap = makeEl('div', { className: 'field' });
        const title = makeEl('label', { text: label });
        const list = makeEl('div', { className: 'repeat-fields' });
        const addRow = (value = '') => {
            const row = makeEl('div', { className: 'repeat-row' });
            const input = makeEl('input', { className: 'input', attrs: { type: 'text', name: key, maxlength: '160' } });
            input.value = value;
            const remove = makeEl('button', { className: 'btn secondary', text: '×', attrs: { type: 'button', 'aria-label': 'Удалить поле' } });
            remove.addEventListener('click', () => row.remove());
            row.append(input, remove);
            list.append(row);
        };
        items.forEach(addRow);
        if (!items.length)
            addRow();
        const add = makeEl('button', { className: 'btn ghost small', text: `+ Добавить`, attrs: { type: 'button' } });
        add.addEventListener('click', () => addRow());
        wrap.append(title, list, add);
        return wrap;
    }
    function onboardingNav(showBack, nextLabel, allowSkip = false) {
        const nav = makeEl('div', { className: 'onboarding-nav' });
        if (showBack) {
            const back = makeEl('button', { className: 'btn ghost', text: 'Назад', attrs: { type: 'button' } });
            back.addEventListener('click', () => { state.onboarding.step = Math.max(1, state.onboarding.step - 1); persistOnboardingDraft(); renderOnboardingStep(); });
            nav.append(back);
        }
        const right = makeEl('div', { className: 'right' });
        if (allowSkip) {
            const skip = makeEl('button', { className: 'btn secondary', text: 'Пропустить', attrs: { type: 'button' } });
            skip.addEventListener('click', () => { state.onboarding.step = 5; persistOnboardingDraft(); renderOnboardingStep(); });
            right.append(skip);
        }
        right.append(makeEl('button', { className: 'btn primary', text: nextLabel, attrs: { type: 'submit' } }));
        nav.append(right);
        return nav;
    }
    function completeOnboarding() {
        const draft = deepClone(state.onboarding.draft);
        const now = dateTimeStamp();
        if (state.onboardingMode === 'edit') {
            const id = state.data.activeProfileId;
            const ok = mutateAndSave(data => {
                const target = data.profiles.find(p => p.id === id);
                if (!target)
                    throw new Error('PROFILE_NOT_FOUND');
                Object.assign(target, { name: draft.name, dob: draft.dob, sex: draft.sex, heightCm: draft.heightCm, goals: [...draft.goals], priority: draft.priority, lifestyle: { ...target.lifestyle, ...draft.lifestyle }, conditions: [...draft.conditions], allergies: [...draft.allergies], updatedAt: now });
            }, { rerender: 'none' });
            if (!ok)
                return;
            clearOnboardingDraft();
            state.onboarding = null;
            dom.onboarding.hidden = true;
            dom.app.hidden = false;
            renderApp();
            showToast('Профиль обновлён.');
            return;
        }
        const profileId = uid();
        const profile = { id: profileId, name: draft.name, dob: draft.dob, sex: draft.sex, heightCm: draft.heightCm, goals: [...draft.goals], priority: draft.priority, lifestyle: { ...draft.lifestyle }, conditions: [...draft.conditions], allergies: [...draft.allergies], dataDeclarations: { medications: (draft.initialMedications || []).length ? 'has' : 'unknown', supplements: (draft.initialSupplements || []).length ? 'has' : 'unknown' }, createdAt: now };
        const ok = mutateAndSave(data => {
            data.profiles.push(profile);
            data.activeProfileId = profileId;
            const weight = Number(draft.initialWeightKg);
            if (Number.isFinite(weight))
                data.measurements.push({ id: uid(), profileId, type: 'weight', value: weight, date: todayISO(), createdAt: now });
            (draft.initialMedications || []).forEach(name => data.medications.push({ id: uid(), profileId, name, dosage: null, unit: '', frequency: 'не указана', startDate: todayISO(), endDate: '', reason: 'Добавлено при настройке профиля', note: '', status: 'active', createdAt: now }));
            (draft.initialSupplements || []).forEach(name => data.supplements.push({ id: uid(), profileId, name, dosage: null, unit: '', frequency: 'не указана', startDate: todayISO(), endDate: '', reason: 'Добавлено при настройке профиля', note: '', status: 'active', createdAt: now }));
        }, { rerender: 'none' });
        if (!ok)
            return;
        clearOnboardingDraft();
        state.onboarding = null;
        dom.onboarding.hidden = true;
        dom.app.hidden = false;
        state.route = 'overview';
        renderApp();
        window.setTimeout(() => showPersonalizationWow(getProfile()), 100);
    }
    function showPersonalizationWow(profile) {
        openModal('Ваша Health OS создана', 'Персонализация', body => {
            const wrap = makeEl('div', { className: 'wow-card' });
            wrap.append(makeEl('div', { className: 'wow-icon', text: '✓' }), makeEl('h3', { text: 'Интерфейс настроен под ваши цели.' }), makeEl('p', { text: 'Порядок модулей, быстрые действия и рекомендации теперь используют ваш основной приоритет и выбранные цели.' }));
            const summary = makeEl('div', { className: 'wow-summary' });
            const activeModules = Object.entries(state.data.settings.modules).filter(([, v]) => v).map(([k]) => MODULE_LABELS[k]).slice(0, 7).join(', ');
            summary.append(wowRow('Основной приоритет', profile.priority), wowRow('Активные модули', activeModules));
            wrap.append(summary, makeEl('h4', { text: 'Рекомендуемые следующие действия' }));
            const actions = getTodayActions(profile).slice(0, 3);
            const list = makeEl('ul', { className: 'recommendations' });
            actions.forEach(a => list.append(makeEl('li', { text: a.title })));
            wrap.append(list);
            const actionsRow = makeEl('div', { className: 'form-actions' });
            const done = makeEl('button', { className: 'btn primary', text: 'Перейти к обзору', attrs: { type: 'button' } });
            done.addEventListener('click', () => closeModal(true));
            actionsRow.append(done);
            wrap.append(actionsRow);
            body.append(wrap);
        }, false);
    }
    function wowRow(label, value) { const row = makeEl('div', { className: 'wow-row' }); row.append(makeEl('span', { text: label }), makeEl('strong', { text: value || '—' })); return row; }
    // ===== PERSONALIZATION & HEALTH CALCULATIONS =====
    function dashboardSectionOrder(profile) {
        const priority = profile?.priority || '';
        const mapping = {
            'Контроль анализов': ['snapshot', 'insights', 'changes', 'today', 'completeness', 'score'],
            'Сон': ['snapshot', 'changes', 'today', 'score', 'insights', 'completeness'],
            'Восстановление': ['snapshot', 'changes', 'today', 'score', 'insights', 'completeness'],
            'Контроль давления': ['snapshot', 'changes', 'insights', 'today', 'score', 'completeness'],
            'Снижение веса': ['snapshot', 'changes', 'today', 'score', 'completeness', 'insights'],
            'Набор мышечной массы': ['snapshot', 'changes', 'today', 'score', 'completeness', 'insights'],
            'Сохранение формы': ['snapshot', 'changes', 'today', 'score', 'completeness', 'insights'],
            'Силовые показатели': ['snapshot', 'today', 'changes', 'score', 'insights', 'completeness'],
            'Выносливость': ['snapshot', 'today', 'changes', 'score', 'insights', 'completeness'],
            'Управление препаратами': ['snapshot', 'today', 'insights', 'completeness', 'changes', 'score'],
            'Снижение стресса': ['snapshot', 'today', 'changes', 'score', 'insights', 'completeness'],
            'Долголетие': ['snapshot', 'changes', 'insights', 'score', 'completeness', 'today'],
            'Профилактика': ['snapshot', 'changes', 'insights', 'completeness', 'score', 'today'],
            'Общее здоровье': ['snapshot', 'today', 'changes', 'score', 'completeness', 'insights']
        };
        return mapping[priority] || mapping['Общее здоровье'];
    }
    function getPersonalizedDashboard(profile) {
        const priority = profile?.priority || '';
        const mapping = {
            'Снижение веса': ['weight', 'activity', 'sleep', 'goals', 'training', 'labs', 'bp', 'pulse'],
            'Набор мышечной массы': ['weight', 'training', 'sleep', 'goals', 'activity', 'labs', 'pulse', 'bp'],
            'Сохранение формы': ['weight', 'activity', 'training', 'sleep', 'goals', 'pulse', 'labs', 'bp'],
            'Силовые показатели': ['training', 'weight', 'sleep', 'activity', 'goals', 'pulse', 'labs', 'bp'],
            'Выносливость': ['activity', 'training', 'pulse', 'sleep', 'weight', 'goals', 'labs', 'bp'],
            'Сон': ['sleep', 'activity', 'pulse', 'training', 'weight', 'goals', 'labs', 'bp'],
            'Восстановление': ['sleep', 'pulse', 'training', 'activity', 'weight', 'goals', 'labs', 'bp'],
            'Контроль анализов': ['labs', 'weight', 'sleep', 'activity', 'goals', 'bp', 'pulse', 'training'],
            'Контроль давления': ['bp', 'pulse', 'sleep', 'activity', 'weight', 'labs', 'goals', 'training'],
            'Профилактика': ['labs', 'bp', 'weight', 'activity', 'sleep', 'pulse', 'goals', 'training'],
            'Долголетие': ['activity', 'sleep', 'labs', 'bp', 'weight', 'pulse', 'goals', 'training'],
            'Управление препаратами': ['medications', 'labs', 'goals', 'sleep', 'weight', 'bp', 'activity', 'pulse'],
            'Снижение стресса': ['sleep', 'activity', 'pulse', 'goals', 'training', 'weight', 'bp', 'labs'],
            'Общее здоровье': ['weight', 'sleep', 'activity', 'bp', 'pulse', 'labs', 'goals', 'training']
        };
        return mapping[priority] || mapping['Общее здоровье'];
    }
    window.getPersonalizedDashboard = getPersonalizedDashboard;
    function relevantSnapshotKeys(profile) {
        const available = getPersonalizedDashboard(profile).filter(key => {
            const moduleMap = { weight: 'body', sleep: 'sleep', activity: 'activity', bp: 'body', pulse: 'body', labs: 'labs', goals: 'goals', training: 'training' };
            if (key === 'medications')
                return isEnabled('medications') || isEnabled('supplements');
            return isEnabled(moduleMap[key]);
        });
        return available.slice(0, 8);
    }
    function getWeightRecords() {
        return sortedAsc(profileRecords('measurements').filter(x => x.type === 'weight'));
    }
    function weightChangeForPeriod(weights, days) {
        if (!weights.length)
            return null;
        const ordered = sortedAsc(weights);
        const current = ordered[ordered.length - 1];
        const currentDate = parseLocalDate(current.date);
        if (!currentDate)
            return null;
        const cutoff = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        cutoff.setDate(cutoff.getDate() - days);
        const baseline = ordered.filter(item => {
            const d = parseLocalDate(item.date);
            return d && d <= cutoff;
        }).pop();
        if (!baseline)
            return null;
        const deltaKg = Number(current.value) - Number(baseline.value);
        if (!Number.isFinite(deltaKg))
            return null;
        return { baseline, current, deltaKg };
    }
    function getBpRecords() {
        return sortedAsc(profileRecords('measurements').filter(x => x.type === 'bloodPressure'));
    }
    function getPulseRecords() {
        const resting = profileRecords('measurements').filter(x => x.type === 'restingHeartRate').map(x => ({ ...x, pulse: x.value }));
        const bp = profileRecords('measurements').filter(x => x.type === 'bloodPressure' && Number.isFinite(Number(x.pulse))).map(x => ({ ...x, pulse: x.pulse }));
        return sortedAsc([...resting, ...bp]);
    }
    function labStatus(lab) {
        const value = Number(lab.value), min = Number(lab.referenceMin), max = Number(lab.referenceMax);
        if (!Number.isFinite(value))
            return { key: 'unknown', text: 'Нет значения' };
        const hasMin = lab.referenceMin !== '' && lab.referenceMin !== null && lab.referenceMin !== undefined && Number.isFinite(min);
        const hasMax = lab.referenceMax !== '' && lab.referenceMax !== null && lab.referenceMax !== undefined && Number.isFinite(max);
        if (hasMin && value < min)
            return { key: 'low', text: 'Ниже референса' };
        if (hasMax && value > max)
            return { key: 'high', text: 'Выше референса' };
        if (hasMin || hasMax)
            return { key: 'range', text: 'В диапазоне' };
        return { key: 'unknown', text: 'Референс не указан' };
    }
    function getActiveGoals() {
        return profileRecords('goals').filter(goal => {
            if (!goal.deadline)
                return true;
            const deadline = parseLocalDate(goal.deadline);
            if (!deadline)
                return true;
            return deadline >= parseLocalDate(todayISO()) || goalProgress(goal) < 100;
        });
    }
    function goalProgress(goal) {
        const start = Number(goal.startValue), target = Number(goal.targetValue), current = Number(goal.currentValue);
        if (![start, target, current].every(Number.isFinite))
            return null;
        if (target === start)
            return current === target ? 100 : 0;
        const raw = ((current - start) / (target - start)) * 100;
        return clamp(raw, 0, 100);
    }
    function computeHealthScore(profile) {
        const components = [];
        if (isEnabled('sleep')) {
            const recentSleep = recordsInLastDays(profileRecords('sleep'), 7);
            const goal = Number(profile?.lifestyle?.sleepGoalHours);
            if (recentSleep.length >= 3 && goal > 0) {
                const average = mean(recentSleep.map(item => Number(item.durationHours)).filter(Number.isFinite));
                components.push({
                    label: 'Сон',
                    score: clamp((average / goal) * 100, 0, 100),
                    detail: `Среднее ${durationText(average)} за ${recentSleep.length} дн. при цели ${durationText(goal)}.`
                });
            }
        }
        if (isEnabled('activity')) {
            const recentActivity = recordsInLastDays(profileRecords('activity'), 7);
            const goal = Number(profile?.lifestyle?.stepGoal);
            if (recentActivity.length >= 3 && goal > 0) {
                const average = mean(recentActivity.map(item => Number(item.steps)).filter(Number.isFinite));
                components.push({
                    label: 'Активность',
                    score: clamp((average / goal) * 100, 0, 100),
                    detail: `В среднем ${fmtNumber(average, 0)} шагов за ${recentActivity.length} дн. при цели ${fmtNumber(goal, 0)}.`
                });
            }
        }
        if (isEnabled('goals')) {
            const progressValues = getActiveGoals().map(goalProgress).filter(Number.isFinite);
            if (progressValues.length) {
                components.push({
                    label: 'Цели',
                    score: mean(progressValues),
                    detail: `Средний прогресс по ${progressValues.length} активным измеримым целям.`
                });
            }
        }
        const recentDates = new Set();
        [
            ['measurements', 'body'],
            ['sleep', 'sleep'],
            ['activity', 'activity'],
            ['training', 'training'],
            ['labs', 'labs']
        ].forEach(([collection, moduleKey]) => {
            if (!isEnabled(moduleKey))
                return;
            profileRecords(collection).forEach(item => {
                if (item.date && daysBetween(item.date) < 7)
                    recentDates.add(item.date);
            });
        });
        if (recentDates.size >= 2) {
            components.push({
                label: 'Регулярность данных',
                score: clamp((recentDates.size / 7) * 100, 0, 100),
                detail: `Записи есть за ${recentDates.size} из последних 7 календарных дней.`
            });
        }
        if (components.length < 3)
            return { score: null, components, method: 'insufficient' };
        return {
            score: Math.round(mean(components.map(component => component.score))),
            components,
            method: 'equal-average'
        };
    }
    function freshnessScore(date, freshDays, staleDays) {
        const age = daysBetween(date);
        if (!Number.isFinite(age) || age < 0)
            return 0;
        if (age <= freshDays)
            return 100;
        if (age <= staleDays)
            return 65;
        return 30;
    }
    function categoryRecordCoverage(records, targetCount, recentDays = null) {
        const source = recentDays ? recordsInLastDays(records, recentDays) : records;
        if (!source.length || !targetCount)
            return 0;
        return clamp((source.length / targetCount) * 100, 0, 100);
    }
    function medicationDataScore(kind, profile) {
        if (!isEnabled(kind))
            return null;
        const declaration = profile?.dataDeclarations?.[kind] || 'unknown';
        const records = profileRecords(kind);
        if (declaration === 'none')
            return { score: 100, detail: 'Отмечено «не принимаю» — состояние заполнено.' };
        if (records.length)
            return { score: 100, detail: `Добавлено записей: ${records.length}.` };
        if (declaration === 'has')
            return { score: 40, detail: 'Отмечено, что данные есть, но конкретные записи ещё не добавлены.' };
        return { score: 0, detail: 'Не указано, применим ли этот раздел.' };
    }
    function computeCompleteness(profile) {
        const priority = profile?.priority || 'Общее здоровье';
        const weights = COMPLETENESS_WEIGHTS[priority] || COMPLETENESS_WEIGHTS.default;
        const categories = [];
        const add = (key, name, score, detail, enabled = true) => {
            const weight = Number(weights[key]) || 0;
            if (!enabled || weight <= 0)
                return;
            categories.push({ key, name, score: clamp(score, 0, 100), weight, detail });
        };
        const filled = value => value !== null && value !== undefined && value !== '';
        const profileFields = [profile?.name, profile?.dob, profile?.sex, profile?.heightCm, profile?.priority];
        const profileFilled = profileFields.filter(filled).length;
        add('profile', 'Профиль', (profileFilled / profileFields.length) * 100, `${profileFilled} из ${profileFields.length} ключевых полей профиля заполнены.`);
        const bodyRecords = profileRecords('measurements');
        const bodyTargets = priority === 'Контроль давления'
            ? ['bloodPressure', 'restingHeartRate']
            : ['Снижение веса', 'Набор мышечной массы', 'Сохранение формы'].includes(priority)
                ? ['weight', 'waist']
                : ['Выносливость', 'Восстановление'].includes(priority)
                    ? ['restingHeartRate', 'weight']
                    : ['weight', 'restingHeartRate', 'bloodPressure'];
        const bodyFreshnessLimits = {
            weight: [14, 45], waist: [30, 90], restingHeartRate: [14, 45], bloodPressure: [7, 30]
        };
        const bodyPresent = bodyTargets.filter(type => bodyRecords.some(record => record.type === type));
        const bodyCoverage = (bodyPresent.length / bodyTargets.length) * 100;
        const freshnessValues = bodyPresent.map(type => {
            const record = latest(bodyRecords.filter(item => item.type === type));
            const [fresh, stale] = bodyFreshnessLimits[type] || [30, 90];
            return freshnessScore(record?.date, fresh, stale);
        });
        const bodyScore = bodyPresent.length
            ? bodyCoverage * 0.8 + mean(freshnessValues) * 0.2
            : 0;
        add('body', 'Тело', bodyScore, `${bodyPresent.length} из ${bodyTargets.length} приоритетных типов измерений; актуальность учитывается только как качество данных.`, isEnabled('body'));
        const labs = profileRecords('labs');
        const latestLabs = new Map();
        sortedDesc(labs).forEach(lab => {
            const key = labSeriesKey(lab);
            if (!latestLabs.has(key))
                latestLabs.set(key, lab);
        });
        const uniqueLabs = [...latestLabs.values()];
        const labsWithReference = uniqueLabs.filter(lab => lab.referenceMin !== '' || lab.referenceMax !== '').length;
        const repeatedSeries = new Set(labs.map(labSeriesKey)).size < labs.length;
        const labScore = uniqueLabs.length
            ? Math.min(100, uniqueLabs.length / 5 * 100) * 0.65
                + (labsWithReference / uniqueLabs.length) * 100 * 0.25
                + (repeatedSeries ? 100 : 50) * 0.10
            : 0;
        add('labs', 'Анализы', labScore, uniqueLabs.length
            ? `${uniqueLabs.length} показателей; референс указан для ${labsWithReference}; повторные измерения ${repeatedSeries ? 'есть' : 'пока отсутствуют'}.`
            : 'Лабораторные результаты ещё не добавлены.', isEnabled('labs'));
        const lifestyle = profile?.lifestyle || {};
        const lifestyleFields = ['trainingsPerWeek', 'averageSteps', 'averageSleepHours', 'stress', 'smoking', 'alcohol'];
        const lifestyleFilled = lifestyleFields.filter(key => filled(lifestyle[key])).length;
        add('lifestyle', 'Образ жизни', (lifestyleFilled / lifestyleFields.length) * 100, `${lifestyleFilled} из ${lifestyleFields.length} базовых параметров образа жизни заполнены.`);
        const sleepRecords = profileRecords('sleep');
        const recentSleep = recordsInLastDays(sleepRecords, 7);
        add('sleep', 'Сон', categoryRecordCoverage(sleepRecords, 5, 7), `${recentSleep.length} записей сна за последние 7 дней; для устойчивой картины достаточно 5+ дней.`, isEnabled('sleep'));
        const activityRecords = profileRecords('activity');
        const recentActivity = recordsInLastDays(activityRecords, 7);
        add('activity', 'Активность', categoryRecordCoverage(activityRecords, 5, 7), `${recentActivity.length} дней активности за последние 7 дней.`, isEnabled('activity'));
        const trainingRecords = profileRecords('training');
        const recentTraining = recordsInLastDays(trainingRecords, 28);
        const plannedPerWeek = Number(profile?.lifestyle?.trainingsPerWeek);
        const trainingTarget = Number.isFinite(plannedPerWeek) && plannedPerWeek > 0
            ? clamp(plannedPerWeek * 4, 4, 20)
            : 4;
        add('training', 'Тренировки', categoryRecordCoverage(trainingRecords, trainingTarget, 28), `${recentTraining.length} тренировок за последние 28 дней; ориентир из профиля — ${fmtNumber(trainingTarget, 0)}.`, isEnabled('training'));
        const nutritionRecords = profileRecords('nutrition');
        const recentNutrition = recordsInLastDays(nutritionRecords, 7);
        add('nutrition', 'Питание', categoryRecordCoverage(nutritionRecords, 5, 7), `${recentNutrition.length} дневных агрегатов за последние 7 дней.`, isEnabled('nutrition'));
        const medicationParts = [];
        const medicationDetails = [];
        for (const kind of ['medications', 'supplements']) {
            const part = medicationDataScore(kind, profile);
            if (!part)
                continue;
            medicationParts.push(part.score);
            medicationDetails.push(`${MODULE_LABELS[kind]}: ${part.detail}`);
        }
        add('medications', 'Препараты', medicationParts.length ? mean(medicationParts) : 100, medicationDetails.join(' '), medicationParts.length > 0);
        const goals = profileRecords('goals');
        const measurableGoals = goals.filter(goal => Number.isFinite(goalProgress(goal)));
        const goalsScore = measurableGoals.length ? 100 : (profile?.goals?.length ? 50 : 0);
        add('goals', 'Цели', goalsScore, measurableGoals.length
            ? `Создано измеримых целей: ${measurableGoals.length}.`
            : profile?.goals?.length
                ? 'Направления выбраны, но измеримая цель с текущим и целевым значением ещё не создана.'
                : 'Цели пока не указаны.', isEnabled('goals'));
        const denominator = categories.reduce((sum, category) => sum + category.weight, 0) || 1;
        const total = Math.round(categories.reduce((sum, category) => sum + category.score * category.weight, 0) / denominator);
        const sortedForRecommendations = [...categories].sort((a, b) => {
            const gapA = (100 - a.score) * a.weight;
            const gapB = (100 - b.score) * b.weight;
            return gapB - gapA;
        });
        const recommendationByKey = {
            body: 'Добавьте актуальные измерения тела, которые важны для вашего основного приоритета.',
            labs: 'Добавьте результаты анализов и введённые лабораторией референсы, если модуль для вас актуален.',
            lifestyle: 'Заполните недостающие базовые параметры образа жизни.',
            sleep: 'Запишите сон за несколько дней, чтобы система могла оценивать средние значения.',
            activity: 'Добавьте активность за несколько дней, чтобы видеть устойчивую динамику.',
            training: 'Добавьте недавние тренировки, если они важны для выбранного приоритета.',
            nutrition: 'Добавьте дневные агрегаты питания, если вы используете этот модуль.',
            medications: 'Добавьте препараты/добавки или явно отметьте, что вы их не принимаете.',
            goals: 'Создайте измеримую цель с текущим и целевым значением.',
            profile: 'Заполните ключевые поля профиля.'
        };
        const recommendations = sortedForRecommendations
            .filter(category => category.score < 80 && recommendationByKey[category.key])
            .slice(0, 4)
            .map(category => recommendationByKey[category.key]);
        return {
            total,
            categories: categories.map(category => ({
                key: category.key,
                name: category.name,
                score: Math.round(category.score),
                weight: category.weight,
                detail: category.detail
            })),
            recommendations
        };
    }
    function getTodayActions(profile) {
        const actions = [];
        const priority = profile?.priority || '';
        const weights = getWeightRecords();
        const lw = latest(weights);
        if (isEnabled('body') && ['Снижение веса', 'Набор мышечной массы', 'Сохранение формы'].includes(priority) && (!lw || daysBetween(lw.date) > 7))
            actions.push({ title: 'Записать актуальный вес', detail: lw ? `Последняя запись: ${fmtDate(lw.date)}` : 'Вес ещё не записан', action: 'weight' });
        if (isEnabled('sleep') && (profile?.goals?.includes('Сон') || ['Сон', 'Восстановление'].includes(priority))) {
            const ls = latest(profileRecords('sleep'));
            if (!ls || daysBetween(ls.date) > 1)
                actions.push({ title: 'Добавить последнюю ночь сна', detail: 'Это улучшит расчёт средней продолжительности и динамики.', action: 'sleep' });
        }
        if (isEnabled('activity') && Number(profile?.lifestyle?.stepGoal) > 0) {
            const today = profileRecords('activity').find(x => x.date === todayISO());
            if (!today)
                actions.push({ title: 'Добавить активность за сегодня', detail: `Цель по шагам: ${fmtNumber(profile.lifestyle.stepGoal, 0)}`, action: 'activity' });
            else if (Number(today.steps) < Number(profile.lifestyle.stepGoal))
                actions.push({ title: 'Проверить прогресс по шагам', detail: `Сейчас ${fmtNumber(today.steps, 0)} из ${fmtNumber(profile.lifestyle.stepGoal, 0)} шагов.`, route: 'lifestyle' });
        }
        if (isEnabled('body') && priority === 'Контроль давления') {
            const lbp = latest(getBpRecords());
            if (!lbp || daysBetween(lbp.date) > 3)
                actions.push({ title: 'Добавить измерение давления', detail: lbp ? `Последняя запись: ${fmtDate(lbp.date)}` : 'Измерений давления пока нет.', action: 'bp' });
        }
        if (isEnabled('labs') && priority === 'Контроль анализов') {
            const ll = latest(profileRecords('labs'));
            if (!ll || daysBetween(ll.date) > 180)
                actions.push({ title: 'Добавить последние анализы', detail: ll ? `Последний результат: ${fmtDate(ll.date)}` : 'Результаты анализов ещё не добавлены.', action: 'lab' });
        }
        if (isEnabled('goals')) {
            const nearingGoals = getActiveGoals().filter(goal => {
                if (!goal.deadline || goalProgress(goal) >= 100)
                    return false;
                const remain = daysBetween(todayISO(), goal.deadline);
                return Number.isFinite(remain) && remain >= 0 && remain <= 7;
            });
            if (nearingGoals.length === 1) {
                const goal = nearingGoals[0], remain = daysBetween(todayISO(), goal.deadline);
                actions.push({ title: `Проверить цель «${goal.name}»`, detail: remain === 0 ? 'Срок цели — сегодня.' : `До срока осталось ${remain} дн.`, route: 'goals' });
            }
            else if (nearingGoals.length > 1) {
                actions.push({ title: 'Проверить цели с близким сроком', detail: `В течение 7 дней наступает срок у ${nearingGoals.length} целей.`, route: 'goals' });
            }
        }
        const totalRecords = RECORD_COLLECTIONS.reduce((sum, key) => sum + profileRecords(key).length, 0);
        if (totalRecords >= 10 && (!state.data.settings.lastBackupAt || daysBetween(String(state.data.settings.lastBackupAt).slice(0, 10)) > 30))
            actions.push({ title: 'Создать свежую резервную копию', detail: 'У вас накоплены локальные данные; резервная копия снизит риск их потери при очистке браузера.', action: 'export' });
        return actions.slice(0, 5);
    }
    function getChanges() {
        const changes = [];
        const weights = getWeightRecords();
        if (weights.length >= 2) {
            const previous = weights[weights.length - 2];
            const current = weights[weights.length - 1];
            const delta = Number(current.value) - Number(previous.value);
            const previousDisplay = weightDisplay(previous.value);
            const currentDisplay = weightDisplay(current.value);
            const deltaDisplay = weightDisplay(Math.abs(delta));
            if ([previousDisplay.value, currentDisplay.value, deltaDisplay.value].every(Number.isFinite)) {
                changes.push({
                    title: 'Вес',
                    from: `${fmtNumber(previousDisplay.value, 1)} ${previousDisplay.unit}`,
                    to: `${fmtNumber(currentDisplay.value, 1)} ${currentDisplay.unit}`,
                    delta: `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${fmtNumber(deltaDisplay.value, 1)} ${deltaDisplay.unit}`,
                    period: `Последняя запись (${fmtDate(current.date)}) vs предыдущая (${fmtDate(previous.date)})`
                });
            }
        }
        const sleep = profileRecords('sleep');
        const recentSleep = recordsInLastDays(sleep, 7);
        const previousSleep = sleep.filter(item => {
            const age = daysBetween(item.date);
            return age >= 7 && age < 14;
        });
        if (recentSleep.length >= 3 && previousSleep.length >= 3) {
            const previousAverage = mean(previousSleep.map(item => item.durationHours));
            const currentAverage = mean(recentSleep.map(item => item.durationHours));
            const delta = currentAverage - previousAverage;
            changes.push({
                title: 'Средний сон',
                from: durationText(previousAverage),
                to: durationText(currentAverage),
                delta: `${delta >= 0 ? '+' : '−'}${Math.abs(Math.round(delta * 60))} мин`,
                period: 'Последние 7 дней vs предыдущие 7 дней'
            });
        }
        const activity = profileRecords('activity');
        const recentActivity = recordsInLastDays(activity, 7);
        const previousActivity = activity.filter(item => {
            const age = daysBetween(item.date);
            return age >= 7 && age < 14;
        });
        if (recentActivity.length >= 3 && previousActivity.length >= 3) {
            const previousAverage = mean(previousActivity.map(item => item.steps));
            const currentAverage = mean(recentActivity.map(item => item.steps));
            const percent = previousAverage ? ((currentAverage - previousAverage) / previousAverage) * 100 : null;
            if (Number.isFinite(percent)) {
                changes.push({
                    title: 'Средние шаги',
                    from: fmtNumber(previousAverage, 0),
                    to: fmtNumber(currentAverage, 0),
                    delta: `${percent >= 0 ? '+' : '−'}${fmtNumber(Math.abs(percent), 0)}%`,
                    period: 'Последние 7 дней vs предыдущие 7 дней'
                });
            }
        }
        const bloodPressure = getBpRecords();
        if (bloodPressure.length >= 2) {
            const previous = bloodPressure[bloodPressure.length - 2];
            const current = bloodPressure[bloodPressure.length - 1];
            const delta = Number(current.systolic) - Number(previous.systolic);
            changes.push({
                title: 'Давление',
                from: `${previous.systolic}/${previous.diastolic}`,
                to: `${current.systolic}/${current.diastolic}`,
                delta: `${delta >= 0 ? '+' : ''}${delta} сист.`,
                period: `Последняя запись (${fmtDate(current.date)}) vs предыдущая (${fmtDate(previous.date)})`
            });
        }
        return changes.slice(0, 5);
    }
    function getInsights(profile) {
        const insights = [];
        if (isEnabled('body')) {
            const lw = latest(getWeightRecords());
            if (lw && daysBetween(lw.date) > 14)
                insights.push({ title: 'Давно не обновлялся вес.', detail: `Последняя запись — ${fmtDate(lw.date)}. Добавьте новое измерение, если отслеживание веса для вас актуально.`, level: 'info' });
        }
        if (isEnabled('sleep')) {
            const target = Number(profile?.lifestyle?.sleepGoalHours);
            const recent = recordsInLastDays(profileRecords('sleep'), 7);
            if (Number.isFinite(target) && target > 0 && recent.length >= 3) {
                const avg = mean(recent.map(x => x.durationHours));
                if (avg < target)
                    insights.push({ title: 'Средняя длительность сна ниже вашей цели.', detail: `Среднее за 7 дней: ${durationText(avg)} при цели ${durationText(target)}.`, level: 'info' });
            }
        }
        if (isEnabled('labs')) {
            const out = profileRecords('labs').filter(l => ['low', 'high'].includes(labStatus(l).key));
            const latestByName = new Map();
            sortedDesc(out).forEach(l => { const key = l.name.trim().toLowerCase(); if (!latestByName.has(key))
                latestByName.set(key, l); });
            [...latestByName.values()].slice(0, 3).forEach(l => insights.push({ title: `${l.name}: вне указанного референсного диапазона.`, detail: `${fmtNumber(l.value, 3)} ${l.unit || ''}. Эти данные сами по себе не устанавливают диагноз; стоит обсудить интерпретацию с врачом.`, level: 'warn' }));
        }
        if (isEnabled('goals')) {
            getActiveGoals().forEach(g => {
                if (!g.deadline)
                    return;
                if (!parseLocalDate(g.deadline))
                    return;
                const remain = daysBetween(todayISO(), g.deadline);
                if (remain === null)
                    return;
                if (remain >= 0 && remain <= 7 && goalProgress(g) < 100)
                    insights.push({ title: 'До срока цели осталось 7 дней или меньше.', detail: `${g.name}: ${remain === 0 ? 'срок сегодня' : `осталось ${remain} дн.`}`, level: 'info' });
            });
        }
        return insights.slice(0, 6);
    }
    function getSnapshotData(profile, key) {
        if (key === 'weight') {
            const records = getWeightRecords(), current = records[records.length - 1], prev = records[records.length - 2];
            if (!current)
                return { key, label: 'Вес', value: '—', meta: 'Добавьте первое измерение', trend: [] };
            const d = weightDisplay(current.value);
            const delta = prev ? Number(current.value) - Number(prev.value) : null;
            const dd = delta !== null ? weightDisplay(Math.abs(delta)) : null;
            return { key, label: 'Вес', value: `${fmtNumber(d.value, 1)} ${d.unit}`, meta: delta === null ? 'Первая запись' : `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${fmtNumber(dd.value, 1)} ${dd.unit} к предыдущей`, trend: records.slice(-12).map(x => Number(x.value)) };
        }
        if (key === 'sleep') {
            const records = profileRecords('sleep'), last = latest(records), recent = recordsInLastDays(records, 7);
            const avg = mean(recent.map(x => x.durationHours));
            return { key, label: 'Сон', value: avg !== null ? durationText(avg) : '—', meta: last ? `Последняя ночь: ${durationText(last.durationHours)}` : 'Добавьте запись сна', trend: sortedAsc(records).slice(-12).map(x => Number(x.durationHours)) };
        }
        if (key === 'activity') {
            const records = profileRecords('activity'), today = records.find(x => x.date === todayISO()), recent = recordsInLastDays(records, 7);
            const avg = mean(recent.map(x => x.steps));
            return { key, label: 'Активность', value: today ? `${fmtNumber(today.steps, 0)} шагов` : (avg !== null ? `${fmtNumber(avg, 0)} ср.` : '—'), meta: today ? 'Сегодня' : 'Среднее за 7 дней', trend: sortedAsc(records).slice(-12).map(x => Number(x.steps)) };
        }
        if (key === 'bp') {
            const records = getBpRecords(), last = records[records.length - 1];
            return { key, label: 'Давление', value: last ? `${last.systolic}/${last.diastolic}` : '—', meta: last ? `${fmtDate(last.date)} · пульс ${last.pulse || '—'}` : 'Добавьте измерение', trend: records.slice(-12).map(x => Number(x.systolic)) };
        }
        if (key === 'pulse') {
            const records = getPulseRecords(), last = records[records.length - 1];
            return { key, label: 'Пульс', value: last ? `${fmtNumber(last.pulse, 0)} уд/мин` : '—', meta: last ? fmtDate(last.date) : 'Добавьте пульс', trend: records.slice(-12).map(x => Number(x.pulse)) };
        }
        if (key === 'labs') {
            const records = profileRecords('labs'), last = latest(records), out = records.filter(x => ['low', 'high'].includes(labStatus(x).key));
            return { key, label: 'Анализы', value: records.length ? `${records.length} записей` : '—', meta: last ? `${out.length} вне введённых референсов · ${fmtDate(last.date)}` : 'Добавьте результаты', trend: [] };
        }
        if (key === 'goals') {
            const goals = getActiveGoals(), progress = goals.map(goalProgress).filter(Number.isFinite);
            return { key, label: 'Цели', value: goals.length ? `${goals.length} активн.` : '—', meta: progress.length ? `Средний прогресс ${fmtNumber(mean(progress), 0)}%` : 'Создайте измеримую цель', trend: progress };
        }
        if (key === 'training') {
            const records = profileRecords('training'), recent = recordsInLastDays(records, 7);
            const mins = recent.reduce((s, x) => s + (Number(x.durationMinutes) || 0), 0);
            return { key, label: 'Тренировки', value: recent.length ? `${recent.length} за 7 дн.` : '—', meta: recent.length ? `${fmtNumber(mins, 0)} минут всего` : 'Добавьте тренировку', trend: sortedAsc(records).slice(-12).map(x => Number(x.durationMinutes) || 0) };
        }
        if (key === 'medications') {
            const medications = isEnabled('medications') ? profileRecords('medications').filter(x => x.status === 'active') : [];
            const supplements = isEnabled('supplements') ? profileRecords('supplements').filter(x => x.status === 'active') : [];
            const total = medications.length + supplements.length;
            const parts = [];
            if (isEnabled('medications'))
                parts.push(`лекарства ${medications.length}`);
            if (isEnabled('supplements'))
                parts.push(`добавки ${supplements.length}`);
            const declaration = profile?.dataDeclarations || {};
            const hasExplicitNone = (isEnabled('medications') ? declaration.medications === 'none' : true)
                && (isEnabled('supplements') ? declaration.supplements === 'none' : true);
            return {
                key,
                label: 'Препараты',
                value: total ? `${total} активн.` : (hasExplicitNone ? 'Не принимаю' : '—'),
                meta: total ? parts.join(' · ') : (hasExplicitNone ? 'Статус подтверждён' : 'Добавьте препараты или укажите статус'),
                trend: []
            };
        }
        return { key, label: key, value: '—', meta: '', trend: [] };
    }
    // ===== NAVIGATION & PAGE RENDERERS =====
    function renderApp() {
        if (!state.data.profiles.length && !state.demoMode) {
            dom.app.hidden = true;
            dom.onboarding.hidden = true;
            dom.welcome.hidden = false;
            applyTheme(state.data.settings.theme);
            return;
        }
        dom.welcome.hidden = true;
        dom.onboarding.hidden = true;
        dom.app.hidden = false;
        applyTheme(state.data.settings.theme);
        renderProfileSwitcher();
        renderNavigation();
        renderCurrentRoute();
        dom.demoBadge.hidden = !state.demoMode;
    }
    function renderProfileSwitcher() {
        clear(dom.profileSwitcher);
        state.data.profiles.forEach(profile => {
            const option = makeEl('option', { text: profile.name, attrs: { value: profile.id } });
            if (profile.id === state.data.activeProfileId)
                option.selected = true;
            dom.profileSwitcher.append(option);
        });
        dom.profileSwitcher.disabled = state.demoMode;
        dom.addProfileBtn.disabled = state.demoMode;
        dom.addProfileBtn.title = state.demoMode ? 'Выйдите из демо, чтобы добавить профиль' : 'Добавить профиль';
    }
    function navigationItems() {
        return [
            ['overview', 'Обзор'], ['profile', 'Профиль'], ['body', 'Тело'], ['labs', 'Анализы'],
            ['lifestyle', 'Образ жизни'], ['medications', 'Препараты'], ['goals', 'Цели'], ['history', 'История'], ['settings', 'Настройки']
        ].filter(([route]) => {
            if (route === 'body')
                return isEnabled('body');
            if (route === 'labs')
                return isEnabled('labs');
            if (route === 'medications')
                return isEnabled('medications') || isEnabled('supplements');
            if (route === 'goals')
                return isEnabled('goals');
            return true;
        });
    }
    function renderNavigation() {
        clear(dom.desktopNav);
        navigationItems().forEach(([route, label]) => {
            const isActive = state.route === route;
            const btn = makeEl('button', {
                className: `nav-link${isActive ? ' active' : ''}`,
                attrs: {
                    type: 'button',
                    'data-route': route,
                    'aria-current': isActive ? 'page' : null
                }
            });
            btn.append(icon(route), makeEl('span', { text: label }));
            btn.addEventListener('click', () => navigate(route));
            dom.desktopNav.append(btn);
        });
        clear(dom.mobileNav);
        const mobile = [
            ['overview', 'Обзор'],
            ['lifestyle', 'Здоровье'],
            ['add', ''],
            ['history', 'История'],
            ['settings', 'Ещё']
        ];
        mobile.forEach(([route, label]) => {
            if (route === 'add') {
                dom.mobileNav.append(makeEl('div', { className: 'mobile-nav-spacer' }));
                return;
            }
            const active = state.route === route
                || (route === 'lifestyle' && ['profile', 'body', 'labs', 'lifestyle', 'medications', 'goals'].includes(state.route));
            const btn = makeEl('button', {
                className: `mobile-nav-btn${active ? ' active' : ''}`,
                attrs: {
                    type: 'button',
                    'data-route': route,
                    'aria-current': active ? 'page' : null
                }
            });
            btn.append(icon(route === 'lifestyle' ? 'body' : route), makeEl('span', { text: label }));
            btn.addEventListener('click', () => navigate(route));
            dom.mobileNav.append(btn);
        });
    }
    function navigate(route) {
        if (!ROUTES[route])
            route = 'overview';
        state.route = route;
        if (location.hash !== `#${route}`)
            history.replaceState(null, '', `#${route}`);
        renderNavigation();
        renderCurrentRoute();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        requestAnimationFrame(() => dom.mainContent?.focus({ preventScroll: true }));
    }
    function renderCurrentRoute() {
        const profile = getProfile();
        if (!profile) {
            renderApp();
            return;
        }
        dom.breadcrumb.textContent = ROUTES[state.route] || 'Обзор';
        clear(dom.mainContent);
        state.pendingCharts = [];
        const renderers = {
            overview: renderDashboard, profile: renderProfilePage, body: renderBodyPage, labs: renderLabsPage,
            lifestyle: renderLifestylePage, medications: renderMedicationsPage, goals: renderGoalsPage,
            history: renderHistoryPage, settings: renderSettingsPage
        };
        (renderers[state.route] || renderDashboard)(dom.mainContent, profile);
        requestAnimationFrame(() => { state.pendingCharts.forEach(fn => { try {
            fn();
        }
        catch (_) {
            // Charts are supplementary; a render failure must not break the current route.
        } }); state.pendingCharts = []; });
    }
    function pageHead(title, subtitle, eyebrowText = 'MARKOV HEALTH OS', actions = []) {
        const head = makeEl('div', { className: 'page-head' });
        const wrap = makeEl('div', { className: 'page-title-wrap' });
        wrap.append(makeEl('p', { className: 'eyebrow', text: eyebrowText }), makeEl('h1', { text: title }), makeEl('p', { text: subtitle }));
        head.append(wrap);
        if (actions.length) {
            const act = makeEl('div', { className: 'page-actions' });
            actions.forEach(a => act.append(a));
            head.append(act);
        }
        return head;
    }
    function sectionHead(title, subtitle = '', actions = []) {
        const head = makeEl('div', { className: 'section-head' });
        const copy = makeEl('div');
        copy.append(makeEl('h2', { className: 'section-title', text: title }));
        if (subtitle)
            copy.append(makeEl('p', { className: 'section-subtitle', text: subtitle }));
        head.append(copy);
        if (actions.length) {
            const right = makeEl('div', { className: 'section-head-actions' });
            actions.forEach(a => right.append(a));
            head.append(right);
        }
        return head;
    }
    function actionButton(label, fn, variant = 'secondary', small = false) {
        const btn = makeEl('button', { className: `btn ${variant}${small ? ' small' : ''}`, text: label, attrs: { type: 'button' } });
        btn.addEventListener('click', fn);
        return btn;
    }
    function renderDashboard(root, profile) {
        const briefBtn = actionButton('Подготовить Health Brief', openHealthBrief, 'secondary');
        const addBtn = actionButton('+ Добавить данные', openQuickAdd, 'primary');
        root.append(pageHead(`${getGreeting()}, ${firstName(profile.name)}`, 'Вот что важно для вас сегодня.', 'Персональная система управления здоровьем', [briefBtn, addBtn]));
        const hero = makeEl('div', { className: 'card hero-strip' });
        const heroCopy = makeEl('div');
        heroCopy.append(makeEl('p', { className: 'eyebrow', text: 'ОСНОВНОЙ ПРИОРИТЕТ' }), makeEl('h2', { text: profile.priority || 'Общее здоровье' }), makeEl('p', { text: 'Главный экран автоматически меняет порядок показателей и действий в зависимости от выбранного приоритета и доступных данных.' }));
        const completeness = computeCompleteness(profile);
        const heroStat = makeEl('div', { className: 'hero-stat' });
        heroStat.append(makeEl('strong', { text: `${completeness.total}%` }), makeEl('span', { text: 'качество данных Health OS' }));
        hero.append(heroCopy, heroStat);
        root.append(hero);
        const grid = makeEl('div', { className: 'dashboard-grid section' });
        const order = dashboardSectionOrder(profile);
        order.forEach(module => {
            if (module === 'snapshot')
                grid.append(renderSnapshotModule(profile));
            if (module === 'today')
                grid.append(renderTodayModule(profile));
            if (module === 'changes')
                grid.append(renderChangesModule());
            if (module === 'score')
                grid.append(renderScoreModule(profile));
            if (module === 'completeness')
                grid.append(renderCompletenessModule(profile));
            if (module === 'insights')
                grid.append(renderInsightsModule(profile));
        });
        root.append(grid);
    }
    function renderSnapshotModule(profile) {
        const card = makeEl('section', { className: 'col-12' });
        card.append(sectionHead('Ключевые показатели', 'Актуальные данные в порядке, который соответствует вашему основному приоритету.'));
        const grid = makeEl('div', { className: 'snapshot-grid' });
        relevantSnapshotKeys(profile).forEach(key => grid.append(snapshotCard(getSnapshotData(profile, key))));
        card.append(grid);
        return card;
    }
    function snapshotCard(data) {
        const card = makeEl('div', { className: 'card snapshot-card' });
        const top = makeEl('div', { className: 'snapshot-top' });
        const iconName = data.key === 'bp' ? 'bp' : data.key === 'labs' ? 'lab' : data.key === 'goals' ? 'goalsMini' : data.key;
        const metricIcon = makeEl('span', { className: 'metric-icon', html: ICONS[iconName] || ICONS.overview });
        top.append(makeEl('span', { className: 'snapshot-label', text: data.label }), metricIcon);
        card.append(top, makeEl('div', { className: 'snapshot-value', text: data.value }), makeEl('div', { className: 'snapshot-meta', text: data.meta || '' }));
        if (data.trend?.length >= 2) {
            const canvas = makeEl('canvas', { className: 'trend-canvas', attrs: { height: '34', role: 'img', 'aria-label': `Мини-график «${data.label}»: ${data.trend.length} значений` } });
            card.append(canvas);
            state.pendingCharts.push(() => drawSparkline(canvas, data.trend));
        }
        return card;
    }
    function renderTodayModule(profile) {
        const wrap = makeEl('section', { className: 'card card-pad-lg col-6' });
        wrap.append(sectionHead('Сегодня', 'Только действия, которые действительно следуют из ваших данных.'));
        const actions = getTodayActions(profile);
        const list = makeEl('div', { className: 'action-list' });
        if (!actions.length) {
            list.append(makeEl('div', { className: 'empty-state' }, [
                makeEl('h3', { text: 'На сегодня обязательных действий нет.' }),
                makeEl('p', { text: 'Система не создаёт задачи ради заполнения пространства. Добавляйте данные тогда, когда они полезны вашим целям.' })
            ]));
        }
        actions.forEach((action, index) => {
            const item = makeEl('div', { className: 'action-item' });
            item.append(makeEl('div', { className: 'action-index', text: String(index + 1) }));
            const copy = makeEl('div', { className: 'action-copy' });
            copy.append(makeEl('strong', { text: action.title }), makeEl('p', { text: action.detail }));
            item.append(copy);
            if (action.action || action.route) {
                item.append(actionButton('Открыть', () => action.route ? navigate(action.route) : runAction(action.action), 'secondary', true));
            }
            list.append(item);
        });
        wrap.append(list);
        return wrap;
    }
    function renderChangesModule() {
        const wrap = makeEl('section', { className: 'card card-pad-lg col-6' });
        wrap.append(sectionHead('Что изменилось', 'Сравнения рассчитываются только из ваших повторных записей.'));
        const changes = getChanges();
        const list = makeEl('div', { className: 'change-list' });
        if (!changes.length) {
            const empty = makeEl('div', { className: 'empty-state' });
            empty.append(makeEl('div', { className: 'empty-icon', text: '↗' }), makeEl('h3', { text: 'Пока недостаточно данных для сравнения' }), makeEl('p', { text: 'Добавьте повторные измерения или несколько дней сна и активности — изменения появятся автоматически.' }));
            list.append(empty);
        }
        changes.forEach(change => {
            const item = makeEl('div', { className: 'change-item' });
            const left = makeEl('div');
            left.append(makeEl('div', { className: 'change-title', text: change.title }), makeEl('div', { className: 'change-values', text: `${change.from} → ${change.to}` }), makeEl('div', { className: 'change-period', text: change.period || '' }));
            item.append(left, makeEl('div', { className: 'change-delta', text: change.delta }));
            list.append(item);
        });
        wrap.append(list);
        return wrap;
    }
    function renderScoreModule(profile) {
        const wrap = makeEl('section', { className: 'card card-pad-lg col-6' });
        wrap.append(sectionHead('Health Score', 'Ориентировочный индекс выполнения привычек и целей.'));
        const result = computeHealthScore(profile);
        if (result.score === null) {
            const empty = makeEl('div', { className: 'empty-state' });
            empty.append(makeEl('div', { className: 'empty-icon', text: '—' }), makeEl('h3', { text: 'Добавьте больше данных для расчёта Health Score.' }), makeEl('p', { text: 'Для расчёта нужны минимум три доступных компонента: сон относительно вашей цели, активность, прогресс целей и регулярность записей.' }));
            wrap.append(empty);
            return wrap;
        }
        const layout = makeEl('div', { className: 'score-card' });
        const ring = makeEl('div', {
            className: 'score-ring',
            attrs: {
                style: `--score:${result.score}`,
                role: 'img',
                'aria-label': `Health Score ${result.score} из 100`
            }
        });
        const ringContent = makeEl('div', { className: 'score-ring-content' });
        ringContent.append(makeEl('strong', { text: String(result.score) }), makeEl('span', { text: 'из 100' }));
        ring.append(ringContent);
        const copy = makeEl('div', { className: 'score-copy' });
        copy.append(makeEl('h3', { text: 'Ваш индекс выполнения' }), makeEl('p', { text: 'Health Score — ориентировочный индекс на основе внесённых данных и пользовательских целей. Он не является медицинской оценкой или диагнозом.' }));
        const chips = makeEl('div', { className: 'score-components' });
        result.components.forEach(component => chips.append(makeEl('span', {
            className: 'chip',
            text: `${component.label}: ${Math.round(component.score)}%`
        })));
        copy.append(chips);
        const details = makeEl('details', { className: 'score-explainer' });
        details.append(makeEl('summary', { text: 'Как рассчитывается Health Score' }));
        const list = makeEl('div', { className: 'score-explainer-list' });
        result.components.forEach(component => {
            const row = makeEl('div', { className: 'score-explainer-row' });
            row.append(makeEl('strong', { text: `${component.label} · ${Math.round(component.score)}%` }), makeEl('p', { text: component.detail || '' }));
            list.append(row);
        });
        details.append(makeEl('p', { className: 'data-quality-note', text: 'Итог — простое среднее доступных компонентов. Отключённые и недоступные компоненты не штрафуют индекс.' }), list);
        copy.append(details);
        layout.append(ring, copy);
        wrap.append(layout);
        return wrap;
    }
    function renderCompletenessModule(profile) {
        const wrap = makeEl('section', { className: 'card card-pad-lg col-6' });
        const data = computeCompleteness(profile);
        wrap.append(sectionHead(`Ваша Health OS заполнена на ${data.total}%`, 'Оценка отражает полноту данных относительно ваших целей и включённых модулей.'));
        const layout = makeEl('div', { className: 'completeness-layout' });
        const number = makeEl('div', { className: 'completeness-number' });
        number.append(makeEl('strong', { text: `${data.total}%` }), makeEl('span', { text: 'качество данных' }));
        const right = makeEl('div');
        const list = makeEl('div', { className: 'completeness-list' });
        data.categories.forEach(category => {
            const row = makeEl('div', { className: 'completeness-row' });
            row.append(makeEl('span', { text: category.name }));
            const progress = makeEl('div', {
                className: 'progress',
                attrs: {
                    role: 'progressbar',
                    'aria-label': `${category.name}: ${category.score}%`,
                    'aria-valuemin': '0',
                    'aria-valuemax': '100',
                    'aria-valuenow': String(category.score)
                }
            });
            progress.append(makeEl('span', { attrs: { style: `width:${category.score}%` } }));
            row.append(progress, makeEl('span', { text: `${category.score}%` }));
            list.append(row);
        });
        right.append(list);
        const details = makeEl('details', { className: 'quality-explainer' });
        details.append(makeEl('summary', { text: 'Почему такой процент?' }));
        const detailsList = makeEl('div', { className: 'quality-explainer-list' });
        data.categories.forEach(category => {
            const row = makeEl('div', { className: 'quality-explainer-row' });
            row.append(makeEl('strong', { text: `${category.name} · ${category.score}%` }), makeEl('span', { className: 'quality-weight', text: `вес ${category.weight}` }), makeEl('p', { text: category.detail || '' }));
            detailsList.append(row);
        });
        details.append(makeEl('p', { className: 'data-quality-note', text: 'Вес категорий меняется в зависимости от главного приоритета. Отключённые модули исключаются из расчёта.' }), detailsList);
        right.append(details);
        if (data.recommendations.length) {
            const recommendations = makeEl('ul', { className: 'recommendations' });
            data.recommendations.forEach(item => recommendations.append(makeEl('li', { text: item })));
            right.append(recommendations);
        }
        layout.append(number, right);
        wrap.append(layout);
        return wrap;
    }
    function renderInsightsModule(profile) {
        const wrap = makeEl('section', { className: 'card card-pad-lg col-12' });
        wrap.append(sectionHead('Что требует внимания', 'Детерминированные правила — без AI, диагнозов и скрытых медицинских выводов.'));
        const insights = getInsights(profile);
        const list = makeEl('div', { className: 'insight-list' });
        if (!insights.length) {
            const empty = makeEl('div', { className: 'empty-state' });
            empty.append(makeEl('h3', { text: 'Нет достаточно надёжных сигналов' }), makeEl('p', { text: 'Сигналы появляются только тогда, когда для конкретного правила достаточно пользовательских данных.' }));
            list.append(empty);
        }
        insights.forEach(insight => {
            const item = makeEl('div', { className: 'insight-item' });
            item.append(makeEl('strong', { text: insight.title }), makeEl('p', { text: insight.detail }));
            list.append(item);
        });
        wrap.append(list);
        return wrap;
    }
    function renderProfilePage(root, profile) {
        const edit = actionButton('Редактировать профиль', () => startOnboarding('edit'), 'secondary');
        const add = actionButton('+ Новый профиль', () => state.demoMode ? showToast('Выйдите из демо, чтобы создать профиль.') : startOnboarding('add'), 'primary');
        root.append(pageHead('Профиль', 'Личные параметры и контекст, которые используются для персонализации.', 'Профиль', [edit, add]));
        const layout = makeEl('div', { className: 'profile-layout' });
        const card = makeEl('section', { className: 'card profile-card' });
        const hero = makeEl('div', { className: 'profile-hero' });
        const initials = firstName(profile.name).slice(0, 1).toUpperCase();
        const avatar = makeEl('div', { className: 'avatar', text: initials });
        const copy = makeEl('div');
        copy.append(makeEl('h2', { text: profile.name }), makeEl('p', { text: `${ageFromDob(profile.dob) ?? '—'} лет · ${profile.priority || 'Приоритет не выбран'}` }));
        hero.append(avatar, copy);
        card.append(hero);
        const info = makeEl('div', { className: 'info-list' });
        const sexLabel = { male: 'Мужской', female: 'Женский', intersex: 'Интерсекс / другой вариант', unknown: 'Не указан' }[profile.sex] || '—';
        [['Дата рождения', fmtDate(profile.dob, { long: true })], ['Биологический пол', sexLabel], ['Рост', `${fmtNumber(lengthDisplay(profile.heightCm).value, 1)} ${lengthDisplay(profile.heightCm).unit}`], ['Основной приоритет', profile.priority || '—']].forEach(([l, v]) => { const i = makeEl('div', { className: 'info-item' }); i.append(makeEl('div', { className: 'label', text: l }), makeEl('div', { className: 'value', text: v })); info.append(i); });
        card.append(info);
        if (profile.goals?.length) {
            card.append(makeEl('h3', { text: 'Главные цели' }));
            const tags = makeEl('div', { className: 'tag-list' });
            profile.goals.forEach(g => tags.append(makeEl('span', { className: 'chip', text: g })));
            card.append(tags);
        }
        layout.append(card);
        const context = makeEl('section', { className: 'card profile-card' });
        context.append(sectionHead('Медицинский контекст', 'Содержимое хранится только локально.'));
        const contextBlock = (title, items) => { const w = makeEl('div', { className: 'section' }); w.append(makeEl('h3', { text: title })); if (items?.length) {
            const list = makeEl('div', { className: 'repeat-list' });
            items.forEach(x => { const r = makeEl('div', { className: 'repeat-item' }); r.append(makeEl('span', { text: x })); list.append(r); });
            w.append(list);
        }
        else
            w.append(makeEl('p', { className: 'section-subtitle', text: 'Не указано.' })); return w; };
        context.append(contextBlock('Заболевания / состояния', profile.conditions), contextBlock('Аллергии', profile.allergies));
        layout.append(context);
        root.append(layout);
        const profiles = makeEl('section', { className: 'section' });
        profiles.append(sectionHead('Локальные профили', 'Каждая запись связана с profileId; данные профилей не смешиваются.'));
        const list = makeEl('div', { className: 'goal-list' });
        state.data.profiles.forEach(p => { const c = makeEl('div', { className: 'card goal-card' }); const top = makeEl('div', { className: 'goal-top' }); const text = makeEl('div'); text.append(makeEl('h3', { text: p.name }), makeEl('p', { className: 'goal-meta', text: `${p.id === state.data.activeProfileId ? 'Активный профиль · ' : ''}${p.priority || 'Без приоритета'}` })); const acts = makeEl('div', { className: 'section-head-actions' }); if (p.id !== state.data.activeProfileId)
            acts.append(actionButton('Открыть', () => setActiveProfile(p.id), 'secondary', true)); if (!state.demoMode)
            acts.append(actionButton('Удалить', () => deleteProfile(p.id), 'danger-soft', true)); top.append(text, acts); c.append(top); list.append(c); });
        profiles.append(list);
        root.append(profiles);
    }
    function metricPanel(label, value, meta = '') {
        const panel = makeEl('div', { className: 'card metric-panel' });
        panel.append(makeEl('div', { className: 'label', text: label }), makeEl('div', { className: 'value', text: value }), makeEl('div', { className: 'meta', text: meta }));
        return panel;
    }
    function renderBodyPage(root, profile) {
        const weightBtn = actionButton('+ Вес', () => openRecordForm('weight'), 'primary');
        const moreBtn = actionButton('Другие измерения', openBodyQuickMenu, 'secondary');
        root.append(pageHead('Тело', 'Вес, композиция тела, пульс, давление и базовые физиологические измерения.', 'Тело', [moreBtn, weightBtn]));
        const measurements = profileRecords('measurements');
        const latestType = type => latest(measurements.filter(x => x.type === type));
        const w = latestType('weight'), bf = latestType('bodyFat'), waist = latestType('waist'), rhr = latestType('restingHeartRate'), spo2 = latestType('spo2'), temp = latestType('temperature'), bp = latestType('bloodPressure');
        const dg = makeEl('div', { className: 'data-grid' });
        const wd = w ? weightDisplay(w.value) : null;
        const waistD = waist ? lengthDisplay(waist.value) : null;
        const tempD = temp ? tempDisplay(temp.value) : null;
        dg.append(metricPanel('Вес', w ? `${fmtNumber(wd.value, 1)} ${wd.unit}` : '—', w ? fmtDate(w.date) : 'Добавьте измерение'), metricPanel('Процент жира', bf ? `${fmtNumber(bf.value, 1)}%` : '—', bf ? fmtDate(bf.date) : 'Добавьте измерение'), metricPanel('Талия', waist ? `${fmtNumber(waistD.value, 1)} ${waistD.unit}` : '—', waist ? fmtDate(waist.date) : 'Добавьте измерение'), metricPanel('Пульс в покое', rhr ? `${fmtNumber(rhr.value, 0)} уд/мин` : '—', rhr ? fmtDate(rhr.date) : 'Добавьте измерение'), metricPanel('Давление', bp ? `${bp.systolic}/${bp.diastolic}` : '—', bp ? `${fmtDate(bp.date)} · ${bp.pulse || '—'} уд/мин` : 'Добавьте измерение'), metricPanel('SpO₂', spo2 ? `${fmtNumber(spo2.value, 0)}%` : '—', spo2 ? fmtDate(spo2.date) : 'Добавьте измерение'), metricPanel('Температура', temp ? `${fmtNumber(tempD.value, 1)} ${tempD.unit}` : '—', temp ? fmtDate(temp.date) : 'Добавьте измерение'));
        root.append(dg);
        root.append(renderWeightSection(profile), renderBpSection(profile), renderOtherBodyTable());
    }
    function renderWeightSection(profile) {
        const section = makeEl('section', { className: 'section' });
        const periods = makeEl('div', { className: 'segmented' });
        [7, 30, 90].forEach((d, i) => { const b = makeEl('button', { text: `${d} дней`, className: i === 1 ? 'active' : '', attrs: { type: 'button', 'data-period': String(d) } }); periods.append(b); });
        section.append(sectionHead('Вес', 'Текущее значение, предыдущая запись, динамика и прогресс цели.', [periods]));
        const weights = getWeightRecords();
        if (!weights.length) {
            section.append(emptyState('W', 'Вы ещё не добавляли вес.', 'Добавьте первое измерение, чтобы увидеть динамику и прогресс.', 'Добавить вес', () => openRecordForm('weight')));
            return section;
        }
        const latestW = weights[weights.length - 1], prev = weights[weights.length - 2];
        const disp = weightDisplay(latestW.value), prevDisp = prev ? weightDisplay(prev.value) : null;
        const stats = makeEl('div', { className: 'data-grid' });
        stats.append(metricPanel('Текущий вес', `${fmtNumber(disp.value, 1)} ${disp.unit}`, fmtDate(latestW.date)), metricPanel('Предыдущий', prev ? `${fmtNumber(prevDisp.value, 1)} ${prevDisp.unit}` : '—', prev ? fmtDate(prev.date) : 'Нет второй записи'));
        if (prev) {
            const delta = Number(latestW.value) - Number(prev.value), dd = weightDisplay(Math.abs(delta));
            stats.append(metricPanel('К предыдущей записи', `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${fmtNumber(dd.value, 1)} ${dd.unit}`, fmtDate(prev.date)));
        }
        [7, 30, 90].forEach(days => {
            const change = weightChangeForPeriod(weights, days);
            if (!change) {
                stats.append(metricPanel(`Изменение за ${days} дней`, '—', 'Недостаточно более ранних данных'));
                return;
            }
            const dd = weightDisplay(Math.abs(change.deltaKg));
            stats.append(metricPanel(`Изменение за ${days} дней`, `${change.deltaKg > 0 ? '+' : change.deltaKg < 0 ? '−' : ''}${fmtNumber(dd.value, 1)} ${dd.unit}`, `От записи ${fmtDate(change.baseline.date)}`));
        });
        const targetGoal = profileRecords('goals').find(g => /вес/i.test(g.name) || g.category === 'Снижение веса' || g.category === 'Набор мышечной массы');
        if (targetGoal && Number.isFinite(goalProgress(targetGoal))) {
            stats.append(metricPanel('Прогресс цели', `${fmtNumber(goalProgress(targetGoal), 0)}%`, `${fmtNumber(targetGoal.currentValue, 1)} → ${fmtNumber(targetGoal.targetValue, 1)} ${targetGoal.unit || ''}`));
        }
        section.append(stats);
        const chart = makeEl('div', { className: 'card chart-card section' });
        chart.append(sectionHead('График веса', 'Период можно переключать без изменения данных.'));
        const wrap = makeEl('div', { className: 'chart-wrap' });
        const canvas = makeEl('canvas', { attrs: { role: 'img', 'aria-label': `График веса: ${weights.length} записей` } });
        wrap.append(canvas);
        chart.append(wrap);
        section.append(chart);
        const drawFor = period => { const subset = weights.filter(x => daysBetween(x.date) < period); drawLineChart(canvas, subset.map(x => ({ label: x.date, value: Number(x.value) })), { unit: 'кг' }); };
        state.pendingCharts.push(() => drawFor(30));
        periods.addEventListener('click', e => { const b = e.target.closest('button'); if (!b)
            return; periods.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b)); drawFor(Number(b.dataset.period)); });
        return section;
    }
    function renderBpSection() {
        const section = makeEl('section', { className: 'section' });
        section.append(sectionHead('Давление', 'История измерений без диагностической интерпретации.', [actionButton('+ Давление', () => openRecordForm('bp'), 'secondary')]));
        const records = sortedDesc(getBpRecords());
        if (!records.length) {
            section.append(emptyState('BP', 'Вы ещё не добавляли давление.', 'Добавьте измерение, чтобы видеть историю и динамику.', 'Добавить давление', () => openRecordForm('bp')));
            return section;
        }
        const chart = makeEl('div', { className: 'card chart-card' });
        const wrap = makeEl('div', { className: 'chart-wrap' });
        const canvas = makeEl('canvas', { attrs: { role: 'img', 'aria-label': `График систолического и диастолического давления: ${records.length} записей` } });
        wrap.append(canvas);
        chart.append(wrap);
        section.append(chart);
        state.pendingCharts.push(() => drawMultiLineChart(canvas, sortedAsc(records).slice(-30), [{ key: 'systolic', label: 'Систолическое' }, { key: 'diastolic', label: 'Диастолическое' }]));
        const table = makeEl('div', { className: 'table-wrap section' });
        const t = makeEl('table', { className: 'data-table' });
        setStaticHTML(t, '<thead><tr><th>Дата</th><th>Давление</th><th>Пульс</th><th>Заметка</th><th></th></tr></thead>');
        const tb = makeEl('tbody');
        records.slice(0, 50).forEach(r => { const tr = makeEl('tr'); [`${fmtDate(r.date)} ${r.time || ''}`, `${r.systolic}/${r.diastolic}`, r.pulse ? `${r.pulse} уд/мин` : '—', r.note || '—'].forEach(v => tr.append(makeEl('td', { text: v }))); tr.append(actionCell(() => deleteRecord('measurements', r.id))); tb.append(tr); });
        t.append(tb);
        table.append(t);
        section.append(table);
        return section;
    }
    function renderOtherBodyTable() {
        const section = makeEl('section', { className: 'section' });
        section.append(sectionHead('Другие измерения', 'Процент жира, талия, пульс в покое, SpO₂ и температура.'));
        const allowed = new Set(['bodyFat', 'waist', 'restingHeartRate', 'spo2', 'temperature']);
        const records = sortedDesc(profileRecords('measurements').filter(x => allowed.has(x.type)));
        if (!records.length) {
            section.append(emptyState('＋', 'Дополнительных измерений пока нет.', 'Добавляйте только те показатели, которые действительно отслеживаете.', 'Добавить измерение', openBodyQuickMenu));
            return section;
        }
        const labels = { bodyFat: 'Процент жира', waist: 'Талия', restingHeartRate: 'Пульс в покое', spo2: 'SpO₂', temperature: 'Температура' };
        const fmt = r => { if (r.type === 'waist') {
            const d = lengthDisplay(r.value);
            return `${fmtNumber(d.value, 1)} ${d.unit}`;
        } if (r.type === 'temperature') {
            const d = tempDisplay(r.value);
            return `${fmtNumber(d.value, 1)} ${d.unit}`;
        } if (r.type === 'bodyFat' || r.type === 'spo2')
            return `${fmtNumber(r.value, 1)}%`; if (r.type === 'restingHeartRate')
            return `${fmtNumber(r.value, 0)} уд/мин`; return fmtNumber(r.value, 1); };
        const table = makeEl('div', { className: 'table-wrap' });
        const t = makeEl('table', { className: 'data-table' });
        setStaticHTML(t, '<thead><tr><th>Показатель</th><th>Значение</th><th>Дата</th><th></th></tr></thead>');
        const tb = makeEl('tbody');
        records.slice(0, 100).forEach(r => { const tr = makeEl('tr'); [labels[r.type] || r.type, fmt(r), fmtDate(r.date)].forEach(v => tr.append(makeEl('td', { text: v }))); tr.append(actionCell(() => deleteRecord('measurements', r.id))); tb.append(tr); });
        t.append(tb);
        table.append(t);
        section.append(table);
        return section;
    }
    function emptyState(iconText, title, text, cta, handler) {
        const e = makeEl('div', { className: 'empty-state' });
        e.append(makeEl('div', { className: 'empty-icon', text: iconText }), makeEl('h3', { text: title }), makeEl('p', { text }));
        if (cta && handler)
            e.append(actionButton(cta, handler, 'primary'));
        return e;
    }
    function actionCell(deleteHandler, editHandler = null) {
        const td = makeEl('td');
        const acts = makeEl('div', { className: 'table-actions' });
        if (editHandler) {
            const edit = makeEl('button', { className: 'icon-action', text: '✎', attrs: { type: 'button', 'aria-label': 'Редактировать' } });
            edit.addEventListener('click', editHandler);
            acts.append(edit);
        }
        const del = makeEl('button', { className: 'icon-action', text: '×', attrs: { type: 'button', 'aria-label': 'Удалить' } });
        del.addEventListener('click', deleteHandler);
        acts.append(del);
        td.append(acts);
        return td;
    }
    function renderLabsPage(root) {
        root.append(pageHead('Анализы', 'Лабораторные значения, введённые референсы и динамика повторных исследований.', 'Анализы', [actionButton('+ Добавить анализ', () => openRecordForm('lab'), 'primary')]));
        const labs = sortedDesc(profileRecords('labs'));
        if (!labs.length) {
            root.append(emptyState('LAB', 'Вы ещё не добавляли результаты анализов.', 'Добавьте первый результат, чтобы отслеживать значения относительно введённых референсов и строить динамику.', 'Добавить анализ', () => openRecordForm('lab')));
            return;
        }
        const unique = new Set(labs.map(l => normalizeLabName(l.name)));
        const out = labs.filter(l => ['low', 'high'].includes(labStatus(l).key));
        const recent = latest(labs);
        const stats = makeEl('div', { className: 'data-grid' });
        stats.append(metricPanel('Записей', String(labs.length), `${unique.size} показателей`), metricPanel('Вне введённых референсов', String(out.length), 'Не является диагнозом'), metricPanel('Последнее исследование', recent ? fmtDate(recent.date) : '—', recent?.laboratory || 'Лаборатория не указана'));
        root.append(stats);
        const trendLabels = new Map();
        labs.forEach(l => { const key = labSeriesKey(l); if (normalizeLabName(l.name) && !trendLabels.has(key))
            trendLabels.set(key, { name: l.name.trim(), unit: String(l.unit || '').trim() }); });
        const trendSeries = [...trendLabels.entries()].filter(([key]) => labs.filter(l => labSeriesKey(l) === key).length >= 2);
        if (trendSeries.length) {
            const sec = makeEl('section', { className: 'section' });
            const select = makeEl('select', { className: 'select', attrs: { 'aria-label': 'Показатель для графика' } });
            trendSeries.forEach(([key, meta]) => select.append(makeEl('option', { text: `${meta.name}${meta.unit ? ` · ${meta.unit}` : ''}`, attrs: { value: key } })));
            sec.append(sectionHead('Lab Trend', 'Повторные значения одного показателя автоматически собираются в график.', [select]));
            const chart = makeEl('div', { className: 'card chart-card' });
            const summary = makeEl('div', { className: 'data-grid' });
            const wrap = makeEl('div', { className: 'chart-wrap' });
            const canvas = makeEl('canvas', { attrs: { role: 'img', 'aria-label': 'График динамики выбранного лабораторного показателя' } });
            wrap.append(canvas);
            chart.append(summary, wrap);
            sec.append(chart);
            root.append(sec);
            const draw = () => { clear(summary); const records = sortedAsc(labs.filter(l => labSeriesKey(l) === select.value)); const last = records[records.length - 1], prev = records[records.length - 2]; const delta = Number(last.value) - Number(prev.value); summary.append(metricPanel('Последнее', `${fmtNumber(last.value, 3)} ${last.unit || ''}`, fmtDate(last.date)), metricPanel('Предыдущее', `${fmtNumber(prev.value, 3)} ${prev.unit || ''}`, fmtDate(prev.date)), metricPanel('Дельта', `${delta >= 0 ? '+' : ''}${fmtNumber(delta, 3)} ${last.unit || ''}`, 'Между двумя последними')); drawLineChart(canvas, records.map(r => ({ label: r.date, value: Number(r.value) })), { referenceMin: last.referenceMin, referenceMax: last.referenceMax }); };
            select.addEventListener('change', draw);
            state.pendingCharts.push(draw);
        }
        const sec = makeEl('section', { className: 'section' });
        sec.append(sectionHead('Все результаты', 'Статус рассчитывается только относительно референсов, которые вы ввели.'));
        const table = makeEl('div', { className: 'table-wrap' });
        const t = makeEl('table', { className: 'data-table' });
        setStaticHTML(t, '<thead><tr><th>Показатель</th><th>Значение</th><th>Референс</th><th>Статус</th><th>Дата</th><th></th></tr></thead>');
        const tb = makeEl('tbody');
        labs.forEach(l => { const s = labStatus(l); const tr = makeEl('tr'); const nameTd = makeEl('td'); nameTd.append(makeEl('div', { className: 'table-primary', text: l.name }), makeEl('div', { className: 'table-secondary', text: l.laboratory || 'Лаборатория не указана' })); tr.append(nameTd, makeEl('td', { text: `${fmtNumber(l.value, 3)} ${l.unit || ''}` }), makeEl('td', { text: referenceText(l) })); const st = makeEl('td'); st.append(makeEl('span', { className: `status ${s.key === 'range' ? 'ok' : s.key === 'unknown' ? 'off' : 'warn'}`, text: s.text })); tr.append(st, makeEl('td', { text: fmtDate(l.date) }), actionCell(() => deleteRecord('labs', l.id), () => openRecordForm('lab', l))); tb.append(tr); });
        t.append(tb);
        table.append(t);
        sec.append(table, makeEl('p', { className: 'section-subtitle', text: 'Показатель за пределами указанного лабораторией диапазона стоит интерпретировать с врачом в клиническом контексте. Эти данные сами по себе не устанавливают диагноз.' }));
        root.append(sec);
    }
    function referenceText(lab) { const min = lab.referenceMin, max = lab.referenceMax; const hasMin = min !== '' && min !== null && min !== undefined; const hasMax = max !== '' && max !== null && max !== undefined; if (hasMin && hasMax)
        return `${min}–${max} ${lab.unit || ''}`; if (hasMin)
        return `≥ ${min} ${lab.unit || ''}`; if (hasMax)
        return `≤ ${max} ${lab.unit || ''}`; return '—'; }
    function renderMobileHealthHub() {
        const hub = makeEl('nav', { className: 'mobile-health-hub', attrs: { 'aria-label': 'Разделы здоровья' } });
        const items = [['profile', 'Профиль'], ['body', 'Тело'], ['labs', 'Анализы'], ['lifestyle', 'Образ жизни'], ['medications', 'Препараты'], ['goals', 'Цели']].filter(([route]) => {
            if (route === 'body')
                return isEnabled('body');
            if (route === 'labs')
                return isEnabled('labs');
            if (route === 'medications')
                return isEnabled('medications') || isEnabled('supplements');
            if (route === 'goals')
                return isEnabled('goals');
            return true;
        });
        items.forEach(([route, label]) => { const b = makeEl('button', { className: `mobile-health-link${state.route === route ? ' active' : ''}`, attrs: { type: 'button' } }); b.append(icon(route === 'lifestyle' ? 'body' : route), makeEl('span', { text: label })); b.addEventListener('click', () => navigate(route)); hub.append(b); });
        return hub;
    }
    function renderLifestylePage(root, profile) {
        root.append(renderMobileHealthHub());
        const targetBtn = actionButton('Цели образа жизни', openLifestyleTargets, 'secondary');
        root.append(pageHead('Образ жизни', 'Сон, активность, тренировки и дневные агрегаты питания — без превращения системы в трекер еды.', 'Образ жизни', [targetBtn]));
        const ls = profile.lifestyle || {};
        const info = makeEl('div', { className: 'data-grid' });
        info.append(metricPanel('Тренировки / нед.', ls.trainingsPerWeek !== null && ls.trainingsPerWeek !== undefined ? String(ls.trainingsPerWeek) : '—', 'Исходный уровень'), metricPanel('Средние шаги', Number.isFinite(Number(ls.averageSteps)) ? fmtNumber(ls.averageSteps, 0) : '—', Number(ls.stepGoal) > 0 ? `Цель: ${fmtNumber(ls.stepGoal, 0)}` : 'Цель по шагам не задана'), metricPanel('Средний сон', Number.isFinite(Number(ls.averageSleepHours)) ? durationText(ls.averageSleepHours) : '—', Number(ls.sleepGoalHours) > 0 ? `Цель: ${durationText(ls.sleepGoalHours)}` : 'Цель сна не задана'), metricPanel('Стресс', Number.isFinite(Number(ls.stress)) ? `${ls.stress}/10` : '—', 'Самооценка при настройке'));
        root.append(info);
        if (isEnabled('sleep'))
            root.append(renderSleepSection(profile));
        if (isEnabled('activity'))
            root.append(renderActivitySection(profile));
        if (isEnabled('training'))
            root.append(renderTrainingSection());
        if (isEnabled('nutrition'))
            root.append(renderNutritionSection());
        if (!isEnabled('sleep') && !isEnabled('activity') && !isEnabled('training') && !isEnabled('nutrition'))
            root.append(emptyState('—', 'Модули образа жизни отключены.', 'Включите нужные модули в настройках.', 'Открыть настройки', () => navigate('settings')));
    }
    function renderSleepSection(profile) {
        const sec = makeEl('section', { className: 'section' });
        sec.append(sectionHead('Сон', 'Средняя продолжительность, качество и последняя ночь.', [actionButton('+ Сон', () => openRecordForm('sleep'), 'secondary')]));
        const records = profileRecords('sleep');
        if (!records.length) {
            sec.append(emptyState('Zz', 'Записей сна пока нет.', 'Добавьте несколько ночей, чтобы увидеть средние значения и динамику.', 'Добавить сон', () => openRecordForm('sleep')));
            return sec;
        }
        const recent = recordsInLastDays(records, 7), last = latest(records), avg = mean(recent.map(x => x.durationHours)), quality = mean(recent.map(x => x.quality));
        const stats = makeEl('div', { className: 'data-grid' });
        stats.append(metricPanel('Среднее за 7 дней', avg !== null ? durationText(avg) : '—', `${recent.length} записей`), metricPanel('Среднее качество', quality !== null ? `${fmtNumber(quality, 1)}/10` : '—', 'Самооценка'), metricPanel('Последняя ночь', durationText(last.durationHours), `${fmtDate(last.date)} · качество ${last.quality}/10`));
        sec.append(stats);
        const chart = makeEl('div', { className: 'card chart-card section' });
        const wrap = makeEl('div', { className: 'chart-wrap' });
        const canvas = makeEl('canvas', { attrs: { role: 'img', 'aria-label': `График длительности сна: ${records.length} записей` } });
        wrap.append(canvas);
        chart.append(wrap);
        sec.append(chart);
        state.pendingCharts.push(() => drawLineChart(canvas, sortedAsc(records).slice(-30).map(r => ({ label: r.date, value: Number(r.durationHours) })), { referenceMin: profile.lifestyle?.sleepGoalHours || null }));
        const latestRows = sortedDesc(records).slice(0, 14);
        const table = makeEl('div', { className: 'table-wrap' });
        const t = makeEl('table', { className: 'data-table' });
        setStaticHTML(t, '<thead><tr><th>Дата</th><th>Длительность</th><th>Качество</th><th>Режим</th><th></th></tr></thead>');
        const tb = makeEl('tbody');
        latestRows.forEach(r => { const tr = makeEl('tr'); [fmtDate(r.date), durationText(r.durationHours), `${r.quality}/10`, `${r.bedtime || '—'} → ${r.wakeTime || '—'}`].forEach(v => tr.append(makeEl('td', { text: v }))); tr.append(actionCell(() => deleteRecord('sleep', r.id), () => openRecordForm('sleep', r))); tb.append(tr); });
        t.append(tb);
        table.append(t);
        sec.append(table);
        return sec;
    }
    function renderActivitySection(profile) {
        const sec = makeEl('section', { className: 'section' });
        sec.append(sectionHead('Активность', 'Шаги, активные минуты, кардио и дистанция.', [actionButton('+ Активность', () => openRecordForm('activity'), 'secondary')]));
        const records = profileRecords('activity');
        if (!records.length) {
            sec.append(emptyState('↗', 'Активность ещё не добавлена.', 'Добавьте шаги и активные минуты за день.', 'Добавить активность', () => openRecordForm('activity')));
            return sec;
        }
        const today = records.find(x => x.date === todayISO()), recent = recordsInLastDays(records, 7), avg = mean(recent.map(x => x.steps));
        const stats = makeEl('div', { className: 'data-grid' });
        stats.append(metricPanel('Сегодня', today ? `${fmtNumber(today.steps, 0)} шагов` : '—', today ? `${fmtNumber(today.activeMinutes || 0, 0)} активных минут` : 'Нет записи за сегодня'), metricPanel('Среднее 7 дней', avg !== null ? `${fmtNumber(avg, 0)} шагов` : '—', `${recent.length} дней данных`));
        const goal = Number(profile.lifestyle?.stepGoal);
        if (Number.isFinite(goal) && goal > 0) {
            const current = today ? Number(today.steps) : avg;
            stats.append(metricPanel('Прогресс цели', current !== null ? `${fmtNumber(clamp(current / goal * 100, 0, 100), 0)}%` : '—', `${fmtNumber(current || 0, 0)} из ${fmtNumber(goal, 0)} шагов`));
        }
        sec.append(stats);
        const chart = makeEl('div', { className: 'card chart-card section' });
        const wrap = makeEl('div', { className: 'chart-wrap' });
        const canvas = makeEl('canvas', { attrs: { role: 'img', 'aria-label': `График шагов: ${records.length} записей` } });
        wrap.append(canvas);
        chart.append(wrap);
        sec.append(chart);
        state.pendingCharts.push(() => drawLineChart(canvas, sortedAsc(records).slice(-30).map(r => ({ label: r.date, value: Number(r.steps) })), { referenceMin: goal || null }));
        return sec;
    }
    function renderTrainingSection() {
        const sec = makeEl('section', { className: 'section' });
        sec.append(sectionHead('Тренировки', 'Минимальный журнал нагрузки: тип, длительность и RPE.', [actionButton('+ Тренировка', () => openRecordForm('training'), 'secondary')]));
        const records = sortedDesc(profileRecords('training'));
        if (!records.length) {
            sec.append(emptyState('T', 'Тренировки ещё не добавлены.', 'Фиксируйте только ключевые параметры сессии, без сложного дневника упражнений.', 'Добавить тренировку', () => openRecordForm('training')));
            return sec;
        }
        const table = makeEl('div', { className: 'table-wrap' });
        const t = makeEl('table', { className: 'data-table' });
        setStaticHTML(t, '<thead><tr><th>Дата</th><th>Тип</th><th>Название</th><th>Длительность</th><th>RPE</th><th></th></tr></thead>');
        const tb = makeEl('tbody');
        records.slice(0, 50).forEach(r => { const tr = makeEl('tr'); [fmtDate(r.date), r.type, r.name, `${r.durationMinutes} мин`, `${r.rpe}/10`].forEach(v => tr.append(makeEl('td', { text: v || '—' }))); tr.append(actionCell(() => deleteRecord('training', r.id), () => openRecordForm('training', r))); tb.append(tr); });
        t.append(tb);
        table.append(t);
        sec.append(table);
        return sec;
    }
    function renderNutritionSection() {
        const sec = makeEl('section', { className: 'section' });
        sec.append(sectionHead('Питание', 'Только дневные агрегаты: калории, БЖУ, клетчатка и вода.', [actionButton('+ Дневной итог', () => openRecordForm('nutrition'), 'secondary')]));
        const records = sortedDesc(profileRecords('nutrition'));
        if (!records.length) {
            sec.append(emptyState('N', 'Дневные агрегаты питания не добавлены.', 'Модуль не требует трекинга каждого продукта.', 'Добавить дневной итог', () => openRecordForm('nutrition')));
            return sec;
        }
        const r = records[0];
        const stats = makeEl('div', { className: 'data-grid' });
        stats.append(metricPanel('Калории', `${fmtNumber(r.calories, 0)} ккал`, fmtDate(r.date)), metricPanel('Белок', `${fmtNumber(r.protein, 0)} г`, `Жиры ${fmtNumber(r.fat, 0)} г · Углеводы ${fmtNumber(r.carbs, 0)} г`), metricPanel('Клетчатка', `${fmtNumber(r.fiber, 0)} г`, `Вода ${fmtNumber(r.waterLiters, 1)} л`));
        sec.append(stats);
        return sec;
    }
    function renderMedicationsPage(root) {
        const buttons = [];
        if (isEnabled('medications'))
            buttons.push(actionButton('+ Лекарство', () => openRecordForm('medication', null, { kind: 'medication' }), 'primary'));
        if (isEnabled('supplements'))
            buttons.push(actionButton('+ Добавка', () => openRecordForm('medication', null, { kind: 'supplement' }), 'secondary'));
        root.append(pageHead('Препараты', 'Лекарства и добавки хранятся раздельно. Система не назначает и не отменяет препараты.', 'Препараты', buttons));
        if (isEnabled('medications'))
            root.append(renderMedicationCollection('Лекарства', 'medications', 'Добавьте назначенные или используемые лекарства.'));
        if (isEnabled('supplements'))
            root.append(renderMedicationCollection('Добавки', 'supplements', 'Добавьте используемые добавки.'));
        if (!isEnabled('medications') && !isEnabled('supplements'))
            root.append(emptyState('—', 'Модули препаратов отключены.', 'Включите лекарства или добавки в настройках.', 'Открыть настройки', () => navigate('settings')));
    }
    function renderMedicationCollection(title, collection, emptyText) {
        const sec = makeEl('section', { className: 'section' });
        sec.append(sectionHead(title, 'Дозировка, частота, период и пользовательская причина.'));
        const records = sortedDesc(profileRecords(collection), 'startDate');
        if (!records.length) {
            const empty = emptyState('Rx', `${title} ещё не добавлены.`, emptyText, `Добавить ${collection === 'medications' ? 'лекарство' : 'добавку'}`, () => openRecordForm('medication', null, { kind: collection === 'medications' ? 'medication' : 'supplement' }));
            const declared = getProfile()?.dataDeclarations?.[collection] === 'none';
            const none = actionButton(declared ? 'Отмечено: не принимаю' : 'Я не принимаю', () => setDataDeclaration(collection, declared ? 'unknown' : 'none'), 'secondary', true);
            none.setAttribute('aria-pressed', String(declared));
            empty.append(none);
            sec.append(empty);
            return sec;
        }
        const list = makeEl('div', { className: 'goal-list' });
        records.forEach(r => { const card = makeEl('div', { className: 'card goal-card' }); const top = makeEl('div', { className: 'goal-top' }); const c = makeEl('div'); c.append(makeEl('h3', { text: r.name }), makeEl('p', { className: 'goal-meta', text: [r.dosage !== null && r.dosage !== '' ? `${r.dosage} ${r.unit || ''}` : 'Дозировка не указана', r.frequency || 'Частота не указана'].join(' · ') })); const statusText = { active: 'Активно', paused: 'Пауза', completed: 'Завершено' }[r.status] || r.status; const right = makeEl('div', { className: 'section-head-actions' }); right.append(makeEl('span', { className: `status ${r.status === 'active' ? 'ok' : 'off'}`, text: statusText }), actionButton('Изменить', () => openRecordForm('medication', r, { kind: collection === 'medications' ? 'medication' : 'supplement' }), 'secondary', true), actionButton('Удалить', () => deleteRecord(collection, r.id), 'danger-soft', true)); top.append(c, right); card.append(top); const meta = makeEl('p', { className: 'goal-meta', text: `С ${fmtDate(r.startDate)}${r.endDate ? ` по ${fmtDate(r.endDate)}` : ''}${r.reason ? ` · ${r.reason}` : ''}` }); card.append(meta); if (r.note)
            card.append(makeEl('p', { className: 'section-subtitle', text: r.note })); list.append(card); });
        sec.append(list);
        return sec;
    }
    function renderGoalsPage(root) {
        root.append(pageHead('Цели', 'Измеримые цели с начальным, текущим и целевым значением.', 'Цели', [actionButton('+ Создать цель', () => openRecordForm('goal'), 'primary')]));
        const goals = sortedDesc(profileRecords('goals'), 'startDate');
        if (!goals.length) {
            root.append(emptyState('◎', 'У вас пока нет измеримых целей.', 'Создайте цель с текущим и целевым значением — прогресс будет рассчитываться автоматически.', 'Создать цель', () => openRecordForm('goal')));
            return;
        }
        const list = makeEl('div', { className: 'goal-list' });
        goals.forEach(g => { const p = goalProgress(g); const card = makeEl('div', { className: 'card goal-card' }); const top = makeEl('div', { className: 'goal-top' }); const copy = makeEl('div'); copy.append(makeEl('h3', { text: g.name }), makeEl('p', { className: 'goal-meta', text: `${g.category || 'Без категории'} · ${fmtDate(g.startDate)}${g.deadline ? ` → ${fmtDate(g.deadline)}` : ''}` })); const acts = makeEl('div', { className: 'section-head-actions' }); acts.append(actionButton('Обновить', () => openRecordForm('goal', g), 'secondary', true), actionButton('Удалить', () => deleteRecord('goals', g.id), 'danger-soft', true)); top.append(copy, acts); card.append(top); const vals = makeEl('div', { className: 'goal-values' }); vals.append(makeEl('strong', { text: `${fmtNumber(g.currentValue, 2)} ${g.unit || ''}` }), makeEl('span', { className: 'section-subtitle', text: `Цель: ${fmtNumber(g.targetValue, 2)} ${g.unit || ''}` })); card.append(vals); if (Number.isFinite(p)) {
            const prog = makeEl('div', { className: 'progress goal-progress' });
            prog.append(makeEl('span', { attrs: { style: `width:${p}%` } }));
            card.append(prog, makeEl('p', { className: 'section-subtitle', text: `Прогресс ${fmtNumber(p, 0)}% от начального значения ${fmtNumber(g.startValue, 2)} ${g.unit || ''}` }));
        } list.append(card); });
        root.append(list);
    }
    function buildTimeline() {
        const events = [];
        profileRecords('measurements').forEach(r => events.push({ id: r.id, collection: 'measurements', type: r.type === 'weight' ? 'Вес' : r.type === 'bloodPressure' ? 'Давление' : r.type === 'restingHeartRate' ? 'Пульс' : 'Тело', date: r.date, time: r.time || '', summary: measurementSummary(r), note: r.note || '' }));
        profileRecords('labs').forEach(r => events.push({ id: r.id, collection: 'labs', type: 'Анализ', date: r.date, time: '', summary: `${r.name}: ${fmtNumber(r.value, 3)} ${r.unit || ''} · ${labStatus(r).text}`, note: r.comment || '' }));
        profileRecords('sleep').forEach(r => events.push({ id: r.id, collection: 'sleep', type: 'Сон', date: r.date, time: '', summary: `${durationText(r.durationHours)} · качество ${r.quality}/10`, note: r.note || '' }));
        profileRecords('activity').forEach(r => events.push({ id: r.id, collection: 'activity', type: 'Активность', date: r.date, time: '', summary: `${fmtNumber(r.steps, 0)} шагов${r.activeMinutes ? ` · ${r.activeMinutes} активных минут` : ''}`, note: '' }));
        profileRecords('training').forEach(r => events.push({ id: r.id, collection: 'training', type: 'Тренировка', date: r.date, time: '', summary: `${r.type}${r.name ? ` · ${r.name}` : ''} · ${r.durationMinutes} мин · RPE ${r.rpe}/10`, note: r.note || '' }));
        profileRecords('nutrition').forEach(r => events.push({ id: r.id, collection: 'nutrition', type: 'Питание', date: r.date, time: '', summary: `${fmtNumber(r.calories, 0)} ккал · Б ${fmtNumber(r.protein, 0)} · Ж ${fmtNumber(r.fat, 0)} · У ${fmtNumber(r.carbs, 0)}`, note: '' }));
        profileRecords('symptoms').forEach(r => events.push({ id: r.id, collection: 'symptoms', type: 'Симптом', date: r.date, time: '', summary: `${r.name} · интенсивность ${r.intensity}/10${r.duration ? ` · ${r.duration}` : ''}`, note: r.note || '' }));
        profileRecords('medications').forEach(r => events.push({ id: r.id, collection: 'medications', type: 'Лекарство', date: r.startDate, time: '', summary: `${r.name}${r.dosage !== null && r.dosage !== '' ? ` · ${r.dosage} ${r.unit || ''}` : ''} · ${r.frequency || 'частота не указана'}`, note: r.reason || '' }));
        profileRecords('supplements').forEach(r => events.push({ id: r.id, collection: 'supplements', type: 'Добавка', date: r.startDate, time: '', summary: `${r.name}${r.dosage !== null && r.dosage !== '' ? ` · ${r.dosage} ${r.unit || ''}` : ''} · ${r.frequency || 'частота не указана'}`, note: r.reason || '' }));
        profileRecords('goals').forEach(r => events.push({ id: r.id, collection: 'goals', type: 'Цель', date: r.startDate, time: '', summary: `${r.name} · ${fmtNumber(r.currentValue, 2)} → ${fmtNumber(r.targetValue, 2)} ${r.unit || ''}`, note: r.deadline ? `Срок: ${fmtDate(r.deadline)}` : '' }));
        profileRecords('notes').forEach(r => events.push({ id: r.id, collection: 'notes', type: 'Заметка', date: r.date, time: r.time || '', summary: r.text, note: '' }));
        // Cache the comparable timestamp once. Parsing dates inside Array.sort's comparator
        // multiplied the work by O(n log n) and made large timelines noticeably slower.
        events.forEach(event => { event._sortTimestamp = itemDateTime(event); });
        return events.sort((a, b) => (b._sortTimestamp - a._sortTimestamp) || String(b.id).localeCompare(String(a.id)));
    }
    function measurementSummary(r) {
        if (r.type === 'weight') {
            const d = weightDisplay(r.value);
            return `${fmtNumber(d.value, 1)} ${d.unit}`;
        }
        if (r.type === 'bloodPressure')
            return `${r.systolic}/${r.diastolic}${r.pulse ? ` · пульс ${r.pulse}` : ''}`;
        if (r.type === 'restingHeartRate')
            return `${fmtNumber(r.value, 0)} уд/мин`;
        if (r.type === 'bodyFat')
            return `${fmtNumber(r.value, 1)}% жира`;
        if (r.type === 'waist') {
            const d = lengthDisplay(r.value);
            return `Талия ${fmtNumber(d.value, 1)} ${d.unit}`;
        }
        if (r.type === 'spo2')
            return `SpO₂ ${fmtNumber(r.value, 1)}%`;
        if (r.type === 'temperature') {
            const d = tempDisplay(r.value);
            return `${fmtNumber(d.value, 1)} ${d.unit}`;
        }
        return fmtNumber(r.value, 2);
    }
    function renderHistoryPage(root) {
        root.append(pageHead('История', 'Единый timeline всех записей текущего профиля.', 'История', [actionButton('+ Добавить', openQuickAdd, 'primary')]));
        const all = buildTimeline();
        const types = ['all', ...new Set(all.map(e => e.type))];
        const filters = makeEl('div', { className: 'filter-row' });
        types.slice(0, 12).forEach(type => { const b = makeEl('button', { className: `filter-chip${state.historyFilter === type ? ' active' : ''}`, text: type === 'all' ? 'Все' : type, attrs: { type: 'button' } }); b.addEventListener('click', () => { state.historyFilter = type; renderCurrentRoute(); }); filters.append(b); });
        root.append(filters);
        const events = state.historyFilter === 'all' ? all : all.filter(e => e.type === state.historyFilter);
        if (!events.length) {
            root.append(emptyState('↺', 'История пока пуста.', 'Добавленные измерения, анализы, сон, тренировки, симптомы, препараты, цели и заметки появятся здесь.', 'Добавить данные', openQuickAdd));
            return;
        }
        const timeline = makeEl('div', { className: 'timeline' });
        events.slice(0, state.historyLimit).forEach(e => { const item = makeEl('article', { className: 'timeline-item' }); item.append(makeEl('div', { className: 'timeline-date', text: `${fmtDate(e.date)}${e.time ? ` · ${e.time}` : ''}` })); const card = makeEl('div', { className: 'timeline-card' }); const title = makeEl('div', { className: 'timeline-title' }); title.append(makeEl('strong', { text: e.type }), makeEl('span', { className: 'timeline-type', text: e.collection })); card.append(title, makeEl('div', { className: 'timeline-summary', text: e.summary })); if (e.note)
            card.append(makeEl('div', { className: 'timeline-note', text: e.note })); item.append(card); timeline.append(item); });
        root.append(timeline);
        if (events.length > state.historyLimit) {
            const more = makeEl('div', { className: 'timeline-load' });
            more.append(actionButton(`Показать ещё (${Math.min(100, events.length - state.historyLimit)})`, () => { state.historyLimit += 100; renderCurrentRoute(); }, 'secondary'));
            root.append(more);
        }
    }
    function renderSettingsPage(root, profile) {
        root.append(pageHead('Настройки', 'Персонализация, модули, данные и сведения о продукте.', 'Настройки'));
        const stack = makeEl('div', { className: 'settings-stack' });
        const personalization = makeEl('section', { className: 'card settings-card' });
        personalization.append(sectionHead('Персонализация'));
        personalization.append(settingsRow('Имя', profile.name, actionButton('Изменить', () => startOnboarding('edit'), 'secondary', true)));
        personalization.append(settingsRow('Главная цель', profile.priority || '—', actionButton('Изменить', () => startOnboarding('edit'), 'secondary', true)));
        const themeSeg = makeEl('div', { className: 'segmented' });
        [['light', 'Светлая'], ['dark', 'Тёмная'], ['system', 'Система']].forEach(([v, t]) => { const b = makeEl('button', { className: state.data.settings.theme === v ? 'active' : '', text: t, attrs: { type: 'button' } }); b.addEventListener('click', () => { persistTheme(v); renderCurrentRoute(); }); themeSeg.append(b); });
        personalization.append(settingsRow('Тема', 'Семантические светлая и тёмная палитры; режим «Система» следует настройке устройства.', themeSeg));
        const unitSeg = makeEl('div', { className: 'segmented' });
        [['metric', 'Метрические'], ['imperial', 'Имперские']].forEach(([v, t]) => { const b = makeEl('button', { className: getUnits() === v ? 'active' : '', text: t, attrs: { type: 'button' } }); b.addEventListener('click', () => { mutateAndSave(data => { data.settings.units = v; }, { successMessage: 'Единицы измерения обновлены.' }); }); unitSeg.append(b); });
        personalization.append(settingsRow('Единицы измерения', 'Вес, длина, дистанция и температура отображаются в выбранной системе. Лабораторные единицы не преобразуются автоматически.', unitSeg));
        stack.append(personalization);
        const modules = makeEl('section', { className: 'card settings-card' });
        modules.append(sectionHead('Модули', 'Отключённые модули скрываются с главного экрана и не снижают показатель качества данных.'));
        Object.entries(MODULE_LABELS).forEach(([key, label]) => { const sw = makeEl('label', { className: 'switch' }); const input = makeEl('input', { attrs: { type: 'checkbox' } }); input.checked = isEnabled(key); input.addEventListener('change', () => { const desired = input.checked; const ok = mutateAndSave(data => { data.settings.modules[key] = desired; }, { rerender: 'none' }); if (!ok) {
            input.checked = !desired;
            return;
        } renderNavigation(); renderCurrentRoute(); showToast(`${label}: ${desired ? 'включено' : 'выключено'}`); }); sw.append(input, makeEl('span', { className: 'switch-track' })); modules.append(settingsRow(label, moduleDescription(key), sw)); });
        stack.append(modules);
        if (!state.demoMode && (isEnabled('medications') || isEnabled('supplements'))) {
            const quality = makeEl('section', { className: 'card settings-card' });
            quality.append(sectionHead('Качество данных', 'Отсутствие записи и осознанное «не применимо» — разные состояния.'));
            const declaration = (kind, label) => { const controls = makeEl('div', { className: 'data-declaration' }); const current = profile.dataDeclarations?.[kind] || 'unknown'; [['unknown', 'Не указано'], ['none', 'Не принимаю'], ['has', 'Есть данные']].forEach(([v, t]) => { const b = actionButton(t, () => setDataDeclaration(kind, v), 'secondary', true); b.setAttribute('aria-pressed', String(current === v)); controls.append(b); }); quality.append(settingsRow(label, current === 'none' ? 'Отмечено: не применимо. Это считается заполненным состоянием.' : current === 'has' ? 'Есть записи или статус подтверждён.' : 'Статус пока не указан.', controls)); };
            if (isEnabled('medications'))
                declaration('medications', 'Лекарственные препараты');
            if (isEnabled('supplements'))
                declaration('supplements', 'Добавки');
            stack.append(quality);
        }
        const data = makeEl('section', { className: 'card settings-card' });
        data.append(sectionHead('Данные и резервные копии', 'Все операции выполняются локально в браузере.'));
        const stats = makeEl('div', { className: 'backup-grid' });
        const last = state.data.settings.lastBackupAt ? fmtDate(String(state.data.settings.lastBackupAt).slice(0, 10)) : 'Нет';
        [['Профилей', state.data.profiles.length], ['Записей', totalRecordCount()], ['Объём', humanBytes(storageBytes())]].forEach(([label, value]) => { const x = makeEl('div', { className: 'backup-stat' }); x.append(makeEl('strong', { text: String(value) }), makeEl('span', { text: label })); stats.append(x); });
        data.append(stats, makeEl('p', { className: 'data-quality-note', text: `Последняя резервная копия: ${last}. Очистка данных браузера может удалить локальные записи.` }));
        const backupActions = makeEl('div', { className: 'section-head-actions' });
        backupActions.append(actionButton('Экспорт JSON', exportData, 'secondary', true), actionButton('Защищённая .mhos', exportEncryptedBackup, 'secondary', true), actionButton('Импорт', () => dom.importFileInput.click(), 'secondary', true), actionButton('CSV', openCsvExport, 'secondary', true));
        data.append(settingsRow('Резервирование и перенос', 'JSON — полный незашифрованный backup. .mhos — AES-GCM backup с паролем. CSV — перенос отдельных наборов данных.', backupActions));
        data.append(makeEl('div', { className: 'backup-safety-notes' }, [
            makeEl('div', { className: 'inline-note warning', text: 'JSON-файл не зашифрован. Храните его как чувствительные персональные данные.' }),
            makeEl('div', { className: 'inline-note', text: 'Пароль от .mhos невозможно восстановить. Без него защищённую резервную копию открыть нельзя.' })
        ]));
        const briefActions = makeEl('div', { className: 'section-head-actions' });
        briefActions.append(actionButton('Health Brief', openHealthBrief, 'secondary', true), actionButton('Для консультации', openConsultationBrief, 'secondary', true));
        data.append(settingsRow('Структурированные резюме', 'Локально подготовить данные для ChatGPT или консультации; можно скопировать, скачать или распечатать.', briefActions));
        stack.append(data);
        const about = makeEl('section', { className: 'card settings-card' });
        about.append(sectionHead('О продукте'));
        about.append(settingsRow('MARKOV HEALTH OS', `v${APP_VERSION} · схема данных v${DATA_VERSION} · Персональная система управления здоровьем`, actionButton('О продукте', openAbout, 'secondary', true)));
        if (!state.demoMode)
            about.append(settingsRow('Демо-режим', 'Полностью вымышленные данные живут только в памяти вкладки и не смешиваются с вашими.', actionButton('Открыть демо', enterDemo, 'secondary', true)));
        const links = makeEl('div', { className: 'section-head-actions' });
        links.append(makeEl('a', { className: 'btn secondary small', text: 'Privacy', attrs: { href: './privacy.html' } }), makeEl('a', { className: 'btn secondary small', text: 'Terms', attrs: { href: './terms.html' } }));
        about.append(settingsRow('Документы', 'Модель локального хранения, медицинский дисклеймер и условия использования.', links));
        stack.append(about);
        const danger = makeEl('section', { className: 'card settings-card danger-zone' });
        danger.append(sectionHead('Сброс данных', 'Необратимые действия требуют подтверждения.'));
        danger.append(settingsRow('Удалить текущий профиль', 'Удалит профиль и все связанные с ним записи; после удаления доступен краткий Undo.', actionButton('Удалить профиль', () => deleteProfile(profile.id), 'danger-soft', true)));
        danger.append(settingsRow('Удалить все данные', 'Полностью очистит Markov Health OS в этом браузере. Перед удалением рекомендуется экспортировать backup.', actionButton('Удалить всё', deleteAllData, 'danger', true)));
        stack.append(danger);
        if (state.demoMode) {
            const demo = makeEl('section', { className: 'card settings-card' });
            demo.append(sectionHead('Демо-режим'));
            demo.append(settingsRow('Алексей Смирнов', 'Демо-данные существуют только в памяти вкладки и не заменяют реальные данные.', actionButton('Выйти из демо', exitDemo, 'primary', true)));
            stack.prepend(demo);
        }
        root.append(stack);
    }
    function settingsRow(title, description, control) { const row = makeEl('div', { className: 'settings-row' }); const copy = makeEl('div', { className: 'settings-copy' }); copy.append(makeEl('h3', { text: title }), makeEl('p', { text: description })); row.append(copy); const c = makeEl('div', { className: 'settings-control' }); c.append(control); row.append(c); return row; }
    function moduleDescription(key) { const map = { body: 'Вес, давление, пульс и измерения тела.', labs: 'Лабораторные результаты и тренды.', sleep: 'Длительность и качество сна.', activity: 'Шаги, активные минуты, кардио и дистанция.', training: 'Краткий журнал тренировок.', nutrition: 'Дневные агрегаты питания.', medications: 'Лекарства.', supplements: 'Добавки.', symptoms: 'Симптомы и интенсивность.', goals: 'Измеримые цели.', notes: 'Текстовые заметки.' }; return map[key] || ''; }
    // ===== MODALS, FORMS & CRUD =====
    function openModal(title, eyebrow, renderFn, trackDirty = true) {
        state.lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        state.modalDirty = false;
        state.modalCloseBypass = false;
        dom.modalTitle.textContent = title;
        dom.modalEyebrow.textContent = eyebrow || '';
        clear(dom.modalBody);
        renderFn(dom.modalBody);
        if (trackDirty) {
            dom.modalBody.addEventListener('input', () => { state.modalDirty = true; }, { once: true });
            dom.modalBody.addEventListener('change', () => { state.modalDirty = true; }, { once: true });
        }
        if (!dom.modal.open)
            dom.modal.showModal();
        requestAnimationFrame(() => dom.modalBody.querySelector('input:not([type="hidden"]),select,textarea,button')?.focus());
    }
    async function requestModalClose() {
        if (state.modalCloseBypass) {
            closeModal(true);
            return;
        }
        if (state.modalDirty) {
            const ok = await askConfirm('Закрыть без сохранения?', 'Несохранённые изменения в форме будут потеряны.', 'Закрыть', true);
            if (!ok)
                return;
        }
        closeModal(true);
    }
    function closeModal(force = false) { if (!dom.modal.open)
        return; if (force) {
        state.modalDirty = false;
        state.modalCloseBypass = true;
        dom.modal.close();
        state.modalCloseBypass = false;
        const target = state.lastFocus;
        state.lastFocus = null;
        requestAnimationFrame(() => target?.isConnected && target.focus());
    }
    else
        requestModalClose(); }
    function openQuickAdd() {
        openModal('Быстро добавить', 'БЫСТРОЕ ДОБАВЛЕНИЕ', body => {
            const grid = makeEl('div', { className: 'quick-grid' });
            const items = [];
            if (isEnabled('body'))
                items.push(['weight', 'Вес', 'Масса тела'], ['bp', 'Давление', 'Систолическое / диастолическое'], ['pulse', 'Пульс', 'Пульс в покое']);
            if (isEnabled('sleep'))
                items.push(['sleep', 'Сон', 'Длительность и качество']);
            if (isEnabled('activity'))
                items.push(['activity', 'Шаги', 'Активность за день']);
            if (isEnabled('training'))
                items.push(['training', 'Тренировку', 'Тип, длительность, RPE']);
            if (isEnabled('labs'))
                items.push(['lab', 'Анализ', 'Результат лаборатории']);
            if (isEnabled('medications') || isEnabled('supplements'))
                items.push(['medication', 'Препарат', 'Лекарство или добавка']);
            if (isEnabled('symptoms'))
                items.push(['symptom', 'Симптом', 'Интенсивность и заметка']);
            if (isEnabled('goals'))
                items.push(['goal', 'Цель', 'Измеримый прогресс']);
            if (isEnabled('notes'))
                items.push(['note', 'Заметку', 'Свободная запись']);
            items.forEach(([key, label, sub]) => { const b = makeEl('button', { className: 'quick-action', attrs: { type: 'button' } }); b.append(makeEl('span', { className: 'quick-action-icon', text: label.slice(0, 1) })); const c = makeEl('span'); c.append(makeEl('strong', { text: label }), makeEl('span', { text: sub })); b.append(c); b.addEventListener('click', () => openRecordForm(key)); grid.append(b); });
            body.append(grid);
        }, false);
    }
    function openBodyQuickMenu() {
        openModal('Измерение тела', 'ТЕЛО', body => { const grid = makeEl('div', { className: 'quick-grid' }); [['weight', 'Вес'], ['bodyFat', 'Процент жира'], ['waist', 'Талия'], ['pulse', 'Пульс в покое'], ['bp', 'Давление'], ['spo2', 'SpO₂'], ['temperature', 'Температура']].forEach(([key, label]) => { const b = makeEl('button', { className: 'quick-action', attrs: { type: 'button' } }); b.append(makeEl('span', { className: 'quick-action-icon', text: label.slice(0, 1) }), makeEl('strong', { text: label })); b.addEventListener('click', () => openRecordForm(key)); grid.append(b); }); body.append(grid); }, false);
    }
    function runAction(action) {
        if (action === 'export') {
            exportData();
            return;
        }
        openRecordForm(action);
    }
    function openRecordForm(type, existing = null, options = {}) {
        const map = { weight: 'Вес', bp: 'Давление', pulse: 'Пульс в покое', bodyFat: 'Процент жира', waist: 'Талия', spo2: 'SpO₂', temperature: 'Температура', sleep: 'Сон', activity: 'Активность', training: 'Тренировка', nutrition: 'Питание за день', lab: 'Лабораторный результат', medication: 'Препарат', symptom: 'Симптом', goal: 'Цель', note: 'Заметка' };
        openModal(existing ? `Изменить: ${map[type]}` : `Добавить: ${map[type]}`, 'ДАННЫЕ', body => {
            const builders = { weight: buildWeightForm, bp: buildBpForm, pulse: (b, e) => buildSimpleMeasurementForm(b, e, 'restingHeartRate'), bodyFat: (b, e) => buildSimpleMeasurementForm(b, e, 'bodyFat'), waist: (b, e) => buildSimpleMeasurementForm(b, e, 'waist'), spo2: (b, e) => buildSimpleMeasurementForm(b, e, 'spo2'), temperature: (b, e) => buildSimpleMeasurementForm(b, e, 'temperature'), sleep: buildSleepForm, activity: buildActivityForm, training: buildTrainingForm, nutrition: buildNutritionForm, lab: buildLabForm, medication: (b, e) => buildMedicationForm(b, e, options), symptom: buildSymptomForm, goal: buildGoalForm, note: buildNoteForm };
            builders[type]?.(body, existing);
        }, true);
    }
    function field(label, name, type = 'text', attrs = {}, value = '') {
        const wrap = makeEl('div', { className: `field${attrs.full ? ' full' : ''}` });
        const id = `f-${name}-${state.idCounter++}`;
        const lab = makeEl('label', { text: label, attrs: { for: id } });
        if (attrs.required)
            lab.classList.add('required');
        const input = makeEl(type === 'textarea' ? 'textarea' : type === 'select' ? 'select' : 'input', { className: type === 'textarea' ? 'textarea' : type === 'select' ? 'select' : 'input', attrs: { id, name, ...Object.fromEntries(Object.entries(attrs).filter(([k]) => !['full', 'options'].includes(k))) } });
        if (type === 'select') {
            (attrs.options || []).forEach(([v, t]) => { const o = makeEl('option', { text: t, attrs: { value: v } }); if (String(value) === String(v))
                o.selected = true; input.append(o); });
        }
        else
            input.value = value ?? '';
        wrap.append(lab, input);
        if (attrs.hint)
            wrap.append(makeEl('div', { className: 'field-hint', text: attrs.hint }));
        return { wrap, input };
    }
    function formButtons(form, saveLabel = 'Сохранить') {
        const actions = makeEl('div', { className: 'form-actions' });
        const cancel = actionButton('Отмена', requestModalClose, 'secondary');
        cancel.type = 'button';
        const save = makeEl('button', { className: 'btn primary', text: saveLabel, attrs: { type: 'submit' } });
        actions.append(cancel, save);
        form.append(actions);
    }
    function upsertRecord(collection, record, existing) {
        const existingId = existing?.id || null;
        const profileId = state.data.activeProfileId;
        const ok = mutateAndSave(data => {
            if (existingId) {
                const idx = data[collection].findIndex(x => x.id === existingId && x.profileId === profileId);
                if (idx < 0)
                    throw new Error('RECORD_NOT_FOUND');
                data[collection][idx] = { ...data[collection][idx], ...record, id: existingId, profileId, updatedAt: dateTimeStamp() };
            }
            else
                data[collection].push({ id: uid(), profileId, ...record, createdAt: dateTimeStamp() });
            const profile = data.profiles.find(p => p.id === profileId);
            if (profile && (collection === 'medications' || collection === 'supplements'))
                profile.dataDeclarations = { ...profile.dataDeclarations, [collection]: 'has' };
        }, { rerender: 'none' });
        if (!ok)
            return false;
        state.modalDirty = false;
        closeModal(true);
        renderCurrentRoute();
        showToast(existing ? 'Запись обновлена.' : 'Данные сохранены.');
        return true;
    }
    function buildWeightForm(body, existing) {
        const form = makeEl('form', { className: 'form' });
        const d = field('Дата', 'date', 'text', { type: 'date', required: true, max: todayISO() }, existing?.date || todayISO());
        d.input.type = 'date';
        const wd = existing ? weightDisplay(existing.value) : null;
        const w = field(`Вес, ${getUnits() === 'imperial' ? 'lb' : 'кг'}`, 'value', 'text', { type: 'number', required: true, min: '20', max: getUnits() === 'imperial' ? '880' : '400', step: '0.1', inputmode: 'decimal' }, wd ? round(wd.value, 1) : '');
        w.input.type = 'number';
        const grid = makeEl('div', { className: 'form-grid' });
        grid.append(d.wrap, w.wrap);
        form.append(grid);
        formButtons(form);
        form.addEventListener('submit', e => { e.preventDefault(); const fd = formDataObject(form), val = weightInputToKg(fd.value); if (!validateDate(fd.date, true) || !Number.isFinite(val) || val < 20 || val > 400) {
            showToast('Проверьте дату и значение веса.');
            return;
        } upsertRecord('measurements', { type: 'weight', value: round(val, 3), date: fd.date }, existing); });
        body.append(form);
    }
    function buildSimpleMeasurementForm(body, existing, type) {
        const config = { restingHeartRate: { label: 'Пульс в покое, уд/мин', min: 20, max: 250, step: 1 }, bodyFat: { label: 'Процент жира, %', min: 1, max: 75, step: .1 }, waist: { label: `Талия, ${getUnits() === 'imperial' ? 'in' : 'см'}`, min: getUnits() === 'imperial' ? 10 : 25, max: getUnits() === 'imperial' ? 100 : 250, step: .1 }, spo2: { label: 'SpO₂, %', min: 50, max: 100, step: .1 }, temperature: { label: `Температура, ${getUnits() === 'imperial' ? '°F' : '°C'}`, min: getUnits() === 'imperial' ? 86 : 30, max: getUnits() === 'imperial' ? 113 : 45, step: .1 } }[type];
        const form = makeEl('form', { className: 'form' });
        const d = field('Дата', 'date', 'text', { required: true, max: todayISO() }, existing?.date || todayISO());
        d.input.type = 'date';
        let val = existing?.value ?? '';
        if (existing && type === 'waist')
            val = round(lengthDisplay(existing.value).value, 1);
        if (existing && type === 'temperature')
            val = round(tempDisplay(existing.value).value, 1);
        const v = field(config.label, 'value', 'text', { required: true, min: String(config.min), max: String(config.max), step: String(config.step), inputmode: 'decimal' }, val);
        v.input.type = 'number';
        const grid = makeEl('div', { className: 'form-grid' });
        grid.append(d.wrap, v.wrap);
        form.append(grid);
        formButtons(form);
        form.addEventListener('submit', e => { e.preventDefault(); const fd = formDataObject(form); let n = parseFlexibleNumber(fd.value); if (type === 'waist')
            n = lengthInputToCm(fd.value); if (type === 'temperature')
            n = tempInputToC(fd.value); const raw = parseFlexibleNumber(fd.value); if (!validateDate(fd.date, true) || !Number.isFinite(n) || !Number.isFinite(raw) || raw < config.min || raw > config.max) {
            showToast('Проверьте введённое значение.');
            return;
        } upsertRecord('measurements', { type, value: round(n, 3), date: fd.date }, existing); });
        body.append(form);
    }
    function buildBpForm(body, existing) {
        const form = makeEl('form', { className: 'form' });
        const grid = makeEl('div', { className: 'form-grid' });
        const fields = [field('Систолическое, мм рт. ст.', 'systolic', 'text', { required: true, min: '50', max: '300', step: '1' }, existing?.systolic || ''), field('Диастолическое, мм рт. ст.', 'diastolic', 'text', { required: true, min: '30', max: '200', step: '1' }, existing?.diastolic || ''), field('Пульс, уд/мин', 'pulse', 'text', { required: true, min: '20', max: '250', step: '1' }, existing?.pulse || ''), field('Дата', 'date', 'text', { required: true, max: todayISO() }, existing?.date || todayISO()), field('Время', 'time', 'text', { required: true }, existing?.time || new Date().toTimeString().slice(0, 5))];
        fields.slice(0, 3).forEach(f => f.input.type = 'number');
        fields[3].input.type = 'date';
        fields[4].input.type = 'time';
        fields.forEach(f => grid.append(f.wrap));
        const note = field('Заметка', 'note', 'textarea', { full: true, maxlength: '500' }, existing?.note || '');
        grid.append(note.wrap);
        form.append(grid, makeEl('div', { className: 'inline-note', text: 'Система не ставит диагноз по давлению. При заметном отличии от вашего обычного диапазона учитывайте контекст и при необходимости обсудите измерения с врачом.' }));
        formButtons(form);
        form.addEventListener('submit', e => { e.preventDefault(); const fd = formDataObject(form); const s = validateNumber(fd.systolic, { min: 50, max: 300, required: true }), di = validateNumber(fd.diastolic, { min: 30, max: 200, required: true }), p = validateNumber(fd.pulse, { min: 20, max: 250, required: true }); if (!s.ok || !di.ok || !p.ok || !validateDate(fd.date, true) || !fd.time) {
            showToast('Проверьте значения давления, пульса и дату.');
            return;
        } upsertRecord('measurements', { type: 'bloodPressure', systolic: s.value, diastolic: di.value, pulse: p.value, date: fd.date, time: fd.time, note: String(fd.note || '').trim() }, existing); });
        body.append(form);
    }
    function buildSleepForm(body, existing) {
        const form = makeEl('form', { className: 'form' });
        const grid = makeEl('div', { className: 'form-grid' });
        const d = field('Дата ночи', 'date', 'text', { required: true, max: todayISO() }, existing?.date || shiftDate(-1));
        d.input.type = 'date';
        const dur = field('Длительность, часы', 'durationHours', 'text', { required: true, min: '0', max: '24', step: '0.1', inputmode: 'decimal' }, existing?.durationHours ?? '');
        dur.input.type = 'number';
        const q = field('Качество, 1–10', 'quality', 'text', { required: true, min: '1', max: '10', step: '1' }, existing?.quality ?? '');
        q.input.type = 'number';
        const bed = field('Время сна', 'bedtime', 'text', {}, existing?.bedtime || '');
        bed.input.type = 'time';
        const wake = field('Время пробуждения', 'wakeTime', 'text', {}, existing?.wakeTime || '');
        wake.input.type = 'time';
        const aw = field('Ночные пробуждения', 'awakenings', 'text', { min: '0', max: '50', step: '1' }, existing?.awakenings ?? '');
        aw.input.type = 'number';
        [d, dur, q, bed, wake, aw].forEach(f => grid.append(f.wrap));
        const note = field('Заметка', 'note', 'textarea', { full: true, maxlength: '500' }, existing?.note || '');
        grid.append(note.wrap);
        form.append(grid);
        formButtons(form);
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = formDataObject(form);
            const duration = validateNumber(fd.durationHours, { min: 0, max: 24, required: true }), quality = validateNumber(fd.quality, { min: 1, max: 10, required: true }), awaken = validateNumber(fd.awakenings, { min: 0, max: 50 });
            if (!validateDate(fd.date, true) || !duration.ok || !quality.ok || !awaken.ok) {
                showToast('Проверьте дату, длительность и качество сна.');
                return;
            }
            if (!existing) {
                const same = profileRecords('sleep').find(x => x.date === fd.date);
                if (same) {
                    const ok = await askConfirm('Запись сна уже существует', 'Для этой даты уже есть запись. Заменить её новой?', 'Заменить', false);
                    if (!ok)
                        return;
                    existing = same;
                }
            }
            upsertRecord('sleep', { date: fd.date, durationHours: round(duration.value, 2), quality: quality.value, bedtime: fd.bedtime || '', wakeTime: fd.wakeTime || '', awakenings: awaken.value ?? 0, note: String(fd.note || '').trim() }, existing);
        });
        body.append(form);
    }
    function buildActivityForm(body, existing) {
        const form = makeEl('form', { className: 'form' });
        const grid = makeEl('div', { className: 'form-grid' });
        const d = field('Дата', 'date', 'text', { required: true, max: todayISO() }, existing?.date || todayISO());
        d.input.type = 'date';
        const st = field('Шаги', 'steps', 'text', { required: true, min: '0', max: '200000', step: '1' }, existing?.steps ?? '');
        st.input.type = 'number';
        const am = field('Активные минуты', 'activeMinutes', 'text', { min: '0', max: '1440', step: '1' }, existing?.activeMinutes ?? '');
        am.input.type = 'number';
        const cm = field('Кардио, минут', 'cardioMinutes', 'text', { min: '0', max: '1440', step: '1' }, existing?.cardioMinutes ?? '');
        cm.input.type = 'number';
        const dist = field(`Дистанция, ${getUnits() === 'imperial' ? 'mi' : 'км'}`, 'distance', 'text', { min: '0', max: getUnits() === 'imperial' ? '625' : '1000', step: '0.1' }, existing ? round(distanceDisplay(existing.distanceKm || 0).value, 1) : '');
        dist.input.type = 'number';
        [d, st, am, cm, dist].forEach(f => grid.append(f.wrap));
        form.append(grid);
        formButtons(form);
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = formDataObject(form);
            const steps = validateNumber(fd.steps, { min: 0, max: 200000, required: true }), active = validateNumber(fd.activeMinutes, { min: 0, max: 1440 }), cardio = validateNumber(fd.cardioMinutes, { min: 0, max: 1440 }), distance = distanceInputToKm(fd.distance || 0);
            if (!validateDate(fd.date, true) || !steps.ok || !active.ok || !cardio.ok || !Number.isFinite(distance) || distance < 0 || distance > 1000) {
                showToast('Проверьте данные активности.');
                return;
            }
            if (!existing) {
                const same = profileRecords('activity').find(x => x.date === fd.date);
                if (same) {
                    const ok = await askConfirm('Активность за этот день уже есть', 'Заменить дневную запись новыми значениями?', 'Заменить', false);
                    if (!ok)
                        return;
                    existing = same;
                }
            }
            upsertRecord('activity', { date: fd.date, steps: steps.value, activeMinutes: active.value ?? 0, cardioMinutes: cardio.value ?? 0, distanceKm: round(distance, 3) }, existing);
        });
        body.append(form);
    }
    function buildTrainingForm(body, existing) {
        const form = makeEl('form', { className: 'form' });
        const grid = makeEl('div', { className: 'form-grid' });
        const d = field('Дата', 'date', 'text', { required: true, max: todayISO() }, existing?.date || todayISO());
        d.input.type = 'date';
        const type = field('Тип', 'type', 'select', { required: true, options: [['', 'Выберите'], ['Силовая', 'Силовая'], ['Кардио', 'Кардио'], ['Смешанная', 'Смешанная'], ['Мобильность', 'Мобильность'], ['Спорт', 'Спорт'], ['Другое', 'Другое']] }, existing?.type || '');
        const name = field('Название', 'name', 'text', { required: true, maxlength: '100' }, existing?.name || '');
        const duration = field('Длительность, минут', 'durationMinutes', 'text', { required: true, min: '1', max: '600', step: '1' }, existing?.durationMinutes ?? '');
        duration.input.type = 'number';
        const rpe = field('RPE, 1–10', 'rpe', 'text', { required: true, min: '1', max: '10', step: '1' }, existing?.rpe ?? '');
        rpe.input.type = 'number';
        [d, type, name, duration, rpe].forEach(f => grid.append(f.wrap));
        const note = field('Заметка', 'note', 'textarea', { full: true, maxlength: '500' }, existing?.note || '');
        grid.append(note.wrap);
        form.append(grid);
        formButtons(form);
        form.addEventListener('submit', e => { e.preventDefault(); const fd = formDataObject(form), dur = validateNumber(fd.durationMinutes, { min: 1, max: 600, required: true }), r = validateNumber(fd.rpe, { min: 1, max: 10, required: true }); if (!validateDate(fd.date, true) || !fd.type || !String(fd.name || '').trim() || !dur.ok || !r.ok) {
            showToast('Проверьте поля тренировки.');
            return;
        } upsertRecord('training', { date: fd.date, type: fd.type, name: String(fd.name).trim(), durationMinutes: dur.value, rpe: r.value, note: String(fd.note || '').trim() }, existing); });
        body.append(form);
    }
    function buildNutritionForm(body, existing) {
        const form = makeEl('form', { className: 'form' });
        const grid = makeEl('div', { className: 'form-grid three' });
        const defs = [['date', 'Дата', 'date', null, null, null], ['calories', 'Калории, ккал', 'number', 0, 20000, 1], ['protein', 'Белок, г', 'number', 0, 1000, .1], ['fat', 'Жиры, г', 'number', 0, 1000, .1], ['carbs', 'Углеводы, г', 'number', 0, 3000, .1], ['fiber', 'Клетчатка, г', 'number', 0, 300, .1], ['waterLiters', 'Вода, л', 'number', 0, 20, .1]];
        defs.forEach(([name, label, type, min, max, step]) => { const val = name === 'date' ? (existing?.date || todayISO()) : (existing?.[name] ?? ''); const f = field(label, name, 'text', { required: true, min: min !== null ? String(min) : undefined, max: max !== null ? String(max) : undefined, step: step !== null ? String(step) : undefined }, val); f.input.type = type; grid.append(f.wrap); });
        form.append(grid);
        formButtons(form);
        form.addEventListener('submit', async (e) => { e.preventDefault(); const fd = formDataObject(form); if (!validateDate(fd.date, true)) {
            showToast('Проверьте дату.');
            return;
        } const vals = {}; for (const key of ['calories', 'protein', 'fat', 'carbs', 'fiber', 'waterLiters']) {
            const v = validateNumber(fd[key], { min: 0, required: true });
            if (!v.ok) {
                showToast('Проверьте значения питания.');
                return;
            }
            vals[key] = v.value;
        } if (!existing) {
            const same = profileRecords('nutrition').find(x => x.date === fd.date);
            if (same) {
                const ok = await askConfirm('Итог за этот день уже есть', 'Заменить дневной агрегат новыми значениями?', 'Заменить', false);
                if (!ok)
                    return;
                existing = same;
            }
        } upsertRecord('nutrition', { date: fd.date, ...vals }, existing); });
        body.append(form);
    }
    function buildLabForm(body, existing) {
        const form = makeEl('form', { className: 'form' });
        const datalist = makeEl('datalist', { attrs: { id: 'lab-suggestions' } });
        LAB_SUGGESTIONS.forEach(x => datalist.append(makeEl('option', { attrs: { value: x } })));
        const grid = makeEl('div', { className: 'form-grid' });
        const name = field('Название показателя', 'name', 'text', { required: true, maxlength: '120', list: 'lab-suggestions' }, existing?.name || '');
        const value = field('Значение', 'value', 'text', { required: true, inputmode: 'decimal', autocomplete: 'off' }, existing?.value ?? '');
        const unit = field('Единицы', 'unit', 'text', { required: true, maxlength: '40' }, existing?.unit || '');
        const min = field('Нижний референс', 'referenceMin', 'text', { inputmode: 'decimal', autocomplete: 'off' }, existing?.referenceMin ?? '');
        const max = field('Верхний референс', 'referenceMax', 'text', { inputmode: 'decimal', autocomplete: 'off' }, existing?.referenceMax ?? '');
        const date = field('Дата', 'date', 'text', { required: true, max: todayISO() }, existing?.date || todayISO());
        date.input.type = 'date';
        const lab = field('Лаборатория', 'laboratory', 'text', { maxlength: '120' }, existing?.laboratory || '');
        [name, value, unit, min, max, date, lab].forEach(f => grid.append(f.wrap));
        const comment = field('Комментарий', 'comment', 'textarea', { full: true, maxlength: '700' }, existing?.comment || '');
        grid.append(comment.wrap);
        form.append(datalist, grid, makeEl('div', { className: 'inline-note', text: 'Статус «ниже / выше / в диапазоне» сравнивает значение только с введёнными вами референсами. Это не диагноз.' }));
        formButtons(form);
        form.addEventListener('submit', e => { e.preventDefault(); const fd = formDataObject(form); const v = validateNumber(fd.value, { required: true }), mi = validateNumber(fd.referenceMin), ma = validateNumber(fd.referenceMax); if (!String(fd.name || '').trim() || !v.ok || !String(fd.unit || '').trim() || !validateDate(fd.date, true) || !mi.ok || !ma.ok) {
            showToast('Проверьте название, значение, единицы и дату.');
            return;
        } if (mi.value !== null && ma.value !== null && mi.value > ma.value) {
            showToast('Нижний референс не может быть выше верхнего.');
            return;
        } upsertRecord('labs', { name: String(fd.name).trim(), value: v.value, unit: String(fd.unit).trim(), referenceMin: mi.value, referenceMax: ma.value, date: fd.date, laboratory: String(fd.laboratory || '').trim(), comment: String(fd.comment || '').trim() }, existing); });
        body.append(form);
    }
    function buildMedicationForm(body, existing, options = {}) {
        const existingCollection = existing ? (state.data.medications.some(x => x.id === existing.id) ? 'medications' : 'supplements') : null;
        const forcedKind = options.kind || null;
        const form = makeEl('form', { className: 'form' });
        const grid = makeEl('div', { className: 'form-grid' });
        const kindOptions = [];
        if (isEnabled('medications'))
            kindOptions.push(['medications', 'Лекарство']);
        if (isEnabled('supplements'))
            kindOptions.push(['supplements', 'Добавка']);
        const kind = field('Тип', 'kind', 'select', { required: true, options: kindOptions }, existingCollection || (forcedKind === 'supplement' ? 'supplements' : 'medications'));
        const name = field('Название', 'name', 'text', { required: true, maxlength: '120' }, existing?.name || '');
        const dose = field('Дозировка', 'dosage', 'text', { step: 'any', min: '0', inputmode: 'decimal' }, existing?.dosage ?? '');
        dose.input.type = 'number';
        const unit = field('Единица', 'unit', 'text', { maxlength: '40' }, existing?.unit || '');
        const freq = field('Частота', 'frequency', 'text', { required: true, maxlength: '120' }, existing?.frequency || '');
        const start = field('Дата начала', 'startDate', 'text', { required: true }, existing?.startDate || todayISO());
        start.input.type = 'date';
        const end = field('Дата окончания', 'endDate', 'text', {}, existing?.endDate || '');
        end.input.type = 'date';
        const reason = field('Причина / контекст', 'reason', 'text', { maxlength: '200' }, existing?.reason || '');
        const status = field('Статус', 'status', 'select', { required: true, options: [['active', 'Активно'], ['paused', 'Пауза'], ['completed', 'Завершено']] }, existing?.status || 'active');
        [kind, name, dose, unit, freq, start, end, reason, status].forEach(f => grid.append(f.wrap));
        const note = field('Заметка', 'note', 'textarea', { full: true, maxlength: '700' }, existing?.note || '');
        grid.append(note.wrap);
        form.append(grid, makeEl('div', { className: 'inline-note warning', text: 'Markov Health OS не назначает препараты и не рекомендует их отменять. Любые изменения терапии обсуждайте с квалифицированным специалистом.' }));
        formButtons(form);
        form.addEventListener('submit', e => {
            e.preventDefault();
            const fd = formDataObject(form);
            const dosage = validateNumber(fd.dosage, { min: 0 });
            if (!fd.kind || !String(fd.name || '').trim() || !String(fd.frequency || '').trim() || !validateDate(fd.startDate, true) || !validateDate(fd.endDate, false) || !dosage.ok) {
                showToast('Проверьте обязательные поля препарата.');
                return;
            }
            if (fd.endDate && parseLocalDate(fd.endDate) < parseLocalDate(fd.startDate)) {
                showToast('Дата окончания не может быть раньше даты начала.');
                return;
            }
            const record = { name: String(fd.name).trim(), dosage: dosage.value, unit: String(fd.unit || '').trim(), frequency: String(fd.frequency).trim(), startDate: fd.startDate, endDate: fd.endDate || '', reason: String(fd.reason || '').trim(), note: String(fd.note || '').trim(), status: fd.status };
            if (existing && existingCollection !== fd.kind) {
                const profileId = state.data.activeProfileId;
                const ok = mutateAndSave(data => { const oldIdx = data[existingCollection].findIndex(x => x.id === existing.id && x.profileId === profileId); if (oldIdx < 0)
                    throw new Error('RECORD_NOT_FOUND'); data[existingCollection].splice(oldIdx, 1); data[fd.kind].push({ ...existing, ...record, profileId, updatedAt: dateTimeStamp() }); const p = data.profiles.find(x => x.id === profileId); if (p)
                    p.dataDeclarations = { ...p.dataDeclarations, [fd.kind]: 'has' }; }, { rerender: 'none' });
                if (ok) {
                    state.modalDirty = false;
                    closeModal(true);
                    renderCurrentRoute();
                    showToast('Препарат обновлён.');
                }
                return;
            }
            upsertRecord(fd.kind, record, existing);
        });
        body.append(form);
    }
    function buildSymptomForm(body, existing) {
        const form = makeEl('form', { className: 'form' });
        const grid = makeEl('div', { className: 'form-grid' });
        const name = field('Название', 'name', 'text', { required: true, maxlength: '120' }, existing?.name || '');
        const date = field('Дата', 'date', 'text', { required: true, max: todayISO() }, existing?.date || todayISO());
        date.input.type = 'date';
        const intensity = field('Интенсивность, 1–10', 'intensity', 'text', { required: true, min: '1', max: '10', step: '1' }, existing?.intensity ?? '');
        intensity.input.type = 'number';
        const duration = field('Продолжительность', 'duration', 'text', { maxlength: '100' }, existing?.duration || '');
        [name, date, intensity, duration].forEach(f => grid.append(f.wrap));
        const note = field('Заметка', 'note', 'textarea', { full: true, maxlength: '700' }, existing?.note || '');
        grid.append(note.wrap);
        form.append(grid);
        formButtons(form);
        form.addEventListener('submit', e => { e.preventDefault(); const fd = formDataObject(form), i = validateNumber(fd.intensity, { min: 1, max: 10, required: true }); if (!String(fd.name || '').trim() || !validateDate(fd.date, true) || !i.ok) {
            showToast('Проверьте название, дату и интенсивность.');
            return;
        } upsertRecord('symptoms', { name: String(fd.name).trim(), date: fd.date, intensity: i.value, duration: String(fd.duration || '').trim(), note: String(fd.note || '').trim() }, existing); });
        body.append(form);
    }
    function buildGoalForm(body, existing) {
        const form = makeEl('form', { className: 'form' });
        const grid = makeEl('div', { className: 'form-grid' });
        const name = field('Название', 'name', 'text', { required: true, maxlength: '140' }, existing?.name || '');
        const catOptions = [['', 'Выберите'], ...GOAL_OPTIONS.map(x => [x, x])];
        const category = field('Категория', 'category', 'select', { required: true, options: catOptions }, existing?.category || '');
        const start = field('Начальное значение', 'startValue', 'text', { required: true, step: 'any' }, existing?.startValue ?? '');
        start.input.type = 'number';
        const target = field('Целевое значение', 'targetValue', 'text', { required: true, step: 'any' }, existing?.targetValue ?? '');
        target.input.type = 'number';
        const current = field('Текущее значение', 'currentValue', 'text', { required: true, step: 'any' }, existing?.currentValue ?? '');
        current.input.type = 'number';
        const unit = field('Единица', 'unit', 'text', { required: true, maxlength: '30' }, existing?.unit || '');
        const startDate = field('Дата начала', 'startDate', 'text', { required: true }, existing?.startDate || todayISO());
        startDate.input.type = 'date';
        const deadline = field('Срок', 'deadline', 'text', {}, existing?.deadline || '');
        deadline.input.type = 'date';
        [name, category, start, target, current, unit, startDate, deadline].forEach(f => grid.append(f.wrap));
        form.append(grid);
        formButtons(form);
        form.addEventListener('submit', e => { e.preventDefault(); const fd = formDataObject(form), s = validateNumber(fd.startValue, { required: true }), t = validateNumber(fd.targetValue, { required: true }), c = validateNumber(fd.currentValue, { required: true }); if (!String(fd.name || '').trim() || !fd.category || !s.ok || !t.ok || !c.ok || !String(fd.unit || '').trim() || !validateDate(fd.startDate, true) || !validateDate(fd.deadline, false)) {
            showToast('Проверьте поля цели.');
            return;
        } if (fd.deadline && parseLocalDate(fd.deadline) < parseLocalDate(fd.startDate)) {
            showToast('Срок не может быть раньше даты начала.');
            return;
        } upsertRecord('goals', { name: String(fd.name).trim(), category: fd.category, startValue: s.value, targetValue: t.value, currentValue: c.value, unit: String(fd.unit).trim(), startDate: fd.startDate, deadline: fd.deadline || '' }, existing); });
        body.append(form);
    }
    function buildNoteForm(body, existing) {
        const form = makeEl('form', { className: 'form' });
        const grid = makeEl('div', { className: 'form-grid' });
        const date = field('Дата', 'date', 'text', { required: true, max: todayISO() }, existing?.date || todayISO());
        date.input.type = 'date';
        const time = field('Время', 'time', 'text', {}, existing?.time || new Date().toTimeString().slice(0, 5));
        time.input.type = 'time';
        grid.append(date.wrap, time.wrap);
        const text = field('Заметка', 'text', 'textarea', { full: true, required: true, maxlength: '3000' }, existing?.text || '');
        grid.append(text.wrap);
        form.append(grid);
        formButtons(form);
        form.addEventListener('submit', e => { e.preventDefault(); const fd = formDataObject(form); if (!validateDate(fd.date, true) || !String(fd.text || '').trim()) {
            showToast('Добавьте дату и текст заметки.');
            return;
        } upsertRecord('notes', { date: fd.date, time: fd.time || '', text: String(fd.text).trim() }, existing); });
        body.append(form);
    }
    function openLifestyleTargets() {
        const profile = getProfile();
        openModal('Цели образа жизни', 'ПЕРСОНАЛИЗАЦИЯ', body => { const form = makeEl('form', { className: 'form' }); const grid = makeEl('div', { className: 'form-grid' }); const steps = field('Цель по шагам / день', 'stepGoal', 'text', { min: '0', max: '100000', step: '100', hint: 'Оставьте пустым, если не хотите рассчитывать прогресс.' }, profile.lifestyle?.stepGoal ?? ''); steps.input.type = 'number'; const sleep = field('Цель сна, часов', 'sleepGoalHours', 'text', { min: '0', max: '24', step: '0.1', hint: 'Используется для Health Score и sleep insight.' }, profile.lifestyle?.sleepGoalHours ?? ''); sleep.input.type = 'number'; grid.append(steps.wrap, sleep.wrap); form.append(grid); formButtons(form); form.addEventListener('submit', e => { e.preventDefault(); const fd = formDataObject(form), s = validateNumber(fd.stepGoal, { min: 0, max: 100000 }), sl = validateNumber(fd.sleepGoalHours, { min: 0, max: 24 }); if (!s.ok || !sl.ok) {
            showToast('Проверьте цели образа жизни.');
            return;
        } const profileId = state.data.activeProfileId; const ok = mutateAndSave(data => { const p = data.profiles.find(x => x.id === profileId); if (!p)
            throw new Error('PROFILE_NOT_FOUND'); p.lifestyle = { ...(p.lifestyle || {}), stepGoal: s.value, sleepGoalHours: sl.value }; }, { rerender: 'none' }); if (ok) {
            state.modalDirty = false;
            closeModal(true);
            renderCurrentRoute();
            showToast('Цели образа жизни сохранены.');
        } }); body.append(form); });
    }
    function openAbout() {
        openModal('О продукте', 'MARKOV HEALTH OS', body => { const wrap = makeEl('div', { className: 'form' }); wrap.append(makeEl('div', { className: 'wow-icon', text: 'M' }), makeEl('h2', { text: 'MARKOV HEALTH OS' }), makeEl('p', { text: 'Персональная операционная система для системного управления данными о здоровье.' }), makeEl('div', { className: 'inline-note', text: 'Данные хранятся локально на устройстве. Markov Health OS не является медицинским изделием, не ставит диагнозы и не заменяет врача.' }), makeEl('p', { className: 'section-subtitle version-chip', text: `Markov Health OS v${APP_VERSION} · schema v${DATA_VERSION}` }), makeEl('p', { className: 'section-subtitle', text: 'Product concept & development — Pavel Markov' })); const link = makeEl('a', { className: 'btn secondary', text: 'Health-OS на GitHub', attrs: { href: 'https://github.com/alxyrgin/health-os', target: '_blank', rel: 'noreferrer' } }); wrap.append(makeEl('p', { className: 'section-subtitle', text: 'Концептуально вдохновлено open-source проектом Health-OS. Код исходного проекта в этой реализации не используется.' }), link); body.append(wrap); }, false);
    }
    // ===== BACKUP, IMPORT, EXPORT & BRIEFS =====
    function totalRecordCount(data = state.data) { return RECORD_COLLECTIONS.reduce((sum, key) => sum + (Array.isArray(data?.[key]) ? data[key].length : 0), 0); }
    function storageBytes(data = state.data) { try {
        return new Blob([JSON.stringify(data)]).size;
    }
    catch (_) {
        return 0;
    } }
    function humanBytes(bytes) { if (bytes < 1024)
        return `${bytes} Б`; if (bytes < 1048576)
        return `${(bytes / 1024).toFixed(1)} КБ`; return `${(bytes / 1048576).toFixed(1)} МБ`; }
    function backupPayload() { const payload = deepClone(state.data); payload.version = DATA_VERSION; payload.backupMetadata = { application: BACKUP_APP_ID, appVersion: APP_VERSION, schemaVersion: DATA_VERSION, exportedAt: dateTimeStamp(), profileCount: payload.profiles.length, recordCount: totalRecordCount(payload) }; return payload; }
    function cleanImportedPayload(payload) { const copy = deepClone(payload); delete copy.backupMetadata; return copy; }
    function validateBackupMetadata(payload) {
        const meta = payload?.backupMetadata;
        if (meta === undefined)
            return { ok: true };
        if (!meta || typeof meta !== 'object' || Array.isArray(meta))
            return { ok: false, message: 'Метаданные резервной копии повреждены.' };
        const allowed = new Set(['application', 'appVersion', 'schemaVersion', 'exportedAt', 'profileCount', 'recordCount']);
        if (Object.keys(meta).some(key => !allowed.has(key)))
            return { ok: false, message: 'Метаданные содержат неподдерживаемые поля.' };
        if (meta.application !== BACKUP_APP_ID)
            return { ok: false, message: 'Файл создан другим приложением или имеет неподдерживаемый идентификатор.' };
        if (meta.appVersion !== undefined && (typeof meta.appVersion !== 'string' || !meta.appVersion.trim() || meta.appVersion.length > 40))
            return { ok: false, message: 'Некорректная версия приложения в метаданных.' };
        if (meta.schemaVersion !== undefined && (!Number.isInteger(meta.schemaVersion) || meta.schemaVersion !== Number(payload.version || 1)))
            return { ok: false, message: 'Версия схемы в метаданных не совпадает с данными.' };
        if (meta.exportedAt !== undefined && (typeof meta.exportedAt !== 'string' || !Number.isFinite(Date.parse(meta.exportedAt))))
            return { ok: false, message: 'Некорректная дата экспорта в метаданных.' };
        if (meta.profileCount !== undefined && (!Number.isInteger(meta.profileCount) || meta.profileCount < 0))
            return { ok: false, message: 'Некорректное число профилей в метаданных.' };
        if (meta.recordCount !== undefined && (!Number.isInteger(meta.recordCount) || meta.recordCount < 0))
            return { ok: false, message: 'Некорректное число записей в метаданных.' };
        if (meta.profileCount !== undefined && Array.isArray(payload?.profiles) && meta.profileCount !== payload.profiles.length)
            return { ok: false, message: 'Число профилей в метаданных не совпадает с содержимым файла.' };
        if (meta.recordCount !== undefined && meta.recordCount !== totalRecordCount(payload))
            return { ok: false, message: 'Число записей в метаданных не совпадает с содержимым файла.' };
        return { ok: true };
    }
    function isBase64(value) { return typeof value === 'string' && value.length > 0 && value.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value); }
    function validateEncryptedEnvelope(envelope) {
        if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope))
            return { ok: false, message: 'Структура защищённой копии повреждена.' };
        if (envelope.application !== BACKUP_APP_ID || envelope.format !== 'MHOS_ENCRYPTED_BACKUP')
            return { ok: false, message: 'Файл не является защищённой копией Markov Health OS.' };
        if (envelope.formatVersion !== 1 || envelope.kdf !== 'PBKDF2-SHA256' || envelope.cipher !== 'AES-GCM')
            return { ok: false, message: 'Версия или криптографический формат защищённой копии не поддерживается.' };
        if (!Number.isInteger(envelope.iterations) || envelope.iterations !== 210000)
            return { ok: false, message: 'Параметры защищённой копии не поддерживаются.' };
        if (!isBase64(envelope.salt) || !isBase64(envelope.iv) || !isBase64(envelope.ciphertext))
            return { ok: false, message: 'Криптографические данные копии повреждены.' };
        try {
            if (base64ToBytes(envelope.salt).length !== 16 || base64ToBytes(envelope.iv).length !== 12 || base64ToBytes(envelope.ciphertext).length < 17)
                return { ok: false, message: 'Криптографические параметры копии имеют неверный размер.' };
        }
        catch (_) {
            return { ok: false, message: 'Криптографические данные копии повреждены.' };
        }
        return { ok: true };
    }
    function exportData() {
        if (state.demoMode) {
            showToast('Экспорт отключён в демо: демо-данные не являются вашим хранилищем.');
            return;
        }
        const payload = backupPayload();
        const filename = `markov-health-os-backup-${todayISO()}.json`;
        if (!downloadFile(filename, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8'))
            return;
        mutateAndSave(data => {
            data.settings.lastBackupAt = dateTimeStamp();
            data.settings.lastBackupRecordCount = totalRecordCount(data);
        }, { rerender: 'current' });
        showToast('JSON backup экспортирован. Файл не зашифрован — храните его как чувствительные персональные данные.', { timeout: 7000 });
    }
    function bytesToBase64(bytes) { let binary = ''; bytes.forEach(b => binary += String.fromCharCode(b)); return btoa(binary); }
    function base64ToBytes(value) { const binary = atob(value); const out = new Uint8Array(binary.length); for (let i = 0; i < binary.length; i++)
        out[i] = binary.charCodeAt(i); return out; }
    async function deriveBackupKey(password, salt, iterations = 210000) { const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); }
    function askPassword(title, description, confirmLabel = 'Продолжить') {
        return new Promise(resolve => { let settled = false; const finish = value => { if (settled)
            return; settled = true; resolve(value); }; openModal(title, 'ЗАЩИЩЁННАЯ РЕЗЕРВНАЯ КОПИЯ', body => { body.append(makeEl('p', { className: 'section-subtitle', text: description })); const form = makeEl('form', { className: 'form' }); const f = field('Пароль', 'backupPassword', 'text', { required: true, minlength: '8', maxlength: '200', autocomplete: 'current-password', full: true }, ''); f.input.type = 'password'; form.append(f.wrap); const actions = makeEl('div', { className: 'form-actions' }); const cancel = actionButton('Отмена', () => { finish(null); closeModal(true); }, 'secondary'); const ok = makeEl('button', { className: 'btn primary', text: confirmLabel, attrs: { type: 'submit' } }); actions.append(cancel, ok); form.append(actions); form.addEventListener('submit', e => { e.preventDefault(); const value = f.input.value; if (value.length < 8) {
            showToast('Используйте пароль длиной не менее 8 символов.');
            return;
        } finish(value); closeModal(true); }); body.append(form); requestAnimationFrame(() => f.input.focus()); }, false); dom.modal.addEventListener('close', () => finish(null), { once: true }); });
    }
    async function exportEncryptedBackup() {
        if (state.demoMode) {
            showToast('Защищённый экспорт отключён в демо.');
            return;
        }
        if (!globalThis.crypto?.subtle) {
            showToast('Web Crypto API недоступен в этом браузере.');
            return;
        }
        const password = await askPassword('Защищённая резервная копия', 'Пароль не сохраняется в Markov Health OS. Без него восстановить этот файл будет невозможно.', 'Зашифровать');
        if (!password)
            return;
        try {
            const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), iterations = 210000, key = await deriveBackupKey(password, salt, iterations);
            const plain = new TextEncoder().encode(JSON.stringify(backupPayload()));
            const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
            const envelope = { application: BACKUP_APP_ID, format: 'MHOS_ENCRYPTED_BACKUP', formatVersion: 1, kdf: 'PBKDF2-SHA256', iterations, cipher: 'AES-GCM', salt: bytesToBase64(salt), iv: bytesToBase64(iv), ciphertext: bytesToBase64(encrypted) };
            if (downloadFile(`markov-health-os-backup-${todayISO()}.mhos`, JSON.stringify(envelope, null, 2), 'application/json;charset=utf-8')) {
                mutateAndSave(data => { data.settings.lastBackupAt = dateTimeStamp(); data.settings.lastBackupRecordCount = totalRecordCount(data); }, { rerender: 'current' });
                showToast('Защищённая резервная копия создана.');
            }
        }
        catch (_) {
            showToast('Не удалось создать защищённую резервную копию.');
        }
    }
    async function decryptBackupEnvelope(envelope) { if (!globalThis.crypto?.subtle)
        throw new Error('WEB_CRYPTO_UNAVAILABLE'); const password = await askPassword('Открыть защищённую копию', 'Введите пароль, использованный при создании файла.', 'Расшифровать'); if (!password)
        return null; try {
        const salt = base64ToBytes(envelope.salt), iv = base64ToBytes(envelope.iv), cipher = base64ToBytes(envelope.ciphertext), key = await deriveBackupKey(password, salt, Number(envelope.iterations) || 210000);
        const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
        return JSON.parse(new TextDecoder().decode(plain));
    }
    catch (_) {
        showToast('Не удалось расшифровать копию. Проверьте пароль и целостность файла.');
        return null;
    } }
    function backupSummary(data, metadata = null) {
        return {
            version: Number(data.version) || 1,
            exportedAt: metadata?.exportedAt || null,
            profiles: data.profiles.length,
            records: totalRecordCount(data),
            measurements: data.measurements.length,
            labs: data.labs.length,
            sleep: data.sleep.length,
            medications: data.medications.length + data.supplements.length,
            goals: data.goals.length
        };
    }
    function confirmImportPreview(summary) {
        return new Promise(resolve => {
            let settled = false;
            const finish = value => {
                if (settled)
                    return;
                settled = true;
                resolve(value);
            };
            openModal('Резервная копия проверена', 'ИМПОРТ ДАННЫХ', body => {
                body.append(makeEl('p', {
                    className: 'section-subtitle',
                    text: 'Файл прошёл проверку структуры. Импорт полностью заменит текущие локальные данные на этом устройстве.'
                }));
                const exportedAt = summary.exportedAt && Number.isFinite(Date.parse(summary.exportedAt))
                    ? new Date(summary.exportedAt).toLocaleString('ru-RU')
                    : 'Не указано';
                const grid = makeEl('div', { className: 'import-summary' });
                [
                    ['Схема', `v${summary.version}`],
                    ['Экспорт', exportedAt],
                    ['Профилей', summary.profiles],
                    ['Всего записей', summary.records],
                    ['Измерений', summary.measurements],
                    ['Анализов', summary.labs],
                    ['Сон', summary.sleep],
                    ['Препараты + добавки', summary.medications],
                    ['Целей', summary.goals]
                ].forEach(([label, value]) => {
                    const cell = makeEl('div');
                    cell.append(makeEl('strong', { text: String(value) }), makeEl('span', { text: label }));
                    grid.append(cell);
                });
                const warning = makeEl('div', {
                    className: 'inline-note warning',
                    text: 'Перед импортом текущие данные будут временно сохранены как safety copy. Если запись новой копии не пройдёт проверку, приложение восстановит прежнее состояние.'
                });
                const actions = makeEl('div', { className: 'form-actions' });
                actions.append(actionButton('Отмена', () => { finish(false); closeModal(true); }, 'secondary'), actionButton('Импортировать и заменить', () => { finish(true); closeModal(true); }, 'danger'));
                body.append(grid, warning, actions);
            }, false);
            dom.modal.addEventListener('close', () => finish(false), { once: true });
        });
    }
    async function importDataFromFile(file) {
        if (state.demoMode) {
            showToast('Выйдите из демо перед импортом.');
            return;
        }
        if (!file)
            return;
        if (file.size > MAX_IMPORT_BYTES) {
            showToast('Файл слишком большой для безопасного импорта (лимит 8 МБ).');
            return;
        }
        let parsed;
        try {
            parsed = JSON.parse(await file.text());
        }
        catch (_) {
            showToast('Файл не является корректной резервной копией JSON/.mhos.');
            return;
        }
        if (parsed?.format === 'MHOS_ENCRYPTED_BACKUP') {
            const envelopeCheck = validateEncryptedEnvelope(parsed);
            if (!envelopeCheck.ok) {
                showToast(envelopeCheck.message);
                return;
            }
            parsed = await decryptBackupEnvelope(parsed);
            if (!parsed)
                return;
        }
        const metadataCheck = validateBackupMetadata(parsed);
        if (!metadataCheck.ok) {
            showToast(`Импорт отклонён: ${metadataCheck.message}`);
            return;
        }
        const backupMetadata = parsed?.backupMetadata ? deepClone(parsed.backupMetadata) : null;
        const raw = cleanImportedPayload(parsed);
        const preflight = validateDataStructure(raw);
        if (!preflight.ok) {
            showToast(`Импорт отклонён: ${preflight.errors[0] || 'структура файла некорректна.'}`);
            return;
        }
        let migrated;
        try {
            migrated = migrateData(raw, { repairIds: false });
        }
        catch (error) {
            showToast(error.message === 'UNSUPPORTED_FUTURE_SCHEMA' ? 'Эта копия создана более новой версией Markov Health OS.' : 'Не удалось выполнить миграцию резервной копии.');
            return;
        }
        const finalCheck = validateDataStructure(migrated, { allowLegacy: false });
        if (!finalCheck.ok) {
            showToast(`Импорт отклонён после миграции: ${finalCheck.errors[0]}`);
            return;
        }
        if (!migrated.profiles.length) {
            showToast('Импорт отклонён: резервная копия не содержит ни одного профиля.');
            return;
        }
        if (!(await confirmImportPreview(backupSummary(migrated, backupMetadata))))
            return;
        const old = deepClone(state.persistentData || createEmptyData());
        try {
            localStorage.setItem(SAFETY_BACKUP_KEY, JSON.stringify(old));
        }
        catch (_) {
            showToast('Не удалось создать safety copy перед импортом. Импорт отменён.');
            return;
        }
        state.data = deepClone(migrated);
        if (!saveData()) {
            state.data = deepClone(old);
            return;
        }
        try {
            const verify = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
            const check = validateDataStructure(verify, { allowLegacy: false });
            if (!check.ok)
                throw new Error('POST_IMPORT_VERIFY_FAILED');
            state.persistentData = deepClone(verify);
            state.data = deepClone(verify);
            localStorage.removeItem(SAFETY_BACKUP_KEY);
        }
        catch (_) {
            let restored = false;
            try {
                const serializedOld = JSON.stringify(old);
                localStorage.setItem(STORAGE_KEY, serializedOld);
                restored = localStorage.getItem(STORAGE_KEY) === serializedOld;
                if (restored)
                    localStorage.removeItem(SAFETY_BACKUP_KEY);
            }
            catch (__) { }
            state.persistentData = deepClone(old);
            state.data = deepClone(old);
            setStorageStatus(restored ? 'saved' : 'error');
            showToast(restored ? 'Импорт не прошёл финальную проверку. Предыдущие данные восстановлены.' : 'Импорт не прошёл проверку, а автоматическое восстановление storage не подтвердилось. Safety copy сохранена; не закрывайте вкладку до экспорта данных.');
            renderApp();
            return;
        }
        state.route = 'overview';
        renderApp();
        showToast('Резервная копия проверена и восстановлена.');
    }
    async function deleteProfile(profileId) {
        if (state.demoMode) {
            showToast('Демо-профиль существует только временно. Выйдите из демо.');
            return;
        }
        const p = state.data.profiles.find(x => x.id === profileId);
        if (!p)
            return;
        const ok = await askConfirm('Удалить текущий профиль?', `Профиль «${p.name}» и все связанные записи будут удалены.`, 'Удалить профиль', true);
        if (!ok)
            return;
        const snapshot = deepClone(state.data);
        const saved = mutateAndSave(data => { data.profiles = data.profiles.filter(x => x.id !== profileId); RECORD_COLLECTIONS.forEach(key => { data[key] = data[key].filter(x => x.profileId !== profileId); }); if (data.activeProfileId === profileId)
            data.activeProfileId = data.profiles[0]?.id || null; }, { rerender: 'app' });
        if (!saved)
            return;
        showToast('Профиль удалён.', { actionLabel: 'Отменить', onAction: () => { state.data = deepClone(snapshot); if (saveData())
                renderApp(); } });
    }
    function getInternalStorageEntries() { const entries = []; for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key === STORAGE_KEY || key === ONBOARDING_DRAFT_KEY || key === SAFETY_BACKUP_KEY || key.startsWith(`${SAFETY_BACKUP_KEY}-corrupt-`)))
            entries.push([key, localStorage.getItem(key)]);
    } return entries; }
    async function deleteAllData() {
        if (state.demoMode) {
            showToast('Выйдите из демо перед очисткой реальных данных.');
            return;
        }
        const ok = await askConfirm('Удалить все данные?', 'Будут удалены все профили, записи и внутренние safety copies Markov Health OS в этом браузере. Перед удалением рекомендуется экспортировать backup.', 'Удалить всё', true);
        if (!ok)
            return;
        const before = deepClone(state.persistentData || state.data), entries = getInternalStorageEntries();
        try {
            entries.forEach(([key]) => localStorage.removeItem(key));
            if (entries.some(([key]) => localStorage.getItem(key) !== null))
                throw new Error('DELETE_VERIFY_FAILED');
            state.persistentData = createEmptyData();
            state.data = deepClone(state.persistentData);
            state.route = 'overview';
            setStorageStatus('idle');
            renderApp();
            showToast('Все локальные данные Markov Health OS удалены.');
        }
        catch (_) {
            entries.forEach(([key, value]) => { try {
                if (value !== null)
                    localStorage.setItem(key, value);
            }
            catch (__) { } });
            state.persistentData = before;
            state.data = deepClone(before);
            setStorageStatus('error');
            renderApp();
            showToast('Не удалось подтвердить полное удаление данных. Предыдущее состояние восстановлено насколько это возможно.');
        }
    }
    async function deleteRecord(collection, id) {
        const idx = state.data[collection]?.findIndex(x => x.id === id && x.profileId === state.data.activeProfileId);
        if (idx < 0)
            return;
        const record = deepClone(state.data[collection][idx]);
        const ok = await askConfirm('Удалить запись?', 'Запись исчезнет из раздела и общей истории.', 'Удалить', true);
        if (!ok)
            return;
        const saved = mutateAndSave(data => { const i = data[collection].findIndex(x => x.id === id && x.profileId === data.activeProfileId); if (i < 0)
            throw new Error('RECORD_NOT_FOUND'); data[collection].splice(i, 1); }, { rerender: 'current' });
        if (!saved)
            return;
        showToast('Запись удалена.', { actionLabel: 'Отменить', onAction: () => { mutateAndSave(data => { data[collection].splice(Math.min(idx, data[collection].length), 0, record); }, { rerender: 'current' }); } });
    }
    function setDataDeclaration(kind, value) { const profileId = state.data.activeProfileId; mutateAndSave(data => { const p = data.profiles.find(x => x.id === profileId); if (!p)
        throw new Error('PROFILE_NOT_FOUND'); p.dataDeclarations = { ...p.dataDeclarations, [kind]: value }; }, { rerender: 'current', successMessage: value === 'none' ? 'Статус «не принимаю» сохранён.' : 'Статус данных обновлён.' }); }
    function openHealthBrief() { openBriefBuilder('health'); }
    function openConsultationBrief() { openBriefBuilder('consultation'); }
    function openBriefBuilder(mode = 'health') {
        const consultation = mode === 'consultation';
        openModal(consultation ? 'Подготовиться к консультации' : 'Подготовить Health Brief', consultation ? 'СТРУКТУРИРОВАННОЕ РЕЗЮМЕ' : 'ДАННЫЕ ДЛЯ ВНЕШНЕГО АНАЛИЗА', body => {
            body.append(makeEl('div', { className: 'inline-note', text: 'Текст формируется локально и содержит только выбранные вами данные. Markov Health OS никуда его не отправляет.' }));
            const form = makeEl('form', { className: 'form' });
            const options = makeEl('div', { className: 'brief-options' });
            const choices = [['changes', 'Изменения'], ['goals', 'Цели'], ['weight', 'Вес'], ['sleep', 'Сон'], ['activity', 'Активность'], ['bp', 'Давление'], ['labs', 'Анализы'], ['medications', 'Лекарства'], ['supplements', 'Добавки'], ['symptoms', 'Симптомы'], ['lifestyle', 'Образ жизни'], ['notes', 'Заметки']];
            choices.forEach(([key, label]) => { const c = makeEl('label', { className: 'choice-card' }); const input = makeEl('input', { attrs: { type: 'checkbox', name: 'briefSections', value: key } }); input.checked = !['notes'].includes(key); c.append(input, makeEl('span', { text: label })); options.append(c); });
            const questions = field(consultation ? 'Цель консультации / вопросы (необязательно)' : 'Вопросы для анализа (необязательно)', 'questions', 'textarea', { maxlength: '3000', full: true }, '');
            const output = makeEl('textarea', { className: 'textarea brief-output', attrs: { readonly: 'readonly', 'aria-label': 'Сформированный структурированный текст' } });
            const printOutput = makeEl('pre', { className: 'brief-print-output', attrs: { 'aria-hidden': 'true' } });
            const actions = makeEl('div', { className: 'form-actions' });
            const refresh = () => { const selected = [...form.querySelectorAll('input[name="briefSections"]:checked')].map(i => i.value); const text = buildHealthBrief(selected, questions.input.value.trim(), consultation); output.value = text; printOutput.textContent = text; state.modalDirty = false; };
            actions.append(actionButton('Сформировать', refresh, 'primary'), actionButton('Копировать', async () => showToast(await copyText(output.value) ? 'Текст скопирован.' : 'Не удалось скопировать текст.'), 'secondary'), actionButton('Скачать .txt', () => downloadFile(`${consultation ? 'markov-consultation-brief' : 'markov-health-brief'}-${todayISO()}.txt`, output.value), 'secondary'));
            if (consultation)
                actions.append(actionButton('Печать / PDF', () => { printOutput.textContent = output.value; document.body.classList.add('print-brief'); const cleanup = () => { document.body.classList.remove('print-brief'); window.removeEventListener('afterprint', cleanup); }; window.addEventListener('afterprint', cleanup, { once: true }); window.print(); setTimeout(cleanup, 1500); }, 'secondary'));
            form.append(options, questions.wrap, output, printOutput, actions);
            body.append(form);
            refresh();
        }, false);
    }
    function normalizeLabName(name) { return String(name || '').trim().toLocaleLowerCase('ru-RU').replace(/\s+/g, ' '); }
    function normalizeLabUnit(unit) { return String(unit || '').trim().toLocaleLowerCase('ru-RU').replace(/\s+/g, ' '); }
    function labSeriesKey(record) { return `${normalizeLabName(record?.name)}\u0000${normalizeLabUnit(record?.unit)}`; }
    function buildHealthBrief(selected, questions = '', consultation = false) {
        const profile = getProfile();
        const lines = [consultation ? 'MARKOV HEALTH OS — CONSULTATION BRIEF' : 'MARKOV HEALTH OS — HEALTH BRIEF', `Generated: ${new Date().toLocaleString('ru-RU')}`, '', 'PROFILE', `Name: ${profile.name}`, `Age: ${ageFromDob(profile.dob) ?? 'not available'}`, `Biological sex: ${{ male: 'male / мужской', female: 'female / женский', intersex: 'other / другой', unknown: 'not specified' }[profile.sex] || 'not specified'}`, `Height: ${fmtNumber(profile.heightCm, 1)} cm`, `Primary priority: ${profile.priority || 'not specified'}`];
        if (selected.includes('goals')) {
            lines.push('', 'CURRENT GOALS');
            const vals = getActiveGoals();
            if (vals.length)
                vals.forEach(g => lines.push(`- ${g.name}: ${fmtNumber(g.currentValue, 2)} ${g.unit || ''} → ${fmtNumber(g.targetValue, 2)} ${g.unit || ''}; progress ${fmtNumber(goalProgress(g), 0)}%${g.deadline ? `; deadline ${g.deadline}` : ''}`));
            else
                lines.push('- No measurable goals recorded.');
        }
        if (selected.includes('changes')) {
            lines.push('', 'RECENT CHANGES');
            const vals = getChanges();
            if (vals.length)
                vals.forEach(c => lines.push(`- ${c.title}: ${c.from} → ${c.to} (${c.delta})`));
            else
                lines.push('- Not enough repeated data.');
        }
        if (selected.includes('weight')) {
            const w = latest(getWeightRecords());
            lines.push('', 'BODY', w ? `- Latest weight: ${fmtNumber(w.value, 1)} kg on ${w.date}` : '- Weight not recorded.');
        }
        if (selected.includes('sleep')) {
            const r = recordsInLastDays(profileRecords('sleep'), 7);
            lines.push('', 'SLEEP', r.length ? `- 7-day average: ${durationText(mean(r.map(x => x.durationHours)))}; quality ${fmtNumber(mean(r.map(x => x.quality)), 1)}/10` : '- Not enough recent sleep data.');
        }
        if (selected.includes('activity')) {
            const r = recordsInLastDays(profileRecords('activity'), 7);
            lines.push('', 'ACTIVITY', r.length ? `- Average steps, last 7 days: ${fmtNumber(mean(r.map(x => x.steps)), 0)}` : '- Not enough activity data.');
        }
        if (selected.includes('bp')) {
            const vals = sortedDesc(getBpRecords()).slice(0, 7);
            lines.push('', 'BLOOD PRESSURE');
            if (vals.length)
                vals.forEach(x => lines.push(`- ${x.date}${x.time ? ` ${x.time}` : ''}: ${x.systolic}/${x.diastolic} mmHg; pulse ${x.pulse}`));
            else
                lines.push('- No blood-pressure records.');
        }
        if (selected.includes('labs')) {
            lines.push('', 'LABORATORY RESULTS');
            const latestBy = new Map();
            sortedDesc(profileRecords('labs')).forEach(l => { const k = normalizeLabName(l.name); if (!latestBy.has(k))
                latestBy.set(k, l); });
            const vals = [...latestBy.values()].slice(0, 30);
            if (vals.length)
                vals.forEach(l => lines.push(`- ${l.date} | ${l.name}: ${fmtNumber(l.value, 3)} ${l.unit || ''}; reference ${referenceText(l)}; status ${labStatus(l).text}${l.laboratory ? `; lab ${l.laboratory}` : ''}`));
            else
                lines.push('- No laboratory results.');
        }
        for (const [key, title] of [['medications', 'MEDICATIONS'], ['supplements', 'SUPPLEMENTS']])
            if (selected.includes(key)) {
                lines.push('', title);
                const vals = profileRecords(key).filter(x => x.status === 'active');
                if (vals.length)
                    vals.forEach(m => lines.push(`- ${m.name}${m.dosage !== null && m.dosage !== '' ? ` ${m.dosage} ${m.unit || ''}` : ''}; ${m.frequency || 'frequency not specified'}${m.reason ? `; context ${m.reason}` : ''}`));
                else
                    lines.push(`- ${profile.dataDeclarations?.[key] === 'none' ? 'User explicitly marked none.' : 'No active records.'}`);
            }
        if (selected.includes('symptoms')) {
            lines.push('', 'SYMPTOMS');
            const vals = sortedDesc(profileRecords('symptoms')).slice(0, 20);
            if (vals.length)
                vals.forEach(x => lines.push(`- ${x.date}: ${x.name}; intensity ${x.intensity}/10${x.duration ? `; duration ${x.duration}` : ''}${x.note ? `; ${x.note}` : ''}`));
            else
                lines.push('- No symptoms recorded.');
        }
        if (selected.includes('lifestyle')) {
            const ls = profile.lifestyle || {};
            lines.push('', 'LIFESTYLE', `- Trainings/week: ${ls.trainingsPerWeek ?? 'not specified'}`, `- Baseline steps: ${ls.averageSteps ?? 'not specified'}`, `- Baseline sleep: ${ls.averageSleepHours ?? 'not specified'} h`, `- Stress: ${ls.stress ?? 'not specified'}/10`, `- Smoking: ${ls.smoking || 'not specified'}`, `- Alcohol: ${ls.alcohol || 'not specified'}`);
        }
        if (selected.includes('notes')) {
            lines.push('', 'RECENT NOTES');
            const vals = sortedDesc(profileRecords('notes')).slice(0, 10);
            if (vals.length)
                vals.forEach(n => lines.push(`- ${n.date}: ${n.text}`));
            else
                lines.push('- No notes recorded.');
        }
        lines.push('', consultation ? 'QUESTIONS / REASON FOR CONSULTATION' : 'QUESTIONS');
        if (questions)
            questions.split(/\n+/).map(x => x.trim()).filter(Boolean).forEach(q => lines.push(`- ${q}`));
        else
            lines.push('- No questions added.');
        lines.push('', 'DISCLAIMER', '- This is a structured summary of user-entered data.', '- Reference-range flags are not diagnoses.', '- Markov Health OS does not provide diagnosis, treatment, emergency triage, or medication recommendations.');
        return lines.join('\n');
    }
    function csvEscape(value) { let text = value === null || value === undefined ? '' : String(value); if (typeof value === 'string' && /^[\t\r\n ]*[=+\-@]/.test(text))
        text = `'${text}`; return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }
    function toCsv(rows, headers) { return '\ufeff' + [headers, ...rows].map(row => row.map(csvEscape).join(',')).join('\r\n'); }
    function exportCsv(kind) { const profileId = state.data.activeProfileId; let rows = [], headers = [], name = kind; const m = profileRecords('measurements'); if (kind === 'weight') {
        headers = ['date', 'weight_kg', 'note'];
        rows = m.filter(x => x.type === 'weight').map(x => [x.date, x.value, x.note || '']);
    }
    else if (kind === 'blood-pressure') {
        headers = ['date', 'time', 'systolic_mmHg', 'diastolic_mmHg', 'pulse_bpm', 'note'];
        rows = m.filter(x => x.type === 'bloodPressure').map(x => [x.date, x.time || '', x.systolic, x.diastolic, x.pulse, x.note || '']);
    }
    else if (kind === 'sleep') {
        headers = ['date', 'duration_hours', 'quality_1_10', 'bedtime', 'wake_time', 'awakenings', 'note'];
        rows = profileRecords('sleep').map(x => [x.date, x.durationHours, x.quality, x.bedtime || '', x.wakeTime || '', x.awakenings ?? '', x.note || '']);
    }
    else if (kind === 'labs') {
        headers = ['date', 'name', 'value', 'unit', 'reference_min', 'reference_max', 'status', 'laboratory', 'comment'];
        rows = profileRecords('labs').map(x => [x.date, x.name, x.value, x.unit || '', x.referenceMin ?? '', x.referenceMax ?? '', labStatus(x).text, x.laboratory || '', x.comment || '']);
    }
    else if (kind === 'activity') {
        headers = ['date', 'steps', 'active_minutes', 'cardio_minutes', 'distance_km'];
        rows = profileRecords('activity').map(x => [x.date, x.steps, x.activeMinutes ?? '', x.cardioMinutes ?? '', x.distanceKm ?? '']);
    }
    else if (kind === 'goals') {
        headers = ['name', 'category', 'start_value', 'target_value', 'current_value', 'unit', 'start_date', 'deadline', 'progress_percent'];
        rows = profileRecords('goals').map(x => [x.name, x.category, x.startValue, x.targetValue, x.currentValue, x.unit, x.startDate, x.deadline || '', goalProgress(x)]);
    } if (!rows.length) {
        showToast('В выбранной категории пока нет данных для CSV.');
        return;
    } downloadFile(`markov-health-os-${name}-${todayISO()}.csv`, toCsv(rows, headers), 'text/csv;charset=utf-8'); }
    function openCsvExport() { openModal('Экспорт CSV', 'СОВМЕСТИМОСТЬ ДАННЫХ', body => { body.append(makeEl('p', { className: 'section-subtitle', text: 'CSV предназначен для Excel, Google Sheets, R/Python и анализа данных. JSON остаётся основным форматом резервной копии.' })); const grid = makeEl('div', { className: 'quick-grid' }); [['weight', 'Вес'], ['blood-pressure', 'Давление'], ['sleep', 'Сон'], ['labs', 'Анализы'], ['activity', 'Активность'], ['goals', 'Цели']].forEach(([key, label]) => grid.append(actionButton(label, () => exportCsv(key), 'secondary'))); body.append(grid); }, false); }
    // ===== DEMO TRANSITION, SEARCH & CHARTS =====
    function enterDemo() {
        state.demoMode = true;
        state.data = createDemoData();
        state.route = 'overview';
        dom.welcome.hidden = true;
        dom.onboarding.hidden = true;
        dom.app.hidden = false;
        renderApp();
        showToast('Демо-режим: все данные вымышлены и не затрагивают ваше хранилище.');
    }
    function exitDemo() {
        clear(dom.toastRegion);
        state.demoMode = false;
        state.data = deepClone(state.persistentData || createEmptyData());
        state.route = 'overview';
        renderApp();
    }
    function closeSearch() { if (!dom.searchDialog.open)
        return; dom.searchDialog.close(); const target = state.lastFocus; state.lastFocus = null; requestAnimationFrame(() => target?.isConnected && target.focus()); }
    function openSearch() { if (!getProfile())
        return; state.lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null; state.searchActiveIndex = -1; dom.globalSearchInput.value = ''; renderSearchResults(''); dom.searchDialog.showModal(); requestAnimationFrame(() => dom.globalSearchInput.focus()); }
    function activateSearchResult(index) { const buttons = [...dom.searchResults.querySelectorAll('.search-result')]; if (!buttons.length)
        return; state.searchActiveIndex = (index + buttons.length) % buttons.length; buttons.forEach((b, i) => b.setAttribute('aria-selected', String(i === state.searchActiveIndex))); dom.globalSearchInput.setAttribute('aria-activedescendant', buttons[state.searchActiveIndex].id); buttons[state.searchActiveIndex].scrollIntoView({ block: 'nearest' }); }
    function renderSearchResults(query) {
        clear(dom.searchResults);
        dom.globalSearchInput.removeAttribute('aria-activedescendant');
        const normalizedQuery = String(query || '').trim().toLocaleLowerCase('ru-RU');
        state.searchItems = [];
        state.searchActiveIndex = -1;
        if (!normalizedQuery) {
            dom.searchResults.append(makeEl('div', {
                className: 'search-empty',
                text: 'Начните вводить название анализа, препарата, симптома, цели или текст заметки.'
            }));
            return;
        }
        const results = [];
        const add = (type, title, detail, route, date = '') => {
            const titleText = String(title || '');
            const detailText = String(detail || '');
            const titleNormalized = titleText.toLocaleLowerCase('ru-RU');
            const detailNormalized = detailText.toLocaleLowerCase('ru-RU');
            let score = null;
            if (titleNormalized === normalizedQuery)
                score = 0;
            else if (titleNormalized.startsWith(normalizedQuery))
                score = 1;
            else if (titleNormalized.includes(normalizedQuery))
                score = 2;
            else if (detailNormalized.startsWith(normalizedQuery))
                score = 3;
            else if (detailNormalized.includes(normalizedQuery))
                score = 4;
            if (score === null)
                return;
            results.push({ type, title: titleText, detail: detailText, route, date, score });
        };
        profileRecords('labs').forEach(item => add('АНАЛИЗ', item.name, `${item.value} ${item.unit || ''} ${item.laboratory || ''}`, 'labs', item.date));
        profileRecords('medications').forEach(item => add('ЛЕК', item.name, `${item.dosage ?? ''} ${item.unit || ''} ${item.frequency || ''}`, 'medications', item.startDate));
        profileRecords('supplements').forEach(item => add('ДОБ', item.name, `${item.dosage ?? ''} ${item.unit || ''} ${item.frequency || ''}`, 'medications', item.startDate));
        profileRecords('symptoms').forEach(item => add('СИМПТ', item.name, `${item.note || ''} ${item.duration || ''}`, 'history', item.date));
        profileRecords('goals').forEach(item => add('ЦЕЛЬ', item.name, `${item.category || ''} ${item.unit || ''}`, 'goals', item.startDate));
        profileRecords('notes').forEach(item => add('ЗАМ', item.text, fmtDate(item.date), 'history', item.date));
        results.sort((a, b) => a.score - b.score || itemDateTime(b) - itemDateTime(a));
        state.searchItems = results.slice(0, 50);
        if (!state.searchItems.length) {
            dom.searchResults.append(makeEl('div', {
                className: 'search-empty',
                text: 'Ничего не найдено в данных текущего профиля.'
            }));
            return;
        }
        state.searchItems.forEach((result, index) => {
            const button = makeEl('button', {
                className: 'search-result',
                attrs: {
                    type: 'button',
                    role: 'option',
                    id: `search-result-${index}`,
                    'aria-selected': 'false'
                }
            });
            button.append(makeEl('span', { className: 'search-result-type', text: result.type }));
            const copy = makeEl('span');
            copy.append(makeEl('strong', { text: result.title }), makeEl('p', { text: `${result.detail}${result.date ? ` · ${fmtDate(result.date)}` : ''}` }));
            button.append(copy);
            button.addEventListener('click', () => {
                closeSearch();
                navigate(result.route);
            });
            button.addEventListener('mouseenter', () => activateSearchResult(index));
            dom.searchResults.append(button);
        });
        activateSearchResult(0);
    }
    function canvasContext(canvas) {
        const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(120, Math.floor(rect.width || canvas.parentElement?.clientWidth || 300));
        const height = Math.max(34, Math.floor(rect.height || canvas.clientHeight || 220));
        const pixelWidth = Math.floor(width * dpr);
        const pixelHeight = Math.floor(height * dpr);
        if (canvas.width !== pixelWidth)
            canvas.width = pixelWidth;
        if (canvas.height !== pixelHeight)
            canvas.height = pixelHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            throw new Error('CANVAS_CONTEXT_UNAVAILABLE');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { ctx, width, height, dpr };
    }
    function cssColor(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#2f6f68'; }
    function drawSparkline(canvas, values) {
        const nums = values.map(Number).filter(Number.isFinite);
        if (nums.length < 2)
            return;
        const { ctx, width, height } = canvasContext(canvas);
        ctx.clearRect(0, 0, width, height);
        const min = Math.min(...nums), max = Math.max(...nums), range = max - min || 1, pad = 3;
        ctx.beginPath();
        nums.forEach((v, i) => { const x = pad + (i / (nums.length - 1)) * (width - pad * 2); const y = height - pad - ((v - min) / range) * (height - pad * 2); if (i === 0)
            ctx.moveTo(x, y);
        else
            ctx.lineTo(x, y); });
        ctx.strokeStyle = cssColor('--accent');
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }
    function drawLineChart(canvas, points, options = {}) {
        const clean = points.filter(p => Number.isFinite(Number(p.value)));
        const { ctx, width, height } = canvasContext(canvas);
        ctx.clearRect(0, 0, width, height);
        if (!clean.length) {
            ctx.fillStyle = cssColor('--text-faint');
            ctx.font = '12px ' + getComputedStyle(document.body).fontFamily;
            ctx.fillText('Недостаточно данных', 16, 24);
            return;
        }
        const values = clean.map(p => Number(p.value));
        const refs = [Number(options.referenceMin), Number(options.referenceMax)].filter(Number.isFinite);
        let min = Math.min(...values, ...refs), max = Math.max(...values, ...refs);
        if (min === max) {
            min -= 1;
            max += 1;
        }
        const margin = (max - min) * .12;
        min -= margin;
        max += margin;
        const left = 44, right = 12, top = 16, bottom = 32, plotW = Math.max(10, width - left - right), plotH = Math.max(10, height - top - bottom);
        ctx.font = '11px ' + getComputedStyle(document.body).fontFamily;
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = cssColor('--border');
        ctx.lineWidth = 1;
        ctx.fillStyle = cssColor('--text-faint');
        for (let i = 0; i < 4; i++) {
            const y = top + (i / 3) * plotH;
            ctx.beginPath();
            ctx.moveTo(left, y);
            ctx.lineTo(width - right, y);
            ctx.stroke();
            const val = max - (i / 3) * (max - min);
            ctx.fillText(fmtNumber(val, 1), 4, y);
        }
        const refLines = [['referenceMin', '--warning'], ['referenceMax', '--warning']];
        refLines.forEach(([key, color]) => { const val = Number(options[key]); if (!Number.isFinite(val))
            return; const y = top + ((max - val) / (max - min)) * plotH; ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = cssColor(color); ctx.globalAlpha = .65; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(width - right, y); ctx.stroke(); ctx.restore(); });
        ctx.beginPath();
        clean.forEach((p, i) => { const x = left + (clean.length === 1 ? .5 : i / (clean.length - 1)) * plotW; const y = top + ((max - Number(p.value)) / (max - min)) * plotH; if (i === 0)
            ctx.moveTo(x, y);
        else
            ctx.lineTo(x, y); });
        ctx.strokeStyle = cssColor('--accent');
        ctx.lineWidth = 2.2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();
        clean.forEach((p, i) => { const x = left + (clean.length === 1 ? .5 : i / (clean.length - 1)) * plotW; const y = top + ((max - Number(p.value)) / (max - min)) * plotH; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fillStyle = cssColor('--surface'); ctx.fill(); ctx.strokeStyle = cssColor('--accent'); ctx.lineWidth = 1.7; ctx.stroke(); });
        ctx.fillStyle = cssColor('--text-faint');
        ctx.textBaseline = 'alphabetic';
        if (clean[0]?.label)
            ctx.fillText(fmtDate(String(clean[0].label), { year: false }), left, height - 8);
        if (clean.length > 1 && clean[clean.length - 1]?.label) {
            const text = fmtDate(String(clean[clean.length - 1].label), { year: false });
            const metrics = ctx.measureText(text);
            ctx.fillText(text, width - right - metrics.width, height - 8);
        }
    }
    function drawMultiLineChart(canvas, records, series) {
        const clean = records.filter(r => series.some(s => Number.isFinite(Number(r[s.key]))));
        const { ctx, width, height } = canvasContext(canvas);
        ctx.clearRect(0, 0, width, height);
        if (!clean.length)
            return;
        const vals = [];
        series.forEach(s => clean.forEach(r => { const n = Number(r[s.key]); if (Number.isFinite(n))
            vals.push(n); }));
        let min = Math.min(...vals), max = Math.max(...vals);
        const margin = (max - min || 10) * .15;
        min -= margin;
        max += margin;
        const left = 44, right = 12, top = 18, bottom = 32, plotW = width - left - right, plotH = height - top - bottom;
        ctx.font = '11px ' + getComputedStyle(document.body).fontFamily;
        ctx.fillStyle = cssColor('--text-faint');
        ctx.strokeStyle = cssColor('--border');
        for (let i = 0; i < 4; i++) {
            const y = top + (i / 3) * plotH;
            ctx.beginPath();
            ctx.moveTo(left, y);
            ctx.lineTo(width - right, y);
            ctx.stroke();
            ctx.fillText(fmtNumber(max - (i / 3) * (max - min), 0), 5, y + 3);
        }
        const colors = [cssColor('--accent'), cssColor('--info')];
        series.forEach((s, si) => { ctx.beginPath(); let started = false; clean.forEach((r, i) => { const v = Number(r[s.key]); if (!Number.isFinite(v))
            return; const x = left + (clean.length === 1 ? .5 : i / (clean.length - 1)) * plotW, y = top + ((max - v) / (max - min)) * plotH; if (!started) {
            ctx.moveTo(x, y);
            started = true;
        }
        else
            ctx.lineTo(x, y); }); ctx.strokeStyle = colors[si % colors.length]; ctx.lineWidth = 2; ctx.stroke(); });
        ctx.fillStyle = cssColor('--text-faint');
        if (clean[0]?.date)
            ctx.fillText(fmtDate(clean[0].date, { year: false }), left, height - 8);
        if (clean.length > 1) {
            const text = fmtDate(clean[clean.length - 1].date, { year: false });
            ctx.fillText(text, width - right - ctx.measureText(text).width, height - 8);
        }
    }
    // ===== EVENT BINDING & BOOT =====
    function bindEvents() {
        dom.startOnboardingBtn.addEventListener('click', () => startOnboarding('new'));
        dom.startDemoBtn.addEventListener('click', enterDemo);
        dom.welcomeImportBtn?.addEventListener('click', () => dom.importFileInput.click());
        dom.profileSwitcher.addEventListener('change', e => setActiveProfile(e.target.value));
        dom.addProfileBtn.addEventListener('click', () => state.demoMode ? showToast('Выйдите из демо, чтобы добавить профиль.') : startOnboarding('add'));
        dom.desktopQuickAdd.addEventListener('click', openQuickAdd);
        dom.mobileQuickAdd.addEventListener('click', openQuickAdd);
        dom.searchBtn.addEventListener('click', openSearch);
        dom.searchCloseBtn.addEventListener('click', closeSearch);
        dom.globalSearchInput.addEventListener('input', e => renderSearchResults(e.target.value));
        dom.globalSearchInput.addEventListener('keydown', e => { if (e.key === 'ArrowDown') {
            e.preventDefault();
            activateSearchResult(state.searchActiveIndex + 1);
        }
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activateSearchResult(state.searchActiveIndex - 1);
        }
        else if (e.key === 'Enter' && state.searchActiveIndex >= 0) {
            e.preventDefault();
            dom.searchResults.querySelectorAll('.search-result')[state.searchActiveIndex]?.click();
        }
        else if (e.key === 'Escape') {
            e.preventDefault();
            closeSearch();
        } });
        dom.themeCycleBtn.addEventListener('click', cycleTheme);
        dom.exitDemoBtn.addEventListener('click', exitDemo);
        dom.mobileBrandBtn.addEventListener('click', () => navigate('overview'));
        dom.modalCloseBtn.addEventListener('click', requestModalClose);
        dom.modal.addEventListener('cancel', e => { e.preventDefault(); requestModalClose(); });
        dom.cancelOnboardingBtn.addEventListener('click', () => { if (state.onboardingMode === 'new')
            persistOnboardingDraft(); state.onboarding = null; dom.onboarding.hidden = true; dom.app.hidden = false; renderApp(); });
        dom.importFileInput.addEventListener('change', async (e) => { const file = e.target.files?.[0]; e.target.value = ''; await importDataFromFile(file); });
        document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyK' || e.key.toLocaleLowerCase('ru-RU') === 'k')) {
            e.preventDefault();
            if (!dom.searchDialog.open)
                openSearch();
        } if (e.key === 'Escape' && dom.searchDialog.open)
            closeSearch(); });
        window.addEventListener('hashchange', () => { const route = location.hash.replace('#', ''); if (ROUTES[route] && getProfile()) {
            state.route = route;
            state.historyLimit = 100;
            renderNavigation();
            renderCurrentRoute();
        } });
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (state.data?.settings?.theme === 'system') {
            applyTheme('system');
            renderCurrentRoute();
        } });
    }
    function registerServiceWorker() {
        if (!('serviceWorker' in navigator) || !location.protocol.startsWith('http'))
            return;
        navigator.serviceWorker.register('./sw.js').then(registration => {
            let reloadStarted = false;
            const offerUpdate = worker => {
                if (!worker)
                    return;
                showToast('Доступна новая версия Markov Health OS.', {
                    actionLabel: 'Обновить',
                    timeout: 15000,
                    onAction: () => worker.postMessage({ type: 'SKIP_WAITING' })
                });
            };
            if (registration.waiting && navigator.serviceWorker.controller)
                offerUpdate(registration.waiting);
            registration.addEventListener('updatefound', () => {
                const worker = registration.installing;
                if (!worker)
                    return;
                worker.addEventListener('statechange', () => {
                    if (worker.state === 'installed' && navigator.serviceWorker.controller)
                        offerUpdate(worker);
                });
            });
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (reloadStarted)
                    return;
                reloadStarted = true;
                location.reload();
            });
        }).catch(() => { });
    }
    function boot() {
        cacheDom();
        loadPersistentData();
        bindEvents();
        if (dom.appVersion)
            dom.appVersion.textContent = `v${APP_VERSION}`;
        applyTheme(state.data.settings.theme);
        const hash = location.hash.replace('#', '');
        if (ROUTES[hash])
            state.route = hash;
        try {
            const draft = JSON.parse(localStorage.getItem(ONBOARDING_DRAFT_KEY) || 'null');
            if (draft?.draft && draft?.step)
                dom.startOnboardingBtn.textContent = 'Продолжить настройку Health OS';
        }
        catch (_) { }
        renderApp();
        if (state.storageIssue) {
            window.setTimeout(() => showToast(state.storageIssue, { timeout: 8000 }), 100);
        }
        registerServiceWorker();
    }
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', boot);
    else
        boot();
})();

