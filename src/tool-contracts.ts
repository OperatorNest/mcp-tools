import type { PricedModel } from './model-catalog.js';
import { AI_PLANS, CAPABILITIES } from './data/ai-plans.js';

export const TOOL_IDS = ['ai-api-cost-calculator', 'meeting-time-zone-planner', 'recurring-task-planner'] as const;
export type ToolId = typeof TOOL_IDS[number];
export class ToolInputError extends Error {
  constructor(public field: string, message: string) { super(message); this.name = 'ToolInputError'; }
}
function fail(field: string, message: string): never { throw new ToolInputError(field, message); }
function object(value: unknown, field = 'input'): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(field, 'Use a JSON object.');
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: string[], field = 'input') {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(field, `Unknown field: ${key}.`);
}
function text(value: unknown, field: string, max: number) {
  if (typeof value !== 'string' || !value.trim() || Array.from(value).length > max) fail(field, `Enter text of 1 to ${max} characters.`);
  return (value as string).trim();
}
function number(value: unknown, field: string, min: number, max: number) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) fail(field, `Use a whole number from ${min} to ${max}.`);
  return value as number;
}
function list(value: unknown, field: string, min: number, max: number): unknown[] {
  if (!Array.isArray(value) || value.length < min || Array.from(value).length > max) fail(field, `Use ${min} to ${max} items.`);
  return value as unknown[];
}
export function validDate(value: unknown, field = 'date'): string {
  const date = text(value, field, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < '2000-01-01' || date > '2100-12-31' || !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) fail(field, 'Use a real date from 2000-01-01 to 2100-12-31.');
  return date;
}
const integer = (minimum: number, maximum: number) => ({ type: 'integer', minimum, maximum });
const string = (maxLength: number) => ({ type: 'string', minLength: 1, maxLength, pattern:'\\S' });
const dateSchema = { type: 'string', format: 'date', minLength:10, maxLength:10, pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Real calendar date from 2000-01-01 to 2100-12-31.', examples:['2026-10-05'] };
const objectSchema = <T extends Record<string, unknown>>(properties: T, required = Object.keys(properties)) => ({ type: 'object', additionalProperties: false, properties, required });
export const inputSchemas = {
  'ai-subscription-cost-calculator': objectSchema({ planIds: { type:'array',minItems:0,maxItems:AI_PLANS.length,uniqueItems:true,description:'Unique subscription IDs from the enum. An empty list returns zero totals and no selected plans.',examples:[['chatgpt-plus','claude-pro'],[]],items:{ type:'string',enum:AI_PLANS.map(p => p.id),description:'ID of a plan in the bundled subscription catalog.' } } }),
  'cron-expression-generator': objectSchema({
    expression:{...string(200),description:'Cron fields in the selected dialect: five for github/cloudflare, six or seven for quartz, six for aws (optional cron(...) wrapper). Supports *, lists, ranges, steps and weekday names; rejects L, W, # and named months. Quartz/aws require ? in exactly one day field.',examples:['0 9 * * 1-5']},
    dialect:{ type:'string',enum:['github','cloudflare','quartz','aws'],description:'Scheduler syntax and weekday numbering. github uses 0 or 7 for Sunday and 1–6 for Monday–Saturday; the others use 1–7 for Sunday–Saturday.',examples:['github'] },
    zone:{...string(100),description:'IANA time zone for matching local cron fields. cloudflare requires UTC. Daylight saving transitions follow the runtime time-zone database.',examples:['UTC','America/New_York']},
    after:{ type:'string',format:'date-time',minLength:20,maxLength:24,pattern:'^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?Z$',description:'UTC ISO instant from 2000 through 2100; matches are strictly after this instant. Only Z offsets are accepted.',examples:['2026-10-02T00:00:00Z'] },
    count:{...integer(1,10),description:'Maximum matches to return. The list may be shorter or empty if no further matches occur within the 366-day search.',examples:[3]},
  }),
  'ai-api-cost-calculator': objectSchema({
    inputTokens:{...integer(0,100000000),description:'Total input tokens per request, including cached input tokens.',examples:[10000]},
    cachedInputTokens:{...integer(0,100000000),description:'Cached portion of inputTokens per request; must not exceed inputTokens. Use 0 without caching.',examples:[5000]},
    outputTokens:{...integer(0,100000000),description:'Generated output tokens per request.',examples:[2000]},
    requestsPerDay:{...integer(0,10000000),description:'Requests used to scale the daily estimate, independent of requestsPerMonth.',examples:[100]},
    requestsPerMonth:{...integer(0,100000000),description:'Requests used to scale the monthly estimate; not inferred from the daily count.',examples:[3000]},
    modelIds:{ type:'array',minItems:1,maxItems:20,uniqueItems:true,description:'Unique providerId/id values from the MCP pricing catalog. Unknown or unavailable IDs fail validation.',items:{...string(200),description:'Model ID accepted by the MCP pricing catalog.'} },
    batchModelIds:{ type:'array',minItems:0,maxItems:20,uniqueItems:true,items:{...string(200),description:'Selected model ID with a published batch discount.'},description:'Optional subset of modelIds to price with published batch discounts. Omission or [] uses standard rates; IDs without a published discount are rejected.',examples:[[]] },
  }, ['inputTokens','cachedInputTokens','outputTokens','requestsPerDay','requestsPerMonth','modelIds']),
  'meeting-time-zone-planner': objectSchema({ date:{...dateSchema,description:'Meeting date in the first person’s local time zone, from 2000-01-01 to 2100-12-31.'}, people: { type:'array',minItems:2,maxItems:8,description:'Participants in display order. The first person determines the local date; all must fit a full half-hour inside 09:00–17:00.',items:objectSchema({ name:{...string(80),description:'Participant label used in the returned local-time display.',examples:['Sam']},zone:{...string(100),description:'IANA time zone supported by Intl.DateTimeFormat.',examples:['America/New_York','Asia/Kolkata']} }) } }),
  'recurring-task-planner': objectSchema({ startDate:{...dateSchema,description:'Earliest date for the first occurrence of each task, from 2000-01-01 to 2100-12-31.'},tasks:{ type:'array',minItems:0,maxItems:20,description:'Tasks to include in the estimate and calendar. [] returns zero hours and a calendar with no events.',items:objectSchema({
    title:{...string(80),description:'Task label used as the calendar event summary.',examples:['Investor update']},
    frequency:{ type:'string',enum:['weekly','biweekly','monthly'],description:'Repeat every week, every two weeks from the first matching weekday, or every month.' },
    day:{ type:'string',enum:['MO','TU','WE','TH','FR','SA','SU'],description:'Weekday for weekly/biweekly tasks. Required but ignored for monthly tasks.',examples:['MO'] },
    monthday:{...integer(1,28),description:'Day of month for monthly tasks, limited to dates present in every month. Required but ignored for weekly/biweekly tasks.',examples:[1]},
    minutes:{...integer(1,1440),description:'Estimated minutes per run; used for event duration and monthly hours.',examples:[35]},
    time:{ type:'string',minLength:5,maxLength:5,pattern:'^([01][0-9]|2[0-3]):[0-5][0-9]$',description:'24-hour HH:mm start time, floating in the importing calendar’s local time zone.',examples:['09:00'] },
    owner:{ type:'string',enum:['delegate','keep','decide'],description:'Planning label: delegate to an operator, keep for yourself, or decide later. Included in the calendar note; does not assign or execute work.' },
  }) } }),
};
export type CostInput = { inputTokens: number; cachedInputTokens: number; outputTokens: number; requestsPerDay: number; requestsPerMonth: number; modelIds: string[]; batchModelIds: string[] };
export function calculateCost(raw: unknown, models: PricedModel[], snapshotAt: string) {
  const v = object(raw); keys(v, Object.keys(inputSchemas['ai-api-cost-calculator'].properties));
  const input: CostInput = {
    inputTokens: number(v.inputTokens, 'inputTokens', 0, 100000000), cachedInputTokens: number(v.cachedInputTokens, 'cachedInputTokens', 0, 100000000), outputTokens: number(v.outputTokens, 'outputTokens', 0, 100000000), requestsPerDay: number(v.requestsPerDay, 'requestsPerDay', 0, 10000000), requestsPerMonth: number(v.requestsPerMonth, 'requestsPerMonth', 0, 100000000),
    modelIds: list(v.modelIds, 'modelIds', 1, 20).map((id) => text(id, 'modelIds', 200)),
    batchModelIds: list(v.batchModelIds ?? [],'batchModelIds',0,20).map(id => text(id,'batchModelIds',200)),
  };
  if (input.cachedInputTokens > input.inputTokens) fail('cachedInputTokens', 'Cached tokens cannot exceed input tokens.');
  if (new Set(input.modelIds).size !== input.modelIds.length) fail('modelIds', 'Select each model only once.');
  if (new Set(input.batchModelIds).size !== input.batchModelIds.length || input.batchModelIds.some(id => !input.modelIds.includes(id))) fail('batchModelIds','Batch IDs must be unique selected model IDs.');
  const estimates = input.modelIds.map((id) => {
    const model = models.find((m) => m.modelId === id); if (!model) fail('modelIds', `Unknown model: ${id}. Read /api/models?subset=pricing for available IDs.`);
    const longContext = model.longContextThresholdTokens !== undefined && input.inputTokens > model.longContextThresholdTokens;
    const inputRate = model.inputUsdPerMillion === null ? null : model.inputUsdPerMillion * (longContext ? model.longContextInputMultiplier ?? 1 : 1);
    const cachedRate = model.inputUsdPerMillion === null ? null : (model.cachedInputUsdPerMillion ?? model.inputUsdPerMillion) * (longContext ? model.longContextCachedInputMultiplier ?? 1 : 1);
    const outputRate = model.outputUsdPerMillion === null ? null : model.outputUsdPerMillion * (longContext ? model.longContextOutputMultiplier ?? 1 : 1);
    const batch=input.batchModelIds.includes(id); if(batch && model.batchDiscountPercent === null) fail('batchModelIds',`No published batch discount for ${id}.`);
    const standardDiscount=batch ? (100-(model.batchDiscountPercent ?? 0))/100 : 1; const cachedDiscount=batch ? (100-(model.batchCachedInputDiscountPercent ?? model.batchDiscountPercent ?? 0))/100 : 1;
    const perRequest = inputRate === null || cachedRate === null || outputRate === null ? null : ((input.inputTokens - input.cachedInputTokens) * inputRate * standardDiscount + input.cachedInputTokens * cachedRate * cachedDiscount + input.outputTokens * outputRate * standardDiscount) / 1000000;
    return { modelId: id, name: model.name, perRequest, perDay: perRequest === null ? null : perRequest * input.requestsPerDay, perMonth: perRequest === null ? null : perRequest * input.requestsPerMonth, longContext, batch, ratesPerMillion: { input: inputRate, cachedInput: cachedRate, output: outputRate }, sourceUrl: model.sourceUrl, note: model.priceNote };
  });
  return { tool: 'ai-api-cost-calculator' as const, input, units: { tokens: 'tokens/request', rates: 'USD/million tokens', estimates: 'USD' }, method: '((input - cached) × input rate + cached × cache rate + output × output rate) / 1000000', assumptions: ['Cached rate falls back to input rate when absent.', 'Non-token charges excluded; batch discounts only when published and requested.', 'Published long-context rates apply above the catalog threshold.'], provenance: { source: 'models.dev', snapshotAt }, estimates };
}
export type Person = { name: string; zone: string };
const partsAt = (instant: number, zone: string) => Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'short' }).formatToParts(instant).map((p) => [p.type, p.value]));
export const localMinutes = (instant: number, zone: string) => { const p = partsAt(instant, zone); return Number(p.hour) * 60 + Number(p.minute); };
export const zonedLabel = (instant: number, zone: string) => {
  const p = partsAt(instant, zone); const h = Number(p.hour);
  return `${new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'short', month: 'short', day: 'numeric' }).format(instant)}, ${h % 12 || 12}:${p.minute} ${h < 12 ? 'a.m.' : 'p.m.'} ${p.timeZoneName}`;
};
export function planMeeting(raw: unknown) {
  const v = object(raw); keys(v, ['date', 'people']); const date = validDate(v.date);
  const people = list(v.people, 'people', 2, 8).map((raw, i) => { const p = object(raw, `people.${i}`); keys(p, ['name', 'zone'], `people.${i}`); const person = { name: text(p.name, `people.${i}.name`, 80), zone: text(p.zone, `people.${i}.zone`, 100) }; try { partsAt(0, person.zone); } catch { fail(`people.${i}.zone`, `Unknown time zone: ${person.zone}.`); } return person; });
  const midnight = Date.parse(`${date}T00:00:00Z`);
  const rows: { start: number; startUtc: string; inside: boolean[]; labels: string[]; score: number }[] = [];
  // Enumerate real instants, including repeated hours on DST days. Filter by the first person's local date.
  for (let start = midnight - 86400000; start < midnight + 2 * 86400000; start += 900000) {
    const p = partsAt(start, people[0].zone); if (`${p.year}-${p.month}-${p.day}` !== date || Number(p.minute) % 30 !== 0) continue;
    const inside = people.map(({ zone }) => { const a = localMinutes(start, zone), b = localMinutes(start + 1800000 - 1, zone); return a >= 540 && a < 1020 && b >= 540 && b < 1020; });
    rows.push({ start, startUtc: new Date(start).toISOString(), inside, labels: people.map(({ zone }) => zonedLabel(start, zone)), score: people.reduce((sum, { zone }) => sum + Math.abs(localMinutes(start, zone) / 60 + .25 - 13), 0) });
  }
  const slots = rows.filter((r) => r.inside.every(Boolean)).sort((a,b) => a.score - b.score || a.start - b.start);
  return { tool: 'meeting-time-zone-planner' as const, input: { date, people }, units: { duration: 'minutes', startUtc: 'ISO 8601 UTC', score: 'sum of hours from 13:00 at slot midpoint' }, method: 'Enumerate real half-hour instants on the first person’s local date; rank shared workday slots by distance from 13:00.', assumptions: ['Workday is 09:00–17:00 in each time zone.', 'Meeting length is 30 minutes.', 'No holiday or calendar availability lookup.'], provenance: { timeZones: 'Runtime Intl time zone database; DST applied for the selected date.' }, rows, overlapCount: slots.length, bestSlots: slots.slice(0,3) };
}
export type RecurringTask = { title: string; frequency: 'weekly' | 'biweekly' | 'monthly'; day: string; monthday: number; minutes: number; time: string; owner: string };
const weekdays: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
export function recurringOnDate(task: RecurringTask, date: string, startDate: string) {
  const d = new Date(`${date}T00:00:00Z`), start = new Date(`${startDate}T00:00:00Z`);
  if (d < start) return false;
  if (task.frequency === 'monthly') return d.getUTCDate() === task.monthday;
  if (d.getUTCDay() !== weekdays[task.day]) return false;
  const first = +start + ((weekdays[task.day] - start.getUTCDay() + 7) % 7) * 86400000;
  return task.frequency === 'weekly' || ((+d - first) / 86400000) % 14 === 0;
}
const escapeIcs = (s: string) => s.replace(/\\/g, '\\\\').replace(/[\r\n]+/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
function fold(line: string) { let out = '', bytes = 0; for (const c of line) { const size = new TextEncoder().encode(c).length; if (bytes + size > 75) { out += '\r\n '; bytes = 1; } out += c; bytes += size; } return out; }
/** SHA-256 of normalized content keeps calendar identity stable without a store.
 * Synchronous hashing lets browser controls and stateless APIs share one result.
 */
export function contentIdentity(text: string): string {
  const bytes=new TextEncoder().encode(text);
  const data=new Uint8Array(Math.ceil((bytes.length+9)/64)*64); data.set(bytes); data[bytes.length]=0x80;
  const view=new DataView(data.buffer); view.setUint32(data.length-8,Math.floor(bytes.length/0x20000000)); view.setUint32(data.length-4,bytes.length*8);
  const constants=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const hash=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const rotate=(value:number,bits:number)=>(value>>>bits)|(value<<(32-bits));
  const words=new Uint32Array(64);
  for(let offset=0;offset<data.length;offset+=64){
    for(let i=0;i<16;i++) words[i]=view.getUint32(offset+i*4);
    for(let i=16;i<64;i++){ const a=words[i-15],b=words[i-2]; words[i]=(words[i-16]+(rotate(a,7)^rotate(a,18)^(a>>>3))+words[i-7]+(rotate(b,17)^rotate(b,19)^(b>>>10)))>>>0; }
    let [a,b,c,d,e,f,g,h]=hash;
    for(let i=0;i<64;i++){ const first=(h+(rotate(e,6)^rotate(e,11)^rotate(e,25))+((e&f)^(~e&g))+constants[i]+words[i])>>>0; const second=((rotate(a,2)^rotate(a,13)^rotate(a,22))+((a&b)^(a&c)^(b&c)))>>>0; h=g;g=f;f=e;e=(d+first)>>>0;d=c;c=b;b=a;a=(first+second)>>>0; }
    for(const [i,value] of [a,b,c,d,e,f,g,h].entries()) hash[i]=(hash[i]+value)>>>0;
  }
  return hash.map(value=>value.toString(16).padStart(8,'0')).join('');
}
export function planRecurring(raw: unknown) {
  const v = object(raw); keys(v, ['startDate', 'tasks']); const startDate = validDate(v.startDate, 'startDate');
  const tasks = list(v.tasks, 'tasks', 0, 20).map((raw, i): RecurringTask => { const t = object(raw, `tasks.${i}`); keys(t, ['title','frequency','day','monthday','minutes','time','owner'], `tasks.${i}`); const title = text(t.title, `tasks.${i}.title`,80), frequency = text(t.frequency, `tasks.${i}.frequency`, 10), day = text(t.day, `tasks.${i}.day`,2), time = text(t.time, `tasks.${i}.time`,5), owner = text(t.owner, `tasks.${i}.owner`,8); if (!['weekly','biweekly','monthly'].includes(frequency)) fail(`tasks.${i}.frequency`, 'Choose weekly, biweekly or monthly.'); if (!(day in weekdays)) fail(`tasks.${i}.day`, 'Use MO, TU, WE, TH, FR, SA or SU.'); if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) fail(`tasks.${i}.time`, 'Use a valid HH:mm local time.'); if (!['delegate','keep','decide'].includes(owner)) fail(`tasks.${i}.owner`, 'Choose delegate, keep or decide.'); return { title, frequency: frequency as RecurringTask['frequency'], day, monthday: number(t.monthday, `tasks.${i}.monthday`,1,28), minutes: number(t.minutes, `tasks.${i}.minutes`,1,1440), time, owner }; });
  const monthlyHours = tasks.reduce((sum,t) => sum + t.minutes / 60 * (t.frequency === 'weekly' ? 52/12 : t.frequency === 'biweekly' ? 26/12 : 1), 0);
  const planIdentity=contentIdentity(JSON.stringify({startDate,tasks}));
  const stamp = startDate.replace(/-/g,'') + 'T000000Z';
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//OperatorNest//Recurring task planner//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
  const schedules = tasks.map((task,i) => { let date = new Date(`${startDate}T00:00:00Z`); for (let d = 0; d < 32 && !recurringOnDate(task,date.toISOString().slice(0,10),startDate); d++) date.setUTCDate(date.getUTCDate()+1); const firstDate = date.toISOString().slice(0,10); const start = `${firstDate.replace(/-/g,'')}T${task.time.replace(':','')}00`; const end = new Date(`${firstDate}T${task.time}:00Z`); end.setUTCMinutes(end.getUTCMinutes()+task.minutes); const endText = end.toISOString().replace(/[-:]/g,'').slice(0,15); const rule = task.frequency === 'monthly' ? `FREQ=MONTHLY;BYMONTHDAY=${task.monthday}` : `FREQ=WEEKLY;${task.frequency === 'biweekly' ? 'INTERVAL=2;' : ''}BYDAY=${task.day}`; lines.push('BEGIN:VEVENT',`UID:${planIdentity}-${i}@operatornest.com`,`DTSTAMP:${stamp}`,`DTSTART:${start}`,`DTEND:${endText}`,`RRULE:${rule}`,`SUMMARY:${escapeIcs(task.title)}`,`DESCRIPTION:${escapeIcs(`Estimated ${task.minutes} minutes per run. Plan: ${task.owner}. Review data access and approvals before assigning work.`)}`,'END:VEVENT'); return { ...task, firstDate, recurrenceRule: rule }; });
  lines.push('END:VCALENDAR');
  return { tool: 'recurring-task-planner' as const, input: { startDate, tasks }, units: { monthlyHours: 'hours/month', minutes: 'minutes/run' }, monthlyHours, method: 'Sum minutes / 60 × monthly runs. Weekly = 52/12; biweekly = 26/12; monthly = 1.', assumptions: ['Start date anchors biweekly recurrence.', 'Calendar uses floating local time in the importing calendar’s time zone.', 'Monthly dates are limited to days 1–28.', 'Calendar entries do not execute tasks.'], provenance: { calendar: 'RFC 5545 sections 3.3.5 and 3.8.5.3' }, schedules, ics: lines.map(fold).join('\r\n')+'\r\n' };
}

export function calculateSubscriptionStack(raw: unknown) {
  const v = object(raw); keys(v, ['planIds']);
  const planIds = list(v.planIds, 'planIds', 0, AI_PLANS.length).map(id => text(id, 'planIds', 80));
  if (new Set(planIds).size !== planIds.length) fail('planIds', 'Select each plan only once.');
  if (planIds.some(id => !AI_PLANS.some(p => p.id === id))) fail('planIds', 'Choose a listed plan ID.');
  // Catalog order preserves the page's summary and overlap order.
  const plans = AI_PLANS.filter(p => planIds.includes(p.id));
  const monthlyTotal = plans.reduce((sum,p) => sum + p.monthly, 0);
  const annualTotal = plans.reduce((sum,p) => sum + (p.annual ?? p.monthly * 12), 0);
  const overlap = CAPABILITIES.map(cap => ({ ...cap, planIds:plans.filter(p => p.capabilities[cap.id]).map(p => p.id) }));
  return { tool:'ai-subscription-cost-calculator' as const,input:{planIds:plans.map(p => p.id)},units:{totals:'USD'},plans,monthlyTotal,annualTotal,overlap,
    method:'Sum monthly charges. Annual totals use published annual charges or twelve monthly charges.',
    assumptions:['US listed prices; taxes, promotions and usage charges excluded.','Capability overlap is a review prompt, not a recommendation to cancel.'],
    provenance:{checked:'2026-09-27',sources:plans.map(p => ({planId:p.id,url:p.source,checked:p.checked}))} };
}

export type CronDialect = 'github' | 'cloudflare' | 'quartz' | 'aws';
export const CRON_SOURCES = {
  github:'https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows',
  cloudflare:'https://developers.cloudflare.com/workers/configuration/cron-triggers/',
  quartz:'https://www.quartz-scheduler.org/documentation/quartz-2.5.x/tutorials/crontrigger.html',
  aws:'https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html',
};
const parseField = (source: string, min: number, max: number): Set<number> => {
  const result = new Set<number>();
  for (const part of source.split(',')) {
    const segments = part.split('/');
    if (segments.length > 2) fail('expression', 'Use one step per field segment.');
    const [range, rawStep] = segments;
    if (!range || (rawStep !== undefined && !/^\d+$/.test(rawStep)))
      throw new Error('Use numbers, *, lists, ranges, or steps.');
    const step = rawStep === undefined ? 1 : Number(rawStep);
    if (step < 1) throw new Error('Steps must be at least 1.');
    let start: number;
    let end: number;
    if (range === '*') {
      start = min;
      end = max;
    } else if (/^\d+$/.test(range)) {
      start = Number(range);
      end = rawStep === undefined ? start : max;
    } else if (/^\d+-\d+$/.test(range)) {
      [start, end] = range.split('-').map(Number);
    } else throw new Error('Special calendar characters need the target scheduler.');
    if (start < min || end > max || start > end)
      throw new Error(`Field value must be ${min} to ${max}.`);
    for (let n = start; n <= end; n += step) result.add(n);
  }
  return result;
};
const parseWeekField = (source: string, sundayIsOne: boolean): Set<number> => {
  const names = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const numeric = source.replace(/\b(?:SUN|MON|TUE|WED|THU|FRI|SAT)\b/gi, (name) =>
    String(names.indexOf(name.toUpperCase()) + (sundayIsOne ? 1 : 0)),
  );
  return parseField(numeric, sundayIsOne ? 1 : 0, sundayIsOne ? 7 : 6);
};
const formatter = (zone: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  });
const parts = (date: Date, format: Intl.DateTimeFormat) => {
  const record = Object.fromEntries(
    format.formatToParts(date).map((item) => [item.type, item.value]),
  );
  return {
    year: Number(record.year),
    minute: Number(record.minute),
    hour: Number(record.hour),
    day: Number(record.day),
    month: Number(record.month),
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(record.weekday),
    label: format.format(date),
  };
};

export function cronNextRuns(rawInput: unknown) {
  const v=object(rawInput); keys(v,['expression','dialect','zone','after','count']);
  const expression=text(v.expression,'expression',200), dialect=text(v.dialect,'dialect',20) as CronDialect, zone=text(v.zone,'zone',100);
  if (!Object.hasOwn(CRON_SOURCES,dialect)) fail('dialect','Choose a listed scheduler.');
  if (dialect === 'cloudflare' && zone !== 'UTC') fail('zone','Cloudflare Cron Triggers run in UTC.');
  const after=text(v.after,'after',30), now=Date.parse(after), count=number(v.count,'count',1,10);
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(after) || !Number.isFinite(now)) fail('after','Use a UTC ISO instant.');
  validDate(after.slice(0,10),'after');
  if (new Date(now).toISOString().slice(0,19) !== after.slice(0,19)) fail('after','Use a real UTC time.');
  let format: Intl.DateTimeFormat;
  try { format=formatter(zone); format.format(now); } catch { fail('zone','Choose a valid IANA time zone.'); }
  let raw=expression;
  if (/^cron\(/i.test(raw)) { if (!raw.endsWith(')')) fail('expression','Close the cron expression with ).'); raw=raw.slice(5,-1).trim(); }
  const fields=raw.split(/\s+/), isQuartz=dialect==='quartz', isAws=dialect==='aws';
  if (!(isQuartz ? fields.length===6 || fields.length===7 : fields.length===(isAws ? 6 : 5))) fail('expression','Use the scheduler field count.');
  try {
    const calendarBase = isQuartz ? 3 : 2;
    const weekdayBase = isQuartz ? 5 : 4;
    const seconds = isQuartz ? parseField(fields[0], 0, 59) : new Set([0]);
    const minutes = parseField(fields[isQuartz ? 1 : 0], 0, 59);
    const hours = parseField(fields[isQuartz ? 2 : 1], 0, 23);
    const dayText = fields[calendarBase];
    const weekText = fields[weekdayBase];
    if ((isQuartz || isAws) && dayText === '?' && weekText === '?')
      throw new Error('Set either day of month or day of week; both cannot be ?.');
    if ((isQuartz || isAws) && dayText !== '?' && weekText !== '?')
      throw new Error('Use ? in either day of month or day of week for this scheduler.');
    if (!(isQuartz || isAws) && (dayText === '?' || weekText === '?'))
      throw new Error('? belongs to Quartz and AWS calendar fields, not this five-field syntax.');
    const days = parseField(dayText === '?' ? '*' : dayText, 1, 31);
    const months = parseField(fields[isQuartz ? 4 : 3], 1, 12);
    const weeks = parseWeekField(
      weekText === '?' ? '*' : weekText,
      isQuartz || isAws || dialect === 'cloudflare',
    );
    const years =
      isAws || fields.length === 7
        ? parseField(fields[isAws ? 5 : 6], 1970, isQuartz ? 2099 : 2199)
        : undefined;
    let cursor = Math.floor(now / 60000) * 60000;
    const maxMinutes = 366 * 24 * 60;
    const limit = cursor + maxMinutes * 60000;
    const dayWildcard = dayText === '*' || dayText === '?';
    const weekWildcard = weekText === '*' || weekText === '?';
    const offsetAt = (instant: number) => {
      const local = parts(new Date(instant), format);
      return Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute) - instant;
    };
    const jump = (minutesToBoundary: number, localOffset: number) => {
      const target = Math.min(limit, cursor + minutesToBoundary * 60000);
      if (offsetAt(target) === localOffset) {
        cursor = target;
        return;
      }
      // Stop at the offset change and read local fields again. A daylight-saving
      // jump can move the next local day or hour in either direction.
      let low = cursor / 60000;
      let high = target / 60000;
      while (high - low > 1) {
        const middle = Math.floor((low + high) / 2);
        if (offsetAt(middle * 60000) === localOffset) low = middle;
        else high = middle;
      }
      cursor = high * 60000;
    };
    const sortedSeconds=[...seconds].sort((a,b) => a-b);
    const matches: {startUtc:string;label:string}[]=[];
    while (cursor < limit && matches.length < count) {
      const p = parts(new Date(cursor), format);
      const week =
        isQuartz || isAws || dialect === 'cloudflare' ? p.weekday + 1 : p.weekday;
      const dayMatch = days.has(p.day);
      const weekMatch = weeks.has(week);
      const calendarMatch =
        isQuartz || isAws
          ? dayText === '?'
            ? weekMatch
            : weekText === '?'
              ? dayMatch
              : dayWildcard && weekWildcard
                ? true
                : dayWildcard
                  ? weekMatch
                  : weekWildcard
                    ? dayMatch
                    : dayMatch && weekMatch
          : dayWildcard && weekWildcard
            ? true
            : dayWildcard
              ? weekMatch
              : weekWildcard
                ? dayMatch
                : dayMatch || weekMatch;
      const localOffset = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - cursor;
      if (!months.has(p.month) || (years && !years.has(p.year)) || !calendarMatch) {
        jump((24 - p.hour) * 60 - p.minute, localOffset);
        continue;
      }
      if (!hours.has(p.hour)) {
        jump(60 - p.minute, localOffset);
        continue;
      }
      if (minutes.has(p.minute)) {
        for (const second of sortedSeconds) {
          const instant = cursor + second * 1000;
          if (instant > now && matches.length < count)
            matches.push({startUtc:new Date(instant).toISOString(),label:`${format.format(new Date(instant))} (${zone})`});
        }
      }
      cursor += 60000;
    }

    return {tool:'cron-expression-generator' as const,input:{expression,dialect,zone,after,count},runs:matches,searchDays:366,
      method:'Match real instants against numeric cron fields; stop after the requested count or 366 days.',
      assumptions:['Time zone is configured separately in the scheduler.','L, W, # and named month fields require the target scheduler.','Matching times do not guarantee scheduler execution.'],
      provenance:{sourceUrl:CRON_SOURCES[dialect],checked:'2026-09-28'}};
  } catch (error) { if (error instanceof ToolInputError) throw error; fail('expression',error instanceof Error ? error.message : 'Invalid expression.'); }
}
