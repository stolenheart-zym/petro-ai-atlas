/* =========================================================
   案例 · 抽油机井工况诊断 — 可运行示范（示功图 CNN 分类仿真）
   ---------------------------------------------------------
   演示内容：示功图（光杆载荷—位移闭合曲线）是有杆泵井工况诊断
   的核心依据，不同工况在图上呈现不同形态。选择一个工况（或随机
   抽井）看它的示功图，再"运行诊断"，观察卷积网络输出的五类
   概率——理解"把示功图转成图像做分类"这一经典 CV 落地场景。
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

  var DW = 380, DH = 300;

  /* 五种工况的示功图形状（归一化坐标，闭多边形顶点） */
  var CONDS = [
    { id: 'normal', name: '正常', color: '#3f8560', desc: '近平行四边形，载荷满、形态饱满',
      pts: [[0.08, 0.30], [0.06, 0.88], [0.94, 0.90], [0.96, 0.32]] },
    { id: 'supply', name: '供液不足', color: '#a97a1c', desc: '右下角缺一块（卸载提前）',
      pts: [[0.08, 0.30], [0.06, 0.88], [0.94, 0.90], [0.76, 0.52], [0.72, 0.30], [0.96, 0.30]] },
    { id: 'gas', name: '气锁', color: '#7e5a8d', desc: '窄长"刀把"形，载荷波动',
      pts: [[0.22, 0.36], [0.16, 0.60], [0.40, 0.62], [0.42, 0.48], [0.80, 0.50], [0.84, 0.34]] },
    { id: 'leak', name: '泵漏', color: '#41699b', desc: '上冲程出现台阶',
      pts: [[0.08, 0.30], [0.28, 0.52], [0.26, 0.70], [0.94, 0.88], [0.96, 0.32]] },
    { id: 'part', name: '断脱', color: '#b05a51', desc: '载荷塌缩成细长条',
      pts: [[0.32, 0.46], [0.30, 0.62], [0.70, 0.64], [0.72, 0.48]] }
  ];

  /* CNN 输出的目标概率（含真实混淆：泵漏↔正常、气锁↔供液不足易混） */
  var PROBS = {
    normal: { normal: 0.90, supply: 0.02, gas: 0.01, leak: 0.06, part: 0.01 },
    supply: { normal: 0.03, supply: 0.87, gas: 0.07, leak: 0.02, part: 0.01 },
    gas:    { normal: 0.01, supply: 0.09, gas: 0.85, leak: 0.02, part: 0.03 },
    leak:   { normal: 0.08, supply: 0.01, gas: 0.01, leak: 0.88, part: 0.02 },
    part:   { normal: 0.01, supply: 0.01, gas: 0.02, leak: 0.01, part: 0.95 }
  };

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
    var canvas, ctx;
    var cur = 'normal', probBars = [], verdictEl, statusEl;

    var wrap = h('div', { style: 'font-family:var(--sans,system-ui);color:' + C.ink + ';font-size:13px;line-height:1.6;padding:4px 2px 8px' }, null, root);

    h('b', { text: '互动演示：从示功图形状到工况诊断', style: 'font-size:14.5px;color:' + C.ink + ';display:block;margin-bottom:6px' }, null, wrap);
    h('div', { text: '示功图是光杆载荷—位移的闭合曲线。选择工况看它的形状，再运行 CNN 诊断，观察各类概率——不同工况"长"得不同，这正是图像分类能落地的基础。', style: 'font-size:12.5px;color:' + C.ink2 + ';margin-bottom:10px' }, null, wrap);

    // 工况选择按钮
    var sel = h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px' }, null, wrap);
    var btns = {};
    CONDS.forEach(function (c) {
      var b = h('button', {
        text: c.name,
        style: 'padding:5px 12px;border-radius:15px;border:1px solid ' + c.color + ';color:' + c.color + ';font-size:12px;font-weight:600;cursor:pointer;background:#fff',
        onclick: function () { pick(c.id); }
      }, null, sel);
      btns[c.id] = b;
    });

    var grid = h('div', { style: 'display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;margin-bottom:10px' }, null, wrap);

    // 示功图画布
    var dwBox = h('div', { style: 'background:' + C.card + ';border:1px solid ' + C.line2 + ';border-radius:10px;padding:10px;box-shadow:0 1px 2px rgba(48,44,30,.05)' }, null, grid);
    h('div', { text: '示功图（载荷—位移）', style: 'font-size:12px;font-weight:600;color:' + C.ink2 + ';margin-bottom:6px' }, null, dwBox);
    canvas = h('canvas', { style: 'display:block' }, null, dwBox);
    canvas.width = DW; canvas.height = DH;
    ctx = canvas.getContext('2d');
    h('div', { id: 'desc', style: 'font-size:11px;color:' + C.ink3 + ';margin-top:6px;max-width:' + DW + 'px' }, '', dwBox);

    // 诊断面板
    var diagBox = h('div', { style: 'background:' + C.card + ';border:1px solid ' + C.line2 + ';border-radius:10px;padding:12px;box-shadow:0 1px 2px rgba(48,44,30,.05);min-width:240px;flex:1' }, null, grid);
    h('div', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:10px' },
      [h('b', { text: 'CNN 诊断结果', style: 'font-size:13px;color:' + C.ink }),
        h('button', { text: '▶ 运行诊断', style: 'background:' + C.jade + ';color:#fff;border-radius:7px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer', onclick: runDiag }, null)], diagBox);

    CONDS.forEach(function (c) {
      var row = h('div', { style: 'margin-bottom:8px' }, null, diagBox);
      h('div', { style: 'display:flex;justify-content:space-between;font-size:11.5px;color:' + C.ink2 + ';margin-bottom:2px' },
        [h('span', { text: c.name }), h('span', { text: '0%', style: 'font-family:var(--mono,monospace);color:' + C.ink3 })] , row);
      var bar = h('div', { style: 'height:12px;background:' + C.paper + ';border-radius:6px;overflow:hidden' },
        [h('div', { style: 'height:100%;width:0%;background:' + c.color + ';border-radius:6px;transition:width .6s ease' })], row);
      probBars.push({ c: c, fill: bar.firstChild, txt: row.querySelector('span:last-child') });
    });

    statusEl = h('div', { style: 'margin-top:8px;font-size:12px;color:' + C.ink2 + ';min-height:18px' }, '请选择工况并运行诊断。', wrap);

    function pick(id) {
      cur = id;
      Object.keys(btns).forEach(function (k) {
        var c = CONDS.filter(function (x) { return x.id === k; })[0];
        btns[k].style.background = k === id ? c.color : '#fff';
        btns[k].style.color = k === id ? '#fff' : c.color;
      });
      drawDynagraph();
      resetProbs();
      var c = CONDS.filter(function (x) { return x.id === id; })[0];
      wrap.querySelector('#desc').textContent = c.desc;
      statusEl.textContent = '状态：已显示「' + c.name + '」示功图，可运行诊断。';
    }

    function drawDynagraph() {
      ctx.clearRect(0, 0, DW, DH);
      ctx.fillStyle = C.paper; ctx.fillRect(0, 0, DW, DH);
      var c = CONDS.filter(function (x) { return x.id === cur; })[0];
      var pad = 34;
      function px(s) { return pad + s * (DW - 2 * pad); }
      function py(f) { return pad + (1 - f) * (DH - 2 * pad); }
      // 轴
      ctx.strokeStyle = C.line3; ctx.lineWidth = 1;
      ctx.strokeRect(pad, pad, DW - 2 * pad, DH - 2 * pad);
      ctx.fillStyle = C.ink4; ctx.font = '9.5px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('位移 →', DW / 2, DH - 6);
      ctx.save(); ctx.translate(12, DH / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('载荷 ↑', 0, 0); ctx.restore();
      // 形状
      ctx.beginPath();
      c.pts.forEach(function (p, i) {
        var x = px(p[0]), y = py(p[1]);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = c.color + '22';
      ctx.fill();
      ctx.strokeStyle = c.color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
      // 描边动画
      var len = 1000;
      ctx.setLineDash([len, len]); ctx.lineDashOffset = len;
      ctx.stroke();
      var start = null;
      function anim(ts) {
        if (!start) start = ts;
        var t = Math.min(1, (ts - start) / 900);
        ctx.clearRect(0, 0, DW, DH);
        ctx.fillStyle = C.paper; ctx.fillRect(0, 0, DW, DH);
        ctx.strokeStyle = C.line3; ctx.strokeRect(pad, pad, DW - 2 * pad, DH - 2 * pad);
        ctx.fillStyle = C.ink4; ctx.font = '9.5px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('位移 →', DW / 2, DH - 6);
        ctx.save(); ctx.translate(12, DH / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('载荷 ↑', 0, 0); ctx.restore();
        ctx.beginPath();
        c.pts.forEach(function (p, i) { var x = px(p[0]), y = py(p[1]); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
        ctx.closePath();
        ctx.fillStyle = c.color + '22'; ctx.fill();
        ctx.strokeStyle = c.color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
        ctx.setLineDash([len, len]); ctx.lineDashOffset = len * (1 - t);
        ctx.stroke();
        if (t < 1) requestAnimationFrame(anim); else ctx.setLineDash([]);
      }
      requestAnimationFrame(anim);
    }

    function resetProbs() {
      probBars.forEach(function (p) {
        p.fill.style.width = '0%'; p.txt.textContent = '0%';
      });
    }

    function runDiag() {
      var target = PROBS[cur];
      statusEl.textContent = '状态：模型推理中…';
      setTimeout(function () {
        var maxp = 0, maxk = null;
        probBars.forEach(function (p, i) {
          var v = target[p.c.id];
          p.fill.style.width = (v * 100).toFixed(0) + '%';
          p.txt.textContent = (v * 100).toFixed(0) + '%';
          if (v > maxp) { maxp = v; maxk = p.c.id; }
        });
        var isRight = maxk === cur;
        statusEl.textContent = '诊断：' + (isRight ? '✔ 正确判为「' + CONDS.filter(function (x) { return x.id === maxk; })[0].name + '」' : '✕ 误判') + '（' + (maxp * 100).toFixed(0) + '% 置信度）';
      }, 500);
    }

    pick('normal');

    return { unmount: function () { cleanups.forEach(function (f) { try { f(); } catch (e) { } }); cleanups = []; } };
  }

  var state = null;
  function start(root) { if (state && state.unmount) state.unmount(); state = mount(root); }
  function unmount() { if (state && state.unmount) state.unmount(); state = null; }

  window.D27 = window.D27 || {};
  window.D27.pump = { mount: start, unmount: unmount };
})();
