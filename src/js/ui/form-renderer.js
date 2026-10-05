/**
 * Dynamic field form. Builds the controls for the selected content type and
 * links each error message to the field it belongs to.
 */

const INPUT_TYPE_BY_KIND = {
  text: 'text',
  url: 'url',
  email: 'email',
  tel: 'tel',
  number: 'number',
  password: 'password'
};

/** Field form builder and error surface. */
export class FormRenderer {
  /**
   * @param {{container: HTMLElement, onFieldChange: Function}} deps
   */
  constructor({ container, onFieldChange }) {
    this.container = container;
    this.onFieldChange = onFieldChange;
    this.renderedSchemaId = null;
    this.errorNodes = new Map();
  }

  /**
   * Rebuild the form when the content type changes.
   * @param {object} schema
   * @param {Record<string, string | boolean>} fields
   */
  render(schema, fields) {
    if (this.renderedSchemaId === schema.id) return;

    this.container.replaceChildren();
    this.errorNodes.clear();

    for (const field of schema.fields) {
      this.container.append(this.#buildField(field, fields[field.key]));
    }

    this.renderedSchemaId = schema.id;
  }

  #buildField(field, value) {
    const wrapper = document.createElement('div');
    wrapper.className = 'field';

    const label = document.createElement('label');
    const inputId = `field-${field.key}`;
    const errorId = `error-${field.key}`;
    label.htmlFor = inputId;
    label.textContent = field.label;
    if (field.required) {
      const marker = document.createElement('span');
      marker.className = 'field-required';
      marker.textContent = ' required';
      label.append(marker);
    }

    const input = this.#buildInput(field, inputId, value);
    input.id = inputId;
    input.setAttribute('aria-describedby', errorId);

    const error = document.createElement('p');
    error.id = errorId;
    error.className = 'field-error';
    error.setAttribute('role', 'status');
    error.hidden = true;

    this.errorNodes.set(field.key, { error, input });

    wrapper.append(label, input, error);
    return wrapper;
  }

  #buildInput(field, inputId, value) {
    if (field.kind === 'textarea') {
      const textarea = document.createElement('textarea');
      textarea.rows = 3;
      textarea.className = 'field-control field-control-textarea';
      this.#bind(textarea, field, () => textarea.value);
      if (typeof value === 'string') textarea.value = value;
      if (field.placeholder) textarea.placeholder = field.placeholder;
      return textarea;
    }

    if (field.kind === 'select') {
      const select = document.createElement('select');
      select.className = 'field-control';
      for (const option of field.options ?? []) {
        const element = document.createElement('option');
        element.value = option;
        element.textContent = option;
        select.append(element);
      }
      this.#bind(select, field, () => select.value);
      if (typeof value === 'string') select.value = value;
      return select;
    }

    if (field.kind === 'bool') {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'field-checkbox';
      checkbox.checked = Boolean(value);
      this.#bind(checkbox, field, () => checkbox.checked);
      return checkbox;
    }

    const input = document.createElement('input');
    input.type = INPUT_TYPE_BY_KIND[field.kind] ?? 'text';
    input.className = 'field-control';
    this.#bind(input, field, () => input.value);
    if (typeof value === 'string') input.value = value;
    if (field.placeholder) input.placeholder = field.placeholder;
    return input;
  }

  #bind(element, field, read) {
    const eventName = element.type === 'checkbox' || element.tagName === 'SELECT' ? 'change' : 'input';
    element.addEventListener(eventName, () => {
      this.onFieldChange(field.key, read());
    });
  }

  /** Clear every inline error message. */
  clearErrors() {
    for (const { error, input } of this.errorNodes.values()) {
      error.hidden = true;
      error.textContent = '';
      input.removeAttribute('aria-invalid');
    }
  }

  /**
   * Show validation messages on their fields.
   * @param {Array<{fieldKey: string, message: string}>} errors
   */
  showErrors(errors) {
    for (const { fieldKey, message } of errors) {
      const entry = this.errorNodes.get(fieldKey);
      if (!entry) continue;
      entry.error.textContent = message;
      entry.error.hidden = false;
      entry.input.setAttribute('aria-invalid', 'true');
    }
  }
}
