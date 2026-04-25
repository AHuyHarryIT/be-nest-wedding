import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

type GenerateChatReplyInput = {
  customerName?: string;
  latestMessage: string;
  recentMessages: Array<{
    senderType: 'CUSTOMER' | 'STAFF' | 'AI';
    content: string;
  }>;
};

@Injectable()
export class AiService {
  private readonly model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
  private readonly anthropicBaseUrl = process.env.ANTHROPIC_BASE_URL || undefined;
  private readonly client = process.env.ANTHROPIC_API_KEY
    ? new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
        ...(this.anthropicBaseUrl ? { baseURL: this.anthropicBaseUrl } : {}),
      })
    : null;

  async generateChatReply(input: GenerateChatReplyInput): Promise<string> {
    if (!this.client) {
      return 'Thanks for your message. Our assistant is temporarily unavailable right now, but we have received your question and will follow up soon.';
    }

    const transcript = input.recentMessages
      .slice(-10)
      .map((entry) => `${entry.senderType}: ${entry.content}`)
      .join('\n');

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 240,
      system:
        'You are Studio HaMy wedding assistant. Keep replies concise, friendly, and practical. ' +
        'If details are missing, ask one clear follow-up question. Do not invent pricing or guarantees.',
      messages: [
        {
          role: 'user',
          content:
            `Customer name: ${input.customerName || 'Customer'}\n` +
            `Recent chat:\n${transcript || '(no prior messages)'}\n\n` +
            `Latest customer message:\n${input.latestMessage}`,
        },
      ],
    });

    const reply = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('\n')
      .trim();

    if (!reply) {
      return 'Thanks for your message. Could you share a bit more detail so I can help you better?';
    }

    return reply;
  }
}
