(function () {
  'use strict';

  var S = window.RingSizes;
  var $ = function (id) { return document.getElementById(id); };

  var CARD_SHORT_MM = 53.98; // ISO/IEC 7810 ID-1 card, short side
  var CHECK_MM = 50;
  var STORE_KEY = 'ringsizer.v1';

  // Coin diameters in mm, from the issuing mints' specifications.
  var COINS = [
    ['US quarter', 24.26], ['US nickel', 21.21], ['US penny', 19.05], ['US dime', 17.91],
    ['Euro €2', 25.75], ['Euro €1', 23.25], ['Euro 50 cent', 24.25], ['Euro 20 cent', 22.25],
    ['UK 10p', 24.5], ['UK 2p', 25.9], ['UK 1p', 20.3],
    ['Canada $1 (loonie)', 26.5],
    ['Australia $1', 25.0], ['Australia $2', 20.5],
    ['Japan ¥100', 22.6], ['Japan ¥10', 23.5], ['Japan ¥500', 26.5]
  ];

  var state = {
    pxPerMm: null,       // CSS px per real millimetre, null until calibrated
    dpr: null,           // devicePixelRatio at calibration time
    sys: 'us',
    calObject: 'card',
    coin: 0,
    method: 'ring',
    ringMm: 17.3,
    circMm: 54.4
  };

  function load() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (saved && typeof saved === 'object') {
        for (var k in state) if (saved[k] !== undefined && saved[k] !== null) state[k] = saved[k];
      }
    } catch (e) { /* storage unavailable: run without remembering */ }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function isTouch() { return window.matchMedia && window.matchMedia('(pointer: coarse)').matches; }

  // ---------- calibration ----------
  var draftPxPerMm;

  function refMm() {
    return state.calObject === 'card' ? CARD_SHORT_MM : COINS[state.coin][1];
  }

  function renderCalib() {
    var isCard = state.calObject === 'card';
    $('tabCard').setAttribute('aria-selected', String(isCard));
    $('tabCoin').setAttribute('aria-selected', String(!isCard));
    $('coinPick').hidden = isCard;
    $('calibBar').hidden = !isCard;
    $('calibDisc').hidden = isCard;
    $('calibStage').classList.toggle('coin', !isCard);
    $('calibHelp').innerHTML = isCard
      ? 'Hold any bank, ID or loyalty card with its <strong>short edge</strong> on the bar and one corner at the bar’s left end. Drag the round handle until the line meets the card’s other corner.'
      : 'Lay the coin on the circle. Drag outward or inward until the circle just disappears behind the coin.';
    $('calMinusLbl').textContent = isCard ? 'Shorter' : 'Smaller';
    $('calPlusLbl').textContent = isCard ? 'Longer' : 'Larger';

    // Never let the shape grow past the visible stage.
    var lim = calibLimitPx();
    var px = refMm() * draftPxPerMm;
    if (px > lim) { px = lim; draftPxPerMm = px / refMm(); }
    var atMax = px >= lim - 0.01;
    if (isCard) {
      $('calibBar').style.width = px + 'px';
      $('calibGrip').style.left = px + 'px';
      $('calibStage').style.minHeight = '';
    } else {
      $('calibDisc').style.width = px + 'px';
      $('calibDisc').style.height = px + 'px';
      $('calibStage').style.minHeight = Math.ceil(lim + 32) + 'px';
    }
    $('calLimit').hidden = !atMax;
    if (atMax) {
      $('calLimit').textContent = isCard
        ? 'That is as wide as this screen goes. If the card is still longer, turn the phone sideways or switch to Coin.'
        : 'That is as large as this screen goes. Try a smaller coin or the bank card.';
    }
  }

  // Largest size in px the calibration shape may take on this screen.
  function calibLimitPx() {
    var w = $('calibStage').clientWidth;
    if (state.calObject === 'card') return Math.max(60, w - 24);   // keep the grip on screen
    return Math.max(60, Math.min(w - 32, 260));
  }

  function showCalib() {
    draftPxPerMm = state.pxPerMm || (isTouch() ? 6.2 : 3.78);
    $('calib').hidden = false;
    $('measure').hidden = true;
    $('recal').hidden = true;
    renderCalib();
    window.scrollTo(0, 0);
  }

  function finishCalib() {
    state.pxPerMm = draftPxPerMm;
    state.dpr = window.devicePixelRatio || 1;
    save();
    showMeasure();
  }

  // ---------- measuring ----------
  function currentMm() {
    return state.method === 'ring' ? state.ringMm : state.circMm / Math.PI;
  }

  function fmt(n, d) { return n.toFixed(d); }

  function renderResult() {
    var d = clamp(currentMm(), S.MIN_MM, S.MAX_MM);
    var r = S.all(d);
    $('oUs').textContent = r.us;
    $('oUk').textContent = r.uk;
    $('oEu').textContent = r.eu;
    $('oJp').textContent = r.jp;
    $('bigSize').textContent = r[state.sys];
    $('oMm').textContent = fmt(r.mm, 1);
    $('oCirc').textContent = fmt(r.circumference, 1);

    // Say so when the measurement sits on the line between two quarter sizes.
    var us = S.usFromMm(d);
    var lower = Math.floor(us * 4) / 4;
    var mid = lower + 0.125;
    var el = $('between');
    if (Math.abs(us - mid) < 0.04 && lower >= 0) {
      el.textContent = 'You are right between US ' + S.formatUs(S.mmFromUs(lower)) + ' and ' +
        S.formatUs(S.mmFromUs(lower + 0.25)) + '. If unsure, the larger one is the safer choice.';
      el.hidden = false;
    } else {
      el.hidden = true;
    }

    // Highlight the nearest chart row.
    var rows = $('chart').tBodies[0].rows, best = -1, bestDiff = 1e9;
    for (var i = 0; i < rows.length; i++) {
      var diff = Math.abs(parseFloat(rows[i].dataset.mm) - d);
      if (diff < bestDiff) { bestDiff = diff; best = i; }
      rows[i].className = '';
    }
    if (best >= 0) rows[best].className = 'me';
  }

  function renderRing() {
    var px = state.ringMm * state.pxPerMm;
    $('ringDisc').style.width = px + 'px';
    $('ringDisc').style.height = px + 'px';
    $('ringRange').value = state.ringMm;
  }

  function renderStrip() {
    var px = state.circMm * state.pxPerMm;
    $('stripLine').style.width = px + 'px';
    $('stripMark').style.left = (px - 1) + 'px';
    $('circRange').value = state.circMm;
    if (document.activeElement !== $('circInput')) $('circInput').value = fmt(state.circMm, 1);
    $('stripTooLong').hidden = px <= $('stripStage').clientWidth;
  }

  function renderMeasure() {
    var ring = state.method === 'ring';
    $('tabRing').setAttribute('aria-selected', String(ring));
    $('tabFinger').setAttribute('aria-selected', String(!ring));
    $('ringMode').hidden = !ring;
    $('fingerMode').hidden = ring;
    $('system').value = state.sys;
    $('checkLine').style.width = (CHECK_MM * state.pxPerMm) + 'px';
    if (ring) renderRing(); else renderStrip();
    renderResult();
  }

  function showMeasure() {
    $('calib').hidden = true;
    $('measure').hidden = false;
    $('recal').hidden = false;
    renderMeasure();
    window.scrollTo(0, 0);
  }

  function buildChart() {
    var body = $('chart').tBodies[0];
    var rows = S.chart();
    var html = '';
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      html += '<tr data-mm="' + r.mm.toFixed(3) + '"><td>' + fmt(r.mm, 1) + '</td><td>' + r.us +
        '</td><td>' + r.uk + '</td><td>' + r.eu + '</td><td>' + r.jp + '</td></tr>';
    }
    body.innerHTML = html;
  }

  // ---------- zoom guard ----------
  function checkZoom() {
    var pinch = window.visualViewport && Math.abs(window.visualViewport.scale - 1) > 0.01;
    var dprChanged = state.pxPerMm && state.dpr && Math.abs((window.devicePixelRatio || 1) - state.dpr) > 0.01;
    var w = $('zoomWarn');
    if (pinch) {
      w.textContent = 'The page is zoomed in. Pinch back out to normal size or the measurements on screen will be wrong.';
      w.hidden = false;
    } else if (dprChanged) {
      w.textContent = 'The zoom level has changed since you calibrated. Set it back, or tap Recalibrate.';
      w.hidden = false;
    } else {
      w.hidden = true;
    }
  }

  // ---------- controls ----------
  // A nudge button steps once on press and repeats while held.
  function holdable(btn, fn) {
    var timer = null, delay = null;
    function stop() { clearTimeout(delay); clearInterval(timer); timer = delay = null; }
    btn.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      fn();
      delay = setTimeout(function () { timer = setInterval(fn, 60); }, 350);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { btn.addEventListener(ev, stop); });
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
    });
  }

  function setRing(mm) { state.ringMm = clamp(Math.round(mm * 20) / 20, S.MIN_MM, S.MAX_MM); renderRing(); renderResult(); save(); }
  function setCirc(mm) { state.circMm = clamp(Math.round(mm * 10) / 10, 38, 78); renderStrip(); renderResult(); save(); }
  function setDraft(v) { draftPxPerMm = clamp(v, 2.5, 14); renderCalib(); }
  function setDraftPx(px) { setDraft(px / refMm()); }
  function nudgeDraft(dir) { setDraftPx(refMm() * draftPxPerMm + dir * 0.5); }

  function wire() {
    var coinSel = $('coin');
    COINS.forEach(function (c, i) {
      var o = document.createElement('option');
      o.value = i; o.textContent = c[0] + ' (' + c[1] + ' mm)';
      coinSel.appendChild(o);
    });
    coinSel.value = state.coin;
    coinSel.addEventListener('change', function () { state.coin = +coinSel.value; renderCalib(); });

    $('tabCard').addEventListener('click', function () { state.calObject = 'card'; renderCalib(); });
    $('tabCoin').addEventListener('click', function () { state.calObject = 'coin'; renderCalib(); });
    holdable($('calMinus'), function () { nudgeDraft(-1); });
    holdable($('calPlus'), function () { nudgeDraft(1); });

    // Drag anywhere on the stage: the bar's end (or the coin's rim) follows the finger.
    var cstage = $('calibStage');
    function calDrag(e) {
      var r = cstage.getBoundingClientRect();
      if (state.calObject === 'card') {
        setDraftPx(e.clientX - r.left);
      } else {
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        setDraftPx(2 * Math.sqrt(dx * dx + dy * dy));
      }
    }
    cstage.addEventListener('pointerdown', function (e) { cstage.setPointerCapture(e.pointerId); calDrag(e); });
    cstage.addEventListener('pointermove', function (e) { if (cstage.hasPointerCapture(e.pointerId)) calDrag(e); });
    $('calDone').addEventListener('click', finishCalib);
    $('recal').addEventListener('click', showCalib);

    $('tabRing').addEventListener('click', function () { state.method = 'ring'; save(); renderMeasure(); });
    $('tabFinger').addEventListener('click', function () { state.method = 'finger'; save(); renderMeasure(); });
    $('ringRange').addEventListener('input', function () { setRing(+this.value); });
    holdable($('ringMinus'), function () { setRing(state.ringMm - 0.05); });
    holdable($('ringPlus'), function () { setRing(state.ringMm + 0.05); });

    $('circRange').addEventListener('input', function () { setCirc(+this.value); });
    holdable($('circMinus'), function () { setCirc(state.circMm - 0.1); });
    holdable($('circPlus'), function () { setCirc(state.circMm + 0.1); });
    $('circInput').addEventListener('input', function () {
      var v = parseFloat(this.value);
      if (isFinite(v) && v >= 38 && v <= 78) setCirc(v);
    });
    $('circInput').addEventListener('blur', function () { this.value = fmt(state.circMm, 1); });

    // Dragging on the ring stage resizes the circle: its rim follows the finger.
    var rstage = $('ringStage');
    function ringDrag(e) {
      var r = rstage.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      setRing(2 * Math.sqrt(dx * dx + dy * dy) / state.pxPerMm);
    }
    rstage.addEventListener('pointerdown', function (e) { rstage.setPointerCapture(e.pointerId); ringDrag(e); });
    rstage.addEventListener('pointermove', function (e) { if (rstage.hasPointerCapture(e.pointerId)) ringDrag(e); });

    // Dragging on the strip moves the marker.
    var strip = $('stripStage');
    function dragTo(e) {
      var x = e.clientX - strip.getBoundingClientRect().left;
      setCirc(x / state.pxPerMm);
    }
    strip.addEventListener('pointerdown', function (e) { strip.setPointerCapture(e.pointerId); dragTo(e); });
    strip.addEventListener('pointermove', function (e) { if (strip.hasPointerCapture(e.pointerId)) dragTo(e); });

    $('system').addEventListener('change', function () { state.sys = this.value; save(); renderResult(); });

    $('share').addEventListener('click', function () {
      var r = S.all(clamp(currentMm(), S.MIN_MM, S.MAX_MM));
      var text = 'My ring size: US ' + r.us + ', UK ' + r.uk + ', EU ' + r.eu + ', JP ' + r.jp +
        ' (' + fmt(r.mm, 1) + ' mm inside diameter)';
      var btn = this;
      function done(ok) {
        btn.textContent = ok ? 'Copied' : 'Could not copy';
        setTimeout(function () { btn.textContent = 'Copy result'; }, 1600);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      } else {
        done(false);
      }
    });

    if (window.visualViewport) window.visualViewport.addEventListener('resize', checkZoom);
    window.addEventListener('resize', function () {
      checkZoom();
      if (!$('measure').hidden && state.method === 'finger') renderStrip();
      if (!$('calib').hidden) renderCalib();
    });
  }

  load();
  buildChart();
  wire();
  if (state.pxPerMm) showMeasure(); else showCalib();
  checkZoom();

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(function () { /* offline support is optional */ });
  }
})();
