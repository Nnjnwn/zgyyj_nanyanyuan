// 128 人名单
const NAMES = [
  "相征","施博威","孙一城","钱蒙楠","万钰彬","田野","汤佳明","姜义哲",
  "朱亮","卢翰林","许昌泰","于滨嘉","徐佳文","王逸飞","李政绪","刘朱烨",
  "赵奕然","吴盛祥","陈诗","薛钦元","朱家鹏","蓝浩","吴以瀚","林大钦",
  "王瑞","曹牧之","尤宣程","张梁","邵奕磊","刘子赫","祝颂皓","何严浩",
  "牛博为","李秋盟","顾易","姜崃","霍泽安","江泽辰","钟嘉诚","刘瀚聪",
  "宋元明","何铭海","邱俊阳","郑艺彬","遇泓羊","朱羿达","王浩楠","陈科铭",
  "郝李英杰","孙义清","周一男","胡迪","李苏霖","朱亚洲","杨浩然","陈楷",
  "李玉言","吴志军","蔡淇","叶宇锋","周波","刘官卫","高杨","白倬铭",
  "王颢珏","李存贤","龙一豪","翟松","王瀚宇","黄思惟","王培杰","邵立君",
  "郑棋元","赵钱龙","徐杭","李磊","舒荣波","董豫辰","叶筱玮","庞东轩",
  "亓振源","赵洪博","纪晓坤","徐均朔","张嘉豪","刘阳","胡芳洲","夏阳",
  "毛二","陈志","冒海飞","殷浩伦","张泽","王天择","韦岸","李珏",
  "张力夫","赵伟钢","刘令飞","钟舜傲","马啸","徐泽辉","叶麒圣","王敏辉",
  "刘一谷","刘岩","邵玎","余镇鳌","张博俊","金圣权","蒲铖","张玮伦",
  "王智威","胡超政","高品","浦弘斐","范宇澄","郭亢","潘彦如","张智涵",
  "于晓璘","郭嘉轩","徐昊","高雨晨","马灵奇","沈育奇","琚茂林","滕春鹏"
];

// 各阶段名称（按进入该轮的人数）
const ROUND_NAMES = {
  128: "小组赛",
  64: "六十四强",
  32: "三十二强",
  16: "十六强",
  8: "八强",
  4: "半决赛",
  2: "决赛"
};

const state = {
  rounds: [],     // 每轮: { name, pick, matches }
  roundIdx: 0,
  matchIdx: 0,
  champion: null
};

// Fisher–Yates 洗牌
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function init() {
  const shuffled = shuffle(NAMES);

  // 小组赛：每 4 人一组，四选二 → 64 人晋级
  const groups = [];
  for (let i = 0; i < shuffled.length; i += 4) {
    groups.push({ players: shuffled.slice(i, i + 4), winners: [] });
  }
  state.rounds = [{ name: ROUND_NAMES[128], pick: 2, matches: groups }];
  state.roundIdx = 0;
  state.matchIdx = 0;
  state.champion = null;
  render();
}

// 当前轮结束后，用晋级者构建下一轮（二选一）
function buildNextRound() {
  const last = state.rounds[state.rounds.length - 1];
  let winners = [];

  if (last.pick === 2) {
    // 小组赛：每组 winners 是数组（选 2 人）
    last.matches.forEach(m => {
      m.winners.forEach(idx => winners.push(m.players[idx]));
    });
  } else {
    winners = last.matches.map(m => m.players[m.winner]);
  }

  if (winners.length === 1) {
    state.champion = winners[0];
    return;
  }

  const matches = [];
  for (let i = 0; i < winners.length; i += 2) {
    matches.push({ players: [winners[i], winners[i + 1]], winner: null });
  }
  state.rounds.push({
    name: ROUND_NAMES[winners.length] || "淘汰赛",
    pick: 1,
    matches
  });
}

function pick(playerIndex) {
  // 防止在 0.3s 高亮延迟期间重复点击导致状态错乱
  if (pick.locked) return;
  const round = state.rounds[state.roundIdx];
  const match = round.matches[state.matchIdx];

  if (round.pick === 2) {
    // 小组赛 4 选 2
    // 已选且当前只选了 1 人：允许取消选择
    if (match.winners.includes(playerIndex) && match.winners.length === 1) {
      match.winners = [];
      const buttons = document.querySelectorAll('.choice');
      if (buttons[playerIndex]) {
        buttons[playerIndex].classList.remove('selected');
      }
      const numEl = document.getElementById('pickCounter')?.querySelector('.pc-num');
      if (numEl) numEl.textContent = 0;
      // 冻结 hover，避免取消后鼠标停留位置仍显示浮动 hover 状态
      document.body.classList.add("freeze-hover");
      hoverUnfrozen = false;
      return;
    }
    if (match.winners.includes(playerIndex)) return; // 已选，忽略
    match.winners.push(playerIndex);

    // 只更新按钮样式，不重新渲染卡片（避免闪烁）
    const buttons = document.querySelectorAll('.choice');
    if (buttons[playerIndex]) {
      buttons[playerIndex].classList.add('selected');
    }
    // 更新已选择计数（只更新数字部分，避免抖动）
    const numEl = document.getElementById('pickCounter')?.querySelector('.pc-num');
    if (numEl) numEl.textContent = match.winners.length;

    // 如果还没选完两人，不进入下一场
    if (match.winners.length < 2) {
      return;
    }
    // 选完两人后，高亮 0.3 秒再进入下一场
    pick.locked = true;
    setTimeout(() => {
      pick.locked = false;
      advance();
    }, 300);
    return;
  } else {
    match.winner = playerIndex;
    // 立即给被点按钮加高亮类，让用户在 0.3s 延迟期间看到高亮
    const buttons = document.querySelectorAll('.choice');
    if (buttons[playerIndex]) {
      buttons[playerIndex].classList.add('selected');
    }
    // 更新已选择计数
    const numEl = document.getElementById('pickCounter')?.querySelector('.pc-num');
    if (numEl) numEl.textContent = 1;
    // 二选一选中后，高亮 0.3 秒再进入下一场
    pick.locked = true;
    setTimeout(() => {
      pick.locked = false;
      advance();
    }, 300);
    return;
  }
}

function advance() {
  const round = state.rounds[state.roundIdx];
  state.matchIdx++;
  if (state.matchIdx >= round.matches.length) {
    buildNextRound();
    if (!state.champion) {
      state.roundIdx++;
      state.matchIdx = 0;
    }
  }
  render();
  // render() 重建 DOM 后，浏览器可能会把焦点恢复到上一张卡片相同位置的按钮
  // （因为被替换的元素索引一致），导致该按钮出现残留高亮/焦点框。
  // 在新 DOM 生成完成后立即 blur 掉。
  if (document.activeElement) document.activeElement.blur();
}

// ---- 渲染 ----
const stage = document.getElementById("stage");
const restartBtn = document.getElementById("restartBtn");

// 鼠标移动时解除 hover 冻结，恢复正常的 hover 反馈
let hoverUnfrozen = false;
document.addEventListener("mousemove", () => {
  if (!hoverUnfrozen) {
    document.body.classList.remove("freeze-hover");
    hoverUnfrozen = true;
  }
});

function render() {
  if (state.champion) return renderChampion();

  const round = state.rounds[state.roundIdx];
  const match = round.matches[state.matchIdx];
  const total = round.matches.length;
  const done = state.matchIdx;

  // 头部：轮次 + 进度
  const head = document.createElement("div");
  head.className = "round-head";
  const pickLabel = round.pick === 2 ? "四选二" : "二选一";
  head.innerHTML = `
    <div class="round-meta">
      <span class="round-tag">${round.name}</span>
      <span>第 ${done + 1} / ${total} 场 · ${pickLabel}</span>
    </div>
    <div class="progress"><span style="width:${(done / total) * 100}%"></span></div>
  `;

  // 当前对阵卡片：已选择计数放进卡片内（替换原"共 X 场"副标题位置）
  const card = document.createElement("div");
  card.className = "card";
  const pickWord = round.pick === 2 ? "选择本组晋级选手" : "选择晋级选手";
  const selectedCount = round.pick === 2
    ? match.winners.length
    : (match.winner === null ? 0 : 1);
  card.innerHTML = `
    <p class="card-title">${pickWord}</p>
    <div class="counter-wrap">
      <span id="pickCounter" class="pick-counter">
        <span class="pc-left">已选择(</span><span class="pc-num">${selectedCount}</span><span class="pc-right">/${round.pick})</span>
      </span>
    </div>
    <div class="choices ${round.pick === 1 ? "duel" : ""}"></div>
  `;
  const choicesEl = card.querySelector(".choices");
  match.players.forEach((name, idx) => {
    const el = document.createElement("div");
    el.className = "choice";
    if (match.winners && match.winners.includes(idx)) {
      el.classList.add("selected");
    }
    el.innerHTML = `${name}`;
    el.addEventListener("click", () => pick(idx));
    choicesEl.appendChild(el);
  });

  stage.innerHTML = "";
  stage.appendChild(head);
  stage.appendChild(card);

  // 冻结 hover，避免新卡片渲染后鼠标停留位置出现蓝色 hover 残留框；
  // 等鼠标真正移动后再恢复 hover 反馈（如同第一次访问）
  document.body.classList.add("freeze-hover");
  hoverUnfrozen = false;
}

function renderChampion() {
  const groupRound = state.rounds[0];
  // 排除决赛轮（最后一轮）—— 决赛赢家即冠军，显示在中心；
  // 半决赛成为两侧最后一列，各 1 个赢家 1to1 直连中心冠军
  const knockoutRounds = state.rounds.slice(1, -1);
  const halfGroups = groupRound.matches.length / 2; // 16

  // 左侧列（外→内）。connector 表示该列如何连接到右侧下一列：
  //   - '2to1'：本列每 2 个节点合并成下一列 1 个节点（画横线+竖线+中点出头）
  //   - '1to1'：本列每个节点直连下一列 1 个节点（画一条横线）
  // 小组赛：每组 2 个赢家 → 下一轮 1 场比赛 1 个赢家（2to1 合并）
  // 六十四强→半决赛：每 2 场赢家 → 下一轮 1 个赢家（2to1）
  // 半决赛→决赛：每侧 1 个赢家 → 决赛 1 个选手（1to1）
  const leftCols = [];
  leftCols.push({ matches: groupRound.matches.slice(0, halfGroups), isGroup: true, connector: '2to1' });
  knockoutRounds.forEach((r, i) => {
    const isSemi = r.matches.length === 2; // 半决赛（每侧 1 场）
    leftCols.push({
      matches: r.matches.slice(0, r.matches.length / 2),
      isGroup: false,
      connector: isSemi ? '1to1' : '2to1'
    });
  });

  // 右侧列（内→外，镜像）
  const rightCols = [];
  knockoutRounds.slice().reverse().forEach((r, i) => {
    const isSemi = r.matches.length === 2;
    rightCols.push({
      matches: r.matches.slice(r.matches.length / 2),
      isGroup: false,
      connector: isSemi ? '1to1' : '2to1'
    });
  });
  rightCols.push({ matches: groupRound.matches.slice(halfGroups), isGroup: true, connector: '2to1' });

  let html = `<div class="card champion-card">`;
  html += `<h2 class="champion-title">🏆 冠军：${state.champion}</h2>`;
  html += `<div class="bracket-final">`;

  // 左侧
  html += `<div class="bracket-side bracket-left">`;
  leftCols.forEach(col => { html += renderCol(col, 'left'); });
  html += `</div>`;

  // 中间：最终冠军（高亮），两侧半决赛赢家各向中间连线
  html += `<div class="bf-center"><div class="bf-champion">${state.champion}</div></div>`;

  // 右侧
  html += `<div class="bracket-side bracket-right">`;
  rightCols.forEach(col => { html += renderCol(col, 'right'); });
  html += `</div>`;

  html += `</div>`;
  html += `<div style="text-align:center;margin-top:18px;"><button class="ghost-btn" id="againBtn">再来一届</button></div>`;
  html += `</div>`;

  stage.innerHTML = html;
  document.getElementById("againBtn").addEventListener("click", init);
}

function renderCol(col, side) {
  let html = `<div class="bf-col conn-${col.connector}"><div class="bf-col-matches">`;

  if (col.isGroup) {
    // 小组赛：每组的 2 个赢家各自作为一个节点，配对成 .bf-pair（2to1 合并到下一轮）
    col.matches.forEach(m => {
      html += `<div class="bf-pair">`;
      m.winners.forEach(idx => {
        html += `<div class="bf-match"><div class="bf-p">${m.players[idx]}</div></div>`;
      });
      html += `</div>`;
    });
  } else if (col.connector === '2to1') {
    // 淘汰赛 2to1：每 2 场赢家配对成 .bf-pair
    for (let i = 0; i < col.matches.length; i += 2) {
      html += `<div class="bf-pair">`;
      html += renderMatch(col.matches[i], false);
      if (i + 1 < col.matches.length) html += renderMatch(col.matches[i + 1], false);
      html += `</div>`;
    }
  } else {
    // 1to1：直排
    col.matches.forEach(m => { html += renderMatch(m, false); });
  }

  html += `</div></div>`;
  return html;
}

function renderMatch(m, isGroup) {
  let html = `<div class="bf-match ${isGroup ? 'group' : ''}">`;
  if (isGroup) {
    // 小组赛：显示 2 个赢家（winners 数组）
    m.winners.forEach(idx => {
      html += `<div class="bf-p">${m.players[idx]}</div>`;
    });
  } else {
    // 淘汰赛：显示 1 个赢家
    html += `<div class="bf-p">${m.players[m.winner]}</div>`;
  }
  html += `</div>`;
  return html;
}

restartBtn.addEventListener("click", init);

init();
