'use client';

import { useEffect } from 'react';

export function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Sem SW o app funciona normalmente, só não fica disponível offline.
    });
  }, []);
  return null;
}
