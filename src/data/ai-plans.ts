export type Capability =
  | 'frontierChat'
  | 'deepResearch'
  | 'agentUse'
  | 'imageGeneration'
  | 'videoGeneration'
  | 'voiceMode'
  | 'codingAgent'
  | 'longContext'
  | 'scheduledTasks';

export const CAPABILITIES: { id: Capability; label: string }[] = [
  { id: 'frontierChat', label: 'Frontier chat' },
  { id: 'deepResearch', label: 'Deep research' },
  { id: 'agentUse', label: 'Agent or computer use' },
  { id: 'imageGeneration', label: 'Image generation' },
  { id: 'videoGeneration', label: 'Video generation' },
  { id: 'voiceMode', label: 'Voice mode' },
  { id: 'codingAgent', label: 'Coding agent' },
  { id: 'longContext', label: 'Large files or long context' },
  { id: 'scheduledTasks', label: 'Scheduled tasks' },
];

export type AIPlan = {
  id: string;
  provider: string;
  name: string;
  /** Monthly charge in USD. */
  monthly: number;
  /** Annual charge in USD, when an official source states it. */
  annual: number | null;
  /** Description of what annual is set to when no yearly billing is offered. */
  annualNote?: string;
  capabilities: Partial<Record<Capability, boolean>>;
  modelFamilies: string[];
  source: string;
  modelSource: string;
  checked: '2026-09-27';
  sourceNote?: string;
};

const checked = '2026-09-27' as const;

/** Prices and plan properties checked against linked official pages on 27 September 2026. */
export const AI_PLANS: AIPlan[] = [
  {
    id: 'chatgpt-go', provider: 'OpenAI', name: 'ChatGPT Go', monthly: 8, annual: null,
    annualNote: 'No annual billing. Annual view uses 12 monthly charges.',
    capabilities: { frontierChat: true, imageGeneration: true, longContext: true },
    modelFamilies: ['GPT'], source: 'https://openai.com/index/introducing-chatgpt-go/',
    modelSource: 'https://openai.com/index/introducing-chatgpt-go/', checked,
  },
  {
    id: 'chatgpt-plus', provider: 'OpenAI', name: 'ChatGPT Plus', monthly: 20, annual: null,
    annualNote: 'No annual billing. Annual view uses 12 monthly charges.',
    capabilities: { frontierChat: true, deepResearch: true, agentUse: true, imageGeneration: true, videoGeneration: true, voiceMode: true, codingAgent: true, longContext: true },
    modelFamilies: ['GPT'], source: 'https://openai.com/index/introducing-chatgpt-go/',
    modelSource: 'https://openai.com/index/introducing-chatgpt-go/', checked,
  },
  {
    id: 'chatgpt-pro', provider: 'OpenAI', name: 'ChatGPT Pro', monthly: 200, annual: null,
    annualNote: 'No annual billing. Annual view uses 12 monthly charges.',
    capabilities: { frontierChat: true, deepResearch: true, agentUse: true, imageGeneration: true, videoGeneration: true, voiceMode: true, codingAgent: true, longContext: true },
    modelFamilies: ['GPT'], source: 'https://openai.com/index/introducing-chatgpt-go/',
    modelSource: 'https://openai.com/index/introducing-chatgpt-go/', checked,
  },
  {
    id: 'claude-pro', provider: 'Anthropic', name: 'Claude Pro', monthly: 20, annual: 200,
    capabilities: { frontierChat: true, deepResearch: true, agentUse: true, voiceMode: true, codingAgent: true, longContext: true, scheduledTasks: true },
    modelFamilies: ['Claude'], source: 'https://www.anthropic.com/pricing',
    modelSource: 'https://www.anthropic.com/claude', checked,
    sourceNote: 'The annual charge is $200, billed up front. Anthropic lists $17/month as its annual equivalent.',
  },
  {
    id: 'claude-max-5x', provider: 'Anthropic', name: 'Claude Max 5x', monthly: 100, annual: null,
    annualNote: 'No annual amount listed. Annual view uses 12 monthly charges.',
    capabilities: { frontierChat: true, deepResearch: true, agentUse: true, voiceMode: true, codingAgent: true, longContext: true, scheduledTasks: true },
    modelFamilies: ['Claude'], source: 'https://www.anthropic.com/pricing',
    modelSource: 'https://www.anthropic.com/claude', checked,
  },
  {
    id: 'claude-max-20x', provider: 'Anthropic', name: 'Claude Max 20x', monthly: 200, annual: null,
    annualNote: 'No annual amount listed. Annual view uses 12 monthly charges.',
    capabilities: { frontierChat: true, deepResearch: true, agentUse: true, voiceMode: true, codingAgent: true, longContext: true, scheduledTasks: true },
    modelFamilies: ['Claude'], source: 'https://www.anthropic.com/pricing',
    modelSource: 'https://www.anthropic.com/claude', checked,
  },
  {
    id: 'google-ai-pro', provider: 'Google', name: 'Google AI Pro', monthly: 19.99, annual: 199.99,
    capabilities: { frontierChat: true, deepResearch: true, agentUse: true, imageGeneration: true, videoGeneration: true, codingAgent: true, longContext: true },
    modelFamilies: ['Gemini'], source: 'https://one.google.com/about/google-ai-plans/',
    modelSource: 'https://one.google.com/about/google-ai-plans/', checked,
    sourceNote: 'Annual charge shown in Google One’s US spend calculator.',
  },
  {
    id: 'google-ai-ultra-5x', provider: 'Google', name: 'Google AI Ultra (5x)', monthly: 99.99, annual: null,
    annualNote: 'Monthly billing only. Annual view uses 12 monthly charges.',
    capabilities: { frontierChat: true, deepResearch: true, agentUse: true, imageGeneration: true, videoGeneration: true, codingAgent: true, longContext: true },
    modelFamilies: ['Gemini'], source: 'https://one.google.com/about/google-ai-plans/',
    modelSource: 'https://one.google.com/about/google-ai-plans/', checked,
    sourceNote: 'Starting Ultra tier with 5x Pro access. The 20x tier starts at $199.99/month.',
  },
  {
    id: 'google-ai-ultra-20x', provider: 'Google', name: 'Google AI Ultra (20x)', monthly: 199.99, annual: null,
    annualNote: 'Monthly billing only. Annual view uses 12 monthly charges.',
    capabilities: { frontierChat: true, deepResearch: true, agentUse: true, imageGeneration: true, videoGeneration: true, codingAgent: true, longContext: true },
    modelFamilies: ['Gemini'], source: 'https://one.google.com/about/google-ai-plans/',
    modelSource: 'https://one.google.com/about/google-ai-plans/', checked,
    sourceNote: 'Starting price for the 20x access tier. Ultra plans are billed monthly only.',
  },
  {
    id: 'supergrok', provider: 'xAI', name: 'SuperGrok', monthly: 30, annual: null,
    annualNote: 'No annual amount listed. Annual view uses 12 monthly charges.',
    capabilities: { frontierChat: true, agentUse: true, imageGeneration: true, videoGeneration: true, voiceMode: true, codingAgent: true },
    modelFamilies: ['Grok'], source: 'https://x.ai/pricing',
    modelSource: 'https://docs.x.ai/grok/overview', checked,
  },
  {
    id: 'supergrok-plus', provider: 'xAI', name: 'SuperGrok Plus', monthly: 100, annual: null,
    annualNote: 'No annual amount listed. Annual view uses 12 monthly charges.',
    capabilities: { frontierChat: true, agentUse: true, imageGeneration: true, videoGeneration: true, voiceMode: true, codingAgent: true },
    modelFamilies: ['Grok'], source: 'https://x.ai/pricing',
    modelSource: 'https://docs.x.ai/grok/overview', checked,
  },
  {
    id: 'perplexity-pro', provider: 'Perplexity', name: 'Perplexity Pro', monthly: 20, annual: 200,
    capabilities: { frontierChat: true, deepResearch: true, agentUse: true, imageGeneration: true, videoGeneration: true, longContext: true },
    modelFamilies: ['GPT', 'Claude', 'Gemini'], source: 'https://www.perplexity.ai/help-center/en/articles/11187416-which-perplexity-subscription-plan-is-right-for-you',
    modelSource: 'https://www.perplexity.ai/help-center/en/articles/11187416-which-perplexity-subscription-plan-is-right-for-you', checked,
    sourceNote: 'Annual price confirmed on Perplexity’s official product information page.',
  },
  {
    id: 'perplexity-max', provider: 'Perplexity', name: 'Perplexity Max', monthly: 200, annual: 2000,
    capabilities: { frontierChat: true, deepResearch: true, agentUse: true, imageGeneration: true, videoGeneration: true, longContext: true },
    modelFamilies: ['GPT', 'Claude', 'Gemini'], source: 'https://www.perplexity.ai/help-center/en/articles/11680686-perplexity-max',
    modelSource: 'https://www.perplexity.ai/help-center/en/articles/11187416-which-perplexity-subscription-plan-is-right-for-you', checked,
  },
  {
    id: 'microsoft-365-premium', provider: 'Microsoft', name: 'Microsoft 365 Premium', monthly: 19.99, annual: 199.99,
    capabilities: { frontierChat: true, deepResearch: true, agentUse: true, imageGeneration: true, voiceMode: true, longContext: true },
    modelFamilies: ['Copilot'], source: 'https://www.microsoft.com/en-us/microsoft-365/p/microsoft-365-premium/cfq7ttc11z3q',
    modelSource: 'https://support.microsoft.com/en-us/microsoft-365-copilot/what-is-microsoft-copilot-app', checked,
    sourceNote: 'Microsoft 365 Premium is the current personal subscription with premium Copilot access.',
  },
  {
    id: 'mistral-pro', provider: 'Mistral', name: 'Le Chat Pro', monthly: 14.99, annual: null,
    annualNote: 'No annual amount listed. Annual view uses 12 monthly charges.',
    capabilities: { frontierChat: true, deepResearch: true, imageGeneration: true, codingAgent: true, longContext: true, scheduledTasks: true },
    modelFamilies: ['Mistral'], source: 'https://mistral.ai/pricing/',
    modelSource: 'https://mistral.ai/products/vibe/', checked,
  },
  {
    id: 'manus-pro', provider: 'Manus', name: 'Manus Pro (starting price)', monthly: 20, annual: null,
    annualNote: 'Annual billing is discounted, but the source does not state a fixed annual charge. Annual view uses 12 × the starting monthly price.',
    capabilities: { frontierChat: true, deepResearch: true, agentUse: true, longContext: true, scheduledTasks: true },
    modelFamilies: ['Manus 1.6'], source: 'https://help.manus.im/en/articles/11711111-what-is-the-current-membership-pricing-for-manus',
    modelSource: 'https://help.manus.im/en/articles/11711111-what-is-the-current-membership-pricing-for-manus', checked,
    sourceNote: 'Starting price; actual plan price varies by credit allowance.',
  },
  {
    id: 'genspark-plus', provider: 'Genspark', name: 'Genspark Plus', monthly: 24.99, annual: 239.99,
    capabilities: { frontierChat: true, deepResearch: true, agentUse: true, imageGeneration: true, videoGeneration: true, longContext: true },
    modelFamilies: ['GPT', 'Claude', 'Gemini', 'Grok'], source: 'https://www.genspark.ai/business/pricing',
    modelSource: 'https://www.genspark.ai/tools/ai-chat', checked,
    sourceNote: 'Published annual charge: $239.99. The page also shows a rounded $19.99/month annual-billing equivalent.',
  },
  {
    id: 'cursor-pro', provider: 'Cursor', name: 'Cursor Pro', monthly: 20, annual: 192,
    capabilities: { frontierChat: true, agentUse: true, codingAgent: true, longContext: true },
    modelFamilies: ['Grok', 'Composer', 'GPT', 'Claude', 'Gemini'], source: 'https://cursor.com/pricing',
    modelSource: 'https://cursor.com/docs/models-and-pricing', checked,
    sourceNote: 'Annual charge uses Cursor’s stated 20% yearly discount on the $20 monthly Pro price.',
  },
];
