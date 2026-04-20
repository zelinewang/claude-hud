import { execFileSync } from 'node:child_process';

export interface EffortInfo {
  level: string;
  symbol: string;
}

const KNOWN_SYMBOLS: Record<string, string> = Object.assign(Object.create(null), {
  low: '○',
  medium: '◔',
  high: '◑',
  xhigh: '◕',
  max: '●',
});

const MAX_LEVEL_LENGTH = 20;

let cachedParentEffort: string | null | undefined = undefined;

/**
 * Resolve the current session's effort level.
 *
 * Priority:
 * 1. stdin.effort (future — when Claude Code exposes it in statusline JSON)
 * 2. Parent process CLI args (cached — effort is immutable within a session)
 *
 * Returns null if effort cannot be determined.
 */
export function resolveEffortLevel(stdinEffort?: string | null): EffortInfo | null {
  const trimmed = stdinEffort?.trim();
  if (trimmed) {
    return formatEffort(trimmed);
  }

  if (cachedParentEffort === undefined) {
    cachedParentEffort = readParentProcessEffort();
  }

  if (cachedParentEffort) {
    return formatEffort(cachedParentEffort);
  }

  return null;
}

function formatEffort(level: string): EffortInfo {
  const normalized = level.toLowerCase().trim().slice(0, MAX_LEVEL_LENGTH);
  if (!normalized) {
    return { level: '', symbol: '' };
  }
  const symbol = Object.hasOwn(KNOWN_SYMBOLS, normalized) ? KNOWN_SYMBOLS[normalized] : '';
  return { level: normalized, symbol };
}

function readParentProcessEffort(): string | null {
  if (process.platform === 'win32') {
    return null;
  }

  try {
    const ppid = process.ppid;
    if (!ppid || ppid <= 1) {
      return null;
    }

    const psArgs: readonly string[] = ['-o', 'args=', '-p', String(ppid)];
    const opts = { encoding: 'utf8', timeout: 100 } as const;
    let output: string;
    try {
      output = execFileSync('/bin/ps', psArgs, opts).trim();
    } catch {
      output = execFileSync('/usr/bin/ps', psArgs, opts).trim();
    }

    // Only match --effort when it appears as a CLI flag (preceded by start-of-string
    // or whitespace), not embedded inside a quoted prompt or other argument value.
    const match = output.match(/(?:^|\s)--effort[= ]+([\w-]+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Reset cache — for testing only */
export function _resetCacheForTests(): void {
  cachedParentEffort = undefined;
}
