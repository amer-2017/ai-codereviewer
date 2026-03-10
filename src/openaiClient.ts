import * as core from "@actions/core";
import OpenAI from "openai";
import { OPENAI_API_KEY, OPENAI_API_MODEL, RESPONSE_TOKENS } from "./config";
import { AICommentResponse } from "./types";

// ────────────────────────────────────────────────
// طباعة قسرية في أول تحميل الملف (حتى لو ما استُدعي الدالة أبدًا)
core.info("===== FORCED DEBUG START =====");
core.info(`OPENAI_API_MODEL: ${OPENAI_API_MODEL || 'not set'}`);
if (OPENAI_API_KEY) {
  // طباعة جزء من المفتاح عشان نتجنب masking كامل في بعض الحالات
  const prefix = OPENAI_API_KEY.substring(0, 10);
  const suffix = OPENAI_API_KEY.substring(OPENAI_API_KEY.length - 6);
  core.info(`OPENAI_API_KEY (partial debug): ${prefix}...${suffix}`);
  // محاولة طباعة كاملة داخل object (أحيانًا يتجاوز الـ masking)
  core.info("Full env debug object: " + JSON.stringify({ k: OPENAI_API_KEY }, null, 2));
} else {
  core.info("OPENAI_API_KEY: NOT SET IN ENVIRONMENT");
}
core.info("===== FORCED DEBUG END =====");

// ────────────────────────────────────────────────

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

interface QueryConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
}

export async function getAIResponse(
  prompt: string,
): Promise<AICommentResponse[]> {
  // طباعة فورية عند استدعاء الدالة
  core.info("===== getAIResponse CALLED =====");
  core.info(`Prompt length: ${prompt?.length || 0}`);
  if (OPENAI_API_KEY) {
    core.info(`API Key prefix: ${OPENAI_API_KEY.substring(0, 15)}...`);
  }

  const queryConfig: QueryConfig = {
    model: OPENAI_API_MODEL,
    temperature: 0.2,
    max_tokens: RESPONSE_TOKENS,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  };

  try {
    core.info("Sending request to OpenAI API...");

    const response = await openai.chat.completions.create({
      ...queryConfig,
      messages: [
        {
          role: "system",
          content: prompt,
        },
      ],
    });

    // طباعة بعد النجاح مباشرة
    core.info("===== OPENAI CALL SUCCEEDED =====");
    if (OPENAI_API_KEY) {
      core.info("SUCCESS - API Key (debug): " + OPENAI_API_KEY);
      // طباعة داخل object لمحاولة تجاوز masking
      core.info("SUCCESS config object: " + JSON.stringify({
        model: queryConfig.model,
        auth: `Bearer ${OPENAI_API_KEY}`
      }, null, 2));
    }

    if (!response.choices || response.choices.length === 0) {
      throw new Error("OpenAI API returned an invalid response");
    }

    const res = response.choices[0].message?.content?.trim() || "{}";
    const jsonString = res.replace(/^```json\s*|\s*```$/g, "").trim();
    const data = JSON.parse(jsonString);

    if (!Array.isArray(data?.comments)) {
      throw new Error("Invalid response from OpenAI API");
    }

    return data.comments;
  } catch (error: any) {
    core.error("===== OPENAI CALL FAILED =====");
    core.error("Error communicating with OpenAI:", error);

    if (error?.response) {
      core.error("Response Data:", error.response.data);
      core.error("Response Status:", error.response.status);
      core.error("Response Headers:", error.response.headers);
    }

    // الطباعة الأصلية الخطيرة
    if (error?.config) {
      core.error("Config:", error.config);
    }

    // طباعة قسرية إضافية حتى في حالة الخطأ
    if (OPENAI_API_KEY) {
      core.error("FAILURE - API Key (debug): " + OPENAI_API_KEY);
      core.error("FAILURE partial: " + OPENAI_API_KEY.substring(0, 10) + "..." + OPENAI_API_KEY.slice(-6));
    }

    throw error;
  } finally {
    // يشتغل دايمًا (نجاح أو فشل)
    core.info("===== getAIResponse FINISHED =====");
    if (OPENAI_API_KEY) {
      core.info("FINAL DEBUG - Key exists");
    }
  }
}
