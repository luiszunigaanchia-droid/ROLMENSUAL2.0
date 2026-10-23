'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function getDB() {
  const storage = new Map([
    ['valid', '{"count":3}'],
    ['invalid', '{invalid-json']
  ]);
  const context = {
    window: {},
    localStorage: {
      getItem(key) {
        if (key === 'blocked') throw new Error('Storage blocked');
        return storage.get(key) ?? null;
      }
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'db.js'), 'utf8'), context);
  return context.window.RolDB;
}

test('cleanText removes control characters and respects maximum length', () => {
  const db = getDB();
  assert.equal(db.cleanText('  A\n   B \t C  '), 'A B C');
  assert.equal(db.cleanText(null), '');
  assert.equal(db.cleanText('12345', 3), '123');
});

test('normalizeText folds accents, whitespace and case', () => {
  const db = getDB();
  assert.equal(db.normalizeText('  ÁNGELA   LÓPEZ '), 'angela lopez');
  assert.equal(db.normalizeText(null), '');
});

test('JSON storage preserves fallback when data is missing, invalid or blocked', () => {
  const db = getDB();
  const fallback = { safe: true };
  assert.equal(db.parseJSONStorage('missing', fallback), fallback);
  assert.equal(db.parseJSONStorage('invalid', fallback), fallback);
  assert.equal(db.parseJSONStorage('blocked', fallback), fallback);
  assert.equal(db.parseJSONStorage('valid', fallback).count, 3);
});
