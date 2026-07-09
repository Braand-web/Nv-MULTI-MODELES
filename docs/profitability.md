# Origyn profitability notes

Last checked: 2026-07-09.

## Pricing rule

The app currently sells 1 credit for 1 FCFA. For a rough USD conversion, this
analysis uses the fixed EUR/XAF peg as a stable reference: 1 EUR = 655.957 XAF.
Actual USD margin moves with EUR/USD.

Target model margin: at least 2x provider cost on a typical response. This
buffer covers payment fees, hosting, retries, failed UX flows, support, and
longer-than-average generations.

## Infrastructure costs to watch

- Vercel: Next.js hosting, serverless execution, bandwidth, blob usage, and AI
  Gateway usage when not routed through OpenRouter.
- Supabase/Postgres: database plan, storage, egress, backups, and connection
  limits.
- Redis: resumable stream storage if `REDIS_URL` is configured.
- Vercel Blob: uploaded attachments and generated assets if enabled.
- Fapshi: payment processing fee on successful credit purchases.
- OpenRouter/fal.ai/model providers: per-token or per-image inference.

## Current model credit floor

The credit costs in `lib/ai/model-router.ts` are set to stay profitable for a
typical 1k input / 2k output text exchange, or for one 1024x1024 image where
image pricing is available.

| Model | Credits | Plan | Profitability note |
| --- | ---: | --- | --- |
| openai/gpt-oss-20b | 1 | free | Safe low-cost fallback. |
| deepseek/deepseek-v3.2 | 2 | free | Safe coding/general default. |
| deepseek/deepseek-v4-flash | 2 | free | Safe fast fallback. |
| xai/grok-4.1-fast-non-reasoning | 2 | free | Safe fast general model. |
| moonshotai/kimi-k2.5 | 10 | free | Raised to protect longer outputs. |
| google/gemini-3.5-flash | 30 | free | Raised because longer outputs can be expensive. |
| black-forest-labs/flux.2-klein-4b | 25 | free | Budget image model; OpenRouter endpoint is megapixel-priced. |
| openai/o4-mini | 15 | pro | Safe for reasoning at normal lengths. |
| anthropic/claude-sonnet-5 | 30 | pro | Safe for typical output. |
| deepseek/deepseek-v4-pro | 8 | pro | High margin for technical work. |
| openai/gpt-oss-120b | 5 | pro | High margin open-weight model. |
| meta-llama/llama-4-maverick | 5 | pro | Safe if routed through OpenRouter. |
| black-forest-labs/flux.2-pro | 70 | pro | Quality image model; priced against OpenRouter/fal.ai FLUX.2 Pro. |
| xai/grok-4.5 | 25 | elite | Safe for typical text use. |
| openai/gpt-5.5 | 90 | elite | Raised for long outputs. |
| openai/o3-pro | 250 | elite | Expensive model; keep Elite-only. |
| anthropic/claude-fable-5 | 150 | elite | Very expensive in public catalog checks. |
| anthropic/claude-opus-4.8 | 80 | elite | Safe for typical output. |
| openai/gpt-image-1-mini | 120 | elite | Premium image model; actual cost is logged from OpenRouter usage. |

## Long-term control loop

The `AIUsage` table records model, task, complexity, user plan, credit cost, and
OpenRouter image cost when returned. The AUTO router reads recent vote signals
from `AIUsage` + `Vote_v2` and applies a small model score bonus or penalty for
similar tasks. This lets the system improve routing from aggregate outcomes
without training on private user content.

## Sources

- OpenRouter Image Generation docs: https://openrouter.ai/docs/guides/overview/multimodal/image-generation
- OpenRouter Image Models collection: https://openrouter.ai/collections/image-models
- fal.ai FLUX.2 Pro model page: https://fal.ai/models/fal-ai/flux-2-pro
- fal.ai FLUX 1.1 Pro API page: https://fal.ai/models/fal-ai/flux-pro/v1.1/api
