// Run: node test/sizes.test.js
// Reference values are from published jeweller conversion charts
// (inner diameter mm -> US / UK / EU / JP). UK follows BS 6820 (C = 40 mm
// circumference, 1.25 mm per letter); Japan follows 13.0 mm at size 1 plus
// 1/3 mm per size.
const assert = require('assert');
const S = require('../sizes.js');

const cases = [
  // mm,    US,    UK,   EU,   JP
  [14.86, '4',   'H½', '47', '7'],
  [15.70, '5',   'J½', '49', '9'],
  [16.51, '6',   'L½', '52', '12'],
  [17.32, '7',   'N½', '54', '14'],
  [18.14, '8',   'P½', '57', '16'],
  [18.95, '9',   'R½', '60', '19'],
  [19.76, '10',  'T½', '62', '21'],
  [20.57, '11',  'V½', '65', '24'],
  [21.39, '12',  'Y',  '67', '26']
];

for (const [mm, us, uk, eu, jp] of cases) {
  const r = S.all(mm);
  assert.strictEqual(r.us, us, `US for ${mm}`);
  assert.strictEqual(r.uk, uk, `UK for ${mm}`);
  assert.strictEqual(r.eu, eu, `EU for ${mm}`);
  assert.strictEqual(r.jp, jp, `JP for ${mm}`);
}

assert.strictEqual(S.formatUs(S.mmFromUs(6.5)), '6½');
assert.strictEqual(S.formatUs(S.mmFromUs(6.25)), '6¼');
assert.strictEqual(S.formatUs(S.mmFromUs(6.75)), '6¾');
assert.ok(Math.abs(S.all(17.32).circumference - 54.41) < 0.02);
assert.strictEqual(S.chart().length, 25);

console.log('sizes: all', cases.length + 5, 'checks passed');
