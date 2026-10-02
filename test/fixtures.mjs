export const examples = {
  ai_api_cost: { inputTokens: 10000, cachedInputTokens: 5000, outputTokens: 2000, requestsPerDay: 100, requestsPerMonth: 3000, modelIds: ['anthropic/claude-opus-5-5'] },
  meeting_time_zones: { date: '2026-10-05', people: [{ name: 'Sam', zone: 'America/Los_Angeles' }, { name: 'Priya', zone: 'America/New_York' }] },
  recurring_schedule: { startDate: '2026-10-05', tasks: [{ title: 'Weekly update', frequency: 'weekly', day: 'MO', monthday: 1, minutes: 30, time: '09:00', owner: 'delegate' }] },
  ai_subscription_stack_cost: { planIds: ['chatgpt-plus', 'claude-pro'] },
  cron_next_runs: { expression: '0 9 * * 1-5', dialect: 'github', zone: 'UTC', after: '2026-10-02T00:00:00Z', count: 2 },
};
export const semanticErrors = {
  ai_api_cost: { cachedInputTokens: 10001 },
  meeting_time_zones: { date: '2026-02-30' },
  recurring_schedule: { startDate: '2026-02-30' },
  ai_subscription_stack_cost: { planIds: ['missing-plan'] },
  cron_next_runs: { expression: '0 9 L * *' },
};
export const initialize = { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'acceptance-test', version: '1.0.0' } };
export const modernMeta = { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientInfo': { name: 'acceptance-test', version: '1.0.0' }, 'io.modelcontextprotocol/clientCapabilities': {} };
