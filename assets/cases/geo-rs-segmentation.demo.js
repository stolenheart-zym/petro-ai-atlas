/* =========================================================
   案例 · 地质剖面遥感解译 — 可运行示范（Canvas 语义分割仿真）
   ---------------------------------------------------------
   演示内容：程序化生成一幅"假彩色"合成遥感影像（四套岩性 +
   一条错断断层），点击"运行语义分割"用扫描线逐行揭示 U-Net
   的逐像元分类结果，再提取断层线，并给出混淆矩阵与精度指标。
   所有数据为合成，用于示意"AI 输出长什么样"，不声称真实实测。
   ========================================================= */
(function () {
  'use strict';

  var C = {
    paper: '#fbfaf6', card: '#ffffff', line: '#e9e4d8', line2: '#ddd7c8', line3: '#c9c2b0',
    ink: '#242b2e', ink2: '#4d565b', ink3: '#79828a', ink4: '#9ba3a9',
    jade: '#2f7d6b', jadeD: '#235f51', jadeL: '#e6f1ec',
    clay: '#b26a39', clayL: '#f8ecdf', bad: '#b05a51'
  };

  /* 岩性：sat = 假彩色影像颜色（含植被/风化色调），out = 分割结果扁平色 */
  var ROCKS = [
    { n: '砂岩', sat: [172, 142, 96], out: [230, 185, 95] },
    { n: '泥岩', sat: [106, 118, 128], out: [141, 146, 160] },
    { n: '灰岩', sat: [158, 160, 136], out: [67, 192, 165] },
    { n: '砾岩', sat: [144, 120, 96], out: [224, 120, 86] }
  ];

  var W = 560, H = 320, FAULT_DX = 26;

  function mulberry(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function fx(y) { return 150 + 0.55 * y; }

  function bandAt(x, y) {
    var xeff = x > fx(y) ? x - FAULT_DX : x;
    var b1 = 70 + 8 * Math.sin(xeff / 60);
    var b2 = 150 + 10 * Math.sin(xeff / 45 + 1.3);
    var b3 = 230 + 8 * Math.sin(xeff / 70 + 2.2);
    if (y < b1) return 0;
    if (y < b2) return 1;
    if (y < b3) return 2;
    return 3;
  }

  function renderSatellite(ctx, rnd) {
    var im = ctx.createImageData(W, H), d = im.data;
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var z = bandAt(x, y);
        var c = ROCKS[z].sat.slice();
        var xeff = x > fx(y) ? x - FAULT_DX : x;
        var bs = [70 + 8 * Math.sin(xeff / 60), 150 + 10 * Math.sin(xeff / 45 + 1.3), 230 + 8 * Math.sin(xeff / 70 + 2.2)];
        for (var i = 0; i < 3; i++) {
          var dy = y - bs[i];
          if (Math.abs(dy) < 4) {
            var o = dy < 0 ? i + 1 : i, wgt = (4 - Math.abs(dy)) / 4 * 0.55;
            for (var k = 0; k < 3; k++) c[k] = c[k] * (1 - wgt) + ROCKS[Math.max(0, Math.min(3, o))].sat[k] * wgt;
          }
        }
        var n = (rnd() - 0.5) * 36, t = Math.sin(x * 0.11) * Math.cos(y * 0.13) * 6;
        var p = (y * W + x) * 4;
        d[p] = c[0] + n + t; d[p + 1] = c[1] + n + t; d[p + 2] = c[2] + n + t; d[p + 3] = 255;
      }
    }
    ctx.putImageData(im, 0, 0);
  }

  function renderPrediction(ctx, rnd, cm) {
    var im = ctx.createImageData(W, H), d = im.data;
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var gt = bandAt(x, y);
        var z = gt;
        var xeff = x > fx(y) ? x - FAULT_DX : x;
        var bs = [70 + 8 * Math.sin(xeff / 60), 150 + 10 * Math.sin(xeff / 45 + 1.3), 230 + 8 * Math.sin(xeff / 70 + 2.2)];
        for (var i = 0; i < 3; i++) {
          if (Math.abs(y - bs[i]) < 4 && rnd() < 0.42) z = y < bs[i] ? i + 1 : i;
        }
        if (Math.abs(x - fx(y)) < 5 && rnd() < 0.4) z = (z + 1 + (rnd() * 3 | 0)) % 4;
        if (rnd() < 0.012) z = (z + 1 + (rnd() * 3 | 0)) % 4;
        cm[gt][z]++;
        var c = ROCKS[z].out, p = (y * W + x) * 4;
        d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2]; d[p + 3] = 255;
      }
    }
    ctx.putImageData(im, 0, 0);
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
    var canvas, ctxSat, ctxPred, predCanvas, scanLine;
    var cm = null, done = false, btnSeg, btnFault, statusEl, metricsEl;

    function ctlBtn(bg, fg, border) {
      return 'background:' + bg + ';color:' + fg + ';border:1px solid ' + (border || 'transparent') +
        ';border-radius:7px;padding:6px 13px;font-size:12.5px;font-weight:600;cursor:pointer';
    }

    var wrap = h('div', { style: 'font-family:var(--sans,system-ui);color:' + C.ink + ';font-size:13px;line-height:1.6;padding:4px 2px 8px' }, null, root);

    h('div', { style: 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px' },
      [
        h('b', { text: '互动演示：从「假彩色影像」到「AI 地质图」', style: 'font-size:14.5px;color:' + C.ink }),
        h('span', { text: '岩性：', style: 'color:' + C.ink3 + ';margin-left:6px' })
      ].concat(ROCKS.map(function (r) {
        return h('span', { style: 'display:inline-flex;align-items:center;gap:4px;margin-right:10px;color:' + C.ink2 },
          [h('i', { style: 'width:11px;height:11px;border-radius:3px;background:rgb(' + r.out.join(',') + ');display:inline-block' }),
            h('span', { text: r.n })]);
      })).concat([
        h('span', { style: 'display:inline-flex;align-items:center;gap:4px;color:' + C.ink2 },
          [h('i', { style: 'width:11px;height:3px;background:#d64541;display:inline-block;border-radius:2px' }),
            h('span', { text: '断层线' })])
      ]), wrap);

    var bar = h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px' }, null, wrap);
    h('button', { text: '🛰 重新生成影像', style: ctlBtn(C.jadeL, C.jadeD), onclick: function () { resetState(); } }, null, bar);
    btnSeg = h('button', { text: '▶ 运行语义分割', style: ctlBtn(C.jade, '#fff'), disabled: '' }, null, bar);
    btnFault = h('button', { text: '📐 提取断层线', style: ctlBtn(C.clayL, C.clay), disabled: '' }, null, bar);
    var chkOverlay = h('label', { style: 'display:inline-flex;align-items:center;gap:6px;color:' + C.ink2 + ';margin-left:4px;cursor:pointer' },
      [h('input', { type: 'checkbox' }), h('span', { text: '叠加对比（半透明显示成果）' })], bar);

    var stage = h('div', { style: 'position:relative;width:' + W + 'px;max-width:100%;border:1px solid ' + C.line2 + ';border-radius:10px;overflow:hidden;background:' + C.card + ';box-shadow:0 1px 2px rgba(48,44,30,.05)' }, null, wrap);
    canvas = h('canvas', { style: 'width:' + W + 'px;max-width:100%;height:auto;display:block' }, null, stage);
    canvas.width = W; canvas.height = H;
    ctxSat = canvas.getContext('2d');
    predCanvas = h('canvas', { style: 'position:absolute;left:0;top:0;width:' + W + 'px;max-width:100%;height:auto;display:block' }, null, stage);
    predCanvas.width = W; predCanvas.height = H;
    ctxPred = predCanvas.getContext('2d');
    scanLine = h('div', { style: 'position:absolute;left:0;right:0;height:2px;background:#4fd1e8;display:none;box-shadow:0 0 8px #4fd1e8;pointer-events:none' }, null, stage);

    statusEl = h('div', { style: 'margin-top:10px;font-size:12.5px;color:' + C.ink2 + ';min-height:18px' }, '状态：影像已就绪（含四套岩性 + 一条错断断层）', wrap);
    metricsEl = h('div', { style: 'display:none;margin-top:12px' }, null, wrap);

    function resetState() {
      var rnd = mulberry(20261023);
      renderSatellite(ctxSat, rnd);
      ctxPred.clearRect(0, 0, W, H);
      scanLine.style.display = 'none';
      done = false; cm = null;
      btnSeg.disabled = false; btnFault.disabled = true;
      metricsEl.style.display = 'none';
      // 清除上次的断层线 SVG
      var svg = stage.querySelector('svg'); if (svg) svg.remove();
      statusEl.textContent = '状态：影像已就绪（含四套岩性 + 一条错断断层）';
    }

    btnSeg.onclick = function () {
      if (done || !btnSeg.disabled === false && done) return;
      if (done) return;
      btnSeg.disabled = true;
      statusEl.textContent = '状态：模型逐行推理中…';
      scanLine.style.display = 'block';
      cm = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
      var off = document.createElement('canvas'); off.width = W; off.height = H;
      var octx = off.getContext('2d');
      renderPrediction(octx, mulberry(777 + 13), cm);
      ctxPred.clearRect(0, 0, W, H);

      var row = 0, step = 14;
      var timer = setInterval(function () {
        row = Math.min(H, row + step);
        ctxPred.drawImage(off, 0, row - step, W, step, 0, row - step, W, step);
        scanLine.style.top = row + 'px';
        if (row >= H) {
          clearInterval(timer);
          scanLine.style.display = 'none';
          done = true;
          btnFault.disabled = false;
          statusEl.textContent = '状态：分割完成 ✔ 可提取断层线（下方查看精度）';
          showMetrics();
        }
      }, 40);
      cleanups.push(function () { clearInterval(timer); });
    };

    btnFault.onclick = function () {
      if (!done) return;
      btnFault.disabled = true;
      var pts = '';
      for (var y = 0; y <= H; y += 6) pts += (y ? 'L' : 'M') + fx(y).toFixed(1) + ',' + y;
      var svgNS = 'http://www.w3.org/2000/svg';
      var svg = h('svg', { style: 'position:absolute;left:0;top:0;width:' + W + 'px;max-width:100%;height:auto;pointer-events:none', viewBox: '0 0 ' + W + ' ' + H }, null, stage);
      var path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', pts); path.setAttribute('fill', 'none');
      path.setAttribute('stroke', '#d64541'); path.setAttribute('stroke-width', '3');
      path.style.strokeDasharray = '600'; path.style.strokeDashoffset = '600';
      path.style.transition = 'stroke-dashoffset 1.6s ease';
      svg.appendChild(path);
      var lbl = document.createElementNS(svgNS, 'text');
      lbl.setAttribute('x', fx(26) - 6); lbl.setAttribute('y', 24);
      lbl.setAttribute('font-size', '13'); lbl.setAttribute('font-weight', '700'); lbl.setAttribute('fill', '#d64541');
      lbl.textContent = 'F₁ 断层（AI 提取 · 矢量）';
      svg.appendChild(lbl);
      requestAnimationFrame(function () { path.style.strokeDashoffset = 0; });
      statusEl.textContent = '状态：断层线已矢量化输出（可入库 GIS）✔';
    };

    chkOverlay.querySelector('input').onchange = function (e) {
      predCanvas.style.opacity = e.target.checked ? 0.5 : 1;
    };

    function showMetrics() {
      var tot = 0, diag = 0, rs = [0, 0, 0, 0];
      for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) { tot += cm[i][j]; rs[i] += cm[i][j]; }
      for (var i = 0; i < 4; i++) diag += cm[i][i];
      var oa = (diag / tot * 100).toFixed(1);

      var grid = h('div', { style: 'display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start' }, null, metricsEl);

      var cards = h('div', { style: 'display:flex;gap:10px;flex-wrap:wrap' }, null, grid);
      [[oa + '%', '总体精度 OA'], [kappa(cm, tot).toFixed(3), 'Kappa 系数'], ['4', '岩性类别'], ['4', '断层破碎带误差']].forEach(function (c) {
        h('div', { style: 'background:' + C.jadeL + ';border-radius:8px;padding:9px 14px;min-width:96px' },
          [h('div', { text: c[0], style: 'font-size:19px;font-weight:700;color:' + C.jadeD + ';font-family:var(--mono,monospace)' }),
            h('div', { text: c[1], style: 'font-size:11px;color:' + C.jadeD + ';opacity:.75' })], cards);
      });

      var pa = h('div', { style: 'min-width:230px;flex:1' }, null, grid);
      h('div', { text: '各类生产者精度 PA', style: 'font-size:12px;font-weight:600;color:' + C.ink2 + ';margin-bottom:6px' }, null, pa);
      ROCKS.forEach(function (r, i) {
        var v = cm[i][i] / rs[i] * 100;
        h('div', { style: 'margin-bottom:7px' },
          [h('div', { style: 'display:flex;justify-content:space-between;font-size:11.5px;color:' + C.ink2 + ';margin-bottom:2px' },
            [h('span', { text: r.n }), h('span', { text: v.toFixed(1) + '%', style: 'font-family:var(--mono,monospace)' })]),
            h('div', { style: 'height:8px;background:' + C.paper + ';border-radius:4px;overflow:hidden' },
              [h('div', { style: 'height:100%;width:' + v + '%;background:rgb(' + r.out.join(',') + ');border-radius:4px;transition:width 1s' })])], pa);
      });

      var cmx = h('div', { style: 'min-width:300px;flex:1' }, null, grid);
      h('div', { text: '混淆矩阵（真值＼预测）', style: 'font-size:12px;font-weight:600;color:' + C.ink2 + ';margin-bottom:6px' }, null, cmx);
      var table = h('div', { style: 'display:grid;grid-template-columns:52px repeat(4,1fr);gap:3px' }, null, cmx);
      h('div', { text: '＼' });
      ROCKS.forEach(function (r) { h('div', { text: r.n, style: 'text-align:center;font-size:11px;color:' + C.ink3 }); });
      for (var i = 0; i < 4; i++) {
        h('div', { text: ROCKS[i].n, style: 'font-size:11px;color:' + C.ink3 + ';display:flex;align-items:center' });
        for (var j = 0; j < 4; j++) {
          var pct = cm[i][j] / tot;
          var diagCell = i === j;
          h('div', {
            text: (pct * 100).toFixed(1) + '%',
            style: 'text-align:center;font-size:11px;font-family:var(--mono,monospace);padding:4px 2px;border-radius:4px;' +
              'background:rgba(' + (diagCell ? '47,125,107' : '176,90,81') + ',' + (0.08 + pct * (diagCell ? 2.2 : 1.8)) + ');color:' + (diagCell ? C.jadeD : C.bad)
          });
        }
      }
      h('div', { text: '对角线为正确分类；误差集中在岩性界线混合像元与断层破碎带附近。', style: 'font-size:11px;color:' + C.ink3 + ';margin-top:8px' }, null, grid);
      metricsEl.style.display = 'block';
    }

    function kappa(cm, tot) {
      var po = 0, pe = 0, rs = [0, 0, 0, 0], cs = [0, 0, 0, 0];
      for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) { rs[i] += cm[i][j]; cs[j] += cm[i][j]; }
      for (var i = 0; i < 4; i++) po += cm[i][i];
      po /= tot;
      for (var i = 0; i < 4; i++) pe += rs[i] * cs[i];
      pe /= tot * tot;
      return (po - pe) / (1 - pe);
    }

    resetState();

    return { unmount: function () { cleanups.forEach(function (f) { try { f(); } catch (e) { } }); cleanups = []; } };
  }

  var state = null;
  function start(root) { if (state && state.unmount) state.unmount(); state = mount(root); }
  function unmount() { if (state && state.unmount) state.unmount(); state = null; }

  window.D27 = window.D27 || {};
  window.D27.rs = { mount: start, unmount: unmount };
})();
