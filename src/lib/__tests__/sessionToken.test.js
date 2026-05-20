import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const insertMock = vi.fn(() => Promise.resolve({ error: null }));
const fromMock = vi.fn(() => ({ insert: insertMock }));

vi.mock('../supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function installLocalStorage() {
  const store = {};

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: vi.fn((key) => (key in store ? store[key] : null)),
      setItem: vi.fn((key, value) => {
        store[key] = String(value);
      }),
      removeItem: vi.fn((key) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach((key) => delete store[key]);
      }),
    },
  });

  return store;
}

function installCrypto(overrides = {}) {
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      randomUUID: vi.fn(() => '123e4567-e89b-42d3-a456-426614174000'),
      getRandomValues: vi.fn((bytes) => {
        for (let i = 0; i < bytes.length; i += 1) {
          bytes[i] = i + 1;
        }
        return bytes;
      }),
      ...overrides,
    },
  });
}

describe('sessionToken', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T00:00:00.000Z'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    installLocalStorage();
    installCrypto();
    insertMock.mockClear();
    fromMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('createSessionToken returns a UUID v4 from crypto.randomUUID', async () => {
    const { createSessionToken } = await import('../sessionToken');

    const token = createSessionToken();

    expect(token).toMatch(uuidV4Pattern);
    expect(globalThis.crypto.randomUUID).toHaveBeenCalledOnce();
    expect(localStorage.setItem).toHaveBeenCalledWith('order_session_token', token);
  });

  it('createSessionToken falls back to getRandomValues when randomUUID is missing', async () => {
    installCrypto({ randomUUID: undefined });
    const { createSessionToken } = await import('../sessionToken');

    const token = createSessionToken();

    expect(token).toMatch(uuidV4Pattern);
    expect(globalThis.crypto.getRandomValues).toHaveBeenCalledOnce();
  });

  it('getSessionToken returns the same token within expiry window', async () => {
    const { getSessionToken } = await import('../sessionToken');

    const firstToken = getSessionToken();
    vi.advanceTimersByTime(60_000);
    const secondToken = getSessionToken();

    expect(firstToken).toBe(secondToken);
    expect(firstToken).toMatch(uuidV4Pattern);
  });
});

describe('logError', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    insertMock.mockClear();
    fromMock.mockClear();

    // logError uses window.location and navigator.userAgent
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { location: { href: 'http://localhost/test', pathname: '/test' } },
    });
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { userAgent: 'vitest' },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete globalThis.window;
    delete globalThis.navigator;
  });

  it('does not throw for Error input and writes fire-and-forget error log', async () => {
    const { logError } = await import('../logError');

    expect(() => logError(new Error('boom'), { metadata: { source: 'test' } })).not.toThrow();

    expect(fromMock).toHaveBeenCalledWith('error_logs');
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      message: 'boom',
      metadata: { source: 'test' },
    }));
  });

  it('does not throw for non-Error input', async () => {
    const { logError } = await import('../logError');

    expect(() => logError('plain failure')).not.toThrow();

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      message: 'plain failure',
    }));
  });
});
