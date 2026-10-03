# Contributing

For a bug, include the version, transport, input, expected result and observed result. Remove credentials and personal information. For a change, explain the user-visible behavior and provide a small reproduction.

Use Node 26 and pnpm 12 for checkout development (`just setup`). The published package supports Node.js 22.19 or newer. Run:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm test:local
pnpm build
```

Keep calculations in `src/tool-contracts.ts` and shared definitions in `src/mcp-tools.ts`. Both transports use `src/server.ts`; verify affected behavior over HTTP and stdio. Update the output schemas when changing result shapes.

Data changes must include official sources and checked dates. Preserve upstream licenses and attribution. Do not add network calls to calculations, credentials to examples, or unrelated product code. Keep release notes focused on behavior. Publication and deployment require maintainer authorization.
