/**
 * Transient status messages.
 *
 * Toasts expire on a timer and the region is capped, so a burst of actions
 * cannot pile up messages or leave timers running.
 */

const DEFAULT_DURATION_MS = 4000;
const MAX_VISIBLE = 3;

/** Region of short-lived confirmation and failure messages. */
export class Toasts {
  /**
   * @param {HTMLElement} region Container with aria-live semantics.
   * @param {{durationMs?: number}} options
   */
  constructor(region, { durationMs = DEFAULT_DURATION_MS } = {}) {
    this.region = region;
    this.durationMs = durationMs;
    this.timers = new Set();
  }

  /**
   * Show one message. Failure messages stay slightly longer.
   * @param {{ok: boolean, message: string}} outcome
   */
  show(outcome) {
    const toast = document.createElement('p');
    toast.className = outcome.ok ? 'toast toast-ok' : 'toast toast-error';
    toast.textContent = outcome.message;

    this.region.append(toast);
    while (this.region.children.length > MAX_VISIBLE) {
      this.#remove(this.region.firstElementChild);
    }

    const timer = setTimeout(() => {
      this.timers.delete(timer);
      this.#remove(toast);
    }, outcome.ok ? this.durationMs : this.durationMs * 1.5);
    this.timers.add(timer);
  }

  #remove(toast) {
    if (!toast) return;
    toast.remove();
  }

  /** Clear pending timers and messages. Call on teardown. */
  dispose() {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    this.region.replaceChildren();
  }
}
