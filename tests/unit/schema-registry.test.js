import test from 'node:test';
import assert from 'node:assert/strict';

import { SCHEMAS, defaultFields, getSchema } from '../../src/js/core/schema-registry.js';

const ids = SCHEMAS.map((schema) => schema.id);

test('the eight content types are declared once, in menu order', () => {
  assert.deepEqual(ids, ['url', 'text', 'wifi', 'contact', 'email', 'phone', 'sms', 'geo']);
});

test('every schema starts from valid defaults', () => {
  for (const schema of SCHEMAS) {
    const fields = defaultFields(schema.id);
    assert.deepEqual(schema.validate(fields), [], `defaults for ${schema.id} are invalid`);
    assert.ok(schema.buildPayload(fields).length > 0, `defaults for ${schema.id} build nothing`);
  }
});

test('unknown content types return null instead of throwing', () => {
  assert.equal(getSchema('nope'), null);
  assert.deepEqual(defaultFields('nope'), {});
});

test('Wi-Fi payload escapes separators and drops the password when there is none', () => {
  const schema = getSchema('wifi');

  assert.equal(
    schema.buildPayload({ ssid: 'QGen Network', password: 'password123', auth: 'WPA', hidden: false }),
    'WIFI:T:WPA;S:QGen Network;P:password123;;'
  );

  assert.equal(
    schema.buildPayload({ ssid: 'my;network,name', password: 'a,b', auth: 'WEP', hidden: true }),
    'WIFI:T:WEP;S:my\\;network\\,name;P:a\\,b;H:true;;'
  );

  assert.equal(
    schema.buildPayload({ ssid: 'Open', password: 'ignored', auth: 'nopass', hidden: false }),
    'WIFI:T:nopass;S:Open;;'
  );
});

test('contact payload builds a vCard with only the filled lines', () => {
  const schema = getSchema('contact');
  const payload = schema.buildPayload({ fn: 'Arnulf Heimsbakk', tel: '+4712345678', email: '', org: '' });

  assert.deepEqual(payload.split('\n'), [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'FN:Arnulf Heimsbakk',
    'TEL:+4712345678',
    'END:VCARD'
  ]);

  assert.deepEqual(
    schema.validate({ fn: '', tel: '', email: '', org: '' }).map((error) => error.fieldKey),
    ['fn']
  );
});

test('email payload encodes the subject and body', () => {
  const schema = getSchema('email');
  assert.equal(
    schema.buildPayload({ addr: 'someone@example.com', sub: 'Hi there', body: 'a & b' }),
    'mailto:someone@example.com?subject=Hi%20there&body=a%20%26%20b'
  );
  assert.equal(schema.buildPayload({ addr: 'someone@example.com', sub: '', body: '' }), 'mailto:someone@example.com');
});

test('phone, sms, and geo payloads use the standard prefixes', () => {
  assert.equal(getSchema('phone').buildPayload({ tel: '+4712345678' }), 'tel:+4712345678');
  assert.equal(getSchema('sms').buildPayload({ tel: '+4712345678', msg: 'Hello!' }), 'SMSTO:+4712345678:Hello!');
  assert.equal(getSchema('geo').buildPayload({ lat: '59.9139', lon: '10.7522' }), 'geo:59.9139,10.7522');
});

test('geo coordinates are checked against their real ranges', () => {
  const schema = getSchema('geo');
  const errors = schema.validate({ lat: '95', lon: 'not-a-number' });
  assert.deepEqual(errors.map((error) => error.fieldKey), ['lat', 'lon']);
});

test('missing required fields produce a message on the right field', () => {
  assert.deepEqual(getSchema('url').validate({ url: '' }), [{ fieldKey: 'url', message: 'Enter a URL.' }]);
  assert.deepEqual(getSchema('text').validate({ text: '' }), [{ fieldKey: 'text', message: 'Enter some text.' }]);
});
