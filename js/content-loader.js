/**
 * ============================================================
 *  CONTENT LOADER — Dynamic CMS for Cybrito Portfolio
 * ============================================================
 *
 *  This module fetches JSON data from the /content/ folder
 *  and renders HTML into the page dynamically.
 *
 *  HOW TO USE:
 *  1. Edit the JSON files inside /content/ to change content.
 *  2. Each page calls ONE render function on DOMContentLoaded.
 *  3. No HTML editing is needed to add/remove items.
 *
 *  HEADLESS CMS INTEGRATION:
 *  To hook this up to Netlify CMS, Contentful, or similar,
 *  simply replace the fetch() URLs with your CMS API endpoint.
 *  The rest of the rendering logic stays the same.
 *
 * ============================================================
 */

'use strict';

// ─── UTILITY: Fetch JSON from /content/ folder ────────────────

/**
 * Loads a JSON file from the content directory.
 * @param {string} filename - Name of the JSON file (e.g. "projects.json")
 * @returns {Promise<Object>} Parsed JSON data
 */
async function loadContent(filename) {
  try {
    // Use absolute path from site root — works on localhost,
    // Vercel, GitHub Pages, Netlify, and any static host.
    const response = await fetch('/content/' + filename);

    // Check for errors (e.g. 404 file not found)
    if (!response.ok) {
      throw new Error(`Failed to load ${filename}: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[Content Loader]', error.message);
    return null; // Return null so pages can show a fallback
  }
}


// ─── SVG ICONS (used across multiple renderers) ────────────────

const ICONS = {
  shield: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>`,

  email: `<svg viewBox="0 0 24 24">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M22 4l-10 8L2 4" />
  </svg>`,

  github: `<svg viewBox="0 0 24 24">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>`,

  linkedin: `<svg viewBox="0 0 24 24">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>`
};


// ─── HELPER: Safely escape HTML to prevent XSS ────────────────

/**
 * Escapes special characters to prevent XSS when inserting user content.
 * @param {string} str - Raw string
 * @returns {string} HTML-safe string
 */
function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}


// ════════════════════════════════════════════════════════════════
//  PAGE RENDERERS — One function per page
// ════════════════════════════════════════════════════════════════


// ─── HOME PAGE (index.html) ───────────────────────────────────

async function renderHomePage() {
  const data = await loadContent('home.json');
  if (!data) return; // Fallback: static HTML stays visible

  // --- Hero Section ---
  const heroSection = document.getElementById('home');
  if (heroSection && data.hero) {
    const h = data.hero;
    heroSection.querySelector('.hero-content').innerHTML = `
      <h1>${escapeHTML(h.firstName)}<span>${escapeHTML(h.lastName)}</span></h1>
      <p class="subtitle">${escapeHTML(h.subtitle)}</p>
      <p class="description">${escapeHTML(h.description)}</p>
      <div class="hero-actions">
        <a href="${escapeHTML(h.ctaPrimary.link)}" class="btn btn-primary">${escapeHTML(h.ctaPrimary.text)}</a>
        <a href="${escapeHTML(h.ctaSecondary.link)}" class="btn btn-outline">${escapeHTML(h.ctaSecondary.text)}</a>
      </div>
    `;
  }

  // --- About Section (Home) ---
  const aboutSection = document.getElementById('about');
  if (aboutSection && data.about) {
    const cardEl = aboutSection.querySelector('.card');
    if (cardEl) {
      cardEl.innerHTML = data.about.paragraphs
        .map(p => `<p>${escapeHTML(p)}</p>`)
        .join('<br>');
    }
  }

  // --- Skills Section (Home) ---
  const skillsSection = document.getElementById('skills');
  if (skillsSection && data.skills) {
    const grid = skillsSection.querySelector('.skills-grid');
    if (grid) {
      grid.innerHTML = data.skills.map(group => `
        <div class="skill-group">
          <h3>${escapeHTML(group.category)}</h3>
          <div class="skill-tags">
            ${group.tags.map(tag => `<span class="skill-tag">${escapeHTML(tag)}</span>`).join('')}
          </div>
        </div>
      `).join('');
    }
  }

  // --- Featured Projects Section (Home) ---
  const projectsSection = document.getElementById('projects');
  if (projectsSection && data.featuredProjects) {
    const grid = projectsSection.querySelector('.card-grid');
    if (grid) {
      grid.innerHTML = data.featuredProjects.map(p => `
        <div class="card">
          <span class="card-label">${escapeHTML(p.label)}</span>
          <h3>${escapeHTML(p.title)}</h3>
          <p>${escapeHTML(p.description)}</p>
          ${p.link ? `<a href="${escapeHTML(p.link)}" class="card-link">${escapeHTML(p.linkText)}</a>` : ''}
        </div>
      `).join('');
    }
  }

  // --- Certifications Section (Home) ---
  const certsSection = document.getElementById('certs');
  if (certsSection && data.certifications) {
    const grid = certsSection.querySelector('.cert-grid');
    if (grid) {
      grid.innerHTML = data.certifications.map(cert => `
        <div class="cert-card" data-cert="${escapeHTML(cert.image)}" role="button" tabindex="0">
          <div class="cert-icon">${ICONS.shield}</div>
          <div class="cert-info">
            <h3>${escapeHTML(cert.title)}</h3>
            <p>${escapeHTML(cert.issuer)}</p>
          </div>
          <span class="cert-view-hint">Click to view →</span>
        </div>
      `).join('');

      // Re-attach cert modal listeners after dynamic rendering
      initCertModal();
    }
  }

  // Re-attach reveal observers for dynamically created elements
  initRevealObservers();
  initCardSpotlight();
}


// ─── PROJECTS PAGE (projects.html) ────────────────────────────

async function renderProjectsPage() {
  const data = await loadContent('projects.json');
  if (!data) return;

  const container = document.getElementById('projects-content');
  if (!container) return;

  // Set page header text
  const header = document.querySelector('.page-header');
  if (header) {
    header.querySelector('h1').textContent = data.pageTitle;
    header.querySelector('p').textContent = data.pageDescription;
  }

  // Render each section (Technical Projects, Internship Findings, etc.)
  container.innerHTML = data.sections.map(section => `
    <section class="section">
      <h2 class="section-title">${escapeHTML(section.title)}</h2>
      ${section.subtitle ? `<p class="section-subtitle">${escapeHTML(section.subtitle)}</p>` : ''}
      <div class="card-grid">
        ${section.items.map(item => `
          <div class="card">
            <span class="card-label ${escapeHTML(item.labelType)}">${escapeHTML(item.label)}</span>
            <h3>${escapeHTML(item.title)}</h3>
            <p>${escapeHTML(item.description)}</p>
            ${item.link ? `<a href="${escapeHTML(item.link)}" class="card-link">${escapeHTML(item.linkText)}</a>` : ''}
          </div>
        `).join('')}
      </div>
    </section>
  `).join('');

  initRevealObservers();
  initCardSpotlight();
}


// ─── WRITEUPS PAGE (writeups.html) ────────────────────────────

async function renderWriteupsPage() {
  const data = await loadContent('writeups.json');
  if (!data) return;

  const container = document.getElementById('writeups-content');
  if (!container) return;

  // Set page header text
  const header = document.querySelector('.page-header');
  if (header) {
    header.querySelector('h1').textContent = data.pageTitle;
    header.querySelector('p').textContent = data.pageDescription;
  }

  // Render writeup cards
  container.innerHTML = `
    <section class="section">
      <div class="card-grid">
        ${data.items.map(item => `
          <div class="card">
            ${item.label ? `<span class="card-label ${escapeHTML(item.labelType)}">${escapeHTML(item.label)}</span>` : ''}
            <h3>${escapeHTML(item.title)}</h3>
            ${item.date ? `<p class="writeup-date">${escapeHTML(item.date)}</p>` : ''}
            <p>${escapeHTML(item.description)}</p>
            ${item.severity ? `
              <div style="margin-bottom: 0.75rem;">
                <span class="severity ${escapeHTML(item.severityClass)}">${escapeHTML(item.severity)} Severity</span>
              </div>
            ` : ''}
            ${item.link ? `<a href="${escapeHTML(item.link)}" class="card-link">${escapeHTML(item.linkText)}</a>` : ''}
          </div>
        `).join('')}
      </div>
    </section>
  `;

  initRevealObservers();
  initCardSpotlight();
}


// ─── ACTIVITY PAGE (activity.html) ────────────────────────────

async function renderActivityPage() {
  const data = await loadContent('activity.json');
  if (!data) return;

  const container = document.getElementById('activity-content');
  if (!container) return;

  // Set page header text
  const header = document.querySelector('.page-header');
  if (header) {
    header.querySelector('h1').textContent = data.pageTitle;
    header.querySelector('p').textContent = data.pageDescription;
  }

  // Render timeline
  let timelineHTML = '<div class="timeline">';

  data.timeline.forEach(yearGroup => {
    // Year label
    timelineHTML += `<div class="timeline-year">${escapeHTML(yearGroup.year)}</div>`;

    // Items for this year
    yearGroup.items.forEach(item => {
      timelineHTML += `
        <div class="timeline-item">
          <p class="date">${escapeHTML(item.date)}</p>
          <p class="event">${escapeHTML(item.event)}</p>
          ${item.description ? `<p>${escapeHTML(item.description)}</p>` : ''}
        </div>
      `;
    });
  });

  timelineHTML += '</div>';
  container.innerHTML = timelineHTML;

  // Re-initialize timeline animations
  initTimelineAnimations();
  initRevealObservers();
}


// ─── ABOUT PAGE (about.html) ─────────────────────────────────

async function renderAboutPage() {
  const data = await loadContent('about.json');
  if (!data) return;

  const container = document.getElementById('about-content');
  if (!container) return;

  // Set page header text
  const header = document.querySelector('.page-header');
  if (header) {
    header.querySelector('h1').textContent = data.pageTitle;
    header.querySelector('p').textContent = data.pageDescription;
  }

  let html = '';

  // Professional Summary
  html += `
    <section class="section">
      <h2 class="section-title">Professional Summary</h2>
      ${data.summary.map(p => `<p>${escapeHTML(p)}</p>`).join('')}
    </section>
  `;

  // Experience
  html += `
    <section class="section">
      <h2 class="section-title">Experience</h2>
      ${data.experience.map(exp => `
        <div class="experience-item">
          <h3>${escapeHTML(exp.company)}</h3>
          <p class="role">${escapeHTML(exp.role)}</p>
          <p class="period">${escapeHTML(exp.period)}</p>
          <ul>
            ${exp.responsibilities.map(r => `<li>${escapeHTML(r)}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
    </section>
  `;

  // Leadership
  html += `
    <section class="section">
      <h2 class="section-title">Leadership</h2>
      ${data.leadership.map(lead => `
        <div class="experience-item">
          <h3>${escapeHTML(lead.organization)}</h3>
          <p class="role">${escapeHTML(lead.role)}</p>
          <p class="period">${escapeHTML(lead.details)}</p>
          <ul>
            ${lead.responsibilities.map(r => `<li>${escapeHTML(r)}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
    </section>
  `;

  // Technical Skills
  html += `
    <section class="section">
      <h2 class="section-title">Technical Skills</h2>
      <div class="skills-grid">
        ${data.skills.map(group => `
          <div class="skill-group">
            <h3>${escapeHTML(group.category)}</h3>
            <div class="skill-tags">
              ${group.tags.map(tag => `<span class="skill-tag">${escapeHTML(tag)}</span>`).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `;

  container.innerHTML = html;

  initRevealObservers();
}


// ─── CONTACT PAGE (contact.html) ──────────────────────────────

async function renderContactPage() {
  const data = await loadContent('contact.json');
  if (!data) return;

  const container = document.getElementById('contact-content');
  if (!container) return;

  // Set page header text
  const header = document.querySelector('.page-header');
  if (header) {
    header.querySelector('h1').textContent = data.pageTitle;
    header.querySelector('p').textContent = data.pageDescription;
  }

  // Render contact links
  container.innerHTML = `
    <section class="section">
      <div class="contact-links">
        ${data.links.map(link => `
          <a href="${escapeHTML(link.url)}" class="contact-item"
             ${link.type === 'external' ? 'target="_blank" rel="noopener noreferrer"' : ''}>
            <div class="contact-icon">
              ${ICONS[link.icon] || ''}
            </div>
            <div class="contact-info">
              <p class="label">${escapeHTML(link.label)}</p>
              <p class="value">${escapeHTML(link.value)}</p>
            </div>
          </a>
        `).join('')}
      </div>
    </section>
  `;

  initRevealObservers();
}


// ─── DISCLOSURE PAGE (disclosure.html) ────────────────────────

async function renderDisclosurePage() {
  const data = await loadContent('disclosure.json');
  if (!data) return;

  const container = document.getElementById('disclosure-content');
  if (!container) return;

  // Set page header text
  const header = document.querySelector('.page-header');
  if (header) {
    header.querySelector('h1').textContent = data.pageTitle;
    header.querySelector('p').textContent = data.pageDescription;
  }

  // Render disclosure sections
  container.innerHTML = `
    <section class="section">
      <div class="disclosure-content">
        ${data.sections.map(section => `
          <h2>${escapeHTML(section.title)}</h2>
          <p>${escapeHTML(section.content)}</p>
          ${section.listItems && section.listItems.length > 0 ? `
            <ul>
              ${section.listItems.map(item => `<li>${escapeHTML(item)}</li>`).join('')}
            </ul>
          ` : ''}
        `).join('')}
      </div>
    </section>
  `;

  initRevealObservers();
}


// ════════════════════════════════════════════════════════════════
//  SHARED UTILITIES — Animation re-initialization after render
// ════════════════════════════════════════════════════════════════

/**
 * Re-attaches IntersectionObserver-based reveal animations
 * after content is dynamically rendered.
 */
function initRevealObservers() {
  const revealElements = document.querySelectorAll(
    '.card, .skill-group, .cert-card, .section-header, .section-title, ' +
    '.section-subtitle, .experience-item, .contact-item, .disclosure-content'
  );

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  revealElements.forEach(el => observer.observe(el));
}

/**
 * Re-attaches mouse-tracking spotlight effect on cards.
 */
function initCardSpotlight() {
  const cards = document.querySelectorAll('.card');
  cards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });
}

/**
 * Re-initializes timeline scroll animations (activity page).
 */
function initTimelineAnimations() {
  const timeline = document.querySelector('.timeline');
  if (!timeline) return;

  // Draw the gradient line when timeline enters viewport
  const lineObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('line-drawn');
        lineObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.05 });

  lineObserver.observe(timeline);

  // Staggered entrance for years & items
  const items = document.querySelectorAll('.timeline-year, .timeline-item');
  const itemObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        itemObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  items.forEach((el, i) => {
    el.style.transitionDelay = (i * 0.08) + 's';
    itemObserver.observe(el);
  });
}

/**
 * Re-initializes cert modal click handlers after dynamic rendering.
 */
function initCertModal() {
  const certModal = document.getElementById('cert-modal');
  const certModalImg = document.getElementById('cert-modal-img');
  const certModalClose = document.getElementById('cert-modal-close');
  const certModalOverlay = certModal ? certModal.querySelector('.cert-modal-overlay') : null;

  if (!certModal) return;

  // Open modal when cert-card is clicked
  document.querySelectorAll('.cert-card[data-cert]').forEach(card => {
    card.addEventListener('click', () => {
      const certSrc = card.getAttribute('data-cert');
      const certName = card.querySelector('h3')?.textContent || 'Certificate';
      certModalImg.src = certSrc;
      certModalImg.alt = certName;
      certModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });

    // Keyboard support
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });

  // Close modal
  function closeCertModal() {
    certModal.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(() => { certModalImg.src = ''; }, 350);
  }

  if (certModalClose) certModalClose.addEventListener('click', closeCertModal);
  if (certModalOverlay) certModalOverlay.addEventListener('click', closeCertModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && certModal.classList.contains('active')) {
      closeCertModal();
    }
  });
}
