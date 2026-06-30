'use client';

import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { MessageSquare, Mail, Phone } from 'lucide-react';

const channelIcons: Record<string, any> = {
  whatsapp: MessageSquare,
  email: Mail,
  call: Phone,
};

const sentimentColors: Record<string, string> = {
  positive: 'text-green-600 bg-green-50',
  neutral: 'text-gray-600 bg-gray-50',
  negative: 'text-red-600 bg-red-50',
};

export default function InboxPage() {
  const searchParams = useSearchParams();
  const contactId = searchParams.get('contactId');

  const { data, isLoading } = useQuery({
    queryKey: ['timeline', contactId],
    queryFn: () => apiClient(`/inbox/${contactId}/timeline`),
    enabled: !!contactId,
    refetchInterval: 10000,
  });

  const timeline = data?.data || [];
  const contact = data?.contact;

  if (!contactId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Inbox</h1>
        <p className="text-gray-500">
          Select a contact from the CRM to view their unified timeline
        </p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {contact?.name || 'Contact'} — Timeline
        </h1>
        <p className="text-gray-500 mt-1">
          Unified WhatsApp, Email & Call history with AI analysis
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading timeline...</div>
        ) : timeline.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No messages yet</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {timeline.map((entry: any) => {
              const Icon = channelIcons[entry.channel] || MessageSquare;
              return (
                <div key={entry.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-500 uppercase">
                          {entry.channel}
                        </span>
                        <span className="text-xs text-gray-300">•</span>
                        <span className="text-xs text-gray-400">{entry.direction}</span>
                        <span className="text-xs text-gray-300">•</span>
                        <span className="text-xs text-gray-400">
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800">{entry.body}</p>
                      {entry.aiSummary && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            Summary: {entry.aiSummary}
                          </span>
                          {entry.sentiment && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${sentimentColors[entry.sentiment] || ''}`}
                            >
                              {entry.sentiment}
                            </span>
                          )}
                          {entry.intent && (
                            <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                              {entry.intent}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
