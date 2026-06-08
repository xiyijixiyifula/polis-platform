'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Users, FileText, Calendar } from 'lucide-react';
import { getAdminToken } from '@/lib/api';

interface DailyCount {
  date: string;
  count: number;
}

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(7);
  const [userData, setUserData] = useState<DailyCount[]>([]);
  const [postData, setPostData] = useState<DailyCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [days]);

  const fetchData = async () => {
    const token = getAdminToken();
    setLoading(true);
    try {
      const [userRes, postRes] = await Promise.all([
        fetch(`/api/admin/analytics/users?days=${days}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/admin/analytics/posts?days=${days}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [userJson, postJson] = await Promise.all([userRes.json(), postRes.json()]);
      if (userJson.code === 0) setUserData(userJson.data || []);
      if (postJson.code === 0) setPostData(postJson.data || []);
    } catch (e) { if (process.env.NODE_ENV === 'development') console.error('[Admin Analytics]', e); }
    finally { setLoading(false); }
  };

  const totalUsers = userData.reduce((s, d) => s + d.count, 0);
  const totalPosts = postData.reduce((s, d) => s + d.count, 0);
  const maxUserVal = Math.max(...userData.map(d => d.count), 1);
  const maxPostVal = Math.max(...postData.map(d => d.count), 1);

  const BarChart = ({ data, maxVal, color, label }: { data: DailyCount[]; maxVal: number; color: string; label: string }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">{label}</h3>
      <div className="flex items-end gap-1 h-48">
        {data.map((d) => (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
              {d.count > 0 ? d.count : ''}
            </span>
            <div
              className={`w-full rounded-t ${color} transition-all duration-300 min-h-[2px]`}
              style={{ height: `${Math.max((d.count / maxVal) * 90, 1)}%` }}
              title={`${d.date.slice(5)}: ${d.count}`}
            />
            <span className="text-[9px] text-gray-400 dark:text-gray-500 mt-1">
              {d.date.slice(5)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500"><span className="inline-block h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2 align-middle"></span>加载中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">数据分析</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">平台用户和内容增长趋势</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="input-field text-sm py-1.5"
          >
            <option value={7}>最近 7 天</option>
            <option value={14}>最近 14 天</option>
            <option value={30}>最近 30 天</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">新增用户</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalUsers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">新增帖子</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalPosts}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <BarChart data={userData} maxVal={maxUserVal} color="bg-blue-500 dark:bg-blue-400" label="每日新增用户" />
        <BarChart data={postData} maxVal={maxPostVal} color="bg-green-500 dark:bg-green-400" label="每日新增帖子" />
      </div>

      {/* Data table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">日期</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">新增用户</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">新增帖子</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">趋势</th>
            </tr>
          </thead>
          <tbody>
            {userData.map((d, i) => {
              const postCount = postData[i]?.count || 0;
              const hasData = d.count > 0 || postCount > 0;
              return (
                <tr key={d.date} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-gray-100">{d.date}</td>
                  <td className="px-4 py-2.5 text-sm text-right text-gray-600 dark:text-gray-400 font-mono">{d.count}</td>
                  <td className="px-4 py-2.5 text-sm text-right text-gray-600 dark:text-gray-400 font-mono">{postCount}</td>
                  <td className="px-4 py-2.5 text-right">
                    {hasData ? (
                      <TrendingUp className="h-4 w-4 text-green-500 inline" />
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600 text-xs">–</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
