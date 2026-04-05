/**
 * ============================================================
 *  ADMIN PANEL — JavaScript for Cybrito Content Manager
 * ============================================================
 *
 *  This script powers the admin interface at admin.html.
 *  It loads existing JSON content, lets users add items via
 *  forms, and outputs the updated JSON for manual copy/download.
 *
 *  ⚡ NOTE: Since this is a static site (no backend server),
 *  changes generate updated JSON that you copy into the file.
 *  For auto-saving, you'd need a backend or a CMS like Netlify CMS.
 *
 * ============================================================
 */

'use strict';

// ─── STATE: In-memory copies of each JSON file ────────────

let projectsData = null;
let writeupsData = null;
let activityData = null;
let aboutData = null;
let contactData = null;
let homeData = null;


// ─── INITIALIZATION ───────────────────────────────────────
// NOTE: This function is NOT called automatically.
// It is called by admin-auth.js ONLY after successful authentication.

async function initAdminPanel() {
  // Load all JSON data into memory
  projectsData = await loadContent('projects.json');
  writeupsData = await loadContent('writeups.json');
  activityData = await loadContent('activity.json');
  aboutData = await loadContent('about.json');
  contactData = await loadContent('contact.json');
  homeData = await loadContent('home.json');

  // Render existing items in preview lists
  renderProjectsList();
  renderWriteupsList();
  renderActivityList();
  renderAboutList();
  renderContactList();
  renderHomePreview();

  // Populate project section dropdown
  populateProjectSections();

  // Setup tab switching
  setupTabs();

  // Setup form handlers
  setupForms();

  // Setup modal
  setupModal();
}


// ════════════════════════════════════════════════════════════
//  TAB SWITCHING
// ════════════════════════════════════════════════════════════

function setupTabs() {
  const tabs = document.querySelectorAll('.admin-tab');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active from all tabs and sections
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));

      // Activate clicked tab and its section
      tab.classList.add('active');
      const sectionId = 'section-' + tab.dataset.section;
      document.getElementById(sectionId).classList.add('active');
    });
  });
}


// ════════════════════════════════════════════════════════════
//  PREVIEW RENDERERS — Show existing items
// ════════════════════════════════════════════════════════════

function renderProjectsList() {
  const list = document.getElementById('projects-list');
  if (!list || !projectsData) return;

  let items = [];
  projectsData.sections.forEach(section => {
    section.items.forEach(item => {
      items.push({
        title: item.title,
        meta: `${section.title} • ${item.label}`,
        badge: item.labelType
      });
    });
  });

  list.innerHTML = items.map(item => createAdminItem(item)).join('');
}

function renderWriteupsList() {
  const list = document.getElementById('writeups-list');
  if (!list || !writeupsData) return;

  list.innerHTML = writeupsData.items.map(item => createAdminItem({
    title: item.title,
    meta: item.severity ? `${item.severity} Severity` : (item.date || ''),
    badge: item.label || 'Writeup'
  })).join('');
}

function renderActivityList() {
  const list = document.getElementById('activity-list');
  if (!list || !activityData) return;

  let items = [];
  activityData.timeline.forEach(group => {
    group.items.forEach(item => {
      items.push({
        title: item.event,
        meta: `${group.year} • ${item.date}`,
        badge: ''
      });
    });
  });

  list.innerHTML = items.map(item => createAdminItem(item)).join('');
}

function renderAboutList() {
  const list = document.getElementById('about-list');
  if (!list || !aboutData) return;

  let items = [];
  aboutData.experience.forEach(exp => {
    items.push({
      title: `${exp.company} — ${exp.role}`,
      meta: exp.period,
      badge: 'Experience'
    });
  });
  aboutData.leadership.forEach(lead => {
    items.push({
      title: `${lead.organization} — ${lead.role}`,
      meta: lead.details,
      badge: 'Leadership'
    });
  });

  list.innerHTML = items.map(item => createAdminItem(item)).join('');
}

function renderContactList() {
  const list = document.getElementById('contact-list');
  if (!list || !contactData) return;

  list.innerHTML = contactData.links.map(link => createAdminItem({
    title: link.label,
    meta: link.value,
    badge: link.type
  })).join('');
}

function renderHomePreview() {
  if (!homeData) return;

  // Populate hero form with current values
  const heroForm = document.getElementById('edit-hero-form');
  if (heroForm && homeData.hero) {
    document.getElementById('hero-firstname').value = homeData.hero.firstName || '';
    document.getElementById('hero-lastname').value = homeData.hero.lastName || '';
    document.getElementById('hero-subtitle').value = homeData.hero.subtitle || '';
    document.getElementById('hero-desc').value = homeData.hero.description || '';
  }

  // Show certifications
  const certsList = document.getElementById('home-certs-list');
  if (certsList && homeData.certifications) {
    certsList.innerHTML = homeData.certifications.map(cert => createAdminItem({
      title: cert.title,
      meta: cert.issuer,
      badge: 'Cert'
    })).join('');
  }
}

/**
 * Creates an admin list item HTML string.
 */
function createAdminItem({ title, meta, badge }) {
  return `
    <div class="admin-item">
      <div class="admin-item-info">
        <div class="admin-item-title">${escapeHTML(title)}</div>
        ${meta ? `<div class="admin-item-meta">${escapeHTML(meta)}</div>` : ''}
      </div>
      ${badge ? `<span class="admin-item-badge">${escapeHTML(badge)}</span>` : ''}
    </div>
  `;
}

/**
 * Escapes HTML special characters (duplicated from content-loader for standalone use).
 */
function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}


// ════════════════════════════════════════════════════════════
//  DROPDOWN POPULATORS
// ════════════════════════════════════════════════════════════

function populateProjectSections() {
  const select = document.getElementById('proj-section');
  if (!select || !projectsData) return;

  projectsData.sections.forEach(section => {
    const opt = document.createElement('option');
    opt.value = section.id;
    opt.textContent = section.title;
    select.appendChild(opt);
  });
}


// ════════════════════════════════════════════════════════════
//  FORM HANDLERS — Add new items and generate JSON
// ════════════════════════════════════════════════════════════

function setupForms() {
  // --- Add Project ---
  document.getElementById('add-project-form')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const sectionId = document.getElementById('proj-section').value;
    const section = projectsData.sections.find(s => s.id === sectionId);
    if (!section) {
      showToast('Please select a section', true);
      return;
    }

    const newItem = {
      id: slugify(document.getElementById('proj-title').value),
      label: document.getElementById('proj-label').value,
      labelType: document.getElementById('proj-label-type').value,
      title: document.getElementById('proj-title').value,
      description: document.getElementById('proj-desc').value,
      link: document.getElementById('proj-link').value,
      linkText: document.getElementById('proj-link-text').value
    };

    section.items.push(newItem);
    showJsonOutput('projects.json', projectsData);
    renderProjectsList();
    e.target.reset();
    showToast('Project added! Copy the JSON to save.');
  });

  // --- Add Writeup ---
  document.getElementById('add-writeup-form')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const severity = document.getElementById('wu-severity').value;
    const newItem = {
      id: slugify(document.getElementById('wu-title').value),
      label: document.getElementById('wu-label').value,
      labelType: document.getElementById('wu-label').value ? 'finding' : '',
      title: document.getElementById('wu-title').value,
      description: document.getElementById('wu-desc').value,
      severity: severity,
      severityClass: severity ? severity.toLowerCase() : '',
      link: document.getElementById('wu-link').value,
      linkText: document.getElementById('wu-link-text').value,
      date: document.getElementById('wu-date').value
    };

    writeupsData.items.push(newItem);
    showJsonOutput('writeups.json', writeupsData);
    renderWriteupsList();
    e.target.reset();
    showToast('Writeup added! Copy the JSON to save.');
  });

  // --- Add Activity ---
  document.getElementById('add-activity-form')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const yearValue = document.getElementById('act-year').value;
    const newItem = {
      id: slugify(document.getElementById('act-event').value),
      date: document.getElementById('act-date').value,
      event: document.getElementById('act-event').value,
      description: document.getElementById('act-desc').value
    };

    // Find existing year group or create new one
    let yearGroup = activityData.timeline.find(g => g.year === yearValue);
    if (!yearGroup) {
      yearGroup = { year: yearValue, items: [] };
      // Insert at beginning (most recent year first)
      activityData.timeline.unshift(yearGroup);
    }

    // Add to beginning of the year (most recent first)
    yearGroup.items.unshift(newItem);

    showJsonOutput('activity.json', activityData);
    renderActivityList();
    e.target.reset();
    showToast('Activity added! Copy the JSON to save.');
  });

  // --- Add Experience ---
  document.getElementById('add-experience-form')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const responsibilitiesText = document.getElementById('exp-responsibilities').value;
    const responsibilities = responsibilitiesText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const newExp = {
      id: slugify(document.getElementById('exp-company').value),
      company: document.getElementById('exp-company').value,
      role: document.getElementById('exp-role').value,
      period: document.getElementById('exp-period').value,
      responsibilities: responsibilities
    };

    aboutData.experience.unshift(newExp);
    showJsonOutput('about.json', aboutData);
    renderAboutList();
    e.target.reset();
    showToast('Experience added! Copy the JSON to save.');
  });

  // --- Add Contact Link ---
  document.getElementById('add-contact-form')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const newLink = {
      id: slugify(document.getElementById('contact-label').value),
      type: document.getElementById('contact-type').value,
      label: document.getElementById('contact-label').value,
      value: document.getElementById('contact-value').value,
      url: document.getElementById('contact-url').value,
      icon: document.getElementById('contact-icon').value
    };

    contactData.links.push(newLink);
    showJsonOutput('contact.json', contactData);
    renderContactList();
    e.target.reset();
    showToast('Contact link added! Copy the JSON to save.');
  });

  // --- Edit Hero ---
  document.getElementById('edit-hero-form')?.addEventListener('submit', (e) => {
    e.preventDefault();

    homeData.hero.firstName = document.getElementById('hero-firstname').value;
    homeData.hero.lastName = document.getElementById('hero-lastname').value;
    homeData.hero.subtitle = document.getElementById('hero-subtitle').value;
    homeData.hero.description = document.getElementById('hero-desc').value;

    showJsonOutput('home.json', homeData);
    showToast('Hero updated! Copy the JSON to save.');
  });

  // --- Add Certification ---
  document.getElementById('add-cert-form')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const newCert = {
      id: slugify(document.getElementById('cert-title').value),
      title: document.getElementById('cert-title').value,
      issuer: document.getElementById('cert-issuer').value,
      image: document.getElementById('cert-image').value
    };

    homeData.certifications.push(newCert);
    showJsonOutput('home.json', homeData);
    renderHomePreview();
    e.target.reset();
    showToast('Certification added! Copy the JSON to save.');
  });
}


// ════════════════════════════════════════════════════════════
//  JSON OUTPUT MODAL
// ════════════════════════════════════════════════════════════

let currentOutputFilename = '';
let currentOutputJson = '';
let currentOutputData = null;

function showJsonOutput(filename, data) {
  currentOutputFilename = filename;
  currentOutputData = data;
  currentOutputJson = JSON.stringify(data, null, 2);

  document.getElementById('output-filename').textContent = `content/${filename}`;
  document.getElementById('output-json').textContent = currentOutputJson;
  document.getElementById('output-modal').classList.add('active');

  // Update the deploy button state
  const deployBtn = document.getElementById('deploy-json-btn');
  if (deployBtn) {
    if (typeof isGitHubConfigured === 'function' && isGitHubConfigured()) {
      deployBtn.disabled = false;
      deployBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>
        </svg>
        Save & Deploy
      `;
    } else {
      deployBtn.disabled = true;
      deployBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>
        </svg>
        Save & Deploy (connect GitHub first)
      `;
    }
  }
}

function setupModal() {
  const modal = document.getElementById('output-modal');
  const overlay = document.getElementById('output-overlay');
  const closeBtn = document.getElementById('output-close');

  function closeModal() {
    modal.classList.remove('active');

    // Restore original modal content after GitHub setup
    setTimeout(() => {
      const header = modal.querySelector('.admin-output-header h3');
      if (header && header.textContent.includes('GitHub')) {
        // Will be restored next time showJsonOutput is called
      }
    }, 300);
  }

  closeBtn?.addEventListener('click', closeModal);
  overlay?.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Save & Deploy to GitHub
  document.getElementById('deploy-json-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('deploy-json-btn');
    if (!currentOutputFilename || !currentOutputData) return;

    // Disable button while saving
    btn.disabled = true;
    btn.innerHTML = `
      <svg class="spinner" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
      Deploying...
    `;

    const success = await saveAndDeploy(currentOutputFilename, currentOutputData);

    if (success) {
      btn.innerHTML = `✅ Deployed!`;
      setTimeout(() => {
        modal.classList.remove('active');
      }, 1500);
    } else {
      btn.disabled = false;
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>
        </svg>
        Retry Deploy
      `;
    }
  });

  // Copy to clipboard
  document.getElementById('copy-json-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(currentOutputJson).then(() => {
      showToast('✅ Copied to clipboard!');
    }).catch(() => {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = currentOutputJson;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast('✅ Copied to clipboard!');
    });
  });

  // Download as file
  document.getElementById('download-json-btn')?.addEventListener('click', () => {
    const blob = new Blob([currentOutputJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentOutputFilename;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📥 File downloaded! Place it in the content/ folder.');
  });

  // Initialize GitHub sync status
  if (typeof initSyncStatus === 'function') {
    initSyncStatus();
  }
}


// ════════════════════════════════════════════════════════════
//  UTILITIES
// ════════════════════════════════════════════════════════════

/**
 * Creates a URL-friendly slug from a string.
 * @param {string} text - Input text
 * @returns {string} Slugified version
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

/**
 * Shows a toast notification at the bottom-right.
 * @param {string} message - Text to display
 * @param {boolean} isError - If true, shows red error style
 */
function showToast(message, isError = false) {
  const toast = document.getElementById('admin-toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = 'admin-toast show' + (isError ? ' error' : '');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}
