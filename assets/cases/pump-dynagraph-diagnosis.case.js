/* =========================================================
   案例 · 抽油机井工况诊断（pr1 · 采油）
   把示功图转成图像做卷积网络分类，替代人工逐井判读。
   ========================================================= */
(function () {

  var SHAPES = [
    { name: '正常', color: '#3f8560', pts: [[0.08, 0.30], [0.06, 0.88], [0.94, 0.90], [0.96, 0.32]] },
    { name: '供液不足', color: '#a97a1c', pts: [[0.08, 0.30], [0.06, 0.88], [0.94, 0.90], [0.76, 0.52], [0.72, 0.30], [0.96, 0.30]] },
    { name: '气锁', color: '#7e5a8d', pts: [[0.22, 0.36], [0.16, 0.60], [0.40, 0.62], [0.42, 0.48], [0.80, 0.50], [0.84, 0.34]] },
    { name: '泵漏', color: '#41699b', pts: [[0.08, 0.30], [0.28, 0.52], [0.26, 0.70], [0.94, 0.88], [0.96, 0.32]] },
    { name: '断脱', color: '#b05a51', pts: [[0.32, 0.46], [0.30, 0.62], [0.70, 0.64], [0.72, 0.48]] }
  ];

  function figPump() {
    var s = '<svg viewBox="0 0 620 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="抽油机与示功图">';
    // 地面
    s += '<line x1="20" y1="140" x2="600" y2="140" stroke="#c9c2b0" stroke-width="2"/>';
    // 游梁式抽油机（磕头机）
    s += '<polygon points="80,140 92,90 96,90 108,140" fill="#b8ad88"/>';
    s += '<circle cx="94" cy="86" r="4" fill="#8a8a72"/>';
    s += '<line x1="40" y1="140" x2="94" y2="92" stroke="#8a8a72" stroke-width="3"/>';
    s += '<line x1="94" y1="92" x2="148" y2="140" stroke="#8a8a72" stroke-width="3"/>';
    s += '<circle cx="94" cy="92" r="7" fill="none" stroke="#8a8a72" stroke-width="2"/>';
    s += '<line x1="94" y1="92" x2="94" y2="150" stroke="#5d666d" stroke-width="2"/>';
    s += '<rect x="86" y="150" width="16" height="20" fill="#b8ad88" stroke="#8a8a72"/>';
    s += '<text x="94" y="180" text-anchor="middle" font-size="10" fill="#5d666d">抽油机（光杆上下往复）</text>';
    // 载荷传感器 → 示功图
    s += '<line x1="160" y1="70" x2="200" y2="70" stroke="#2f7d6b" stroke-width="1.5" stroke-dasharray="3 3"/>';
    s += '<text x="180" y="62" font-size="9.5" fill="#2f7d6b">载荷</text>';
    s += '<rect x="210" y="26" width="150" height="100" fill="#fff" stroke="#9db7c6"/>';
    s += '<polygon points="232,108 232,42 342,38 346,104" fill="rgba(63,133,96,.18)" stroke="#3f8560" stroke-width="2"/>';
    s += '<text x="285" y="140" text-anchor="middle" font-size="10" fill="#33586e">示功图：载荷—位移闭合曲线</text>';
    // 说明
    s += '<text x="400" y="54" font-size="12" fill="#242b2e" font-weight="600">一个冲程里：</text>';
    s += '<text x="400" y="76" font-size="11" fill="#5d666d">上冲程——提液柱，载荷升高；</text>';
    s += '<text x="400" y="98" font-size="11" fill="#5d666d">下冲程——卸载，载荷降低。</text>';
    s += '<text x="400" y="128" font-size="11" fill="#b05a51">故障会改变这条闭合曲线的形态，</text>';
    s += '<text x="400" y="148" font-size="11" fill="#b05a51">这正是"看图诊断"的依据。</text>';
    s += '</svg>';
    return s;
  }

  function figShapes() {
    var s = '<svg viewBox="0 0 620 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="五种典型工况示功图">';
    var w = 112, gap = 12, x = 6, boxH = 82, y = 22;
    SHAPES.forEach(function (sh) {
      s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + boxH + '" rx="8" fill="#fdfcf9" stroke="#e9e4d8"/>';
      var ox = x + 14, oy = y + 10, cw = w - 28, ch = boxH - 26;
      var pts = sh.pts.map(function (p) { return (ox + p[0] * cw) + ',' + (oy + (1 - p[1]) * ch); }).join(' ');
      s += '<polygon points="' + pts + '" fill="' + sh.color + '22" stroke="' + sh.color + '" stroke-width="1.8" stroke-linejoin="round"/>';
      s += '<text x="' + (x + w / 2) + '" y="' + (y + boxH - 4) + '" text-anchor="middle" font-size="10" fill="' + sh.color + '">' + sh.name + '</text>';
      x += w + gap;
    });
    s += '<text x="6" y="14" font-size="9.5" font-family="monospace" fill="#9ba3a9">五种典型工况的示功图形状对照</text>';
    s += '</svg>';
    return s;
  }

  Cases.register({
    id: 'pump-dynagraph-diagnosis',
    sceneId: 'pr1',
    title: '抽油机井工况诊断：示功图 CNN 分类',
    status: 'ready',
    version: '1.0.0',
    updated: '2026-10-23',

    tabs: {
      background: {
        label: '专业背景',
        judge: [
          { label: '数据形态', value: '示功图图像', desc: '载荷—位移闭合曲线转灰度图', html: '<span style="color:var(--c-cv)">示功图图像</span>' },
          { label: '标注成本', value: '低', desc: '工况标签来自检泵作业，可积累' },
          { label: '可见收益', value: '快', desc: '数千口井逐井判读 → 自动初筛', html: '<b style="color:var(--jade-d);font-family:var(--mono)">人工 → 自动初筛</b>' },
          { label: '难度', value: '中', desc: '疑难复合工况仍需人工', html: K.dtag('中') }
        ],
        lede: '示功图（光杆载荷—位移闭合曲线）是有杆泵井工况诊断的核心依据：供液不足、气锁、泵漏、断脱等不同工况在图上呈现不同形态。一个采油厂有数千口抽油机井、示功图每日采集，人工逐井判读不现实。把它转成图像做卷积网络分类，是数据驱动方法在采油环节规模化落地的代表场景。',
        sections: [
          {
            no: 1, en: 'PROBLEM', title: '当前做法与问题',
            html: '<p>传统做法：诊断人员<b>逐井判读示功图</b>，靠经验识别工况形态，再结合生产参数下结论。</p>' +
              '<p>痛点：<b>量大</b>——数千口井每日产生示功图；<b>不一致</b>——典型工况可靠，但疑难工况（振动、结蜡干扰）判断一致性差；<b>滞后</b>——异常井要等到人工看到才处理。</p>' +
              K.figure(figPump(), 1, '示功图怎么来：抽油机光杆上下往复，传感器测载荷、位移绘出闭合曲线。故障会改变曲线形态——这是"看图诊断"的物理依据。')
          },
          {
            no: 2, en: 'INTERVENTION', title: 'AI 能做什么',
            html: '<p>把示功图<b>转成图像</b>（或保留载荷—位移序列），用<b>卷积网络做工况分类</b>，异常井优先推送，人工只复核疑难井。</p>' +
              '<p>它替换的是<b>「逐井看图形状」</b>这一步：模型 7×24 自动初筛，把诊断人员的时间留给真正难判的复合工况。这是 CV 在采油最成熟的落地场景之一。</p>' +
              K.figure(figShapes(), 2, '五种典型工况的示功图形状对照：形态差异明显，但泵漏↔正常、气锁↔供液不足两组易混淆——这决定了模型输出必须是概率而非单一标签。')
          },
          {
            no: 3, en: 'DATA', title: '你需要准备什么',
            html: '<p style="margin-bottom:14px">数据量大、标签来源清晰，是少数"数据即资产"的场景。勾选清单可交互。</p>' +
              K.checklist([
                ['示功图', '单井每日 1—24 幅，载荷—位移序列或灰度图', '按工况分类标注 5 万—10 万幅'],
                ['生产参数', '冲程、冲次、泵径、液量', '作为辅助特征'],
                ['检泵作业结论', '实际故障类型', '提高标签可信度'],
                ['历史诊断台账', '人工诊断记录', '用于类增量学习']
              ]) +
              '<p style="margin-top:16px"><span class="kicker plain" style="color:var(--ink-4)">注意</span></p>' +
              K.callout('标签来自检泵作业结论，最可信；仅凭人工看图标注的标签会带主观偏差，需与检泵结论交叉校正。', 'warn')
          },
          {
            no: 4, en: 'DIFFICULTY', title: '技术难度与参考方向',
            html: '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:2px">' +
              K.dtag('中') + '<span class="small muted">数据量大、类别定义清晰，是最成熟的 CV 落地场景之一；疑难复合工况仍需人工。</span></div>' +
              K.meter('中') +
              '<p>难点在<b>疑难与复合工况</b>：振动、结蜡干扰下形态失真，新出现的工况类别需要<b>类增量学习</b>持续纳入。</p>' +
              '<p style="margin-top:16px"><span class="kicker plain" style="color:var(--ink-4)">可借鉴的通用技术</span></p>' +
              K.refs(['图像分类', '时序形态特征', '类增量学习', '主动学习'], '#/method/cv') +
              '<p style="margin-top:16px" class="small muted">交叉环节：<a href="#/stage/workover" style="color:var(--jade-d);font-weight:600">修井</a></p>'
          }
        ]
      },

      workflow: {
        label: '案例流程',
        title: '案例：一个采油厂 3200 口井的工况自动初筛',
        lead: [
          '目标不是"替代诊断工程师"，而是<b>把 3200 口井从人工逐井判读压缩成"模型初筛 + 人工复核疑难井"</b>，让异常井第一时间被推送。',
          '下面五步是标准落地流程。第 1 步（标签可信度）和第 5 步（闭环回流）决定了模型能不能长期可靠。'
        ],
        stats: [
          ['井数', '3200', true], ['示功图', '5 万幅'],
          ['工况类别', '5 类', true], ['人工判读', '逐井 → 复核 12%'],
          ['异常井', '优先推送'], ['诊断准确率', '88%']
        ],
        steps: [
          {
            name: '示功图采集与标签整理', role: '工程',
            do: '采集示功图，用检泵作业结论标注工况，剔除只凭看图的主观标签。',
            effect: '标签可信、类别定义清晰',
            trap: '纯人工看图标注会带主观偏差，误导模型'
          },
          {
            name: '图像化与归一化', role: '工程',
            do: '把载荷—位移序列转成统一尺寸的灰度图，或保留序列做时序特征。',
            effect: '同一标准输入，跨井可比',
            trap: '不同井冲程幅度不同，不做归一化模型会过拟合幅度'
          },
          {
            name: 'CNN 分类训练', role: '算法',
            do: '用卷积网络（或 1D 时序网络）做五类分类，输出概率而非单一标签。',
            effect: '每张示功图得到五类概率分布',
            trap: '类别不均衡（断脱少）需加权损失'
          },
          {
            name: '概率阈值与推送', role: '效果关键',
            do: '对概率低于阈值的"疑难井"转人工复核，异常高置信井直接推送。',
            effect: '异常井第一时间处置，人工只碰疑难',
            trap: '阈值过高推送淹没人，过低漏掉异常'
          },
          {
            name: '闭环回流与类增量', role: '闭环',
            do: '把人工复核结论与检泵结果回流训练集，新工况类别做类增量学习。',
            effect: '模型随生产持续进化，覆盖新工况',
            trap: '不回流，模型会随工艺变化逐渐退化'
          }
        ],
        metrics: {
          title: '怎么算「诊对了」',
          html: '<p>工况诊断是多分类问题，要看混淆矩阵与误判的<b>代价不对称性</b>：</p>' +
            K.dtable(['指标', '定义', '参考取值'], [
              ['整体准确率', '正确分类占比', '0.88'],
              ['断脱召回率', '断脱（最危险）被检出的比例', '0.95'],
              ['推送覆盖率', '异常井被自动推送的比例', '> 90%'],
              ['人工复核占比', '转人工的疑难井比例', '约 12%']
            ]) +
            '<p style="margin-top:12px">关键不是平均准确率，而是<b>「危险的漏判」</b>：断脱若漏判会造成井下事故，其召回率必须单独盯住——这就是误判代价不对称。</p>'
        },
        fails: [
          { name: '泵漏与正常混淆', why: '轻微泵漏的示功图与正常形态接近，仅靠图像难以区分。需结合产量递减趋势等时序信号联合判断。' },
          { name: '断脱漏判代价高', why: '断脱漏判会造成井下事故。必须把危险类别的召回率单独设指标，而非只看平均准确率。' },
          { name: '标签主观偏差', why: '仅凭人工看图标注的标签带主观性，会误导模型。应以检泵作业结论为真值，看图标签仅作辅助。' },
          { name: '新工况类别遗忘', why: '工艺改变出现新工况时，固定类别模型会误判。需类增量学习或定期重训。' }
        ]
      },

      demo: {
        label: '可运行示范',
        mount: function (root) {
          if (!window.D27 || !window.D27.pump) {
            root.innerHTML = '<div class="callout warn"><span class="ci">缺失</span><span>示范脚本未加载：请确认 <b>assets/cases/pump-dynagraph-diagnosis.demo.js</b> 在 shell.js 之前引入。</span></div>';
            return;
          }
          window.D27.pump.mount(root);
        },
        unmount: function () { if (window.D27 && window.D27.pump) window.D27.pump.unmount(); }
      }
    }
  });

})();
