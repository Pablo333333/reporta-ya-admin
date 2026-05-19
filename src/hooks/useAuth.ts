'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentUser, removeToken } from '@/lib/auth';
import type { JwtUser } from '@/lib/types';

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<JwtUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) {
      router.replace('/login');
    } else {
      setUser(u);
    }
    setIsLoading(false);
  }, [router]);

  const logout = () => {
    removeToken();
    router.replace('/login');
  };

  return { user, isLoading, logout };
}
