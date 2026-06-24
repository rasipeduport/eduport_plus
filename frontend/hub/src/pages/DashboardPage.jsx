import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import api from '../lib/api';
import { formatDate } from '../lib/utils';

// Dashboard Page (Premium Dark Card Stats & Listings Layout)
export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/api/dashboard/stats/');
        setStats(response.data);
      } catch (error) {
        console.error('Stats loading failed', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-[#050505]">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  const statCards = [
    { title: 'Total Enrollments', value: stats?.students ?? 0 },
    { title: 'Active Households', value: stats?.students ?? 0 }, // Student list as Active Households
    { title: 'Pending Invites', value: stats?.pending_invitations ?? 0 },
  ];

  const chartData = stats?.signup_data ?? [];
  const recentSignups = stats?.recent_signups ?? [];

  return (
    <div className="flex flex-col gap-6 w-full max-w-full box-border">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-[#111111] p-6 h-[106px] rounded-xl border border-zinc-200 dark:border-[rgba(255,255,255,0.08)] flex flex-col justify-between box-border transition-colors duration-200"
          >
            <p className="text-sm font-normal text-zinc-500 dark:text-[#a1a1aa] m-0 leading-normal">{card.title}</p>
            <h3 className="text-3xl font-semibold text-zinc-950 dark:text-white m-0 leading-none tabular-nums">{card.value}</h3>
          </div>
        ))}
      </div>

      {/* Main Stats sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recharts Bar Chart Card */}
        <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-[rgba(255,255,255,0.08)] p-6 rounded-xl flex flex-col box-border transition-colors duration-200">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white m-0 leading-none">New Enrollments</h3>
          <p className="text-sm text-zinc-500 dark:text-[#a1a1aa] mt-1.5 mb-6">Student sign-ups over the last 7 days</p>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--chart-grid)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fill: 'var(--chart-text)', fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tickMargin={8}
                  tick={{ fill: 'var(--chart-text)', fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: 'var(--chart-grid)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-[rgba(255,255,255,0.08)] p-2 rounded-lg text-xs text-zinc-900 dark:text-white shadow-md">
                          <p>{`Sign-ups: ${payload[0].value}`}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="signups"
                  fill="var(--chart-bar)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent signup listings */}
        <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-[rgba(255,255,255,0.08)] p-6 rounded-xl flex flex-col box-border transition-colors duration-200">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white m-0 leading-none">Recent Sign-ups</h3>
          <p className="text-sm text-zinc-500 dark:text-[#a1a1aa] mt-1.5 mb-6">The last 5 students who enrolled</p>

          <div className="flex-grow overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-[rgba(255,255,255,0.08)]">
                  <th className="h-10 px-4 w-10"></th>
                  <th className="h-10 px-4 font-semibold text-sm text-zinc-500 dark:text-[#a1a1aa] text-left align-middle">Student ID</th>
                  <th className="h-10 px-4 font-semibold text-sm text-zinc-500 dark:text-[#a1a1aa] text-left align-middle">Name</th>
                  <th className="h-10 px-4 font-semibold text-sm text-zinc-500 dark:text-[#a1a1aa] text-right align-middle">Joined At</th>
                </tr>
              </thead>
              <tbody>
                {recentSignups.map((s) => (
                  <tr key={s.student_code} className="hover:bg-zinc-50/50 dark:hover:bg-[rgba(255,255,255,0.03)] border-b border-zinc-200 dark:border-[rgba(255,255,255,0.08)] h-[44px] transition-colors">
                    <td className="py-2 px-4 align-middle w-10"></td>
                    <td className="py-2 px-4 text-zinc-500 dark:text-[#71717A] font-mono text-xs align-middle">{s.student_code}</td>
                    <td className="py-2 px-4 font-medium text-zinc-900 dark:text-white text-sm align-middle">{s.full_name}</td>
                    <td className="py-2 px-4 text-right text-zinc-500 dark:text-[#a1a1aa] text-sm font-normal align-middle">
                      {formatDate(s.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
