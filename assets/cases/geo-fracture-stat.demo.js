/* =========================================================
   案例 · 露头裂缝自动统计 — 可运行示范（分割阈值联动玫瑰图）
   ---------------------------------------------------------
   演示内容：程序化生成一幅露头照片（岩石纹理 + 两组优势走向的
   裂缝）。拖动"分割阈值"，检出裂缝实时改变，玫瑰图（走向统计）
   与长度直方图同步重绘——直观展示"同一张照片，换个阈值，优势
   走向会漂移"，即野外裂缝统计必须交代清楚的不确定性。
   所有数据为合成，用于示意，不声称真实实测。
   ========================================================= */
(function () {
  'use strict';

  var C = {
    paper: '#fbfaf6', card: '#ffffff', line: '#e9e4d8', line2: '#ddd7c8', line3: '#c9c2b0',
    ink: '#242b2e', ink2: '#4d565b', ink3: '#79828a', ink4: '#9ba3a9',
    jade: '#2f7d6b', jadeD: '#235f51', jadeL: '#e6f1ec',
    clay: '#b26a39', clayL: '#f8ecdf', bad: '#b05a51'
  };

  var W = 400, H = 300, ROSE = 240, LENH = 240, LENH_H = 130;

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

  var cracks = [];

  function genCracks() {
    var rnd = mulberry(20261027);
    cracks = [];
    for (var i = 0; i < 46; i++) {
      var ang = rnd() < 0.6 ? gauss(rnd, 70, 11) : gauss(rnd, 118, 12);
      cracks.push({
        x: rnd() * (W - 60) + 30,
        y: rnd() * (H - 60) + 30,
        ang: ang,
        len: gauss(rnd, 46, 16),
        contrast: 0.2 + rnd() * 0.75   // 0.2—0.95
      });
    }
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
    var thr = 0.45;
    var photoCanvas, photoCtx, roseCanvas, roseCtx, lenCanvas, lenCtx;
    var statEls = {};

    var wrap = h('div', { style: 'font-family:var(--sans,system-ui);color:' + C.ink + ';font-size:13px;line-height:1.6;padding:4px 2px 8px' }, null, root);

    h('b', { text: '互动演示：拖动阈值，看优势走向如何漂移', style: 'font-size:14.5px;color:' + C.ink + ';display:block;margin-bottom:6px' }, null, wrap);
    h('div', { text: '同一张露头照片，分割阈值一调，检出裂缝、玫瑰图（走向统计）、长度直方图全部实时变化——这正是野外裂缝统计必须交代清楚的不确定性。', style: 'font-size:12.5px;color:' + C.ink2 + ';margin-bottom:10px' }, null, wrap);

    var bar = h('div', { style: 'display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px' }, null, wrap);
    h('button', { text: '🪨 重新生成露头', style: 'background:' + C.jadeL + ';color:' + C.jadeD + ';border:1px solid transparent;border-radius:7px;padding:6px 13px;font-size:12.5px;font-weight:600;cursor:pointer', onclick: function () { genCracks(); draw(); } }, null, bar);
    h('span', { text: '分割阈值', style: 'color:' + C.ink3 + ';font-size:12.5px' }, null, bar);
    var slider = h('input', { type: 'range', min: '0.2', max: '0.9', step: '0.01', value: '0.45', style: 'width:200px' }, null, bar);
    var thrOut = h('span', { text: '0.45', style: 'font-family:var(--mono,monospace);color:' + C.ink2 + ';font-size:12px' }, null, bar);
    slider.oninput = function () { thr = parseFloat(slider.value); thrOut.textContent = thr.toFixed(2); draw(); };

    var grid = h('div', { style: 'display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start;margin-bottom:10px' }, null, wrap);

    var photoBox = h('div', { style: 'background:' + C.card + ';border:1px solid ' + C.line2 + ';border-radius:10px;padding:10px;box-shadow:0 1px 2px rgba(48,44,30,.05)' }, null, grid);
    h('div', { text: '露头照片（绿色 = 检出裂缝）', style: 'font-size:12px;font-weight:600;color:' + C.ink2 + ';margin-bottom:6px' }, null, photoBox);
    photoCanvas = h('canvas', { style: 'display:block' }, null, photoBox);
    photoCanvas.width = W; photoCanvas.height = H;
    photoCtx = photoCanvas.getContext('2d');

    var roseBox = h('div', { style: 'background:' + C.card + ';border:1px solid ' + C.line2 + ';border-radius:10px;padding:10px;box-shadow:0 1px 2px rgba(48,44,30,.05)' }, null, grid);
    h('div', { text: '裂缝走向玫瑰图（走向 0—180°）', style: 'font-size:12px;font-weight:600;color:' + C.ink2 + ';margin-bottom:6px' }, null, roseBox);
    roseCanvas = h('canvas', { style: 'display:block' }, null, roseBox);
    roseCanvas.width = ROSE; roseCanvas.height = ROSE;
    roseCtx = roseCanvas.getContext('2d');
    lenCanvas = h('canvas', { style: 'display:block;margin-top:6px' }, null, roseBox);
    lenCanvas.width = LENH; lenCanvas.height = LENH_H;
    lenCtx = lenCanvas.getContext('2d');

    var stats = h('div', { style: 'display:flex;gap:10px;flex-wrap:wrap' }, null, wrap);
    function statCard(k, label) {
      var card = h('div', { style: 'background:' + C.jadeL + ';border-radius:8px;padding:9px 14px;min-width:104px' }, null, stats);
      var v = h('div', { text: '—', style: 'font-size:19px;font-weight:700;color:' + C.jadeD + ';font-family:var(--mono,monospace)' }, null, card);
      h('div', { text: label, style: 'font-size:11px;color:' + C.jadeD + ';opacity:.75' }, null, card);
      statEls[k] = v;
    }
    statCard('n', '检出裂缝数'); statCard('dom', '优势走向'); statCard('miss', '漏检率');

    function drawPhoto(detected) {
      // 岩石纹理
      var im = photoCtx.createImageData(W, H), d = im.data;
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        var v = 150 + 30 * Math.sin(x * 0.12) * Math.cos(y * 0.15);
        var p = (y * W + x) * 4;
        d[p] = v + 20; d[p + 1] = v + 10; d[p + 2] = v; d[p + 3] = 255;
      }
      photoCtx.putImageData(im, 0, 0);
      // 所有裂缝（暗色）
      cracks.forEach(function (c) {
        var dx = Math.cos(c.ang * Math.PI / 180) * c.len, dy = Math.sin(c.ang * Math.PI / 180) * c.len;
        photoCtx.beginPath();
        photoCtx.moveTo(c.x - dx, c.y - dy); photoCtx.lineTo(c.x + dx, c.y + dy);
        photoCtx.strokeStyle = 'rgba(60,54,44,' + (0.5 + c.contrast * 0.4) + ')';
        photoCtx.lineWidth = 2.2; photoCtx.stroke();
      });
      // 检出裂缝（绿色高亮）
      detected.forEach(function (c) {
        var dx = Math.cos(c.ang * Math.PI / 180) * c.len, dy = Math.sin(c.ang * Math.PI / 180) * c.len;
        photoCtx.beginPath();
        photoCtx.moveTo(c.x - dx, c.y - dy); photoCtx.lineTo(c.x + dx, c.y + dy);
        photoCtx.strokeStyle = '#2f9e7f'; photoCtx.lineWidth = 3; photoCtx.stroke();
      });
    }

    function drawRose(detected) {
      roseCtx.clearRect(0, 0, ROSE, ROSE);
      roseCtx.fillStyle = C.paper; roseCtx.fillRect(0, 0, ROSE, ROSE);
      var cx = ROSE / 2, cy = ROSE / 2, R = ROSE / 2 - 26;
      var bins = new Array(18).fill(0);
      detected.forEach(function (c) {
        var a = ((c.ang % 180) + 180) % 180;
        bins[Math.floor(a / 10)]++;
      });
      var max = Math.max.apply(null, bins.concat([1]));
      // 网格
      roseCtx.strokeStyle = C.line2; roseCtx.lineWidth = 1;
      [0.33, 0.66, 1].forEach(function (f) {
        roseCtx.beginPath(); roseCtx.arc(cx, cy, R * f, 0, Math.PI * 2); roseCtx.stroke();
      });
      // 花瓣（镜像对称，走向为轴向）
      bins.forEach(function (n, i) {
        if (!n) return;
        var mid = i * 10 + 5, half = 5;
        var rr = n / max * R;
        [[mid, mid + 180], [mid + 180, mid]].forEach(function (pair) {
          var a1 = (pair[0] - half) * Math.PI / 180, a2 = (pair[0] + half) * Math.PI / 180;
          roseCtx.beginPath();
          roseCtx.moveTo(cx, cy);
          roseCtx.arc(cx, cy, rr, a1, a2);
          roseCtx.closePath();
          roseCtx.fillStyle = 'rgba(47,125,107,.55)'; roseCtx.fill();
          roseCtx.strokeStyle = C.jadeD; roseCtx.lineWidth = 1; roseCtx.stroke();
        });
      });
      // 0° / 90° 标签
      roseCtx.fillStyle = C.ink4; roseCtx.font = '10px sans-serif'; roseCtx.textAlign = 'center';
      roseCtx.fillText('0°', cx, cy - R - 8);
      roseCtx.fillText('90°', cx + R + 14, cy + 4);
    }

    function drawLen(detected) {
      lenCtx.clearRect(0, 0, LENH, LENH_H);
      lenCtx.fillStyle = C.paper; lenCtx.fillRect(0, 0, LENH, LENH_H);
      var bins = new Array(10).fill(0);
      detected.forEach(function (c) {
        var b = Math.min(9, Math.floor(c.len / 10));
        bins[b]++;
      });
      var max = Math.max.apply(null, bins.concat([1]));
      var bw = (LENH - 30) / 10, bh = LENH_H - 30;
      bins.forEach(function (n, i) {
        var hh = n / max * bh;
        lenCtx.fillStyle = 'rgba(178,106,57,.55)';
        lenCtx.fillRect(12 + i * bw, LENH_H - 12 - hh, bw - 3, hh);
        lenCtx.fillStyle = C.ink4; lenCtx.font = '8px sans-serif'; lenCtx.textAlign = 'center';
        lenCtx.fillText((i * 10) + '', 12 + i * bw + (bw - 3) / 2, LENH_H - 2);
      });
      lenCtx.fillStyle = C.ink3; lenCtx.font = '9px sans-serif'; lenCtx.textAlign = 'left';
      lenCtx.fillText('裂缝长度分布（px）', 12, 10);
    }

    function draw() {
      var detected = cracks.filter(function (c) { return c.contrast >= thr; });
      drawPhoto(detected);
      drawRose(detected);
      drawLen(detected);
      statEls.n.textContent = detected.length + ' / ' + cracks.length;
      // 优势走向 = 玫瑰图众数
      var bins = new Array(18).fill(0);
      detected.forEach(function (c) { var a = ((c.ang % 180) + 180) % 180; bins[Math.floor(a / 10)]++; });
      var mx = Math.max.apply(null, bins), mi = bins.indexOf(mx);
      statEls.dom.textContent = detected.length ? (mi * 10 + 5) + '°' : '—';
      statEls.miss.textContent = ((cracks.length - detected.length) / cracks.length * 100).toFixed(0) + '%';
    }

    genCracks();
    draw();

    return { unmount: function () { cleanups.forEach(function (f) { try { f(); } catch (e) { } }); cleanups = []; } };
  }

  var state = null;
  function start(root) { if (state && state.unmount) state.unmount(); state = mount(root); }
  function unmount() { if (state && state.unmount) state.unmount(); state = null; }

  window.D27 = window.D27 || {};
  window.D27.fracture = { mount: start, unmount: unmount };
})();
