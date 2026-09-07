/**
 * Test helpers - shared utilities for test suites.
 * With the Prisma mock, workspace creation is not needed against real DB,
 * but this module remains for any shared test utilities.
 */
export function createTestWorkspaceId(name: string): string {
  return `test-ws-${name}`;
}
