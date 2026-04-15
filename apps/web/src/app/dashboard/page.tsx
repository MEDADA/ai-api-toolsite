'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { BalanceCard } from '@/components/dashboard/balance-card';
import { RechargeModal } from '@/components/dashboard/recharge-modal';
import { ConsumptionTable } from '@/components/dashboard/consumption-table';
import { TaskHistory } from '@/components/dashboard/task-history';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { LoginModal } from '@/components/login-modal';

type Tab = 'history' | 'balance' | 'favorites';

export default function DashboardPage() {
  const { isLoggedIn, balance, refetchBalance } = useAuth();
  const { success } = useToast();
  const [tab, setTab] = useState<Tab>('history');
  const [showRecharge, setShowRecharge] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [favorites, setFavorites] = useState<Array<{ id: string; task_id: string; task: { outputs: Array<{ url: string; thumbnail_url?: string }> } }>>([]);

  useEffect(() => {
    if (!isLoggedIn) return;
    apiClient.favorites.list()
      .then((res) => setFavorites(res.favorites as typeof favorites))
      .catch(() => setFavorites([]));
  }, [isLoggedIn]);

  const handleFavoriteRemove = async (id: string) => {
    try {
      await apiClient.favorites.remove(id);
      setFavorites((prev) => prev.filter((f) => f.id !== id));
      success('已取消收藏');
    } catch {
      // ignore
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: '#0f0f23' }}>
      <SiteHeader />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
        <h1 style={{ color: '#e2e8f0', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
          📊 用户中心
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 28 }}>
          管理余额、查看消费记录和收藏
        </p>

        {!isLoggedIn ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
            <h2 style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              登录后查看您的创作记录
            </h2>
            <p style={{ color: '#64748b', marginBottom: 24, fontSize: 14 }}>
              登录后可管理余额、查看消费记录和收藏内容
            </p>
            <button
              onClick={() => setShowLogin(true)}
              style={{
                padding: '12px 32px', borderRadius: 10,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', border: 'none', fontSize: 15, fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              立即登录
            </button>
          </div>
        ) : (
          <>
            {/* Balance card */}
            <BalanceCard onRecharge={() => setShowRecharge(true)} />

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {([
                { key: 'history', label: '📋 生成历史' },
                { key: 'balance', label: '💰 充值记录' },
                { key: 'favorites', label: '⭐ 收藏夹' },
              ] as { key: Tab; label: string }[]).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    padding: '10px 20px', border: 'none',
                    borderBottom: `2px solid ${tab === t.key ? '#6366f1' : 'transparent'}`,
                    background: 'transparent', color: tab === t.key ? '#a5b4fc' : '#64748b',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* History */}
            {tab === 'history' && <TaskHistory />}

            {/* Balance records */}
            {tab === 'balance' && <ConsumptionTable />}

            {/* Favorites */}
            {tab === 'favorites' && (
              favorites.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>⭐</div>
                  <p style={{ marginBottom: 16 }}>收藏夹为空</p>
                  <Link href="/image" style={{ color: '#6366f1', textDecoration: 'none', fontSize: 14 }}>
                    去生成图片 →
                  </Link>
                </div>
              ) : (
                <div>
                  <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
                    共 {favorites.length} 个收藏
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                    {favorites.map((f) => {
                      const thumb = f.task?.outputs?.[0]?.thumbnail_url ?? f.task?.outputs?.[0]?.url;
                      return (
                        <div key={f.id} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
                          {thumb ? (
                            <img
                              src={thumb}
                              alt=""
                              style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
                            />
                          ) : (
                            <div style={{ width: '100%', aspectRatio: '1', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                              🖼️
                            </div>
                          )}
                          <button
                            onClick={() => handleFavoriteRemove(f.id)}
                            style={{
                              position: 'absolute', top: 6, right: 6,
                              background: 'rgba(0,0,0,0.6)', color: '#fff',
                              border: 'none', borderRadius: '50%',
                              width: 28, height: 28, cursor: 'pointer',
                              fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </>
        )}
      </div>

      {showRecharge && <RechargeModal onClose={() => setShowRecharge(false)} />}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </main>
  );
}
