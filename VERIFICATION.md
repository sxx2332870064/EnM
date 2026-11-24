# Build verification

Release candidate: 3.0.0

## Completed in the build workspace

- Node syntax checks for the server, browser script and template library.
- 36 automated tests passed, 0 failed. These include controlled server/API-response tests and jsdom DOM tests. They are not live Gemini tests.
- Fixed baseline ran on T01, T02 and T04. Timestamped JSON outputs are in `evidence-project2/`. These are actual baseline outputs, not agent results or human quality scores.
- Production dependency audit reported 0 known vulnerabilities at the time of this build. This is not a security audit or a promise about future advisories.
- No real API key is included. `.env.example` contains a placeholder.

## Not verified here

- A real Gemini call or free-tier quota/availability.
- The cause of the original T01-R2 validation rejection.
- The claimed refresh-first failure pattern with the real provider.
- Actual phone/desktop visual layout, browser printing, full-screen projection, keyboard-only and screen-reader behavior in real browsers.
- Physical material results, tabletop suitability or studio permissions.
- Public deployment or Render/GitHub synchronization. The existing live site is unchanged by this download.

Do not cite these automated passes as completed live evaluation or peer-review evidence. Run a marked sample locally first, then a real representative request, then original/revised comparisons and regression tests.
