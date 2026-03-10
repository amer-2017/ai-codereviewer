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

export async function runReview() {
  core.info("Starting AI code review process...");
  const prDetails = await getPRDetails();
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

  if (!diff) {
    core.info("No diff found");
    return;
  }

  const changedFiles = parseDiff(diff);
  core.info(`Found ${changedFiles.length} changed files.`);

  const excludePatterns = core
    .getInput("exclude")
    .split(",")
    .map((s) => s.trim());
  const filteredDiff = changedFiles.filter((file: any) => {
    return !excludePatterns.some((pattern) =>
      minimatch(file.to ?? "", pattern),
    );
  });

  core.info(`After filtering, ${filteredDiff.length} files remain.`);

  const comments = await analyzeCode(filteredDiff, prDetails);
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

// Helper to fetch PR base/head SHA (if needed)
async function getDiffDetails(prDetails: PRDetails) {
  const { owner, repo, pull_number } = prDetails;
  const { Octokit } = await import("@octokit/rest");
  const octokit = new Octokit();
  const prResponse = await octokit.pulls.get({
    owner,
    repo,
    pull_number,
  });

  return {
    baseSha: prResponse.data.base.sha,
    headSha: prResponse.data.head.sha,
  };
}
