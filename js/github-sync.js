/**
 * ============================================================
 *  GITHUB SYNC — Direct Commit to GitHub from Admin Panel
 * ============================================================
 *
 *  HOW IT WORKS:
 *  ─────────────
 *  1. User generates a GitHub Personal Access Token (PAT)
 *     with "repo" or "contents:write" permission.
 *
 *  2. Token is stored in localStorage (for persistence).
 *
 *  3. When "Save & Deploy" is clicked, this module:
 *     a) Fetches the current file from GitHub API (to get its SHA)
 *     b) Commits the updated JSON via PUT /repos/.../contents/...
 *     c) Vercel detects the commit and auto-deploys (~10s)
 *
 *  GITHUB API DOCS:
 *  https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents
 *
 * ============================================================
 */

'use strict';

// ─── CONFIGURATION ────────────────────────────────────────

const GITHUB_CONFIG = {
  // Default repo — auto-detected from your git remote
  DEFAULT_OWNER: 'prashanthyadavv',
  DEFAULT_REPO: 'Portfolio',
  DEFAULT_BRANCH: 'master',

  // localStorage keys
  TOKEN_KEY: 'cybrito_github_token',
  REPO_KEY: 'cybrito_github_repo',
};


// ════════════════════════════════════════════════════════════
//  TOKEN MANAGEMENT
// ════════════════════════════════════════════════════════════

/**
 * Gets the stored GitHub PAT.
 * @returns {string|null}
 */
function getGitHubToken() {
  return localStorage.getItem(GITHUB_CONFIG.TOKEN_KEY);
}

/**
 * Stores the GitHub PAT.
 * @param {string} token
 */
function setGitHubToken(token) {
  localStorage.setItem(GITHUB_CONFIG.TOKEN_KEY, token.trim());
}

/**
 * Removes the stored GitHub PAT.
 */
function clearGitHubToken() {
  localStorage.removeItem(GITHUB_CONFIG.TOKEN_KEY);
}

/**
 * Checks if GitHub sync is configured.
 * @returns {boolean}
 */
function isGitHubConfigured() {
  return !!getGitHubToken();
}

/**
 * Gets the repo config (owner/repo/branch).
 * @returns {{ owner: string, repo: string, branch: string }}
 */
function getRepoConfig() {
  try {
    const saved = localStorage.getItem(GITHUB_CONFIG.REPO_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* use defaults */ }

  return {
    owner: GITHUB_CONFIG.DEFAULT_OWNER,
    repo: GITHUB_CONFIG.DEFAULT_REPO,
    branch: GITHUB_CONFIG.DEFAULT_BRANCH,
  };
}

/**
 * Saves custom repo config.
 */
function setRepoConfig(owner, repo, branch) {
  localStorage.setItem(GITHUB_CONFIG.REPO_KEY, JSON.stringify({ owner, repo, branch }));
}


// ════════════════════════════════════════════════════════════
//  GITHUB API — File Operations
// ════════════════════════════════════════════════════════════

/**
 * Gets the current SHA of a file from GitHub (needed for updates).
 * @param {string} filePath - e.g. "content/projects.json"
 * @returns {Promise<{ sha: string, content: string }|null>}
 */
async function getFileSHA(filePath) {
  const token = getGitHubToken();
  const { owner, repo, branch } = getRepoConfig();

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (response.status === 404) {
    // File doesn't exist yet — will be created
    return null;
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `GitHub API error: ${response.status}`);
  }

  const data = await response.json();
  return { sha: data.sha, content: data.content };
}

/**
 * Commits a file to GitHub (create or update).
 * @param {string} filePath - e.g. "content/projects.json"
 * @param {string} content - File content (will be Base64 encoded)
 * @param {string} commitMessage - Commit message
 * @returns {Promise<{ success: boolean, commitUrl: string }>}
 */
async function commitFileToGitHub(filePath, content, commitMessage) {
  const token = getGitHubToken();
  if (!token) throw new Error('GitHub token not configured');

  const { owner, repo, branch } = getRepoConfig();

  // Get current file SHA (required for updates)
  const existing = await getFileSHA(filePath);

  // Encode content to Base64
  const base64Content = btoa(unescape(encodeURIComponent(content)));

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  const body = {
    message: commitMessage,
    content: base64Content,
    branch: branch,
  };

  // If file exists, include the SHA to update it
  if (existing) {
    body.sha = existing.sha;
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `GitHub API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    success: true,
    commitUrl: data.commit?.html_url || '',
  };
}

/**
 * Validates a GitHub token by making a lightweight API call.
 * @param {string} token
 * @returns {Promise<{ valid: boolean, username: string, error: string }>}
 */
async function validateGitHubToken(token) {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      return { valid: false, username: '', error: 'Invalid token or insufficient permissions' };
    }

    const data = await response.json();
    return { valid: true, username: data.login, error: '' };
  } catch (err) {
    return { valid: false, username: '', error: err.message };
  }
}

/**
 * Checks if the token has write access to the repo.
 * @returns {Promise<boolean>}
 */
async function checkRepoAccess() {
  const token = getGitHubToken();
  const { owner, repo } = getRepoConfig();

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) return false;

    const data = await response.json();
    return data.permissions?.push || data.permissions?.admin || false;
  } catch {
    return false;
  }
}


// ════════════════════════════════════════════════════════════
//  SAVE & DEPLOY — High-level function for admin panel
// ════════════════════════════════════════════════════════════

/**
 * Saves a JSON content file to GitHub and triggers Vercel deployment.
 * Called from the admin panel's "Save & Deploy" button.
 *
 * @param {string} filename - e.g. "projects.json"
 * @param {Object} data - The JSON data object
 * @returns {Promise<boolean>} True if successful
 */
async function saveAndDeploy(filename, data) {
  if (!isGitHubConfigured()) {
    showToast('⚠️ GitHub not configured. Click the ⚙ gear icon first.', true);
    return false;
  }

  const filePath = `content/${filename}`;
  const jsonContent = JSON.stringify(data, null, 2) + '\n';
  const commitMsg = `📝 Update ${filename} via Admin Panel`;

  try {
    // Show loading state
    showToast('📤 Saving to GitHub...');

    const result = await commitFileToGitHub(filePath, jsonContent, commitMsg);

    if (result.success) {
      showToast('✅ Saved & deployed! Vercel will update in ~10s.');
      return true;
    }
  } catch (error) {
    console.error('[GitHub Sync]', error);

    if (error.message.includes('401') || error.message.includes('Bad credentials')) {
      showToast('❌ GitHub token expired or invalid. Reconfigure in ⚙ settings.', true);
    } else if (error.message.includes('404')) {
      showToast('❌ Repository not found. Check settings.', true);
    } else if (error.message.includes('409')) {
      showToast('⚠️ Conflict — someone else changed this file. Refresh and try again.', true);
    } else {
      showToast(`❌ Failed: ${error.message}`, true);
    }
    return false;
  }
}


// ════════════════════════════════════════════════════════════
//  GITHUB SETUP UI — Render setup form in admin panel
// ════════════════════════════════════════════════════════════

/**
 * Renders the GitHub configuration modal.
 * Called when the user clicks the ⚙ settings button.
 */
function showGitHubSetup() {
  const modal = document.getElementById('output-modal');
  const { owner, repo, branch } = getRepoConfig();
  const token = getGitHubToken();
  const isConfigured = !!token;

  const modalContent = modal.querySelector('.admin-output-content');
  modalContent.innerHTML = `
    <div class="admin-output-header">
      <h3>🔗 GitHub Sync Settings</h3>
      <button class="admin-output-close" onclick="document.getElementById('output-modal').classList.remove('active')">&times;</button>
    </div>
    <p class="admin-output-hint" style="margin-bottom: 1.25rem;">
      Connect your GitHub repo so content changes deploy automatically via Vercel.
    </p>

    <form id="github-setup-form" class="admin-form" style="gap: 0.85rem;">
      <div class="form-group">
        <label for="gh-token">Personal Access Token *</label>
        <div class="auth-input-wrap" style="position:relative; display:flex; align-items:center;">
          <input type="password" id="gh-token" placeholder="${isConfigured ? '•••••••• (saved)' : 'ghp_xxxxxxxxxxxx'}"
                 value="" style="flex:1; background:rgba(15,23,42,0.7); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:0.65rem 2.5rem 0.65rem 0.9rem; color:#e2e8f0; font-size:0.85rem; font-family:monospace; outline:none;">
          <button type="button" onclick="toggleGhTokenVis()" style="position:absolute; right:0.5rem; background:none; border:none; color:rgba(255,255,255,0.3); cursor:pointer; padding:0.3rem;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
        <small style="color:rgba(255,255,255,0.25); font-size:0.72rem;">
          Create one at <a href="https://github.com/settings/tokens/new?description=Cybrito+Admin&scopes=repo" target="_blank" rel="noopener" style="color:#818cf8;">github.com/settings/tokens</a>
          — Select <code style="background:rgba(99,102,241,0.15); color:#818cf8; padding:0.1rem 0.3rem; border-radius:3px;">repo</code> scope
        </small>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="gh-owner">Owner</label>
          <input type="text" id="gh-owner" value="${escapeHTML(owner)}" placeholder="prashanthyadavv" style="background:rgba(15,23,42,0.6); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:0.55rem 0.9rem; color:#e2e8f0; font-size:0.85rem; outline:none;">
        </div>
        <div class="form-group">
          <label for="gh-repo">Repository</label>
          <input type="text" id="gh-repo" value="${escapeHTML(repo)}" placeholder="Portfolio" style="background:rgba(15,23,42,0.6); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:0.55rem 0.9rem; color:#e2e8f0; font-size:0.85rem; outline:none;">
        </div>
        <div class="form-group">
          <label for="gh-branch">Branch</label>
          <input type="text" id="gh-branch" value="${escapeHTML(branch)}" placeholder="main" style="background:rgba(15,23,42,0.6); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:0.55rem 0.9rem; color:#e2e8f0; font-size:0.85rem; outline:none;">
        </div>
      </div>

      <div id="gh-status" style="min-height: 1.5rem; font-size: 0.82rem; color: rgba(255,255,255,0.4);"></div>

      <div style="display: flex; gap: 0.75rem; margin-top: 0.25rem;">
        <button type="submit" class="btn btn-primary" style="flex: 1; padding: 0.7rem;">
          ${isConfigured ? '🔄 Update & Verify' : '🔗 Connect & Verify'}
        </button>
        ${isConfigured ? `
          <button type="button" class="btn btn-outline" onclick="disconnectGitHub()" style="padding: 0.7rem; color: #fca5a5; border-color: rgba(239,68,68,0.3);">
            Disconnect
          </button>
        ` : ''}
      </div>
    </form>

    ${isConfigured ? `
      <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.15); border-radius: 8px;">
        <span style="color: #34d399; font-size: 0.82rem;">✅ Connected to <strong>${escapeHTML(owner)}/${escapeHTML(repo)}</strong> (${escapeHTML(branch)})</span>
      </div>
    ` : ''}
  `;

  modal.classList.add('active');

  // Handle form submission
  document.getElementById('github-setup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const statusEl = document.getElementById('gh-status');
    const tokenInput = document.getElementById('gh-token').value;
    const ownerInput = document.getElementById('gh-owner').value.trim();
    const repoInput = document.getElementById('gh-repo').value.trim();
    const branchInput = document.getElementById('gh-branch').value.trim() || 'main';

    // Use existing token if input is empty
    const tokenToUse = tokenInput || getGitHubToken();
    if (!tokenToUse) {
      statusEl.textContent = '❌ Please enter a Personal Access Token.';
      statusEl.style.color = '#f87171';
      return;
    }

    statusEl.textContent = '🔄 Verifying token...';
    statusEl.style.color = 'rgba(255,255,255,0.5)';

    // Validate token
    const validation = await validateGitHubToken(tokenToUse);
    if (!validation.valid) {
      statusEl.textContent = `❌ Invalid token: ${validation.error}`;
      statusEl.style.color = '#f87171';
      return;
    }

    // Save config
    if (tokenInput) setGitHubToken(tokenInput);
    setRepoConfig(ownerInput, repoInput, branchInput);

    // Check repo access
    statusEl.textContent = '🔄 Checking repo access...';
    const hasAccess = await checkRepoAccess();

    if (hasAccess) {
      statusEl.innerHTML = `✅ Connected as <strong style="color:#34d399;">@${escapeHTML(validation.username)}</strong> with write access!`;
      statusEl.style.color = '#34d399';
      updateSyncStatusIndicator(true);

      // Close modal after 1.5s
      setTimeout(() => {
        document.getElementById('output-modal').classList.remove('active');
        showToast('✅ GitHub connected! "Save & Deploy" is now active.');
      }, 1500);
    } else {
      statusEl.textContent = `⚠️ Token valid (@${validation.username}) but no write access to ${ownerInput}/${repoInput}. Check repo permissions.`;
      statusEl.style.color = '#fbbf24';
    }
  });
}

/**
 * Toggles visibility of the GitHub token input.
 */
function toggleGhTokenVis() {
  const input = document.getElementById('gh-token');
  if (input) input.type = input.type === 'password' ? 'text' : 'password';
}

/**
 * Disconnects GitHub by clearing stored token.
 */
function disconnectGitHub() {
  if (confirm('Disconnect GitHub sync? You can reconnect anytime.')) {
    clearGitHubToken();
    document.getElementById('output-modal').classList.remove('active');
    updateSyncStatusIndicator(false);
    showToast('GitHub disconnected.');
  }
}

/**
 * Updates the sync status indicator in the admin nav.
 * @param {boolean} connected
 */
function updateSyncStatusIndicator(connected) {
  const indicator = document.getElementById('sync-status');
  if (!indicator) return;

  if (connected) {
    indicator.className = 'sync-indicator connected';
    indicator.title = 'GitHub connected — Save & Deploy active';
  } else {
    indicator.className = 'sync-indicator disconnected';
    indicator.title = 'GitHub not connected — Click ⚙ to set up';
  }
}

/**
 * Initializes the sync status indicator on page load.
 */
function initSyncStatus() {
  updateSyncStatusIndicator(isGitHubConfigured());
}
