'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { LoginModal } from './login-modal';

export function SiteHeader() {
  const { isLoggedIn, user, balance, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const balanceYuan = balance ? balance.available / 100 : null;
  const avatarChar = user?.phone?.slice(-4) ?? user?.email?.charAt(0).toUpperCase() ?? '?';

  return (
    <>
      <header
        style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'rgba(15,15,35,0.85)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            maxWidth: 1100, margin: '0 auto', padding: '0 20px',
            height: 60, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            style={{
              color: '#e2e8f0', fontSize: 18, fontWeight: 800,
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <span style={{ fontSize: 22 }}>🎨</span>
            <span>AI 工具站</span>
          </Link>

          {/* Nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[
              { href: '/image', label: '图片生成' },
              { href: '/video', label: '视频生成' },
              { href: '/audio', label: '语音生成' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: '6px 14px', borderRadius: 8,
                  color: '#94a3b8', fontSize: 14, textDecoration: 'none',
                  transition: 'all 0.2s',
                }}
              >
                {item.label}
              </Link>
            ))}

            {/* Auth section */}
            {isLoggedIn ? (
              <div style={{ position: 'relative', marginLeft: 12 }}>
                <button
                  onClick={() => setShowDropdown((v) => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '6px 12px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#e2e8f0', cursor: 'pointer',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: '#fff',
                  }}>
                    {avatarChar}
                  </div>

                  {/* Balance */}
                  {balanceYuan !== null && (
                    <span style={{ fontSize: 13, color: '#f59e0b', fontWeight: 600 }}>
                      ¥{balanceYuan.toFixed(0)}
                    </span>
                  )}

                  {/* Arrow */}
                  <span style={{ color: '#64748b', fontSize: 10 }}>▼</span>
                </button>

                {/* Dropdown */}
                {showDropdown && (
                  <>
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                      onClick={() => setShowDropdown(false)}
                    />
                    <div
                      style={{
                        position: 'absolute', top: '100%', right: 0, marginTop: 8,
                        background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 12, padding: 8, minWidth: 180, zIndex: 20,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                      }}
                    >
                      {[
                        { href: '/dashboard', label: '📊 用户中心' },
                        { href: '/dashboard?tab=balance', label: '💰 余额充值' },
                        { href: '/dashboard?tab=favorites', label: '⭐ 收藏夹' },
                      ].map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setShowDropdown(false)}
                          style={{
                            display: 'block', padding: '10px 14px', borderRadius: 8,
                            color: '#e2e8f0', fontSize: 14, textDecoration: 'none',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.06)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
                        >
                          {item.label}
                        </Link>
                      ))}

                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '4px 0' }} />

                      <button
                        onClick={() => { logout(); setShowDropdown(false); }}
                        style={{
                          display: 'block', width: '100%', padding: '10px 14px',
                          borderRadius: 8, background: 'transparent', border: 'none',
                          color: '#ef4444', fontSize: 14, textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        🚪 退出登录
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                style={{
                  marginLeft: 12, padding: '8px 20px', borderRadius: 10,
                  background: '#6366f1', color: '#fff', border: 'none',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
                }}
              >
                登录
              </button>
            )}
          </nav>
        </div>
      </header>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
