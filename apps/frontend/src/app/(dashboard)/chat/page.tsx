'use client';

import { ChatWindow } from '@/components/chat/ChatWindow';

export default function ChatPage() {
  return (
    <div className="h-screen flex flex-col">
      <div className="border-b border-gray-200 px-6 py-4 bg-white">
        <h1 className="text-lg font-semibold text-gray-900">AI Assistant</h1>
        <p className="text-sm text-gray-500">
          Chat with OpsPilot to manage contacts, tasks, deals, and more
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatWindow />
      </div>
    </div>
  );
}
