'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

const stageColors: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700',
  qualifying: 'bg-blue-50 text-blue-700',
  nurture: 'bg-yellow-50 text-yellow-700',
  won: 'bg-green-50 text-green-700',
  lost: 'bg-red-50 text-red-700',
};

export default function OpportunitiesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => apiClient('/opportunities'),
  });

  const opportunities = data?.data || [];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Opportunities</h1>
        <p className="text-gray-500 mt-1">Track your sales pipeline</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : opportunities.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No opportunities yet</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Title
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Contact
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Value
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Stage
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Score
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {opportunities.map((opp: any) => (
                <tr key={opp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{opp.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{opp.contact?.name || '—'}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    ${Number(opp.value).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${stageColors[opp.stage] || stageColors.new}`}
                    >
                      {opp.stage}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{opp.score ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
