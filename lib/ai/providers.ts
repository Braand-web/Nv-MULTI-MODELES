import { customProvider, gateway } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { isTestEnvironment } from "../constants";
import { getModelFallbacks, titleModel, TENCENT_HY3_FREE_MODEL } from "./models";

const openRouterFetch: typeof fetch = async (input, init) => {
  const requestUrl =
    typeof input === "string"
      ? input
      : input instanceof Request
        ? input.url
        : input.toString();
  const body = init?.body;

  if (
    requestUrl.endsWith("/chat/completions") &&
    typeof body === "string"
  ) {
    try {
      const payload = JSON.parse(body) as { model?: string };
      if (payload.model === TENCENT_HY3_FREE_MODEL) {
        return fetch(input, {
          ...init,
          body: JSON.stringify({
            ...payload,
            models: getModelFallbacks(TENCENT_HY3_FREE_MODEL),
          }),
        });
      }
    } catch {
      // Delegate malformed payload handling to OpenRouter.
    }
  }

  return fetch(input, init);
};

export const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  fetch: openRouterFetch,
  headers: {
    "HTTP-Referer": "https://github.com/Predat1/cHATBOT-MULTI-MODELE",
    "X-Title": "Origyn AI Assistant",
  },
});

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        chatModel,
        titleModel: mockTitleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "title-model": mockTitleModel,
        },
      });
    })()
  : null;

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  if (process.env.OPENROUTER_API_KEY) {
    return openrouter.languageModel(modelId);
  }

  return gateway.languageModel(modelId);
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }

  if (process.env.OPENROUTER_API_KEY) {
    return openrouter.languageModel(titleModel.id);
  }

  return gateway.languageModel(titleModel.id);
}
