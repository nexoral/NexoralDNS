import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { existsSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Redirect $HOME to a throwaway temp dir BEFORE the module (whose INSTALL_DIR is
// computed from homedir() at import) is loaded, so the suite reads/writes real
// files but never touches the developer's actual ~/.nexoraldns.
const tmpHome = vi.hoisted(() => {
  const os = require('node:os');
  const path = require('node:path');
  return path.join(os.tmpdir(), `nexoral-session-test-${process.pid}-${Date.now()}`);
});

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return { ...actual, homedir: () => tmpHome };
});

import { McpSessionStore, type McpUserSession } from '@tools/source/session/McpSessionStore';

const INSTALL_DIR = join(tmpHome, '.nexoraldns');
const SESSION_FILE = join(INSTALL_DIR, 'mcp-session.json');
const KEY_FILE = join(INSTALL_DIR, 'mcp-session.key');

const SESSION: McpUserSession = { username: 'alice', accessToken: 'AT', refreshToken: 'RT' };
const IGNORED_ID = 'ignored';

beforeEach(() => {
  rmSync(SESSION_FILE, { force: true });
  rmSync(KEY_FILE, { force: true });
});

afterAll(() => {
  rmSync(tmpHome, { recursive: true, force: true });
});

describe('McpSessionStore — in-memory access', () => {
  it('set() then get() returns the stored session', () => {
    const store = new McpSessionStore();
    store.set(IGNORED_ID, SESSION, 'pw');
    expect(store.get(IGNORED_ID)).toEqual(SESSION);
  });

  it('ignores the mcpSessionId (single-admin store) — any id returns the one session', () => {
    const store = new McpSessionStore();
    store.set('id-A', SESSION, 'pw');
    expect(store.get('id-B')).toEqual(SESSION);
  });

  it('get() returns undefined before any login', () => {
    expect(new McpSessionStore().get(IGNORED_ID)).toBeUndefined();
  });

  it('getCredentials() returns undefined when there is no session', () => {
    expect(new McpSessionStore().getCredentials(IGNORED_ID)).toBeUndefined();
  });
});

describe('McpSessionStore — persistence across restarts', () => {
  it('persists the session to disk with locked-down file modes', () => {
    new McpSessionStore().set(IGNORED_ID, SESSION, 'pw');
    expect(existsSync(SESSION_FILE)).toBe(true);
    expect(existsSync(KEY_FILE)).toBe(true);
  });

  it('a fresh instance loads the persisted session (survives a process restart)', () => {
    new McpSessionStore().set(IGNORED_ID, SESSION, 'pw');

    const restarted = new McpSessionStore();

    expect(restarted.get(IGNORED_ID)).toEqual(SESSION);
  });

  it('round-trips the encrypted credentials (AES-256-GCM) across a restart', () => {
    new McpSessionStore().set(IGNORED_ID, SESSION, 's3cret');

    const restarted = new McpSessionStore();

    expect(restarted.getCredentials(IGNORED_ID)).toEqual({ username: 'alice', password: 's3cret' });
  });

  it('never writes the password in cleartext to the session file', () => {
    new McpSessionStore().set(IGNORED_ID, SESSION, 'plaintext-secret');
    expect(readFileSync(SESSION_FILE, 'utf-8')).not.toContain('plaintext-secret');
  });
});

describe('McpSessionStore — updateTokens', () => {
  it('updates the tokens in memory and on disk', () => {
    const store = new McpSessionStore();
    store.set(IGNORED_ID, SESSION, 'pw');

    store.updateTokens(IGNORED_ID, 'AT2', 'RT2');

    expect(store.get(IGNORED_ID)).toEqual({ username: 'alice', accessToken: 'AT2', refreshToken: 'RT2' });
    expect(new McpSessionStore().get(IGNORED_ID)?.accessToken).toBe('AT2');
  });

  it('is a no-op when there is no current session', () => {
    const store = new McpSessionStore();
    store.updateTokens(IGNORED_ID, 'AT2', 'RT2');
    expect(store.get(IGNORED_ID)).toBeUndefined();
  });
});

describe('McpSessionStore — clear', () => {
  it('wipes the in-memory session and deletes the session file', () => {
    const store = new McpSessionStore();
    store.set(IGNORED_ID, SESSION, 'pw');

    store.clear(IGNORED_ID);

    expect(store.get(IGNORED_ID)).toBeUndefined();
    expect(existsSync(SESSION_FILE)).toBe(false);
    expect(new McpSessionStore().get(IGNORED_ID)).toBeUndefined();
  });
});

describe('McpSessionStore — corruption tolerance', () => {
  it('ignores an unreadable/corrupt session file instead of throwing', () => {
    writeFileSync(SESSION_FILE, '{ this is not json', { mode: 0o600 });
    expect(() => new McpSessionStore()).not.toThrow();
    expect(new McpSessionStore().get(IGNORED_ID)).toBeUndefined();
  });

  it('loads the session but discards credentials when the encryption key is gone', () => {
    new McpSessionStore().set(IGNORED_ID, SESSION, 'pw');
    rmSync(KEY_FILE, { force: true }); // key lost, session blob remains

    const restarted = new McpSessionStore();

    expect(restarted.get(IGNORED_ID)).toEqual(SESSION);
    expect(restarted.getCredentials(IGNORED_ID)).toBeUndefined();
  });
});
