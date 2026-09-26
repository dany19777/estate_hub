export type VerificationRiskInput = {
  subject_type: string;
  risk_level: string;
  document_type: string | null;
  organization_status: string | null;
  previous_rejections: number;
};

export function assessVerificationRisk(input: VerificationRiskInput) {
  const reasons: string[] = [];
  if (input.risk_level === 'high') reasons.push('Высокий уровень, указанный проверкой личности');
  if (input.previous_rejections > 0) reasons.push('Ранее заявка по этому объекту отклонялась');
  if (input.organization_status === 'rejected' || input.organization_status === 'suspended') {
    reasons.push('Компания отклонена или приостановлена');
  }
  if (input.subject_type === 'listing' && input.document_type === 'power_of_attorney') {
    reasons.push('Продажа по доверенности требует проверки полномочий');
  }
  if (input.subject_type === 'complex' && input.organization_status !== 'verified') {
    reasons.push('Компания ещё не подтверждена');
  }

  const high = input.risk_level === 'high' || input.previous_rejections > 0 ||
    input.organization_status === 'rejected' || input.organization_status === 'suspended';
  const medium = input.risk_level === 'medium' || reasons.length > 0;
  return {
    level: high ? 'high' : medium ? 'medium' : 'low',
    reasons,
  } as const;
}
