import * as core from "@actions/core";
import OpenAI from "openai";
import { OPENAI_API_KEY, OPENAI_API_MODEL, RESPONSE_TOKENS } from "./config";
import { AICommentResponse } from "./types";

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
  core.info("Sending request to OpenAI API...");

  const queryConfig: QueryConfig = {
    model: OPENAI_API_MODEL,
    temperature: 0.2,
    max_tokens: RESPONSE_TOKENS,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  };

  try {
    const response = await openai.chat.completions.create({
      ...queryConfig,
      messages: [
        {
          role: "system",
          content: prompt,
        },
      ],
    });

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
    core.error("Error communicating with OpenAI:", error);
    if (error?.response) {
      core.error("Response Data:", error.response.data);
      core.error("Response Status:", error.response.status);
      core.error("Response Headers:", error.response.headers);
    }
    if (error?.config) {
      core.error("Config:", error.config);
    }
    throw error;
  }
}
