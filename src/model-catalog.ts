import snapshot from './data/pricing-snapshot.json';

export type CatalogModel = {
  providerId: string;
  providerName: string;
  providerDoc?: string;
  id: string;
  name: string;
  family?: string;
  canonicalModelId?: string;
  description?: string;
  type: 'decision' | null;
  cost: { input: number | null; output: number | null; [key: string]: unknown };
  limit: { context: number | null; output: number | null; input?: number };
  modalities: { input: string[]; output: string[] };
  reasoning: boolean;
  toolCall: boolean;
  attachment: boolean;
  openWeights: boolean;
  knowledge?: string;
  releaseDate?: string;
  lastUpdated?: string;
};

export type PricedModel = CatalogModel & {
  modelId: string;
  provider: string;
  inputUsdPerMillion: number | null;
  outputUsdPerMillion: number | null;
  cachedInputUsdPerMillion: number | null;
  contextWindowTokens: number | null;
  maxOutputTokens: number | null;
  sourceUrl: string;
  contextSourceUrl: string;
  checked: string;
  batchDiscountPercent: null;
  batchCachedInputDiscountPercent: null;
  priceNote: string;
  longContextThresholdTokens?: number;
  longContextInputMultiplier?: number;
  longContextCachedInputMultiplier?: number;
  longContextOutputMultiplier?: number;
};

export const MODEL_PRICING = snapshot.models as PricedModel[];
export const modelCatalogUpdatedAt = snapshot.updatedAt;
