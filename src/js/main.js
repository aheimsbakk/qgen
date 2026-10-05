/**
 * Application entry point: builds the object graph and wires state to the page.
 *
 * This file only composes layers. Rules live in the core modules, drawing lives
 * in the render modules, and DOM behaviour lives in the ui modules.
 */

import { StateStore } from './core/state-store.js';
import { RenderPipeline } from './core/render-pipeline.js';
import { ExportService } from './core/export-service.js';
import { getSchema } from './core/schema-registry.js';

import { PREVIEW_PIXEL_SIZE, prepareCanvas, createOffscreenSurface } from './render/surface.js';
import { paintSymbol } from './render/painter.js';
import { composeOverlay } from './render/overlay.js';

import { collectElements } from './ui/dom-refs.js';
import { FormRenderer } from './ui/form-renderer.js';
import { PanelSync } from './ui/panel-sync.js';
import { PreviewStates } from './ui/preview-states.js';
import { Bindings } from './ui/bindings.js';
import { Dialogs } from './ui/dialogs.js';
import { Tabs } from './ui/tabs.js';
import { Toasts } from './ui/toasts.js';

/**
 * Draw a symbol and its overlay onto a context.
 * @param {CanvasRenderingContext2D} context
 */
function draw(context, symbol, style, pixelSize) {
  paintSymbol(context, symbol, style, pixelSize);
  composeOverlay(context, style, pixelSize);
}

/**
 * Build and start the application.
 * @param {{canvas?: HTMLCanvasElement}} overrides Test hook for the preview canvas.
 * @returns {object} Handles for teardown and inspection.
 */
export function startApplication({ canvas: canvasOverride } = {}) {
  const elements = collectElements();
  const canvas = canvasOverride ?? elements.qrCanvas;

  const store = new StateStore();
  const toasts = new Toasts(elements.toastRegion);
  const panelSync = new PanelSync(elements);
  const previewStates = new PreviewStates(elements);
  const dialogs = new Dialogs({ elements, store });
  const tabs = new Tabs({ elements, store });

  // The form needs the bindings for field writes, and the bindings need the
  // export service, which needs the pipeline. Declaring the form first keeps
  // the pipeline's result handler from referencing it before it exists.
  let form = null;

  const pipeline = new RenderPipeline({
    store,
    paint: (symbol, style) => {
      const context = prepareCanvas(canvas, PREVIEW_PIXEL_SIZE);
      draw(context, symbol, style, PREVIEW_PIXEL_SIZE);
    },
    onResult: (result) => {
      form.clearErrors();
      if (result.status === 'invalid') form.showErrors(result.errors);
      previewStates.apply(result);
      store.setUi('preview_status', result.status);
    }
  });

  const exportService = new ExportService({
    store,
    pipeline,
    renderToCanvas: (symbol, style, pixelSize) => {
      const surface = createOffscreenSurface(pixelSize);
      draw(surface.context, symbol, style, pixelSize);
      return surface.canvas;
    }
  });

  const bindings = new Bindings({ elements, store, exportService, toasts });
  form = new FormRenderer({
    container: elements.formContainer,
    onFieldChange: (key, value) => bindings.handleFieldChange(key, value)
  });

  // Controls first, then the state listener: a control write must never reach
  // the listener before its handler is attached.
  bindings.attach();
  dialogs.attach();
  tabs.attach();

  const initialSchema = getSchema(store.getState().schema_type);
  form.render(initialSchema, store.getState().fields);
  panelSync.sync(store.getState());
  tabs.sync();
  pipeline.renderNow();

  const unsubscribe = store.subscribe((state) => {
    form.render(getSchema(state.schema_type), state.fields);
    panelSync.sync(state);
    tabs.sync();
    pipeline.scheduleRender();
  });

  const teardown = () => {
    unsubscribe();
    pipeline.cancel();
    dialogs.dispose();
    toasts.dispose();
    const content = store.getState().style.overlay.content;
    if (content && typeof content.close === 'function') content.close();
  };

  window.addEventListener('pagehide', teardown, { once: true });

  return { store, pipeline, exportService, elements, teardown };
}

// Auto-start in the browser. Tests import `startApplication` directly.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  try {
    startApplication();
  } catch (error) {
    document.body.textContent = `QGen could not start: ${error.message}`;
  }
}
