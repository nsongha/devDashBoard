/**
 * Editor Module — In-browser markdown file editor
 * Provides modal editor with split preview, save API, and conflict detection
 */

import { showToast } from './toast.mjs';

// ─── State ───────────────────────────────────────
let currentFile = null;  // { projectIndex, relativePath, content, lastModified, filename }
let previewMode = 'split'; // 'editor' | 'split' | 'preview'
let previewTimer = null;

// ─── Markdown → HTML Renderer ────────────────────
function renderMarkdown(md) {
  let html = md
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (triple backtick) — must come before other transforms
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="md-code-block"><code class="lang-${lang || 'text'}">${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`\n]+)`/g, '<code class="md-inline-code">$1</code>');

  // Headers
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

  // Blockquotes
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');

  // Horizontal rules
  html = html.replace(/^---+$/gm, '<hr>');

  // Unordered lists
  html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');

  // Checkbox lists
  html = html.replace(/<li>\[x\]\s*/gi, '<li class="md-check checked">☑ ');
  html = html.replace(/<li>\[ \]\s*/gi, '<li class="md-check">☐ ');

  // Tables
  html = html.replace(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)+)/gm, (_, header, _sep, body) => {
    const ths = header.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
    const rows = body.trim().split('\n').map(row => {
      const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table>`;
  });

  // Wrap loose <li> in <ul>
  html = html.replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Paragraphs — lines that aren't block elements
  html = html.replace(/^(?!<[a-z]|$)(.+)$/gm, '<p>$1</p>');

  // Clean empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

// ─── Preview Update ──────────────────────────────
function updatePreview() {
  const textarea = document.getElementById('editorTextarea');
  const preview = document.getElementById('editorPreview');
  if (!textarea || !preview) return;
  preview.innerHTML = renderMarkdown(textarea.value);
}

function schedulePreviewUpdate() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(updatePreview, 300);
}

// ─── View Modes ──────────────────────────────────
function setPreviewMode(mode) {
  previewMode = mode;
  const editorPane = document.getElementById('editorPane');
  const previewPane = document.getElementById('previewPane');
  const btns = document.querySelectorAll('.editor-mode-btn');

  btns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));

  if (mode === 'editor') {
    editorPane.style.display = 'flex';
    previewPane.style.display = 'none';
  } else if (mode === 'preview') {
    editorPane.style.display = 'none';
    previewPane.style.display = 'block';
    updatePreview();
  } else {
    editorPane.style.display = 'flex';
    previewPane.style.display = 'block';
    updatePreview();
  }
}

// ─── Open Editor ─────────────────────────────────
export async function openEditor(projectIndex, relativePath) {
  const modal = document.getElementById('editorModal');
  if (!modal) return;

  // Show modal immediately with loading state
  modal.classList.add('open');
  const title = document.getElementById('editorFilename');
  const textarea = document.getElementById('editorTextarea');
  const saveBtn = document.getElementById('editorSaveBtn');

  title.textContent = `Loading ${relativePath}...`;
  textarea.value = '';
  textarea.disabled = true;
  saveBtn.disabled = true;

  try {
    const res = await fetch(`/api/file?projectIndex=${projectIndex}&path=${encodeURIComponent(relativePath)}`);

    if (!res.ok) {
      const json = await res.json();
      showToast(json.error || 'Không thể đọc file', 'error');
      closeEditor();
      return;
    }

    const data = await res.json();
    currentFile = {
      projectIndex,
      relativePath,
      lastModified: data.lastModified,
      filename: data.filename,
    };

    title.textContent = `📝 ${data.filename}`;
    document.getElementById('editorPath').textContent = relativePath;
    textarea.value = data.content;
    textarea.disabled = false;
    saveBtn.disabled = false;

    // Init preview
    setPreviewMode(previewMode);

    // Focus textarea
    textarea.focus();
  } catch (err) {
    console.error('[Editor] Load error:', err);
    showToast('Lỗi khi tải file', 'error');
    closeEditor();
  }
}

// ─── Close Editor ────────────────────────────────
export function closeEditor() {
  const modal = document.getElementById('editorModal');
  if (modal) modal.classList.remove('open');
  currentFile = null;
  clearTimeout(previewTimer);
}

// ─── Save File ───────────────────────────────────
export async function saveFile() {
  if (!currentFile) return;

  const textarea = document.getElementById('editorTextarea');
  const saveBtn = document.getElementById('editorSaveBtn');
  const content = textarea.value;

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const res = await fetch('/api/file', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectIndex: currentFile.projectIndex,
        relativePath: currentFile.relativePath,
        content,
        expectedLastModified: currentFile.lastModified,
      }),
    });

    const json = await res.json();

    if (res.status === 409 && json.conflict) {
      // Show conflict dialog
      showConflictDialog(json);
      return;
    }

    if (!res.ok) {
      showToast(json.error || 'Lỗi khi lưu', 'error');
      return;
    }

    // Update lastModified for next save
    currentFile.lastModified = json.lastModified;
    showToast(`✅ Saved ${json.filename}`, 'success');
  } catch (err) {
    console.error('[Editor] Save error:', err);
    showToast('Lỗi kết nối khi lưu file', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 Save';
  }
}

// ─── Conflict Dialog ─────────────────────────────
function showConflictDialog(conflictData) {
  const dialog = document.getElementById('conflictDialog');
  if (!dialog) return;

  dialog.classList.add('open');

  // Wire up buttons
  document.getElementById('conflictOverwrite').onclick = async () => {
    dialog.classList.remove('open');
    // Force save without conflict check
    currentFile.lastModified = null;
    await saveFile();
    // Restore lastModified from save response
  };

  document.getElementById('conflictReload').onclick = () => {
    dialog.classList.remove('open');
    const textarea = document.getElementById('editorTextarea');
    textarea.value = conflictData.serverContent;
    currentFile.lastModified = conflictData.serverLastModified;
    showToast('📂 File reloaded from server', 'info');
    updatePreview();
  };

  document.getElementById('conflictCancel').onclick = () => {
    dialog.classList.remove('open');
  };
}

// ─── Keyboard Shortcuts ──────────────────────────
document.addEventListener('keydown', (e) => {
  const modal = document.getElementById('editorModal');
  if (!modal || !modal.classList.contains('open')) return;

  // Cmd+S / Ctrl+S to save
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    saveFile();
  }

  // Escape to close
  if (e.key === 'Escape') {
    e.preventDefault();
    closeEditor();
  }
});

// ─── Init Editor Event Listeners ─────────────────
function initEditorListeners() {
  const textarea = document.getElementById('editorTextarea');
  if (textarea) {
    textarea.addEventListener('input', schedulePreviewUpdate);

    // Tab key support in textarea
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
        schedulePreviewUpdate();
      }
    });
  }

  // Mode toggle buttons
  document.querySelectorAll('.editor-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => setPreviewMode(btn.dataset.mode));
  });
}

// Init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEditorListeners);
} else {
  initEditorListeners();
}
