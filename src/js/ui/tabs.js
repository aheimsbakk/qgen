/**
 * Mobile view switching: Settings and Preview tabs.
 *
 * Desktop CSS shows both panels at once, so the tabs only matter below the
 * 720 px breakpoint.
 */

/** Tab strip controller for the mobile layout. */
export class Tabs {
  /**
   * @param {{elements: Record<string, HTMLElement>, store: object}} deps
   */
  constructor({ elements, store }) {
    this.elements = elements;
    this.store = store;
  }

  /** Attach tab buttons. Call once at start-up. */
  attach() {
    this.elements.tabSettingsButton.addEventListener('click', () => {
      this.store.setUi('mobile_view', 'settings');
    });
    this.elements.tabPreviewButton.addEventListener('click', () => {
      this.store.setUi('mobile_view', 'preview');
    });
  }

  /** Reflect the current view on the tab buttons and the layout. */
  sync() {
    const view = this.store.getState().ui.mobile_view;
    const isPreview = view === 'preview';

    this.elements.mainLayout.dataset.view = view;
    this.elements.tabSettingsButton.setAttribute('aria-selected', String(!isPreview));
    this.elements.tabPreviewButton.setAttribute('aria-selected', String(isPreview));
    this.elements.tabSettingsButton.classList.toggle('is-active', !isPreview);
    this.elements.tabPreviewButton.classList.toggle('is-active', isPreview);
  }
}
