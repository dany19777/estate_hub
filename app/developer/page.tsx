import { AccountGate } from '@/components/account-gate';
import PageContent from '@/components/developer-page-content';
export default function Page() {
  return (
    <AccountGate permission="VIEW_DEVELOPER_DASHBOARD">
      <PageContent />
    </AccountGate>
  );
}
