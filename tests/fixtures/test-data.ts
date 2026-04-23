export const runId = `qa_e2e_${Date.now()}`;

export function buildQaUser() {
  return {
    id: process.env.QA_TEST_USER_ID || `qa-user-${Date.now()}`,
    email: process.env.QA_TEST_USER_EMAIL || 'qa-e2e@example.com',
    name: process.env.QA_TEST_USER_NAME || 'QA E2E',
    picture: process.env.QA_TEST_USER_PICTURE || 'https://via.placeholder.com/64',
  };
}
