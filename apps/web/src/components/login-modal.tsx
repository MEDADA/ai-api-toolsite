'use client';

import React, { useState, useEffect } from 'react';
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
  const [mounted, setMounted] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const TABS: { key: Tab; labelKey: string }[] = [
    { key: 'phone', labelKey: 'tabPhone' },
    { key: 'email', labelKey: 'tabEmail' },
    { key: 'google', labelKey: 'tabGoogle' },
    { key: 'apple', labelKey: 'tabApple' },
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
      setTimeout(() => { onClose(); }, 2500);
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

  // ─── Styles ───────────────────────────────────────────────────────────────

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9998,
    padding: 16,
    background: 'rgba(8, 8, 15, 0.75)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    animation: 'loginOverlayIn 0.25s ease forwards',
  };

  const card: React.CSSProperties = {
    position: 'relative',
    width: 420,
    maxWidth: '100%',
    background: 'rgba(18, 18, 32, 0.88)',
    border: '1px solid rgba(99, 102, 241, 0.18)',
    borderRadius: 20,
    padding: '32px 28px',
    boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 24px 80px rgba(0,0,0,0.7), 0 0 60px rgba(99,102,241,0.08)',
    animation: 'loginCardIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
  };

  const closeBtn: React.CSSProperties = {
    position: 'absolute', top: 16, right: 16,
    width: 32, height: 32,
    border: 'none', borderRadius: 8,
    background: 'rgba(255,255,255,0.06)',
    color: '#94a3b8',
    fontSize: 18, lineHeight: 1,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.2s, color 0.2s',
  };

  const bonusBanner: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.08))',
    border: '1px solid rgba(245,158,11,0.3)',
    borderRadius: 12,
    padding: '12px 16px',
    marginBottom: 24,
    display: 'flex', alignItems: 'center', gap: 12,
    animation: 'bonusIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
  };

  const bonusIcon: React.CSSProperties = {
    width: 36, height: 36, flexShrink: 0,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18,
  };

  const tabBar: React.CSSProperties = {
    display: 'flex',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 4,
    marginBottom: 28,
    gap: 2,
  };

  const tab = (key: Tab): React.CSSProperties => ({
    flex: 1,
    padding: '8px 4px',
    borderRadius: 7,
    border: 'none',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    ...(activeTab === key
      ? {
          background: 'rgba(99, 102, 241, 0.2)',
          color: '#a5b4fc',
          boxShadow: '0 0 0 1px rgba(99,102,241,0.4)',
        }
      : {
          background: 'transparent',
          color: '#64748b',
        }),
  });

  const sectionTitle: React.CSSProperties = {
    color: '#f1f5f9',
    marginBottom: 6,
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: '-0.01em',
  };

  const sectionSub: React.CSSProperties = {
    color: '#64748b',
    marginBottom: 20,
    fontSize: 13,
  };

  const fieldWrap = (name: string): React.CSSProperties => ({
    position: 'relative',
    marginBottom: 14,
  });

  const label: React.CSSProperties = {
    display: 'block',
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 500,
    marginBottom: 6,
    letterSpacing: '0.02em',
  };

  const inputStyle = (name: string): React.CSSProperties => ({
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: focusedField === name
      ? '1.5px solid rgba(99, 102, 241, 0.8)'
      : '1.5px solid rgba(255,255,255,0.1)',
    background: focusedField === name
      ? 'rgba(99, 102, 241, 0.06)'
      : 'rgba(255,255,255,0.04)',
    color: '#e2e8f0',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
    boxShadow: focusedField === name
      ? '0 0 0 3px rgba(99,102,241,0.12)'
      : 'none',
  });

  const codeInput: React.CSSProperties = {
    ...inputStyle('code'),
    fontSize: 26,
    textAlign: 'center',
    letterSpacing: 12,
    padding: '14px 14px',
    fontWeight: 700,
    fontFamily: 'monospace',
  };

  const primaryBtn: React.CSSProperties = {
    width: '100%',
    padding: '13px',
    borderRadius: 10,
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
    transition: 'opacity 0.2s, transform 0.15s, box-shadow 0.2s',
    boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
    letterSpacing: '0.01em',
    marginTop: 4,
  };

  const primaryBtnHover: React.CSSProperties = {
    transform: 'translateY(-1px)',
    boxShadow: '0 6px 28px rgba(99,102,241,0.5)',
  };

  const ghostBtn: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    borderRadius: 10,
    border: '1.5px solid rgba(255,255,255,0.1)',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 600,
    cursor: countdown > 0 ? 'default' : 'pointer',
    opacity: countdown > 0 ? 0.5 : 1,
    transition: 'all 0.2s',
    marginTop: 4,
  };

  const oauthBtn = (provider: 'google' | 'apple'): React.CSSProperties => ({
    width: '100%',
    padding: '13px 16px',
    borderRadius: 10,
    border: provider === 'google'
      ? '1.5px solid rgba(255,255,255,0.12)'
      : '1.5px solid rgba(255,255,255,0.1)',
    background: provider === 'apple'
      ? 'rgba(255,255,255,0.04)'
      : 'rgba(255,255,255,0.04)',
    color: '#e2e8f0',
    fontSize: 14.5,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    transition: 'all 0.2s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    letterSpacing: '0.01em',
  });

  const divider: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '20px 0',
  };

  const dividerLine: React.CSSProperties = {
    flex: 1,
    height: 1,
    background: 'rgba(255,255,255,0.07)',
  };

  const dividerText: React.CSSProperties = {
    color: '#475569',
    fontSize: 12,
    fontWeight: 500,
  };

  const editLink: React.CSSProperties = {
    background: 'none', border: 'none',
    color: '#6366f1', cursor: 'pointer',
    marginLeft: 8, fontSize: 13, fontWeight: 500,
    padding: '2px 6px', borderRadius: 4,
    transition: 'background 0.15s',
    textDecoration: 'underline',
    textDecorationColor: 'rgba(99,102,241,0.4)',
  };

  const backBtn: React.CSSProperties = {
    background: 'none', border: 'none',
    color: '#64748b', cursor: 'pointer',
    fontSize: 13, fontWeight: 500,
    marginBottom: 12,
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '4px 0',
    transition: 'color 0.15s',
  };

  const [btnHover, setBtnHover] = useState(false);
  const [oauthHover, setOAuthHover] = useState(false);

  const renderPhoneLogin = () => (
    <>
      <h2 style={sectionTitle}>{phoneStep === 'phone' ? t('titlePhone') : t('titleCode')}</h2>
      <p style={sectionSub}>
        {phoneStep === 'phone'
          ? '首次登录赠送 ¥5 体验金，轻松体验全部功能'
          : `${t('codeSentTo')} ${phone} `}
        {phoneStep === 'code' && (
          <button style={editLink} onClick={() => setPhoneStep('phone')}>
            {t('reenter')}
          </button>
        )}
      </p>

      {phoneStep === 'phone' ? (
        <>
          <div style={fieldWrap('phone')}>
            <label style={label}>手机号</label>
            <input
              type="tel"
              placeholder={t('phonePlaceholder')}
              value={phone}
              onChange={(e) => setPhone((e.target as HTMLInputElement).value)}
              onFocus={() => setFocusedField('phone')}
              onBlur={() => setFocusedField(null)}
              maxLength={11}
              style={inputStyle('phone')}
            />
          </div>
          <button
            style={primaryBtn}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            disabled={loading}
            onClick={handleSendCode}
          >
            {loading ? t('sending') : t('sendCode')}
          </button>
        </>
      ) : (
        <>
          <div style={fieldWrap('code')}>
            <label style={label}>验证码</label>
            <input
              type="text"
              placeholder={t('codePlaceholder')}
              value={code}
              onChange={(e) => setCode((e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6))}
              onFocus={() => setFocusedField('code')}
              onBlur={() => setFocusedField(null)}
              maxLength={6}
              style={codeInput}
            />
          </div>
          <button
            style={primaryBtn}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            disabled={loading}
            onClick={handleLogin}
          >
            {loading ? t('loggingIn') : t('confirmLogin')}
          </button>
          <button style={ghostBtn} disabled={countdown > 0} onClick={handleSendCode}>
            {countdown > 0
              ? t('resendAfter', { seconds: countdown.toString() })
              : t('resendCode')}
          </button>
        </>
      )}
    </>
  );

  const renderEmailLogin = () => (
    <>
      <h2 style={sectionTitle}>{t('titleEmail')}</h2>
      <p style={sectionSub}>支持 Gmail、Outlook 等主流邮箱登录</p>
      <div style={fieldWrap('email')}>
        <label style={label}>邮箱地址</label>
        <input
          type="email"
          placeholder="name@example.com"
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField(null)}
          style={inputStyle('email')}
        />
      </div>
      <div style={fieldWrap('password')}>
        <label style={label}>密码</label>
        <input
          type="password"
          placeholder={t('passwordPlaceholder')}
          onFocus={() => setFocusedField('password')}
          onBlur={() => setFocusedField(null)}
          style={inputStyle('password')}
        />
      </div>
      <button
        style={primaryBtn}
        onMouseEnter={() => setBtnHover(true)}
        onMouseLeave={() => setBtnHover(false)}
        onClick={handleEmailLogin}
      >
        {t('loginBtn')}
      </button>
    </>
  );

  const renderGoogleLogin = () => (
    <>
      <h2 style={sectionTitle}>{t('titleOAuth')}</h2>
      <p style={sectionSub}>快速、安全，一键登录您的 Google 账号</p>
      <button
        style={oauthBtn('google')}
        onMouseEnter={() => setOAuthHover(true)}
        onMouseLeave={() => setOAuthHover(false)}
        onClick={() => handleOAuthLogin('Google')}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        {t('googleBtn')}
      </button>
      <div style={divider}>
        <div style={dividerLine} />
        <span style={dividerText}>或</span>
        <div style={dividerLine} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          style={{ ...oauthBtn('apple'), margin: 0 }}
          onClick={() => handleOAuthLogin('Apple')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          {t('appleBtn')}
        </button>
      </div>
    </>
  );

  const renderAppleLogin = () => (
    <>
      <h2 style={sectionTitle}>{t('titleOAuth')}</h2>
      <p style={sectionSub}>使用 Apple ID 安全登录您的账号</p>
      <button
        style={{ ...oauthBtn('apple'), margin: 0 }}
        onClick={() => handleOAuthLogin('Apple')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
        </svg>
        {t('appleBtn')}
      </button>
      <div style={divider}>
        <div style={dividerLine} />
        <span style={dividerText}>或</span>
        <div style={dividerLine} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          style={{ ...oauthBtn('google'), margin: 0 }}
          onClick={() => handleOAuthLogin('Google')}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {t('googleBtn')}
        </button>
      </div>
    </>
  );

  return (
    <>
      <style>{`
        @keyframes loginOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes loginCardIn {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes bonusIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); }
          50% { box-shadow: 0 0 16px 2px rgba(245,158,11,0.25); }
        }
      `}</style>
      <div
        style={{
          ...overlay,
          opacity: mounted ? 1 : 0,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !showBonus) onClose();
        }}
      >
        <div style={card}>

          {/* Close button */}
          {!showBonus && (
            <button
              style={closeBtn}
              onClick={onClose}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)';
                (e.currentTarget as HTMLButtonElement).style.color = '#e2e8f0';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
              }}
              aria-label="关闭"
            >
              ✕
            </button>
          )}

          {/* Bonus banner */}
          {showBonus && (
            <div
              style={{
                ...bonusBanner,
                animation: 'bonusIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), pulse-glow 2.5s ease infinite',
              }}
            >
              <div style={bonusIcon}>🎁</div>
              <div>
                <div style={{ color: '#fef3c7', fontSize: 15, fontWeight: 700 }}>
                  {t('bonusTitle')}
                </div>
                <div style={{ color: 'rgba(254,243,199,0.7)', fontSize: 12, marginTop: 2 }}>
                  {t('bonusDesc')}
                </div>
              </div>
            </div>
          )}

          {/* Brand + tagline */}
          {!showBonus && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, marginBottom: 0,
                }}>
                  ✦
                </div>
                <span style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700 }}>
                  {t('brand')}
                </span>
              </div>
              <div style={{ color: '#475569', fontSize: 12, marginLeft: 38 }}>
                {t('tagline')}
              </div>
            </div>
          )}

          {/* Tab switcher */}
          <div style={tabBar}>
            {TABS.map(tb => (
              <button
                key={tb.key}
                style={tab(tb.key)}
                onClick={() => { setActiveTab(tb.key); setPhoneStep('phone'); setCode(''); }}
              >
                {t(tb.labelKey)}
              </button>
            ))}
          </div>

          {/* Content */}
          <div>
            {activeTab === 'phone' && renderPhoneLogin()}
            {activeTab === 'email' && renderEmailLogin()}
            {activeTab === 'google' && renderGoogleLogin()}
            {activeTab === 'apple' && renderAppleLogin()}
          </div>

          {/* Footer hint */}
          {!showBonus && (
            <p style={{
              textAlign: 'center', marginTop: 20,
              color: '#334155', fontSize: 11.5, lineHeight: 1.6,
            }}>
              {t('footerHint')}
            </p>
          )}

        </div>
      </div>
    </>
  );
}
