import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      nav.querySelector('button').focus();
    }
  }
}

function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (!nav.contains(e.relatedTarget)) {
    const navSections = nav.querySelector('.nav-sections');
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections, false);
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections, false);
    }
  }
}

function openOnKeydown(e) {
  const focused = document.activeElement;
  const isNavDrop = focused.className === 'nav-drop';
  if (isNavDrop && (e.code === 'Enter' || e.code === 'Space')) {
    const dropExpanded = focused.getAttribute('aria-expanded') === 'true';
    // eslint-disable-next-line no-use-before-define
    toggleAllNavSections(focused.closest('.nav-sections'));
    focused.setAttribute('aria-expanded', dropExpanded ? 'false' : 'true');
  }
}

function handleNavDropFocus(e) {
  const { target } = e;
  if (!target) return;
  target.removeEventListener('keydown', openOnKeydown);
  target.addEventListener('keydown', openOnKeydown);
}


/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  // normalize expanded to boolean (accepts 'true'/'false' strings)
  const isExpanded = (expanded === true || expanded === 'true');

  // scope the selector to the passed-in sections element
  sections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((section) => {
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
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const currentOpen = nav.getAttribute('aria-expanded') === 'true';
  // if forceExpanded provided, use it directly; otherwise toggle
  const shouldOpen = (forceExpanded !== null) ? Boolean(forceExpanded) : !currentOpen;

  const button = nav.querySelector('.nav-hamburger button');

  // body scrolling: lock only when menu is open on mobile
  document.body.style.overflowY = (shouldOpen && !isDesktop.matches) ? 'hidden' : '';

  // set nav attributes and classes
  nav.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
  nav.classList.toggle('nav--open', shouldOpen);

  // set aria-expanded on sections: if desktop and nav sections visible, expand sections only if desktop and shouldOpen true
  toggleAllNavSections(navSections, (shouldOpen && isDesktop.matches) ? true : false);

  // update button label sensibly
  if (button) {
    button.setAttribute('aria-label', shouldOpen ? 'Close navigation' : 'Open navigation');
  }

  // enable nav dropdown keyboard accessibility on desktop
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

  // enable/disable close behaviors:
  // - Escape key + focusout should be active either when desktop (for collapsing sections) OR when menu is open (mobile)
  if (shouldOpen || isDesktop.matches) {
    window.addEventListener('keydown', closeOnEscape);
    nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
  }

  // document click to close only when mobile menu is open
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
  const brandLink = navBrand.querySelector('.button');
  if (brandLink) {
    brandLink.className = '';
    brandLink.closest('.button-container').className = '';
  }

  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    navSections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((navSection) => {
      if (navSection.querySelector('ul')) navSection.classList.add('nav-drop');
      navSection.addEventListener('click', () => {
        if (isDesktop.matches) {
          const expanded = navSection.getAttribute('aria-expanded') === 'true';
          toggleAllNavSections(navSections);
          navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        }
      });
    });
  }

    // hamburger for mobile - replaced with inline SVG + injected styles
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');

  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <rect class="bar1" x="3" y="6" width="18" height="2" rx="1"></rect>
      <rect class="bar2" x="3" y="11" width="18" height="2" rx="1"></rect>
      <rect class="bar3" x="3" y="16" width="18" height="2" rx="1"></rect>
    </svg>
  </button>`;

  // inject minimal CSS to animate hamburger (safe: small, scoped to #nav)
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
  // prevent mobile nav behavior on window resize
  toggleMenu(nav, navSections, isDesktop.matches);

  // debounce and react to media query changes
  let mediaChangeTimer = null;
  isDesktop.addEventListener('change', () => {
    if (mediaChangeTimer) clearTimeout(mediaChangeTimer);
    mediaChangeTimer = setTimeout(() => toggleMenu(nav, navSections, isDesktop.matches), 120);
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
