# OperatorNest tools

Hosted MCP endpoint: **https://operatornest.com/mcp** (Streamable HTTP, no API key).

Five deterministic calculations, with runnable TypeScript source and the same tool definitions over HTTP and stdio. Each result includes normalized inputs, units, method, assumptions, dated sources and a link to open the result on [OperatorNest](https://operatornest.com/tools/mcp). Calculations use bundled data and make no network calls. They do not create events, install schedules or execute tasks.

| Tool | Result |
| --- | --- |
| `ai_api_cost` | USD per request, day and month from token counts and selected model rates |
| `meeting_time_zones` | Shared 30-minute slots within 09:00–17:00 for 2–8 people |
| `recurring_schedule` | Monthly hours, recurrence rules and an RFC 5545 calendar |
| `ai_subscription_stack_cost` | Monthly and annual totals with overlapping capabilities |
| `cron_next_runs` | 1–10 matches after a UTC instant, within 366 days |

## Self-hosting

Requires Node.js 22.19 or newer and pnpm 12.6.0.

```sh
git clone https://github.com/OperatorNest/mcp-tools.git
cd mcp-tools
pnpm install --frozen-lockfile
pnpm test:local
pnpm build
node dist/stdio.js
```

The last command serves newline-delimited MCP messages on stdin/stdout. Logs go to stderr. For a client with stdio support, use `node` with the absolute path to `dist/stdio.js` as its argument.

The package is prepared as `@operatornest/mcp-tools` version 1.0.0. To run a local package through `npx` before registry publication:

```sh
pnpm pack --out /tmp/operatornest-mcp-tools-1.0.0.tgz
npx --yes --package /tmp/operatornest-mcp-tools-1.0.0.tgz operatornest-mcp-tools
```

After npm publication, the equivalent command is `npx --yes @operatornest/mcp-tools@1.0.0`. Publication is a separate maintainer action.

### HTTP Worker

`src/worker.ts` exports a standalone Worker with an `/mcp` endpoint. Use your own Worker configuration; `wrangler.jsonc` is a local starting point. Run it locally with:

```sh
pnpm dev:worker --port 8787
```

Connect a client to `http://localhost:8787/mcp`. For remote hosting, follow the [Worker setup documentation](https://developers.cloudflare.com/workers/get-started/guide/) in your own account.

The HTTP handler caps request bodies at 32 KiB, rejects JSON-RPC batches, returns generic errors and supports CORS for HTTPS origins. Local endpoints accept local origins. It uses stateless JSON responses, without sessions or subscription streams.

Rate limiting is optional. To enable it, configure an `MCP_LIMITER` [rate-limit binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/). When present, it uses a SHA-256 hash of `CF-Connecting-IP`; rejection returns HTTP 429 with `Retry-After: 60`. Missing client IP or a binding error returns HTTP 503. No binding means no rate limiting.

## Client setup

These snippets connect to the hosted endpoint. Substitute your own HTTPS `/mcp` URL to use your HTTP instance. Setup documentation checked on 2 October 2026; account and workspace controls may affect tool access.

### ChatGPT

Enable Developer mode in Settings → Security and login. In Plugins, use the plus button to create a developer-mode app with this URL and No Authentication:

```text
https://operatornest.com/mcp
```

Select the app from Developer mode in the conversation's plus menu. [Official instructions](https://developers.openai.com/api/docs/guides/developer-mode).

### Claude

In Claude, open Customize → Connectors, select Add custom connector, and enter `https://operatornest.com/mcp`. Choose No sign in and add the connector. Enable it for your conversation from the plus menu's Connectors list. Organization owners may need to add it first. [Official connector instructions](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp).

For Claude Code:

```sh
claude mcp add --transport http operatornest https://operatornest.com/mcp
```

Check the connection with `/mcp`. [Official instructions](https://code.claude.com/docs/en/mcp).

### Codex

```sh
codex mcp add operatornest --url https://operatornest.com/mcp
```

Alternatively, in `~/.codex/config.toml`:

```toml
[mcp_servers.operatornest]
url = "https://operatornest.com/mcp"
```

[Official instructions](https://developers.openai.com/learn/docs-mcp).

### Cursor

Add to `.cursor/mcp.json` in your project, or `~/.cursor/mcp.json` for all projects:

```json
{
  "mcpServers": {
    "operatornest": { "url": "https://operatornest.com/mcp" }
  }
}
```

[Official instructions](https://cursor.com/docs/mcp).

### Gemini CLI

Add to `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "operatornest": { "httpUrl": "https://operatornest.com/mcp" }
  }
}
```

[Official instructions](https://geminicli.com/docs/tools/mcp-server/).

### VS Code

Add `.vscode/mcp.json` to your project:

```json
{
  "servers": {
    "operatornest": { "type": "http", "url": "https://operatornest.com/mcp" }
  }
}
```

Start the server from the configuration file and enable its tools in Agent mode. [Official instructions](https://code.visualstudio.com/docs/agent-customization/mcp-servers).

## Data and limits

API rates are frozen at `2026-09-28T17:08:16.340Z` in `src/data/pricing-snapshot.json`, containing 194 models from [models.dev](https://models.dev). This is the hosted MCP's filtered snapshot. Use the bundled `modelId` values; the broader website catalog can include records this server does not accept. Null rates stay unlisted. Caching falls back to the input rate when absent; batch discounts require published data. Non-token charges are excluded.

Subscription plans are in `src/data/ai-plans.ts`, checked on 27 September 2026 with official source links. Annual totals use published annual charges, or twelve monthly charges when no annual charge is listed. Taxes, regional differences and promotions are excluded.

Meeting and cron results use the runtime's IANA time-zone database. Recurring calendars use floating local times in the importing calendar. Cron supports numeric stars, lists, ranges, steps and weekday names across GitHub, Cloudflare, Quartz and AWS dialects; `L`, `W`, `#` and named months are rejected. Results describe estimates and schedule previews.

## Development

```sh
pnpm check
pnpm test:local
pnpm build
pnpm dlx @modelcontextprotocol/inspector --cli node dist/stdio.js \
  --method tools/call --tool-name cron_next_runs \
  --tool-arg 'expression=0 9 * * 1-5' --tool-arg dialect=github \
  --tool-arg zone=UTC --tool-arg after=2026-10-02T00:00:00Z --tool-arg count=1
```

Tests validate input and output schemas, valid and invalid calls, HTTP limits, and initialize/list/call on both transports. See [Inspector CLI documentation](https://modelcontextprotocol.io/docs/tools/inspector/cli), [contribution guidance](CONTRIBUTING.md), [security reporting](SECURITY.md) and [data attribution](THIRD_PARTY_NOTICES.md).

MIT. Copyright (c) 2026 OperatorNest.
