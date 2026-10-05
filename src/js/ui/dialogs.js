/**
 * Menu dropdown and about dialog: open, close, Escape, outside click, focus
 * trap, and `aria-expanded` on the trigger.
 */

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Owns the two overlay-style interface elements. */
export class Dialogs {
  /**
   * @param {{elements: Record<string, HTMLElement>, store: object}} deps
   */
  constructor({ elements, store }) {
    this.elements = elements;
    this.store = store;
    this.returnFocus = null;
    this.listeners = [];
  }

  /** Attach document-level handlers. Call once at start-up. */
  attach() {
    this.#on(document, 'keydown', (event) => {
      if (event.key === 'Escape') {
        if (this.store.getState().ui.about_open) this.closeAbout();
        else if (this.store.getState().ui.menu_open) this.closeMenu();
        return;
      }
      if (event.key === 'Tab' && this.store.getState().ui.about_open) {
        this.#trapFocus(event);
      }
    });

    this.#on(document, 'click', (event) => {
      if (!this.store.getState().ui.menu_open) return;
      if (this.elements.menuDropdown.contains(event.target)) return;
      if (event.target === this.elements.menuButton) return;
      this.closeMenu();
    });

    this.#on(this.elements.menuButton, 'click', () => {
      if (this.store.getState().ui.menu_open) this.closeMenu();
      else this.openMenu();
    });

    this.#on(this.elements.aboutMenuItem, 'click', () => {
      // The menu item disappears with the dropdown, so the trigger button is
      // the element that can hold focus again.
      this.closeMenu();
      this.openAbout(this.elements.menuButton);
    });

    this.#on(this.elements.aboutCloseButton, 'click', () => this.closeAbout());
    this.#on(this.elements.aboutBackdrop, 'click', () => this.closeAbout());
  }

  openMenu() {
    this.elements.menuDropdown.hidden = false;
    this.elements.menuButton.setAttribute('aria-expanded', 'true');
    this.store.setUi('menu_open', true);
  }

  closeMenu() {
    this.elements.menuDropdown.hidden = true;
    this.elements.menuButton.setAttribute('aria-expanded', 'false');
    this.store.setUi('menu_open', false);
  }

  /**
   * @param {HTMLElement} [trigger] The element that opened the dialog. Closing
   *   returns focus here so keyboard users are not left on a hidden element.
   */
  openAbout(trigger) {
    this.returnFocus = trigger ?? document.activeElement;
    this.elements.aboutDialog.hidden = false;
    this.store.setUi('about_open', true);
    this.elements.aboutCloseButton.focus();
  }

  closeAbout() {
    this.elements.aboutDialog.hidden = true;
    this.store.setUi('about_open', false);

    const target = this.returnFocus && this.returnFocus.isConnected ? this.returnFocus : document.body;
    if (typeof target.focus === 'function') target.focus();
    this.returnFocus = null;
  }

  #trapFocus(event) {
    const focusable = [...this.elements.aboutDialogPanel.querySelectorAll(FOCUSABLE)];
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  #on(target, type, handler) {
    target.addEventListener(type, handler);
    this.listeners.push({ target, type, handler });
  }

  /** Remove every document-level listener this object added. */
  dispose() {
    for (const { target, type, handler } of this.listeners) {
      target.removeEventListener(type, handler);
    }
    this.listeners = [];
  }
}
