import { AccountGate } from '@/components/account-gate';
import PageContent from '@/components/admin-page-content';
export default function Page() {
  return (
    <AccountGate permission="VIEW_ADMIN">
      <PageContent />
    </AccountGate>
  );
}
