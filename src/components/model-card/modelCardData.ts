import {
  calculateAveragePrice,
  type CostAssumptions,
  DEFAULT_COST_ASSUMPTIONS,
  formatContextLength,
  formatCreatedDate,
  formatCostAssumptionSummary,
  formatPrice,
  formatRelativeAge,
  getProviderFromId,
  isFreeModel,
  isNewModel,
} from "@/lib/utils";
import type { AIModel } from "@/lib/types";

export interface ModelCardData {
  provider: string;
  free: boolean;
  isNew: boolean;
  promptPrice: string;
  completionPrice: string;
  contextLength: string;
  avgPrice: string;
  avgAssumptionSummary: string;
  createdDate: string | null;
  relativeAge: string | null;
  relativeAgeFresh: boolean;
}

export function getModelCardData(
  model: AIModel,
  costAssumptions: CostAssumptions | undefined,
  nowSeconds: number,
): ModelCardData {
  const ageDays = model.created > 0 ? (nowSeconds - model.created) / 86400 : -1;
  // calculateAveragePrice is scale-invariant; pass raw per-token values and
  // forward the result to formatPrice, which normalises to $/1M for display.
  // NaN/Infinity from malformed strings are clamped to 0 inside the utility.
  const avgPrice = formatPrice(
    calculateAveragePrice(
      {
        input: parseFloat(model.pricing.prompt),
        output: parseFloat(model.pricing.completion),
        cacheRead:
          model.pricing.input_cache_read != null
            ? parseFloat(model.pricing.input_cache_read)
            : null,
      },
      costAssumptions ?? DEFAULT_COST_ASSUMPTIONS,
    ),
  );
  return {
    provider: getProviderFromId(model.id),
    free: isFreeModel(model),
    isNew: isNewModel(model),
    promptPrice: formatPrice(model.pricing.prompt),
    completionPrice: formatPrice(model.pricing.completion),
    contextLength: formatContextLength(model.context_length),
    avgPrice,
    avgAssumptionSummary: formatCostAssumptionSummary(
      costAssumptions ?? DEFAULT_COST_ASSUMPTIONS,
    ),
    createdDate: formatCreatedDate(model.created),
    relativeAge: formatRelativeAge(model.created, nowSeconds),
    relativeAgeFresh: ageDays >= 0 && ageDays <= 30,
  };
}
