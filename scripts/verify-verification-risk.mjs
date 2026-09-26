import assert from 'node:assert/strict';
import { assessVerificationRisk } from '../lib/verification-risk.ts';

const base = { subject_type: 'buyer', risk_level: 'low', document_type: null, organization_status: null, previous_rejections: 0 };
assert.equal(assessVerificationRisk(base).level, 'low');
assert.equal(assessVerificationRisk({ ...base, previous_rejections: 1 }).level, 'high');
assert.equal(assessVerificationRisk({ ...base, risk_level: 'high' }).level, 'high');
assert.equal(assessVerificationRisk({ ...base, subject_type: 'listing', document_type: 'power_of_attorney' }).level, 'medium');
assert.equal(assessVerificationRisk({ ...base, subject_type: 'complex', organization_status: 'pending' }).level, 'medium');
assert.equal(assessVerificationRisk({ ...base, subject_type: 'complex', organization_status: 'suspended' }).level, 'high');
assert.equal(assessVerificationRisk({ ...base, subject_type: 'complex', organization_status: 'verified' }).level, 'low');
console.log('Verification risk cases passed');
