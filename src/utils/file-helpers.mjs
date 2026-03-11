/**
 * File Helpers — Shared utility functions
 * Used by both server and CLI collector
 */

import { execSync, exec } from "child_process";
import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { promisify } from "util";
import { join } from "path";

const execPromise = promisify(exec);

/**
 * Run a shell command safely, returning stdout or empty string on error.
 * @param {string} cmd - Shell command to execute
 * @param {string} cwd - Working directory
 * @returns {string}
 */
export function run(cmd, cwd) {
  try {
    return execSync(cmd, { cwd, encoding: "utf-8", timeout: 15000 }).trim();
  } catch {
    return "";
  }
}

/**
 * Run a shell command asynchronously (non-blocking).
 * Enables parallel execution of multiple commands via Promise.all().
 * @param {string} cmd - Shell command to execute
 * @param {string} cwd - Working directory
 * @returns {Promise<string>}
 */
export async function runAsync(cmd, cwd) {
  try {
    const { stdout } = await execPromise(cmd, { cwd, encoding: "utf-8", timeout: 15000 });
    return stdout.trim();
  } catch {
    return "";
  }
}

/**
 * Read a file safely, returning content or empty string on error.
 * @param {string} path - File path to read
 * @returns {string}
 */
export function readFileSafe(path) {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return "";
  }
}

/**
 * Get ISO date string for the start of the week (Sunday).
 * Shared utility to avoid duplication across collectors.
 * @param {Date} date
 * @returns {string}
 */
export function getWeekStart(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split('T')[0];
}

/**
 * Scan docs/ directory (including subdirectories) to find all files matching filename.
 * Returns array of { path, content, source } objects.
 * Search order: docs/{filename} → root/{filename} → docs/**\/{filename}
 * @param {string} repoPath - Repository root path
 * @param {string} filename - File name to search for (e.g. 'QC_REPORT.md')
 * @returns {Array<{path: string, content: string, source: string}>}
 */
export function findDocsFileContents(repoPath, filename) {
  const results = [];
  const seen = new Set();

  // Helper: thêm file nếu tồn tại và chưa thêm
  const tryAdd = (filePath, source) => {
    if (seen.has(filePath)) return;
    if (!existsSync(filePath)) return;
    const stat = statSync(filePath);
    if (!stat.isFile()) return;
    const content = readFileSafe(filePath);
    if (content) {
      seen.add(filePath);
      results.push({ path: filePath, content, source });
    }
  };

  // 1. docs/{filename} (primary location)
  tryAdd(join(repoPath, 'docs', filename), `docs/${filename}`);

  // 2. root/{filename} (fallback)
  tryAdd(join(repoPath, filename), filename);

  // 3. Scan docs/ subdirectories recursively
  const docsDir = join(repoPath, 'docs');
  if (existsSync(docsDir) && statSync(docsDir).isDirectory()) {
    scanSubdirs(docsDir, filename, repoPath, tryAdd);
  }

  return results;
}

/**
 * Recursive helper — scan subdirectories for a given filename.
 * Max depth 3 to avoid runaway scanning.
 */
function scanSubdirs(dir, filename, repoPath, tryAdd, depth = 0) {
  if (depth > 3) return;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const subDir = join(dir, entry.name);
      const filePath = join(subDir, filename);
      const source = filePath.replace(repoPath + '/', '');
      tryAdd(filePath, source);
      scanSubdirs(subDir, filename, repoPath, tryAdd, depth + 1);
    }
  } catch {
    // Directory không đọc được → skip
  }
}

