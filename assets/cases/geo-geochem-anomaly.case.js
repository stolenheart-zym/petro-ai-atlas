/* =========================================================
   案例 · 油气地球化学异常识别（g2 · 地质勘察）
   用多指标异常检测与空间聚类识别组合异常，替代人工逐点对比。
   ========================================================= */
(function () {

  function figSeep() {
    var s = '<svg viewBox="0 0 620 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="油气微渗漏原理">';
    s += '<defs><marker id="gc-ar" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0L7,3L0,6z" fill="#41699b"/></marker></defs>';
    // 地层
    s += '<rect x="0" y="120" width="620" height="80" fill="#efe7d3"/>';
    s += '<path d="M0,120 Q155,112 310,120 T620,118" stroke="#cbbd92" stroke-width="2" fill="none"/>';
    s += '<path d="M0,150 Q155,142 310,150 T620,148" stroke="#cbbd92" stroke-width="1.5" fill="none"/>';
    s += '<path d="M0,176 Q155,168 310,176 T620,174" stroke="#cbbd92" stroke-width="1.5" fill="none"/>';
    // 油藏
    s += '<ellipse cx="200" cy="156" rx="120" ry="20" fill="#8e5229" opacity=".85"/>';
    s += '<ellipse cx="200" cy="150" rx="120" ry="20" fill="#b26a39"/>';
    s += '<text x="200" y="154" text-anchor="middle" font-size="11" fill="#fff" font-weight="600">油气藏</text>';
    // 微渗漏通道（虚线箭头向上）
    var chans = [150, 200, 250, 320, 380, 440];
    chans.forEach(function (cx) {
      s += '<path d="M' + cx + ' 150 Q' + (cx + 6) + ' 100 ' + cx + ' 58" stroke="#41699b" stroke-width="1.5" fill="none" stroke-dasharray="4 4" marker-end="url(#gc-ar)"/>';
    });
    s += '<text x="330" y="96" font-size="9.5" fill="#41699b">油气微渗漏（垂向运移）</text>';
    // 地表采样点
    s += '<rect x="0" y="34" width="620" height="22" fill="#cddfc4"/>';
    s += '<text x="8" y="49" font-size="9.5" fill="#3f5a3a">地表土壤</text>';
    chans.forEach(function (cx) {
      s += '<circle cx="' + cx + '" cy="45" r="4" fill="#2f7d6b"/>';
    });
    s += '<text x="470" y="49" font-size="9.5" fill="#2f7d6b">吸附烃 / 酸解烃采样点</text>';
    s += '</svg>';
    return s;
  }

  function figMulti() {
    var s = '<svg viewBox="0 0 620 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="多指标联合判读">';
    var axes = [110, 250, 390, 530];
    var labels = ['吸附烃 C1', '酸解烃 C2', 'ΔC C3', '荧光 C4'];
    var cols = ['#41699b', '#b26a39', '#7e5a8d', '#767a2e'];
    axes.forEach(function (x, i) {
      s += '<line x1="' + x + '" y1="24" x2="' + x + '" y2="122" stroke="#c9c2b0" stroke-width="1.2"/>';
      s += '<text x="' + x + '" y="140" text-anchor="middle" font-size="10" fill="' + cols[i] + '">' + labels[i] + '</text>';
    });
    // 背景点（低平折线）
    for (var b = 0; b < 6; b++) {
      var pts = '';
      axes.forEach(function (x, i) { pts += (i ? ' L' : 'M') + x + ' ' + (112 - (i % 2) * 8 - b * 2); });
      s += '<path d="' + pts + '" fill="none" stroke="#e9e4d8" stroke-width="1.4"/>';
    }
    // 异常点（高折线，跨指标抬升）
    var anom = [[95, 92, 30, 34], [34, 32, 96, 92], [80, 82, 84, 78]];
    var acol = ['#e0483a', '#e0483a', '#b05a51'];
    anom.forEach(function (a, i) {
      var pts = '';
      axes.forEach(function (x, j) { pts += (j ? ' L' : 'M') + x + ' ' + (122 - a[j]); });
      s += '<path d="' + pts + '" fill="none" stroke="' + acol[i] + '" stroke-width="2"/>';
    });
    s += '<text x="110" y="18" font-size="9.5" font-family="monospace" fill="#9ba3a9">单指标看 C1：只高亮左侧两条，右侧靶区 B 被漏掉</text>';
    s += '<text x="110" y="132" font-size="9.5" font-family="monospace" fill="#b05a51">多指标联合：三条异常折线同时浮出，靶区圈得更全</text>';
    s += '</svg>';
    return s;
  }

  Cases.register({
    id: 'geo-geochem-anomaly',
    sceneId: 'g2',
    title: '油气地球化学异常识别：多指标联合圈定靶区',
    status: 'ready',
    version: '1.0.0',
    updated: '2026-10-23',

    tabs: {
      background: {
        label: '专业背景',
        judge: [
          { label: '数据形态', value: '采样点 + 多指标', desc: '单区块 300—3000 个点', html: '<span style="color:var(--c-opt)">多指标点位</span>' },
          { label: '标注成本', value: '低', desc: '无需逐点标注，靠已知靶区验证' },
          { label: '可见收益', value: '中', desc: '把人工逐点对比变成概率图', html: '<b style="color:var(--jade-d);font-family:var(--mono)">人工 → 概率图</b>' },
          { label: '难度', value: '中', desc: '样本少且空间自相关强', html: K.dtag('中') }
        ],
        lede: '土壤吸附烃、酸解烃、ΔC 等化探指标测量的是油气微渗漏在地表留下的化学痕迹。一个区块通常布设数百到数千个采样点，需要多指标联合判读才能圈出有利靶区。传统靠单指标阈值与人工经验，异常与背景的边界模糊——异常检测 + 空间聚类把这一步变成可量化的靶区概率图。',
        sections: [
          {
            no: 1, en: 'PROBLEM', title: '当前做法与问题',
            html: '<p>传统做法是<b>单指标阈值法</b>：给吸附烃、酸解烃等各设一个门限，超限即判异常。但单指标受地表污染、地形与季节影响大，异常与背景的边界本就很模糊。</p>' +
              '<p>更麻烦的是<b>多指标组合判读全靠经验</b>：哪些指标抬升才算异常、抬升到什么程度、几项同时抬升才圈靶区，没有统一标准，靶区圈定高度主观。</p>' +
              K.figure(figSeep(), 1, '油气微渗漏原理：油气藏中的烃类沿微裂缝垂向运移至地表，在土壤中留下吸附烃、酸解烃等化学痕迹。采样点测到的是"地下油气"的地表投影。')
          },
          {
            no: 2, en: 'INTERVENTION', title: 'AI 能做什么',
            html: '<p>把判读建模成<b>多指标异常检测 + 空间聚类</b>：先用孤立森林 / 局部离群因子在四维指标空间里找离群点，再结合空间位置做聚类，输出<b>靶区概率图</b>。</p>' +
              '<p>它替换的是<b>「逐点对照多指标表格」</b>这一步。关键是"联合"：单指标会漏掉那些只有部分指标抬升的靶区，多指标联合才能圈得更全——本案例的示范页可以直接验证这一点。</p>' +
              K.figure(figMulti(), 2, '平行坐标看「联合」的意义：只看 C1（第一轴）会漏掉靶区 B，把四维折线一起看，异常组合才完整浮现。')
          },
          {
            no: 3, en: 'DATA', title: '你需要准备什么',
            html: '<p style="margin-bottom:14px">化探数据的门槛主要在采样设计，而非标注。勾选清单可交互。</p>' +
              K.checklist([
                ['化探采样点', '单区块 300—3000 点，规则网格或测线布设', '无需逐点标注'],
                ['多指标化验值', '吸附烃、酸解烃、ΔC、荧光等 5—10 项', '专家圈定的 3—5 个已知靶区作验证'],
                ['地质与遥感背景图层', '与采样区同范围', '无需标注'],
                ['地形 / 污染校正参数', '高程、土地利用', '用于剔除假异常']
              ]) +
              '<p style="margin-top:16px"><span class="kicker plain" style="color:var(--ink-4)">注意</span></p>' +
              K.callout('样本量小且空间自相关强：必须按空间分块交叉验证，否则精度会被严重高估。', 'warn')
          },
          {
            no: 4, en: 'DIFFICULTY', title: '技术难度与参考方向',
            html: '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:2px">' +
              K.dtag('中') + '<span class="small muted">样本量小、空间自相关强，需空间交叉验证；异常成因复杂，需多源校核。</span></div>' +
              K.meter('中') +
              '<p>难点不在模型本身，而在<b>假异常剔除</b>：地表污染、地形效应会造成与油气无关的化探异常，必须用地质与遥感背景做校正。</p>' +
              '<p style="margin-top:16px"><span class="kicker plain" style="color:var(--ink-4)">可借鉴的通用技术</span></p>' +
              K.refs(['异常检测', '空间聚类', '地统计插值', '主成分分析'], '#/method/opt')
          }
        ]
      },

      workflow: {
        label: '案例流程',
        title: '案例：一个 1800 点区块的靶区优选',
        lead: [
          '目标是把「人工逐点对照多指标表格」压缩成「跑一遍检测脚本 + 复核排名靠前的靶区」，输出一张可指导下一步勘探部署的<b>靶区概率图</b>。',
          '下面五步是标准落地流程。第 1 步（校正）和第 5 步（地质校核）决定了结果能否经得起野外验证。'
        ],
        stats: [
          ['采样点', '1800', true], ['指标', '4 项', true],
          ['已知靶区', '3 个', true], ['人工判读', '2 天 → 20 分钟'],
          ['漏检率', '单指标 33%'], ['联合判读', '0 漏检']
        ],
        steps: [
          {
            name: '数据校正与标准化', role: '工程',
            do: '剔除受地表污染、地形、季节影响的系统偏差，各指标做标准化。',
            effect: '不同量纲的指标可放在同一空间比较',
            trap: '不校正污染源，模型会把垃圾场圈成"靶区"'
          },
          {
            name: '多指标异常检测', role: '算法',
            do: '孤立森林 / 局部离群因子在四维指标空间找离群点，输出每点异常分。',
            effect: '每点得到一个 0—1 的联合异常强度',
            trap: '只用单指标，会漏掉部分指标抬升的靶区'
          },
          {
            name: '空间聚类与去噪', role: '算法',
            do: '对高异常分点做 DBSCAN 空间聚类，合并相邻点、剔除孤立噪声点。',
            effect: '把离散异常点聚成有地质意义的靶区',
            trap: '聚类半径与最小点数需结合采样密度设定'
          },
          {
            name: '靶区概率图生成', role: '效果关键',
            do: '用地统计插值（克里金 / IDW）把异常分内插成连续概率面，叠加地质背景图层。',
            effect: '一张可直接指导部署的靶区概率图',
            trap: '插值会平滑掉小靶区，需保留原始高值点'
          },
          {
            name: '地质校核与排序', role: '闭环',
            do: '结合已知油气显示、构造位置、储层条件对靶区排序，优选 3—5 个供地面验证。',
            effect: '把"数据异常"变成"地质靶区"',
            trap: '化探异常 ≠ 油气存在，必须地面验证收口'
          }
        ],
        metrics: {
          title: '怎么算「圈对了」',
          html: '<p>化探异常识别的核心指标是<b>「已知靶区是否被完整圈出」</b>（召回）与<b>「圈出的靶区是否真异常」</b>（精确），而非逐点准确率：</p>' +
            K.dtable(['指标', '定义', '参考取值'], [
              ['靶区召回率', '已知靶区中被正确圈出的比例', '3 / 3'],
              ['假异常率', '圈出的靶区中无油气对应的比例', '< 20%'],
              ['联合 vs 单指标', '多指标联合相较单指标的漏检下降', '33% → 0']
            ]) +
            '<p style="margin-top:12px">必须用<b>空间分块交叉验证</b>：按采样区块（而非随机点）划分训练/验证，否则空间自相关会把精度虚高到接近 100%。</p>'
        },
        fails: [
          { name: '污染源假异常', why: '农田施肥、工业排放会造成与油气无关的化探异常。必须用土地利用、土壤类型等背景图层做校正，或采集污染对照样。' },
          { name: '单指标漏检', why: '不同靶区可能只有部分指标抬升，只看单一指标会漏掉它们。必须多指标联合建模。' },
          { name: '空间自相关虚高精度', why: '随机交叉验证会让相邻采样点同时进入训练与验证集，精度虚高。必须按空间块划分。' },
          { name: '插值过度平滑', why: '克里金插值会把小范围强异常抹平。需保留原始高值点，用原始点 + 概率面叠加展示。' }
        ]
      },

      demo: {
        label: '可运行示范',
        mount: function (root) {
          if (!window.D27 || !window.D27.geochem) {
            root.innerHTML = '<div class="callout warn"><span class="ci">缺失</span><span>示范脚本未加载：请确认 <b>assets/cases/geo-geochem-anomaly.demo.js</b> 在 shell.js 之前引入。</span></div>';
            return;
          }
          window.D27.geochem.mount(root);
        },
        unmount: function () { if (window.D27 && window.D27.geochem) window.D27.geochem.unmount(); }
      }
    }
  });

})();
