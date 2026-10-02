# Working on OperatorNest tools

Start with `git status --short`; preserve unrelated changes. Read README.md and CONTRIBUTING.md before editing. Keep this repository limited to the five deterministic calculations and their public data.

- `src/tool-contracts.ts`: input validation and calculations.
- `src/mcp-tools.ts`: shared schemas, descriptions, annotations and results.
- `src/server.ts`: tool registration for both transports.
- `src/http.ts` and `src/worker.ts`: HTTP boundary and optional rate limiter.
- `src/stdio.ts`: local process transport; stdout is protocol-only.
- `src/data/`: dated data and standalone output schemas.
- `test/`: calculation and transport acceptance tests.

Use Node.js 22.19 or newer and pnpm 12.6.0. Run `pnpm check`, `pnpm test:local` and `pnpm build`. For transport changes, exercise initialize, tools/list and valid/invalid tools/call on HTTP and stdio. Test the packed executable when changing packaging.

Preserve bounded inputs, read-only annotations, the HTTP body cap, batch rejection and generic errors. Calculations make no network requests and perform no external actions. Data changes need sources and checked dates; preserve attribution. Update schemas with result shapes. Never commit secrets or private product code. Publishing, pushing, deploying and registry submissions require explicit authorization.

The instructions use the focused command scope and transport parity patterns studied in [Supermemory](https://ossrules.md/supermemoryai/supermemory) and [Goose](https://ossrules.md/aaif-goose/goose).
