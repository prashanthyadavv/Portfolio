/**
 * ============================================================
 *  V2 GITHUB SYNC — Secure Serverless Proxy
 * ============================================================
 *
 *  HOW IT WORKS:
 *  ─────────────
 *  1. This sync module no longer talks to GitHub directly.
 *  2. It sends the `admin_password` inside the Authorization header 
 *     to our /api/content Node.js route.
 *  3. The Backend uses its hidden GitHub Token (ENV Variable) to push.
 *
 * ============================================================
 */

'use strict';

/**
 * Checks if GitHub sync is "configured". Since we use a backend proxy,
 * we assume it's always ready if they logged in securely.
 * @returns {boolean}
 */
function isGitHubConfigured() {
  return true; 
}

/**
 * Saves a JSON content file to the Vercel backend.
 * Called from the admin panel's "Save & Deploy" button.
 *
 * @param {string} filename - e.g. "projects.json"
 * @param {Object} data - The JSON data object
 * @returns {Promise<boolean>} True if successful
 */
async function saveAndDeploy(filename, data) {
  const filePath = `content/${filename}`;
  const pwd = sessionStorage.getItem('admin_password');

  try {
    showToast('📤 Sending to Secure Backend...');

    const response = await fetch('/api/content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pwd}`
      },
      body: JSON.stringify({ filename, content: data })
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Server Error ${response.status}`);
    }

    showToast('✅ Saved & deployed via Backend securely!');
    return true;
  } catch (error) {
    console.error('[CMS Sync]', error);
    showToast(`❌ Failed: ${error.message}`, true);
    return false;
  }
}

// Keep the UI setting function but notify users that backend manages it
function showGitHubSetup() {
  const modal = document.getElementById('output-modal');
  const modalContent = modal.querySelector('.admin-output-content');
  modalContent.innerHTML = `
    <div class="admin-output-header">
      <h3>🔗 Secure Backend Configuration</h3>
      <button class="admin-output-close" onclick="document.getElementById('output-modal').classList.remove('active')">&times;</button>
    </div>
    <p class="admin-output-hint">
      <strong>V2 CMS Update:</strong> GitHub Personal Access Tokens are no longer stored in your browser. 
      <br><br>
      To configure deployment, please open your <strong>Vercel Dashboard</strong> and set the following Environment Variables:
    </p>
    <ul style="color: #e2e8f0; font-size: 0.9rem; margin-left: 20px; line-height: 1.6;">
        <li><code>ADMIN_PASSWORD</code></li>
        <li><code>GITHUB_PAT</code></li>
        <li><code>GITHUB_OWNER</code></li>
        <li><code>GITHUB_REPO</code></li>
    </ul>
    <br>
    <p class="admin-output-hint">Your API token is completely invisible to the frontend.</p>
  `;
  modal.classList.add('active');
}

function initSyncStatus() {
  const indicator = document.getElementById('sync-status');
  if (!indicator) return;
  indicator.className = 'sync-indicator connected';
  indicator.title = 'Secure Backend Active';
}
