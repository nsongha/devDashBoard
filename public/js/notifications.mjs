/**
 * Desktop Notifications Module (B5)
 * Dùng Web Notification API để hiển thị desktop notification
 * khi có new commit hoặc PR event từ WebSocket.
 */

let isEnabled = false;
let permission = 'default';

/**
 * Khởi tạo notification module.
 * Request permission nếu chưa có, lưu state.
 */
export async function initNotifications() {
  if (!('Notification' in window)) {
    console.log('[Notifications] Không hỗ trợ Notification API');
    return false;
  }

  permission = Notification.permission;

  if (permission === 'denied') {
    console.log('[Notifications] Permission bị từ chối');
    return false;
  }

  if (permission === 'default') {
    // Chưa hỏi — sẽ hỏi khi user click enable
    return false;
  }

  if (permission === 'granted') {
    isEnabled = true;
    return true;
  }

  return false;
}

/**
 * Request notification permission (gọi khi user click "Enable Notifications").
 * @returns {Promise<boolean>} true nếu được cấp phép
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;

  try {
    const result = await Notification.requestPermission();
    permission = result;
    isEnabled = result === 'granted';
    return isEnabled;
  } catch (err) {
    console.warn('[Notifications] requestPermission error:', err);
    return false;
  }
}

/**
 * Hiển thị desktop notification.
 * @param {string} title
 * @param {object} options - { body, icon, tag }
 */
export function showNotification(title, options = {}) {
  if (!isEnabled || permission !== 'granted') return;

  try {
    const notification = new Notification(title, {
      body: options.body || '',
      icon: options.icon || '/favicon.ico',
      tag: options.tag || 'dev-dashboard',
      ...options,
    });

    // Auto-close sau 5 giây
    setTimeout(() => notification.close(), 5000);
  } catch (err) {
    console.warn('[Notifications] Failed to show notification:', err);
  }
}

/**
 * Trả về trạng thái notification hiện tại.
 * @returns {{ isEnabled: boolean, permission: string }}
 */
export function getNotificationStatus() {
  return {
    isEnabled,
    permission: 'Notification' in window ? Notification.permission : 'unsupported',
  };
}

/**
 * Enable hoặc disable notifications.
 * @param {boolean} enabled
 */
export function setNotificationsEnabled(enabled) {
  if (enabled && permission === 'granted') {
    isEnabled = true;
  } else {
    isEnabled = false;
  }
}

/**
 * Handle WS event và show notification tương ứng.
 * @param {string} eventType - 'git:commit' | 'github:push' | 'github:pr'
 * @param {object} payload
 */
export function notifyOnEvent(eventType, payload = {}) {
  if (!isEnabled) return;

  switch (eventType) {
    case 'git:commit': {
      const projectName = payload.repoPath?.split('/').pop() || 'project';
      showNotification(`📦 New commit detected`, {
        body: `Project: ${projectName}`,
        tag: 'git-commit',
      });
      break;
    }

    case 'github:push': {
      showNotification(`🚀 GitHub push — ${payload.repoFullName || ''}`, {
        body: `${payload.commits} commit(s) to ${payload.branch} by ${payload.pusher}`,
        tag: 'github-push',
      });
      break;
    }

    case 'github:pr': {
      const action = payload.action || 'updated';
      showNotification(`🐙 PR #${payload.number} ${action}`, {
        body: `${payload.title}\nby @${payload.author}`,
        tag: `github-pr-${payload.number}`,
      });
      break;
    }

    default:
      break;
  }
}
