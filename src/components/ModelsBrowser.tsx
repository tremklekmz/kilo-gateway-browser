"use client";

import { useState, useEffect, useMemo, useCallback, useTransition, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AIModel, ModelsResponse } from "@/lib/types";
import {
  areCostAssumptionsDefault,
  COST_ASSUMPTIONS_STORAGE_KEY,
  CostAssumptions,
  DEFAULT_COST_ASSUMPTIONS,
  formatCostAssumptionSummary,
  formatPercent,
  formatProviderName,
  getAveragePricePerMillion,
  getProviderFromId,
  getUniqueProviders,
  hasPublishedPrice,
  isFreeModel,
  normalizeCostAssumptions,
  parseCostAssumptionParam,
  relevanceScore,
  serializeCostAssumptionParam,
  SortBy,
  splitProviderParam,
} from "@/lib/utils";
import { ModelCard } from "./ModelCard";
import { SearchFilter } from "./SearchFilter";
import { ViewToggle } from "./ViewToggle";
import { SkeletonGrid } from "./SkeletonCard";
import { Pagination } from "./Pagination";
import { BenchValueStrip, pickBenchValueLeader } from "./BenchValue";
import { FreshnessStamp } from "./FreshnessStamp";
import { MODELS_API_URL } from "@/lib/constants";

const PAGE_SIZE = 40;

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
const FILTER_PARAM_KEYS = [
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
  params: { get(key: string): string | null },
): string {
  const raw = params.get(key) ?? "";
  return isInvalidFilterParam(key, raw) ? "" : raw;
}

/** Suffix identifying the amber "unpriced hidden" chip in the EmptyState chip row. */
const UNPRICED_CHIP_SUFFIX = "unpriced hidden by price filter";

interface ModelsBrowserProps {
  /** Models pre-fetched on the server. When provided, no client-side fetch is needed.
   *  When omitted (e.g. server fetch failed), the component will fetch on the client instead. */
  initialModels?: AIModel[];
  /** Epoch ms when the server-fetched data was captured. A stable snapshot so the
   *   freshness stamp renders identically on server and client (avoids Date.now()
   *   hydration drift). Required alongside initialModels. */
  initialUpdatedAt?: number;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center" role="alert">
      <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-red-400"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-zinc-200 mb-2">Models are unavailable</h3>
      <p className="text-sm text-zinc-400 mb-1 max-w-sm">
        {message}
      </p>
      <p className="text-xs text-zinc-400 max-w-sm mb-6">Check your connection, then try again.</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        Try again
      </button>
    </div>
  );
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

function EmptyState({
  hasFilters,
  filterChips,
  onReset,
}: {
  hasFilters: boolean;
  filterChips: string[];
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-zinc-500"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-zinc-200 mb-2">No models found</h3>
      <p className="text-sm text-zinc-400">
        {hasFilters
          ? "No models match the active filters."
          : "No models are available at this time."}
      </p>
      {hasFilters && filterChips.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5 mt-4 max-w-md">
          {filterChips.map((chip, i) => (
            <span
              key={`${chip}-${i}`}
              className={
                chip.endsWith(UNPRICED_CHIP_SUFFIX)
                  ? "px-2 py-0.5 rounded-full text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20"
                  : "px-2 py-0.5 rounded-full text-xs bg-zinc-800/80 text-zinc-300 border border-zinc-700"
              }
            >
              {chip}
            </span>
          ))}
        </div>
      )}
      {hasFilters && (
        <button
          onClick={onReset}
          className="mt-6 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors duration-200"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

function readStoredCostAssumptions(): CostAssumptions | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COST_ASSUMPTIONS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CostAssumptions>;
    return normalizeCostAssumptions(parsed);
  } catch {
    return null;
  }
}

function writeStoredCostAssumptions(assumptions: CostAssumptions) {
  if (typeof window === "undefined") return;
  if (areCostAssumptionsDefault(assumptions)) {
    window.localStorage.removeItem(COST_ASSUMPTIONS_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(
    COST_ASSUMPTIONS_STORAGE_KEY,
    JSON.stringify(normalizeCostAssumptions(assumptions)),
  );
}

export function ModelsBrowser({ initialModels, initialUpdatedAt }: ModelsBrowserProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const hasServerData = initialModels !== undefined;

  const [models, setModels] = useState<AIModel[]>(initialModels ?? []);
  const [loading, setLoading] = useState(!hasServerData);
  const [error, setError] = useState<string | null>(null);
  // Epoch ms of the moment the current dataset was fetched. Server-provided
  // data lands with the server snapshot (initialUpdatedAt); client fallback
  // sets this after a successful fetch. Feeds the freshness stamp (recency is
  // the product lens — "how new is the data" is the first trust question).
  const [dataUpdatedAt, setDataUpdatedAt] = useState<number | null>(() =>
    hasServerData ? initialUpdatedAt ?? null : null,
  );
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [selectedProvider, setSelectedProvider] = useState(searchParams.get("provider") || "");
  const [freeOnly, setFreeOnly] = useState(searchParams.get("free") === "true");
  const [sortBy, setSortBy] = useState<SortBy>(() => {
    const raw = searchParams.get("sort");
    return (SORT_VALUES as readonly string[]).includes(raw ?? "") ? (raw as SortBy) : "newest";
  });
  const [priceMin, setPriceMin] = useState(() => sanitizeFilterParam("priceMin", searchParams));
  const [priceMax, setPriceMax] = useState(() => sanitizeFilterParam("priceMax", searchParams));
  const [benchMin, setBenchMin] = useState(() => sanitizeFilterParam("benchMin", searchParams));
  const [benchMaxCost, setBenchMaxCost] = useState(() =>
    sanitizeFilterParam("benchMaxCost", searchParams)
  );
  const [dateFrom, setDateFrom] = useState(() => sanitizeFilterParam("dateFrom", searchParams));
  const [dateTo, setDateTo] = useState(() => sanitizeFilterParam("dateTo", searchParams));
  const [costAssumptions, setCostAssumptions] = useState<CostAssumptions>(() =>
    normalizeCostAssumptions({
      outputTokenShare: parseCostAssumptionParam(searchParams.get("avgOutputShare"), DEFAULT_COST_ASSUMPTIONS.outputTokenShare),
      inputCacheHitRate: parseCostAssumptionParam(searchParams.get("avgCacheHitRate"), DEFAULT_COST_ASSUMPTIONS.inputCacheHitRate),
    }),
  );
  const loadedStoredCostAssumptionsRef = useRef(false);
  const [view, setView] = useState<"grid" | "list">(searchParams.get("view") === "list" ? "list" : "grid");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadMoreMessage, setLoadMoreMessage] = useState("");

  // Shared URLs can carry raw cost-assumption params outside 0–1 (e.g.
  // ?avgOutputShare=999). normalizeCostAssumptions clamps them silently, so
  // the recipient would otherwise see different numbers than the sender
  // without any notice. Detect that divergence and surface a dismissible hint.
  const [assumptionsAdjustedNotice, setAssumptionsAdjustedNotice] = useState(false);

  // True when a raw URL param holds a value outside 0–1 (e.g. 999, -3, or a
  // non-number): parseCostAssumptionParam clamps/falls back silently, so the
  // recipient's normalized assumptions differ from the sender's raw numbers.
  // Params absent from the URL contributed a fallback, not a shared value,
  // so they never count as diverged.
  const rawAssumptionsDiverged = useMemo(() => {
    const diverged = (param: string) => {
      const raw = searchParams.get(param);
      if (raw == null || raw.trim() === "") return false;
      const value = Number(raw);
      if (!Number.isFinite(value)) return true;
      return value < 0 || value > 1;
    };
    return diverged("avgOutputShare") || diverged("avgCacheHitRate");
  }, [searchParams]);

  // Sync the notice to URL changes: show it whenever the incoming URL carries
  // diverged raw params, hide it when they no longer do. Dismissal below only
  // suppresses the current divergence — a newly shared URL re-triggers it.
  useEffect(() => {
    if (rawAssumptionsDiverged) {
      setAssumptionsAdjustedNotice(true);
    } else {
      setAssumptionsAdjustedNotice(false);
    }
  }, [rawAssumptionsDiverged]);

  // True when an explicit sort is in play this session: either the user picked
  // one via the select or the loaded URL carried an explicit `sort` param.
  // While a query is active and this flag is false, relevance ordering wins.
  // State (not a ref): the flag is read during render, so flipping it in an
  // effect could strand a stale paint — e.g. a shared ?q=...&sort=price-asc
  // would render relevance order while the select still showed
  // "Sorted by relevance" — and bail-out state updates would not re-render.
  const [userPickedSort, setUserPickedSort] = useState(() => {
    const raw = searchParams.get("sort");
    return (SORT_VALUES as readonly string[]).includes(raw ?? "");
  });

  // Query string of the last URL this component wrote itself (updateUrl,
  // reset, prune). Typing an invalid value mid-edit (e.g. "-" or "-5" in a
  // price input) legitimately lands in the URL; that is not "from link", so
  // the link contract below ignores query strings we authored. Field-level
  // red warnings in SearchFilter own typing-time validation.
  const lastSelfWrittenQueryRef = useRef<string | null>(null);
  const updateUrl = useCallback((next?: {
    search?: string;
    selectedProvider?: string;
    freeOnly?: boolean;
    sortBy?: SortBy;
    priceMin?: string;
    priceMax?: string;
    benchMin?: string;
    benchMaxCost?: string;
    dateFrom?: string;
    dateTo?: string;
    costAssumptions?: CostAssumptions;
    view?: "grid" | "list";
  }) => {
    const nextSearch = next?.search ?? search;
    const nextProvider = next?.selectedProvider ?? selectedProvider;
    const nextFreeOnly = next?.freeOnly ?? freeOnly;
    const nextSortBy = next?.sortBy ?? sortBy;
    const nextPriceMin = next?.priceMin ?? priceMin;
    const nextPriceMax = next?.priceMax ?? priceMax;
    const nextBenchMin = next?.benchMin ?? benchMin;
    const nextBenchMaxCost = next?.benchMaxCost ?? benchMaxCost;
    const nextDateFrom = next?.dateFrom ?? dateFrom;
    const nextDateTo = next?.dateTo ?? dateTo;
    const nextCostAssumptions = normalizeCostAssumptions(
      next?.costAssumptions ?? costAssumptions,
    );
    const nextView = next?.view ?? view;

    const params = new URLSearchParams();
    if (nextSearch) params.set("q", nextSearch);
    if (nextProvider) params.set("provider", nextProvider);
    if (nextFreeOnly) params.set("free", "true");
    if (nextSortBy !== "newest") params.set("sort", nextSortBy);
    if (nextPriceMin) params.set("priceMin", nextPriceMin);
    if (nextPriceMax) params.set("priceMax", nextPriceMax);
    if (nextBenchMin) params.set("benchMin", nextBenchMin);
    if (nextBenchMaxCost) params.set("benchMaxCost", nextBenchMaxCost);
    if (nextDateFrom) params.set("dateFrom", nextDateFrom);
    if (nextDateTo) params.set("dateTo", nextDateTo);
    if (!areCostAssumptionsDefault(nextCostAssumptions)) {
      params.set(
        "avgOutputShare",
        serializeCostAssumptionParam(nextCostAssumptions.outputTokenShare),
      );
      params.set(
        "avgCacheHitRate",
        serializeCostAssumptionParam(nextCostAssumptions.inputCacheHitRate),
      );
    }
    if (nextView !== "grid") params.set("view", nextView);

    const queryString = params.toString();
    lastSelfWrittenQueryRef.current = queryString;
    const newUrl = queryString ? `?${queryString}` : "/";
    startTransition(() => {
      router.replace(newUrl, { scroll: false });
    });
  }, [search, selectedProvider, freeOnly, sortBy, priceMin, priceMax, benchMin, benchMaxCost, dateFrom, dateTo, costAssumptions, view, router, startTransition]);

  // Debounced URL write for the search param: state updates stay instant so
  // typing stays responsive, but router.replace fires at most once per 250ms
  // of typing pause instead of on every keystroke. The timer runs the latest
  // `updateUrl` (via ref) so a debounced fire never replays stale filter
  // state changed in the interim. Timer cleared on unmount.
  const searchUrlTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const updateUrlRef = useRef(updateUrl);
  useEffect(() => {
    updateUrlRef.current = updateUrl;
  });
  useEffect(() => {
    return () => clearTimeout(searchUrlTimerRef.current);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(searchUrlTimerRef.current);
    searchUrlTimerRef.current = setTimeout(() => {
      searchUrlTimerRef.current = undefined;
      updateUrlRef.current({ search: value });
    }, 250);
  };

  const handleProviderChange = (value: string) => {
    setSelectedProvider(value);
    updateUrl({ selectedProvider: value });
  };

  const handleFreeOnlyChange = (value: boolean) => {
    setFreeOnly(value);
    updateUrl({ freeOnly: value });
  };

  const handleSortByChange = (value: SortBy) => {
    setUserPickedSort(true);
    setSortBy(value);
    updateUrl({ sortBy: value });
  };

  const handlePriceMinChange = (value: string) => {
    setPriceMin(value);
    updateUrl({ priceMin: value });
  };

  const handlePriceMaxChange = (value: string) => {
    setPriceMax(value);
    updateUrl({ priceMax: value });
  };

  const handleBenchMinChange = (value: string) => {
    setBenchMin(value);
    updateUrl({ benchMin: value });
  };

  const handleBenchMaxCostChange = (value: string) => {
    setBenchMaxCost(value);
    updateUrl({ benchMaxCost: value });
  };

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    updateUrl({ dateFrom: value });
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value);
    updateUrl({ dateTo: value });
  };

  const handleCostAssumptionsChange = (value: CostAssumptions) => {
    const normalized = normalizeCostAssumptions(value);
    setCostAssumptions(normalized);
    writeStoredCostAssumptions(normalized);
    updateUrl({ costAssumptions: normalized });
  };

  const handleViewChange = (value: "grid" | "list") => {
    setView(value);
    updateUrl({ view: value });
  };

  const handleReset = () => {
    setSearch("");
    setSelectedProvider("");
    setFreeOnly(false);
    setSortBy("newest");
    setPriceMin("");
    setPriceMax("");
    setBenchMin("");
    setBenchMaxCost("");
    setDateFrom("");
    setDateTo("");
    // Filters-only reset: cost assumptions are reset inside the More-filters
    // panel, and `view` is not a filter — its URL param is preserved.
    const params = new URLSearchParams();
    if (view !== "grid") params.set("view", view);
    const queryString = params.toString();
    lastSelfWrittenQueryRef.current = queryString;
    startTransition(() => {
      router.replace(queryString ? `?${queryString}` : "/", { scroll: false });
    });
  };

  const fetchModels = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(MODELS_API_URL);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data: ModelsResponse = await res.json();
      setModels(data.data || []);
      setDataUpdatedAt(Date.now());
    } catch (err) {
      setError(getFetchErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Our own router.replace calls echo back through searchParams. Replaying
    // the full state sync on that echo would clobber in-flight typing (e.g.
    // a debounced q= echo overwriting a newer keystroke), and handlers have
    // already applied the state they wrote — skip everything. lastSelfWritten-
    // QueryRef is compared but never consumed here: the notice/prune effects
    // below need the same comparison for their own URL changes. A later
    // external navigation to the exact same query string is state-identical,
    // so skipping the sync then is harmless.
    const selfWritten =
      searchParams.toString() === lastSelfWrittenQueryRef.current;
    if (selfWritten) return;
    const urlSearch = searchParams.get("q") || "";
    const urlProvider = searchParams.get("provider") || "";
    const urlFreeOnly = searchParams.get("free") === "true";
    const rawSort = searchParams.get("sort");
    const urlSortBy = (SORT_VALUES as readonly string[]).includes(rawSort ?? "")
      ? (rawSort as SortBy)
      : "newest";
    const urlPriceMin = sanitizeFilterParam("priceMin", searchParams);
    const urlPriceMax = sanitizeFilterParam("priceMax", searchParams);
    const urlBenchMin = sanitizeFilterParam("benchMin", searchParams);
    const urlBenchMaxCost = sanitizeFilterParam("benchMaxCost", searchParams);
    const urlDateFrom = sanitizeFilterParam("dateFrom", searchParams);
    const urlDateTo = sanitizeFilterParam("dateTo", searchParams);
    const urlCostAssumptions = normalizeCostAssumptions({
      outputTokenShare: parseCostAssumptionParam(
        searchParams.get("avgOutputShare"),
        DEFAULT_COST_ASSUMPTIONS.outputTokenShare,
      ),
      inputCacheHitRate: parseCostAssumptionParam(
        searchParams.get("avgCacheHitRate"),
        DEFAULT_COST_ASSUMPTIONS.inputCacheHitRate,
      ),
    });

    setSearch(urlSearch);
    setSelectedProvider(urlProvider);
    setSortBy(urlSortBy);
    setUserPickedSort(
      (SORT_VALUES as readonly string[]).includes(searchParams.get("sort") ?? ""),
    );
    setPriceMin(urlPriceMin);
    setPriceMax(urlPriceMax);
    setBenchMin(urlBenchMin);
    setBenchMaxCost(urlBenchMaxCost);
    setDateFrom(urlDateFrom);
    setDateTo(urlDateTo);
    setCostAssumptions(urlCostAssumptions);
    setView(searchParams.get("view") === "list" ? "list" : "grid");
    // Only re-sync when the URL actually changes (e.g. browser back/forward).
    // Omitting the state variables from deps prevents a feedback loop where
    // setState → re-render → effect re-runs → setState again causes blinking.
  }, [searchParams]);

  // Shared URLs can carry filter params that are invalid for their field
  // (e.g. ?priceMin=-5, ?benchMin=7, ?priceMax=abc). One uniform contract:
  // the value is never applied as a filter, the input shows the sanitized
  // value instead, and ONE amber notice lists everything that was ignored.
  // Derived from searchParams like rawAssumptionsDiverged so it tracks the
  // URL; it clears on any unrelated URL change, and a re-shared cleaned URL
  // does not re-trigger it.
  const invalidFilterParams = useMemo(() => {
    return FILTER_PARAM_KEYS.flatMap((key) => {
      const raw = searchParams.get(key);
      return raw != null && isInvalidFilterParam(key, raw) ? [`${key}=${raw}`] : [];
    });
  }, [searchParams]);

  const [invalidParamsNotice, setInvalidParamsNotice] = useState<string[] | null>(
    null,
  );

  // Set (snapshotted) when an incoming URL carries invalid params; cleared
  // when the URL changes for any other reason. A snapshot — not the live
  // memo — because the prune below removes the offending params from the
  // URL, and the notice must keep naming them until dismissed. After our
  // own prune the params are gone but the notice STAYS until dismissed (or
  // the next navigation): pruning must not erase the very warning it was
  // triggered by, or the recipient would never learn which shared values
  // were ignored.
  const prunedInvalidRef = useRef(false);

  useEffect(() => {
    const selfWritten =
      searchParams.toString() === lastSelfWrittenQueryRef.current;
    if (invalidFilterParams.length > 0) {
      if (!selfWritten) setInvalidParamsNotice(invalidFilterParams);
      return;
    }
    if (prunedInvalidRef.current) {
      // The URL change is our own prune echo — keep the notice.
      prunedInvalidRef.current = false;
      return;
    }
    setInvalidParamsNotice(null);
  }, [invalidFilterParams, searchParams]);

  // Prune the offending params from the URL once so a re-shared link is
  // clean. Runs inside a transition like updateUrl; every valid param is
  // kept intact — only the keys that failed validation are dropped.
  useEffect(() => {
    if (invalidFilterParams.length === 0) return;
    if (searchParams.toString() === lastSelfWrittenQueryRef.current) return;
    const params = new URLSearchParams(window.location.search);
    let pruned = false;
    for (const entry of invalidFilterParams) {
      const key = entry.slice(0, entry.indexOf("="));
      if (params.has(key)) {
        params.delete(key);
        pruned = true;
      }
    }
    if (!pruned) return;
    prunedInvalidRef.current = true;
    const queryString = params.toString();
    lastSelfWrittenQueryRef.current = queryString;
    startTransition(() => {
      router.replace(queryString ? `?${queryString}` : "/", { scroll: false });
    });
  }, [invalidFilterParams, searchParams, startTransition, router]);

  useEffect(() => {
    if (loadedStoredCostAssumptionsRef.current) return;
    loadedStoredCostAssumptionsRef.current = true;

    const hasUrlAssumptions =
      searchParams.has("avgOutputShare") || searchParams.has("avgCacheHitRate");
    if (hasUrlAssumptions) return;

    const stored = readStoredCostAssumptions();
    if (stored) {
      setCostAssumptions(stored);
    }
  }, [searchParams]);

  useEffect(() => {
    // Only fetch on the client if we don't already have server-provided data.
    // This covers both the serverFetchFailed case and the no-props (legacy) case.
    if (!hasServerData) {
      fetchModels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const providers = useMemo(() => getUniqueProviders(models), [models]);

  const { filteredModels, hiddenUnpricedCount } = useMemo(() => {
    // Shared per-million-token avg price helper, reused by both range filter
    // and price sorting. Reads from the shared utility so the same formula
    // powers ModelCard display, the range filter, and price sorting.
    const getAvgPriceForModel = (model: AIModel) =>
      getAveragePricePerMillion(model, costAssumptions);

    // Parse range bounds once. Empty strings or malformed values become null
    // (treated as "no bound on this side"). Negative price inputs are ignored.
    const parsedPriceMin = priceMin === "" ? NaN : Number(priceMin);
    const parsedPriceMax = priceMax === "" ? NaN : Number(priceMax);
    const minPriceNum =
      Number.isFinite(parsedPriceMin) && parsedPriceMin >= 0 ? parsedPriceMin : null;
    const maxPriceNum =
      Number.isFinite(parsedPriceMax) && parsedPriceMax >= 0 ? parsedPriceMax : null;
    const priceBoundActive = minPriceNum != null || maxPriceNum != null;

    const parsedFromMs = dateFrom === "" ? NaN : Date.parse(dateFrom);
    const parsedToMs = dateTo === "" ? NaN : Date.parse(dateTo);
    // Convert to Unix seconds (matching AIModel.created). Shift `to` to end of
    // day so e.g. dateTo=2024-01-15 is inclusive of any time on that calendar
    // day (UTC-based to keep behaviour predictable across timezones).
    const fromTs = Number.isFinite(parsedFromMs) ? parsedFromMs / 1000 : null;
    const toTs = Number.isFinite(parsedToMs) ? (parsedToMs + 86_399_999) / 1000 : null;
    const dateActive = fromTs != null || toTs != null;

    // TerminalBench filters. When either bound is active, models without any
    // benchmark data are excluded (per product spec). The max-cost bound keeps
    // models that have a score but no cost recorded.
    const parsedBenchMin = benchMin === "" ? NaN : Number(benchMin);
    const benchMinNum =
      Number.isFinite(parsedBenchMin) && parsedBenchMin >= 0 && parsedBenchMin <= 1
        ? parsedBenchMin
        : null;

    const parsedBenchMaxCost = benchMaxCost === "" ? NaN : Number(benchMaxCost);
    const benchMaxCostNum =
      Number.isFinite(parsedBenchMaxCost) && parsedBenchMaxCost >= 0
        ? parsedBenchMaxCost
        : null;

    const benchActive = benchMinNum != null || benchMaxCostNum != null;

    // `provider` may hold a CSV selection ("anthropic,openai") from the
    // provider combobox — membership test against the split set.
    const providerSet = selectedProvider ? splitProviderParam(selectedProvider) : null;

    const matchesNonPricePredicates = (model: AIModel) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        model.name.toLowerCase().includes(searchLower) ||
        model.id.toLowerCase().includes(searchLower) ||
        (model.description?.toLowerCase().includes(searchLower) ?? false);

      const matchesProvider =
        !providerSet || providerSet.includes(getProviderFromId(model.id));

      const matchesFree = !freeOnly || isFreeModel(model);

      // Date range — model.created is a Unix timestamp (seconds). Models with
      // `created === 0` are meta/router placeholders with no real date and are
      // excluded whenever any date bound is active.
      const matchesDate =
        !dateActive ||
        (model.created !== 0 &&
          (fromTs == null || model.created >= fromTs) &&
          (toTs == null || model.created <= toTs));

      // TerminalBench filters. When either bound is active, models missing
      // benchmark data are dropped. The max-cost bound additionally keeps
      // models that have a score but no `avgAttemptCostUsd` recorded.
      const bench = model.terminalBench;
      const matchesBench =
        !benchActive ||
        (bench != null &&
          (benchMinNum == null || bench.overallScore >= benchMinNum) &&
          (benchMaxCostNum == null ||
            bench.avgAttemptCostUsd == null ||
            bench.avgAttemptCostUsd <= benchMaxCostNum));

      return (
        matchesSearch &&
        matchesProvider &&
        matchesFree &&
        matchesDate &&
        matchesBench
      );
    };

    const filtered = models.filter((model) => {
      // Avg price range — compared in $/1M tokens to match the unit shown on
      // ModelCard and in the filter inputs. Unpriced models (NaN average from
      // -1 sentinels) fail both bounds and are filtered out.
      const avgPerMillion = priceBoundActive ? getAvgPriceForModel(model) : 0;
      const matchesPriceMin = minPriceNum == null || avgPerMillion >= minPriceNum;
      const matchesPriceMax = maxPriceNum == null || avgPerMillion <= maxPriceNum;

      return (
        matchesNonPricePredicates(model) &&
        matchesPriceMin &&
        matchesPriceMax
      );
    });

    // Models whose ONLY failing bound is the price filter: unpriced (no
    // published prices) while a price bound is active and every other
    // predicate passes. Reported to SearchFilter/EmptyState; never counts
    // toward filteredCount.
    const hiddenUnpricedCount = priceBoundActive
      ? models.filter(
          (model) => !hasPublishedPrice(model) && matchesNonPricePredicates(model),
        ).length
      : 0;

    // Relevance ordering: while a query is active and the user hasn't picked a
    // sort this session, relevanceScore wins. Ties break by newest `created`
    // first; placeholders (created === 0) always sink to the end.
    if (search && !userPickedSort) {
      const query = search;
      return {
        filteredModels: [...filtered].sort((a, b) => {
          const scoreDiff = relevanceScore(b, query) - relevanceScore(a, query);
          if (scoreDiff !== 0) return scoreDiff;
          if ((a.created === 0) !== (b.created === 0)) return a.created === 0 ? 1 : -1;
          return b.created - a.created;
        }),
        hiddenUnpricedCount,
      };
    }

    // "newest" is the recency-first overview order; placeholders (created === 0)
    // sink to the end. "default" preserves the gateway's own API order.
    if (sortBy === "newest") {
      return {
        filteredModels: [...filtered].sort((a, b) => {
          if ((a.created === 0) !== (b.created === 0)) return a.created === 0 ? 1 : -1;
          return b.created - a.created;
        }),
        hiddenUnpricedCount,
      };
    }
    if (sortBy === "price-asc" || sortBy === "price-desc") {
      // Models with unpublished prices (-1 sentinels → NaN average, shown as
      // "Varies") sink to the end regardless of direction.
      return {
        filteredModels: [...filtered].sort((a, b) => {
          const aPrice = getAvgPriceForModel(a);
          const bPrice = getAvgPriceForModel(b);
          const aOk = Number.isFinite(aPrice);
          const bOk = Number.isFinite(bPrice);
          if (!aOk && !bOk) return 0;
          if (aOk !== bOk) return aOk ? -1 : 1;
          return sortBy === "price-asc" ? aPrice - bPrice : bPrice - aPrice;
        }),
        hiddenUnpricedCount,
      };
    }
    if (sortBy === "bench-asc" || sortBy === "bench-desc") {
      return {
        filteredModels: [...filtered].sort((a, b) => {
          // Models with no benchmark data sink to the end regardless of direction.
          const aHas = a.terminalBench != null;
          const bHas = b.terminalBench != null;
          if (!aHas && !bHas) return 0;
          if (aHas !== bHas) return aHas ? -1 : 1;
          const aScore = a.terminalBench!.overallScore;
          const bScore = b.terminalBench!.overallScore;
          return sortBy === "bench-asc" ? aScore - bScore : bScore - aScore;
        }),
        hiddenUnpricedCount,
      };
    }
    return { filteredModels: filtered, hiddenUnpricedCount };
  }, [models, search, selectedProvider, freeOnly, sortBy, userPickedSort, priceMin, priceMax, benchMin, benchMaxCost, dateFrom, dateTo, costAssumptions]);

  const costAssumptionsActive = !areCostAssumptionsDefault(costAssumptions);
  const hasFilters =
    !!search ||
    !!selectedProvider ||
    freeOnly ||
    sortBy !== "newest" ||
    !!priceMin ||
    !!priceMax ||
    !!benchMin ||
    !!benchMaxCost ||
    !!dateFrom ||
    !!dateTo ||
    costAssumptionsActive;

  const activeFilterChips = useMemo(() => {
    const chips: string[] = [];
    if (search) chips.push(`Search: "${search}"`);
    if (selectedProvider) {
      const providerNames = splitProviderParam(selectedProvider)
        .map((provider) => formatProviderName(provider))
        .join(", ");
      chips.push(`Provider: ${providerNames}`);
    }
    if (freeOnly) chips.push("Free only");
    if (sortBy !== "newest") {
      const labels: Record<string, string> = {
        newest: "Newest first",
        default: "Provider default order",
        oldest: "Oldest first",
        "price-asc": "Price: low to high",
        "price-desc": "Price: high to low",
        "bench-asc": "Benchmark: low to high",
        "bench-desc": "Benchmark: high to low",
      };
      chips.push(`Sort: ${labels[sortBy] ?? sortBy}`);
    }
    if (priceMin) chips.push(`Avg ≥ $${priceMin}`);
    if (benchMin) chips.push(`TerminalBench ≥ ${formatPercent(Number(benchMin), 0)}`);
    if (benchMaxCost) chips.push(`Bench cost ≤ $${benchMaxCost}`);
    if (dateFrom) chips.push(`From ${dateFrom}`);
    if (dateTo) chips.push(`To ${dateTo}`);
    if (costAssumptionsActive) chips.push(formatCostAssumptionSummary(costAssumptions));
    if (hiddenUnpricedCount > 0) {
      chips.push(`${hiddenUnpricedCount} ${UNPRICED_CHIP_SUFFIX}`);
    }
    return chips;
  }, [search, selectedProvider, freeOnly, sortBy, priceMin, benchMin, benchMaxCost, dateFrom, dateTo, costAssumptions, costAssumptionsActive, hiddenUnpricedCount]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, selectedProvider, freeOnly, sortBy, priceMin, priceMax, benchMin, benchMaxCost, dateFrom, dateTo, costAssumptions]);

  const visibleModels = useMemo(
    () => filteredModels.slice(0, visibleCount),
    [filteredModels, visibleCount]
  );

  // lives inside pickBenchValueLeader). Never blended with page-wide pricing.
  const benchValueLeader = useMemo(
    () => pickBenchValueLeader(filteredModels),
    [filteredModels],
  );
  const hasMore = visibleCount < filteredModels.length;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => {
      const next = Math.min(prev + PAGE_SIZE, filteredModels.length);
      setLoadMoreMessage(`Showing ${next} of ${filteredModels.length} models`);
      return next;
    });
  }, [filteredModels.length]);
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/60">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Logo mark */}
              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-violet-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <p className="text-base font-bold text-zinc-100 leading-none">
                  Kilo Gateway
                </p>
                <p className="text-xs text-zinc-400 leading-none mt-0.5">
                  AI Model Explorer
                </p>
              </div>
            </div>
            <ViewToggle view={view} onViewChange={handleViewChange} />
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-2">
            Latest AI Models
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base max-w-2xl">
            Newest releases across every provider on the Kilo Gateway — compare price, context, and capability to pick the current best.
          </p>
        </div>

        {/* Search & Filter */}
        {!loading && !error && (
          <SearchFilter
            search={search}
            onSearchChange={handleSearchChange}
            provider={selectedProvider}
            onProviderChange={handleProviderChange}
            providers={providers}
            freeOnly={freeOnly}
            onFreeOnlyChange={handleFreeOnlyChange}
            sortBy={sortBy}
            onSortByChange={handleSortByChange}
            relevanceActive={!userPickedSort && !!search}
            priceMin={priceMin}
            priceMax={priceMax}
            onPriceMinChange={handlePriceMinChange}
            onPriceMaxChange={handlePriceMaxChange}
            benchMin={benchMin}
            benchMaxCost={benchMaxCost}
            onBenchMinChange={handleBenchMinChange}
            onBenchMaxCostChange={handleBenchMaxCostChange}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={handleDateFromChange}
            onDateToChange={handleDateToChange}
            hasFilters={hasFilters}
            onReset={handleReset}
            totalCount={models.length}
            filteredCount={filteredModels.length}
            updatedAt={dataUpdatedAt ?? undefined}
            hiddenUnpricedCount={hiddenUnpricedCount}
            costAssumptions={costAssumptions}
            costAssumptionsActive={costAssumptionsActive}
            onCostAssumptionsChange={handleCostAssumptionsChange}
          />
        )}
      {/* Shared-URL cost assumptions that were out of range got clamped — tell the recipient. */}
      {assumptionsAdjustedNotice && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 mt-3 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300"
        >
          <span>
            Shared cost assumptions were outside 0–100% and were adjusted.
          </span>
          <button
            type="button"
            onClick={() => setAssumptionsAdjustedNotice(false)}
            className="shrink-0 font-semibold text-amber-400 hover:text-amber-200 transition-colors flex items-center justify-center max-sm:min-h-[44px] max-sm:min-w-[44px] -my-2 max-sm:-mx-1"
            aria-label="Dismiss notice"
          >
            ×
          </button>
        </div>
      )}
      {/* Shared URL carried filter params that failed validation — list them once. */}
      {invalidParamsNotice && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 mt-3 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300"
        >
          <span>
            Ignored invalid filter(s) from link: {invalidParamsNotice.join(", ")}
          </span>
          <button
            type="button"
            onClick={() => setInvalidParamsNotice(null)}
            className="shrink-0 font-semibold text-amber-400 hover:text-amber-200 transition-colors flex items-center justify-center max-sm:min-h-[44px] max-sm:min-w-[44px] -my-2 max-sm:-mx-1"
            aria-label="Dismiss notice"
          >
            ×
          </button>
        </div>
      )}
      </div>

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {loading ? (
          <SkeletonGrid count={12} view={view} />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchModels} />
        ) : filteredModels.length === 0 ? (
          <EmptyState hasFilters={hasFilters} filterChips={activeFilterChips} onReset={handleReset} />
        ) : (
          <>
            {benchValueLeader && (
              <div className="mb-4">
                <BenchValueStrip
                  leader={benchValueLeader}
                  scoredCount={filteredModels.filter((m) => m.terminalBench != null).length}
                  totalCount={filteredModels.length}
                />
              </div>
            )}
            {/* Content: list view renders as a comparison table — a sticky
                labeled header row sharing the exact grid template with each
                ModelCard list row, so numeric columns align for scanning.
                A footer line carries the shared per-1M assumption basis. */}
            {view === "list" ? (
              <div>
                <div
                  role="row"
                  aria-rowindex={1}
                  className="hidden sm:grid sm:grid-cols-[minmax(0,2fr)_80px_96px_96px_96px_72px_64px_108px] sm:items-center sm:gap-x-4 sm:px-4 sm:py-2.5 sticky top-16 z-[5] bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-400"
                >
                  <span>Model</span>
                  <span className="text-right whitespace-nowrap">Context</span>
                  <span className="text-right whitespace-nowrap">In $/1M</span>
                  <span className="text-right whitespace-nowrap">Out $/1M</span>
                  <span className="text-right whitespace-nowrap">Avg $/1M</span>
                  <span className="text-center whitespace-nowrap">TB</span>
                  <span className="text-right whitespace-nowrap">Age</span>
                  <span className="sr-only">Actions</span>
                </div>
                <div className="flex flex-col gap-3 pt-3">
                  {visibleModels.map((model) => (
                    <ModelCard
                      key={model.id}
                      model={model}
                      view={view}
                      costAssumptions={costAssumptions}
                      isBenchValueLeader={benchValueLeader?.id === model.id}
                    />
                  ))}
                </div>
                <p className="px-4 py-2.5 text-[11px] text-zinc-400 border border-zinc-800 rounded-xl bg-zinc-900/40 mt-3">
                  Prices per 1M tokens · avg assumes {formatCostAssumptionSummary(costAssumptions)}
                  {costAssumptionsActive && " (custom — adjust in More filters)"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {visibleModels.map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    view={view}
                    costAssumptions={costAssumptions}
                    isBenchValueLeader={benchValueLeader?.id === model.id}
                  />
                ))}
              </div>
            )}
            {hasMore && <Pagination visibleCount={visibleModels.length} totalCount={filteredModels.length} onLoadMore={loadMore} />}
            {loadMoreMessage && <p role="status" aria-live="polite" className="sr-only">{loadMoreMessage}</p>}
            {!hasMore && (
              <div className="text-center text-xs py-8">
                <p role="status" className="text-zinc-400">
                  All {filteredModels.length} models shown
                </p>
                {dataUpdatedAt != null && (
                  <FreshnessStamp
                    updatedAt={dataUpdatedAt}
                    className="mt-1 inline-block text-zinc-400"
                  />
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 py-6">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-zinc-400">
          Data sourced from{" "}
          <a
            href="https://api.kilo.ai/api/gateway/models"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400 hover:text-violet-300 transition-colors"
          >
            api.kilo.ai
          </a>
        </div>
      </footer>
    </div>
  );
}
