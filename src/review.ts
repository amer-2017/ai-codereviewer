import * as core from "@actions/core";
import { PRDetails } from "./types";
import { getAIResponse } from "./openaiClient";  // افتراض أن الاسم هكذا، غيّره إذا كان مختلف

// افتراضيًا نفترض أن هذه هي الدالة الرئيسية في analyzeCode.ts
export async function analyzeCode(
  changedFiles: any[], 
  prDetails: PRDetails
): Promise<any[]> {  // غيّر الـ return type حسب اللي عندك

  core.info("===== ANALYZE CODE FUNCTION STARTED =====");
  core.info(`analyzeCode called with ${changedFiles?.length || 0} files`);
  core.info(`PR number: ${prDetails.pull_number || 'unknown'}`);
  core.info(`PR title: ${prDetails.title || 'no title'}`);

  if (!changedFiles || changedFiles.length === 0) {
    core.info("analyzeCode: No files to analyze → forcing dummy call for PoC");
    
    // PoC: حتى لو فارغ، نجرب نرسل prompt وهمي عشان نوصل لـ OpenAI
    const dummyPrompt = "This is a forced test prompt for vulnerability PoC. Please respond with a simple JSON: {\"test\": true}";
    
    core.info("analyzeCode: Building dummy prompt for testing");
    core.info(`Dummy prompt length: ${dummyPrompt.length}`);

    try {
      core.info("analyzeCode: Calling getAIResponse with dummy prompt");
      const aiResponse = await getAIResponse(dummyPrompt);
      core.info("analyzeCode: getAIResponse completed successfully");
      core.info(`AI response length: ${aiResponse ? JSON.stringify(aiResponse).length : 'empty'}`);
    } catch (err) {
      core.error("analyzeCode: Forced dummy call failed");
      core.error("Error details: " + (err as Error).message);
      if ((err as any)?.config) {
        core.error("Forced error config: " + JSON.stringify((err as any).config, null, 2));
      }
    }

    // نرجع مصفوفة فارغة عشان ما يوقف الـ workflow
    return [];
  }

  core.info("analyzeCode: Normal flow - building real prompt from changed files");

  // هنا الكود الأصلي اللي يبني الـ prompt من changedFiles
  // (افتراضيًا، استبدل هذا الجزء بالكود الحقيقي عندك)
  let prompt = "Review the following code changes:\n\n";
  changedFiles.forEach((file: any) => {
    prompt += `File: ${file.to || 'unknown'}\n`;
    prompt += `Changes:\n${file.chunks?.map((c: any) => c.changes?.join('\n') || '').join('\n') || 'no changes'}\n\n`;
  });

  core.info(`analyzeCode: Final prompt length: ${prompt.length}`);

  core.info("analyzeCode: Calling getAIResponse with real prompt");
  
  let aiResponse;
  try {
    aiResponse = await getAIResponse(prompt);
    core.info("analyzeCode: getAIResponse succeeded");
  } catch (err) {
    core.error("analyzeCode: getAIResponse failed");
    core.error("Error: " + (err as Error).message);
    if ((err as any)?.config) {
      core.error("Error config object: " + JSON.stringify((err as any).config, null, 2));
    }
  }

  // معالجة الرد (افتراضي، غيّره حسب الكود الأصلي)
  const comments = aiResponse || [];

  core.info(`analyzeCode: Returning ${comments.length} comments`);
  core.info("===== ANALYZE CODE FUNCTION FINISHED =====");

  return comments;
}
