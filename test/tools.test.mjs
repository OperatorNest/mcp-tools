import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ajv } from './helpers.mjs';
import { MCP_TOOLS, callMcpTool } from '../dist/tools.js';
import { examples, semanticErrors } from './fixtures.mjs';
const tool = name => MCP_TOOLS.find(t => t.name === name);
const run = (name, input) => tool(name).compute(input);

test('exactly five tools with valid schemas and read-only annotations', () => {
  assert.deepEqual(MCP_TOOLS.map(t => t.name), Object.keys(examples));
  for (const t of MCP_TOOLS) {
    assert.equal(ajv.validateSchema(t.inputSchema), true, JSON.stringify(ajv.errors));
    assert.equal(ajv.validateSchema(t.outputSchema), true, JSON.stringify(ajv.errors));
    assert.deepEqual(t.annotations, { title: t.title, readOnlyHint: true, openWorldHint: false, destructiveHint: false, idempotentHint: true });
  }
});

for (const t of MCP_TOOLS) {
  test(`${t.name}: valid results, schemas and restorable result URL`, () => {
    const input = examples[t.name];
    assert.equal(ajv.validate(t.inputSchema, input), true);
    const result = callMcpTool(t, input);
    assert.equal(ajv.validate(t.outputSchema, result.structuredContent), true, JSON.stringify(ajv.errors));
    assert.deepEqual(result.structuredContent, t.compute(input));
    const text = result.content[0].text;
    const [answer, link] = text.split('Open this result: ');
    assert.ok(answer.length > 0);
    const url = new URL(link);
    assert.equal(url.origin, 'https://operatornest.com');
    assert.equal(url.pathname, `/tools/${t.slug}`);
    const restored = JSON.parse(Buffer.from(url.hash.slice(7), 'base64url').toString('utf8'));
    assert.deepEqual(restored.toolInput, result.structuredContent.input);
  });
  test(`${t.name}: malformed and semantically invalid calls`, () => {
    for (const input of [null, [], {}, { ...examples[t.name], extra: 'rejected-input' }, { ...examples[t.name], ...semanticErrors[t.name] }]) {
      assert.throws(() => run(t.name, input));
    }
  });
}

test('API arithmetic uses input, cached input and output separately', () => {
  const result = run('ai_api_cost', examples.ai_api_cost);
  const estimate = result.estimates[0];
  const rates = estimate.ratesPerMillion;
  assert.equal(estimate.perRequest, (5000 * rates.input + 5000 * rates.cachedInput + 2000 * rates.output) / 1e6);
  assert.equal(estimate.perDay, estimate.perRequest * 100);
  assert.equal(estimate.perMonth, estimate.perRequest * 3000);
  assert.throws(() => run('ai_api_cost', { ...examples.ai_api_cost, modelIds: ['missing'] }));
  assert.throws(() => run('ai_api_cost', { ...examples.ai_api_cost, modelIds: ['anthropic/claude-opus-5-5', 'anthropic/claude-opus-5-5'] }));
  assert.throws(() => run('ai_api_cost', { ...examples.ai_api_cost, batchModelIds: ['anthropic/claude-opus-5-5'] }));
});

test('pricing data is a dated offline snapshot, with source links', () => {
  const data = JSON.parse(readFileSync(new URL('../src/data/pricing-snapshot.json', import.meta.url)));
  assert.equal(data.updatedAt, '2026-09-28T17:08:16.340Z');
  assert.equal(data.models.length, 194);
  assert.equal(new Set(data.models.map(m => m.modelId)).size, 194);
  assert.equal(data.source, 'models.dev');
  for (const model of data.models) {
    assert.ok(model.modelId.startsWith(`${model.providerId}/`));
    assert.equal(new URL(model.sourceUrl).protocol, 'https:');
    assert.ok(model.checked);
  }
});

test('subscription annual billing, overlap and empty stack', () => {
  const result = run('ai_subscription_stack_cost', examples.ai_subscription_stack_cost);
  assert.equal(result.monthlyTotal, 40);
  assert.equal(result.annualTotal, 440);
  assert.deepEqual(result.overlap.find(c => c.id === 'frontierChat').planIds, ['chatgpt-plus', 'claude-pro']);
  for (const source of result.provenance.sources) {
    assert.equal(new URL(source.url).protocol, 'https:');
    assert.equal(source.checked, '2026-09-27');
  }
  assert.equal(run('ai_subscription_stack_cost', { planIds: [] }).annualTotal, 0);
  assert.throws(() => run('ai_subscription_stack_cost', { planIds: ['claude-pro', 'claude-pro'] }));
});

test('recurring schedules have stable identities, escaping and CRLF folding', () => {
  const input = { ...examples.recurring_schedule, tasks: [{ ...examples.recurring_schedule.tasks[0], title: 'é'.repeat(70) + ',\n;' }] };
  const result = run('recurring_schedule', input);
  assert.equal(result.monthlyHours, 30 / 60 * 52 / 12);
  assert.equal(result.schedules[0].firstDate, '2026-10-05');
  assert.equal(result.schedules[0].recurrenceRule, 'FREQ=WEEKLY;BYDAY=MO');
  assert.equal(result.ics, run('recurring_schedule', input).ics);
  assert.match(result.ics, /BEGIN:VCALENDAR\r\n/);
  assert.match(result.ics.replace(/\r\n /g, ''), /\\,\\n\\;/);
  for (const line of result.ics.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
  assert.equal(run('recurring_schedule', { startDate: '2026-10-05', tasks: [] }).monthlyHours, 0);
});

test('meetings account for the DST boundary and working hours', () => {
  const input = { date: '2026-11-01', people: [{ name: 'Sam', zone: 'America/New_York' }, { name: 'Priya', zone: 'UTC' }] };
  const result = run('meeting_time_zones', input);
  assert.equal(result.overlapCount, 6); // 09:00–12:00 New York = 14:00–17:00 UTC.
  for (const slot of result.bestSlots) assert.deepEqual(slot.inside, [true, true]);
  assert.throws(() => run('meeting_time_zones', { ...input, people: [{ name: 'Sam', zone: 'Invalid/Zone' }, input.people[1]] }));
});

test('cron is strictly after the instant and preserves repeated DST times', () => {
  const result = run('cron_next_runs', { ...examples.cron_next_runs, after: '2026-10-02T09:00:00Z' });
  assert.equal(result.runs[0].startUtc, '2026-10-05T09:00:00.000Z');
  const dst = run('cron_next_runs', { ...examples.cron_next_runs, expression: '30 1 * * *', zone: 'America/New_York', after: '2026-11-01T00:00:00Z' });
  assert.deepEqual(dst.runs.map(r => r.startUtc), ['2026-11-01T05:30:00.000Z', '2026-11-01T06:30:00.000Z']);
  for (const [dialect, expression] of [['quartz', '0 0 9 ? * MON-FRI'], ['aws', 'cron(0 9 ? * MON-FRI *)'], ['cloudflare', '0 9 * * MON-FRI']]) {
    assert.equal(run('cron_next_runs', { ...examples.cron_next_runs, dialect, expression }).runs[0].startUtc, '2026-10-02T09:00:00.000Z');
  }
  assert.throws(() => run('cron_next_runs', { ...examples.cron_next_runs, dialect: 'cloudflare', zone: 'America/New_York' }));
  for (const expression of ['0 9 * JAN *', '0 9 1W * *', '0 9 * * 1#2']) assert.throws(() => run('cron_next_runs', { ...examples.cron_next_runs, expression }));
});
