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
let embeddingStore: any[] = [];
let reportStore: any[] = [];

export function resetStores() {
  feedbackStore = [];
  themeStore = [];
  workspaceStore = [];
  feedbackThemeStore = [];
  userStore = [];
  embeddingStore = [];
  reportStore = [];
  idCounter = 1;
}

export function getFeedbackStore() { return feedbackStore; }
export function getThemeStore() { return themeStore; }
export function getWorkspaceStore() { return workspaceStore; }
export function getReportStore() { return reportStore; }


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
      if ('not' in condition) {
        if (item[key] === condition.not) return false;
        continue;
      }
      if ('gte' in condition || 'lte' in condition || 'gt' in condition || 'lt' in condition) {
        const itemVal = item[key] instanceof Date ? item[key].getTime() : item[key];
        if ('gte' in condition) {
          const target = condition.gte instanceof Date ? condition.gte.getTime() : condition.gte;
          if (itemVal < target) return false;
        }
        if ('lte' in condition) {
          const target = condition.lte instanceof Date ? condition.lte.getTime() : condition.lte;
          if (itemVal > target) return false;
        }
        if ('gt' in condition) {
          const target = condition.gt instanceof Date ? condition.gt.getTime() : condition.gt;
          if (itemVal <= target) return false;
        }
        if ('lt' in condition) {
          const target = condition.lt instanceof Date ? condition.lt.getTime() : condition.lt;
          if (itemVal >= target) return false;
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
        createdAt: args.data.createdAt || now,
        updatedAt: args.data.updatedAt || now,
        status: args.data.status || 'NEW',
        ...args.data,
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
        createdAt: d.createdAt || now,
        updatedAt: d.updatedAt || now,
        ...d,
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
      const idx = s.findIndex((i: any) => matchesWhere(i, args.where));
      if (idx === -1) throw new Error('Record not found');
      const deleted = s.splice(idx, 1)[0];
      setStore(s);
      return { ...deleted };
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
    groupBy: vi.fn(async (args: any) => {
      const s = store();
      let filtered = s;
      if (args.where) {
        filtered = s.filter((item: any) => matchesWhere(item, args.where));
      }
      const byField = args.by[0];
      const groups = new Map();
      for (const item of filtered) {
        const val = item[byField];
        if (!groups.has(val)) {
          groups.set(val, { [byField]: val, _count: { _all: 0 } });
        }
        if (args._count) {
          const g = groups.get(val);
          g._count._all++;
        }
      }
      return Array.from(groups.values());
    }),
  };
}

const mockFeedback = createModelMock(() => feedbackStore, (s) => { feedbackStore = s; });
const mockTheme = createModelMock(() => themeStore, (s) => { themeStore = s; });
const mockWorkspace = createModelMock(() => workspaceStore, (s) => { workspaceStore = s; });
const mockFeedbackTheme = createModelMock(() => feedbackThemeStore, (s) => { feedbackThemeStore = s; });
const mockUser = createModelMock(() => userStore, (s) => { userStore = s; });
const mockEmbedding = createModelMock(() => embeddingStore, (s) => { embeddingStore = s; });
const mockReport = createModelMock(() => reportStore, (s) => { reportStore = s; });

export const mockPrisma = {
  feedback: mockFeedback,
  theme: mockTheme,
  workspace: mockWorkspace,
  feedbackTheme: mockFeedbackTheme,
  user: mockUser,
  embedding: mockEmbedding,
  report: mockReport,

  $queryRaw: vi.fn(async (strings: any, ...values: any[]) => {
    // Mock analytics and RAG raw queries
    const query = Array.isArray(strings) ? strings.join('?') : strings?.strings?.join('?') || strings;
    if (query.includes('volumeOverTime') || query.includes('COUNT(*)') && !query.includes('sentiment IS NOT NULL')) {
      // Mock volume by date
      return [ { date: new Date().toISOString().split('T')[0], count: BigInt(feedbackStore.length) } ];
    }
    if (query.includes('sentiment IS NOT NULL')) {
      // Mock sentiment over time
      return [ { date: new Date().toISOString().split('T')[0], sentiment: 'POSITIVE', count: BigInt(feedbackStore.filter(f => f.sentiment === 'POSITIVE').length) } ];
    }
    if (query.includes('distance')) {
      // Mock RAG vector search
      return embeddingStore.map(e => {
        const fb = feedbackStore.find(f => f.id === e.feedbackId);
        return {
          feedbackId: e.feedbackId,
          distance: 0.1,
          text: fb?.text || "",
          channel: fb?.channel || "SUPPORT"
        };
      });
    }
    return [];
  }),
  $executeRaw: vi.fn(async () => {
    return 1;
  }),
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
