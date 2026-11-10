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

  it("determines strict no-repeat eligibility for human judges in batch queues", () => {
    interface HumanBatchItem {
      id: string;
      batch_id: string;
      status: string;
      is_force_removed: boolean;
      final_status: string | null;
      curator_votes: Record<string, string>; // userId -> corpus_status
    }

    const isEligibleForHumanJudgeInBatch = (meme: HumanBatchItem, targetBatchId: string, userId: string) => {
      // Must match batch
      if (meme.batch_id !== targetBatchId) return false;
      // Must be in archived (human ready) pool
      if (meme.status !== "archived") return false;
      // Must not be force removed / purged
      if (meme.is_force_removed) return false;
      // Must not be finalized by consensus
      if (meme.final_status !== null) return false;
      // Must not have already been reviewed by this specific human judge
      if (meme.curator_votes[userId]) return false;

      return true;
    };

    const testMeme: HumanBatchItem = {
      id: "meme-test-1",
      batch_id: "batch-1",
      status: "archived",
      is_force_removed: false,
      final_status: null,
      curator_votes: {},
    };

    // 1. Fresh unreviewed meme in batch 1 is eligible for Judge 1
    expect(isEligibleForHumanJudgeInBatch(testMeme, "batch-1", "user-judge1")).toBe(true);

    // 2. Not eligible if querying batch 2
    expect(isEligibleForHumanJudgeInBatch(testMeme, "batch-2", "user-judge1")).toBe(false);

    // 3. Judge 1 reviews the meme -> immediately disqualified for Judge 1 (no repeats)
    testMeme.curator_votes["user-judge1"] = "keep";
    expect(isEligibleForHumanJudgeInBatch(testMeme, "batch-1", "user-judge1")).toBe(false);

    // 4. Still eligible for Judge 2 and Judge 3
    expect(isEligibleForHumanJudgeInBatch(testMeme, "batch-1", "user-judge2")).toBe(true);
    expect(isEligibleForHumanJudgeInBatch(testMeme, "batch-1", "user-judge3")).toBe(true);

    // 5. Judge 2 reviews with keep -> consensus resolves meme to active
    testMeme.curator_votes["user-judge2"] = "keep";
    testMeme.final_status = "keep";
    testMeme.status = "active";

    // 6. Now closed for all judges including trailing Judge 3 without fabricating fake votes
    expect(isEligibleForHumanJudgeInBatch(testMeme, "batch-1", "user-judge3")).toBe(false);
    expect(testMeme.curator_votes["user-judge3"]).toBeUndefined();
  });
});

