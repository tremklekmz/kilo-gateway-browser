export interface ModelPricing {
  prompt: string;
  completion: string;
  request: string;
  image: string;
  web_search: string;
  internal_reasoning: string;
  input_cache_read?: string;
}

export interface ModelArchitecture {
  modality?: string;
  input_modalities: string[];
  output_modalities: string[];
  tokenizer: string;
  instruct_type?: string | null;
}

export interface TopProvider {
  context_length: number;
  max_completion_tokens: number;
  is_moderated: boolean;
}

export interface AIModel {
  id: string;
  canonical_slug?: string;
  name: string;
  created: number;
  description: string;
  context_length: number;
  architecture: ModelArchitecture;
  pricing: ModelPricing;
  top_provider: TopProvider;
  supported_parameters?: string[];
  preferredIndex?: number;
}

export interface ModelsResponse {
  data: AIModel[];
}
