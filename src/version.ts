import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

type ExecFileResult = {
  stdout: string;
};

type ExecFileImpl = (
  file: string,
  args: string[],
  options: {
    timeout: number;
    encoding: BufferEncoding;
  }
) => Promise<ExecFileResult>;

const defaultExecFile: ExecFileImpl = promisify(execFile) as ExecFileImpl;

let execFileImpl: ExecFileImpl = defaultExecFile;
let cachedVersion: string | undefined;
let hasResolved = false;

export function _parseClaudeCodeVersion(output: string): string | undefined {
  const trimmed = output.trim();
  if (!trimmed) {
    return undefined;
  }

  const match = trimmed.match(/\d+(?:\.\d+)+/);
  return match?.[0];
}

export async function getClaudeCodeVersion(): Promise<string | undefined> {
  if (hasResolved) {
    return cachedVersion;
  }

  try {
    const { stdout } = await execFileImpl('claude', ['--version'], {
      timeout: 2000,
      encoding: 'utf8',
    });
    cachedVersion = _parseClaudeCodeVersion(stdout);
  } catch {
    cachedVersion = undefined;
  }

  hasResolved = true;
  return cachedVersion;
}

export function _resetVersionCache(): void {
  cachedVersion = undefined;
  hasResolved = false;
}

export function _setExecFileImplForTests(impl: ExecFileImpl | null): void {
  execFileImpl = impl ?? defaultExecFile;
}
