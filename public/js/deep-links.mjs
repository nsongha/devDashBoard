/**
 * Deep Links Module — Generate IDE-specific URLs for files and diffs
 * Supports: VS Code, Cursor, WebStorm, Zed
 */

// IDE URL scheme definitions
const IDE_SCHEMES = {
  vscode: {
    name: 'VS Code',
    fileUrl: (path, line) => `vscode://file/${path}${line ? `:${line}` : ''}`,
    diffUrl: (repoPath, hash) => `vscode://file/${repoPath}`,
  },
  cursor: {
    name: 'Cursor',
    fileUrl: (path, line) => `cursor://file/${path}${line ? `:${line}` : ''}`,
    diffUrl: (repoPath, hash) => `cursor://file/${repoPath}`,
  },
  webstorm: {
    name: 'WebStorm',
    fileUrl: (path, line) =>
      `jetbrains://webstorm/navigate/reference?path=${encodeURIComponent(path)}${line ? `&line=${line}` : ''}`,
    diffUrl: (repoPath, hash) =>
      `jetbrains://webstorm/navigate/reference?path=${encodeURIComponent(repoPath)}`,
  },
  zed: {
    name: 'Zed',
    fileUrl: (path, line) => `zed://file/${path}${line ? `:${line}` : ''}`,
    diffUrl: (repoPath, hash) => `zed://file/${repoPath}`,
  },
  antigravity: {
    name: 'Antigravity',
    fileUrl: (path, line) => `antigravity://file/${path}${line ? `:${line}` : ''}`,
    diffUrl: (repoPath, hash) => `antigravity://file/${repoPath}`,
  },
};

// Cached IDE scheme (loaded once from /api/config)
let cachedScheme = null;

/**
 * Initialize deep links by fetching IDE scheme from config.
 * Call this once when the app loads.
 */
export async function initDeepLinks() {
  try {
    const res = await fetch('/api/config');
    const config = await res.json();
    cachedScheme = config.ideScheme || 'vscode';
  } catch {
    cachedScheme = 'vscode';
  }
}

/**
 * Get current IDE scheme (sync, after initDeepLinks).
 * @returns {string}
 */
export function getIdeScheme() {
  return cachedScheme || 'vscode';
}

/**
 * Set IDE scheme (called when user changes setting without page reload).
 * @param {string} scheme
 */
export function setIdeScheme(scheme) {
  cachedScheme = scheme;
}

/**
 * Generate a deep link URL to open a file in the configured IDE.
 * @param {string} projectPath - Absolute path to the git repo root
 * @param {string} filePath - Relative path to the file within the repo
 * @param {number} [line] - Optional line number
 * @returns {string} IDE URL
 */
export function makeFileLink(projectPath, filePath, line) {
  const scheme = getIdeScheme();
  const ide = IDE_SCHEMES[scheme] || IDE_SCHEMES.vscode;
  const fullPath = `${projectPath}/${filePath}`.replace(/\/+/g, '/');
  return ide.fileUrl(fullPath, line);
}

/**
 * Generate a deep link URL to view a commit diff in the configured IDE.
 * Opens the repo root — IDE extensions (e.g., GitLens) handle the rest.
 * @param {string} projectPath - Absolute path to the git repo root
 * @param {string} hash - Commit hash (short or full)
 * @returns {string} IDE URL
 */
export function makeDiffLink(projectPath, hash) {
  const scheme = getIdeScheme();
  const ide = IDE_SCHEMES[scheme] || IDE_SCHEMES.vscode;
  return ide.diffUrl(projectPath, hash);
}

// Export for testing
export { IDE_SCHEMES };
