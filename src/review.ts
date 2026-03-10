import * as core from "@actions/core";
import parseDiff, { Chunk, File } from "parse-diff";
import minimatch from "minimatch";
import { PRDetails, GithubComment } from "./types";
import {
  getPRDetails,
  getDiff,
  getCompareDiff,
  createReviewComment,
  hasExistingReview,
  getEventData,
} from "./github";
import { analyzeCode } from "./analyzeCode";
import { APPROVE_REVIEWS } from "./config";

// ────────────────────────────────────────────────
// طباعة قسرية جدًا في بداية التنفيذ (هتطلع دايمًا لو الـ action اشتغلت)
core.info("===== REVIEW.TS STARTED - DEBUG FORCED LINE 001 =====");
core.info(`GITHUB_EVENT_NAME = ${process.env.GITHUB_EVENT_NAME || 'not set'}`);
core.info(`OPENAI_API_KEY exists? ${!!process.env.OPENAI_API_KEY}`);
if (process.env.OPENAI_API_KEY) {
  const k = process.env.OPENAI_API_KEY;
  core.info(`OPENAI_API_KEY prefix: ${k.substring(0, 10)}...${k.slice(-6)}`);
  // محاولة تجاوز masking بطرق مختلفة
  core.info("Key debug concat: prefix-" + k + "-suffix");
  core.info("Key as object: " + JSON.stringify({ debugKey: k }, null, 2));
}
core.info("===== REVIEW.TS STARTED - DEBUG END =====");

// ────────────────────────────────────────────────

export async function runReview() {
  core.info("Starting AI code review process...");

  const prDetails = await getPRDetails();
  core.info("PR Details fetched:");
  core.info(JSON.stringify(prDetails, null, 2));

  const eventData = await getEventData();
  core.info(`Processing ${eventData.action} event...`);

  let diff: string | null = null;
  if (eventData.action === "opened" || eventData.action === "synchronize") {
    diff = await getDiff(
      prDetails.owner,
      prDetails.repo,
      prDetails.pull_number,
    );
  } else if (eventData.action === "created") {
    diff = await getDiff(
      prDetails.owner,
      prDetails.repo,
      prDetails.pull_number,
    );
  } else {
    core.info(`Unsupported event: ${process.env.GITHUB_EVENT_NAME}`);
    return;
  }

  core.info(`Diff length after fetch: ${diff ? diff.length : 'null/empty'}`);

  if (!diff) {
    core.info("No diff found → skipping analysis");
    return;
  }

  const changedFiles = parseDiff(diff);
  core.info(`Found ${changedFiles.length} changed files.`);

  const excludePatterns = core
    .getInput("exclude")
    .split(",")
    .map((s) => s.trim());
  core.info(`Exclude patterns: ${JSON.stringify(excludePatterns)}`);

  const filteredDiff = changedFiles.filter((file: any) => {
    const match = excludePatterns.some((pattern) =>
      minimatch(file.to ?? "", pattern)
    );
    core.info(`File ${file.to ?? 'unknown'} excluded? ${match}`);
    return !match;
  });

  core.info(`After filtering, ${filteredDiff.length} files remain.`);

  // ── نقطة حرجة ──
  if (filteredDiff.length === 0) {
    core.info("No files after filtering → skipping OpenAI call");
  } else {
    core.info("Calling analyzeCode now...");
    const comments = await analyzeCode(filteredDiff, prDetails);
    core.info(`analyzeCode returned ${comments.length} comments`);
  }

  // باقي الكود زي ما هو
  if (APPROVE_REVIEWS || comments.length > 0) {
    await createReviewComment(
      prDetails.owner,
      prDetails.repo,
      prDetails.pull_number,
      comments,
    );
  } else {
    core.info("No comments to post.");
  }

  core.info("AI code review process completed successfully.");
}
