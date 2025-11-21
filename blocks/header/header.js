import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

/**
 * Toggle all nav sections (scoped selector).
 * sections: element, expanded: boolean|'true'|'false'
 */
function toggleAllNavSections(sections, expanded = false) {
  const isExpanded = expanded === true || expanded === 'true';
  const selector = ':scope .default-content-wrapper > ul > li';
  sections.querySelectorAll(selector).forEach((section) => {
    section.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
  });
}

/**
 * Keyboard: open nav-drop on Enter/Space.
 * (defined early so callers can use it without lint errors)
 */
function openOnKeydown(e) {
  const focused = document.activeElement;
  if (!focused || focused.className !== 'nav-drop') return;

  if (e.code === 'Enter' || e.code === 'Space') {
    const dropExpanded = focused.getAttribute('aria-expanded') === 'true';
    const parent = focused.closest('.nav-sections');
    if (parent) toggleAllNavSections(parent);
    focused.setAttribute('aria-expanded', dropExpanded ? 'false' : 'true');
  }
}

/**
 * Called when a nav-drop receives focus; installs keyboard handler.
 */
function handleNavDropFocus(e) {
  const { target } = e;
  if (!target) return;
  target.removeEventListener('keydown', openOnKeydown);
  target.addEventListener('keydown', openOnKeydown);
}

/**
 * Close behaviors: Escape key handler.
 * Collapses sections on desktop, closes menu on mobile (inline close).
 * Defined before callers to avoid no-use-before-define.
 */
function closeOnEscape(e) {
  if (e.code !== 'Escape') return;

  const nav = document.getElementById('nav');
  if (!nav) return;

  const navSections = nav.querySelector('.nav-sections');
  const navSectionExpanded = navSections
    ? navSections.querySelector('[aria-expanded="true"]')
    : null;

  if (navSectionExpanded && isDesktop.matches) {
    toggleAllNavSections(navSections, false);
    navSectionExpanded.focus();
    return;
  }

  // on mobile: perform same close actions inline
  if (!isDesktop.matches) {
    const sections = nav.querySelector('.nav-sections');
    if (sections) toggleAllNavSections(sections, false);
    nav.setAttribute('aria-expanded', 'false');
    document.body.style.overflowY = '';
    const btn = nav.querySelector('.nav-hamburger button');
    if (btn) btn.setAttribute('aria-label', 'Open navigation');
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
    document.removeEventListener('click', onDocumentClickCloseNav);
    const button = nav.querySelector('button');
    if (button) button.focus();
  }
}

/**
 * Close behaviors: focusout handler.
 * Defined early so toggleMenu and other callers can reference it.
 */
function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (nav.contains(e.relatedTarget)) return;

  const navSections = nav.querySelector('.nav-sections');
  const navSectionExpanded = navSections
    ? navSections.querySelector('[aria-expanded="true"]')
    : null;

  if (navSectionExpanded && isDesktop.matches) {
    toggleAllNavSections(navSections, false);
    return;
  }

  if (!isDesktop.matches) {
    // inline close actions (mobile)
    const sections = nav.querySelector('.nav-sections');
    if (sections) toggleAllNavSections(sections, false);
    nav.setAttribute('aria-expanded', 'false');
    document.body.style.overflowY = '';
    const btn = nav.querySelector('.nav-hamburger button');
    if (btn) btn.setAttribute('aria-label', 'Open navigation');
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
    document.removeEventListener('click', onDocumentClickCloseNav);
  }
}

/**
 * Document-level click handler to close mobile nav when clicking outside.
 * This is defined after close handlers so references to them are valid.
 */
function onDocumentClickCloseNav(e) {
  const nav = document.getElementById('nav');
  if (!nav) return;
  if (nav.getAttribute('aria-expanded') !== 'true') return;
  if (nav.contains(e.target)) return;

  const navSections = nav.querySelector('.nav-sections');
  if (navSections) toggleAllNavSections(navSections, false);

  nav.setAttribute('aria-expanded', 'false');
  document.body.style.overflowY = '';

  const btn = nav.querySelector('.nav-hamburger button');
  if (btn) btn.setAttribute('aria-label', 'Open navigation');

  // remove listeners that should only be present when nav is open
  window.removeEventListener('keydown', closeOnEscape);
  nav.removeEventListener('focusout', closeOnFocusLost);
  document.removeEventListener('click', onDocumentClickCloseNav);
}

/**
 * Toggle the entire nav.
 * forceExpanded: true=open, false=closed, null=toggle
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const currentOpen = nav.getAttribute('aria-expanded') === 'true';
  const shouldOpen = forceExpanded !== null ? Boolean(forceExpanded) : !currentOpen;
  const button = nav.querySelector('.nav-hamburger button');

  document.body.style.overflowY = shouldOpen && !isDesktop.matches ? 'hidden' : '';

  nav.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
  nav.classList.toggle('nav--open', shouldOpen);

  if (navSections) toggleAllNavSections(navSections, shouldOpen && isDesktop.matches);

  if (button) {
    button.setAttribute('aria-label', shouldOpen ? 'Close navigation' : 'Open navigation');
  }

  const navDrops = navSections ? navSections.querySelectorAll('.nav-drop') : [];
  if (isDesktop.matches) {
    navDrops.forEach((drop) => {
      if (!drop.hasAttribute('tabindex')) {
        drop.setAttribute('tabindex', 0);
        drop.removeEventListener('focus', handleNavDropFocus);
        drop.addEventListener('focus', handleNavDropFocus);
      }
    });
  } else {
    navDrops.forEach((drop) => {
      drop.removeAttribute('tabindex');
      drop.removeEventListener('focus', handleNavDropFocus);
      drop.removeEventListener('keydown', openOnKeydown);
    });
  }

  if (shouldOpen || isDesktop.matches) {
    window.addEventListener('keydown', closeOnEscape);
    nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
  }

  if (shouldOpen && !isDesktop.matches) {
    document.addEventListener('click', onDocumentClickCloseNav);
  } else {
    document.removeEventListener('click', onDocumentClickCloseNav);
  }
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  const navBrand = nav.querySelector('.nav-brand');
  const brandLink = navBrand ? navBrand.querySelector('.button') : null;
  if (brandLink) {
    brandLink.className = '';
    const btnContainer = brandLink.closest('.button-container');
    if (btnContainer) btnContainer.className = '';
  }

  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    navSections.querySelectorAll(':scope .default-content-wrapper > ul > li')
      .forEach((navSection) => {
        if (navSection.querySelector('ul')) navSection.classList.add('nav-drop');
        navSection.addEventListener('click', () => {
          if (isDesktop.matches) {
            const expanded = navSection.getAttribute('aria-expanded') === 'true';
            toggleAllNavSections(navSections, false);
            navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
          }
        });
        if (!navSection.hasAttribute('aria-expanded')) {
          navSection.setAttribute('aria-expanded', 'false');
        }
      });
  }

  // hamburger for mobile - inline SVG + minimal injected styles
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');

  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <rect class="bar1" x="3" y="6" width="18" height="2" rx="1"></rect>
      <rect class="bar2" x="3" y="11" width="18" height="2" rx="1"></rect>
      <rect class="bar3" x="3" y="16" width="18" height="2" rx="1"></rect>
    </svg>
  </button>`;

  if (!document.getElementById('nav-inline-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'nav-inline-styles';
    styleEl.textContent = `
      #nav svg rect { transition: transform .25s, opacity .25s; transform-origin: center; }
      #nav.nav--open .bar1 { transform: translateY(5px) rotate(45deg); }
      #nav.nav--open .bar2 { opacity: 0; transform: scaleX(0); }
      #nav.nav--open .bar3 { transform: translateY(-5px) rotate(-45deg); }
      .nav-hamburger button { background: transparent; border: none; padding: 6px; cursor: pointer; }
    `;
    document.head.append(styleEl);
  }

  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');
  nav.setAttribute('role', 'navigation');
  nav.setAttribute('aria-label', 'Primary');

  // ensure menu state matches current viewport
  toggleMenu(nav, navSections, isDesktop.matches);

  // debounce media changes
  let mediaChangeTimer = null;
  isDesktop.addEventListener('change', () => {
    if (mediaChangeTimer) clearTimeout(mediaChangeTimer);
    mediaChangeTimer = setTimeout(() => {
      toggleMenu(nav, navSections, isDesktop.matches);
    }, 120);
  });

  // smooth-scroll anchors + auto-close on mobile
  nav.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      const id = a.getAttribute('href');
      if (!id) return;
      const target = document.querySelector(id);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toggleMenu(nav, navSections, false);
    });
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
