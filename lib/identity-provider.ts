export type IdentitySubmission = { documentType: 'passport' | 'id_card'; documentNumber: string; birthDate: string };
export type IdentityProviderCase = { provider: string; reference: string; riskLevel: 'low' | 'medium' | 'high' };

export interface IdentityVerificationProvider {
  createCase(userId: string, submission: IdentitySubmission): Promise<IdentityProviderCase>;
}

class SandboxManualIdentityProvider implements IdentityVerificationProvider {
  async createCase(userId: string): Promise<IdentityProviderCase> {
    return { provider: 'sandbox_manual', reference: `identity:${userId}:${crypto.randomUUID()}`, riskLevel: 'low' };
  }
}

export function identityVerificationProvider(): IdentityVerificationProvider {
  return new SandboxManualIdentityProvider();
}
