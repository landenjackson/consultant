// Configuration: src/config/models.ts
export interface ModelConfig {
  id: string;
  name: string;
  tier: "Fast" | "Executive" | "Sub-Second" | "Frontier";
  contextWindow?: string;
  enableExtendedThinking?: boolean;
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: "auto",
    name: "⚡ Enterprise Auto (Adaptive Routing)",
    tier: "Fast"
  },
  {
    id: "gemini-4-argon",
    name: "🌌 Gemini 4 Argon (Frontier Deep Reasoning)",
    contextWindow: "2M+",
    enableExtendedThinking: true,
    tier: "Executive"
  },
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash (High Reasoning)",
    tier: "Fast"
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash-Lite (Sub-1s)",
    tier: "Sub-Second"
  }
];
