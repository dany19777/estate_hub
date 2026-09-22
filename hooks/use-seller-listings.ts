'use client';

import { useCallback, useEffect, useState } from 'react';

export type SellerBuilding = {
  id: string;
  name: string;
  slug: string;
  district: string;
  building_id: string;
  building_name: string;
  total_floors: number;
};

export type SellerListing = {
  id: string;
  status: string;
  price_uzs: number;
  published_at: string | null;
  expires_at: string | null;
  complex_id: string;
  slug: string;
  complex_name: string;
  image: string;
  unit_number: string;
  rooms: number;
  area_sqm: number;
  floor_number: number;
  total_floors: number;
  finish: string;
  availability_status: string;
  contact_phone: string;
  document_type: string;
  document_reference: string;
  verification_status: 'submitted' | 'approved' | 'rejected';
  rejection_reason: string | null;
  payment_claim_status: string | null;
  paid_until: string | null;
};

type SellerData = {
  listings: SellerListing[];
  complexes: SellerBuilding[];
  billing: { feeUzs: number; periodDays: number; bankAccount: string; bankName: string; cardNumber: string; cardHolder: string };
};

export type CreateSellerListing = {
  complexId: string;
  buildingId: string;
  unitNumber: string;
  rooms: number;
  areaSqm: number;
  floorNumber: number;
  totalFloors: number;
  finish: string;
  priceUzs: number;
  documentType: 'ownership_certificate' | 'power_of_attorney';
  documentReference: string;
};

const emptyData: SellerData = { listings: [], complexes: [], billing: { feeUzs: 250_000, periodDays: 30, bankAccount: '', bankName: '', cardNumber: '', cardHolder: '' } };

export function useSellerListings() {
  const [data, setData] = useState<SellerData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const refresh = useCallback(async () => {
    setError('');
    try {
      const response = await fetch('/api/seller/listings', { cache: 'no-store' });
      const payload = await response.json() as SellerData & { message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Не удалось загрузить объявления.');
      setData(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить объявления.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(task);
  }, [refresh]);

  const create = useCallback(async (input: CreateSellerListing) => {
    setProcessing('create'); setError(''); setFeedback('');
    try {
      const response = await fetch('/api/seller/listings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Не удалось создать объявление.');
      setFeedback(payload.message ?? 'Объявление создано.');
      await refresh();
      return payload.message ?? 'Объявление создано.';
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Не удалось создать объявление.';
      setError(message); throw new Error(message);
    } finally { setProcessing(''); }
  }, [refresh]);

  const action = useCallback(async (listingId: string, name: 'submit_payment' | 'price' | 'sold' | 'resubmit', extra: Record<string, unknown> = {}) => {
    setProcessing(`${listingId}:${name}`); setError(''); setFeedback('');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (name === 'submit_payment') headers['Idempotency-Key'] = crypto.randomUUID();
      const response = await fetch('/api/seller/listings', { method: 'PATCH', headers, body: JSON.stringify({ listingId, action: name, ...extra }) });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? 'Не удалось обновить объявление.');
      setFeedback(payload.message ?? 'Объявление обновлено.');
      await refresh();
      return payload.message ?? 'Объявление обновлено.';
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Не удалось обновить объявление.';
      setError(message); throw new Error(message);
    } finally { setProcessing(''); }
  }, [refresh]);

  return { ...data, loading, processing, error, feedback, refresh, create, action };
}
