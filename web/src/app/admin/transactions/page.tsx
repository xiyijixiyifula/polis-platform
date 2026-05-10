'use client';

import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Receipt, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Transaction {
  id: string;
  from_user_id: string;
  from_username: string;
  to_user_id: string;
  to_username: string;
  to_space_id: string | null;
  space_title: string | null;
  amount_cents: number;
  tx_type: string;
  status: string;
  provider: string | null;
  created_at: string;
}

const TX_TYPE_LABELS: Record<string, string> = {
  subscription: '订阅付费',
  donation: '打赏',
  purchase: '购买',
  refund: '退款',
  withdraw: '提现',
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  completed: { label: '已完成', color: 'bg-green-100 text-green-700' },
  pending: { label: '处理中', color: 'bg-yellow-100 text-yellow-700' },
  failed: { label: '失败', color: 'bg-red-100 text-red-600' },
  refunded: { label: '已退款', color: 'bg-purple-100 text-purple-600' },
};

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => { fetchTransactions(); }, [page]);

  const fetchTransactions = async () => {
    const token = localStorage.getItem('polis_admin_token');
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/transactions?page=${page}&page_size=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 0) {
        const items = data.data?.items || data.data || [];
        const t = data.data?.total ?? data.pagination?.total ?? items.length;
        setTransactions(items);
        setTotal(t);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const formatAmount = (cents: number) => {
    return `¥${(cents / 100).toFixed(2)}`;
  };

  const totalAmount = transactions.reduce((sum, t) => {
    if (t.status === 'completed') return sum + (t.amount_cents || 0);
    return sum;
  }, 0);

  const completedCount = transactions.filter(t => t.status === 'completed').length;

  const totalPages = Math.max(1, Math.ceil(total / 20));

  if (loading && transactions.length === 0) {
    return <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">交易管理</h1>
          <p className="text-sm text-gray-500 mt-1">平台交易流水记录</p>
        </div>
        <button onClick={fetchTransactions} className="btn-secondary text-sm px-3 py-1.5 inline-flex items-center gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          刷新
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: '交易总数', value: total, icon: Receipt, color: 'text-blue-600 bg-blue-50' },
          { label: '已成交金额', value: formatAmount(totalAmount), icon: DollarSign, color: 'text-green-600 bg-green-50' },
          { label: '已完成笔数', value: completedCount, icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
          { label: '当前页', value: transactions.length, icon: Receipt, color: 'text-orange-600 bg-orange-50' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`rounded-xl border border-gray-200 p-4 ${card.color}`}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <p className="text-sm">{card.label}</p>
              </div>
              <p className="text-2xl font-bold mt-1">{typeof card.value === 'number' ? card.value.toLocaleString() : card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Transactions table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">付款方</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">收款方</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">类型</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">金额</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">支付方式</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">时间</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  暂无交易记录
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const statusInfo = STATUS_MAP[tx.status] || STATUS_MAP.pending;
                return (
                  <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <span className="font-medium text-gray-900">{tx.from_username || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>
                        {tx.to_username ? (
                          <span className="font-medium text-gray-900">{tx.to_username}</span>
                        ) : tx.space_title ? (
                          <span className="font-medium text-gray-900">{tx.space_title}</span>
                        ) : '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                        {tx.tx_type === 'subscription' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {TX_TYPE_LABELS[tx.tx_type] || tx.tx_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono font-medium text-gray-900">
                      {formatAmount(tx.amount_cents || 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {tx.provider || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(tx.created_at)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
        <span>共 {total} 条记录</span>
        <div className="flex gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))}
            className="btn-secondary text-xs px-3 py-1" disabled={page <= 1}>
            上一页
          </button>
          <span className="px-3 py-1">第 {page} / {totalPages} 页</span>
          <button onClick={() => setPage(page + 1)}
            className="btn-secondary text-xs px-3 py-1" disabled={page >= totalPages}>
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}
