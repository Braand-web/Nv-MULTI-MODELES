import { geolocation, ipAddress } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  isStepCount,
  streamText,
  toUIMessageStream,
  generateText,
} from "ai";
import { checkBotId } from "botid/server";
import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream";
import { auth, type UserType } from "@/app/(auth)/auth";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import {
  allowedModelIds,
  chatModels,
  DEFAULT_CHAT_MODEL,
  getCapabilities,
  getModelAvailability,
} from "@/lib/ai/models";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { editDocument } from "@/lib/ai/tools/edit-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { searchWeb } from "@/lib/ai/tools/search-web";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { isProductionEnvironment } from "@/lib/constants";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatTitleById,
  updateMessage,
  getUserById,
  updateUserCredits,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatbotError } from "@/lib/errors";
import { checkIpRateLimit } from "@/lib/ratelimit";
import type { ChatMessage, WaitingStatusData } from "@/lib/types";
import { convertToUIMessages, generateUUID, getTextFromMessage } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

const HEALTH_CHECK_DELAY_MS = 9000;

function isModelStreamActivity(chunk: { type: string }) {
  return !["start", "start-step", "finish-step", "finish", "raw"].includes(
    chunk.type
  );
}

function getStreamContext() {
  try {
    return createResumableStreamContext({ waitUntil: after });
  } catch {
    return null;
  }
}

function getModelCreditCost(modelId: string): number {
  const id = modelId.toLowerCase();
  if (
    id.includes("flux") ||
    id.includes("dall-e") ||
    id.includes("gpt-image") ||
    id.includes("banana")
  ) {
    return 10;
  }
  if (
    id.includes("gpt-4o-mini") ||
    id.includes("llama-3.1-8b") ||
    id.includes("claude-3-haiku")
  ) {
    return 1;
  }
  if (
    id.includes("gpt-4") ||
    id.includes("claude-3-5") ||
    id.includes("gemini-1.5-pro")
  ) {
    return 5;
  }
  return 2;
}

async function classifyPromptAuto(prompt: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: getLanguageModel("google/gemini-2.0-flash-exp:free"),
      prompt: prompt,
      system: `You are the central routing agent of the Origyn AI assistant.
Your task is to analyze the user prompt and decide which AI model is best suited for it.
Respond with a strict JSON object (and nothing else) in this format:
{
  "category": "image_generation" | "coding" | "general",
  "suggestedModel": "string"
}

Allowed suggestedModel IDs:
- "black-forest-labs/flux-1.1-pro" for any image generation request (e.g. create, draw, generate, paint a picture, logo, image, or artwork).
- "qwen/qwen-2.5-coder-32b-instruct" for complex coding, script writing, algorithms, debugging, database queries, and technical program design.
- "google/gemini-2.0-flash-exp:free" for general chat, creative writing, text translation, summaries, general queries, and other general tasks.

Example user prompt: "Génère une image de chaton" -> suggestedModel: "black-forest-labs/flux-1.1-pro"
Example user prompt: "Write a python script to parse CSV" -> suggestedModel: "qwen/qwen-2.5-coder-32b-instruct"
Example user prompt: "Bonjour comment ça va?" -> suggestedModel: "google/gemini-2.0-flash-exp:free"`,
    });

    const cleanedText = text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/```$/, "");
    const parsed = JSON.parse(cleanedText);
    if (parsed.suggestedModel) {
      return parsed.suggestedModel;
    }
  } catch (err) {
    console.error(
      "Auto router classification error, falling back to default:",
      err
    );
  }
  return "google/gemini-2.0-flash-exp:free";
}

export { getStreamContext };

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch {
    return new ChatbotError("bad_request:api").toResponse();
  }

  try {
    const { id, message, messages, selectedChatModel, selectedVisibilityType } =
      requestBody;

    const [botIdResult, session] = await Promise.all([
      checkBotId().catch(() => null),
      auth(),
    ]);

    if (botIdResult?.isBot) {
      return new ChatbotError("forbidden:api").toResponse();
    }

    if (!session?.user) {
      return new ChatbotError("unauthorized:chat").toResponse();
    }

    const users = await getUserById(session.user.id);
    const dbUser = users[0];
    if (!dbUser) {
      return new ChatbotError("forbidden:chat").toResponse();
    }

    let chatModel = selectedChatModel;
    if (chatModel === "auto" && message) {
      const userPrompt = getTextFromMessage(message);
      chatModel = await classifyPromptAuto(userPrompt);
    } else if (chatModel === "auto") {
      chatModel = DEFAULT_CHAT_MODEL;
    } else {
      const isModelAllowed = allowedModelIds.has(selectedChatModel) || process.env.OPENROUTER_API_KEY;
      chatModel = isModelAllowed ? selectedChatModel : DEFAULT_CHAT_MODEL;
    }

    const cost = getModelCreditCost(chatModel);
    if (dbUser.credits < cost) {
      return new Response(
        JSON.stringify({
          error: "insufficient_credits",
          message: "Vous n'avez pas assez de crédits pour utiliser ce modèle. Veuillez recharger votre solde.",
        }),
        { status: 402, headers: { "Content-Type": "application/json" } }
      );
    }

    await checkIpRateLimit(ipAddress(request));

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      differenceInHours: 1,
      id: session.user.id,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerHour) {
      return new ChatbotError("rate_limit:chat").toResponse();
    }

    const isToolApprovalFlow = Boolean(messages);

    const chat = await getChatById({ id });
    let messagesFromDb: DBMessage[] = [];
    let titlePromise: Promise<string> | null = null;

    if (chat) {
      if (chat.userId !== session.user.id) {
        return new ChatbotError("forbidden:chat").toResponse();
      }
      messagesFromDb = await getMessagesByChatId({ id });
    } else if (message?.role === "user") {
      await saveChat({
        id,
        title: "New chat",
        userId: session.user.id,
        visibility: selectedVisibilityType,
      });
      titlePromise = generateTitleFromUserMessage({ message });
    }

    let uiMessages: ChatMessage[];

    if (isToolApprovalFlow && messages) {
      const dbMessages = convertToUIMessages(messagesFromDb);
      const approvalStates = new Map(
        messages.flatMap(
          (m) =>
            m.parts
              ?.filter(
                (p: Record<string, unknown>) =>
                  p.state === "approval-responded" ||
                  p.state === "output-denied"
              )
              .map((p: Record<string, unknown>) => [
                String(p.toolCallId ?? ""),
                p,
              ]) ?? []
        )
      );
      uiMessages = dbMessages.map((msg) => ({
        ...msg,
        parts: msg.parts.map((part) => {
          if (
            "toolCallId" in part &&
            approvalStates.has(String(part.toolCallId))
          ) {
            return { ...part, ...approvalStates.get(String(part.toolCallId)) };
          }
          return part;
        }),
      })) as ChatMessage[];
    } else {
      uiMessages = [
        ...convertToUIMessages(messagesFromDb),
        message as ChatMessage,
      ];
    }

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      city,
      country,
      latitude,
      longitude,
    };

    if (message?.role === "user") {
      await saveMessages({
        messages: [
          {
            attachments: [],
            chatId: id,
            createdAt: new Date(),
            id: message.id,
            parts: message.parts,
            role: "user",
          },
        ],
      });
    }

    const isImageModel =
      chatModel.includes("flux") ||
      chatModel.includes("dall-e") ||
      chatModel.includes("sdxl") ||
      chatModel.includes("stable-diffusion");

    if (isImageModel && message) {
      const stream = createUIMessageStream({
        execute: async ({ writer: dataStream }) => {
          try {
            dataStream.write({
              type: "text-delta",
              delta: "Génération de l'image en cours... 🚀\n\n",
              id: generateUUID(),
            });

            const userPrompt = getTextFromMessage(message);
            const openRouterKey = process.env.OPENROUTER_API_KEY;

            if (!openRouterKey) {
              dataStream.write({
                type: "text-delta",
                delta: "Erreur : La clé d'API OpenRouter n'est pas configurée.",
                id: generateUUID(),
              });
              return;
            }

            const response = await fetch(
              "https://openrouter.ai/api/v1/images",
              {
                body: JSON.stringify({
                  model: chatModel,
                  prompt: userPrompt,
                  response_format: "b64_json",
                }),
                headers: {
                  Authorization: `Bearer ${openRouterKey}`,
                  "Content-Type": "application/json",
                },
                method: "POST",
              }
            );

            if (!response.ok) {
              const errText = await response.text();
              console.error("OpenRouter image generation failed:", errText);
              dataStream.write({
                type: "text-delta",
                delta: "Erreur : Échec de la génération de l'image via OpenRouter.",
                id: generateUUID(),
              });
              return;
            }

            const data = await response.json();
            const b64_json = data.data?.[0]?.b64_json;
            if (!b64_json) {
              dataStream.write({
                type: "text-delta",
                delta: "Erreur : Aucun contenu d'image retourné par le modèle.",
                id: generateUUID(),
              });
              return;
            }

            const assistantMessageId = generateUUID();
            const base64Url = `data:image/png;base64,${b64_json}`;
            const markdown = `Voici l'image que j'ai générée pour vous :\n\n![Generated Image](${base64Url})`;

            await saveMessages({
              messages: [
                {
                  attachments: [
                    {
                      contentType: "image/png",
                      name: "generated-image.png",
                      url: base64Url,
                    },
                  ],
                  chatId: id,
                  createdAt: new Date(),
                  id: assistantMessageId,
                  parts: [
                    { text: markdown, type: "text" },
                    {
                      filename: "generated-image.png",
                      mediaType: "image/png",
                      type: "file",
                      url: base64Url,
                    },
                  ],
                  role: "assistant",
                },
              ],
            });

            await updateUserCredits({
              credits: Math.max(0, dbUser.credits - 10),
              id: session.user.id,
            });

            dataStream.write({
              type: "text-delta",
              delta: markdown,
              id: assistantMessageId,
            });

            if (titlePromise) {
              try {
                const title = await titlePromise;
                dataStream.write({ data: title, type: "data-chat-title" });
                updateChatTitleById({ chatId: id, title });
              } catch {}
            }
          } catch (err) {
            console.error("Image generation handler error:", err);
            dataStream.write({
              type: "text-delta",
              delta: "Une erreur est survenue lors de la génération de l'image.",
              id: generateUUID(),
            });
          }
        },
        generateId: generateUUID,
      });

      return createUIMessageStreamResponse({
        stream,
      });
    }

    const modelConfig = chatModels.find((m) => m.id === chatModel);
    const modelCapabilities = await getCapabilities();
    const capabilities = modelCapabilities[chatModel];
    const isReasoningModel = capabilities?.reasoning === true;
    const supportsTools = capabilities?.tools === true;

    const modelMessages = await convertToModelMessages(uiMessages);

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        const modelName = modelConfig?.name ?? chatModel;
        let hasModelActivity = false;
        let healthCheckTimer: ReturnType<typeof setTimeout> | undefined;

        const clearHealthCheckTimer = () => {
          if (healthCheckTimer) {
            clearTimeout(healthCheckTimer);
          }
        };

        const writeWaitingStatus = (
          phase: WaitingStatusData["phase"],
          messageText: string
        ) => {
          if (hasModelActivity && phase !== "thinking") {
            return;
          }
          dataStream.write({
            data: {
              message: messageText,
              modelId: chatModel,
              modelName,
              phase,
            },
            transient: true,
            type: "data-waiting-status",
          });
        };

        writeWaitingStatus("waiting", "Waiting...");

        healthCheckTimer = setTimeout(() => {
          getModelAvailability(chatModel)
            .then((availability) => {
              if (availability === "impacted") {
                writeWaitingStatus(
                  "health",
                  `${modelName} may be slow or unavailable right now...`
                );
              } else {
                writeWaitingStatus("still-waiting", "Still waiting...");
              }
            })
            .catch(() => {
              writeWaitingStatus("still-waiting", "Still waiting...");
            });
        }, HEALTH_CHECK_DELAY_MS);

        const markModelActive = () => {
          if (hasModelActivity) {
            return;
          }
          hasModelActivity = true;
          clearHealthCheckTimer();
          writeWaitingStatus("thinking", "Thinking...");
        };

        const stopWaitingStatus = () => {
          hasModelActivity = true;
          clearHealthCheckTimer();
        };

        const result = streamText({
          activeTools:
            isReasoningModel && !supportsTools
              ? []
              : [
                  "getWeather",
                  "createDocument",
                  "editDocument",
                  "updateDocument",
                  "requestSuggestions",
                  "searchWeb",
                ],
          instructions: systemPrompt({ requestHints, supportsTools }),
          messages: modelMessages,
          model: getLanguageModel(chatModel),
          onAbort() {
            stopWaitingStatus();
          },
          onChunk({ chunk }) {
            if (isModelStreamActivity(chunk)) {
              markModelActive();
            }
          },
          onEnd() {
            stopWaitingStatus();
          },
          onError() {
            stopWaitingStatus();
          },
          providerOptions: {
            ...(modelConfig?.gatewayOrder && {
              gateway: { order: modelConfig.gatewayOrder },
            }),
            ...(modelConfig?.reasoningEffort && {
              openai: { reasoningEffort: modelConfig.reasoningEffort },
            }),
          },
          stopWhen: isStepCount(5),
          telemetry: {
            functionId: "stream-text",
            isEnabled: isProductionEnvironment,
          },
          tools: {
            createDocument: createDocument({
              dataStream,
              modelId: chatModel,
              session,
            }),
            editDocument: editDocument({ dataStream, session }),
            getWeather,
            searchWeb,
            requestSuggestions: requestSuggestions({
              dataStream,
              modelId: chatModel,
              session,
            }),
            updateDocument: updateDocument({
              dataStream,
              modelId: chatModel,
              session,
            }),
          },
        });

        dataStream.merge(
          toUIMessageStream({
            sendReasoning: isReasoningModel,
            stream: result.stream,
          })
        );

        if (titlePromise) {
          try {
            const title = await titlePromise;
            dataStream.write({ data: title, type: "data-chat-title" });
            updateChatTitleById({ chatId: id, title });
          } catch {
            /* non-fatal */
          }
        }
      },
      generateId: generateUUID,
      onEnd: async ({ messages: finishedMessages }) => {
        try {
          const newCredits = Math.max(0, dbUser.credits - cost);
          await updateUserCredits({ id: session.user.id, credits: newCredits });
        } catch (err) {
          console.error("Failed to deduct credits:", err);
        }

        if (isToolApprovalFlow) {
          await Promise.all(
            finishedMessages.map(async (finishedMsg) => {
              const existingMsg = uiMessages.find(
                (m) => m.id === finishedMsg.id
              );
              if (existingMsg) {
                await updateMessage({
                  id: finishedMsg.id,
                  parts: finishedMsg.parts,
                });
                return;
              }

              await saveMessages({
                messages: [
                  {
                    attachments: [],
                    chatId: id,
                    createdAt: new Date(),
                    id: finishedMsg.id,
                    parts: finishedMsg.parts,
                    role: finishedMsg.role,
                  },
                ],
              });
            })
          );
        } else if (finishedMessages.length > 0) {
          await saveMessages({
            messages: finishedMessages.map((currentMessage) => ({
              attachments: [],
              chatId: id,
              createdAt: new Date(),
              id: currentMessage.id,
              parts: currentMessage.parts,
              role: currentMessage.role,
            })),
          });
        }
      },
      onError: (error) => {
        if (
          error instanceof Error &&
          error.message?.includes(
            "AI Gateway requires a valid credit card on file to service requests"
          )
        ) {
          return "AI Gateway requires a valid credit card on file to service requests. Please visit https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card to add a card and unlock your free credits.";
        }
        return "Oops, an error occurred!";
      },
      originalMessages: isToolApprovalFlow ? uiMessages : undefined,
    });

    return createUIMessageStreamResponse({
      async consumeSseStream({ stream: sseStream }) {
        if (!process.env.REDIS_URL) {
          return;
        }
        try {
          const streamContext = getStreamContext();
          if (streamContext) {
            const streamId = generateId();
            await createStreamId({ chatId: id, streamId });
            await streamContext.createNewResumableStream(
              streamId,
              () => sseStream
            );
          }
        } catch {
          /* non-critical */
        }
      },
      stream,
    });
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    if (
      error instanceof Error &&
      error.message?.includes(
        "AI Gateway requires a valid credit card on file to service requests"
      )
    ) {
      return new ChatbotError("bad_request:activate_gateway").toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatbotError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
