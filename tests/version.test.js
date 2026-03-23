import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  _parseClaudeCodeVersion,
  _resetVersionCache,
  _setExecFileImplForTests,
  getClaudeCodeVersion,
} from '../dist/version.js';

afterEach(() => {
  _resetVersionCache();
  _setExecFileImplForTests(null);
});

test('_parseClaudeCodeVersion extracts the version number from claude --version output', () => {
  assert.equal(_parseClaudeCodeVersion('2.1.81 (Claude Code)\n'), '2.1.81');
  assert.equal(_parseClaudeCodeVersion('Claude Code 2.2.0-beta.1'), '2.2.0');
  assert.equal(_parseClaudeCodeVersion(''), undefined);
});

test('getClaudeCodeVersion returns undefined when the lookup fails', async () => {
  _setExecFileImplForTests(async () => {
    throw new Error('missing binary');
  });

  const version = await getClaudeCodeVersion();
  assert.equal(version, undefined);
});

test('getClaudeCodeVersion caches the first resolved value', async () => {
  let calls = 0;
  _setExecFileImplForTests(async () => {
    calls += 1;
    return { stdout: '2.1.81 (Claude Code)\n' };
  });

  const first = await getClaudeCodeVersion();
  const second = await getClaudeCodeVersion();

  assert.equal(first, '2.1.81');
  assert.equal(second, '2.1.81');
  assert.equal(calls, 1);
});
