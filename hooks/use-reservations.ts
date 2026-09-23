'use client';

import { useCallback, useEffect, useState } from 'react';

export type BuyerReservation = {
  id: string;
  listing_id: string;
  status: 'payment_hold' | 'confirmed';
  payment_status: string;
  payment_reference: string | null;
  price_uzs: number;
  reservation_fee_uzs: number;
  hold_expires_at: string;
  reservation_expires_at: string | null;
  slug: string;
  complex_name: string;
  image: string;
  unit_number: string;
  rooms: number;
  area_sqm: number;
  seller: string;
};

export function useReservations() {
  const [reservations, setReservations] = useState<BuyerReservation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    const response = await fetch('/api/buyer/reservations');
    const data = (await response.json()) as {
      reservations?: BuyerReservation[];
      message?: string;
    };
    if (!response.ok)
      throw new Error(data.message ?? 'Не удалось загрузить бронирования.');
    setReservations(data.reservations ?? []);
  }, []);
  useEffect(() => {
    void reload().catch((reason) =>
      setError(
        reason instanceof Error
          ? reason.message
          : 'Не удалось загрузить бронирования.',
      ),
    );
  }, [reload]);
  return { reservations, error, reload };
}
