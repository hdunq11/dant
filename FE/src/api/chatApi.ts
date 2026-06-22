import { api, getApiErrorMessage } from './client';

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export async function sendChatMessage(messages: ChatMessage[]): Promise<string> {
  try {
    const res = await api.post<{ reply: string }>('api/chatbot/message/', { messages });
    return res.data.reply;
  } catch (err) {
    throw new Error(getApiErrorMessage(err, 'Không gửi được tin nhắn'));
  }
}
