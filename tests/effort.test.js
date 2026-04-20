import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { resolveEffortLevel, _resetCacheForTests } from '../dist/effort.js';

describe('resolveEffortLevel', () => {
  beforeEach(() => {
    _resetCacheForTests();
  });

  describe('stdin effort (priority 1)', () => {
    it('returns effort info from stdin when provided', () => {
      const result = resolveEffortLevel('max');
      assert.deepStrictEqual(result, { level: 'max', symbol: '●' });
    });

    it('normalizes to lowercase', () => {
      const result = resolveEffortLevel('HIGH');
      assert.deepStrictEqual(result, { level: 'high', symbol: '◑' });
    });

    it('trims whitespace', () => {
      const result = resolveEffortLevel('  max  ');
      assert.deepStrictEqual(result, { level: 'max', symbol: '●' });
    });

    it('maps all known effort levels to correct symbols', () => {
      const expected = [
        ['low', '○'],
        ['medium', '◔'],
        ['high', '◑'],
        ['xhigh', '◕'],
        ['max', '●'],
      ];
      for (const [level, symbol] of expected) {
        const result = resolveEffortLevel(level);
        assert.deepStrictEqual(result, { level, symbol },
          `Expected ${level} → symbol ${symbol}`);
      }
    });

    it('handles unknown future levels with empty symbol', () => {
      const result = resolveEffortLevel('turbo');
      assert.deepStrictEqual(result, { level: 'turbo', symbol: '' });
    });

    it('handles hyphenated effort levels', () => {
      const result = resolveEffortLevel('x-high');
      assert.deepStrictEqual(result, { level: 'x-high', symbol: '' });
    });

    it('truncates excessively long level strings', () => {
      const longLevel = 'a'.repeat(100);
      const result = resolveEffortLevel(longLevel);
      assert.strictEqual(result.level.length, 20);
    });

    it('is safe against prototype key names', () => {
      const result = resolveEffortLevel('__proto__');
      assert.strictEqual(result.level, '__proto__');
      assert.strictEqual(result.symbol, '');
      assert.strictEqual(typeof result.symbol, 'string');
    });

    it('is safe against constructor key name', () => {
      const result = resolveEffortLevel('constructor');
      assert.strictEqual(result.symbol, '');
    });
  });

  describe('fallback to parent process (priority 2)', () => {
    it('falls through when stdin is null (result depends on parent process)', () => {
      const result = resolveEffortLevel(null);
      // Cannot assert null deterministically since parent process may have --effort
      // Verify structural correctness of whatever is returned
      if (result !== null) {
        assert.ok(result.level.length > 0, 'level must be non-empty when returned');
        assert.strictEqual(typeof result.symbol, 'string');
      }
    });

    it('falls through when stdin is undefined', () => {
      const result = resolveEffortLevel(undefined);
      if (result !== null) {
        assert.ok(result.level.length > 0);
        assert.strictEqual(typeof result.symbol, 'string');
      }
    });

    it('falls through when stdin is empty string', () => {
      const result = resolveEffortLevel('');
      if (result !== null) {
        assert.ok(result.level.length > 0);
      }
    });

    it('falls through when stdin is whitespace-only (does not block ps fallback)', () => {
      const result = resolveEffortLevel('   ');
      // Whitespace-only MUST NOT produce { level: '   ', symbol: '' }
      if (result !== null) {
        assert.ok(!result.level.match(/^\s+$/), 'level must not be whitespace-only');
        assert.ok(result.level.length > 0);
      }
    });
  });

  describe('stdin always takes priority', () => {
    it('uses stdin even if parent process has different effort', () => {
      // First call may cache parent effort
      resolveEffortLevel(null);
      // stdin should override cached value
      const result = resolveEffortLevel('low');
      assert.strictEqual(result.level, 'low');
      assert.strictEqual(result.symbol, '○');
    });
  });

  describe('caching behavior', () => {
    it('returns consistent results across calls (cached)', () => {
      const first = resolveEffortLevel(null);
      const second = resolveEffortLevel(null);
      assert.deepStrictEqual(first, second);
    });

    it('reset clears cache without crashing', () => {
      resolveEffortLevel(null);
      _resetCacheForTests();
      const result = resolveEffortLevel(null);
      assert.ok(result === null || typeof result.level === 'string');
    });
  });

  describe('EffortInfo structure', () => {
    it('always has both level and symbol as strings', () => {
      const result = resolveEffortLevel('max');
      assert.ok('level' in result);
      assert.ok('symbol' in result);
      assert.strictEqual(typeof result.level, 'string');
      assert.strictEqual(typeof result.symbol, 'string');
    });

    it('unknown level has empty string symbol (not undefined or object)', () => {
      const result = resolveEffortLevel('future_level');
      assert.strictEqual(result.symbol, '');
      assert.strictEqual(typeof result.symbol, 'string');
    });
  });
});
