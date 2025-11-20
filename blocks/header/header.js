import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean|String} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  const isExpanded = expanded === true || expanded === 'true';
  const selector = ':scope .default-content-wrapper > ul > li';
  sections.querySelectorAll(selector).forEach((section) => {
    section.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
  });
}

/**
 * Document-level click handler to close mobile nav when clicking outside
 */
function onDocumentClickCloseNav(e) {
  const nav = document.getElementById('nav');
  if (!nav) return;
  if (nav.getAttribute('aria-expanded') !== 'true') return;
  if (!nav.contains(e.target)) {
    const navSections = nav.querySelector('.nav-sections');
    toggleMenu(nav, navSections, false);
  }
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {Boolean|null} forceExpanded true=open, false=closed, null=toggle
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const currentOpen = nav.getAttribute('aria-expanded') === 'true';
  const shouldOpen = forceExpanded !== null ? Boolean(forceExpanded) : !currentOpen;

  const button = nav.querySelector('.nav-hamburger button');

  // Lock body scroll only when menu is open on mobile
  document.body.style.overflowY = shouldOpen && !isDesktop.matches ? 'hidden' : '';

  nav.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
  nav.classList.toggle('nav--open', shouldOpen);

  // Expand sections on desktop only when nav is open on desktop
  if (navSections) toggleAllNavSections(navSections, shouldOpen && isDesktop.matches);

  if (button) {
    button.setAttribute('aria-label', shouldOpen ? 'Close navigation' : 'Open navigation');
  }

  // Enable nav dropdown keyboard accessibility on desktop
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

  // Enable/disable collapse behaviors
  if (shouldOpen || isDesktop.matches) {
    window.addEventListener('keydown', closeOnEscape);
    nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
  }

  // Document click to close only when mobile menu is open
  if (shouldOpen && !isDesktop.matches) {
    document.addEventListener('click', onDocumentClickCloseNav);
  } else {
    document.removeEventListener('click', onDocumentClickCloseNav);
  }
}

function openOnKeydown(e) {
  const focused = document.activeElement;
  if (!focused || focused.className !== 'nav-drop') return;

  if (e.code === 'Enter' || e.code === 'Space') {
    const dropExpanded = focused.getAttribute('aria-expanded') === 'true';
    toggleAllNavSections(focused.closest('.nav-sections'));
    focused.setAttribute('aria-expanded', dropExpanded ? 'false' : 'true');
  }
}

/**
 * Called when a nav-drop receives focus; installs the keyboard handler on that element.
 */
function handleNavDropFocus(e) {
  const { target } = e;
  if (!target) return;
  target.removeEventListener('keydown', openOnKeydown);
  target.addEventListener('keydown', openOnKeydown);
}

function closeOnEscape(e) {
  if (e.code !== 'Escape') return;

  const nav = document.getElementById('nav');
  if (!nav) return;

  const navSections = nav.querySelector('.nav-sections');
  const navSectionExpanded = navSections
    ? navSections.querySelector('[aria-expanded="true"]')
    : null;

  if (navSectionExpanded && isDesktop.matches) {
    // collapse all sections but keep focus on the previously expanded element
    toggleAllNavSections(navSections, false);
    navSectionExpanded.focus();
    return;
  }

  if (!isDesktop.matches) {
    // close full mobile menu
    toggleMenu(nav, navSections, false);
    const btn = nav.querySelector('button');
    if (btn) btn.focus();
  }
}

function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (nav.contains(e.relatedTarget)) return;

  const navSections = nav.querySelector('.nav-sections');
  const navSectionExpanded = navSections
    ? navSections.querySelector('[aria-expanded="true"]')
    : null;

  if (navSectionExpanded && isDesktop.matches) {
    toggleAllNavSections(navSections, false);
  } else if (!isDesktop.matches) {
    toggleMenu(nav, navSections, false);
  }
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  // decorate nav DOM
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

  // hamburger for mobile - inline SVG + injected styles
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
