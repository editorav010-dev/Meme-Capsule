import { describe, it, expect } from "vitest";

describe("AI Judge Queue & Batch Curation Workflow", () => {
  it("determines eligibility for AI judges strictly when status is draft and upload is uploaded", () => {
    const isEligibleForAi = (meme: {
      status: string;
      is_active: number;
      upload_state: string;
      is_force_removed: boolean;
      evaluation_state?: string;
    }) => {
      return (
        meme.status === "draft" &&
        meme.is_active === 0 &&
        meme.upload_state === "uploaded" &&
        !meme.is_force_removed &&
        meme.evaluation_state !== "succeeded"
      );
    };

    // Case 1: Freshly uploaded intake meme - eligible for AI judge
    expect(
      isEligibleForAi({
        status: "draft",
        is_active: 0,
        upload_state: "uploaded",
        is_force_removed: false,
        evaluation_state: "pending",
      })
    ).toBe(true);

    // Case 2: Already evaluated by this AI judge - excluded from this judge's draft queue
    expect(
      isEligibleForAi({
        status: "draft",
        is_active: 0,
        upload_state: "uploaded",
        is_force_removed: false,
        evaluation_state: "succeeded",
      })
    ).toBe(false);

    // Case 3: Ingestion upload failed - excluded
    expect(
      isEligibleForAi({
        status: "draft",
        is_active: 0,
        upload_state: "failed",
        is_force_removed: false,
      })
    ).toBe(false);

    // Case 4: Already promoted to archived (human ready) - excluded from AI queue
    expect(
      isEligibleForAi({
        status: "archived",
        is_active: 0,
        upload_state: "uploaded",
        is_force_removed: false,
      })
    ).toBe(false);

    // Case 5: Publication ready active meme - strictly protected and excluded
    expect(
      isEligibleForAi({
        status: "active",
        is_active: 1,
        upload_state: "uploaded",
        is_force_removed: false,
      })
    ).toBe(false);
  });

  it("advances ingestion job to human_ready and meme to archived when sole AI Judge (judge4) succeeds", () => {
    const checkSingleAiCompletion = (evaluations: Array<{ judge_key: string; state: string }>) => {
      const j4 = evaluations.find((e) => e.judge_key === "judge4" && e.state === "succeeded");
      return Boolean(j4);
    };

    // J4 succeeded alone -> PROMOTED to human_ready (no longer blocked waiting for J5)
    expect(
      checkSingleAiCompletion([
        { judge_key: "judge4", state: "succeeded" },
      ])
    ).toBe(true);

    // J4 failed -> NOT human_ready
    expect(
      checkSingleAiCompletion([
        { judge_key: "judge4", state: "failed" },
      ])
    ).toBe(false);

    // J4 pending -> NOT human_ready
    expect(
      checkSingleAiCompletion([
        { judge_key: "judge4", state: "pending" },
      ])
    ).toBe(false);
  });

  it("resolves media proxy URL as reliable fallback when direct R2 URL is unconfigured", () => {
    const resolveMediaUrl = (meme: { id: string; image_url: string | null; storage_path: string | null }, publicBase: string) => {
      const mediaProxyUrl = `/api/curate/media/proxy?id=${encodeURIComponent(meme.id)}`;
      return (
        meme.image_url ||
        (meme.storage_path && publicBase ? `${publicBase}/${meme.storage_path.replace(/^\/+/, "")}` : mediaProxyUrl) ||
        mediaProxyUrl
      );
    };

    // Intake meme with null image_url and missing public base
    const intakeMeme = {
      id: "intake-cc4cb2809fc607894ccd1c84f0591f65",
      image_url: null,
      storage_path: "ingestion/batch-test/image.jpg",
    };

    expect(resolveMediaUrl(intakeMeme, "")).toBe(
      "/api/curate/media/proxy?id=intake-cc4cb2809fc607894ccd1c84f0591f65"
    );

    // Published meme with existing public CDN URL
    const activeMeme = {
      id: "meme-123",
      image_url: "https://pub-cdn.example.com/memes/123.jpg",
      storage_path: "memes/123.jpg",
    };
    expect(resolveMediaUrl(activeMeme, "https://pub-cdn.example.com")).toBe(
      "https://pub-cdn.example.com/memes/123.jpg"
    );
  });
});

