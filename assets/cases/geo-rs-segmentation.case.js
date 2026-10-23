/* =========================================================
   案例 · 地质剖面遥感解译（g1 · 地质勘察）
   用语义分割逐像元判别岩性与构造线，替代人工目视勾绘。
   ========================================================= */
(function () {

  /* ---------- 插图：遥感解译原理链 + 人工 vs AI 工时 ---------- */
  function figPrinciple() {
    var s = '<svg viewBox="0 0 620 208" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="遥感解译原理链">';
    s += '<defs><marker id="rs-ar" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0L7,3L0,6z" fill="#2f7d6b"/></marker></defs>';
    // 太阳
    s += '<circle cx="50" cy="40" r="14" fill="#f2c14e"/><g stroke="#f2c14e" stroke-width="2">';
    s += '<line x1="50" y1="16" x2="50" y2="24"/><line x1="50" y1="56" x2="50" y2="64"/><line x1="26" y1="40" x2="34" y2="40"/><line x1="66" y1="40" x2="74" y2="40"/>';
    s += '<line x1="33" y1="23" x2="39" y2="29"/><line x1="67" y1="23" x2="61" y2="29"/><line x1="33" y1="57" x2="39" y2="51"/><line x1="67" y1="57" x2="61" y2="51"/></g>';
    s += '<text x="50" y="84" text-anchor="middle" font-size="9.5" fill="#5d666d">太阳辐射</text>';
    // 地表岩层条带
    s += '<path d="M30,130 Q180,116 330,130 T620,128 L620,178 L30,178 Z" fill="#cbbd92"/>';
    s += '<path d="M30,146 Q190,136 380,148 T620,144 L620,178 L30,178 Z" fill="#9aa39b"/>';
    s += '<path d="M30,160 Q200,150 400,162 T620,158 L620,178 L30,178 Z" fill="#8d9c94"/>';
    s += '<line x1="300" y1="120" x2="520" y2="86" stroke="#e67e22" stroke-width="2" stroke-dasharray="6 4"/>';
    s += '<text x="330" y="108" font-size="9.5" fill="#b3541a">地物反射（携带岩性光谱信息）</text>';
    s += '<text x="28" y="176" font-size="9.5" fill="#5d666d">地表：不同岩性条带状出露</text>';
    // 传感器 + 影像 + 成果
    s += '<g transform="translate(540,20)"><rect x="0" y="10" width="30" height="18" fill="#3b5f7d"/><rect x="-22" y="13" width="20" height="12" fill="#1e5aa8"/><rect x="32" y="13" width="20" height="12" fill="#1e5aa8"/><circle cx="15" cy="5" r="4" fill="#dfe9f0"/><line x1="15" y1="1" x2="15" y2="-10" stroke="#888" stroke-width="1.5"/></g>';
    s += '<text x="558" y="60" text-anchor="middle" font-size="9.5" fill="#33586e">卫星传感器</text>';
    s += '<line x1="556" y1="60" x2="556" y2="96" stroke="#2f7d6b" stroke-width="1.6" marker-end="url(#rs-ar)"/>';
    s += '<rect x="492" y="98" width="128" height="40" rx="4" fill="#fff" stroke="#9db7c6"/>';
    s += '<rect x="500" y="104" width="112" height="6" fill="#9fae86"/><rect x="500" y="113" width="112" height="6" fill="#7d8880"/><rect x="500" y="122" width="112" height="6" fill="#a8a48c"/>';
    s += '<text x="556" y="152" text-anchor="middle" font-size="9.5" fill="#33586e">多光谱影像（输入）</text>';
    s += '<line x1="556" y1="98" x2="556" y2="82" stroke="#c9c2b0" stroke-width="1" stroke-dasharray="3 3"/>';
    s += '</svg>';
    return s;
  }

  function figUnet() {
    var s = '<svg viewBox="0 0 620 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="U-Net 语义分割结构">';
    var steps = [
      ['输入影像', '#e6f1ec', '#2f7d6b', '逐像元输入'],
      ['编码器 ↓', '#e7eef9', '#41699b', '下采样提取特征'],
      ['瓶颈', '#efe9f4', '#7e5a8d', '最抽象语义'],
      ['解码器 ↑', '#f8ecdf', '#b26a39', '上采样恢复分辨率'],
      ['分类图', '#e6f1ec', '#2f7d6b', '同尺寸逐像元类别']
    ];
    var w = 100, gap = 18, x = 8, y = 24, H = 74;
    steps.forEach(function (st, i) {
      s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + H + '" rx="9" fill="' + st[1] + '" stroke="' + st[2] + '" stroke-opacity=".3"/>';
      s += '<rect x="' + x + '" y="' + y + '" width="4" height="' + H + '" rx="2" fill="' + st[2] + '"/>';
      s += '<text x="' + (x + 15) + '" y="' + (y + 30) + '" font-size="12" font-weight="600" fill="#242b2e">' + st[0] + '</text>';
      s += '<text x="' + (x + 15) + '" y="' + (y + 52) + '" font-size="9.5" fill="#5d666d">' + st[3] + '</text>';
      if (i < 4) {
        s += '<path d="M' + (x + w + 3) + ' ' + (y + H / 2) + 'h9m-3.5-3.4 3.6 3.4-3.6 3.4" stroke="#c9c2b0" stroke-width="1.2" fill="none" stroke-linecap="round"/>';
      }
      x += w + gap;
    });
    s += '<text x="310" y="18" text-anchor="middle" font-size="9.5" font-family="monospace" fill="#9ba3a9">PIXEL-WISE · 输入输出同尺寸</text>';
    s += '<text x="8" y="126" font-size="10" fill="#2f7d6b">语义分割 = 把「看图认岩性」落到每一个像元：</text>';
    s += '<text x="8" y="142" font-size="10" fill="#5d666d">输出与影像同尺寸的类别图，岩性界线与断层随之自动成图。</text>';
    s += '</svg>';
    return s;
  }

  Cases.register({
    id: 'geo-rs-segmentation',
    sceneId: 'g1',
    title: '地质剖面遥感解译：语义分割替代人工目视',
    status: 'ready',
    version: '1.0.0',
    updated: '2026-10-23',

    tabs: {
      background: {
        label: '专业背景',
        judge: [
          { label: '数据形态', value: '多光谱影像', desc: '单幅千万像素级，逐像元输入', html: '<span style="color:var(--c-cv)">多光谱影像</span>' },
          { label: '标注成本', value: '中', desc: '人工精修岩性掩膜 ≥ 20 幅' },
          { label: '可见收益', value: '快', desc: '一景影像从两周压到小时级', html: '<b style="color:var(--jade-d);font-family:var(--mono)">2 周 → 小时级</b>' },
          { label: '难度', value: '中', desc: '同物异谱 / 同谱异物是主要卡点', html: K.dtag('中') }
        ],
        lede: '遥感影像是区域地质调查的第一手资料：多光谱、高光谱与 SAR 影像记录了地表岩性、构造与蚀变的差异。传统做法是解释员在屏幕上逐像元目视勾绘岩性界线与断层——一幅 1:5 万图幅要一到两周，且不同人勾绘的界线能相差上百米。语义分割把这一步变成逐像元的自动分类。',
        sections: [
          {
            no: 1, en: 'PROBLEM', title: '当前做法与问题',
            html: '<p>解释员建立解译标志后，在立体镜或屏幕上<b>逐块目视勾绘</b>岩性界线、断层与褶皱，再清绘成图。一景影像数十万像元，全流程依赖经验。</p>' +
              '<p>三个痛点：<b>慢</b>——一幅图幅一到两周；<b>主观</b>——同一影像不同解释员界线可相差上百米；<b>难复用</b>——新影像到来需从头解译，无法沉淀为自动流程。植被与风化覆盖区信噪比低，人工尤其容易漏判。</p>' +
              K.figure(figPrinciple(), 1, '遥感解译原理链：太阳辐射 → 地物反射 → 传感器成像 → 多光谱影像 → 智能解译成果。不同岩性在影像上呈现不同色彩与纹理，这正是机器可学习的判别特征。')
          },
          {
            no: 2, en: 'INTERVENTION', title: 'AI 能做什么',
            html: '<p>用<b>语义分割</b>（U-Net / DeepLab）对影像做逐像元分类，把每个像素判给一种岩性类别，岩性界线沿类别突变带自动成图、断层自动追踪矢量化。</p>' +
              '<p>它替换的是<b>「看图认岩性」</b>这一步：人只需要复核低置信度区域与野外检查点。相比人工，模型输出<b> 100% 可复现</b>，且可 7×24 复跑新影像。</p>' +
              K.figure(figUnet(), 2, 'U-Net 编解码结构：编码器逐级下采样提取多尺度特征，解码器上采样恢复分辨率，最终输出与输入同尺寸的类别图。')
          },
          {
            no: 3, en: 'DATA', title: '你需要准备什么',
            html: '<p style="margin-bottom:14px">立项前先对着这张清单打勾。<b>勾不满不代表不能做</b>，但每一项空缺都会在后期变成返工。清单可点击。</p>' +
              K.checklist([
                ['多光谱 / 高光谱影像', 'Sentinel-2 / Landsat-8 或无人机影像，分辨率优于 10 m，≥ 3 景', '无需逐像元标注'],
                ['岩性训练掩膜', '人工精修的岩性掩膜 ≥ 20 幅', '每类岩性 ≥ 500 像元样本区'],
                ['野外检查点', 'GPS 坐标 + 照片 + 岩性定名', '≥ 50 个，用于精度检验'],
                ['历史地质图', '与影像同区域、已矢量化', '投影转为弱标签'],
                ['DEM 高程与坡度', '与影像同分辨率', '无需标注']
              ]) +
              '<p style="margin-top:16px"><span class="kicker plain" style="color:var(--ink-4)">可参考的公开数据集</span></p>' +
              K.refs(['Sentinel-2 / Landsat-8 公开影像（GEE 可下载）', 'OneGeology 公开地质图门户'], null)
          },
          {
            no: 4, en: 'DIFFICULTY', title: '技术难度与参考方向',
            html: '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:2px">' +
              K.dtag('中') + '<span class="small muted">公开影像充足，但地质标签稀缺，跨气候区、跨岩性组合的迁移能力差。</span></div>' +
              K.meter('中') +
              '<p>「同物异谱、同谱异物」明显，单一光谱特征不够，需融合纹理、地形与时相信息；植被与风化覆盖区本质是<b>弱监督</b>问题。</p>' +
              '<p style="margin-top:16px"><span class="kicker plain" style="color:var(--ink-4)">可借鉴的通用技术</span></p>' +
              K.refs(['语义分割', '弱监督学习', '多光谱特征融合', '条件随机场后处理'], '#/method/cv') +
              '<p style="margin-top:16px" class="small muted">交叉环节：<a href="#/stage/seismic" style="color:var(--jade-d);font-weight:600">物探</a></p>'
          }
        ]
      },

      workflow: {
        label: '案例流程',
        title: '案例：一景 1:5 万图幅的自动解译',
        lead: [
          '目标不是「训练一个模型」，而是把<b>一景 1:5 万图幅的解译周期从两周压到小时级（仅复核低置信度区域）</b>，同时让结果可复现、可入库 GIS。',
          '下面六步是这个场景的标准落地流程。注意第 2 步（预处理）和第 5 步（后处理）不涉及任何模型，却决定了最终能不能用。'
        ],
        stats: [
          ['图幅', '1:5 万', true], ['解译周期', '2 周 → 小时级'],
          ['岩性类别', '4 类', true], ['野外检查点', '50 个'],
          ['人工复核', '约 10% 像元'], ['可复现性', '100%']
        ],
        steps: [
          {
            name: '遥感数据获取与假彩色合成', role: '数据',
            do: '选取研究区多光谱影像，做假彩色合成（如 B12-B8-B4）突出岩性色彩差异，云量 < 5%。',
            effect: '得到一幅岩性差异肉眼可辨的输入影像',
            trap: '不同时相影像的光谱一致性差，务必同源同季'
          },
          {
            name: '辐射与几何预处理', role: '工程',
            do: '辐射定标、大气校正、正射校正、去云镶嵌，保证「像元 ↔ 地物」严格对齐。',
            effect: '像元与地面坐标一一对应，后续精度才有意义',
            trap: '几何校正偏差会让岩性界线整体平移上百米'
          },
          {
            name: '岩性样本标注', role: '标注',
            do: '依据野外实测剖面与已有地质图勾绘各岩性训练区，类别尽量均衡。',
            effect: '每类岩性 ≥ 500 像元的训练掩膜',
            trap: '「砂岩占 90%」的类别不均衡会让模型偷懒'
          },
          {
            name: '语义分割训练', role: '算法',
            do: 'U-Net / DeepLab 逐像元分类，交叉熵 + Dice 损失应对类别不均衡，数据增强抑制过拟合。',
            effect: '输出全图幅的岩性概率图',
            trap: '直接追求像素精度会在界线处过度自信'
          },
          {
            name: '后处理与矢量化', role: '效果关键',
            do: 'CRF 平滑锯齿边界、滤除 < 9 像元小图斑，沿类别突变带提取界线与断层矢量。',
            effect: '岩性单元与构造线直接入库 GIS',
            trap: '过度平滑会抹掉真实的细小地质体'
          },
          {
            name: '精度检验与野外查证', role: '闭环',
            do: '用混淆矩阵、总体精度 OA、Kappa 评价；对低置信度区域布设野外检查点复核。',
            effect: '给出可量化的精度报告与误差空间分布',
            trap: '只在训练区检验会严重高估精度'
          }
        ],
        metrics: {
          title: '怎么算「分对了」',
          html: '<p>遥感解译是<b>多类语义分割</b>问题，指标要看混淆矩阵与逐类精度，而不是单一准确率：</p>' +
            K.dtable(['指标', '定义', '参考取值'], [
              ['总体精度 OA', '对角线正确像元 / 全部像元', '0.91'],
              ['Kappa 系数', '排除随机一致后的分类一致度', '0.83'],
              ['生产者精度 PA', '某类被正确分类的比例（各类分别统计）', '0.78—0.95'],
              ['用户精度 UA', '分到某类的像元中真正属于该类的比例', '0.72—0.93']
            ]) +
            '<p style="margin-top:12px">误差的空间分布比数字更重要：误差应集中在<b>岩性界线混合像元</b>与<b>断层破碎带</b>，若大面积均匀分布则说明预处理或标签有问题。</p>'
        },
        fails: [
          { name: '植被覆盖区漏判', why: '茂密植被遮蔽地表岩性，光谱特征被植被主导。需引入多时相影像（落叶季）或 SAR 纹理，或明确标注"不可解译区"。' },
          { name: '同物异谱 / 同谱异物', why: '同一岩性在不同风化/含水状态下光谱差异大，不同岩性又可能光谱相近。靠单一波段无法区分，需多光谱 + 地形 + 纹理融合。' },
          { name: '界线过度平滑', why: 'CRF 后处理会把锯齿边界磨平，连带抹掉真实的细小岩脉与透镜体。后处理强度应与制图比例尺匹配。' },
          { name: '标签空间泄漏', why: '把同一幅影像的相邻像元同时放进训练和验证集，精度虚高。必须按图幅（而非像元）划分训练/验证。' }
        ]
      },

      demo: {
        label: '可运行示范',
        mount: function (root) {
          if (!window.D27 || !window.D27.rs) {
            root.innerHTML = '<div class="callout warn"><span class="ci">缺失</span><span>示范脚本未加载：请确认 <b>assets/cases/geo-rs-segmentation.demo.js</b> 在 shell.js 之前引入。</span></div>';
            return;
          }
          window.D27.rs.mount(root);
        },
        unmount: function () { if (window.D27 && window.D27.rs) window.D27.rs.unmount(); }
      }
    }
  });

})();
