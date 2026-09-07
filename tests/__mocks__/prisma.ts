/**
 * Prisma mock setup for deterministic unit tests.
 * Auto-mocks the lib/db module so all services use in-memory stores.
 */
import { vi } from 'vitest';

// In-memory stores for test data
let feedbackStore: any[] = [];
let themeStore: any[] = [];
let workspaceStore: any[] = [];
let feedbackThemeStore: any[] = [];
let userStore: any[] = [];

export function resetStores() {
  feedbackStore = [];
  themeStore = [];
  workspaceStore = [];
  feedbackThemeStore = [];
  userStore = [];
  idCounter = 1;
}

export function getFeedbackStore() { return feedbackStore; }
export function getThemeStore() { return themeStore; }
export function getWorkspaceStore() { return workspaceStore; }

let idCounter = 1;
function genId() { return `test-id-${idCounter++}`; }

function matchesWhere(item: any, where: any): boolean {
  for (const key of Object.keys(where)) {
    if (key === 'AND') {
      return where.AND.every((clause: any) => matchesWhere(item, clause));
    }
    if (key === 'OR') {
      return where.OR.some((clause: any) => matchesWhere(item, clause));
    }
    const condition = where[key];
    if (condition && typeof condition === 'object' && !Array.isArray(condition)) {
      if ('contains' in condition) {
        const val = item[key];
        if (typeof val !== 'string') return false;
        if (condition.mode === 'insensitive') {
          if (!val.toLowerCase().includes(condition.contains.toLowerCase())) return false;
        } else {
          if (!val.includes(condition.contains)) return false;
        }
        continue;
      }
    }
    if (item[key] !== where[key]) return false;
  }
  return true;
}

function applySelect(item: any, select: any): any {
  if (!select) return { ...item };
  const result: any = {};
  for (const key of Object.keys(select)) {
    if (select[key] === true) {
      result[key] = item[key];
    }
  }
  return result;
}

function createModelMock(store: () => any[], setStore: (s: any[]) => void) {
  return {
    findMany: vi.fn(async (args: any = {}) => {
      let results = [...store()];
      if (args.where) results = results.filter((item: any) => matchesWhere(item, args.where));
      if (args.orderBy) {
        const key = Object.keys(args.orderBy)[0];
        const dir = args.orderBy[key];
        results.sort((a: any, b: any) => {
          if (dir === 'asc') return a[key] > b[key] ? 1 : -1;
          return a[key] < b[key] ? 1 : -1;
        });
      }
      if (args.skip) results = results.slice(args.skip);
      if (args.take) results = results.slice(0, args.take);
      if (args.select) results = results.map((item: any) => applySelect(item, args.select));
      return results;
    }),
    findFirst: vi.fn(async (args: any = {}) => {
      const results = store().filter((item: any) => matchesWhere(item, args.where || {}));
      const item = results[0] || null;
      if (!item) return null;
      return args.select ? applySelect(item, args.select) : { ...item };
    }),
    findUnique: vi.fn(async (args: any = {}) => {
      const item = store().find((i: any) => {
        if (args.where.id) return i.id === args.where.id;
        if (args.where.email) return i.email === args.where.email;
        return false;
      });
      if (!item) return null;
      return args.select ? applySelect(item, args.select) : { ...item };
    }),
    create: vi.fn(async (args: any) => {
      const now = new Date();
      const item = {
        id: genId(),
        ...args.data,
        createdAt: now,
        updatedAt: now,
        status: args.data.status || 'NEW',
      };
      const s = store();
      s.push(item);
      setStore(s);
      return args.select ? applySelect(item, args.select) : { ...item };
    }),
    createMany: vi.fn(async (args: any) => {
      const now = new Date();
      const items = args.data.map((d: any) => ({
        id: genId(),
        ...d,
        createdAt: now,
        updatedAt: now,
      }));
      const s = store();
      s.push(...items);
      setStore(s);
      return { count: items.length };
    }),
    update: vi.fn(async (args: any) => {
      const s = store();
      const idx = s.findIndex((i: any) => i.id === args.where.id);
      if (idx === -1) throw new Error('Record not found');
      s[idx] = { ...s[idx], ...args.data, updatedAt: new Date() };
      setStore(s);
      return args.select ? applySelect(s[idx], args.select) : { ...s[idx] };
    }),
    delete: vi.fn(async (args: any) => {
      const s = store();
      const idx = s.findIndex((i: any) => i.id === args.where.id);
      if (idx === -1) throw new Error('Record not found');
      const [item] = s.splice(idx, 1);
      setStore(s);
      return item;
    }),
    deleteMany: vi.fn(async (args: any = {}) => {
      if (!args.where) {
        const count = store().length;
        setStore([]);
        return { count };
      }
      const s = store();
      const remaining = s.filter((i: any) => !matchesWhere(i, args.where));
      const count = s.length - remaining.length;
      setStore(remaining);
      return { count };
    }),
    count: vi.fn(async (args: any = {}) => {
      if (!args.where) return store().length;
      return store().filter((item: any) => matchesWhere(item, args.where)).length;
    }),
  };
}

const mockFeedback = createModelMock(() => feedbackStore, (s) => { feedbackStore = s; });
const mockTheme = createModelMock(() => themeStore, (s) => { themeStore = s; });
const mockWorkspace = createModelMock(() => workspaceStore, (s) => { workspaceStore = s; });
const mockFeedbackTheme = createModelMock(() => feedbackThemeStore, (s) => { feedbackThemeStore = s; });
const mockUser = createModelMock(() => userStore, (s) => { userStore = s; });

export const mockPrisma = {
  feedback: mockFeedback,
  theme: mockTheme,
  workspace: mockWorkspace,
  feedbackTheme: mockFeedbackTheme,
  user: mockUser,
  $transaction: vi.fn(async (args: any) => {
    if (Array.isArray(args)) {
      const results = [];
      for (const p of args) {
        results.push(await p);
      }
      return results;
    }
    return args(mockPrisma);
  }),
};

// MUST use vi.mock at the top level of the setup file
// This intercepts ALL imports of 'lib/db' and '@/lib/db' with the mock
vi.mock(import.meta.dirname + '/../../lib/db', () => ({
  prisma: mockPrisma,
}));
