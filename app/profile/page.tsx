import { AccountGate } from '@/components/account-gate';
import PageContent from '@/components/profile-page-content';
export default function Page() {
  return (
    <AccountGate>
      <PageContent />
    </AccountGate>
  );
}
