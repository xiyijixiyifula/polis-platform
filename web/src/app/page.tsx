import { cookies } from 'next/headers';
import LandingPage from '@/components/LandingPage';
import FeedLayout from '@/components/FeedLayout';

export default function HomePage() {
  const token = cookies().get('polis_token')?.value;
  if (!token) return <LandingPage />;
  return <FeedLayout />;
}

export const dynamic = 'force-dynamic';
