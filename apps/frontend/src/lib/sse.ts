const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface SSEEvent {
  type: 'text' | 'tool_start' | 'tool_result' | 'done' | 'error';
  content?: string;
  tool?: string;
  result?: any;
  conversationId?: string;
  explanation?: string;
  message?: string;
}

/**
 * Stream AI chat via SSE (POST with cookie auth)
 */
export async function streamChat(
  message: string,
  conversationId: string | null,
  onEvent: (event: SSEEvent) => void,
): Promise<void> {
  const response = await fetch(`${API_URL}/ai/chat`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationId }),
  });

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response stream');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event: SSEEvent = JSON.parse(line.slice(6));
          onEvent(event);
        } catch {
          // Skip malformed events
        }
      }
    }
  }
}
