import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function loadRuntime() {
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(new URL('../src/catalog/labs.js', import.meta.url), 'utf8'), context, { filename:'labs.js' });
  vm.runInContext(fs.readFileSync(new URL('../src/core/health-engine.js', import.meta.url), 'utf8'), context, { filename:'health-engine.js' });
  return context.window;
}

const runtime = loadRuntime();
const engine = runtime.MarkovHealthEngine;

test('Russian and English aliases resolve to the same analyte', () => {
  assert.equal(engine.findAnalyte('ТТГ').id, 'tsh');
  assert.equal(engine.findAnalyte('TSH').id, 'tsh');
  assert.equal(engine.findAnalyte('фер').id, 'ferritin');
});

test('reference status uses supplied laboratory bounds only', () => {
  assert.equal(engine.labStatus({ value: 12, referenceMin: 10, referenceMax: 20 }).key, 'range');
  assert.equal(engine.labStatus({ value: 9, referenceMin: 10, referenceMax: 20 }).key, 'low');
  assert.equal(engine.labStatus({ value: 21, referenceMin: 10, referenceMax: 20 }).key, 'high');
  assert.equal(engine.labStatus({ value: 12 }).key, 'unknown');
});

test('glucose conversion is analyte-specific and reversible within tolerance', () => {
  const toMmol = engine.convertValue('glucose', 90.091, 'mg/dL', 'ммоль/л');
  assert.equal(toMmol.ok, true);
  assert.ok(Math.abs(toMmol.value - 5) < 0.01);
  const toMg = engine.convertValue('glucose', 5, 'ммоль/л', 'mg/dL');
  assert.ok(Math.abs(toMg.value - 90.091) < 0.02);
});

test('Lp(a) refuses unverified mass-to-molar conversion', () => {
  const result = engine.convertValue('Lp(a)', 50, 'mg/dL', 'nmol/L');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'conversion-not-verified');
});

test('delta returns absolute and percent changes', () => {
  const result = engine.delta(110, 100);
  assert.equal(result.absolute, 10);
  assert.equal(result.percent, 10);
});

test('correlation requires at least five observations', () => {
  assert.equal(engine.pearson([[1,1],[2,2],[3,3],[4,4]]).ok, false);
  const result = engine.pearson([[1,2],[2,4],[3,6],[4,8],[5,10]]);
  assert.equal(result.ok, true);
  assert.ok(result.r > 0.99);
});

test('AI response contract rejects missing structured fields', () => {
  assert.equal(engine.validateAIResponse({ summary:'x' }), false);
  assert.equal(engine.validateAIResponse({
    summary:'x', importantFindings:[], trends:[], possibleExplanations:[], missingContext:[], questionsForDoctor:[], limitations:[], confidence:'moderate'
  }), true);
});
