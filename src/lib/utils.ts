import { AIModel } from "./types";

/**
 * Cost fields normalized to $/1M tokens.
 */
export interface ModelCostInfo {
  input: number;
  output: number;
  cacheRead?: number | null;
}

/**
 * User-controllable assumptions that shape the avg price calculation.
 *
 * `outputTokenShare` is the percent of total tokens that are output/completion.
 * `inputCacheHitRate` is the percent of input/prompt tokens served from cache.
 * Both values are ratios in [0, 1].
 */
export interface CostAssumptions {
  outputTokenShare: number;
  inputCacheHitRate: number;
}

export const DEFAULT_COST_ASSUMPTIONS: CostAssumptions = {
  outputTokenShare: 0.1,
  inputCacheHitRate: 7 / 9,
};

export const COST_ASSUMPTIONS_STORAGE_KEY = "kilo.avgPriceAssumptions.v1";

function clampRatio(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function normalizeCostAssumptions(
  assumptions: Partial<CostAssumptions> | null | undefined,
): CostAssumptions {
  return {
    outputTokenShare: clampRatio(
      assumptions?.outputTokenShare ?? DEFAULT_COST_ASSUMPTIONS.outputTokenShare,
      DEFAULT_COST_ASSUMPTIONS.outputTokenShare,
    ),
    inputCacheHitRate: clampRatio(
      assumptions?.inputCacheHitRate ?? DEFAULT_COST_ASSUMPTIONS.inputCacheHitRate,
      DEFAULT_COST_ASSUMPTIONS.inputCacheHitRate,
    ),
  };
}

export function areCostAssumptionsDefault(assumptions: CostAssumptions): boolean {
  const normalized = normalizeCostAssumptions(assumptions);
  return (
    Math.abs(normalized.outputTokenShare - DEFAULT_COST_ASSUMPTIONS.outputTokenShare) < 0.000001 &&
    Math.abs(normalized.inputCacheHitRate - DEFAULT_COST_ASSUMPTIONS.inputCacheHitRate) < 0.000001
  );
}

export function parseCostAssumptionParam(
  value: string | null,
  fallback: number,
): number {
  if (value == null || value.trim() === "") return fallback;
  return clampRatio(Number(value), fallback);
}

export function serializeCostAssumptionParam(value: number): string {
  return clampRatio(value, value).toFixed(6).replace(/\.?0+$/, "");
}

export function formatCostAssumptionPercent(value: number): string {
  const pct = clampRatio(value, value) * 100;
  return `${pct.toFixed(1).replace(/\.0$/, "")}%`;
}

export function formatCostAssumptionInputValue(value: number): string {
  return (clampRatio(value, value) * 100).toFixed(1).replace(/\.0$/, "");
}

export function formatCostAssumptionSummary(assumptions: CostAssumptions): string {
  const normalized = normalizeCostAssumptions(assumptions);
  return `${formatCostAssumptionPercent(normalized.outputTokenShare)} output, ${formatCostAssumptionPercent(normalized.inputCacheHitRate)} cache hit`;
}

/**
 * Calculates a weighted average price per 1M tokens.
 *
 * With valid positive cacheRead pricing:
 *   avg = output × outputShare
 *        + input × (1 − outputShare) × (1 − cacheHitRate)
 *        + cacheRead × (1 − outputShare) × cacheHitRate
 *
 * Without valid positive cacheRead pricing:
 *   `effectiveCacheReadPrice` falls back to `input`, so the input total
 *   weight becomes (1 − outputShare) and the formula reduces to:
 *   `input × (1 − outputShare) + output × outputShare`.
 *
 * Default assumptions reproduce the original behavior exactly:
 * - With cache: cacheRead×0.7 + input×0.2 + output×0.1
 * - Without cache: input×0.9 + output×0.1
 */
export function calculateAveragePrice(
  cost: ModelCostInfo,
  assumptions: CostAssumptions = DEFAULT_COST_ASSUMPTIONS,
): number {
  // Negative prices are unpublished "-1" sentinels (auto-router models): the
  // average cannot be computed, so propagate NaN rather than clamping to a
  // value that would display as "Free" and mislead.
  const input = Number.isFinite(cost.input) ? cost.input : 0;
  const output = Number.isFinite(cost.output) ? cost.output : 0;
  if (input < 0 || output < 0) return NaN;
  const cacheRead =
    cost.cacheRead != null && Number.isFinite(cost.cacheRead)
      ? Math.max(0, cost.cacheRead)
      : 0;
  const normalized = normalizeCostAssumptions(assumptions);
  const outputShare = normalized.outputTokenShare;
  const inputShare = 1 - outputShare;
  const cacheHitRate = normalized.inputCacheHitRate;
  const effectiveCacheReadPrice = cacheRead > 0 ? cacheRead : input;
  return (
    output * outputShare +
    input * inputShare * (1 - cacheHitRate) +
    effectiveCacheReadPrice * inputShare * cacheHitRate
  );
}

export function getAveragePricePerMillion(
  model: AIModel,
  assumptions: CostAssumptions = DEFAULT_COST_ASSUMPTIONS,
): number {
  return (
    calculateAveragePrice(
      {
        input: parseFloat(model.pricing.prompt),
        output: parseFloat(model.pricing.completion),
        cacheRead:
          model.pricing.input_cache_read != null
            ? parseFloat(model.pricing.input_cache_read)
            : null,
      },
      assumptions,
    ) * 1_000_000
  );
}

export function getProviderFromId(modelId: string): string {
  const parts = modelId.split("/");
  if (parts.length >= 2) {
    return parts[0];
  }
  return "unknown";
}

export function formatProviderName(provider: string): string {
  const providerMap: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    meta: "Meta",
    google: "Google",
    mistralai: "Mistral AI",
    cohere: "Cohere",
    "01-ai": "01.AI",
    "x-ai": "xAI",
    deepseek: "DeepSeek",
    qwen: "Qwen",
    microsoft: "Microsoft",
    amazon: "Amazon",
    nvidia: "NVIDIA",
    perplexity: "Perplexity",
    minimax: "MiniMax",
    "z-ai": "Z.ai",
    kilo: "Kilo",
    together: "Together AI",
    groq: "Groq",
    fireworks: "Fireworks",
    databricks: "Databricks",
    inflection: "Inflection",
    ai21: "AI21",
    allenai: "AllenAI",
    "liquid-ai": "Liquid AI",
    nousresearch: "Nous Research",
    teknium: "Teknium",
    "open-orca": "Open Orca",
    "cognitive-computations": "Cognitive Computations",
    huggingfaceh4: "HuggingFace H4",
    openchat: "OpenChat",
    phind: "Phind",
    wizardlm: "WizardLM",
    gryphe: "Gryphe",
    undi95: "Undi95",
    jondurbin: "Jon Durbin",
    austism: "Austism",
    sophosympatheia: "Sophosympatheia",
    sao10k: "Sao10k",
    neversleep: "Neversleep",
    pygmalionai: "PygmalionAI",
    rwkv: "RWKV",
    mancer: "Mancer",
    lynn: "Lynn",
    recursal: "Recursal",
    alpindale: "Alpindale",
    thedrummer: "TheDrummer",
    "eva-unit-01": "Eva Unit 01",
    aetherwiing: "Aetherwiing",
    liuhaotian: "LiuHaotian",
    "haotian-liu": "Haotian Liu",
    bytedance: "ByteDance",
    baidu: "Baidu",
    zhipuai: "ZhipuAI",
    "baichuan-inc": "Baichuan",
    internlm: "InternLM",
    tiiuae: "TII UAE",
    bigcode: "BigCode",
    eleutherai: "EleutherAI",
    stabilityai: "Stability AI",
    mosaicml: "MosaicML",
    lmsys: "LMSYS",
    togethercomputer: "Together Computer",
    "garage-baind": "Garage bAInd",
    migtissera: "Migtissera",
    openrouter: "OpenRouter",
  };

  return providerMap[provider.toLowerCase()] || capitalize(provider);
}

function capitalize(str: string): string {
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatContextLength(length: number): string {
  if (length >= 1_000_000) {
    return `${(length / 1_000_000).toFixed(1)}M`;
  }
  if (length >= 1_000) {
    return `${Math.round(length / 1_000)}K`;
  }
  return length.toString();
}

export function formatPercent(value: number, fractionDigits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

export function formatPrice(price: string | number): string {
  const num = typeof price === "number" ? price : parseFloat(price);
  // NaN: average could not be computed (unpublished input prices).
  if (!Number.isFinite(num)) return "Varies";
  if (num === 0) return "Free";
  // Negative pricing (e.g. "-1" sentinels from auto-router models) means the
  // gateway has not published a real per-token price: display "Varies".
  if (num < 0) return "Varies";
  if (num < 0.000001) return `$${(num * 1_000_000).toFixed(4)}`;
  return `$${(num * 1_000_000).toFixed(2)}`;
}

export function getUniqueProviders(models: AIModel[]): string[] {
  const providers = new Set<string>();
  models.forEach((model) => {
    providers.add(getProviderFromId(model.id));
  });
  return Array.from(providers).sort();
}

export function isFreeModel(model: AIModel): boolean {
  return (
    parseFloat(model.pricing.prompt) === 0 &&
    parseFloat(model.pricing.completion) === 0
  );
}

/**
 * True when the model is a recent release: real `created` timestamp within
 * the last 14 days (relative to now). Routers/meta models (created === 0)
 * are never "new".
 */
export function isNewModel(model: AIModel): boolean {
  if (!model.created) return false;
  const ageMs = Date.now() - model.created * 1000;
  return ageMs >= 0 && ageMs < NEW_MODEL_WINDOW_MS;
}

/**
 * Formats a Unix timestamp (seconds) into a human-readable date string.
 * Returns null if the timestamp is 0 (used for meta models / routers).
 * Format: "15 Jan 2024" — unambiguous, never US month/day/year.
 */
export function formatCreatedDate(timestamp: number): string | null {
  if (!timestamp) return null;
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** How long after release a model is flagged as NEW on cards (14 days). */
export const NEW_MODEL_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export type SortBy =
  | "default"
  | "newest"
  | "oldest"
  | "price-asc"
  | "price-desc"
  | "bench-asc"
  | "bench-desc";

/**
 * Case-insensitive relevance score for search ordering.
 * Name exact-trim match 100, name prefix 80, name includes 60,
 * id includes 40, description includes 20, else 0.
 * Ties are broken by the caller via `created` descending.
 */
export function relevanceScore(model: AIModel, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const name = model.name.toLowerCase();
  const id = model.id.toLowerCase();
  const description = (model.description ?? "").toLowerCase();
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (name.includes(q)) return 60;
  if (id.includes(q)) return 40;
  if (description.includes(q)) return 20;
  return 0;
}

/**
 * True unless the average price is NaN, which happens only when pricing
 * carries the unpublished "-1" sentinels (auto-router models).
 */
export function hasPublishedPrice(model: AIModel): boolean {
  return !Number.isNaN(
    calculateAveragePrice({
      input: parseFloat(model.pricing.prompt),
      output: parseFloat(model.pricing.completion),
    }),
  );
}

/** Splits the `provider` URL param CSV into trimmed, non-empty parts. */
export function splitProviderParam(provider: string): string[] {
  return provider
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}
