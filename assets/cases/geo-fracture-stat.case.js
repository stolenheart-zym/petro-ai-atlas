/* =========================================================
   案例 · 露头裂缝自动统计（g4 · 地质勘察）
   用实例分割 + 骨架化自动量算裂缝产状与线密度，替代人工罗盘测量。
   ========================================================= */
(function () {

  function figAttitude() {
    var s = '<svg viewBox="0 0 620 190" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="裂缝产状要素">';
    // 岩面
    s += '<path d="M40,30 L240,60 L240,160 L40,130 Z" fill="#efe7d3" stroke="#c9c2b0"/>';
    s += '<path d="M40,30 L240,60" stroke="#8a8a72" stroke-width="1"/>';
    // 裂缝（一条线）
    s += '<line x1="60" y1="120" x2="220" y2="80" stroke="#b05a51" stroke-width="3"/>';
    // 走向标注（水平方向）
    s += '<line x1="60" y1="140" x2="160" y2="140" stroke="#2f7d6b" stroke-width="1.5" marker-start="url(#fr-a)" marker-end="url(#fr-a)"/>';
    s += '<defs><marker id="fr-a" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0L6,3L0,6z" fill="#2f7d6b"/></marker></defs>';
    s += '<text x="110" y="156" text-anchor="middle" font-size="10.5" fill="#2f7d6b">走向（水平延伸方向）</text>';
    // 倾角标注（与水平夹角）
    s += '<line x1="160" y1="140" x2="220" y2="80" stroke="#b26a39" stroke-width="1.5" stroke-dasharray="3 3"/>';
    s += '<text x="196" y="118" font-size="10.5" fill="#b26a39">倾角 θ</text>';
    // 开度
    s += '<rect x="140" y="86" width="40" height="5" fill="none" stroke="#41699b" stroke-width="1.2"/>';
    s += '<text x="205" y="82" font-size="10.5" fill="#41699b">开度</text>';
    // 说明
    s += '<text x="300" y="60" font-size="12" fill="#242b2e" font-weight="600">裂缝产状三要素：</text>';
    s += '<text x="300" y="82" font-size="11" fill="#2f7d6b">走向</text><text x="344" y="82" font-size="11" fill="#5d666d">—— 裂缝在水平面的延伸方向（0—180°）</text>';
    s += '<text x="300" y="104" font-size="11" fill="#b26a39">倾角</text><text x="344" y="104" font-size="11" fill="#5d666d">—— 裂缝面与水平面的夹角</text>';
    s += '<text x="300" y="126" font-size="11" fill="#41699b">开度</text><text x="344" y="126" font-size="11" fill="#5d666d">—— 裂缝张开的宽度，决定渗透性</text>';
    s += '<text x="300" y="156" font-size="10" fill="#9ba3a9">统计走向分布用"玫瑰花图"，是地质行业的标准图件。</text>';
    s += '</svg>';
    return s;
  }

  function figRose() {
    var s = '<svg viewBox="0 0 620 170" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="玫瑰图与不确定性">';
    var cx = 140, cy = 80, R = 62;
    // 网格
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="#e9e4d8"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R * 0.6) + '" fill="none" stroke="#f0ece0"/>';
    s += '<line x1="' + cx + '" y1="' + (cy - R) + '" x2="' + cx + '" y2="' + (cy + R) + '" stroke="#f0ece0"/>';
    s += '<line x1="' + (cx - R) + '" y1="' + cy + '" x2="' + (cx + R) + '" y2="' + cy + '" stroke="#f0ece0"/>';
    // 主走向花瓣（70°）
    var petals = [[70, 0.95, 0.75], [118, 0.55, 0.5]];
    petals.forEach(function (p) {
      var a = (p[0] - 9) * Math.PI / 180, b = (p[0] + 9) * Math.PI / 180;
      var rr = p[1] * R;
      [0, 180].forEach(function (off) {
        var a1 = a + off * Math.PI / 180, a2 = b + off * Math.PI / 180;
        s += '<path d="M' + cx + ' ' + cy + ' L' + (cx + rr * Math.cos(a1)) + ' ' + (cy + rr * Math.sin(a1)) +
          ' A' + rr + ' ' + rr + ' 0 0 1 ' + (cx + rr * Math.cos(a2)) + ' ' + (cy + rr * Math.sin(a2)) + ' Z" fill="rgba(47,125,107,.5)"/>';
      });
    });
    s += '<text x="' + cx + '" y="' + (cy - R - 8) + '" text-anchor="middle" font-size="10" fill="#79828a">0°</text>';
    s += '<text x="' + cx + '" y="' + (cy + R + 16) + '" text-anchor="middle" font-size="10" fill="#79828a">玫瑰图：走向分布</text>';
    s += '<text x="260" y="60" font-size="12" fill="#242b2e" font-weight="600">同一张照片，换个分割阈值：</text>';
    s += '<text x="260" y="84" font-size="11" fill="#5d666d">阈值低 → 检出更多细弱裂缝 → 主走向仍是 70°；</text>';
    s += '<text x="260" y="106" font-size="11" fill="#5d666d">阈值高 → 只检出高对比度主裂缝 → 主走向可能漂到 120°。</text>';
    s += '<text x="260" y="134" font-size="11" fill="#b05a51">这就是裂缝统计必须交代清楚的不确定性——</text>';
    s += '<text x="260" y="154" font-size="11" fill="#b05a51">它直接影响储层建模的裂缝走向输入。</text>';
    s += '</svg>';
    return s;
  }

  Cases.register({
    id: 'geo-fracture-stat',
    sceneId: 'g4',
    title: '露头裂缝自动统计：实例分割替代人工罗盘',
    status: 'ready',
    version: '1.0.0',
    updated: '2026-10-23',

    tabs: {
      background: {
        label: '专业背景',
        judge: [
          { label: '数据形态', value: '露头照片 / 点云', desc: '单露头 200—500 张含标定板', html: '<span style="color:var(--c-cv)">露头图像</span>' },
          { label: '标注成本', value: '中', desc: '裂缝掩膜 ≥ 1000 条' },
          { label: '可见收益', value: '中', desc: '半天 → 分钟级，且可测陡壁', html: '<b style="color:var(--jade-d);font-family:var(--mono)">半天 → 分钟级</b>' },
          { label: '难度', value: '中', desc: '需几何标定换算地质产状', html: K.dtag('中') }
        ],
        lede: '露头裂缝的密度、走向与开度是裂缝型储层建模的关键参数。传统做法是地质人员持罗盘与皮尺逐条测量——陡壁高处无法靠近，统计还带着明显选择偏差。对露头照片做裂缝实例分割 + 骨架化，再反算产状与线密度，把这一步变成可复现的自动量算。',
        sections: [
          {
            no: 1, en: 'PROBLEM', title: '当前做法与问题',
            html: '<p>传统做法：地质人员持<b>罗盘与皮尺</b>逐条测量裂缝的走向、倾角与开度，再手工统计。</p>' +
              '<p>痛点：<b>慢</b>——一个露头半天；<b>测不到</b>——陡壁与高处无法靠近；<b>有偏差</b>——人倾向于测显眼的、够得着的裂缝，统计结果不客观。不同人测的走向能差 10° 以上。</p>' +
              K.figure(figAttitude(), 1, '裂缝产状三要素：走向（水平延伸方向）、倾角（与水平面夹角）、开度（张开宽度）。三者共同决定裂缝对储层渗透性的贡献。')
          },
          {
            no: 2, en: 'INTERVENTION', title: 'AI 能做什么',
            html: '<p>对露头照片与无人机倾斜摄影做<b>裂缝实例分割</b>，提取每条裂缝的像素，再<b>骨架化</b>得到中心线，结合摄影测量标定换算成真实的走向、长度与线密度。</p>' +
              '<p>它替换的是<b>「逐条罗盘测量」</b>：照片就能量算，陡壁高处也能覆盖，且结果可复现。但要注意——单张正视照片只能给走向与长度，<b>算不出倾角</b>，需倾斜摄影或三维重建配合。</p>' +
              K.figure(figRose(), 2, '玫瑰图是走向统计的标准图件。分割阈值会影响检出裂缝的集合，进而改变主走向——这就是必须量化交代的不确定性。')
          },
          {
            no: 3, en: 'DATA', title: '你需要准备什么',
            html: '<p style="margin-bottom:14px">门槛在摄影标定与标注，而非模型。勾选清单可交互。</p>' +
              K.checklist([
                ['露头多角度照片', '单露头 200—500 张，含标定板', '裂缝掩膜 ≥ 1000 条'],
                ['无人机倾斜摄影点云', '覆盖整个露面，厘米级分辨率', '无需标注'],
                ['产状实测记录', '罗盘实测 100—200 条', '作为验证集'],
                ['标定参数', '相机内参 / 比例尺', '用于像素换算真实尺寸']
              ]) +
              '<p style="margin-top:16px"><span class="kicker plain" style="color:var(--ink-4)">注意</span></p>' +
              K.callout('单张正视照片只能给走向与长度，算不出倾角；完整产状需要倾斜摄影或三维重建配合。', 'warn')
          },
          {
            no: 4, en: 'DIFFICULTY', title: '技术难度与参考方向',
            html: '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:2px">' +
              K.dtag('中') + '<span class="small muted">裂缝细长、对比度低，且必须完成几何标定才能把像素换算成地质产状。</span></div>' +
              K.meter('中') +
              '<p>难点不在分割本身，而在<b>几何标定</b>——像素必须换算成真实长度与角度，否则量算结果只是"像素数"。细长裂缝的对比度低也是检测难点。</p>' +
              '<p style="margin-top:16px"><span class="kicker plain" style="color:var(--ink-4)">可借鉴的通用技术</span></p>' +
              K.refs(['实例分割', '骨架化', '摄影测量', 'Hough 变换'], '#/method/cv') +
              '<p style="margin-top:16px" class="small muted">交叉环节：<a href="#/stage/seismic" style="color:var(--jade-d);font-weight:600">物探</a></p>'
          }
        ]
      },

      workflow: {
        label: '案例流程',
        title: '案例：一个露头面的裂缝自动量算',
        lead: [
          '目标是把<b>一个露头半天的人工罗盘测量压到分钟级（仅抽样复核）</b>，并用玫瑰图给出可复现的走向分布，而不是"老师傅凭印象"。',
          '下面五步是标准落地流程。第 1 步（标定）和第 5 步（不确定性交代）决定结果能否用于储层建模。'
        ],
        stats: [
          ['露头', '1 个面 / 500 张'], ['人工测量', '半天 → 5 分'],
          ['裂缝掩膜', '≥ 1000 条'], ['优势走向', '70° / 120° 两组'],
          ['线密度', '自动输出'], ['倾角', '需倾斜摄影']
        ],
        steps: [
          {
            name: '摄影采集与几何标定', role: '工程',
            do: '多角度拍摄露头并放标定板，或用无人机倾斜摄影生成点云，完成相机标定。',
            effect: '像素与真实尺寸建立严格换算关系',
            trap: '标定缺失，量算结果只是"像素数"而非"米"'
          },
          {
            name: '裂缝实例分割', role: '算法',
            do: '用分割网络（U-Net / Mask R-CNN）逐像素判别裂缝，输出裂缝掩膜。',
            effect: '每条裂缝对应一组裂缝像素',
            trap: '细弱裂缝对比度低，分割阈值直接影响检出率'
          },
          {
            name: '骨架化与去噪', role: '算法',
            do: '对裂缝掩膜做骨架化得到中心线，剔除长度过小的噪声碎片。',
            effect: '每条裂缝变成一条可量算的中心线',
            trap: '骨架化会引入毛刺，需做剪枝'
          },
          {
            name: '产状与密度量算', role: '效果关键',
            do: '结合标定换算每条裂缝的走向、长度，统计玫瑰图与线密度。',
            effect: '输出走向玫瑰图与线密度等储层建模参数',
            trap: '单张正视照片算不出倾角'
          },
          {
            name: '抽样复核与不确定性交代', role: '闭环',
            do: '随机抽样裂缝与罗盘实测对比，量化分割阈值对走向统计的影响。',
            effect: '给出带不确定性的裂缝统计结论',
            trap: '不交代阈值影响，走向会被"调"成想要的样子'
          }
        ],
        metrics: {
          title: '怎么算「量对了」',
          html: '<p>裂缝统计的评价有两个层面：<b>检出</b>（分割 IoU）与<b>量算</b>（产状误差）：</p>' +
            K.dtable(['指标', '定义', '参考取值'], [
              ['分割 IoU', '裂缝掩膜与人工标注的重叠度', '0.78'],
              ['走向误差', '自动量算 vs 罗盘实测的走向差', '< 5°'],
              ['长度误差', '自动量算 vs 皮尺实测', '< 8%'],
              ['主走向稳定性', '不同阈值下主走向是否一致', '需报告']
            ]) +
            '<p style="margin-top:12px">关键是<b>报告阈值敏感性</b>：同一张照片在不同分割阈值下主走向可能从 70° 漂到 120°，这必须量化交代，否则会误导储层建模。</p>'
        },
        fails: [
          { name: '细弱裂缝漏检', why: '对比度低的裂缝在阈值升高时被漏掉，走向统计随之漂移。必须报告阈值敏感性，或分级标注裂缝。' },
          { name: '倾角不可得', why: '单张正视照片只有二维投影，算不出倾角。需倾斜摄影、多视几何或三维点云配合。' },
          { name: '选择偏差', why: '人工只测显眼的裂缝，导致走向分布偏斜。自动量算需覆盖整个露面，而非"看得见的"。' },
          { name: '标定缺失', why: '没有标定板或相机参数，像素长度无法换算真实长度，量算结果无物理意义。' }
        ]
      },

      demo: {
        label: '可运行示范',
        mount: function (root) {
          if (!window.D27 || !window.D27.fracture) {
            root.innerHTML = '<div class="callout warn"><span class="ci">缺失</span><span>示范脚本未加载：请确认 <b>assets/cases/geo-fracture-stat.demo.js</b> 在 shell.js 之前引入。</span></div>';
            return;
          }
          window.D27.fracture.mount(root);
        },
        unmount: function () { if (window.D27 && window.D27.fracture) window.D27.fracture.unmount(); }
      }
    }
  });

})();
