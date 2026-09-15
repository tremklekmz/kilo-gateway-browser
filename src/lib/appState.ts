import { batch, createSignal } from "solid-js";
import type { AIModel, ModelsResponse } from "@/lib/types";
import {
  areCostAssumptionsDefault,
  COST_ASSUMPTIONS_STORAGE_KEY,
  type CostAssumptions,
  DEFAULT_COST_ASSUMPTIONS,
  normalizeCostAssumptions,
  parseCostAssumptionParam,
  serializeCostAssumptionParam,
  type SortBy,
} from "@/lib/utils";
import { MODELS_SNAPSHOT_URL } from "@/lib/constants";

export const PAGE_SIZE = 40;

const SORT_VALUES: readonly SortBy[] = [
  "default",
  "newest",
  "oldest",
  "price-asc",
  "price-desc",
  "bench-asc",
  "bench-desc",
];

/** URL params that hold range/date filter bounds. */
export const FILTER_PARAM_KEYS = [
  "priceMin",
  "priceMax",
  "benchMin",
  "benchMaxCost",
  "dateFrom",
  "dateTo",
] as const;

type FilterParamKey = (typeof FILTER_PARAM_KEYS)[number];

/**
 * A filter param is invalid when it is present but unusable for its field: a
 * non-number or negative price / benchmark cost, a benchmark score outside
 * 0-1, or an unparseable date. Invalid values are never applied as filters;
 * the only way they reach the URL is an incoming shared link.
 */
function isInvalidFilterParam(key: FilterParamKey, raw: string): boolean {
  if (raw.trim() === "") return false;
  switch (key) {
    case "priceMin":
    case "priceMax":
    case "benchMaxCost": {
      const value = Number(raw);
      return !Number.isFinite(value) || value < 0;
    }
    case "benchMin": {
      const value = Number(raw);
      return !Number.isFinite(value) || value < 0 || value > 1;
    }
    case "dateFrom":
    case "dateTo":
      return Number.isNaN(Date.parse(raw));
  }
}

/** Raw URL value for a filter param, or "" when present but invalid. */
function sanitizeFilterParam(
  key: FilterParamKey,
  params: URLSearchParams,
): string {
  const raw = params.get(key) ?? "";
  return isInvalidFilterParam(key, raw) ? "" : raw;
}

/** Suffix identifying the amber "unpriced hidden" chip in the EmptyState chip row. */
export const UNPRICED_CHIP_SUFFIX = "unpriced hidden by price filter";

export interface AppFilters {
  search: string;
  selectedProvider: string;
  freeOnly: boolean;
  sortBy: SortBy;
  priceMin: string;
  priceMax: string;
  benchMin: string;
  benchMaxCost: string;
  dateFrom: string;
  dateTo: string;
  costAssumptions: CostAssumptions;
  view: "grid" | "list";
}

export function readStoredCostAssumptions(): CostAssumptions | null {
  try {
    const raw = window.localStorage.getItem(COST_ASSUMPTIONS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CostAssumptions>;
    return normalizeCostAssumptions(parsed);
  } catch {
    return null;
  }
}

export function writeStoredCostAssumptions(assumptions: CostAssumptions) {
  if (areCostAssumptionsDefault(assumptions)) {
    window.localStorage.removeItem(COST_ASSUMPTIONS_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(
    COST_ASSUMPTIONS_STORAGE_KEY,
    JSON.stringify(normalizeCostAssumptions(assumptions)),
  );
}

/**
 * Replaces the query string without adding a history entry. Native
 * history.replaceState is all an SPA needs — there is no framework router,
 * and a same-document replaceState fires no popstate/hashchange, so unlike
 * the Next.js original there is no self-echoing router.replace to suppress.
 */
function replaceQuery(query: string) {
  const url = query ? `?${query}` : window.location.pathname;
  window.history.replaceState(null, "", url);
}

function readFiltersFromUrl(params: URLSearchParams): AppFilters {
  const rawSort = params.get("sort");
  return {
    search: params.get("q") ?? "",
    selectedProvider: params.get("provider") ?? "",
    freeOnly: params.get("free") === "true",
    sortBy: (SORT_VALUES as readonly string[]).includes(rawSort ?? "")
      ? (rawSort as SortBy)
      : "newest",
    priceMin: sanitizeFilterParam("priceMin", params),
    priceMax: sanitizeFilterParam("priceMax", params),
    benchMin: sanitizeFilterParam("benchMin", params),
    benchMaxCost: sanitizeFilterParam("benchMaxCost", params),
    dateFrom: sanitizeFilterParam("dateFrom", params),
    dateTo: sanitizeFilterParam("dateTo", params),
    costAssumptions: normalizeCostAssumptions({
      outputTokenShare: parseCostAssumptionParam(
        params.get("avgOutputShare"),
        DEFAULT_COST_ASSUMPTIONS.outputTokenShare,
      ),
      inputCacheHitRate: parseCostAssumptionParam(
        params.get("avgCacheHitRate"),
        DEFAULT_COST_ASSUMPTIONS.inputCacheHitRate,
      ),
    }),
    view: params.get("view") === "list" ? "list" : "grid",
  };
}

/** Canonical query string for a filter state; "" when everything is default. */
function serializeFilters(filters: AppFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.selectedProvider) params.set("provider", filters.selectedProvider);
  if (filters.freeOnly) params.set("free", "true");
  if (filters.sortBy !== "newest") params.set("sort", filters.sortBy);
  if (filters.priceMin) params.set("priceMin", filters.priceMin);
  if (filters.priceMax) params.set("priceMax", filters.priceMax);
  if (filters.benchMin) params.set("benchMin", filters.benchMin);
  if (filters.benchMaxCost) params.set("benchMaxCost", filters.benchMaxCost);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (!areCostAssumptionsDefault(filters.costAssumptions)) {
    params.set(
      "avgOutputShare",
      serializeCostAssumptionParam(filters.costAssumptions.outputTokenShare),
    );
    params.set(
      "avgCacheHitRate",
      serializeCostAssumptionParam(filters.costAssumptions.inputCacheHitRate),
    );
  }
  if (filters.view !== "grid") params.set("view", filters.view);
  return params.toString();
}

/** Names every present-but-invalid filter param as `key=rawValue`. */
function invalidFilterParamsIn(params: URLSearchParams): string[] {
  return FILTER_PARAM_KEYS.flatMap((key) => {
    const raw = params.get(key);
    return raw != null && isInvalidFilterParam(key, raw) ? [`${key}=${raw}`] : [];
  });
}

/**
 * True when a raw URL param holds a value outside 0–1 (e.g. 999, -3, or a
 * non-number): parseCostAssumptionParam clamps/falls back silently, so the
 * recipient's normalized assumptions differ from the sender's raw numbers.
 * Params absent from the URL contributed a fallback, not a shared value, so
 * they never count as diverged.
 */
function rawAssumptionsDivergedIn(params: URLSearchParams): boolean {
  const diverged = (param: string) => {
    const raw = params.get(param);
    if (raw == null || raw.trim() === "") return false;
    const value = Number(raw);
    if (!Number.isFinite(value)) return true;
    return value < 0 || value > 1;
  };
  return diverged("avgOutputShare") || diverged("avgCacheHitRate");
}

function getFetchErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : "";
  const status = raw.match(/HTTP (\d{3})/i)?.[1];
  if (status === "401" || status === "403") return "The gateway declined this request.";
  if (status === "404") return "The models endpoint could not be found.";
  if (status === "429") return "The gateway is busy right now. Please wait a moment and retry.";
  if (status && status.startsWith("5")) return "The gateway is having trouble right now.";
  if (raw.toLowerCase().includes("network") || raw.toLowerCase().includes("fetch")) {
    return "The gateway could not be reached.";
  }
  return "The model catalog could not be loaded.";
}

export interface AppState {
  /** Full model catalogue from the committed snapshot. */
  models: () => AIModel[];
  /** Epoch ms of the current dataset's fetch moment; feeds the freshness stamp. */
  dataUpdatedAt: () => number | null;
  loading: () => boolean;
  error: () => string | null;
  filters: () => AppFilters;
  /** True once the user picked an explicit sort this session (relevance yields). */
  userPickedSort: () => boolean;
  assumptionsAdjustedNotice: () => boolean;
  invalidParamsNotice: () => string[] | null;
  visibleCount: () => number;
  loadMoreMessage: () => string;
  refresh: () => Promise<void>;
  /** Applies a partial filter change to state and URL atomically. */
  updateFilters: (patch: Partial<AppFilters>) => void;
  /** Debounced search write: instant input state, at most one URL write per 250ms pause. */
  setSearch: (value: string) => void;
  /** Clears filter criteria; view and cost assumptions are deliberately preserved. */
  resetFilters: () => void;
  /** resetFilters plus cost-assumption reset (the EmptyState "Clear all filters"). */
  resetAll: () => void;
  /** Explicit user sort pick; ends relevance-ordered results for the session. */
  setSortBy: (value: SortBy) => void;
  setCostAssumptions: (value: CostAssumptions) => void;
  dismissAssumptionsNotice: () => void;
  dismissInvalidParamsNotice: () => void;
  loadMore: (filteredTotal: number) => void;
}

/**
 * Owns the entire URL-as-state engine plus the catalogue fetch.
 *
 * Every filter write lands in both the signal and the URL in one batch, so a
 * rendered frame never shows state the URL does not confirm — the URL stays
 * the single shareable truth, per the product contract.
 *
 * On load the incoming URL may carry junk a share introduced: cost-assumption
 * params outside 0–1 (clamped silently by parseCostAssumptionParam) and
 * invalid filter params (never applied). Both surface as dismissible amber
 * notices naming what was ignored; invalid filter params are also pruned from
 * the URL once so a re-shared link is clean while the notice persists until
 * dismissed.
 */
export function createAppState(): AppState {
  const initialParams = new URLSearchParams(window.location.search);
  const [models, setModels] = createSignal<AIModel[]>([]);
  const [dataUpdatedAt, setDataUpdatedAt] = createSignal<number | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [filters, setFilters] = createSignal<AppFilters>(readFiltersFromUrl(initialParams));
  const [userPickedSort, setUserPickedSort] = createSignal(
    (SORT_VALUES as readonly string[]).includes(initialParams.get("sort") ?? ""),
  );
  const [assumptionsAdjustedNotice, setAssumptionsAdjustedNotice] = createSignal(
    rawAssumptionsDivergedIn(initialParams),
  );
  const initialInvalid = invalidFilterParamsIn(initialParams);
  const [invalidParamsNotice, setInvalidParamsNotice] = createSignal<string[] | null>(
    initialInvalid.length > 0 ? initialInvalid : null,
  );
  const [visibleCount, setVisibleCount] = createSignal(PAGE_SIZE);
  const [loadMoreMessage, setLoadMoreMessage] = createSignal("");

  // Prune invalid filter params from the URL once so a re-shared link is
  // clean. Every valid param is kept intact — only the keys that failed
  // validation are dropped — and the notice stays until dismissed.
  if (initialInvalid.length > 0) {
    const params = new URLSearchParams(window.location.search);
    for (const entry of initialInvalid) {
      params.delete(entry.slice(0, entry.indexOf("=")));
    }
    replaceQuery(params.toString());
  }

  // A shared URL carrying out-of-range cost assumptions (clamped silently)
  // would otherwise show different numbers than the sender saw; if stored
  // assumptions exist and the URL carries none, they win as before.
  if (!initialParams.has("avgOutputShare") && !initialParams.has("avgCacheHitRate")) {
    const stored = readStoredCostAssumptions();
    if (stored) {
      setFilters((prev) => ({ ...prev, costAssumptions: stored }));
    }
  }

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(MODELS_SNAPSHOT_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data: ModelsResponse = await res.json();
      batch(() => {
        setModels(data.data ?? []);
        setDataUpdatedAt(Date.now());
      });
    } catch (err) {
      setError(getFetchErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }
  void refresh();

  function updateFilters(patch: Partial<AppFilters>) {
    batch(() => {
      setFilters((prev) => {
        const next = { ...prev, ...patch };
        replaceQuery(serializeFilters(next));
        return next;
      });
    });
    if (patch.costAssumptions !== undefined) {
      writeStoredCostAssumptions(patch.costAssumptions);
    }
    setVisibleCount(PAGE_SIZE);
  }

  let searchDebounce: number | undefined;

  function setSearch(value: string) {
    setFilters((prev) => ({ ...prev, search: value }));
    setVisibleCount(PAGE_SIZE);
    if (searchDebounce !== undefined) clearTimeout(searchDebounce);
    searchDebounce = window.setTimeout(() => {
      searchDebounce = undefined;
      replaceQuery(serializeFilters({ ...filters(), search: value }));
    }, 250);
  }

  function resetFilters() {
    const view = filters().view;
    const costAssumptions = filters().costAssumptions;
    batch(() => {
      setFilters({
        search: "",
        selectedProvider: "",
        freeOnly: false,
        sortBy: "newest",
        priceMin: "",
        priceMax: "",
        benchMin: "",
        benchMaxCost: "",
        dateFrom: "",
        dateTo: "",
        costAssumptions,
        view,
      });
      replaceQuery(view !== "grid" ? `view=${view}` : "");
      setVisibleCount(PAGE_SIZE);
    });
  }

  function resetAll() {
    const nextAssumptions = DEFAULT_COST_ASSUMPTIONS;
    writeStoredCostAssumptions(nextAssumptions);
    setFilters((prev) => ({ ...prev, costAssumptions: nextAssumptions }));
    resetFilters();
  }

  return {
    models,
    dataUpdatedAt,
    loading,
    error,
    filters,
    userPickedSort,
    assumptionsAdjustedNotice,
    invalidParamsNotice,
    visibleCount,
    loadMoreMessage,
    refresh,
    updateFilters,
    setSearch,
    resetFilters,
    resetAll,
    setSortBy: (value) => {
      batch(() => {
        setUserPickedSort(true);
        updateFilters({ sortBy: value });
      });
    },
    setCostAssumptions: (value) => updateFilters({ costAssumptions: normalizeCostAssumptions(value) }),
    dismissAssumptionsNotice: () => setAssumptionsAdjustedNotice(false),
    dismissInvalidParamsNotice: () => setInvalidParamsNotice(null),
    loadMore: (filteredTotal) => {
      const next = Math.min(visibleCount() + PAGE_SIZE, filteredTotal);
      batch(() => {
        setVisibleCount(next);
        setLoadMoreMessage(`Showing ${next} of ${filteredTotal} models`);
      });
    },
  };
}
