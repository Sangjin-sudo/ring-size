// Ring size maths. All inputs and outputs are inner diameter in millimetres.
// Shared by the page and by the Node test (test/sizes.test.js).
(function (root) {
  'use strict';

  var PI = Math.PI;
  var MIN_MM = 12.0;
  var MAX_MM = 25.0;

  // US/Canada: size 0 is 11.63 mm, each full size adds 0.8128 mm (0.032 in).
  function usFromMm(d) { return (d - 11.63) / 0.8128; }
  function mmFromUs(s) { return 11.63 + 0.8128 * s; }

  // EU (ISO 8653): the size is the inner circumference in mm.
  function euFromMm(d) { return d * PI; }

  // UK/Australia: A is 37.5 mm circumference, each letter adds 1.25 mm.
  function ukIndexFromMm(d) { return (d * PI - 36.25) / 1.25; }

  // Japan: size 1 is 13.0 mm, each size adds 1/3 mm of diameter.
  function jpFromMm(d) { return (d - 12.6667) * 3; }

  function roundTo(x, step) { return Math.round(x / step) * step; }

  function formatUs(d) {
    var s = roundTo(usFromMm(d), 0.25);
    if (s < 0) s = 0;
    var whole = Math.floor(s + 1e-9);
    var frac = s - whole;
    var f = frac > 0.7 ? '¾' : frac > 0.4 ? '½' : frac > 0.2 ? '¼' : '';
    return (whole === 0 && f ? '' : String(whole)) + f;
  }

  function formatUk(d) {
    var i = roundTo(ukIndexFromMm(d), 0.5);
    if (i < 1) i = 1;
    var whole = Math.floor(i + 1e-9);
    var half = i - whole > 0.25;
    var letter;
    if (whole <= 26) letter = String.fromCharCode(64 + whole);
    else letter = 'Z+' + (whole - 26);
    return letter + (half ? '½' : '');
  }

  function formatEu(d) { return String(Math.round(euFromMm(d))); }

  function formatJp(d) {
    var n = Math.round(jpFromMm(d));
    return String(n < 1 ? 1 : n);
  }

  function all(d) {
    return {
      mm: d,
      circumference: d * PI,
      us: formatUs(d),
      uk: formatUk(d),
      eu: formatEu(d),
      jp: formatJp(d)
    };
  }

  // Rows for the reference chart: every US half size from 3 to 15.
  function chart() {
    var rows = [];
    for (var s = 3; s <= 15; s += 0.5) rows.push(all(mmFromUs(s)));
    return rows;
  }

  var api = {
    MIN_MM: MIN_MM, MAX_MM: MAX_MM,
    usFromMm: usFromMm, mmFromUs: mmFromUs, euFromMm: euFromMm,
    ukIndexFromMm: ukIndexFromMm, jpFromMm: jpFromMm,
    formatUs: formatUs, formatUk: formatUk, formatEu: formatEu, formatJp: formatJp,
    all: all, chart: chart
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RingSizes = api;
})(typeof self !== 'undefined' ? self : this);
