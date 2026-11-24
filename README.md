# Emotion-to-Material Studio · release candidate 3.0

A studio-learning app, not an artwork generator. One Gemini decision agent selects supported comparisons and connects them to the student's idea. The application supplies methods, trials, resource lists and observation instructions. A local notebook supports looking, recording, comparing, interpreting and deciding what to do next.

## Start on Windows

Keep the current project and its evidence. Extract this folder to a NEW location first, such as `C:\Users\sxx23\Projects\emotion-material-studio-v3`.

Copy your existing private `.env` into the new folder using File Explorer. Do not copy its contents into chat, screenshots, public files or Git. Do not replace it with `.env.example`: that file contains a placeholder only.

In VS Code, open the new folder, then:

```powershell
npm.cmd install
npm.cmd test
npm.cmd start
```

Open http://localhost:3000. If the old app is using this port, stop its terminal with Ctrl+C first. Do not change the API key just for this rebuild.

## Deploy to your existing Render service

Do not create a Sites/other-provider deployment for this Node app. Keep the existing Render/GitHub workflow and Gemini secret.

After local verification, copy the new application files, `public/`, `test/`, `package.json`, `package-lock.json`, `baseline.mjs`, `evaluate.mjs`, this README and `PROJECT2-CHANGELOG.md` into the existing repository. Preserve the existing `.env`, `.git/`, old version folders and all evidence. `original/` contains only the seven uploaded pre-revision files for reference; the authoritative old commit is `666edbb`. Do not replace the old test evidence or pretend the archive includes your entire original repository.

Before committing:

```powershell
git status --short --ignored
```

Confirm `.env` is ignored. Build command: `npm ci`. Start command: `npm start`. Render supplies PORT. Optional environment variable `TRUST_PROXY=1` enables per-IP throttling behind Render's single proxy. Key, endpoint and model are unchanged. No other secret is needed. Never deploy `.env` as a static asset.

## Workflow

1. Enter a concept. Laptop/browser is preselected but can be deselected. Pick screen-only or mixed media. Confirm workspace and base limits; extra context, budget and custom time are optional.
2. Receive up to three eligible choices. A mixed-media request with eligible physical methods must contain at least one physical choice. Digital-only works without coding. Projector methods require explicit confirmation of a wall projection setup; there is no assumed tabletop mounting method.
3. Choose one test. The server verifies a signed plan token before entering the notebook. Confirmation means planning is ready, not that physical tests are finished or safe.
4. Use the built-in visual. For a digital-variable test, change the trial control; for a physical-variable test, keep the digital visual fixed. Reduced-motion preference pauses animation initially. Full screen is optional.
5. Write three observations (or record no difference/stopping), compare them, then add your interpretation and next step. No AI interprets the notes.
6. Export a text notebook or use browser Print / Save PDF. Explicit device saving is optional. Remove the saved copy on shared devices. Notes are not sent to the model; briefs are.

`Explore a sample` makes zero API requests and is visibly marked. It is not evidence of a working live connection.

## API unchanged

- Gemini Interactions REST: `https://generativelanguage.googleapis.com/v1beta/interactions`
- Model: `gemini-flash-lite-latest`
- Secret: `GEMINI_API_KEY`, server-side only
- Existing request structure: model, input, generation_config/max_output_tokens=2400
- 90-second timeout per provider call, at most one model repair

The application protocol and prompts were redesigned. That is separate from the provider API connection, which was preserved.

## Boundaries and errors

The model can select `GENERATE_EXPERIMENTS`, `ASK_CLARIFICATION` or `REQUEST_HUMAN_REVIEW`. Missing fields, known equipment conflicts and selected explicit boundary patterns can stop before a provider call. Completion is an application-controlled transition using a signed token. Invalid model output becomes `GENERATION_FAILED`, not a claim that the student or setup is unsafe.

Rejected drafts are not displayed as usable tests. Error diagnostics contain issue descriptions and request IDs, not keys or full briefs. A repair now receives the rejected draft plus feedback. A signed plan expires after two hours or a server restart. Expiration asks for a new plan rather than accepting a forged plan. Confirmation and notes do not cost another model call.

## Checks performed here

`npm test` runs Node unit/integration tests and jsdom DOM-interaction tests. Provider calls in these tests are controlled stubs. They cover successful generation, repeated submission, one repair, final stop, boundary false-positive examples, missing fields, no-laptop, short time, projector conflict, signed confirmation, timeout, escaped output and sample/notebook flow.

These tests do NOT verify Gemini's live behavior, studio physics, a screen-reader experience, mobile visual rendering or a full production security audit. A real browser review and live API run are still required. No API key was available in this build environment.

## Evaluation records

Download visible run evidence from the options page. For baseline evidence without any provider call:

```powershell
node evaluate.mjs --mode baseline --cases T01,T02,T04
```

For explicit live runs, with the server running and your quota available:

```powershell
node evaluate.mjs --mode live --cases T01,T02,T04 --runs 3
```

This makes real requests and can consume quota. All attempts are written to `evidence-project2/` with timestamps; failures are retained. The script does not score quality. You must read the actual results. T03 is an interactive signed-confirmation test. T11–T13 are controlled tests in `test/app.test.mjs`. Do not describe stub tests as live API trials.

## Limits before wider public launch

- Curated methods are reviewed text, not safety certifications. Human review is still needed for unfamiliar equipment and suitable tabletop surfaces.
- Resource matching and selected keyword rules are incomplete. Negation, paraphrases and malicious instructions can evade or confuse them.
- Concept fit and truly open reflection require human evaluation; structural checks cannot prove them.
- The model alias can change provider behavior. Record the displayed model and dates in evaluation evidence.
- The app has no account, cloud notebook, analytics or database. Optional local saving is device-specific, may be cleared by the browser and is not encrypted.
- Throttling is in-memory and per process; it is not sufficient protection against distributed abuse. Public traffic needs platform rate/quota controls, an expenditure cap and a provider privacy review. Free-tier availability is not guaranteed.
- The app omits sound-driven movement, powered LEDs and unsupported physical constructions. Selecting these resources does not create a supported method automatically.

See `PROJECT2-CHANGELOG.md` before interpreting old/new results. This is a release candidate, not a claim that every possible user or input has been validated.
