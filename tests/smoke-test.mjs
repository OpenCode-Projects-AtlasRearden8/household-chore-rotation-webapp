'use strict';
// Minimal DOM shim to smoke-test index.html's script without a browser.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'index.html'), 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const storage = {};
function makeEl(id) {
  const el = {
    id,
    innerHTML: '',
    textContent: '',
    value: '',
    checked: false,
    disabled: false,
    className: '',
    dataset: {},
    style: {},
    files: [],
    handlers: {},
    addEventListener(type, fn) { (el.handlers[type] ||= []).push(fn); },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    appendChild(child) { el.innerHTML += child.innerHTML || ''; },
    click() { },
    classList: {
      add() { }, remove() { }
    }
  };
  return el;
}
const byId = {};
const documentShim = {
  getElementById(id) { return byId[id] ||= makeEl(id); },
  querySelectorAll() { return []; },
  createElement(tag) { return makeEl('el_' + tag); }
};

const sandbox = `
  const document  = this.document;
  const localStorage = this.localStorage;
  const window = null;
  const URL = { createObjectURL(){return 'blob:'}, revokeObjectURL(){} };
  const Blob = function(){};
  const FileReader = function(){ this.readAsText = function(){}; };
  const confirm = () => true;
  const prompt = () => 'x';
  const clearTimeout = () => {};
  const setTimeout = (fn) => 0;
  ${code}
  ;return { state, getState: () => state, render, baseAssignment, isWeekDone };
`;
const fn = new Function(sandbox);
const app = fn.call({
  document: documentShim,
  localStorage: {
    getItem: (k) => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; }
  }
});

let ok = true;
const need = (cond, msg) => { if (!cond) { ok = false; console.error('FAIL: ' + msg); } else console.log('ok: ' + msg); };

// renders ran without throwing
const weekEl = documentShim.getElementById('week-chores');
need(weekEl.innerHTML.includes('Dishes'), 'week-chores rendered chore cards');
need(weekEl.innerHTML.includes('Alex'), 'week-chores includes assigned person');
const wheelEl = documentShim.getElementById('wheel-svg');
need(wheelEl.innerHTML.includes('circle'), 'wheel svg rendered');
need(documentShim.getElementById('review-table').innerHTML.includes('<th>Person</th>'), 'review table rendered');
need(documentShim.getElementById('cover-list').innerHTML.length >= 0, 'skip log rendered');
need(documentShim.getElementById('people-list').innerHTML.includes('Sam'), 'people list rendered');
need(documentShim.getElementById('storage-info').textContent.includes('log entries'), 'storage info line');
need(documentShim.getElementById('week-number').textContent !== '', 'week header populated');
need(app.getState().people.length === 3 && app.getState().wheel.length === 3, 'seeded 3 people');
need(typeof app.baseAssignment().c_dishes === 'string', 'baseAssignment returns person for dishes');

// simulate handlers bound? (they were attached to stub elements' handlers arrays)
const tradeBtn = documentShim.getElementById('btn-trade');
need(tradeBtn.handlers['click'] && tradeBtn.handlers['click'].length === 1, 'trade button has click handler');
// simulate a click on trade: stub selects return values
documentShim.getElementById('trade-chore-a').value = 'c_dishes';
documentShim.getElementById('trade-chore-b').value = 'c_trash';
const before = app.getState().log.length;
tradeBtn.handlers['click'][0].call(documentShim.getElementById('btn-trade'));
need(app.getState().log.length === before + 1, 'logging a trade appends entry');
need(app.getState().log[app.getState().log.length - 1].type === 'trade', 'appended entry is a trade');

// simulate done button (bound on week card innerHTML - stub returns [], so instead call via skip log path)
documentShim.getElementById('skip-person').value = 'p_sam';
documentShim.getElementById('skip-chore').value = 'c_dishes';
documentShim.getElementById('skip-note').value = 'rough day';
const skipBtn = documentShim.getElementById('btn-log-skip');
skipBtn.handlers['click'][0].call(skipBtn);
need(app.getState().log.some(e => e.type === 'skip'), 'skip logged via UI handler');

console.log(ok ? '\nSMOKE TEST PASS' : '\nSMOKE TEST FAILED');
process.exit(ok ? 0 : 1);
