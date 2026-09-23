'use client';

import { useCallback, useEffect, useState } from 'react';

export type DeveloperReservation = {
  id: string;
  status: 'payment_hold' | 'confirmed' | 'cancelled' | 'expired' | 'refunded';
  payment_status: 'awaiting_payment' | 'paid' | 'refunded' | 'failed';
  payment_reference: string | null;
  outcome_status: 'active' | 'visit_completed' | 'deal_in_progress' | 'buyer_refused' | 'developer_refused' | 'sold' | 'cancelled_admin';
  extension_reason: string | null;
  extended_at: string | null;
  price_uzs: number;
  reservation_fee_uzs: number;
  hold_expires_at: string;
  reservation_expires_at: string | null;
  created_at: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string | null;
  complex_name: string;
  slug: string;
  unit_number: string;
  rooms: number;
  area_sqm: number;
};

export type DeveloperReservationData = { reservations: DeveloperReservation[]; stats: { active: number; holds: number; deals: number; total: number } };

export function useDeveloperReservations() {
  const [data, setData] = useState<DeveloperReservationData>({ reservations: [], stats: { active: 0, holds: 0, deals: 0, total: 0 } });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    const response = await fetch('/api/developer/reservations', { cache: 'no-store' });
    const payload = await response.json() as DeveloperReservationData & { message?: string };
    if (!response.ok) throw new Error(payload.message ?? 'Не удалось загрузить бронирования.');
    setData(payload);
    setError(null);
    setLoading(false);
  }, []);
  useEffect(() => { void reload().catch((reason) => { setError(reason instanceof Error ? reason.message : 'Не удалось загрузить бронирования.'); setLoading(false); }); }, [reload]);
  return { ...data, error, loading, reload };
}
