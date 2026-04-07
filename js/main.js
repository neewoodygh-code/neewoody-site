/* =====================================================
   NEEWOODY CUSTOM WOODWORK — Main JavaScript
   neewoodygh.com
   ===================================================== */

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

  /* ── Contact form (front-end only — wire up Formspree or Netlify Forms later) ──
     
     TO CONNECT FORMSPREE:
     1. Sign up at formspree.io
     2. Create a new form and get your endpoint URL
     3. Replace the action attribute on the form: action="https://formspree.io/f/YOUR_ID"
     4. Add method="POST" to the form
     5. Remove or update the JS below and use standard form submission
     
     TO CONNECT NETLIFY FORMS:
     1. Add netlify attribute to the <form> tag: <form netlify>
     2. Add name="contact" to the <form> tag
     3. Netlify will automatically handle submissions
  */
  const contactForm = document.getElementById('quote-form');

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();

      // Basic validation
      const name    = contactForm.querySelector('[name="name"]');
      const phone   = contactForm.querySelector('[name="phone"]');
      const message = contactForm.querySelector('[name="message"]');
      let valid = true;

      [name, phone, message].forEach(function (field) {
        if (field && !field.value.trim()) {
          field.style.borderColor = '#c0392b';
          valid = false;
        } else if (field) {
          field.style.borderColor = '';
        }
      });

      if (!valid) return;

      // Show success message (replace with real submission logic)
      const submitBtn = contactForm.querySelector('[type="submit"]');
      if (submitBtn) {
        submitBtn.textContent = 'Message Sent ✓';
        submitBtn.disabled = true;
        submitBtn.style.background = '#27ae60';
      }

      // Optional: redirect to WhatsApp after form submit
      // const waMessage = encodeURIComponent('Hi Neewoody, I just filled your quote form and would like to discuss my project.');
      // setTimeout(function() { window.open('https://wa.me/233244633464?text=' + waMessage, '_blank'); }, 1500);
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
