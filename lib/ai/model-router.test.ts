import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { selectModelForRequest } from "./model-router";

describe("selectModelForRequest", () => {
  test("routes image generation prompts to an image model when credits allow it", () => {
    const selection = selectModelForRequest({
      credits: 120,
      prompt: "Genere une image de dashboard SaaS futuriste",
      selectedModelId: "auto",
      userPlan: "free",
    });

    assert.equal(selection.ok, true);
    if (selection.ok) {
      assert.ok(selection.profile.tasks.includes("image"));
    }
  });

  test("routes complex coding prompts to a coding-capable model", () => {
    const selection = selectModelForRequest({
      credits: 20,
      prompt:
        "Analyse cette architecture Next.js Supabase, corrige le schema SQL et refactor le routeur API en production",
      selectedModelId: "auto",
      userPlan: "pro",
    });

    assert.equal(selection.ok, true);
    if (selection.ok) {
      assert.ok(selection.profile.tasks.includes("code"));
    }
  });

  test("rejects unaffordable auto requests before calling a model", () => {
    const selection = selectModelForRequest({
      credits: 0,
      prompt: "Resume ce texte",
      selectedModelId: "auto",
      userPlan: "free",
    });

    assert.equal(selection.ok, false);
    if (!selection.ok) {
      assert.equal(selection.error, "insufficient_credits");
    }
  });

  test("blocks elite manual models for free users", () => {
    const selection = selectModelForRequest({
      credits: 100,
      prompt: "Analyse strategique complexe",
      selectedModelId: "openai/o3-pro",
      userPlan: "free",
    });

    assert.equal(selection.ok, false);
    if (!selection.ok) {
      assert.equal(selection.error, "plan_required");
      assert.equal(selection.requiredPlan, "elite");
    }
  });
});
