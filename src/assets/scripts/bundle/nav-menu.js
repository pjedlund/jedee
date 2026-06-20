// POST-TYPE MEGA-MENU — a single disclosure that drops the post-type panel down
// from the header. Progressive enhancement: without this script no button is
// injected and the panel is a plain, visible list of links.
// © pattern: Manuel Matuzović https://web.dev/website-navigation/ + Web Accessibility Cookbook.

// Target the main nav by id, not the first <nav> on the page: the breadcrumb
// (partials/breadcrumb.njk) is a <nav> that precedes this one in the DOM.
const nav = document.querySelector('#mainnav');
const list = nav.querySelector('ul');
const menuClone = document.querySelector('#menu-template').content.cloneNode(true);
const buttonMenu = menuClone.querySelector('button[data-menu-toggle]');

// The critical CSS (nav-menu-cls.css) sets display:none on the panel while JS is
// enabled, so it can't flash open before this runs. Hand layout back to CSS (grid);
// visibility — driven by aria-expanded — is what now opens and closes it.
list.style.setProperty('display', 'grid');

buttonMenu.addEventListener('click', () => {
  const isOpen = buttonMenu.getAttribute('aria-expanded') === 'true';
  buttonMenu.setAttribute('aria-expanded', String(!isOpen));
});

const closeMenu = () => {
  buttonMenu.setAttribute('aria-expanded', 'false');
};

// close on Escape, return focus to the trigger
nav.addEventListener('keyup', event => {
  if (event.code === 'Escape') {
    closeMenu();
    buttonMenu.focus();
  }
});

// close on click outside the nav
document.addEventListener('click', event => {
  if (!nav.contains(event.target)) {
    closeMenu();
  }
});

// avoid the panel flashing on page load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    list.removeAttribute('data-no-flash');
  }, 100);
});

nav.insertBefore(menuClone, list);
