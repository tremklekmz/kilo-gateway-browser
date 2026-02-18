import { AIModel } from "./types";

export function getProviderFromId(modelId: string): string {
  const parts = modelId.split("/");
  if (parts.length >= 2) {
    return parts[0];
  }
  return "unknown";
}

export function formatProviderName(provider: string): string {
  const providerMap: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    meta: "Meta",
    google: "Google",
    mistralai: "Mistral AI",
    cohere: "Cohere",
    "01-ai": "01.AI",
    "x-ai": "xAI",
    deepseek: "DeepSeek",
    qwen: "Qwen",
    microsoft: "Microsoft",
    amazon: "Amazon",
    nvidia: "NVIDIA",
    perplexity: "Perplexity",
    minimax: "MiniMax",
    "z-ai": "Z.ai",
    kilo: "Kilo",
    together: "Together AI",
    groq: "Groq",
    fireworks: "Fireworks",
    databricks: "Databricks",
    inflection: "Inflection",
    ai21: "AI21",
    allenai: "AllenAI",
    "liquid-ai": "Liquid AI",
    nousresearch: "Nous Research",
    teknium: "Teknium",
    "open-orca": "Open Orca",
    "cognitive-computations": "Cognitive Computations",
    huggingfaceh4: "HuggingFace H4",
    openchat: "OpenChat",
    phind: "Phind",
    wizardlm: "WizardLM",
    gryphe: "Gryphe",
    undi95: "Undi95",
    jondurbin: "Jon Durbin",
    austism: "Austism",
    sophosympatheia: "Sophosympatheia",
    sao10k: "Sao10k",
    neversleep: "Neversleep",
    pygmalionai: "PygmalionAI",
    rwkv: "RWKV",
    mancer: "Mancer",
    lynn: "Lynn",
    recursal: "Recursal",
    alpindale: "Alpindale",
    thedrummer: "TheDrummer",
    "eva-unit-01": "Eva Unit 01",
    aetherwiing: "Aetherwiing",
    liuhaotian: "LiuHaotian",
    "haotian-liu": "Haotian Liu",
    bytedance: "ByteDance",
    baidu: "Baidu",
    zhipuai: "ZhipuAI",
    "baichuan-inc": "Baichuan",
    internlm: "InternLM",
    tiiuae: "TII UAE",
    bigcode: "BigCode",
    eleutherai: "EleutherAI",
    stabilityai: "Stability AI",
    mosaicml: "MosaicML",
    lmsys: "LMSYS",
    togethercomputer: "Together Computer",
    "garage-baind": "Garage bAInd",
    migtissera: "Migtissera",
    openrouter: "OpenRouter",
  };

  return providerMap[provider.toLowerCase()] || capitalize(provider);
}

function capitalize(str: string): string {
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatContextLength(length: number): string {
  if (length >= 1_000_000) {
    return `${(length / 1_000_000).toFixed(1)}M`;
  }
  if (length >= 1_000) {
    return `${Math.round(length / 1_000)}K`;
  }
  return length.toString();
}

export function formatPrice(price: string): string {
  const num = parseFloat(price);
  if (num === 0) return "Free";
  if (num < 0.000001) return `$${(num * 1_000_000).toFixed(4)}`;
  return `$${(num * 1_000_000).toFixed(2)}`;
}

export function getUniqueProviders(models: AIModel[]): string[] {
  const providers = new Set<string>();
  models.forEach((model) => {
    providers.add(getProviderFromId(model.id));
  });
  return Array.from(providers).sort();
}

export function isFreeModel(model: AIModel): boolean {
  return (
    parseFloat(model.pricing.prompt) === 0 &&
    parseFloat(model.pricing.completion) === 0
  );
}
