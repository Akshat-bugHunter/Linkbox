const test = require('node:test');
const assert = require('node:assert');
const { isValidUrl } = require('./validate');

test('accepts http/https urls', () => {
  assert.strictEqual(isValidUrl('https://example.com'), true);
  assert.strictEqual(isValidUrl('http://example.com/a?b=1'), true);
});

test('rejects bad urls', () => {
  assert.strictEqual(isValidUrl('example.com'), false);
  assert.strictEqual(isValidUrl('javascript:alert(1)'), false);
  assert.strictEqual(isValidUrl(''), false);
});
