'use client';

import React from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { ToastProvider } from '@/hooks/use-toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </AuthProvider>
  );
}
