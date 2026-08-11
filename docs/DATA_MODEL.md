# Data Model v3

Schema version: `3`.

All user records are profile-scoped. `labResults.reportId` must reference an existing `labReport` and every non-profile record with a `profileId` must reference an existing profile.

## LabReport

Stores report-level context: laboratory, report/order identifiers, collection/reporting dates, fasting metadata, specimen, comment and source metadata.

## LabResult

Stores the original analyte name/value/unit, normalized analyte/value/unit, report-specific reference metadata, qualitative/operator value type, extraction confidence, verification state and provenance.

The original value and unit are immutable source-of-truth fields. Normalized values are derived representations.

## Event

Stores temporal context such as illness, travel, stress, nutrition/training changes, medication changes, blood donation or custom events.

## Other collections

Measurements, sleep, activity, training, nutrition, medications, supplements, symptoms, goals and notes remain explicit profile-scoped collections.

## Migration

v2 `labs[]` are grouped into reports by profile/date/laboratory. Each old row becomes a LabResult and the original record is preserved inside provenance. Migration validates the result before it can become active state.
