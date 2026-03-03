/**
 * File Helpers — Shared utility functions
 * Used by both server and CLI collector
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";

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
