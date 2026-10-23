/* =========================================================
   案例 · 油气地球化学异常识别 — 可运行示范（多指标异常检测）
   ---------------------------------------------------------
   演示内容：程序化生成 220 个化探采样点的四类指标（吸附烃 C1、
   酸解烃 C2、ΔC C3、荧光 C4），三个已知靶区各有不同"指标组合"
   特征。勾选参与判读的指标、拖动阈值，观察空间异常点与平行
   坐标如何联动，理解"单指标会漏、多指标联合才圈得全"。
   所有数据为合成，用于示意，不声称真实实测。
   ========================================================= */
(function () {
  'use strict';

  var C = {
    paper: '#fbfaf6', card: '#ffffff', line: '#e9e4d8', line2: '#ddd7c8', line3: '#c9c2b0',
    ink: '#242b2e', ink2: '#4d565b', ink3: '#79828a', ink4: '#9ba3a9',
    jade: '#2f7d6b', jadeD: '#235f51', jadeL: '#e6f1ec',
    clay: '#b26a39', clayL: '#f8ecdf', bad: '#b05a51',
    opt: '#41699b', optL: '#e7eef9'
  };

  var INDS = [
    { k: 'C1', name: '吸附烃', color: '#41699b' },
    { k: 'C2', name: '酸解烃', color: '#b26a39' },
    { k: 'C3', name: 'ΔC', color: '#7e5a8d' },
    { k: 'C4', name: '荧光', color: '#767a2e' }
  ];

  var N = 220, SPW = 380, SPH = 300, PCW = 420, PCH = 300;

  function mulberry(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function gauss(rnd, mu, sd) {
    var u = 0, v = 0;
    while (u === 0) u = rnd(); while (v === 0) v = rnd();
    return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /* 三个靶区：中心、半径、各指标"抬升签名" */
  var AREAS = [
    { x: 26, y: 30, r: 13, sig: [2.6, 2.4, 0.2, 0.3], name: '靶区 A' },
    { x: 66, y: 62, r: 12, sig: [0.3, 0.2, 2.7, 2.5], name: '靶区 B' },
    { x: 48, y: 22, r: 12, sig: [1.8, 1.9, 1.7, 1.8], name: '靶区 C' }
  ];

  var points = [];

  function genData() {
    var rnd = mulberry(20261027);
    points = [];
    for (var i = 0; i < N; i++) {
      var x = rnd() * 100, y = rnd() * 100;
      var vals = [0, 0, 0, 0];
      // 落入某个靶区则按其签名抬升
      var area = null;
      for (var a = 0; a < AREAS.length; a++) {
        var dx = x - AREAS[a].x, dy = y - AREAS[a].y;
        if (Math.sqrt(dx * dx + dy * dy) < AREAS[a].r) { area = AREAS[a]; break; }
      }
      for (var j = 0; j < 4; j++) {
        var base = 10;
        if (area) base += 32 * area.sig[j];
        vals[j] = Math.max(0, gauss(rnd, base, 6));
      }
      points.push({ x: x, y: y, v: vals, area: area ? area.name : null });
    }
  }

  function norm(v) { return Math.min(1, v / 60); }

  function score(p, sel) {
    var s = 0, n = 0;
    for (var j = 0; j < 4; j++) if (sel[j]) { s += norm(p.v[j]); n++; }
    return n ? s / n : 0;
  }

  function heat(t) {
    // 0→蓝绿, 1→橙红
    var r = Math.round(65 + t * 180), g = Math.round(150 - t * 80), b = Math.round(170 - t * 150);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function h(tag, attrs, children, parent) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'style') e.style.cssText = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    if (children != null) {
      if (Array.isArray(children)) children.forEach(function (c) { e.appendChild(c); });
      else if (typeof children === 'string') e.textContent = children;
      else e.appendChild(children);
    }
    if (parent) parent.appendChild(e);
    return e;
  }

  var cleanups = [];

  function mount(root) {
    var sel = [true, true, true, true];
    var thr = 0.5;
    var spCanvas, spCtx, pcCanvas, pcCtx;
    var selBoxes = [], statEls = {};

    var wrap = h('div', { style: 'font-family:var(--sans,system-ui);color:' + C.ink + ';font-size:13px;line-height:1.6;padding:4px 2px 8px' }, null, root);

    h('b', { text: '互动演示：多指标联合判读圈定化探靶区', style: 'font-size:14.5px;color:' + C.ink + ';display:block;margin-bottom:8px' }, null, wrap);
    h('div', { text: '勾选参与判读的指标、拖动异常阈值，观察「空间分布」与「平行坐标」如何联动——单指标会漏掉部分靶区，多指标联合才圈得全。', style: 'font-size:12.5px;color:' + C.ink2 + ';margin-bottom:10px' }, null, wrap);

    // 控制栏：指标勾选
    var ctl = h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px' }, null, wrap);
    h('span', { text: '参与判读指标：', style: 'color:' + C.ink3 + ';font-size:12.5px' }, null, ctl);
    INDS.forEach(function (ind, j) {
      var box = h('label', { style: 'display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:14px;border:1px solid ' + ind.color + ';color:' + ind.color + ';font-size:12px;cursor:pointer;background:#fff' },
        [h('input', { type: 'checkbox', checked: '' }), h('span', { text: ind.k + ' ' + ind.name })], ctl);
      box.querySelector('input').onchange = function (e) {
        sel[j] = e.target.checked;
        box.style.background = sel[j] ? ind.color : '#fff';
        box.style.color = sel[j] ? '#fff' : ind.color;
        draw();
      };
      selBoxes.push(box);
    });

    // 阈值滑杆
    var thrBar = h('div', { style: 'display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap' }, null, wrap);
    h('span', { text: '异常阈值', style: 'color:' + C.ink3 + ';font-size:12.5px' }, null, thrBar);
    var slider = h('input', { type: 'range', min: '0.2', max: '0.9', step: '0.01', value: '0.5', style: 'width:220px' }, null, thrBar);
    var thrOut = h('span', { text: '0.50', style: 'font-family:var(--mono,monospace);color:' + C.ink2 + ';font-size:12px' }, null, thrBar);
    slider.oninput = function () { thr = parseFloat(slider.value); thrOut.textContent = thr.toFixed(2); draw(); };

    // 两个画布并排
    var grid = h('div', { style: 'display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start;margin-bottom:10px' }, null, wrap);

    var spBox = h('div', { style: 'background:' + C.card + ';border:1px solid ' + C.line2 + ';border-radius:10px;padding:10px;box-shadow:0 1px 2px rgba(48,44,30,.05)' }, null, grid);
    h('div', { text: '采样点空间分布（颜色 = 联合异常强度）', style: 'font-size:12px;font-weight:600;color:' + C.ink2 + ';margin-bottom:6px' }, null, spBox);
    spCanvas = h('canvas', { style: 'display:block' }, null, spBox);
    spCanvas.width = SPW; spCanvas.height = SPH;
    spCtx = spCanvas.getContext('2d');

    var pcBox = h('div', { style: 'background:' + C.card + ';border:1px solid ' + C.line2 + ';border-radius:10px;padding:10px;box-shadow:0 1px 2px rgba(48,44,30,.05)' }, null, grid);
    h('div', { text: '平行坐标（每条折线 = 一个采样点的四指标剖面）', style: 'font-size:12px;font-weight:600;color:' + C.ink2 + ';margin-bottom:6px' }, null, pcBox);
    pcCanvas = h('canvas', { style: 'display:block' }, null, pcBox);
    pcCanvas.width = PCW; pcCanvas.height = PCH;
    pcCtx = pcCanvas.getContext('2d');

    // 指标卡
    var stats = h('div', { style: 'display:flex;gap:10px;flex-wrap:wrap' }, null, wrap);
    function statCard(k, label) {
      var card = h('div', { style: 'background:' + C.optL + ';border-radius:8px;padding:9px 14px;min-width:100px' }, null, stats);
      var v = h('div', { text: '—', style: 'font-size:19px;font-weight:700;color:' + C.opt + ';font-family:var(--mono,monospace)' }, null, card);
      h('div', { text: label, style: 'font-size:11px;color:' + C.opt + ';opacity:.75' }, null, card);
      statEls[k] = v;
    }
    statCard('n', '检出异常点数'); statCard('a', '圈定靶区数'); statCard('m', '单指标平均漏检率');

    function drawSpatial() {
      spCtx.clearRect(0, 0, SPW, SPH);
      spCtx.fillStyle = C.paper; spCtx.fillRect(0, 0, SPW, SPH);
      var pad = 20;
      function px(x) { return pad + x / 100 * (SPW - 2 * pad); }
      function py(y) { return pad + y / 100 * (SPH - 2 * pad); }
      // 靶区椭圆（先画，作为背景）
      AREAS.forEach(function (a) {
        spCtx.beginPath();
        spCtx.ellipse(px(a.x), py(a.y), a.r / 100 * (SPW - 2 * pad), a.r / 100 * (SPH - 2 * pad), 0, 0, Math.PI * 2);
        spCtx.fillStyle = 'rgba(65,105,155,.06)'; spCtx.fill();
        spCtx.strokeStyle = 'rgba(65,105,155,.28)'; spCtx.setLineDash([4, 3]); spCtx.stroke(); spCtx.setLineDash([]);
      });
      var flagged = 0, areaHits = {};
      points.forEach(function (p) {
        var s = score(p, sel);
        var isAnom = s >= thr;
        var cx = px(p.x), cy = py(p.y);
        if (isAnom) { flagged++; if (p.area) areaHits[p.area] = 1; }
        spCtx.beginPath(); spCtx.arc(cx, cy, isAnom ? 4 : 2.5, 0, Math.PI * 2);
        spCtx.fillStyle = isAnom ? '#e0483a' : heat(s);
        spCtx.fill();
        if (isAnom) { spCtx.strokeStyle = '#e0483a'; spCtx.lineWidth = 1.5; spCtx.stroke(); }
      });
      return { flagged: flagged, areaHits: Object.keys(areaHits).length };
    }

    function drawParallel() {
      pcCtx.clearRect(0, 0, PCW, PCH);
      pcCtx.fillStyle = C.paper; pcCtx.fillRect(0, 0, PCW, PCH);
      var padL = 30, padR = 12, padT = 14, padB = 24;
      var xs = INDS.map(function (_, j) { return padL + j / 3 * (PCW - padL - padR); });
      function yOf(v) { return padT + (1 - norm(v)) * (PCH - padT - padB); }

      // 轴
      INDS.forEach(function (ind, j) {
        pcCtx.strokeStyle = C.line3; pcCtx.beginPath();
        pcCtx.moveTo(xs[j], padT); pcCtx.lineTo(xs[j], PCH - padB); pcCtx.stroke();
        pcCtx.fillStyle = ind.color; pcCtx.font = '11px sans-serif'; pcCtx.textAlign = 'center';
        pcCtx.fillText(ind.k + ' ' + ind.name, xs[j], PCH - 8);
        pcCtx.textAlign = 'left'; pcCtx.fillStyle = C.ink4; pcCtx.font = '9px monospace';
        pcCtx.fillText('60', xs[j] + 3, padT + 3);
        pcCtx.fillText('0', xs[j] + 3, PCH - padB);
      });

      // 先画背景点（灰），再画异常点（红）
      var anoms = points.filter(function (p) { return score(p, sel) >= thr; });
      function line(p, color, w, alpha) {
        pcCtx.beginPath();
        for (var j = 0; j < 4; j++) { var y = yOf(p.v[j]); if (j === 0) pcCtx.moveTo(xs[j], y); else pcCtx.lineTo(xs[j], y); }
        pcCtx.strokeStyle = color; pcCtx.globalAlpha = alpha; pcCtx.lineWidth = w; pcCtx.stroke(); pcCtx.globalAlpha = 1;
      }
      points.forEach(function (p) { if (score(p, sel) < thr) line(p, C.line2, 1, 0.55); });
      anoms.forEach(function (p) { line(p, '#e0483a', 1.6, 0.85); });

      // 图例
      pcCtx.font = '10.5px sans-serif'; pcCtx.textAlign = 'left';
      pcCtx.fillStyle = '#e0483a'; pcCtx.fillText('— 异常点（≥ 阈值）', padL + 4, 14);
      pcCtx.fillStyle = C.ink3; pcCtx.fillText('— 背景点', padL + 140, 14);
    }

    function draw() {
      var r = drawSpatial();
      drawParallel();
      statEls.n.textContent = r.flagged;
      statEls.a.textContent = r.areaHits;
      statEls.m.textContent = (Math.max(0, (3 - r.areaHits) / 3 * 100).toFixed(0)) + '%';
    }

    genData();
    draw();

    return { unmount: function () { cleanups.forEach(function (f) { try { f(); } catch (e) { } }); cleanups = []; } };
  }

  var state = null;
  function start(root) { if (state && state.unmount) state.unmount(); state = mount(root); }
  function unmount() { if (state && state.unmount) state.unmount(); state = null; }

  window.D27 = window.D27 || {};
  window.D27.geochem = { mount: start, unmount: unmount };
})();
