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

/* ═══════════════════════════════════════════════════════════
   INSTAGRAM HOOK — future dynamic grid
   ───────────────────────────────────────────────────────────
   When you're ready to connect live Instagram data:

   1. Create a backend endpoint at /api/instagram that returns:
      [
        { "image": "https://…/photo.jpg", "link": "https://instagram.com/p/…", "caption": "…" },
        …
      ]

   2. Uncomment the code below and remove the static cards in
      index.html (inside <div id="insta-grid">).

   3. The endpoint can be a Cloudflare Worker, a Netlify Function,
      or any serverless function that calls the Instagram Basic
      Display API with your access token.
   ─────────────────────────────────────────────────────────── */

/*
function renderInstagramGrid(posts) {
  const grid = document.getElementById('insta-grid');
  if (!grid || !posts || !posts.length) return;

  grid.innerHTML = posts.slice(0, 6).map(post => `
    <a href="${post.link}" class="insta-card" target="_blank" rel="noopener" aria-label="View on Instagram">
      <img src="${post.image}" alt="${post.caption ? post.caption.substring(0,80) : 'Neewoody project'}" loading="lazy"
           onerror="this.parentNode.classList.add('insta-card--empty')" />
      <div class="insta-card-overlay">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
        </svg>
      </div>
    </a>
  `).join('');
}

// Fetch and render — uncomment when /api/instagram is ready:
// fetch('/api/instagram')
//   .then(r => r.json())
//   .then(renderInstagramGrid)
//   .catch(() => {}); // silently keep static cards on error
*/
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
