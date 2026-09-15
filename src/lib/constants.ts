// Single data source for the SPA: the committed snapshot refreshed by
// `npm run models:sync` (CI refreshes it every 15 minutes). A browser cannot
// fetch api.kilo.ai directly — the API sends no CORS headers — so unlike the
// old Next.js server-fetch this URL is only hit by the sync script.
export const MODELS_API_URL = "https://api.kilo.ai/api/gateway/models";

/** App-local snapshot shipped as a static asset. */
export const MODELS_SNAPSHOT_URL = `${import.meta.env.BASE_URL}data/models.json`;
