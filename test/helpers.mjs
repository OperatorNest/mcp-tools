import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { MCP_TOOLS } from '../dist/tools.js';
import { examples, semanticErrors } from './fixtures.mjs';
export const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

export async function checkTools(send) {
  const listed = await send('tools/list');
  assert.equal(listed.result.tools.length, 5);
  assert.deepEqual(listed.result.tools.map(t => t.name).sort(), MCP_TOOLS.map(t => t.name).sort());
  for (const tool of MCP_TOOLS) {
    const exposed = listed.result.tools.find(t => t.name === tool.name);
    assert.deepEqual(exposed.inputSchema, tool.inputSchema);
    assert.deepEqual(exposed.outputSchema, tool.outputSchema);
    const result = await send('tools/call', { name: tool.name, arguments: examples[tool.name] });
    assert.ok(!result.error && !result.result.isError, JSON.stringify(result));
    assert.deepEqual(result.result.structuredContent, tool.compute(examples[tool.name]));
    assert.equal(ajv.validate(tool.outputSchema, result.result.structuredContent), true, JSON.stringify(ajv.errors));
    for (const args of [{ ...examples[tool.name], extra: 'untrusted-fixture' }, { ...examples[tool.name], ...semanticErrors[tool.name] }]) {
      const bad = await send('tools/call', { name: tool.name, arguments: args });
      assert.ok(bad.error || bad.result?.isError, JSON.stringify(bad));
      assert.doesNotMatch(JSON.stringify(bad), /untrusted-fixture|missing-plan/);
      assert.equal(bad.result?.structuredContent, undefined);
      assert.match(bad.error?.message ?? bad.result.content[0].text, /Check the|Invalid input/);
    }
  }
  const missing = await send('tools/call', { name: 'untrusted-fixture', arguments: {} });
  assert.ok(missing.error || missing.result?.isError);
  assert.doesNotMatch(JSON.stringify(missing), /untrusted-fixture/);
}

export function stdioSession(t) {
  const child = spawn(process.execPath, ['dist/stdio.js'], { stdio: ['pipe', 'pipe', 'pipe'] });
  let id = 0, stderr = '';
  const waiting = new Map();
  child.stderr.on('data', data => { stderr += data; });
  const lines = createInterface({ input: child.stdout });
  lines.on('line', line => {
    let value;
    try { value = JSON.parse(line); } catch (error) { for (const entry of waiting.values()) entry.reject(error); return; }
    const entry = waiting.get(value.id);
    if (entry) { waiting.delete(value.id); clearTimeout(entry.timer); entry.resolve(value); }
  });
  child.on('error', error => { for (const entry of waiting.values()) entry.reject(error); });
  child.on('exit', code => { for (const entry of waiting.values()) entry.reject(new Error(`Server exited ${code}: ${stderr}`)); });
  t.after(async () => {
    for (const entry of waiting.values()) clearTimeout(entry.timer);
    lines.close();
    if (child.exitCode === null) {
      const exited = once(child, 'exit');
      child.stdin.end();
      const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
      const [code] = await exited;
      clearTimeout(timer);
      assert.equal(code, 0, stderr);
    }
  });
  return {
    send(method, params = {}) {
      const requestId = ++id;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { waiting.delete(requestId); reject(new Error(`Timed out: ${method}; ${stderr}`)); }, 10000);
        waiting.set(requestId, { resolve, reject, timer });
        child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params }) + '\n');
      });
    },
    notify(method) { child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method }) + '\n'); },
  };
}
