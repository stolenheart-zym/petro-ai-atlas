/* =========================================================
   案例 · 地质图件要素智能提取 — 可运行示范（检测 + OCR 仿真）
   ---------------------------------------------------------
   演示内容：程序化绘制一幅"扫描地质图"（图名、图例符号、地层
   界线、断层线、注记文字），三个按钮分别演示三类模型各自解决
   什么：目标检测定位图例符号、OCR 读注记、边缘追踪矢量化断层。
   所有内容为合成，用于示意"像素 → 结构化矢量要素"的转化。
   ========================================================= */
(function () {
  'use strict';

  var C = {
    paper: '#fbfaf6', card: '#ffffff', line: '#e9e4d8', line2: '#ddd7c8', line3: '#c9c2b0',
    ink: '#242b2e', ink2: '#4d565b', ink3: '#79828a', ink4: '#9ba3a9',
    jade: '#2f7d6b', jadeD: '#235f51', jadeL: '#e6f1ec',
    clay: '#b26a39', clayL: '#f8ecdf', bad: '#b05a51',
    cv: '#2f7d6b', nlp: '#7e5a8d', nlpL: '#efe9f4'
  };

  var W = 560, H = 360;

  /* 图面元素固定坐标（便于检测框对齐） */
  var SYMBOLS = [
    { x: 430, y: 92, w: 26, h: 16, label: '砂岩', color: '#c9b96a' },
    { x: 430, y: 116, w: 26, h: 16, label: '泥岩', color: '#9aa39b' },
    { x: 430, y: 140, w: 26, h: 16, label: '灰岩', color: '#a8c4b8' },
    { x: 430, y: 164, w: 26, h: 16, label: '花岗岩', color: '#c89a7a' }
  ];
  var TEXTS = [
    { x: 60, y: 60, t: '青石山幅', size: 16 },
    { x: 120, y: 210, t: 'K₁', size: 13 },
    { x: 300, y: 150, t: 'J₂', size: 13 },
    { x: 220, y: 300, t: 'F₁ 断层', size: 12 },
    { x: 380, y: 250, t: '白水河', size: 12 }
  ];
  var BOUNDARIES = [
    { pts: [[70, 120], [150, 140], [240, 130], [340, 165], [410, 155]], color: '#6b7a6a' },
    { pts: [[70, 200], [160, 215], [250, 205], [350, 230], [410, 220]], color: '#6b7a6a' }
  ];
  var FAULTS = [
    { pts: [[150, 90], [200, 150], [240, 210], [280, 270], [310, 330]], color: '#d64541' }
  ];

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
    var canvas, ctx, svg, overlay, statusEl, statEls = {};

    function ctlBtn(bg, fg) {
      return 'background:' + bg + ';color:' + fg + ';border:1px solid transparent;border-radius:7px;padding:6px 13px;font-size:12.5px;font-weight:600;cursor:pointer';
    }

    var wrap = h('div', { style: 'font-family:var(--sans,system-ui);color:' + C.ink + ';font-size:13px;line-height:1.6;padding:4px 2px 8px' }, null, root);

    h('b', { text: '互动演示：从「扫描图件」到「结构化矢量要素」', style: 'font-size:14.5px;color:' + C.ink + ';display:block;margin-bottom:8px' }, null, wrap);
    h('div', { text: '一张扫描地质图只是像素。依次点击三个按钮，看目标检测、OCR、矢量追踪三类模型各自把哪些像素变成结构化数据。', style: 'font-size:12.5px;color:' + C.ink2 + ';margin-bottom:10px' }, null, wrap);

    var bar = h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px' }, null, wrap);
    var btnSym = h('button', { text: '① 检测图例符号', style: ctlBtn(C.jade, '#fff') }, null, bar);
    var btnOcr = h('button', { text: '② OCR 识别注记', style: ctlBtn(C.nlp, '#fff'), disabled: '' }, null, bar);
    var btnFault = h('button', { text: '③ 矢量化断层线', style: ctlBtn(C.clayL, C.clay), disabled: '' }, null, bar);

    var stage = h('div', { style: 'position:relative;width:' + W + 'px;max-width:100%;border:1px solid ' + C.line2 + ';border-radius:10px;overflow:hidden;background:' + C.card + ';box-shadow:0 1px 2px rgba(48,44,30,.05)' }, null, wrap);
    canvas = h('canvas', { style: 'width:' + W + 'px;max-width:100%;height:auto;display:block' }, null, stage);
    canvas.width = W; canvas.height = H;
    ctx = canvas.getContext('2d');
    svg = h('svg', { style: 'position:absolute;left:0;top:0;width:' + W + 'px;max-width:100%;height:auto;pointer-events:none', viewBox: '0 0 ' + W + ' ' + H }, null, stage);

    statusEl = h('div', { style: 'margin-top:10px;font-size:12.5px;color:' + C.ink2 + ';min-height:18px' }, '状态：图件已载入。请依次点击三个按钮。', wrap);
    var stats = h('div', { style: 'display:flex;gap:10px;flex-wrap:wrap;margin-top:10px' }, null, wrap);
    function statCard(k, label, bg, fg) {
      var card = h('div', { style: 'background:' + bg + ';border-radius:8px;padding:9px 14px;min-width:96px' }, null, stats);
      var v = h('div', { text: '—', style: 'font-size:19px;font-weight:700;color:' + fg + ';font-family:var(--mono,monospace)' }, null, card);
      h('div', { text: label, style: 'font-size:11px;color:' + fg + ';opacity:.75' }, null, card);
      statEls[k] = v;
    }
    statCard('sym', '图例符号', C.jadeL, C.jadeD);
    statCard('ocr', 'OCR 准确率', C.nlpL, C.nlp);
    statCard('fault', '断层线段', C.clayL, C.clay);
    statCard('time', '人工 vs AI', C.paper, C.ink3);

    /* 绘制扫描图 */
    function drawMap() {
      ctx.fillStyle = '#f4edd8'; ctx.fillRect(0, 0, W, H);
      // 扫描噪点/纸纹
      for (var i = 0; i < 500; i++) {
        ctx.fillStyle = 'rgba(120,110,80,' + (Math.random() * 0.06) + ')';
        ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
      }
      // 边框
      ctx.strokeStyle = '#b8ad88'; ctx.lineWidth = 2; ctx.strokeRect(8, 8, W - 16, H - 16);
      // 标题
      ctx.fillStyle = '#3a3a33'; ctx.font = 'bold 16px serif'; ctx.textAlign = 'left';
      ctx.fillText(TEXTS[0].t, TEXTS[0].x, TEXTS[0].y);
      ctx.font = '11px serif'; ctx.fillStyle = '#6a6a5a';
      ctx.fillText('（1:50000）', TEXTS[0].x + 84, TEXTS[0].y);
      // 图例框
      ctx.strokeStyle = '#b8ad88'; ctx.strokeRect(408, 60, 96, 130);
      ctx.fillStyle = '#3a3a33'; ctx.font = 'bold 12px serif'; ctx.fillText('图例', 416, 78);
      SYMBOLS.forEach(function (s) {
        ctx.fillStyle = s.color; ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.strokeStyle = '#8a8a72'; ctx.lineWidth = 1; ctx.strokeRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = '#3a3a33'; ctx.font = '10px serif'; ctx.fillText(s.label, s.x + s.w + 8, s.y + 12);
      });
      // 地层界线
      BOUNDARIES.forEach(function (b) {
        ctx.beginPath();
        b.pts.forEach(function (p, i) { if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
        ctx.strokeStyle = b.color; ctx.lineWidth = 1.6; ctx.stroke();
      });
      // 断层线（虚线）
      FAULTS.forEach(function (f) {
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        f.pts.forEach(function (p, i) { if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
        ctx.strokeStyle = f.color; ctx.lineWidth = 2; ctx.stroke();
        ctx.setLineDash([]);
      });
      // 注记文字
      for (var t = 1; t < TEXTS.length; t++) {
        ctx.fillStyle = '#3a3a33'; ctx.font = TEXTS[t].size + 'px serif';
        ctx.fillText(TEXTS[t].t, TEXTS[t].x, TEXTS[t].y);
      }
    }

    function rectEl(x, y, w, h, color, dash, label, lbg) {
      var ns = 'http://www.w3.org/2000/svg';
      var r = document.createElementNS(ns, 'rect');
      r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', w); r.setAttribute('height', h);
      r.setAttribute('fill', 'none'); r.setAttribute('stroke', color); r.setAttribute('stroke-width', '2');
      if (dash) r.setAttribute('stroke-dasharray', dash);
      svg.appendChild(r);
      if (label) {
        var t = document.createElementNS(ns, 'text');
        t.setAttribute('x', x); t.setAttribute('y', y - 6); t.setAttribute('font-size', '11');
        t.setAttribute('font-weight', '700'); t.setAttribute('fill', color);
        if (lbg) { t.setAttribute('paint-order', 'stroke'); t.setAttribute('stroke', lbg); t.setAttribute('stroke-width', '4'); }
        t.textContent = label;
        svg.appendChild(t);
      }
      return r;
    }

    btnSym.onclick = function () {
      SYMBOLS.forEach(function (s, i) {
        setTimeout(function () {
          rectEl(s.x - 3, s.y - 3, s.w + 6, s.h + 6, C.jade, '4 3', s.label, '#fff');
        }, i * 160);
      });
      statEls.sym.textContent = SYMBOLS.length + ' / ' + SYMBOLS.length;
      btnSym.disabled = true; btnOcr.disabled = false;
      statusEl.textContent = '状态：① 图例符号已定位 ✔（目标检测）→ 可进行 ② OCR';
    };

    btnOcr.onclick = function () {
      var recog = [['青石山幅', '青石山幅'], ['K₁', 'K₁'], ['J₂', 'J₂'], ['F₁ 断层', 'F₁ 断层'], ['白水河', '白水河(94%)']];
      for (var t = 1; t < TEXTS.length; t++) {
        (function (idx) {
          setTimeout(function () {
            var txt = TEXTS[idx].t;
            var w = txt.length * TEXTS[idx].size * 0.62, h = TEXTS[idx].size + 6;
            rectEl(TEXTS[idx].x - 3, TEXTS[idx].y - TEXTS[idx].size, w, h, C.nlp, '3 3', recog[idx][1], '#fff');
          }, (t - 1) * 200);
        })(t);
      }
      statEls.ocr.textContent = '94.6%';
      btnOcr.disabled = true; btnFault.disabled = false;
      statusEl.textContent = '状态：② 注记已识别 ✔（OCR）→ 可进行 ③ 断层矢量化';
    };

    btnFault.onclick = function () {
      FAULTS.forEach(function (f) {
        var ns = 'http://www.w3.org/2000/svg';
        var path = document.createElementNS(ns, 'path');
        var d = f.pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join(' ');
        path.setAttribute('d', d); path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#d64541'); path.setAttribute('stroke-width', '2.5');
        path.style.strokeDasharray = '400'; path.style.strokeDashoffset = '400';
        path.style.transition = 'stroke-dashoffset 1.4s ease';
        svg.appendChild(path);
        requestAnimationFrame(function () { path.style.strokeDashoffset = 0; });
      });
      statEls.fault.textContent = FAULTS.length;
      statEls.time.textContent = '3 天 → 12 分';
      btnFault.disabled = true;
      statusEl.textContent = '状态：③ 断层线已矢量化输出 ✔（可入库 GIS）—— 三要素提取完成';
    };

    drawMap();

    return { unmount: function () { cleanups.forEach(function (f) { try { f(); } catch (e) { } }); cleanups = []; } };
  }

  var state = null;
  function start(root) { if (state && state.unmount) state.unmount(); state = mount(root); }
  function unmount() { if (state && state.unmount) state.unmount(); state = null; }

  window.D27 = window.D27 || {};
  window.D27.mapext = { mount: start, unmount: unmount };
})();
