'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /profile 自动重定向到 /profile/{username}
 * 便于用户分享自己的个人主页链接
 */
export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('polis_user');
    if (!stored) {
      router.push('/login');
      return;
    }
    try {
      const u = JSON.parse(stored);
      router.replace('/profile/' + u.username);
    } catch {
      router.push('/login');
    }
  }, [router]);

  return null;
}
