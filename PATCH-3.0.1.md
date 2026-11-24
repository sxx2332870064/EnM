# 3.0.1 focused repair

## Install

1. Stop the currently running v3 terminal with Ctrl+C.
2. Keep your P01-R1/R2/R3 downloads and notebook unchanged. Back up your v3 project folder.
3. Copy the CONTENTS of this update folder over the matching files in the v3 project root. Merge the `public` and `test` folders. This archive contains NO `.env`; keep your existing key file.
4. In that same folder run `npm.cmd test`, then `npm.cmd start`.
5. Refresh the browser. Check `/api/health`: version should be `3.0.1`.
6. Do not resume an old saved notebook for the retest. It preserves old questions intentionally. Generate a fresh plan with the identical P01 input and download its new run record.

## Changed behavior

- Gemini now returns template IDs and concept connections, not research or emotional questions.
- The app supplies different reviewed research and reflection questions for each template. They ask for a student's reading without supplying emotional alternatives.
- Digital observation hints include a concrete example and distinguish observation from interpretation. Notes are not auto-graded, rewritten or rejected because they express a feeling.
- Selected validator patterns detect the pace-feature claims observed in P01-R2/R3. These patterns are not a general semantic verifier and may still miss other errors.
- Provider, model, key name, endpoint, request body fields and 90-second API timeout are unchanged. The server file changes only its reported release version. The visual controls, trial method and signed confirmation are unchanged.
- Model-controlled choice and concept linking remain. Fixed questions trade some personalization for a more controlled reflective structure. The baseline uses the same reviewed questions, so a stronger baseline result is possible and must be reported honestly.

## Evidence

`test/fixtures/P01-R2.json` and `P01-R3.json` are copies of the real run records supplied by the user. Regression tests distinguish rejection of the old schema from detection of the old pace claim. The known R1 question is a small explicit test string, not a fabricated full run record.

All new automated model calls use controlled stubs. They are not new live P01 results. Repeat P01 on the real provider after installation. Keep release 3.0.0 and 3.0.1 trials separate in the report.
