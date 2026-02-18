"use client";

import React, { useState } from "react";
import { AIModel } from "@/lib/types";
import {
  formatContextLength,
  formatPrice,
  formatProviderName,
  getProviderFromId,
  isFreeModel,
} from "@/lib/utils";

interface ModelCardProps {
  model: AIModel;
  view: "grid" | "list";
}

function CopyIcon({ copied }: { copied: boolean }) {
  if (copied) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function ProviderBadge({ provider }: { provider: string }) {
  const colorMap: Record<string, string> = {
    openai: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    anthropic: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    meta: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    google: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    mistralai: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    deepseek: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    "x-ai": "bg-slate-500/10 text-slate-300 border-slate-500/20",
    kilo: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    cohere: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    qwen: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    microsoft: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    nvidia: "bg-green-500/10 text-green-400 border-green-500/20",
    perplexity: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  };

  const colorClass =
    colorMap[provider.toLowerCase()] ||
    "bg-zinc-700/50 text-zinc-400 border-zinc-600/30";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass} shrink-0`}
    >
      {formatProviderName(provider)}
    </span>
  );
}

function FreeBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-neon-green/10 text-neon-green border border-neon-green/30 shrink-0">
      FREE
    </span>
  );
}

const MODALITY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  text: {
    label: "Text",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 6.1H3" /><path d="M21 12.1H3" /><path d="M15.1 18H3" />
      </svg>
    ),
    color: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  },
  image: {
    label: "Image",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
    ),
    color: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  },
  audio: {
    label: "Audio",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
      </svg>
    ),
    color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  video: {
    label: "Video",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m22 8-6 4 6 4V8z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
      </svg>
    ),
    color: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  },
};

function ModalityBadges({ modalities }: { modalities: string[] }) {
  if (!modalities || modalities.length === 0) return null;
  const normalized = modalities.map((m) => m.toLowerCase().split("+")[0].trim());
  const unique = Array.from(new Set(normalized));
  return (
    <div className="flex flex-wrap gap-1">
      {unique.map((mod) => {
        const cfg = MODALITY_CONFIG[mod];
        if (!cfg) return null;
        return (
          <span
            key={mod}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${cfg.color}`}
          >
            {cfg.icon}
            {cfg.label}
          </span>
        );
      })}
    </div>
  );
}

function StatPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 min-w-0">
      <span className="text-xs text-zinc-500 font-medium uppercase tracking-wide leading-none mb-1">
        {label}
      </span>
      <span className="text-sm font-semibold text-zinc-200 leading-none truncate w-full text-center">
        {value}
      </span>
    </div>
  );
}

export function ModelCard({ model, view }: ModelCardProps) {
  const [copied, setCopied] = useState(false);
  const provider = getProviderFromId(model.id);
  const free = isFreeModel(model);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(model.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement("textarea");
      el.value = model.id;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const promptPrice = formatPrice(model.pricing.prompt);
  const completionPrice = formatPrice(model.pricing.completion);
  const contextLength = formatContextLength(model.context_length);

  if (view === "list") {
    return (
      <div className="group flex items-start gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all duration-200">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h3 className="text-sm font-semibold text-zinc-100 truncate">
              {model.name}
            </h3>
            <ProviderBadge provider={provider} />
            {free && <FreeBadge />}
            <ModalityBadges modalities={model.architecture?.input_modalities ?? []} />
          </div>
          {model.description && (
            <p className="text-xs text-zinc-500 line-clamp-2 mb-2.5 leading-relaxed">
              {model.description}
            </p>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <span className="text-zinc-600">Context:</span>
              <span className="text-zinc-300 font-medium">{contextLength}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-zinc-600">In:</span>
              <span className={`font-medium ${free ? "text-emerald-400" : "text-zinc-300"}`}>
                {promptPrice}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-zinc-600">Out:</span>
              <span className={`font-medium ${free ? "text-emerald-400" : "text-zinc-300"}`}>
                {completionPrice}
              </span>
            </span>
            <span className="text-zinc-600 text-[10px]">per 1M tokens</span>
            <span className="flex items-center gap-1 font-mono text-zinc-600 text-[11px]">
              {model.id}
            </span>
          </div>
        </div>
        <button
          onClick={handleCopy}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
            copied
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200 hover:border-zinc-600"
          }`}
        >
          <CopyIcon copied={copied} />
          {copied ? "Copied!" : "Copy ID"}
        </button>
      </div>
    );
  }

  return (
    <div className="group flex flex-col p-5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all duration-200 hover:shadow-lg hover:shadow-black/20">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-zinc-100 leading-snug mb-1.5 line-clamp-2">
            {model.name}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            <ProviderBadge provider={provider} />
            {free && <FreeBadge />}
            <ModalityBadges modalities={model.architecture?.input_modalities ?? []} />
          </div>
        </div>
      </div>

      {/* Description */}
      {model.description && (
        <p className="text-xs text-zinc-500 line-clamp-3 mb-4 leading-relaxed flex-1">
          {model.description}
        </p>
      )}

      {/* Stats */}
      <div className="mt-auto">
        <div className="grid grid-cols-3 gap-2 mb-3">
          <StatPill label="Context" value={contextLength} />
          <StatPill label="In" value={promptPrice} />
          <StatPill label="Out" value={completionPrice} />
        </div>
        <p className="text-[10px] text-zinc-600 text-center mb-2 -mt-1">per 1M tokens</p>

        {/* Model ID + Copy */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/40 border border-zinc-700/50">
          <code className="flex-1 text-[11px] text-zinc-500 font-mono truncate">
            {model.id}
          </code>
          <button
            onClick={handleCopy}
            title="Copy model ID"
            className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
              copied
                ? "bg-emerald-500/10 text-emerald-400"
                : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700"
            }`}
          >
            <CopyIcon copied={copied} />
            <span className="hidden sm:inline">{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
