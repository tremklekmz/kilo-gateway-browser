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
  const input = Number.isFinite(cost.input) ? cost.input : 0;
  const output = Number.isFinite(cost.output) ? cost.output : 0;
  const cacheRead =
    cost.cacheRead != null && Number.isFinite(cost.cacheRead)
      ? cost.cacheRead
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
  if (!Number.isFinite(num) || num === 0) return "Free";
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
