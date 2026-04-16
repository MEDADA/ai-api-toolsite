'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

interface LoginModalProps {
  onClose: () => void;
}

export function LoginModal({ onClose }: LoginModalProps) {
  const { login, sendCode } = useAuth();
  const { success, error } = useToast();
  const t = useTranslations('login');
  const tToast = useTranslations('toast');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      error(tToast('invalidPhone'));
      return;
    }
    setLoading(true);
    try {
      await sendCode(phone);
      success(tToast('codeSent'));
      setStep('code');
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
      onClose();
    } catch (e) {
      error(tToast('loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16, padding: 32, width: 360, maxWidth: '90vw',
        }}
      >
        <h2 style={{ color: '#e2e8f0', marginBottom: 24, fontSize: 20, fontWeight: 700 }}>
          {step === 'phone' ? t('titlePhone') : t('titleCode')}
        </h2>

        {step === 'phone' ? (
          <>
            <input
              type="tel"
              placeholder={t('phonePlaceholder')}
              value={phone}
              onChange={(e) => setPhone((e.target as HTMLInputElement).value)}
              maxLength={11}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.15)', background: '#0f0f23',
                color: '#e2e8f0', fontSize: 16, marginBottom: 16, outline: 'none',
                boxSizing: 'border-box',
              }}
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
            <p style={{ color: '#94a3b8', marginBottom: 16, fontSize: 14 }}>
              {t('codeSentTo')} <strong style={{ color: '#e2e8f0' }}>{phone}</strong>
              <button
                onClick={() => setStep('phone')}
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
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.15)', background: '#0f0f23',
                color: '#e2e8f0', fontSize: 24, textAlign: 'center',
                letterSpacing: 8, marginBottom: 16, outline: 'none', boxSizing: 'border-box',
              }}
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

        <button
          onClick={onClose}
          style={{
            marginTop: 16, background: 'none', border: 'none', color: '#64748b',
            cursor: 'pointer', fontSize: 13, width: '100%', textAlign: 'center',
          }}
        >
          {t('cancel')}
        </button>
      </div>
    </div>
  );
}
