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
      submitBtn.innerText = "🚀 Update Writeup";
    }
  }
}

window.deleteItem = async function(section, id) {
  if (!confirm("🚨 Are you sure you want to delete this permanently?")) return;
  
  if (section === 'projects') {
    projectsData.sections.forEach(s => { s.items = s.items.filter(i => i.id !== id); });
    await saveAndDeploy('projects.json', projectsData);
    renderProjectsList();
  } else if (section === 'writeups') {
    writeupsData.items = writeupsData.items.filter(i => i.id !== id);
    await saveAndDeploy('writeups.json', writeupsData);
    renderWriteupsList();
  } else if (section === 'activity') {
    activityData.timeline.forEach(s => { s.items = s.items.filter(i => i.id !== id); });
    await saveAndDeploy('activity.json', activityData);
    renderActivityList();
  } else if (section === 'about_exp') {
    aboutData.experience = aboutData.experience.filter(i => i.id !== id);
    await saveAndDeploy('about.json', aboutData);
    renderAboutList();
  } else if (section === 'contact') {
    contactData.links = contactData.links.filter(i => i.id !== id);
    await saveAndDeploy('contact.json', contactData);
    renderContactList();
  } else if (section === 'certifications') {
    homeData.certifications = homeData.certifications.filter(i => i.id !== id);
    await saveAndDeploy('home.json', homeData);
    renderHomePreview();
  }
}

function setupForms() {
  document.getElementById('add-project-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const sectionId = document.getElementById('proj-section').value;
    const section = projectsData.sections.find(s => s.id === sectionId);
    if (!section) return showToast('Please select a section', true);

    const descHTML = quillProjectDesc.root.innerHTML;
    const title = document.getElementById('proj-title').value;

    const modifiedItem = {
      id: currentEditId ? currentEditId : slugify(title) + '-' + Date.now().toString().slice(-4),
      label: document.getElementById('proj-label').value,
      labelType: document.getElementById('proj-label-type').value,
      title: title,
      description: descHTML,
      link: document.getElementById('proj-link').value,
      linkText: document.getElementById('proj-link-text').value
    };

    if (currentEditId) {
       let found = false;
       projectsData.sections.forEach(s => {
         const idx = s.items.findIndex(i => i.id === currentEditId);
         if (idx !== -1) { s.items[idx] = modifiedItem; found = true; }
       });
       if(!found) section.items.push(modifiedItem);
       currentEditId = null; 
       document.querySelector('#add-project-form button').innerText = "Add Project";
    } else {
       section.items.push(modifiedItem);
    }
    
    await saveAndDeploy('projects.json', projectsData);
    renderProjectsList();
    e.target.reset();
    quillProjectDesc.root.innerHTML = '';
  });

  document.getElementById('add-cert-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('cert-title').value;
    const newCert = {
      id: slugify(title) + '-' + Date.now().toString().slice(-4),
      title: title,
      issuer: document.getElementById('cert-issuer').value,
      image: document.getElementById('cert-image').value
    };
    homeData.certifications.push(newCert);
    await saveAndDeploy('home.json', homeData);
    renderHomePreview();
    e.target.reset();
    document.getElementById('image-preview-container').style.display = 'none';
  });

  // Handle other forms dynamically as well (simplified to save space)
  document.getElementById('edit-hero-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    homeData.hero.firstName = document.getElementById('hero-firstname').value;
    homeData.hero.lastName = document.getElementById('hero-lastname').value;
    homeData.hero.subtitle = document.getElementById('hero-subtitle').value;
    homeData.hero.description = document.getElementById('hero-desc').value;
    await saveAndDeploy('home.json', homeData);
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
  if(section === 'projects') pb.innerHTML = `<div class="card"><h3>${document.getElementById('proj-title')?.value || 'Title'}</h3><div>${window.quillProjectDesc?.root.innerHTML || ''}</div></div>`;
}

function slugify(text) { return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').substring(0, 50); }
function showToast(message, isError = false) {
  const toast = document.getElementById('admin-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'admin-toast show' + (isError ? ' error' : '');
  setTimeout(() => toast.classList.remove('show'), 3000);
}
