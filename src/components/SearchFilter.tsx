"use client";

import { formatProviderName } from "@/lib/utils";

interface SearchFilterProps {
  search: string;
  onSearchChange: (value: string) => void;
  provider: string;
  onProviderChange: (value: string) => void;
  providers: string[];
  totalCount: number;
  filteredCount: number;
}

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-zinc-500"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function ClearIcon() {
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
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function ChevronIcon() {
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
      className="text-zinc-500 pointer-events-none"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function SearchFilter({
  search,
  onSearchChange,
  provider,
  onProviderChange,
  providers,
  totalCount,
  filteredCount,
}: SearchFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <SearchIcon />
        </div>
        <input
          type="text"
          placeholder="Search models by name or ID..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-9 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all duration-200"
        />
        {search && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ClearIcon />
          </button>
        )}
      </div>

      {/* Provider filter */}
      <div className="relative sm:w-52">
        <select
          value={provider}
          onChange={(e) => onProviderChange(e.target.value)}
          className="w-full appearance-none pl-3 pr-8 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all duration-200 cursor-pointer"
        >
          <option value="">All Providers</option>
          {providers.map((p) => (
            <option key={p} value={p}>
              {formatProviderName(p)}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronIcon />
        </div>
      </div>

      {/* Count */}
      <div className="flex items-center justify-center sm:justify-start px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-500 whitespace-nowrap">
        <span className="text-zinc-300 font-semibold">{filteredCount}</span>
        <span className="mx-1">/</span>
        <span>{totalCount}</span>
        <span className="ml-1 hidden sm:inline">models</span>
      </div>
    </div>
  );
}
