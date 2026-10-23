/* =========================================================
   案例 · 地质图件要素智能提取（g3 · 地质勘察）
   用目标检测 + OCR + 矢量追踪把扫描图件变成结构化矢量要素。
   ========================================================= */
(function () {

  function figPipeline() {
    var s = '<svg viewBox="0 0 620 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="图件要素提取流水线">';
    var steps = [
      ['扫描图件', '#f5f2ea', '#8a8a72', '只是像素'],
      ['目标检测', '#e6f1ec', '#2f7d6b', '图例符号定位'],
      ['OCR', '#efe9f4', '#7e5a8d', '注记文字识别'],
      ['矢量追踪', '#f8ecdf', '#b26a39', '断层/界线矢量化'],
      ['GIS 图层', '#e7eef9', '#41699b', '结构化要素入库']
    ];
    var w = 104, gap = 14, x = 8, y = 26, H = 82;
    steps.forEach(function (st, i) {
      s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + H + '" rx="9" fill="' + st[1] + '" stroke="' + st[2] + '" stroke-opacity=".3"/>';
      s += '<rect x="' + x + '" y="' + y + '" width="4" height="' + H + '" rx="2" fill="' + st[2] + '"/>';
      s += '<text x="' + (x + 15) + '" y="' + (y + 28) + '" font-size="12.5" font-weight="600" fill="#242b2e">' + st[0] + '</text>';
      s += '<text x="' + (x + 15) + '" y="' + (y + 52) + '" font-size="10" fill="#5d666d">' + st[3] + '</text>';
      if (i < 4) {
        s += '<path d="M' + (x + w + 3) + ' ' + (y + H / 2) + 'h6m-2.5-2.4 2.6 2.4-2.6 2.4" stroke="#c9c2b0" stroke-width="1.2" fill="none" stroke-linecap="round"/>';
      }
      x += w + gap;
    });
    s += '<text x="8" y="18" font-size="9.5" font-family="monospace" fill="#9ba3a9">一条流水线 = 三类模型各管一件事</text>';
    s += '<text x="8" y="132" font-size="10" fill="#2f7d6b">像素 → 结构化矢量：</text>';
    s += '<text x="120" y="132" font-size="10" fill="#5d666d">图例符号、注记文字、断层线分别交给检测、OCR、追踪三类模型，最终统一入库 GIS。</text>';
    s += '</svg>';
    return s;
  }

  function figLegend() {
    var s = '<svg viewBox="0 0 620 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="图例体系不一致示意">';
    s += '<rect x="8" y="16" width="186" height="84" rx="8" fill="#fdfcf9" stroke="#e9e4d8"/>';
    s += '<text x="20" y="36" font-size="10.5" fill="#5d666d">1970s 图例体系</text>';
    s += '<rect x="20" y="46" width="22" height="13" fill="#c9b96a" stroke="#8a8a72"/><text x="52" y="57" font-size="10" fill="#242b2e">砂岩</text>';
    s += '<rect x="120" y="46" width="22" height="13" fill="#9aa39b" stroke="#8a8a72"/><text x="152" y="57" font-size="10" fill="#242b2e">泥岩</text>';
    s += '<text x="20" y="86" font-size="9.5" fill="#9ba3a9">注记用宋体手写体</text>';
    s += '<rect x="218" y="16" width="186" height="84" rx="8" fill="#fdfcf9" stroke="#e9e4d8"/>';
    s += '<text x="230" y="36" font-size="10.5" fill="#5d666d">2000s 图例体系</text>';
    s += '<rect x="230" y="46" width="22" height="13" fill="#e0c06a" stroke="#8a8a72"/><text x="262" y="57" font-size="10" fill="#242b2e">砂岩（新符号）</text>';
    s += '<rect x="340" y="46" width="22" height="13" fill="#b0b6b2" stroke="#8a8a72"/><text x="372" y="57" font-size="10" fill="#242b2e">泥岩（新符号）</text>';
    s += '<text x="230" y="86" font-size="9.5" fill="#9ba3a9">注记改用数字标准代号</text>';
    s += '<path d="M200 58 h12" stroke="#b26a39" stroke-width="1.5"/><text x="202" y="50" text-anchor="middle" font-size="9.5" fill="#b26a39">≠</text>';
    s += '<text x="430" y="40" font-size="10.5" fill="#b26a39">难点：不同年代图例体系不一致，</text>';
    s += '<text x="430" y="58" font-size="10.5" fill="#b26a39">同一语义在不同图幅里符号不同，</text>';
    s += '<text x="430" y="76" font-size="10.5" fill="#b26a39">必须建"图例—语义"对照表统一映射。</text>';
    s += '</svg>';
    return s;
  }

  Cases.register({
    id: 'geo-map-extraction',
    sceneId: 'g3',
    title: '地质图件要素智能提取：扫描图变矢量图层',
    status: 'ready',
    version: '1.0.0',
    updated: '2026-10-23',

    tabs: {
      background: {
        label: '专业背景',
        judge: [
          { label: '数据形态', value: '扫描图件', desc: '300 dpi 以上，5000×7000 像素', html: '<span style="color:var(--c-cv)">扫描图 / PDF</span>' },
          { label: '标注成本', value: '中', desc: '图例符号每类 ≥ 200 实例' },
          { label: '可见收益', value: '快', desc: '一幅图件 2 人日 → 分钟级', html: '<b style="color:var(--jade-d);font-family:var(--mono)">2 人日 → 分钟级</b>' },
          { label: '难度', value: '中', desc: '图例体系不统一是主要卡点', html: K.dtag('中') }
        ],
        lede: '大量历史地质图以扫描件与 PDF 保存——图例、断层线、钻孔柱状图都只是像素，无法直接参与空间分析。要复用它们，必须先矢量化。传统人工矢量化一幅图件需 1—2 人日，而历史图件数以万计。目标检测 + OCR + 矢量追踪的组合，把这一步变成分钟级的自动流程。',
        sections: [
          {
            no: 1, en: 'PROBLEM', title: '当前做法与问题',
            html: '<p>人工矢量化要逐类描摹：<b>定位图例符号、录入注记文字、描出断层与界线</b>，再拓扑重建。一幅图件 1—2 人日。</p>' +
              '<p>痛点在于<b>规模</b>——历史图件数以万计，外包作业质量又参差；更关键的是<b>图例体系不统一</b>，不同年代同一岩性用不同符号，人工难以建立统一的语义映射。</p>' +
              K.figure(figPipeline(), 1, '要素提取流水线：一张扫描图里同时藏着三类要素，分别交给目标检测（符号）、OCR（文字）、矢量追踪（线条）三类模型，统一入库 GIS。')
          },
          {
            no: 2, en: 'INTERVENTION', title: 'AI 能做什么',
            html: '<p>用<b>目标检测</b>定位图例符号与地质体，用<b>OCR</b>识别注记文字与地层代号，再按「图例—语义」对照表把检测到的线条<b>矢量化</b>为断层、界线要素。</p>' +
              '<p>它替换的是<b>「逐类描摹 + 逐字录入」</b>。人只需要复核低置信度的检测框与断裂的线条拓扑。整体是 CV + NLP 的混合任务。</p>' +
              K.figure(figLegend(), 2, '图例体系不一致是核心难点：同一「砂岩」在不同年代图幅里符号不同，必须先建「图例—语义」对照表统一映射，模型才能跨图幅泛化。')
          },
          {
            no: 3, en: 'DATA', title: '你需要准备什么',
            html: '<p style="margin-bottom:14px">门槛在标注与对照表整理，而非模型本身。勾选清单可交互。</p>' +
              K.checklist([
                ['扫描地质图件', '300 dpi 以上，单幅 5000×7000 像素', '图例符号每类 ≥ 200 个实例'],
                ['图例—语义对照表', '覆盖各年代图例体系', '人工整理，一次性投入'],
                ['图面注记文本', '地名、地层代号、符号说明', '文字转录校对 ≥ 2000 行'],
                ['矢量化标准规范', '要素分层、拓扑规则', '作为输出约束']
              ]) +
              '<p style="margin-top:16px"><span class="kicker plain" style="color:var(--ink-4)">可参考的公开数据集</span></p>' +
              K.refs(['OneGeology 公开地质图门户'], null)
          },
          {
            no: 4, en: 'DIFFICULTY', title: '技术难度与参考方向',
            html: '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:2px">' +
              K.dtag('中') + '<span class="small muted">检测与 OCR 都有成熟方案，难点在图例体系不统一、线条断裂后的拓扑重建。</span></div>' +
              K.meter('中') +
              '<p>检测与 OCR 单点技术成熟，真正的难点在<b>「图例—语义」映射</b>与<b>断裂线条的拓扑重建</b>——后处理规则比模型更重要。</p>' +
              '<p style="margin-top:16px"><span class="kicker plain" style="color:var(--ink-4)">可借鉴的通用技术</span></p>' +
              K.refs(['目标检测', 'OCR', '版面分析', '矢量追踪'], '#/method/cv') +
              '<p style="margin-top:16px" class="small muted">交叉环节：<a href="#/stage/seismic" style="color:var(--jade-d);font-weight:600">物探</a> · <a href="#/stage/mudlogging" style="color:var(--jade-d);font-weight:600">录井</a></p>'
          }
        ]
      },

      workflow: {
        label: '案例流程',
        title: '案例：一批历史图件的批量矢量化',
        lead: [
          '目标是把<b>一幅图件 2 人日的矢量化工作压到分钟级（仅复核）</b>，同时用统一的「图例—语义」对照表消除跨年代图例不一致。',
          '下面五步是标准落地流程。第 1 步（对照表）是一次性投入，却决定了后续所有图件能否统一处理。'
        ],
        stats: [
          ['图件', '1:5 万 / 批 200 幅'], ['单幅矢量化', '2 人日 → 12 分'],
          ['图例符号', '每类 ≥ 200 实例'], ['OCR 准确率', '94.6%'],
          ['复核比例', '约 15% 框'], ['入库格式', 'GIS 矢量']
        ],
        steps: [
          {
            name: '图例—语义对照表整理', role: '一次性投入',
            do: '收集各年代图例体系，把「符号 → 岩性/构造语义」逐一对应，形成结构化对照表。',
            effect: '模型跨图幅统一理解符号语义',
            trap: '对照表不全，模型会把新符号当背景漏掉'
          },
          {
            name: '版面分析与要素分区', role: '算法',
            do: '识别图名、图例、比例尺、主图区，把版面切成功能区，只对主图区做要素提取。',
            effect: '避免把图名、图例误当地质要素',
            trap: '版面复杂（附图、剖面）时分区易错'
          },
          {
            name: '符号检测与文字识别', role: '算法',
            do: '目标检测定位图例符号与地质体，OCR 识别注记与地层代号，输出带置信度的候选。',
            effect: '像素变成「框 + 文字 + 置信度」',
            trap: '手写体注记、低分辨率扫描会拉低 OCR'
          },
          {
            name: '线条追踪与拓扑重建', role: '效果关键',
            do: '对断层、界线做矢量追踪，修复断裂线段，按规范做要素分层与拓扑检查。',
            effect: '连续、可入 GIS 的矢量要素',
            trap: '断裂处拓扑重建错误会生成错乱的线'
          },
          {
            name: '人工复核与回流', role: '闭环',
            do: '复核低置信度框与断裂线，修正结果回流训练集，逐步提升批量处理能力。',
            effect: '越用越准，形成持续积累的图件库',
            trap: '不复核回流，模型遇到新图例体系就退化'
          }
        ],
        metrics: {
          title: '怎么算「提对了」',
          html: '<p>三类要素分别评价，不能用单一指标：</p>' +
            K.dtable(['要素', '指标', '参考取值'], [
              ['图例符号', '检测 mAP@0.5', '0.87'],
              ['注记文字', 'OCR 字符准确率', '94.6%'],
              ['断层 / 界线', '矢量完整率（无断裂）', '91%'],
              ['整体', '人工复核框占比', '约 15%']
            ]) +
            '<p style="margin-top:12px">评估重点是<b>「需要多少人工复核」</b>——置信度分布比平均精度更能指导运营决策：把低置信度框单独挑出来复核，是收益最大的一步。</p>'
        },
        fails: [
          { name: '图例体系未对齐', why: '新图幅用了未录入对照表的符号，模型直接漏检。必须持续扩充对照表，并让低置信度结果回流。' },
          { name: '线条拓扑断裂', why: '扫描褪色、线被注记打断都会造成矢量线断裂。需做端点连接与拓扑修复规则。' },
          { name: '版面分区错误', why: '附图、剖面、图切剖面被误当主图要素提取。需先做版面分析，或人工圈定主图区。' },
          { name: '低分辨率 OCR 失效', why: '老图件扫描分辨率不足，注记模糊导致 OCR 崩溃。可先用超分增强，或对模糊注记走人工录入。' }
        ]
      },

      demo: {
        label: '可运行示范',
        mount: function (root) {
          if (!window.D27 || !window.D27.mapext) {
            root.innerHTML = '<div class="callout warn"><span class="ci">缺失</span><span>示范脚本未加载：请确认 <b>assets/cases/geo-map-extraction.demo.js</b> 在 shell.js 之前引入。</span></div>';
            return;
          }
          window.D27.mapext.mount(root);
        },
        unmount: function () { if (window.D27 && window.D27.mapext) window.D27.mapext.unmount(); }
      }
    }
  });

})();
