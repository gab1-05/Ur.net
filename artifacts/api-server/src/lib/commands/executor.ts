import { spawn } from "child_process";
import os from "os";

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

export function execCommand(cmd: string, args: string[], timeoutMs = 15000): Promise<ExecResult> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const proc = spawn(cmd, args, { shell: false, timeout: timeoutMs });

    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGTERM");
    }, timeoutMs);

    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? 1, timedOut });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      resolve({ stdout, stderr: err.message, exitCode: 1, timedOut });
    });
  });
}

export function getPlatform(): NodeJS.Platform {
  return os.platform();
}

export function isWindows(): boolean { return os.platform() === "win32"; }
export function isMac(): boolean { return os.platform() === "darwin"; }
export function isLinux(): boolean { return os.platform() === "linux"; }
