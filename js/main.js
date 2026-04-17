/* =====================================================
   NEEWOODY CUSTOM WOODWORK — Main JavaScript
   neewoodygh.com
   ===================================================== */

/* ── Register service worker (enables push notifications site-wide) ── */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(function () {});
}

(function () {
  'use strict';

  /* ── Sticky header shadow ── */
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', function () {
      header.classList.toggle('scrolled', window.scrollY > 30);
    }, { passive: true });
  }

  /* ── Mobile nav toggle ── */
  const navToggle = document.querySelector('.nav-toggle');
  const mobileNav = document.querySelector('.mobile-nav');

  if (navToggle && mobileNav) {
    navToggle.addEventListener('click', function () {
      const isOpen = mobileNav.classList.toggle('open');
      navToggle.classList.toggle('open', isOpen);
      navToggle.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close on nav link click
    mobileNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileNav.classList.remove('open');
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded', false);
        document.body.style.overflow = '';
      });
    });

    // Close on outside click
    document.addEventListener('click', function (e) {
      if (!navToggle.contains(e.target) && !mobileNav.contains(e.target)) {
        if (mobileNav.classList.contains('open')) {
          mobileNav.classList.remove('open');
          navToggle.classList.remove('open');
          document.body.style.overflow = '';
        }
      }
    });
  }

  /* ── Portfolio filter ── */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  if (filterBtns.length && projectCards.length) {
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const filter = btn.getAttribute('data-filter');

        // Update active state
        filterBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');

        // Show / hide cards
        projectCards.forEach(function (card) {
          const cat = card.getAttribute('data-category');
          if (filter === 'all' || cat === filter) {
            card.removeAttribute('data-hidden');
          } else {
            card.setAttribute('data-hidden', 'true');
          }
        });
      });
    });
  }

  /* ── FAQ accordion ── */
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(function (item) {
    const question = item.querySelector('.faq-question');
    if (!question) return;

    question.addEventListener('click', function () {
      const isOpen = item.classList.contains('open');

      // Close all
      faqItems.forEach(function (i) { i.classList.remove('open'); });

      // Open clicked (unless it was already open)
      if (!isOpen) item.classList.add('open');
    });
  });

  /* ── Reveal on scroll ── */
  const revealEls = document.querySelectorAll('.reveal');

  if (revealEls.length) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    revealEls.forEach(function (el) { observer.observe(el); });
  }

  /* ── Contact form — posts to Cloudflare Worker ── */
  const contactForm = document.getElementById('quote-form');

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();

      // Basic validation
      const nameEl    = contactForm.querySelector('[name="name"]');
      const phoneEl   = contactForm.querySelector('[name="phone"]');
      const messageEl = contactForm.querySelector('[name="message"]');
      let valid = true;

      [nameEl, phoneEl, messageEl].forEach(function (field) {
        if (field && !field.value.trim()) {
          field.style.borderColor = '#c0392b';
          valid = false;
        } else if (field) {
          field.style.borderColor = '';
        }
      });

      if (!valid) return;

      const submitBtn   = contactForm.querySelector('[type="submit"]');
      const btnLabel    = contactForm.querySelector('.btn-label');
      const btnLoading  = contactForm.querySelector('.btn-loading');
      const successMsg  = contactForm.querySelector('.form-success');

      // Show loading state
      if (submitBtn)  submitBtn.disabled = true;
      if (btnLabel)   btnLabel.style.display = 'none';
      if (btnLoading) btnLoading.style.display = 'inline';

      // Collect form data
      const data = {
        name:         nameEl ? nameEl.value.trim() : '',
        phone:        phoneEl ? phoneEl.value.trim() : '',
        email:        (contactForm.querySelector('[name="email"]') || {}).value || '',
        project_type: (contactForm.querySelector('[name="project_type"]') || {}).value || '',
        dimensions:   (contactForm.querySelector('[name="dimensions"]') || {}).value || '',
        budget:       (contactForm.querySelector('[name="budget"]') || {}).value || '',
        message:      messageEl ? messageEl.value.trim() : '',
        location:     (contactForm.querySelector('[name="location"]') || {}).value || '',
        _gotcha:      (contactForm.querySelector('[name="_gotcha"]') || {}).value || '',
      };

      fetch('https://neewoodygh.com/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.ok) {
          // Success
          contactForm.reset();
          if (submitBtn)  submitBtn.style.display = 'none';
          if (successMsg) successMsg.style.display = 'flex';
          // GA event
          if (typeof gtag !== 'undefined') {
            gtag('event', 'form_submit', { event_category: 'contact', event_label: data.project_type || 'quote_request' });
          }
        } else {
          throw new Error(res.error || 'Submission failed');
        }
      })
      .catch(function () {
        // Reset button and show error
        if (submitBtn)  { submitBtn.disabled = false; }
        if (btnLabel)   { btnLabel.style.display = 'inline'; }
        if (btnLoading) { btnLoading.style.display = 'none'; }
        alert('Something went wrong — please try again or WhatsApp us directly on 0244 633 464.');
      });
    });
  }

  /* ── Smooth anchor scroll offset (accounts for sticky header) ── */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });

})();

/* ── Instagram scroll buttons ── */
document.addEventListener('DOMContentLoaded', function () {
  const instaGrid = document.getElementById('insta-grid');
  const btnLeft = document.querySelector('.insta-scroll-btn--left');
  const btnRight = document.querySelector('.insta-scroll-btn--right');

  if (btnLeft && instaGrid) {
    btnLeft.addEventListener('click', function () {
      instaGrid.scrollBy({ left: -300, behavior: 'smooth' });
    });
  }

  if (btnRight && instaGrid) {
    btnRight.addEventListener('click', function () {
      instaGrid.scrollBy({ left: 300, behavior: 'smooth' });
    });
  }
});
