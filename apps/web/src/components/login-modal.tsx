'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTranslations } from 'next-intl';
import { useToast } from '@/hooks/use-toast';

interface LoginModalProps {
  onClose: () => void;
}

type Tab = 'phone' | 'email' | 'google' | 'apple';
type PhoneMode = 'code' | 'password' | 'register';

export function LoginModal({ onClose }: LoginModalProps) {
  const { login, loginByPassword, registerByPhone, sendCode } = useAuth();
  const t = useTranslations('login');
  const { info } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('phone');
  const [phoneMode, setPhoneMode] = useState<PhoneMode>('code');

  // Shared form fields
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showBonus, setShowBonus] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [btnHover, setBtnHover] = useState(false);
  const [oauthHover, setOAuthHover] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const TABS: { key: Tab; labelKey: string }[] = [
    { key: 'phone', labelKey: 'tabPhone' },
    { key: 'email', labelKey: 'tabEmail' },
    { key: 'google', labelKey: 'tabGoogle' },
    { key: 'apple', labelKey: 'tabApple' },
  ];

  // ─── Reset form when switching phone modes ────────────────────────────────
  const switchPhoneMode = (mode: PhoneMode) => {
    setPhoneMode(mode);
    setCode('');
    setPassword('');
    setConfirmPassword('');
    setCountdown(0);
    setFormError('');
  };

  // ─── Send code ────────────────────────────────────────────────────────────
  const handleSendCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setFormError(t('invalidPhone'));
      return;
    }
    setLoading(true);
    try {
      await sendCode(phone);
      setFormSuccess(t('codeSent')); setTimeout(() => setFormSuccess(''), 3000);
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { clearInterval(timer); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string; _response?: { reason?: string } };
      const msg = err.code || err.message || t('sendFailed');
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ─── Code login ──────────────────────────────────────────────────────────
  const handleCodeLogin = async () => {
    if (code.length !== 6) {
      setFormError(t('invalidCode'));
      return;
    }
    setFormError('');
    setLoading(true);
    try {
      await login(phone, code);
      setFormSuccess(t('loginSuccess'));
      setShowBonus(true);
      setTimeout(() => { onClose(); }, 2500);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string; status?: number; _response?: { reason?: string } };
      // 401 = invalid or expired code; 400 = other validation error
      let msg = err.code || err.message || t('loginFailed');
      if (err.code === 'INVALID_CODE' || err.status === 401) {
        msg = t('invalidCode');
      }
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ─── Password login ──────────────────────────────────────────────────────
  const handlePasswordLogin = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setFormError(t('invalidPhone'));
      return;
    }
    if (!password) {
      setFormError(t('passwordPlaceholder'));
      return;
    }
    setFormError('');
    setLoading(true);
    try {
      await loginByPassword(phone, password);
      setFormSuccess(t('loginSuccess'));
      setShowBonus(true);
      setTimeout(() => { onClose(); }, 2500);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string; _response?: { reason?: string } };
      const reason = err.code || (err._response as { reason?: string })?.reason;
      let msg = reason || err.message || t('loginFailed');
      if (reason === 'PHONE_NOT_FOUND') {
        msg = t('phoneRegistered');
      } else if (reason === 'INVALID_PASSWORD') {
        msg = t('invalidPassword');
      }
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ─── Register ─────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setFormError(t('invalidPhone'));
      return;
    }
    if (code.length !== 6) {
      setFormError(t('invalidCode'));
      return;
    }
    if (password.length < 6) {
      setFormError(t('passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setFormError(t('confirmPasswordMismatch'));
      return;
    }
    setFormError('');
    setLoading(true);
    try {
      await registerByPhone(phone, code, password);
      setFormSuccess(t('registerSuccess') + ' ' + t('bonusTitle'));
      setShowBonus(true);
      setTimeout(() => { onClose(); }, 2500);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string; _response?: { reason?: string } };
      const reason = err.code || (err._response as { reason?: string })?.reason;
      let msg = reason || err.message || t('loginFailed');
      if (reason === 'PHONE_REGISTERED') {
        msg = t('phoneRegistered');
      } else if (reason === 'INVALID_CODE') {
        msg = t('invalidCode');
      }
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = () => {
    info('邮箱登录功能即将上线');
  };

  const handleOAuthLogin = (provider: string) => {
    info(`${provider} 登录功能即将上线`);
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
    gap: 0,
  };

  const tabClass = (key: Tab) => activeTab === key ? 'login-modal-tab login-modal-tab-active' : 'login-modal-tab';
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

  // Phone sub-tab bar (验证码登录 | 密码登录)
  const phoneSubTabBar: React.CSSProperties = {
    display: 'flex',
    marginBottom: 24,
    borderBottom: '1.5px solid rgba(255,255,255,0.07)',
    paddingBottom: 0,
    gap: 0,
  };

  const phoneSubTab = (mode: PhoneMode): React.CSSProperties => ({
    flex: 1,
    padding: '10px 0',
    border: 'none',
    background: 'transparent',
    color: phoneMode === mode ? '#a5b4fc' : '#64748b',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    borderBottom: phoneMode === mode ? '2px solid #6366f1' : '2px solid transparent',
    transition: 'all 0.2s',
    marginBottom: -1.5,
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

  // Password input with eye toggle
  const passwordInputWrap: React.CSSProperties = {
    position: 'relative',
  };

  const passwordInputStyle = (name: string): React.CSSProperties => ({
    ...inputStyle(name),
    paddingRight: 44,
  });

  const eyeBtn: React.CSSProperties = {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#64748b',
    fontSize: 16,
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s',
  };

  const codeInput: React.CSSProperties = {
    ...inputStyle('code'),
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 12,
    padding: '14px 16px 14px 14px',
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
    background: 'rgba(255,255,255,0.04)',
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

  const switchLink: React.CSSProperties = {
    display: 'block',
    textAlign: 'center',
    marginTop: 16,
    color: '#64748b',
    fontSize: 13,
    fontWeight: 500,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    transition: 'color 0.2s',
  };

  // ─── Renderers ─────────────────────────────────────────────────────────────

  const renderPhoneCodeLogin = () => (
    <>
      {/* Sub-tab: 验证码登录 | 密码登录 */}
      <div style={phoneSubTabBar}>
        <button style={phoneSubTab('code')} onClick={() => switchPhoneMode('code')}>
          {t('tabPhoneCode')}
        </button>
        <button style={phoneSubTab('password')} onClick={() => switchPhoneMode('password')}>
          {t('tabPhonePwd')}
        </button>
      </div>

      <h2 className="login-modal-section-title" style={sectionTitle}>{t('titlePhone')}</h2>
      <p style={sectionSub}>{t('promoText')}</p>

      <div className="login-field-wrap" style={fieldWrap('phone')}>
        <label style={label}>{t('labelPhone')}</label>
        <input
          type="tel"
          placeholder={t('phonePlaceholder')}
          value={phone}
          onChange={(e) => { setPhone((e.target as HTMLInputElement).value); setFormError(''); }}
          onFocus={() => setFocusedField('phone')}
          onBlur={() => setFocusedField(null)}
          maxLength={11}
          style={inputStyle('phone')}
        />
      </div>
      <div className="login-field-wrap" style={fieldWrap('code')}>
        <label style={label}>验证码</label>
        <input
          type="text"
          placeholder={t('codePlaceholder')}
          value={code}
          onChange={(e) => { setCode((e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6)); setFormError(''); }}
          onFocus={() => setFocusedField('code')}
          onBlur={() => setFocusedField(null)}
          maxLength={6}
          style={codeInput}
        />
      </div>
            <button
        style={ghostBtn}
        disabled={loading || countdown > 0}
        onClick={handleSendCode}
      >
        {loading ? t('resendAfter', { seconds: '…' }) : countdown > 0
          ? t('resendAfter', { seconds: countdown.toString() })
          : t('resendCode')}
      </button>
      <button
        style={primaryBtn}
        onMouseEnter={() => setBtnHover(true)}
        onMouseLeave={() => setBtnHover(false)}
        disabled={loading}
        onClick={handleCodeLogin}
      >
        {loading ? t('loggingIn') : t('confirmLogin')}
      </button>

      {/* Register link */}
      <button
        style={switchLink}
        onClick={() => switchPhoneMode('register')}
      >
        {t('goRegister')}
      </button>
    </>
  );

  const renderPhonePasswordLogin = () => (
    <>
      {/* Sub-tab */}
      <div style={phoneSubTabBar}>
        <button style={phoneSubTab('code')} onClick={() => switchPhoneMode('code')}>
          {t('tabPhoneCode')}
        </button>
        <button style={phoneSubTab('password')} onClick={() => switchPhoneMode('password')}>
          {t('tabPhonePwd')}
        </button>
      </div>

      <h2 className="login-modal-section-title" style={sectionTitle}>{t('passwordLogin')}</h2>
      <p style={sectionSub}>{t('passwordLoginSubtitle') || '使用密码登录您的账号'}</p>

      <div className="login-field-wrap" style={fieldWrap('phone')}>
        <label style={label}>{t('labelPhone')}</label>
        <input
          type="tel"
          placeholder={t('phonePlaceholder')}
          value={phone}
          onChange={(e) => { setPhone((e.target as HTMLInputElement).value); setFormError(''); }}
          onFocus={() => setFocusedField('phone')}
          onBlur={() => setFocusedField(null)}
          maxLength={11}
          style={inputStyle('phone')}
        />
      </div>

      <div className="login-field-wrap" style={fieldWrap('password')}>
        <label style={label}>{t('labelPassword')}</label>
        <div style={passwordInputWrap}>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder={t('passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
            style={passwordInputStyle('password')}
          />
          <button
            style={eyeBtn}
            onClick={() => setShowPassword(v => !v)}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#94a3b8')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#64748b')}
            aria-label={showPassword ? '隐藏密码' : '显示密码'}
            type="button"
          >
            {showPassword ? '👁' : '👁‍🗨'}
          </button>
        </div>
      </div>
      
      <button
        style={primaryBtn}
        onMouseEnter={() => setBtnHover(true)}
        onMouseLeave={() => setBtnHover(false)}
        disabled={loading}
        onClick={handlePasswordLogin}
      >
        {loading ? t('loggingIn') : t('loginBtn')}
      </button>

      {/* Register link */}
      <button
        style={switchLink}
        onClick={() => switchPhoneMode('register')}
      >
        {t('goRegister')}
      </button>
    </>
  );

  const renderPhoneRegister = () => (
    <>
      {/* Sub-tab: 验证码登录 | 密码登录 */}
      <div style={phoneSubTabBar}>
        <button style={phoneSubTab('code')} onClick={() => switchPhoneMode('code')}>
          {t('tabPhoneCode')}
        </button>
        <button style={phoneSubTab('password')} onClick={() => switchPhoneMode('password')}>
          {t('tabPhonePwd')}
        </button>
      </div>

      <h2 className="login-modal-section-title" style={sectionTitle}>{t('registerTitle')}</h2>
      <p style={sectionSub}>{t('registerSubtitle') || '设置密码保护您的账号安全'}</p>

      <div className="login-field-wrap" style={fieldWrap('phone')}>
        <label style={label}>{t('labelPhone')}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="tel"
            placeholder={t('phonePlaceholder')}
            value={phone}
            onChange={(e) => { setPhone((e.target as HTMLInputElement).value); setFormError(''); }}
            onFocus={() => setFocusedField('phone')}
            onBlur={() => setFocusedField(null)}
            maxLength={11}
            style={{ ...inputStyle('phone'), flex: 1 }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input
          type="text"
          placeholder={t('codePlaceholder')}
          value={code}
          onChange={(e) => setCode((e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6))}
          onFocus={() => setFocusedField('code')}
          onBlur={() => setFocusedField(null)}
          maxLength={6}
          style={{ ...inputStyle('code'), fontSize: 15, letterSpacing: 4, padding: '12px 14px', flex: 1 }}
        />
        <button
          style={{
            padding: '12px 14px',
            borderRadius: 10,
            border: '1.5px solid rgba(99,102,241,0.4)',
            background: 'rgba(99,102,241,0.1)',
            color: countdown > 0 ? '#64748b' : '#a5b4fc',
            fontSize: 13,
            fontWeight: 600,
            cursor: countdown > 0 ? 'default' : 'pointer',
            opacity: countdown > 0 ? 0.5 : 1,
            whiteSpace: 'nowrap',
            transition: 'all 0.2s',
          }}
          disabled={countdown > 0 || loading}
          onClick={handleSendCode}
        >
          {countdown > 0 ? `${countdown}s` : t('sendCode')}
        </button>
      </div>

      <div className="login-field-wrap" style={fieldWrap('password')}>
        <label style={label}>{t('setPasswordLabel') || '设置密码'}</label>
        <div style={passwordInputWrap}>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder={t('passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
            style={passwordInputStyle('password')}
          />
          <button
            style={eyeBtn}
            onClick={() => setShowPassword(v => !v)}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#94a3b8')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#64748b')}
            aria-label={showPassword ? '隐藏密码' : '显示密码'}
            type="button"
          >
            {showPassword ? '👁' : '👁‍🗨'}
          </button>
        </div>
      </div>

      <div className="login-field-wrap" style={fieldWrap('confirmPassword')}>
        <label style={label}>{t('confirmPasswordLabel') || '确认密码'}</label>
        <div style={passwordInputWrap}>
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder={t('confirmPasswordPlaceholder') || '请再次输入密码'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onFocus={() => setFocusedField('confirmPassword')}
            onBlur={() => setFocusedField(null)}
            style={passwordInputStyle('confirmPassword')}
          />
          <button
            style={eyeBtn}
            onClick={() => setShowConfirmPassword(v => !v)}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#94a3b8')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#64748b')}
            aria-label={showConfirmPassword ? '隐藏密码' : '显示密码'}
            type="button"
          >
            {showConfirmPassword ? '👁' : '👁‍🗨'}
          </button>
        </div>
      </div>
      
      <button
        style={primaryBtn}
        onMouseEnter={() => setBtnHover(true)}
        onMouseLeave={() => setBtnHover(false)}
        disabled={loading}
        onClick={handleRegister}
      >
        {loading ? t('loggingIn') : t('registerBtn')}
      </button>

      {/* Back to login */}
      <button
        style={switchLink}
        onClick={() => switchPhoneMode('password')}
      >
        {t('goLogin')}
      </button>
    </>
  );

  const renderPhoneContent = () => {
    if (phoneMode === 'code') return renderPhoneCodeLogin();
    if (phoneMode === 'password') return renderPhonePasswordLogin();
    if (phoneMode === 'register') return renderPhoneRegister();
    return null;
  };

  const renderEmailLogin = () => (
    <>
      <h2 className="login-modal-section-title" style={sectionTitle}>{t('titleEmail')}</h2>
      <p style={sectionSub}>{t('emailSubtitle')}</p>
      <div className="login-field-wrap" style={fieldWrap('email')}>
        <label style={label}>{t('labelEmail')}</label>
        <input
          type="email"
          placeholder="name@example.com"
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField(null)}
          style={inputStyle('email')}
        />
      </div>
      <div className="login-field-wrap" style={fieldWrap('password')}>
        <label style={label}>{t('labelPassword')}</label>
        <div style={passwordInputWrap}>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder={t('passwordPlaceholder')}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
            style={passwordInputStyle('password')}
          />
          <button
            style={eyeBtn}
            onClick={() => setShowPassword(v => !v)}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#94a3b8')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#64748b')}
            type="button"
          >
            {showPassword ? '👁' : '👁‍🗨'}
          </button>
        </div>
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
      <h2 className="login-modal-section-title" style={sectionTitle}>{t('titleOAuth')}</h2>
      <p style={sectionSub}>{t('googleSubtitle')}</p>
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
        <span style={dividerText}>{t('or')}</span>
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
      <h2 className="login-modal-section-title" style={sectionTitle}>{t('titleOAuth')}</h2>
      <p style={sectionSub}>{t('appleSubtitle')}</p>
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
        <span style={dividerText}>{t('or')}</span>
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
        <div className="login-modal-card" style={card}>

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
              className="login-modal-bonus"
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
          <div className="login-modal-tabs" style={tabBar}>
            {TABS.map(tb => (
              <button
                key={tb.key}
                className={tabClass(tb.key)}
                style={tab(tb.key)}
                onClick={() => {
                  setActiveTab(tb.key);
                  if (tb.key === 'phone') switchPhoneMode('code');
                  setCode('');
                  setPassword('');
                  setConfirmPassword('');
                }}
              >
                {t(tb.labelKey)}
              </button>
            ))}
          </div>

          {/* Content */}
          <div>
            {activeTab === 'phone' && renderPhoneContent()}
            {activeTab === 'email' && renderEmailLogin()}
            {activeTab === 'google' && renderGoogleLogin()}
            {activeTab === 'apple' && renderAppleLogin()}
          </div>

          {/* Error / Success banners */}
          {formError && (
            <div style={{
              marginTop: 12, padding: '10px 14px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, color: '#f87171', fontSize: 13,
            }}>
              ❌ {formError}
            </div>
          )}
          {formSuccess && (
            <div style={{
              marginTop: 12, padding: '10px 14px',
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 8, color: '#34d399', fontSize: 13,
            }}>
              ✅ {formSuccess}
            </div>
          )}

          {/* Footer hint */}
          {!showBonus && (
            <p style={{
              textAlign: 'center', marginTop: 20,
              color: 'rgba(255,255,255,0.5)', fontSize: 11.5, lineHeight: 1.6,
            }}>
              {t('footerHint')}
            </p>
          )}

        </div>
      </div>
    </>
  );
}
