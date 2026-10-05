/**
 * Content type declarations: fields, defaults, validation rules, and payload
 * builders for the eight supported types.
 *
 * Every type ships defaults for its required fields so the app always starts
 * from a valid, scannable payload.
 */

const WIFI_ESCAPE_CHARACTERS = /([\\;,":])/g;

/** Escape the characters Wi-Fi parsers treat as separators. */
function escapeWifiValue(value) {
  return String(value ?? '').replace(WIFI_ESCAPE_CHARACTERS, '\\$1');
}

function requiredError(fieldKey, message) {
  return [{ fieldKey, message }];
}

/** The eight content types, in menu order. */
export const SCHEMAS = [
  {
    id: 'url',
    label: 'Website (URL)',
    fields: [
      { key: 'url', label: 'URL', kind: 'url', required: true, placeholder: 'https://example.com' }
    ],
    defaults: () => ({ url: 'https://sanntid.org' }),
    validate: (fields) => (fields.url ? [] : requiredError('url', 'Enter a URL.')),
    buildPayload: (fields) => fields.url
  },
  {
    id: 'text',
    label: 'Plain Text',
    fields: [
      { key: 'text', label: 'Text', kind: 'textarea', required: true, placeholder: 'Enter your text here' }
    ],
    defaults: () => ({ text: 'Generated with QGen' }),
    validate: (fields) => (fields.text ? [] : requiredError('text', 'Enter some text.')),
    buildPayload: (fields) => fields.text
  },
  {
    id: 'wifi',
    label: 'Wi-Fi Network',
    fields: [
      { key: 'ssid', label: 'Network name (SSID)', kind: 'text', required: true, placeholder: 'My home network' },
      { key: 'password', label: 'Password', kind: 'password', required: false, placeholder: 'Leave blank if none' },
      { key: 'auth', label: 'Security', kind: 'select', required: true, options: ['WPA', 'WEP', 'nopass'] },
      { key: 'hidden', label: 'Hidden network', kind: 'bool', required: false }
    ],
    defaults: () => ({ ssid: 'QGen Network', password: 'password123', auth: 'WPA', hidden: false }),
    validate: (fields) => (fields.ssid ? [] : requiredError('ssid', 'Enter a network name.')),
    buildPayload: (fields) => {
      const auth = fields.auth || 'WPA';
      let payload = `WIFI:T:${auth};S:${escapeWifiValue(fields.ssid)};`;
      // A network without a password must not carry an empty password field.
      if (auth !== 'nopass' && fields.password) {
        payload += `P:${escapeWifiValue(fields.password)};`;
      }
      if (fields.hidden) payload += 'H:true;';
      return `${payload};`;
    }
  },
  {
    id: 'contact',
    label: 'Contact (vCard)',
    fields: [
      { key: 'fn', label: 'Full name', kind: 'text', required: false, placeholder: 'Jane Doe' },
      { key: 'tel', label: 'Phone', kind: 'tel', required: false, placeholder: '+47 12 34 56 78' },
      { key: 'email', label: 'Email', kind: 'email', required: false, placeholder: 'jane@example.com' },
      { key: 'org', label: 'Company', kind: 'text', required: false, placeholder: 'Acme Corp' }
    ],
    defaults: () => ({ fn: 'Arnulf Heimsbakk', tel: '', email: '', org: '' }),
    validate: (fields) => (
      fields.fn || fields.tel || fields.email
        ? []
        : [{ fieldKey: 'fn', message: 'Enter a name, a phone number, or an email address.' }]
    ),
    buildPayload: (fields) => {
      const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
      if (fields.fn) lines.push(`FN:${fields.fn}`);
      if (fields.tel) lines.push(`TEL:${fields.tel}`);
      if (fields.email) lines.push(`EMAIL:${fields.email}`);
      if (fields.org) lines.push(`ORG:${fields.org}`);
      lines.push('END:VCARD');
      return lines.join('\n');
    }
  },
  {
    id: 'email',
    label: 'Email',
    fields: [
      { key: 'addr', label: 'To', kind: 'email', required: true, placeholder: 'recipient@example.com' },
      { key: 'sub', label: 'Subject', kind: 'text', required: false, placeholder: 'Hello' },
      { key: 'body', label: 'Body', kind: 'textarea', required: false, placeholder: 'Your message here' }
    ],
    defaults: () => ({ addr: 'hello@sanntid.org', sub: '', body: '' }),
    validate: (fields) => (fields.addr ? [] : requiredError('addr', 'Enter an email address.')),
    buildPayload: (fields) => {
      const params = [];
      if (fields.sub) params.push(`subject=${encodeURIComponent(fields.sub)}`);
      if (fields.body) params.push(`body=${encodeURIComponent(fields.body)}`);
      const query = params.length > 0 ? `?${params.join('&')}` : '';
      return `mailto:${fields.addr}${query}`;
    }
  },
  {
    id: 'phone',
    label: 'Phone Number',
    fields: [
      { key: 'tel', label: 'Number', kind: 'tel', required: true, placeholder: '+4712345678' }
    ],
    defaults: () => ({ tel: '+4712345678' }),
    validate: (fields) => (fields.tel ? [] : requiredError('tel', 'Enter a phone number.')),
    buildPayload: (fields) => `tel:${fields.tel}`
  },
  {
    id: 'sms',
    label: 'SMS',
    fields: [
      { key: 'tel', label: 'Number', kind: 'tel', required: true, placeholder: '+4712345678' },
      { key: 'msg', label: 'Message', kind: 'textarea', required: false, placeholder: 'Hello!' }
    ],
    defaults: () => ({ tel: '+4712345678', msg: 'Hello!' }),
    validate: (fields) => (fields.tel ? [] : requiredError('tel', 'Enter a phone number.')),
    buildPayload: (fields) => `SMSTO:${fields.tel}:${fields.msg ?? ''}`
  },
  {
    id: 'geo',
    label: 'Geo Location',
    fields: [
      { key: 'lat', label: 'Latitude', kind: 'number', required: true, placeholder: '59.9139' },
      { key: 'lon', label: 'Longitude', kind: 'number', required: true, placeholder: '10.7522' }
    ],
    defaults: () => ({ lat: '59.9139', lon: '10.7522' }),
    validate: (fields) => {
      const errors = [];
      const lat = Number(fields.lat);
      const lon = Number(fields.lon);
      if (!fields.lat || Number.isNaN(lat) || lat < -90 || lat > 90) {
        errors.push({ fieldKey: 'lat', message: 'Latitude must be a number between -90 and 90.' });
      }
      if (!fields.lon || Number.isNaN(lon) || lon < -180 || lon > 180) {
        errors.push({ fieldKey: 'lon', message: 'Longitude must be a number between -180 and 180.' });
      }
      return errors;
    },
    buildPayload: (fields) => `geo:${fields.lat},${fields.lon}`
  }
];

/**
 * Look up a content type by id.
 * @param {string} id
 * @returns {object|null}
 */
export function getSchema(id) {
  return SCHEMAS.find((schema) => schema.id === id) ?? null;
}

/**
 * Default field values for a content type. Returns an empty object for an
 * unknown id so callers can report it instead of crashing.
 * @param {string} id
 * @returns {Record<string, string | boolean>}
 */
export function defaultFields(id) {
  const schema = getSchema(id);
  return schema ? schema.defaults() : {};
}
