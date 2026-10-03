import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkTools, stdioSession } from './helpers.mjs';
import { initialize, modernMeta } from './fixtures.mjs';

test('stdio initializes, lists and calls every tool with generic errors', { timeout: 30000 }, async t => {
  const session = stdioSession(t);
  const init = await session.send('initialize', initialize);
  assert.equal(init.result.serverInfo.name, 'OperatorNest tools');
  assert.equal(init.result.serverInfo.version, '1.1.0');
  assert.ok(init.result.capabilities.tools);
  session.notify('notifications/initialized');
  await checkTools((method, params) => session.send(method, params));
});

test('stdio modern discovery and tool calls share the same definitions', { timeout: 30000 }, async t => {
  const session = stdioSession(t);
  const discover = await session.send('server/discover', { _meta: modernMeta });
  assert.ok(discover.result);
  await checkTools((method, params = {}) => session.send(method, { ...params, _meta: modernMeta }));
});
