'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BookingPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/booking/doctors'); }, [router]);
  return null;
}
