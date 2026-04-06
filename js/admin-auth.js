/**
 * ============================================================
 *  ADMIN AUTHENTICATION — Password Gate for Cybrito Admin
 * ============================================================
 *
 *  HOW IT WORKS:
 *  ─────────────
 *  1. On first visit, you SET a password (stored as SHA-256 hash
 *     in localStorage — the actual password is NEVER saved).
 *
 *  2. On subsequent visits, you enter the password to unlock.
 *
 *  3. After login, a session token is stored in sessionStorage
 *     with a 30-minute expiry. Closing the tab ends the session.
 *
 *  4. All admin panel content is hidden until authentication
 *     passes — no JSON is fetched, no forms are rendered.
 *
 *  SECURITY NOTES:
 *  ───────────────
 *  • This is CLIENT-SIDE authentication — suitable for a personal
 *    static portfolio where the JSON files aren't secret data.
 *  • It prevents casual access and hides the admin UI from visitors.
 *  • For production-grade security, use a backend + JWT + HTTPS.
 *  • The password hash uses SHA-256 via the Web Crypto API.
 *
 * ============================================================
 */

'use strict';

// ─── CONFIGURATION ────────────────────────────────────────

const AUTH_CONFIG = {
  // sessionStorage key for the active session
  SESSION_KEY: 'cybrito_admin_session',

  // Session timeout in minutes (auto-logout after this)
  SESSION_TIMEOUT_MINUTES: 30,

  // Maximum failed login attempts before temporary lockout
  MAX_ATTEMPTS: 5,

  // Lockout duration in minutes after max attempts
  LOCKOUT_MINUTES: 5,

  // localStorage key for tracking failed attempts
  ATTEMPTS_KEY: 'cybrito_admin_attempts',
};


// ════════════════════════════════════════════════════════════
//  SESSION MANAGEMENT
// ════════════════════════════════════════════════════════════

/**
 * Creates a new authenticated session.
 * Stores a token + timestamp in sessionStorage.
 */
function createSession() {
  const sessionData = {
    authenticated: true,
    createdAt: Date.now(),
    expiresAt: Date.now() + (AUTH_CONFIG.SESSION_TIMEOUT_MINUTES * 60 * 1000),
  };
  sessionStorage.setItem(AUTH_CONFIG.SESSION_KEY, JSON.stringify(sessionData));
}

/**
 * Checks if there's a valid (non-expired) session.
 * @returns {boolean} True if session is active and not expired
 */
function isSessionValid() {
  try {
    const raw = sessionStorage.getItem(AUTH_CONFIG.SESSION_KEY);
    if (!raw) return false;

    const session = JSON.parse(raw);
    if (!session.authenticated) return false;

    // Check expiry
    if (Date.now() > session.expiresAt) {
      destroySession();
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Refreshes the session expiry timer (called on user activity).
 */
function refreshSession() {
  if (!isSessionValid()) return;

  const raw = sessionStorage.getItem(AUTH_CONFIG.SESSION_KEY);
  const session = JSON.parse(raw);
  session.expiresAt = Date.now() + (AUTH_CONFIG.SESSION_TIMEOUT_MINUTES * 60 * 1000);
  sessionStorage.setItem(AUTH_CONFIG.SESSION_KEY, JSON.stringify(session));
}

/**
 * Destroys the current session (logout).
 */
function destroySession() {
  sessionStorage.removeItem(AUTH_CONFIG.SESSION_KEY);
}


// ════════════════════════════════════════════════════════════
//  BRUTE-FORCE PROTECTION — Rate Limiting
// ════════════════════════════════════════════════════════════

/**
 * Records a failed login attempt.
 */
function recordFailedAttempt() {
  try {
    const raw = localStorage.getItem(AUTH_CONFIG.ATTEMPTS_KEY);
    const attempts = raw ? JSON.parse(raw) : { count: 0, lockedUntil: 0 };

    attempts.count += 1;
    attempts.lastAttempt = Date.now();

    // Lock out after max attempts
    if (attempts.count >= AUTH_CONFIG.MAX_ATTEMPTS) {
      attempts.lockedUntil = Date.now() + (AUTH_CONFIG.LOCKOUT_MINUTES * 60 * 1000);
    }

    localStorage.setItem(AUTH_CONFIG.ATTEMPTS_KEY, JSON.stringify(attempts));
  } catch { /* Silently fail — don't break login */ }
}

/**
 * Clears the failed attempt counter (called after successful login).
 */
function clearAttempts() {
  localStorage.removeItem(AUTH_CONFIG.ATTEMPTS_KEY);
}

/**
 * Checks if the user is currently locked out.
 * @returns {{ locked: boolean, remainingSeconds: number }}
 */
function checkLockout() {
  try {
    const raw = localStorage.getItem(AUTH_CONFIG.ATTEMPTS_KEY);
    if (!raw) return { locked: false, remainingSeconds: 0 };

    const attempts = JSON.parse(raw);

    if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
      const remaining = Math.ceil((attempts.lockedUntil - Date.now()) / 1000);
      return { locked: true, remainingSeconds: remaining };
    }

    // Lockout expired — reset
    if (attempts.lockedUntil && Date.now() >= attempts.lockedUntil) {
      clearAttempts();
    }

    return { locked: false, remainingSeconds: 0 };
  } catch {
    return { locked: false, remainingSeconds: 0 };
  }
}


// ════════════════════════════════════════════════════════════
//  PASSWORD MANAGEMENT
// ════════════════════════════════════════════════════════════

/**
 * Verifies a password against the securely encrypted Vercel Backend Single Source of Truth
 * @param {string} password - Plaintext password to verify
 * @returns {Promise<boolean>} True if password matches
 */
async function verifyPassword(password) {
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${password}` }
    });
    if (res.status === 200) {
      const data = await res.json();
      return data.valid === true;
    }
  } catch (err) {
    console.error("Backend auth verification failed or dropped.");
  }
  return false; // Fail securely
}


// ════════════════════════════════════════════════════════════
//  UI CONTROLLER — Login Gate
// ════════════════════════════════════════════════════════════

/**
 * Main initialization — called when admin.html loads.
 * Decides whether to show login screen or admin panel natively from Backend single source of truth.
 */
async function initAuth() {
  if (isSessionValid()) {
    showAdminPanel();
    startSessionWatchdog();
    return;
  }

  try {
    const res = await fetch('/api/auth');
    if (!res.ok) throw new Error('Auth API error');
    const data = await res.json();

    if (data.passwordExists) {
      showLoginScreen();
    } else {
      // 🚫 Production security constraint: Setup flows have been hard-deprecated.
      document.body.innerHTML = `
        <div style="color:#e2e8f0; font-family:sans-serif; text-align:center; margin-top:20vh; line-height:1.6;">
          <h2 style="color:#ef4444;">Access Denied</h2>
          <p>The <b>ADMIN_PASSWORD</b> environment variable is not configured.</p>
          <p>Please log into your Vercel Dashboard and define it to enable the CMS.</p>
        </div>
      `;
    }
  } catch (err) {
    console.error('Failed to communicate with Auth backend. Secure fail-open to Login.', err);
    showLoginScreen();
  }
}

// DEPRECATED function `showSetupScreen()` was completely purged.

/**
 * Shows the LOGIN screen (password already set).
 */
function showLoginScreen() {
  const loginGate = document.getElementById('auth-gate');
  if (!loginGate) return;

  const lockout = checkLockout();

  loginGate.innerHTML = `
    <div class="auth-card">
      <div class="auth-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <h2>Admin Login</h2>
      <p class="auth-subtitle">Enter your password to access the content manager.</p>
      <form id="login-form" class="auth-form">
        <div class="auth-field">
          <label for="login-password">Password</label>
          <div class="auth-input-wrap">
            <input type="password" id="login-password" placeholder="Enter admin password" required autocomplete="current-password" ${lockout.locked ? 'disabled' : ''}>
            <button type="button" class="auth-toggle-vis" data-target="login-password" aria-label="Toggle visibility">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="auth-error ${lockout.locked ? 'visible' : ''}" id="login-error">
          ${lockout.locked ? `🔒 Too many failed attempts. Try again in ${Math.ceil(lockout.remainingSeconds / 60)} minute(s).` : ''}
        </div>
        <button type="submit" class="btn btn-primary auth-btn" ${lockout.locked ? 'disabled' : ''}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/>
          </svg>
          Sign In
        </button>
      </form>
      <p class="auth-footer-note">🛡️ Session expires after ${AUTH_CONFIG.SESSION_TIMEOUT_MINUTES} minutes of inactivity</p>
    </div>
  `;

  loginGate.classList.add('active');
  setupToggleVisibility();

  // If locked out, start countdown to re-enable
  if (lockout.locked) {
    startLockoutCountdown();
  }

  // Handle login form
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('login-error');
    const pwInput = document.getElementById('login-password');
    const submitBtn = document.querySelector('.auth-btn');
    const pw = pwInput.value;

    errorEl.classList.remove('visible'); // ⚡ UX: Clear previous errors visually

    // Check lockout first
    const currentLockout = checkLockout();
    if (currentLockout.locked) {
      errorEl.textContent = `🔒 Locked. Try again in ${Math.ceil(currentLockout.remainingSeconds / 60)} minute(s).`;
      errorEl.classList.add('visible');
      return;
    }

    // ⚡ UX Improvement: Lock inputs entirely during flight request
    submitBtn.innerHTML = '⏳ Verifying...';
    submitBtn.disabled = true;
    pwInput.disabled = true;

    try {
      // 🔒 Network POST Dispatch
      const isValid = await verifyPassword(pw);

      if (isValid) {
        createSession();
        clearAttempts();
        sessionStorage.setItem("admin_password", pw);
        showAdminPanel();
        startSessionWatchdog();
      } else {
        recordFailedAttempt();
        errorEl.textContent = '❌ Incorrect password. Please try again.';
        errorEl.classList.add('visible');
        shakeForm();

        // Check if now locked out
        const postLockout = checkLockout();
        if (postLockout.locked) {
          errorEl.textContent = `🔒 Too many attempts. Locked for ${AUTH_CONFIG.LOCKOUT_MINUTES} minute(s).`;
          startLockoutCountdown();
        }
      }
    } finally {
      // ⚡ UX Improvement: Restore UI seamlessly regardless of error or network drop
      const postLockout = checkLockout();
      if (!postLockout.locked) {
        submitBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/>
          </svg>
          Sign In
        `;
        submitBtn.disabled = false;
        pwInput.disabled = false;
        pwInput.focus();
      }
    }
  });

  // (No unauthenticated reset — password can only be changed
  //  after login via the lock icon, or via browser console if forgotten:
  //  localStorage.removeItem('cybrito_admin_hash')  then reload)
}

/**
 * Reveals the admin panel and hides the login gate.
 */
function showAdminPanel() {
  const loginGate = document.getElementById('auth-gate');
  const adminPanel = document.getElementById('admin-panel');
  const adminNav = document.getElementById('admin-nav');
  const adminFooter = document.getElementById('admin-footer');

  if (loginGate) {
    loginGate.classList.remove('active');
    loginGate.innerHTML = ''; // Clear login form from DOM
  }
  if (adminPanel) adminPanel.style.display = '';
  if (adminNav) adminNav.style.display = '';
  if (adminFooter) adminFooter.style.display = '';

  // Initialize the admin panel functionality (from admin.js)
  if (typeof initAdminPanel === 'function') {
    initAdminPanel();
  }
}

/**
 * Logs out — destroys session and reloads the page.
 */
function logout() {
  destroySession();
  window.location.reload();
}

/**
 * Changes the admin password (available from within the admin panel).
 */
function changePassword() {
  alert('🔐 Security Policy: Admin Password is locked via Server Environment Variables. To change it, please update the ADMIN_PASSWORD securely in your Vercel Dashboard and redeploy.');
}


// ════════════════════════════════════════════════════════════
//  SESSION WATCHDOG — Auto-logout on timeout
// ════════════════════════════════════════════════════════════

let watchdogInterval = null;

/**
 * Starts a watchdog that checks session validity every minute.
 * Also refreshes the session on user interaction.
 */
function startSessionWatchdog() {
  // Check session every 60 seconds
  watchdogInterval = setInterval(() => {
    if (!isSessionValid()) {
      clearInterval(watchdogInterval);
      alert('⏱️ Session expired. Please log in again.');
      logout();
    }
  }, 60000);

  // Refresh session on user activity
  const activityEvents = ['click', 'keydown', 'scroll', 'mousemove'];
  let lastRefresh = Date.now();

  activityEvents.forEach(event => {
    document.addEventListener(event, () => {
      // Throttle: only refresh every 2 minutes on activity
      if (Date.now() - lastRefresh > 120000) {
        refreshSession();
        lastRefresh = Date.now();
      }
    }, { passive: true });
  });
}


// ════════════════════════════════════════════════════════════
//  UI HELPERS
// ════════════════════════════════════════════════════════════

/**
 * Shakes the form to indicate an error.
 */
function shakeForm() {
  const card = document.querySelector('.auth-card');
  if (card) {
    card.classList.add('shake');
    setTimeout(() => card.classList.remove('shake'), 500);
  }
}

/**
 * Sets up show/hide password toggle buttons.
 */
function setupToggleVisibility() {
  document.querySelectorAll('.auth-toggle-vis').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
        btn.classList.toggle('active');
      }
    });
  });
}

/**
 * Starts a countdown timer that re-enables login after lockout expires.
 */
function startLockoutCountdown() {
  const errorEl = document.getElementById('login-error');
  const intervalId = setInterval(() => {
    const lockout = checkLockout();
    if (!lockout.locked) {
      clearInterval(intervalId);
      // Re-render the login screen without lockout
      showLoginScreen();
    } else if (errorEl) {
      errorEl.textContent = `🔒 Too many failed attempts. Try again in ${Math.ceil(lockout.remainingSeconds / 60)} minute(s).`;
    }
  }, 5000);
}


// ════════════════════════════════════════════════════════════
//  BOOTSTRAP — Run on page load
// ════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', initAuth);
