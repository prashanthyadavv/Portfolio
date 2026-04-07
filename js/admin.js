/**
 * ============================================================
 *  ADMIN PANEL — JavaScript for Cybrito Content Manager V2
 * ============================================================
 */

'use strict';

let projectsData = null;
let writeupsData = null;
let activityData = null;
let aboutData = null;
let contactData = null;
let homeData = null;

let currentEditId = null;

async function initAdminPanel() {
  projectsData = await loadContent('projects.json');
  writeupsData = await loadContent('writeups.json');
  activityData = await loadContent('activity.json');
  aboutData = await loadContent('about.json');
  contactData = await loadContent('contact.json');
  homeData = await loadContent('home.json');

  renderProjectsList();
  renderWriteupsList();
  renderActivityList();
  renderAboutList();
  renderContactList();
  renderHomePreview();

  populateProjectSections();
  setupTabs();
  setupForms();
  setupModal();
  setupLivePreview();

  // Initialize Quill Editors
  window.quillProjectDesc = new Quill('#proj-desc', { theme: 'snow' });
  window.quillWriteupDesc = new Quill('#wu-desc', { theme: 'snow' });

  window.quillProjectDesc.on('text-change', () => updateLivePreview('projects'));
  window.quillWriteupDesc.on('text-change', () => updateLivePreview('writeups'));

  // Attach Media Upload Listeners
  document.getElementById('cert-image-file')?.addEventListener('change', async (e) => {
    try {
      showToast('Uploading Image to Backend...');
      const path = await handleImageUpload(e.target);
      if(path) {
        document.getElementById('cert-image').value = path;
        const preview = document.getElementById('image-preview');
        preview.src = path.startsWith('images') ? `/${path}` : path;
        document.getElementById('image-preview-container').style.display = 'block';
        showToast('✅ Image uploaded securely.');
        updateLivePreview('home');
      }
    } catch(err) {
      showToast(err.message, true);
    }
  });
}

function setupTabs() {
  const tabs = document.querySelectorAll('.admin-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // 🟢 Fix: Reset editing state to prevent accidentally overwriting an item across tabs
      currentEditId = null;
      document.querySelectorAll('.admin-form').forEach(f => f.reset());
      const pBtn = document.querySelector('#add-project-form button'); if(pBtn) pBtn.innerText = 'Add Project';
      const wBtn = document.querySelector('#add-writeup-form button'); if(wBtn) wBtn.innerText = 'Add Writeup';
      if (window.quillProjectDesc) window.quillProjectDesc.root.innerHTML = '';
      if (window.quillWriteupDesc) window.quillWriteupDesc.root.innerHTML = '';

      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
      tab.classList.add('active');
      const sectionId = 'section-' + tab.dataset.section;
      document.getElementById(sectionId).classList.add('active');
      updateLivePreview(tab.dataset.section);
    });
  });
  updateLivePreview('projects');
}

function renderProjectsList() {
  const list = document.getElementById('projects-list');
  if (!list || !projectsData) return;
  let items = [];
  projectsData.sections.forEach(section => {
    section.items.forEach(item => {
      items.push({
        id: item.id,
        section: 'projects',
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
    id: item.id,
    section: 'writeups',
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
        id: item.id,
        section: 'activity',
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
      id: exp.id,
      section: 'about_exp',
      title: `${exp.company} — ${exp.role}`,
      meta: exp.period,
      badge: 'Experience'
    });
  });
  list.innerHTML = items.map(item => createAdminItem(item)).join('');
}

function renderContactList() {
  const list = document.getElementById('contact-list');
  if (!list || !contactData) return;
  list.innerHTML = contactData.links.map(link => createAdminItem({
    id: link.id,
    section: 'contact',
    title: link.label,
    meta: link.value,
    badge: link.type
  })).join('');
}

function renderHomePreview() {
  if (!homeData) return;
  const heroForm = document.getElementById('edit-hero-form');
  if (heroForm && homeData.hero) {
    document.getElementById('hero-firstname').value = homeData.hero.firstName || '';
    document.getElementById('hero-lastname').value = homeData.hero.lastName || '';
    document.getElementById('hero-subtitle').value = homeData.hero.subtitle || '';
    document.getElementById('hero-desc').value = homeData.hero.description || '';
  }
  const certsList = document.getElementById('home-certs-list');
  if (certsList && homeData.certifications) {
    certsList.innerHTML = homeData.certifications.map(cert => createAdminItem({
      id: cert.id,
      section: 'certifications',
      title: cert.title,
      meta: cert.issuer,
      badge: 'Cert'
    })).join('');
  }
}

function createAdminItem({ id, section, title, meta, badge }) {
  if (!id) return ''; // Fallback
  return `
    <div class="admin-item" data-id="${id}" style="display: flex; justify-content: space-between; align-items: center;">
      <div class="drag-handle" style="cursor: grab; margin-right: 10px; color: #888;">☰</div>
      <div class="admin-item-info" style="flex: 1;">
        <div class="admin-item-title">${escapeHTML(title)}</div>
        ${meta ? `<div class="admin-item-meta">${escapeHTML(meta)}</div>` : ''}
      </div>
      <div>${badge ? `<span class="admin-item-badge">${escapeHTML(badge)}</span>` : ''}</div>
      <div class="admin-actions" style="display: flex; gap: 8px; margin-left: 15px;">
         <button type="button" class="btn btn-outline" style="font-size: 0.75rem; padding: 4px 8px;" onclick="editItem('${section}', '${id}')">✏️ Edit</button>
         <button type="button" class="btn btn-outline" style="font-size: 0.75rem; padding: 4px 8px; color: #f87171; border-color: rgba(248,113,113,0.3);" onclick="deleteItem('${section}', '${id}')">🗑️ Del</button>
      </div>
    </div>
  `;
}

function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

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

// Global CRUD Actions
window.editItem = function(section, id) {
  currentEditId = id;
  
  if (section === 'projects') {
    const proj = projectsData.sections.flatMap(s => s.items).find(i => i.id === id);
    if(proj) {
      // 🟢 Bug Fix: Set the correct section dropdown when editing
      let matchedSectionId = '';
      projectsData.sections.forEach(s => {
        if (s.items.some(i => i.id === id)) matchedSectionId = s.id;
      });
      const sectionSelect = document.getElementById('proj-section');
      if (sectionSelect && matchedSectionId) sectionSelect.value = matchedSectionId;

      document.getElementById('proj-title').value = proj.title;
      document.getElementById('proj-label').value = proj.label || '';
      document.getElementById('proj-label-type').value = proj.labelType || 'project';
      quillProjectDesc.root.innerHTML = proj.description || '';
      document.getElementById('proj-link').value = proj.link || '';
      document.getElementById('proj-link-text').value = proj.linkText || '';
      const submitBtn = document.querySelector('#add-project-form button');
      submitBtn.innerText = "🚀 Update Project";
    }
  } else if (section === 'writeups') {
    const item = writeupsData.items.find(i => i.id === id);
    if(item) {
      document.getElementById('wu-title').value = item.title;
      document.getElementById('wu-label').value = item.label || '';
      quillWriteupDesc.root.innerHTML = item.description || '';
      document.getElementById('wu-severity').value = item.severity || '';
      document.getElementById('wu-date').value = item.date || '';
      document.getElementById('wu-link').value = item.link || '';
      document.getElementById('wu-link-text').value = item.linkText || '';
      const submitBtn = document.querySelector('#add-writeup-form button');
      if (submitBtn) submitBtn.innerText = "🚀 Update Writeup";
    }
  } else if (section === 'activity') {
    const group = activityData.timeline.find(g => g.items.some(i => i.id === id));
    if (group) {
        const item = group.items.find(i => i.id === id);
        document.getElementById('act-year').value = group.year;
        document.getElementById('act-date').value = item.date;
        document.getElementById('act-event').value = item.event;
        document.getElementById('act-desc').value = item.description || '';
        const submitBtn = document.querySelector('#add-activity-form button');
        if (submitBtn) submitBtn.innerText = "🚀 Update Activity";
    }
  } else if (section === 'about_exp') {
    const item = aboutData.experience.find(i => i.id === id);
    if (item) {
        document.getElementById('exp-company').value = item.company;
        document.getElementById('exp-role').value = item.role;
        document.getElementById('exp-period').value = item.period;
        document.getElementById('exp-responsibilities').value = (item.responsibilities || []).join('\n');
        const submitBtn = document.querySelector('#add-experience-form button');
        if (submitBtn) submitBtn.innerText = "🚀 Update Experience";
    }
  } else if (section === 'contact') {
    const item = contactData.links.find(i => i.id === id);
    if (item) {
        document.getElementById('contact-label').value = item.label;
        document.getElementById('contact-icon').value = item.icon || 'email';
        document.getElementById('contact-value').value = item.value;
        document.getElementById('contact-url').value = item.url;
        document.getElementById('contact-type').value = item.type || 'external';
        const submitBtn = document.querySelector('#add-contact-form button');
        if (submitBtn) submitBtn.innerText = "🚀 Update Link";
    }
  }
}

window.deleteItem = async function(section, id) {
  if (!confirm("🚨 Are you sure you want to delete this permanently?")) return;
  
  // 🟡 Bug Fix: Prevent Ghost Deletions with State Rollback
  if (section === 'projects') {
    const backup = JSON.parse(JSON.stringify(projectsData));
    projectsData.sections.forEach(s => { s.items = s.items.filter(i => i.id !== id); });
    const success = await saveAndDeploy('projects.json', projectsData);
    if (!success) projectsData = backup;
    renderProjectsList();
  } else if (section === 'writeups') {
    const backup = JSON.parse(JSON.stringify(writeupsData));
    writeupsData.items = writeupsData.items.filter(i => i.id !== id);
    const success = await saveAndDeploy('writeups.json', writeupsData);
    if (!success) writeupsData = backup;
    renderWriteupsList();
  } else if (section === 'activity') {
    const backup = JSON.parse(JSON.stringify(activityData));
    activityData.timeline.forEach(s => { s.items = s.items.filter(i => i.id !== id); });
    const success = await saveAndDeploy('activity.json', activityData);
    if (!success) activityData = backup;
    renderActivityList();
  } else if (section === 'about_exp') {
    const backup = JSON.parse(JSON.stringify(aboutData));
    aboutData.experience = aboutData.experience.filter(i => i.id !== id);
    const success = await saveAndDeploy('about.json', aboutData);
    if (!success) aboutData = backup;
    renderAboutList();
  } else if (section === 'contact') {
    const backup = JSON.parse(JSON.stringify(contactData));
    contactData.links = contactData.links.filter(i => i.id !== id);
    const success = await saveAndDeploy('contact.json', contactData);
    if (!success) contactData = backup;
    renderContactList();
  } else if (section === 'certifications') {
    const backup = JSON.parse(JSON.stringify(homeData));
    homeData.certifications = homeData.certifications.filter(i => i.id !== id);
    const success = await saveAndDeploy('home.json', homeData);
    if (!success) homeData = backup;
    renderHomePreview();
  }
}

function setupForms() {
  document.getElementById('add-project-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    // 🟢 Improvement: Visual feedback and unclickable states
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.innerText = "⏳ Saving...";
    submitBtn.disabled = true;

    try {
      const sectionId = document.getElementById('proj-section').value;
      const section = projectsData.sections.find(s => s.id === sectionId);
      if (!section) return showToast('Please select a section', true);

      const descHTML = quillProjectDesc.root.innerHTML;
      const title = document.getElementById('proj-title').value;

      // 🟡 Bug Fix: Secure Unique ID Generation
      const safeTitle = title.trim() || 'untitled';
      const modifiedItem = {
        id: currentEditId ? currentEditId : slugify(safeTitle) + '-' + Math.random().toString(36).substr(2, 6) + Date.now().toString().slice(-4),
        label: document.getElementById('proj-label').value,
        labelType: document.getElementById('proj-label-type').value,
        title: title,
        description: descHTML,
        link: document.getElementById('proj-link').value,
        linkText: document.getElementById('proj-link-text').value
      };

      const backup = JSON.parse(JSON.stringify(projectsData));

      if (currentEditId) {
         // 🟡 Bug Fix: Move items smoothly between categories
         projectsData.sections.forEach(s => {
           s.items = s.items.filter(i => i.id !== currentEditId);
         });
         section.items.push(modifiedItem);
         currentEditId = null; 
      } else {
         section.items.push(modifiedItem);
      }
      
      const success = await saveAndDeploy('projects.json', projectsData);
      if (success) {
        e.target.reset();
        quillProjectDesc.root.innerHTML = '';
      } else {
        projectsData = backup;
      }
      renderProjectsList();
    } finally {
      submitBtn.innerText = "Add Project";
      submitBtn.disabled = false;
    }
  });

  document.getElementById('add-cert-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.innerText = "⏳ Saving...";
    submitBtn.disabled = true;

    try {
      const title = document.getElementById('cert-title').value;
      const safeTitle = title.trim() || 'untitled';
      const newCert = {
        id: slugify(safeTitle) + '-' + Math.random().toString(36).substr(2, 6) + Date.now().toString().slice(-4),
        title: title,
        issuer: document.getElementById('cert-issuer').value,
        image: document.getElementById('cert-image').value
      };

      const backup = JSON.parse(JSON.stringify(homeData));
      homeData.certifications.push(newCert);

      const success = await saveAndDeploy('home.json', homeData);
      if (success) {
        e.target.reset();
        document.getElementById('image-preview-container').style.display = 'none';
      } else {
        homeData = backup;
      }
      renderHomePreview();
    } finally {
      submitBtn.innerText = "Add Certification";
      submitBtn.disabled = false;
    }
  });

  // ====== 🟢 Bug Fix: Adding Missing Submit Handlers (Writeups, Activity, Experiemce, Contact) ======
  document.getElementById('add-writeup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.innerText = "⏳ Saving...";
    submitBtn.disabled = true;

    try {
      const title = document.getElementById('wu-title').value;
      const safeTitle = title.trim() || 'untitled';
      let sevClass = '';
      const sev = document.getElementById('wu-severity').value;
      if(sev === 'Critical' || sev === 'High') sevClass = 'high';
      else if(sev === 'Medium') sevClass = 'medium';
      else if(sev === 'Low' || sev === 'Informational') sevClass = 'low';

      const modifiedItem = {
        id: currentEditId ? currentEditId : slugify(safeTitle) + '-' + Math.random().toString(36).substr(2, 6) + Date.now().toString().slice(-4),
        title: title,
        label: document.getElementById('wu-label').value,
        labelType: 'finding',
        description: quillWriteupDesc.root.innerHTML,
        severity: sev,
        severityClass: sevClass,
        date: document.getElementById('wu-date').value,
        link: document.getElementById('wu-link').value,
        linkText: document.getElementById('wu-link-text').value
      };

      const backup = JSON.parse(JSON.stringify(writeupsData));
      if (currentEditId) {
         writeupsData.items = writeupsData.items.filter(i => i.id !== currentEditId);
         currentEditId = null; 
      }
      writeupsData.items.unshift(modifiedItem);

      const success = await saveAndDeploy('writeups.json', writeupsData);
      if (success) {
        e.target.reset();
        quillWriteupDesc.root.innerHTML = '';
      } else {
        writeupsData = backup;
      }
      renderWriteupsList();
    } finally {
      submitBtn.innerText = "Add Writeup";
      submitBtn.disabled = false;
    }
  });

  document.getElementById('add-activity-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.innerText = "⏳ Saving...";
    submitBtn.disabled = true;

    try {
      const year = document.getElementById('act-year').value.trim();
      const modifiedItem = {
        id: currentEditId ? currentEditId : 'act-' + Math.random().toString(36).substr(2, 6),
        date: document.getElementById('act-date').value,
        event: document.getElementById('act-event').value,
        description: document.getElementById('act-desc').value
      };

      const backup = JSON.parse(JSON.stringify(activityData));
      
      let yearGroup = activityData.timeline.find(g => g.year === year);
      
      if (currentEditId) {
         activityData.timeline.forEach(g => {
             g.items = g.items.filter(i => i.id !== currentEditId);
         });
         currentEditId = null; 
      }
      
      if (!yearGroup) {
          yearGroup = { year: year, items: [] };
          activityData.timeline.unshift(yearGroup);
          // sort descending by year
          activityData.timeline.sort((a,b) => parseInt(b.year) - parseInt(a.year));
      }
      yearGroup.items.unshift(modifiedItem);

      const success = await saveAndDeploy('activity.json', activityData);
      if (success) e.target.reset();
      else activityData = backup;
      renderActivityList();
    } finally {
      submitBtn.innerText = "Add Activity";
      submitBtn.disabled = false;
    }
  });

  document.getElementById('add-experience-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.innerText = "⏳ Saving...";
    submitBtn.disabled = true;

    try {
      const modifiedItem = {
        id: currentEditId ? currentEditId : 'exp-' + Math.random().toString(36).substr(2, 6),
        company: document.getElementById('exp-company').value,
        role: document.getElementById('exp-role').value,
        period: document.getElementById('exp-period').value,
        responsibilities: document.getElementById('exp-responsibilities').value.split('\n').map(s=>s.trim()).filter(s=>s)
      };

      const backup = JSON.parse(JSON.stringify(aboutData));
      if (currentEditId) {
         aboutData.experience = aboutData.experience.filter(i => i.id !== currentEditId);
         currentEditId = null; 
      }
      aboutData.experience.push(modifiedItem);

      const success = await saveAndDeploy('about.json', aboutData);
      if (success) e.target.reset();
      else aboutData = backup;
      renderAboutList();
    } finally {
      submitBtn.innerText = "Add Experience";
      submitBtn.disabled = false;
    }
  });

  document.getElementById('add-contact-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.innerText = "⏳ Saving...";
    submitBtn.disabled = true;

    try {
      const modifiedItem = {
        id: currentEditId ? currentEditId : 'link-' + Math.random().toString(36).substr(2, 6),
        label: document.getElementById('contact-label').value,
        icon: document.getElementById('contact-icon').value,
        value: document.getElementById('contact-value').value,
        url: document.getElementById('contact-url').value,
        type: document.getElementById('contact-type').value
      };

      const backup = JSON.parse(JSON.stringify(contactData));
      if (currentEditId) {
         contactData.links = contactData.links.filter(i => i.id !== currentEditId);
         currentEditId = null; 
      }
      contactData.links.push(modifiedItem);

      const success = await saveAndDeploy('contact.json', contactData);
      if (success) e.target.reset();
      else contactData = backup;
      renderContactList();
    } finally {
      submitBtn.innerText = "Add Contact Link";
      submitBtn.disabled = false;
    }
  });
  // ==============================================================================
  document.getElementById('edit-hero-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.innerText = "⏳ Saving...";
    submitBtn.disabled = true;

    try {
      const backup = JSON.parse(JSON.stringify(homeData));
      homeData.hero.firstName = document.getElementById('hero-firstname').value;
      homeData.hero.lastName = document.getElementById('hero-lastname').value;
      homeData.hero.subtitle = document.getElementById('hero-subtitle').value;
      homeData.hero.description = document.getElementById('hero-desc').value;
      
      const success = await saveAndDeploy('home.json', homeData);
      if (!success) {
        homeData = backup;
      }
    } finally {
      submitBtn.innerText = "Update Hero";
      submitBtn.disabled = false;
    }
  });
}

function setupModal() {
  const modal = document.getElementById('output-modal');
  document.getElementById('output-close')?.addEventListener('click', () => modal.classList.remove('active'));
}

async function handleImageUpload(fileInput) {
  const file = fileInput.files[0];
  if (!file) return null;
  const base64Data = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
  const pwd = sessionStorage.getItem('admin_password');
  const res = await fetch('/api/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pwd}` },
    body: JSON.stringify({ filename: file.name, base64Data })
  });
  const data = await res.json();
  if(!data.success) throw new Error("Upload Failed: " + data.error);
  return data.path;
}

function setupLivePreview() {
  const formFieldMap = {
    'projects': ['proj-section', 'proj-title', 'proj-label', 'proj-desc', 'proj-link'],
    'home': ['hero-firstname', 'hero-lastname', 'hero-desc', 'cert-title']
  };
  Object.entries(formFieldMap).forEach(([section, fieldIds]) => {
    fieldIds.forEach(fieldId => {
      const el = document.getElementById(fieldId);
      if (el) el.addEventListener('input', () => updateLivePreview(section));
    });
  });
}

function updateLivePreview(section) {
  const pb = document.getElementById('preview-body');
  if(!pb) return;
  if(section === 'projects') {
    // 🔴 Security Fix: Escape HTML in Title to prevent DOM XSS
    const safeTitle = escapeHTML(document.getElementById('proj-title')?.value || 'Title');
    pb.innerHTML = `<div class="card"><h3>${safeTitle}</h3><div>${window.quillProjectDesc?.root.innerHTML || ''}</div></div>`;
  }
}

function slugify(text) { return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').substring(0, 50); }
function showToast(message, isError = false) {
  const toast = document.getElementById('admin-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'admin-toast show' + (isError ? ' error' : '');
  setTimeout(() => toast.classList.remove('show'), 3000);
}
