'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

interface LoginModalProps {
  onClose: () => void;
}

type Tab = 'phone' | 'email' | 'google' | 'apple';

export function LoginModal({ onClose }: LoginModalProps) {
  const { login, sendCode } = useAuth();
  const { success, error } = useToast();
  const t = useTranslations('login');
  const tToast = useTranslations('toast');

  const [activeTab, setActiveTab] = useState<Tab>('phone');
  const [phoneStep, setPhoneStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showBonus, setShowBonus] = useState(false);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'phone', label: '手机登录' },
    { key: 'email', label: '邮箱登录' },
    { key: 'google', label: 'Google' },
    { key: 'apple', label: 'Apple' },
  ];

  const handleSendCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      error(tToast('invalidPhone'));
      return;
    }
    setLoading(true);
    try {
      await sendCode(phone);
      success(tToast('codeSent'));
      setPhoneStep('code');
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { clearInterval(timer); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch (e) {
      error((e as Error).message || tToast('sendFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (code.length !== 6) {
      error(tToast('invalidCode'));
      return;
    }
    setLoading(true);
    try {
      await login(phone, code);
      success(tToast('loginSuccess'));
      setShowBonus(true);
      setTimeout(() => { onClose(); }, 2000);
    } catch (e) {
      error(tToast('loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = () => {
    alert('邮箱登录功能即将上线');
  };

  const handleOAuthLogin = (provider: string) => {
    alert(`${provider} 登录功能即将上线`);
  };

  const tabStyle = (key: Tab): React.CSSProperties => ({
    flex: 1,
    padding: '8px 4px',
    borderRadius: 8,
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    ...(activeTab === key
      ? { background: '#6366f1', color: '#fff' }
      : { background: 'rgba(255,255,255,0.04)', color: '#64748b' }),
  });

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.15)',
    background: '#0f0f23',
    color: '#e2e8f0',
    fontSize: 16,
    marginBottom: 14,
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998,
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !showBonus) onClose(); }}
    >
      <div
        style={{
          background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16, padding: 28, width: 380, maxWidth: '90vw',
        }}
      >
        {/* Bonus banner */}
        {showBonus && (
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 20,
            textAlign: 'center',
            animation: 'fadeIn 0.3s ease',
          }}>
            <span style={{ fontSize: 18, marginRight: 6 }}>🎉</span>
            <strong style={{ color: '#fff', fontSize: 16 }}>赠送 5 元体验金！</strong>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, margin: '4px 0 0' }}>
              首次登录赠送 ¥5 体验金，快去体验吧
            </p>
          </div>
        )}

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {TABS.map(tab => (
            <button key={tab.key} style={tabStyle(tab.key)} onClick={() => setActiveTab(tab.key)}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Phone login */}
        {activeTab === 'phone' && (
          <>
            {phoneStep === 'phone' ? (
              <>
                <h2 style={{ color: '#e2e8f0', marginBottom: 16, fontSize: 18, fontWeight: 700 }}>
                  {t('titlePhone')}
                </h2>
                <input
                  type="tel"
                  placeholder={t('phonePlaceholder')}
                  value={phone}
                  onChange={(e) => setPhone((e.target as HTMLInputElement).value)}
                  maxLength={11}
                  style={inputStyle}
                />
                <button
                  onClick={handleSendCode}
                  disabled={loading}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 8,
                    background: '#6366f1', color: '#fff', border: 'none',
                    fontSize: 16, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? t('sending') : t('sendCode')}
                </button>
              </>
            ) : (
              <>
                <h2 style={{ color: '#e2e8f0', marginBottom: 16, fontSize: 18, fontWeight: 700 }}>
                  {t('titleCode')}
                </h2>
                <p style={{ color: '#94a3b8', marginBottom: 16, fontSize: 14 }}>
                  {t('codeSentTo')} <strong style={{ color: '#e2e8f0' }}>{phone}</strong>
                  <button
                    onClick={() => setPhoneStep('phone')}
                    style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', marginLeft: 8, fontSize: 13 }}
                  >
                    {t('reenter')}
                  </button>
                </p>
                <input
                  type="text"
                  placeholder={t('codePlaceholder')}
                  value={code}
                  onChange={(e) => setCode((e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  style={{ ...inputStyle, fontSize: 24, textAlign: 'center', letterSpacing: 8, marginBottom: 16 }}
                />
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 8,
                    background: '#6366f1', color: '#fff', border: 'none',
                    fontSize: 16, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1, marginBottom: 8,
                  }}
                >
                  {loading ? t('loggingIn') : t('confirmLogin')}
                </button>
                <button
                  onClick={handleSendCode}
                  disabled={countdown > 0}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 8,
                    background: 'transparent', color: countdown > 0 ? '#64748b' : '#6366f1',
                    border: '1px solid rgba(255,255,255,0.1)', fontSize: 14,
                    cursor: countdown > 0 ? 'default' : 'pointer',
                  }}
                >
                  {countdown > 0 ? t('resendAfter', { seconds: countdown.toString() }) : t('resendCode')}
                </button>
              </>
            )}
          </>
        )}

        {/* Email login */}
        {activeTab === 'email' && (
          <>
            <h2 style={{ color: '#e2e8f0', marginBottom: 16, fontSize: 18, fontWeight: 700 }}>
              邮箱登录
            </h2>
            <input
              type="email"
              placeholder="请输入邮箱地址"
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="请输入密码"
              style={inputStyle}
            />
            <button
              onClick={handleEmailLogin}
              style={{
                width: '100%', padding: '12px', borderRadius: 8,
                background: '#6366f1', color: '#fff', border: 'none',
                fontSize: 16, fontWeight: 600, cursor: 'pointer',
              }}
            >
              登录 / 注册
            </button>
          </>
        )}

        {/* Google login */}
        {activeTab === 'google' && (
          <>
            <h2 style={{ color: '#e2e8f0', marginBottom: 20, fontSize: 18, fontWeight: 700 }}>
              Google 登录
            </h2>
            <button
              onClick={() => handleOAuthLogin('Google')}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 8,
                background: '#fff', color: '#374151', border: '1px solid rgba(255,255,255,0.1)',
                fontSize: 15, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              使用 Google 账号登录
            </button>
          </>
        )}

        {/* Apple login */}
        {activeTab === 'apple' && (
          <>
            <h2 style={{ color: '#e2e8f0', marginBottom: 20, fontSize: 18, fontWeight: 700 }}>
              Apple 登录
            </h2>
            <button
              onClick={() => handleOAuthLogin('Apple')}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 8,
                background: '#000', color: '#fff', border: '1px solid rgba(255,255,255,0.1)',
                fontSize: 15, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              使用 Apple ID 登录
            </button>
          </>
        )}

        {!showBonus && (
          <button
            onClick={onClose}
            style={{
              marginTop: 16, background: 'none', border: 'none', color: '#64748b',
              cursor: 'pointer', fontSize: 13, width: '100%', textAlign: 'center',
            }}
          >
            {t('cancel')}
          </button>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
