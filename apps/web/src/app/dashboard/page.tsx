'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { MetricCard } from '@/components/metric-card';
import styles from './page.module.css';

type Tab = 'history' | 'balance' | 'favorites';

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>('history');
  const [balance, setBalance] = useState({ available: 0, frozen: 0, total_spent: 0 });
  const [tasks, setTasks] = useState<Array<{
    id: string; model_slug: string; task_type: string;
    status: string; total_cost: number; thumbnail?: string; created_at: string;
  }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // TODO: Load real data from apiClient
    // const loadData = async () => { ... }
    setBalance({ available: 500, frozen: 0, total_spent: 50 });
    setTasks([
      {
        id: 'task_demo_1',
        model_slug: 'flux-2-schnell',
        task_type: 'IMAGE',
        status: 'SUCCEEDED',
        total_cost: 50,
        thumbnail: 'https://picsum.photos/200',
        created_at: new Date().toISOString(),
      },
      {
        id: 'task_demo_2',
        model_slug: 'seedance-2-0',
        task_type: 'VIDEO',
        status: 'PROCESSING',
        total_cost: 1500,
        thumbnail: undefined,
        created_at: new Date(Date.now() - 60000).toISOString(),
      },
    ]);
  }, []);

  const statusLabel: Record<string, string> = {
    SUCCEEDED: '✅ 成功',
    PROCESSING: '⏳ 处理中',
    FAILED: '❌ 失败',
    QUEUED: '📋 排队中',
    CREATED: '🆕 已创建',
  };

  const typeLabel: Record<string, string> = {
    IMAGE: '🎨 图片',
    VIDEO: '🎬 视频',
    TTS: '🎙️ TTS',
    ASR: '📝 ASR',
    VOICE_CLONE: '🔊 声音克隆',
  };

  return (
    <main className={styles.main}>
      <SiteHeader />

      <div className={styles.container}>
        {/* Balance Overview */}
        <section className={styles.balanceSection}>
          <div className={styles.balanceCard}>
            <div className={styles.balanceMain}>
              <span className={styles.balanceLabel}>可用余额</span>
              <span className={styles.balanceValue}>¥{(balance.available / 100).toFixed(2)}</span>
            </div>
            <div className={styles.balanceActions}>
              <button className={styles.rechargeBtn}>充值</button>
              <Link href="/image" className={styles.createBtn}>开始创作</Link>
            </div>
          </div>
          <div className={styles.metricsRow}>
            <MetricCard label="冻结中" value={`¥${(balance.frozen / 100).toFixed(2)}`} color="gray" />
            <MetricCard label="已消费" value={`¥${(balance.total_spent / 100).toFixed(2)}`} color="purple" />
            <MetricCard label="我的模型" value="4" color="blue" icon="🤖" />
          </div>
        </section>

        {/* Tabs */}
        <div className={styles.tabs}>
          {(['history', 'balance', 'favorites'] as Tab[]).map((t) => (
            <button
              key={t}
              className={`${styles.tab} ${tab === t ? styles.activeTab : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'history' ? '📋 生成历史' : t === 'balance' ? '💰 充值记录' : '⭐ 收藏夹'}
            </button>
          ))}
        </div>

        {/* History */}
        {tab === 'history' && (
          <div className={styles.taskList}>
            {tasks.length === 0 ? (
              <div className={styles.empty}>
                <p>还没有创作记录</p>
                <Link href="/image" className={styles.emptyLink}>去生成第一张图片 →</Link>
              </div>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className={styles.taskItem}>
                  {task.thumbnail ? (
                    <img src={task.thumbnail} alt="" className={styles.taskThumb} />
                  ) : (
                    <div className={styles.taskThumbPlaceholder}>
                      {typeLabel[task.task_type]?.charAt(0) ?? '?'}
                    </div>
                  )}
                  <div className={styles.taskInfo}>
                    <span className={styles.taskName}>{task.model_slug}</span>
                    <span className={styles.taskMeta}>
                      {typeLabel[task.task_type]} · ¥{(task.total_cost / 100).toFixed(2)}
                    </span>
                    <span className={styles.taskTime}>
                      {new Date(task.created_at).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <span className={styles.taskStatus}>
                    {statusLabel[task.status] ?? task.status}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Balance Records */}
        {tab === 'balance' && (
          <div className={styles.empty}>
            <p>充值记录</p>
            <Link href="/image" className={styles.emptyLink}>去充值 →</Link>
          </div>
        )}

        {/* Favorites */}
        {tab === 'favorites' && (
          <div className={styles.empty}>
            <p>收藏夹为空</p>
            <Link href="/image" className={styles.emptyLink}>去收藏 →</Link>
          </div>
        )}
      </div>
    </main>
  );
}
