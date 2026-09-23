'use client';

import { useCallback, useEffect, useState } from 'react';

export type AdminBillingPlan = { id: string; code: string; name: string; inventory_limit: number; monthly_price_uzs: number; is_active: number; sort_order: number };
export type AdminSubscription = { id: string; organization_id: string; organization_name: string; status: string; sandbox_active: number; current_period_end: string; auto_renew: number; plan_id: string; code: string; plan_name: string; inventory_limit: number; monthly_price_uzs: number; active_inventory: number; payment_claim_id: string | null; payment_reference: string | null; contract_reference: string | null; payment_amount: number | null; requested_plan_name: string | null };
export type SecondaryBillingListing = { id: string; status: string; market_type: string; price_uzs: number; expires_at: string | null; unit_number: string; complex_name: string; seller_name: string; purchase_status: string | null; paid_until: string | null; payment_claim_id: string | null; payment_method: string | null; payment_reference: string | null };
export type AdminBillingEvent = { id: string; event_type: string; amount_uzs: number; status: string; provider: string; period_start: string; period_end: string; created_at: string; organization_name: string | null; complex_name: string | null; unit_number: string | null };

type AdminBillingData = {
  sandboxMode: boolean;
  plans: AdminBillingPlan[];
  subscriptions: AdminSubscription[];
  config: { id: string; secondary_listing_fee_uzs: number; secondary_period_days: number; updated_at: string } | null;
  secondaryListings: SecondaryBillingListing[];
  events: AdminBillingEvent[];
  stats: { revenue: number; activeSubscriptions: number; activeSecondary: number; expiringSecondary: number };
};

const emptyData: AdminBillingData = { sandboxMode: false, plans: [], subscriptions: [], config: null, secondaryListings: [], events: [], stats: { revenue: 0, activeSubscriptions: 0, activeSecondary: 0, expiringSecondary: 0 } };

export function useAdminBilling() {
  const [data, setData] = useState<AdminBillingData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState('');

  const refresh = useCallback(async () => {
    setError('');
    try {
      const response = await fetch('/api/admin/billing', { cache: 'no-store' });
      const payload = await response.json() as AdminBillingData & { message?: string };
      if (!response.ok) throw new Error(payload.message || 'Не удалось загрузить биллинг.');
      setData(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить биллинг.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(task);
  }, [refresh]);

  const patch = useCallback(async (body: Record<string, unknown>, key: string, idempotent = false) => {
    setProcessing(key);
    setError('');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idempotent) headers['Idempotency-Key'] = crypto.randomUUID();
      const response = await fetch('/api/admin/billing', { method: 'PATCH', headers, body: JSON.stringify(body) });
      const payload = await response.json() as AdminBillingData & { message?: string };
      if (!response.ok) throw new Error(payload.message || 'Не удалось выполнить операцию.');
      setData(payload);
      return payload.message || 'Изменения сохранены.';
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Не удалось выполнить операцию.';
      setError(message);
      throw new Error(message);
    } finally { setProcessing(''); }
  }, []);

  return {
    ...data, loading, error, processing, refresh,
    updatePlan: (plan: AdminBillingPlan) => patch({ action: 'update_plan', planId: plan.id, name: plan.name, inventoryLimit: plan.inventory_limit, monthlyPriceUzs: plan.monthly_price_uzs, isActive: Boolean(plan.is_active) }, plan.id),
    updateConfig: (feeUzs: number, periodDays: number) => patch({ action: 'update_secondary_config', feeUzs, periodDays }, 'config'),
    activateDeveloper: (organizationId: string, claimId: string) => patch({ action: 'activate_developer', organizationId, claimId }, organizationId),
    activateDemoDeveloper: (organizationId: string, planId: string) => patch({ action: 'activate_demo_developer', organizationId, planId }, organizationId),
    rejectPaymentClaim: (claimId: string, reason: string) => patch({ action: 'reject_payment_claim', claimId, reason }, claimId),
    activateSecondary: (listingId: string, claimId: string) => patch({ action: 'activate_secondary', listingId, claimId }, listingId, true),
  };
}
