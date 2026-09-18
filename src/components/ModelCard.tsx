import { createMemo, createSignal, onSettled, Show } from "solid-js";
import type { AIModel } from "@/lib/types";
import type { CostAssumptions } from "@/lib/utils";
import { getModelCardData } from "./model-card/modelCardData";
import { ModelCardGrid } from "./model-card/ModelCardGrid";
import { ModelCardList } from "./model-card/ModelCardList";

export interface ModelCardProps {
  model: AIModel;
  view: "grid" | "list";
  costAssumptions?: CostAssumptions;
  /** Set on the single benchmark-value leader card (coverage-gated upstream). */
  isBenchValueLeader?: boolean;
}

export function ModelCard(props: ModelCardProps) {
  const [copied, setCopied] = createSignal(false);
  // Current time captured once per setup — "3d ago" needs no live tick, and a
  // stable value keeps the card's lifetime rendering consistent.
  const nowSeconds = Math.floor(Date.now() / 1000);
  const data = createMemo(() =>
    getModelCardData(props.model, props.costAssumptions, nowSeconds),
  );

  let copiedTimer: number | undefined;
  onSettled(() => {
    return () => {
      if (copiedTimer !== undefined) clearTimeout(copiedTimer);
    };
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(props.model.id);
    } catch {
      // fallback
      const el = document.createElement("textarea");
      el.value = props.model.id;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    if (copiedTimer !== undefined) clearTimeout(copiedTimer);
    copiedTimer = window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Show
      when={props.view === "list"}
      fallback={
        <ModelCardGrid
          {...props}
          free={data().free}
          isNew={data().isNew}
          provider={data().provider}
          promptPrice={data().promptPrice}
          completionPrice={data().completionPrice}
          contextLength={data().contextLength}
          avgPrice={data().avgPrice}
          avgAssumptionSummary={data().avgAssumptionSummary}
          createdDate={data().createdDate}
          relativeAge={data().relativeAge}
          relativeAgeFresh={data().relativeAgeFresh}
          isBenchValueLeader={props.isBenchValueLeader ?? false}
          handleCopy={handleCopy}
          copied={copied()}
        />
      }
    >
      <ModelCardList
        {...props}
        free={data().free}
        isNew={data().isNew}
        provider={data().provider}
        promptPrice={data().promptPrice}
        completionPrice={data().completionPrice}
        contextLength={data().contextLength}
        avgPrice={data().avgPrice}
        avgAssumptionSummary={data().avgAssumptionSummary}
        createdDate={data().createdDate}
        relativeAge={data().relativeAge}
        relativeAgeFresh={data().relativeAgeFresh}
        handleCopy={handleCopy}
        copied={copied()}
      />
    </Show>
  );
}
