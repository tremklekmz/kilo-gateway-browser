import { Suspense } from "react";
import { ModelsBrowser } from "@/components/ModelsBrowser";
import { AIModel, ModelsResponse } from "@/lib/types";
import { MODELS_API_URL } from "@/lib/constants";
async function fetchModelsServer(): Promise<{ models: AIModel[] | null; fetchedAt: number | null }> {
	try {
		const res = await fetch(MODELS_API_URL, { next: { revalidate: 60 } });
		if (!res.ok) {
			return { models: null, fetchedAt: null };
		}
		const data: ModelsResponse = await res.json();
		// Snapshot the fetch moment here so the timestamp is identical on server and
		// client, instead of being recomputed by Date.now() at each render.
		return { models: data.data || [], fetchedAt: Date.now() };
	} catch {
		return { models: null, fetchedAt: null };
	}
}

export default async function Home() {
	const { models, fetchedAt } = await fetchModelsServer();

	// If server fetch succeeded, pass models as initial data (no client fetch needed).
	// If it failed (null), render without initialModels so the client-side fallback kicks in.
	return (
		<Suspense fallback={null}>
			<ModelsBrowser initialModels={models ?? undefined} initialUpdatedAt={fetchedAt ?? undefined} />
		</Suspense>
	);
}