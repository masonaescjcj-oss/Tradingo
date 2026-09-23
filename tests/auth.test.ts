/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { passwordHash, sha256 } from '../src/lib/hash';
import { formatMobile, latinDigits, normalizeMobile } from '../src/lib/phone';

describe('mobile numbers', () => {
  it('accepts Iranian mobiles in every common form', () => {
    for (const input of ['09123456789', '9123456789', '+989123456789', '00989123456789', '989123456789', '۰۹۱۲ ۳۴۵ ۶۷۸۹', '0912-345-6789', '(0912) 3456789']) {
      assert.equal(normalizeMobile(input), '09123456789', input);
    }
  });

  it('rejects landlines, short numbers and text', () => {
    for (const input of ['02112345678', '0912345678', '091234567890', 'abc', '', '+14155550123']) {
      assert.equal(normalizeMobile(input), null, input);
    }
  });

  it('converts digits and formats for display', () => {
    assert.equal(latinDigits('۱۲۳٤٥'), '12345');
    assert.equal(formatMobile('09123456789'), '0912 345 6789');
  });
});

describe('password hash', () => {
  it('matches known SHA-256 values, including UTF-8', () => {
    assert.equal(sha256(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    assert.equal(sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    assert.equal(sha256('a'.repeat(1000)).length, 64);
  });

  it('salts with the mobile number', () => {
    assert.notEqual(passwordHash('09120000000', 'secret1'), passwordHash('09121111111', 'secret1'));
    assert.equal(passwordHash('09120000000', 'secret1'), passwordHash('09120000000', 'secret1'));
  });
});
