import { ModelsBrowser } from "@/components/ModelsBrowser";
import { AIModel, ModelsResponse } from "@/lib/types";
import { MODELS_API_URL } from "@/lib/constants";

async function fetchModelsServer(): Promise<AIModel[] | null> {
  try {
    const res = await fetch(MODELS_API_URL, { next: { revalidate: 60 } });
    if (!res.ok) {
      return null;
    }
    const data: ModelsResponse = await res.json();
    return data.data || [];
  } catch {
    return null;
  }
}

export default async function Home() {
  const models = await fetchModelsServer();

  // If server fetch succeeded, pass models as initial data (no client fetch needed).
  // If it failed (null), render without initialModels so the client-side fallback kicks in.
  return <ModelsBrowser initialModels={models ?? undefined} />;
}
