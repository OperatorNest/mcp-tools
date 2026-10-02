import assert from 'node:assert/strict';
import { test } from 'node:test';
import worker from '../dist/worker.js';
import { handleMcp, MCP_BODY_LIMIT } from '../dist/http.js';
import { checkTools } from './helpers.mjs';
import { initialize, modernMeta } from './fixtures.mjs';
let id = 0;
const rpc = (method, params = {}) => ({ jsonrpc: '2.0', id: ++id, method, params });
const request = (body, headers = {}, url = 'https://tools.example/mcp') => new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
async function send(body, env = {}, headers = {}) {
  const response = await worker.fetch(request(body, headers), env);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const raw = await response.text();
  return { response, data: raw ? JSON.parse(raw) : undefined };
}

test('HTTP initialize, list and all valid/invalid calls without a limiter', async () => {
  const init = await send(rpc('initialize', initialize));
  assert.equal(init.response.status, 200);
  assert.equal(init.data.result.serverInfo.name, 'OperatorNest tools');
  assert.equal(init.data.result.serverInfo.version, '1.0.0');
  assert.ok(init.data.result.capabilities.tools);
  assert.equal(init.response.headers.get('MCP-Session-Id'), null);
  assert.equal((await send({ jsonrpc: '2.0', method: 'notifications/initialized' })).response.status, 202);
  await checkTools(async (method, params) => (await send(rpc(method, params))).data);
});

test('HTTP modern discovery, tools and protocol negotiation errors', async () => {
  const headers = { 'MCP-Protocol-Version': '2026-07-28' };
  const discover = await send(rpc('server/discover', { _meta: modernMeta }), {}, { ...headers, 'Mcp-Method': 'server/discover' });
  assert.ok(discover.data.result);
  await checkTools(async (method, params = {}) => (await send(rpc(method, { ...params, _meta: modernMeta }), {}, { ...headers, 'Mcp-Method': method, ...(params.name ? { 'Mcp-Name': params.name } : {}) })).data);
  const unsupported = await send(rpc('server/discover', { _meta: { ...modernMeta, 'io.modelcontextprotocol/protocolVersion': '2099-01-01' } }), {}, { 'MCP-Protocol-Version': '2099-01-01', 'Mcp-Method': 'server/discover' });
  assert.equal(unsupported.data.error.code, -32022);
  assert.ok(unsupported.data.error.data.supported.includes('2026-07-28'));
});

test('HTTP optional limiter uses hashed IP, rejects limits and fails closed', async () => {
  const keys = [];
  const env = { MCP_LIMITER: { async limit({ key }) { keys.push(key); return { success: true }; } } };
  assert.equal((await send(rpc('tools/list'), env, { 'CF-Connecting-IP': '192.0.2.1' })).response.status, 200);
  assert.match(keys[0], /^mcp:[a-f0-9]{64}$/);
  assert.doesNotMatch(keys[0], /192\.0\.2\.1/);
  assert.equal((await send(rpc('tools/list'), env)).response.status, 503);
  const limited = await send(rpc('tools/list'), { MCP_LIMITER: { async limit() { return { success: false }; } } }, { 'CF-Connecting-IP': '192.0.2.1' });
  assert.equal(limited.response.status, 429);
  assert.equal(limited.response.headers.get('Retry-After'), '60');
  const failed = await send(rpc('tools/list'), { MCP_LIMITER: { async limit() { throw new Error('untrusted-fixture'); } } }, { 'CF-Connecting-IP': '192.0.2.1' });
  assert.equal(failed.response.status, 503);
  assert.doesNotMatch(JSON.stringify(failed.data), /untrusted-fixture/);
});

test('HTTP byte cap, invalid UTF-8, batches and media type', async () => {
  for (const body of ['x'.repeat(MCP_BODY_LIMIT + 1), '💡'.repeat(MCP_BODY_LIMIT / 4 + 1)]) assert.equal((await send(body)).response.status, 413);
  const valid = JSON.stringify(rpc('tools/list'));
  assert.equal((await send(valid + ' '.repeat(MCP_BODY_LIMIT - Buffer.byteLength(valid)))).response.status, 200);
  for (const body of [[rpc('tools/list')], [], '{', 'null']) assert.equal((await send(body)).response.status, 400);
  const invalid = new Request('https://tools.example/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: new Uint8Array([0xff]) });
  assert.equal((await handleMcp(invalid, {})).status, 400);
  assert.equal((await send(rpc('tools/list'), {}, { 'Content-Type': 'text/plain' })).response.status, 415);
});

test('HTTP origin, CORS, methods and path boundary', async () => {
  for (const Origin of ['null', 'http://external.example', 'data:text/plain,x', 'https://valid.example/path']) assert.equal((await send(rpc('tools/list'), {}, { Origin })).response.status, 403);
  assert.equal((await send(rpc('tools/list'), {}, { Origin: 'https://client.example' })).response.status, 200);
  assert.equal((await handleMcp(request(rpc('tools/list'), { Origin: 'http://localhost:3000' }, 'http://localhost:8787/mcp'), {})).status, 200);
  assert.equal((await handleMcp(request(rpc('tools/list'), { Origin: 'https://external.example' }, 'http://localhost:8787/mcp'), {})).status, 403);
  const preflight = await worker.fetch(new Request('https://tools.example/mcp', { method: 'OPTIONS', headers: { Origin: 'https://client.example' } }), {});
  assert.equal(preflight.status, 204);
  assert.match(preflight.headers.get('Access-Control-Allow-Headers'), /MCP-Protocol-Version/);
  assert.equal((await worker.fetch(new Request('https://tools.example/'), {})).status, 404);
  assert.equal((await worker.fetch(new Request('https://tools.example/mcp'), {})).status, 405);
  assert.equal((await worker.fetch(new Request('https://tools.example/mcp', { headers: { Accept: 'text/html' } }), {})).status, 200);
});
