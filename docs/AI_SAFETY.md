# AI Safety

## Principle

`Code computes. AI explains.`

The deterministic layer calculates dates, deltas, percentages, lab-reference status, summaries and correlations before an AI request is built.

## Privacy

No AI request occurs automatically. The user sees a context preview, must explicitly consent and initiates the request. Only a same-origin gateway is allowed by the frontend adapter and CSP.

## Output contract

AI responses must include `summary`, findings/change/explanation/context/question/limitation arrays and a low/moderate/high confidence field. Invalid output is rejected.

## Prohibited behavior

The AI layer is not permitted to diagnose, prescribe, change medication doses, invent missing results, present association as causation or hide uncertainty.

## External activation

Provider invocation requires a deployed same-origin gateway and server-side provider credential. The credential must never be stored in browser source or local settings.
