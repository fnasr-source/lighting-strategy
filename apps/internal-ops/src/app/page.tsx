'use client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading) {
      if (!user) router.replace('/login');
      else if (!isAdmin) router.replace('/login?error=admin-only');
      else router.replace('/ops');
    }
  }, [user, loading, isAdmin, router]);
  return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="empty-icon">⚙️</div></div>;
}
