'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Play, Zap } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function WorkflowsPage() {
  const [selectedContact, setSelectedContact] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const { data: contactsData } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => apiClient('/contacts'),
  });

  const contacts = contactsData?.data || [];

  const handleRunWorkflow = async () => {
    if (!selectedContact) return;
    setRunning(true);
    setResult(null);

    try {
      const res = await apiClient('/workflows/lead-qualification/run', {
        method: 'POST',
        body: JSON.stringify({ contactId: selectedContact }),
      });
      setResult(res.data);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
        <p className="text-gray-500 mt-1">Automate lead qualification and follow-ups</p>
      </div>

      {/* Lead Qualification Workflow */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Lead Qualification</h2>
            <p className="text-sm text-gray-500">
              AI scores the lead → WhatsApp follow-up → Create task
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Contact</label>
          <select
            value={selectedContact}
            onChange={(e) => setSelectedContact(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Choose a contact...</option>
            {contacts.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone || c.email || 'no contact info'})
              </option>
            ))}
          </select>

          <button
            onClick={handleRunWorkflow}
            disabled={!selectedContact || running}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            <Play className="w-4 h-4" />
            {running ? 'Running...' : 'Run Workflow'}
          </button>

          {result && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Workflow steps */}
      <div className="mt-8 max-w-2xl">
        <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">Workflow Steps</h3>
        <div className="space-y-3">
          {[
            { step: '1', title: 'AI Qualification', desc: 'Gemini scores the lead 0-100' },
            { step: '2', title: 'Branch Decision', desc: 'Score > 80 → continue, else → nurture' },
            { step: '3', title: 'Send WhatsApp', desc: 'AI drafts and sends follow-up message' },
            { step: '4', title: 'Create Task', desc: 'Follow-up task due in 24 hours' },
            { step: '5', title: 'Audit Log', desc: 'Every step recorded for transparency' },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100">
              <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">
                {item.step}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
