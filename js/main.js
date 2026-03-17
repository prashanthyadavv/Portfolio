/**
 * Cyber-Nexus — Professional Interactivity
 * Focus: High-performance animations and smooth navigation
 */

(function () {
  'use strict';

  // --- Mobile Navigation ---
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      navToggle.classList.toggle('active');
    });

    // Close menu on link click
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        navToggle.classList.remove('active');
      });
    });
  }

  // --- Scroll Spy & Active Links ---
  const sections = document.querySelectorAll('section[id]');
  const navLinkElems = document.querySelectorAll('.nav-links a');

  function scrollSpy() {
    const scrollY = window.pageYOffset;

    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 100;
      const sectionId = current.getAttribute('id');

      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        document.querySelector('.nav-links a[href*=' + sectionId + ']')?.classList.add('active');
      } else {
        document.querySelector('.nav-links a[href*=' + sectionId + ']')?.classList.remove('active');
      }
    });
  }

  // --- Reveal on Scroll ---
  const revealElements = document.querySelectorAll('.card, .skill-group, .cert-card, .section-header, .section-title, .section-subtitle, .experience-item, .contact-item, .disclosure-content');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  revealElements.forEach(el => {
    revealObserver.observe(el);
  });

  // --- Navbar Background on Scroll ---
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.style.background = 'rgba(15, 23, 42, 0.85)';
      navbar.style.backdropFilter = 'blur(12px) saturate(180%)';
      navbar.style.webkitBackdropFilter = 'blur(12px) saturate(180%)';
      navbar.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
      navbar.style.boxShadow = '0 10px 30px -10px rgba(2, 6, 23, 1)';
    } else {
      navbar.style.background = 'transparent';
      navbar.style.backdropFilter = 'none';
      navbar.style.webkitBackdropFilter = 'none';
      navbar.style.borderBottom = 'none';
      navbar.style.boxShadow = 'none';
    }
    scrollSpy();
  });

  // --- Mouse-Tracking Spotlight Effect ---
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

  // --- Page Load State ---
  window.addEventListener('load', () => {
    document.body.classList.add('loaded');
    scrollSpy();
  });

  // --- Certificate Modal ---
  const certModal = document.getElementById('cert-modal');
  const certModalImg = document.getElementById('cert-modal-img');
  const certModalClose = document.getElementById('cert-modal-close');
  const certModalOverlay = certModal ? certModal.querySelector('.cert-modal-overlay') : null;

  if (certModal) {
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

    certModalClose.addEventListener('click', closeCertModal);
    certModalOverlay.addEventListener('click', closeCertModal);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && certModal.classList.contains('active')) {
        closeCertModal();
      }
    });
  }

})();
