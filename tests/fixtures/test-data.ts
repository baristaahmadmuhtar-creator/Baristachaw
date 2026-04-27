export const runId = `qa_e2e_${Date.now()}`;

type QaUserOverrides = Partial<{
  id: string;
  email: string;
  name: string;
  picture: string;
  planCode: 'free' | 'starter' | 'pro' | 'team' | 'enterprise';
}>;

export function buildQaUser(overrides: QaUserOverrides = {}) {
  return {
    id: overrides.id || process.env.QA_TEST_USER_ID || `qa-user-${Date.now()}`,
    email: overrides.email || process.env.QA_TEST_USER_EMAIL || 'qa-e2e@example.com',
    name: overrides.name || process.env.QA_TEST_USER_NAME || 'QA E2E',
    picture: overrides.picture || process.env.QA_TEST_USER_PICTURE || 'https://via.placeholder.com/64',
    planCode: overrides.planCode || ('free' as const),
  };
}

export function buildQaAdminUser() {
  return {
    ...buildQaUser(),
    id: process.env.QA_TEST_ADMIN_USER_ID || `qa-admin-${Date.now()}`,
    email: process.env.QA_TEST_ADMIN_EMAIL || 'qa-admin@example.com',
    name: process.env.QA_TEST_ADMIN_NAME || 'QA Admin',
    role: 'admin' as const,
    isAdmin: true,
  };
}
