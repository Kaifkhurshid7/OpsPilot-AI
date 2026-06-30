'use client';

import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Users, CheckSquare, DollarSign } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: () => apiClient('/dashboard/kpis'),
    refetchInterval: 60000,
  });

  const kpis = data?.data;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Business overview and key metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard
          title="Active Opportunities"
          value={kpis?.activeOpportunities ?? '—'}
          icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
          loading={isLoading}
        />
        <KpiCard
          title="Pipeline Value"
          value={kpis ? `$${Number(kpis.pipelineValue).toLocaleString()}` : '—'}
          icon={<DollarSign className="w-5 h-5 text-green-600" />}
          loading={isLoading}
        />
        <KpiCard
          title="Pending Follow-ups"
          value={kpis?.pendingFollowUps ?? '—'}
          icon={<CheckSquare className="w-5 h-5 text-orange-600" />}
          loading={isLoading}
        />
        <KpiCard
          title="Total Contacts"
          value={kpis?.totalContacts ?? '—'}
          icon={<Users className="w-5 h-5 text-purple-600" />}
          loading={isLoading}
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        {kpis?.recentActivity?.length > 0 ? (
          <div className="space-y-3">
            {kpis.recentActivity.map((log: any) => (
              <div
                key={log.id}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
              >
                <div>
                  <span className="text-sm font-medium text-gray-900">{log.action}</span>
                  <span className="text-xs text-gray-400 ml-2">by {log.actor}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No recent activity</p>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        {icon}
      </div>
      <div className="text-3xl font-bold text-gray-900">
        {loading ? <div className="h-9 w-20 bg-gray-100 rounded animate-pulse" /> : value}
      </div>
    </div>
  );
}
