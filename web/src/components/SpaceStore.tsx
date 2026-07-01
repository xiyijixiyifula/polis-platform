'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ShoppingBag, Plus, Package, Tag, RefreshCw, ShoppingCart, Eye, Clock } from 'lucide-react';
import { formatCount, formatDate } from '@/lib/utils';

interface Product {
  id: string;
  title: string;
  description?: string;
  price_cents: number;
  currency: string;
  stock: number;
  created_at?: string;
  updated_at?: string;
  seller_id?: string;
  space_id?: string;
}

interface Order {
  id: string;
  product_id: string;
  buyer_id: string;
  status: string;
  price_cents: number;
  created_at?: string;
}

export default function SpaceStore({ namespace, isOwner }: { namespace: string; isOwner?: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'products' | 'orders'>('products');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('1');
  const [creating, setCreating] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/spaces/${namespace}/store/products`);
      const data = await res.json();
      if (data.code === 0) {
        setProducts(Array.isArray(data.data) ? data.data : data.data?.items || []);
      }
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [namespace]);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/spaces/${namespace}/store/orders`);
      const data = await res.json();
      if (data.code === 0) {
        setOrders(Array.isArray(data.data) ? data.data : data.data?.items || []);
      }
    } catch (e) {
      console.error('Failed to load store orders:', e);
    }
  }, [namespace]);

  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, [fetchProducts, fetchOrders]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newPrice) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/spaces/${namespace}/store/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim(),
          price_cents: Math.round(parseFloat(newPrice) * 100),
          stock: parseInt(newStock) || 1,
        }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setShowCreate(false);
        setNewTitle('');
        setNewDesc('');
        setNewPrice('');
        setNewStock('1');
        fetchProducts();
      } else {
        setError(data.message || '创建商品失败');
      }
    } catch (e: any) {
      setError(e.message || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const formatPrice = (cents: number, currency: string = 'CNY') => {
    const amount = cents / 100;
    if (currency === 'CNY') return `¥${amount.toFixed(2)}`;
    return `${currency} ${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="glass-card py-12 text-center text-gray-400 animate-pulse">
        <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>加载商品列表...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary-600" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">社区商城</h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { fetchProducts(); fetchOrders(); }}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="刷新">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 mb-4">
        {[
          { key: 'products' as const, label: '商品', icon: <Package className="h-3.5 w-3.5" /> },
          { key: 'orders' as const, label: '订单', icon: <ShoppingCart className="h-3.5 w-3.5" /> },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              tab === t.key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
        {isOwner && (
          <button onClick={() => setShowCreate(!showCreate)}
            className="ml-auto btn-primary text-xs px-3 py-1.5 gap-1 flex items-center">
            <Plus className="h-3.5 w-3.5" /> 添加商品
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</div>
      )}

      {showCreate && (
        <div className="glass-card p-4 mb-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">添加新商品</h4>
          <div className="space-y-2">
            <input type="text" placeholder="商品名称"
              value={newTitle} onChange={e => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
            <textarea placeholder="商品描述（可选）" value={newDesc}
              onChange={e => setNewDesc(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
            <div className="flex gap-2">
              <input type="number" placeholder="价格" step="0.01"
                value={newPrice} onChange={e => setNewPrice(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
              <input type="number" placeholder="库存" min="1"
                value={newStock} onChange={e => setNewStock(e.target.value)}
                className="w-24 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleCreate} disabled={creating || !newTitle.trim() || !newPrice}
                className="btn-primary text-xs px-4 py-1.5">{creating ? '创建中...' : '添加商品'}</button>
              <button onClick={() => setShowCreate(false)}
                className="btn-secondary text-xs px-4 py-1.5">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* Products */}
      {tab === 'products' && (
        products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.map(product => (
              <div key={product.id}
                className="glass-card p-4 flex flex-col hover:border-primary-400 dark:hover:border-primary-600 transition-all duration-200 group">
                {/* Product icon/placeholder */}
                <div className="h-32 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center mb-3">
                  <Package className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1 mb-1 group-hover:text-primary-600 transition-colors">
                  {product.title}
                </h4>
                {product.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{product.description}</p>
                )}
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                    {formatPrice(product.price_cents, product.currency)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    product.stock > 0
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {product.stock > 0 ? `库存 ${product.stock}` : '已售罄'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-400 dark:text-gray-500">
                  {product.created_at && <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {formatDate(product.created_at)}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card py-12 text-center text-gray-400 dark:text-gray-500 rounded-2xl">
            <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-base font-medium text-gray-500 dark:text-gray-400">🛍️ 暂无商品</p>
            <p className="text-sm mt-1">商家尚未上架任何商品</p>
          </div>
        )
      )}

      {/* Orders */}
      {tab === 'orders' && (
        orders.length > 0 ? (
          <div className="space-y-2">
            {orders.map(order => (
              <div key={order.id} className="glass-card p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                    <ShoppingCart className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">订单 #{order.id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {formatPrice(order.price_cents)} · {order.created_at ? formatDate(order.created_at) : ''}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  order.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  order.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {{'completed': '已完成', 'pending': '待付款', 'cancelled': '已取消'}[order.status] || order.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card py-12 text-center text-gray-400 dark:text-gray-500 rounded-2xl">
            <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-base font-medium text-gray-500 dark:text-gray-400">📦 暂无订单</p>
            <p className="text-sm mt-1">🛒 还没有人购买商品</p>
          </div>
        )
      )}
    </div>
  );
}
