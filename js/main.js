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

/* ── GA4 Event Tracking ──────────────────────────────────────────────
   Fires on every page that loads main.js.
   Safe to call even if gtag isn't loaded — checks first.
   ─────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {

  function gEvent(name, params) {
    if (typeof gtag === 'undefined') return;
    gtag('event', name, params || {});
  }

  var page = window.location.pathname.replace(/^\/|\.html$/g, '') || 'home';

  /* ── WhatsApp clicks — all buttons, all pages ── */
  document.querySelectorAll('a[href*="wa.me"]').forEach(function (el) {
    el.addEventListener('click', function () {
      // Determine button position from classes/context
      var label = 'whatsapp_click';
      if (el.classList.contains('wa-float'))        label = 'floating_button';
      else if (el.closest('.hero'))                 label = 'hero_cta';
      else if (el.closest('.contact-form-col'))     label = 'contact_page';
      else if (el.closest('.page-hero'))            label = 'page_hero';
      else if (el.closest('footer'))                label = 'footer';
      else if (el.closest('.contact-card'))         label = 'sidebar';
      else if (el.closest('.result-cta'))           label = 'estimator_result';
      else if (el.closest('.section'))              label = 'inline_cta';
      gEvent('whatsapp_click', { page: page, button_location: label });
    });
  });

  /* ── Phone number clicks ── */
  document.querySelectorAll('a[href^="tel:"]').forEach(function (el) {
    el.addEventListener('click', function () {
      gEvent('phone_click', { page: page });
    });
  });

  /* ── Instagram link clicks ── */
  document.querySelectorAll('a[href*="instagram.com"]').forEach(function (el) {
    el.addEventListener('click', function () {
      gEvent('instagram_click', { page: page });
    });
  });

  /* ── Contact form view (fires when contact page loads) ── */
  if (document.getElementById('quote-form')) {
    gEvent('contact_form_view', { page: page });
  }

  /* ── Portfolio page view (high intent signal) ── */
  if (page === 'portfolio') {
    gEvent('portfolio_view', {});
  }

  /* ── Case study page views ── */
  if (page === 'sage-centre' || page === 'house-of-walker') {
    gEvent('case_study_view', { case_study: page });
  }

  /* ── Wardrobe estimator: quote generated + WA handoff ── */
  /* Hook into the estimator's showResult function if on that page */
  if (page === 'wardrobe-estimator') {
    gEvent('estimator_view', {});
    // Patch the result display — estimator calls showResult or updates .est-result
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.target && m.target.classList && m.target.classList.contains('visible')) {
          gEvent('estimator_quote_generated', {});
          observer.disconnect();
        }
      });
    });
    var resultEl = document.querySelector('.est-result');
    if (resultEl) {
      observer.observe(resultEl, { attributes: true, attributeFilter: ['class'] });
    }
    // WA handoff from estimator result
    var waResultBtn = document.querySelector('.est-result a[href*="wa.me"]');
    if (waResultBtn) {
      waResultBtn.addEventListener('click', function () {
        gEvent('estimator_whatsapp_handoff', {});
      });
    }
  }

  /* ── Cutlist: cutlist generated ── */
  /* Hooks into the generate() function called by gen-btn */
  if (page === 'cutlist') {
    gEvent('cutlist_view', {});
    // Observe the results page becoming visible
    var rpage = document.getElementById('rpage');
    if (rpage) {
      var rObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          if (m.target.classList.contains('show')) {
            gEvent('cutlist_generated', {});
            rObserver.disconnect();
          }
        });
      });
      rObserver.observe(rpage, { attributes: true, attributeFilter: ['class'] });
    }
  }

  /* ── Service page views (intent signals) ── */
  var servicePages = ['wardrobes','beds','kitchens','dining-living','solid-wood','tv-units','shelving'];
  if (servicePages.indexOf(page) !== -1) {
    gEvent('service_page_view', { service: page });
  }

  /* ── Scroll depth — fires once at 50% and 90% ── */
  var scrollMilestones = { 50: false, 90: false };
  window.addEventListener('scroll', function () {
    var pct = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
    if (pct >= 50 && !scrollMilestones[50]) {
      scrollMilestones[50] = true;
      gEvent('scroll_depth', { page: page, depth: '50%' });
    }
    if (pct >= 90 && !scrollMilestones[90]) {
      scrollMilestones[90] = true;
      gEvent('scroll_depth', { page: page, depth: '90%' });
    }
  }, { passive: true });

});
