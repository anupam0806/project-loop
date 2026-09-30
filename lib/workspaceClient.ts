/**
 * Client-side workspace cache and in-flight request deduplication.
 * Prevents redundant concurrent and sequential fetches to /api/workspace.
 */

let cachedWorkspaceName: string | null = null;
let pendingFetch: Promise<string | null> | null = null;

export async function getClientWorkspaceName(): Promise<string | null> {
  if (cachedWorkspaceName) {
    return cachedWorkspaceName;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  if (!pendingFetch) {
    pendingFetch = fetch('/api/workspace')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data?.name) {
          cachedWorkspaceName = data.data.name;
        }
        return cachedWorkspaceName;
      })
      .catch(() => null)
      .finally(() => {
        pendingFetch = null;
      });
  }

  return pendingFetch;
}

export function setCachedWorkspaceName(name: string): void {
  cachedWorkspaceName = name;
}

export function clearWorkspaceCache(): void {
  cachedWorkspaceName = null;
  pendingFetch = null;
}
