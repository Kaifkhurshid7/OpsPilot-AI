'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Wrench } from 'lucide-react';
import { streamChat, SSEEvent } from '@/lib/sse';
import { MessageBubble } from './MessageBubble';
import { ExplanationTag } from './ExplanationTag';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: Array<{ name: string; result: any }>;
  explanation?: string;
  isStreaming?: boolean;
}

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    };

    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      toolCalls: [],
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput('');
    setIsLoading(true);

    try {
      await streamChat(userMessage.content, conversationId, (event: SSEEvent) => {
        switch (event.type) {
          case 'text':
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessage.id
                  ? { ...m, content: m.content + (event.content || '') }
                  : m,
              ),
            );
            break;

          case 'tool_start':
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessage.id
                  ? {
                      ...m,
                      toolCalls: [...(m.toolCalls || []), { name: event.tool!, result: null }],
                    }
                  : m,
              ),
            );
            break;

          case 'tool_result':
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessage.id
                  ? {
                      ...m,
                      toolCalls: m.toolCalls?.map((tc) =>
                        tc.name === event.tool ? { ...tc, result: event.result } : tc,
                      ),
                    }
                  : m,
              ),
            );
            break;

          case 'done':
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessage.id
                  ? { ...m, isStreaming: false, explanation: event.explanation }
                  : m,
              ),
            );
            if (event.conversationId) {
              setConversationId(event.conversationId);
            }
            break;

          case 'error':
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessage.id
                  ? { ...m, content: `Error: ${event.message}`, isStreaming: false }
                  : m,
              ),
            );
            break;
        }
      });
    } catch (error: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessage.id
            ? { ...m, content: `Error: ${error.message}`, isStreaming: false }
            : m,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="w-12 h-12 text-blue-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-700">How can I help you today?</h3>
            <p className="text-sm text-gray-400 mt-1 max-w-md">
              Ask me to search contacts, create tasks, update deals, send WhatsApp messages, or check
              your business metrics.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id}>
            <MessageBubble message={msg} />
            {msg.toolCalls && msg.toolCalls.length > 0 && (
              <div className="ml-10 mt-1 space-y-1">
                {msg.toolCalls.map((tc, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg w-fit"
                  >
                    <Wrench className="w-3 h-3" />
                    <span className="font-medium">{tc.name}</span>
                    {tc.result?.success && <span className="text-green-600">✓</span>}
                  </div>
                ))}
              </div>
            )}
            {msg.explanation && <ExplanationTag explanation={msg.explanation} />}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-6 py-4">
        <div className="flex items-end gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask OpsPilot anything..."
            rows={1}
            className="flex-1 resize-none px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
