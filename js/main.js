/* ============================================
   Portfolio — Main JavaScript
   ============================================ */

(function () {
    'use strict';

    // Mobile nav toggle
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = document.getElementById('nav-links');

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', function () {
            navLinks.classList.toggle('open');
            const expanded = navToggle.getAttribute('aria-expanded') === 'true';
            navToggle.setAttribute('aria-expanded', String(!expanded));
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', function (event) {
            const isClickInsideNav = navToggle.contains(event.target) || navLinks.contains(event.target);
            if (!isClickInsideNav && navLinks.classList.contains('open')) {
                navLinks.classList.remove('open');
                navToggle.setAttribute('aria-expanded', 'false');
            }
        });

        // Close mobile menu on escape key
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && navLinks.classList.contains('open')) {
                navLinks.classList.remove('open');
                navToggle.setAttribute('aria-expanded', 'false');
                navToggle.focus();
            }
        });
    }

    // Mark active nav link based on current page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const links = document.querySelectorAll('.nav-links a');

    links.forEach(function (link) {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('active');
        }
    });

    // Back to Top Button
    const backToTopButton = document.getElementById('back-to-top');
    
    if (backToTopButton) {
        // Show/hide button based on scroll position
        window.addEventListener('scroll', function () {
            if (window.scrollY > 300) {
                backToTopButton.classList.add('visible');
            } else {
                backToTopButton.classList.remove('visible');
            }
        });

        // Scroll to top when clicked
        backToTopButton.addEventListener('click', function () {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId !== '#' && targetId !== '') {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    // Add loading class to body when page loads
    window.addEventListener('load', function () {
        document.body.classList.add('loaded');
    });
})();
