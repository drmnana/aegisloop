import OpenAI from "openai";
import type { StepType } from "./types";

export interface AIMessageRequest {
  systemPrompt: string;
  objective: string;
  step: StepType;
  context: string;
}

export interface AIMessageResponse {
  output: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCost: number;
  model: string;
  provider: string;
  latencyMs: number;
}

export interface AIProvider {
  sendMessage(request: AIMessageRequest): Promise<AIMessageResponse>;
  estimateTokens(text: string): number;
  estimateCost(inputTokens: number, outputTokens: number): number;
}

export class MockAIProvider implements AIProvider {
  constructor(private readonly model = "mock-phase-1") {}

  estimateTokens(text: string): number {
    return Math.max(1, Math.ceil(text.length / 4));
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    return Number(((inputTokens + outputTokens) * 0.000001).toFixed(6));
  }

  async sendMessage(request: AIMessageRequest): Promise<AIMessageResponse> {
    const started = Date.now();
    const outputs: Record<StepType, string> = {
      draft: `Draft output for: ${request.objective}`,
      critique: `Critique: clarify the approval criteria and tighten the evidence for "${request.objective}".`,
      revise: `Revised approved-ready output for: ${request.objective}`,
      human_approve: "Human approval is required."
    };
    const inputTokens = this.estimateTokens(`${request.systemPrompt}\n${request.context}\n${request.objective}`);
    const outputTokens = this.estimateTokens(outputs[request.step]);
    return {
      output: outputs[request.step],
      estimatedInputTokens: inputTokens,
      estimatedOutputTokens: outputTokens,
      estimatedCost: this.estimateCost(inputTokens, outputTokens),
      model: this.model,
      provider: "mock",
      latencyMs: Date.now() - started
    };
  }
}

export class OpenAIProvider implements AIProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(apiKey = process.env.OPENAI_API_KEY, model = process.env.OPENAI_MODEL ?? "gpt-4o-mini") {
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required for OpenAIProvider.");
    }
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  estimateTokens(text: string): number {
    return Math.max(1, Math.ceil(text.length / 4));
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    return Number((inputTokens * 0.00000015 + outputTokens * 0.0000006).toFixed(6));
  }

  async sendMessage(request: AIMessageRequest): Promise<AIMessageResponse> {
    const started = Date.now();
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: `Objective:\n${request.objective}\n\nContext:\n${request.context}` }
      ]
    });
    const output = response.choices[0]?.message.content ?? "";
    const estimatedInputTokens = this.estimateTokens(`${request.systemPrompt}\n${request.context}\n${request.objective}`);
    const estimatedOutputTokens = this.estimateTokens(output);
    return {
      output,
      estimatedInputTokens,
      estimatedOutputTokens,
      estimatedCost: this.estimateCost(estimatedInputTokens, estimatedOutputTokens),
      model: this.model,
      provider: "openai",
      latencyMs: Date.now() - started
    };
  }
}
