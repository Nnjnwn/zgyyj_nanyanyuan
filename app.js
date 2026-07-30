// 128 人名单（初始数据库，可被名单编辑系统覆盖）
const DEFAULT_NAMES = [
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

// 当前生效名单（编辑系统会覆盖此变量，作为后续比赛的数据库）
let NAMES = DEFAULT_NAMES.slice();

// 各阶段名称（按进入该轮的人数）
const ROUND_NAMES = {
  128: "小组赛",
  64: "六十四强",
  32: "三十二强",
  16: "十六强"
};

const state = {
  rounds: [], // 每轮: { name, pick, matches, type?, participants? }
  roundIdx: 0,
  matchIdx: 0,
  champion: null,
  ranking: null, // 十强车轮战最终排名（数组，第1名在前）
  eliminatedGroups: [], // 淘汰选手按轮次分组，最近淘汰在前: [{ round, players[] }]
  revivalPending: false, // 是否在复活阶段
  eightFinalists: null // 8 强名单（复活前暂存）
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
  renderRosterEditor();
}

// 开赛前名单编辑页面
function renderRosterEditor() {
  stage.innerHTML = "";
  const box = document.createElement("div");
  box.className = "roster-box card";
  box.innerHTML = `
    <p class="card-title">参赛名单（共 ${NAMES.length} 人）</p>
    <p class="roster-tip">点击任意名字即可修改，修改将作为本次比赛数据库</p>
    <div class="roster-list" id="rosterList"></div>
    <div class="roster-actions">
      <button class="ghost-btn" id="resetRosterBtn">恢复默认名单</button>
      <button class="primary-btn" id="startBtn">确认名单 · 开始比赛</button>
    </div>
  `;
  const list = box.querySelector("#rosterList");
  NAMES.forEach((name, idx) => {
    const item = document.createElement("div");
    item.className = "roster-item";
    item.innerHTML = `<span class="roster-idx">${idx + 1}</span><span class="roster-name" data-idx="${idx}">${name}</span>`;
    list.appendChild(item);
  });

  stage.appendChild(box);

  // 点击名字 → 弹出输入框就地编辑
  list.addEventListener("click", (e) => {
    const target = e.target.closest(".roster-name");
    if (!target) return;
    const idx = Number(target.dataset.idx);
    const original = NAMES[idx];
    const input = document.createElement("input");
    input.className = "roster-input";
    input.type = "text";
    input.value = original;
    input.maxLength = 20;
    target.replaceWith(input);
    input.focus();
    input.select();

    const finishWith = (finalValue) => {
      NAMES[idx] = finalValue;
      const span = document.createElement("span");
      span.className = "roster-name";
      span.dataset.idx = idx;
      span.textContent = NAMES[idx];
      input.replaceWith(span);
    };

    const commit = async () => {
      // 防止 blur 与 keydown(Enter) 触发两次
      if (commit.locked) return;
      commit.locked = true;

      let v = input.value.trim();
      if (!v) v = original;

      // 重名检测（排除自身）→ 页面内弹窗确认
      const duplicate = NAMES.some((n, i) => i !== idx && n === v);
      if (duplicate && v !== original) {
        const ok = await showConfirm(`已有此选手「${v}」，是否确认要修改？`);
        if (!ok) v = original;
      }
      finishWith(v);
    };
    input.addEventListener("blur", commit);
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") commit();
      if (ev.key === "Escape") {
        finishWith(original);
      }
    });
  });

  box.querySelector("#resetRosterBtn").addEventListener("click", () => {
    NAMES = DEFAULT_NAMES.slice();
    renderRosterEditor();
  });

  box.querySelector("#startBtn").addEventListener("click", () => {
    // 校验：空名过滤、去重提示
    NAMES = NAMES.map(n => (n || "").trim()).filter(Boolean);
    if (NAMES.length < 4) {
      alert("名单至少需要 4 人才能开始比赛。");
      renderRosterEditor();
      return;
    }
    startTournament();
  });
}

function startTournament() {
  const shuffled = shuffle(NAMES);

  // 小组赛：每 4 人一组，四选二 → 64 人晋级
  // 若总数不是 4 的倍数，最后一组容纳剩余人员（仍选 2 人）
  const groups = [];
  for (let i = 0; i < shuffled.length; i += 4) {
    groups.push({ players: shuffled.slice(i, i + 4), winners: [] });
  }
  state.rounds = [{ name: ROUND_NAMES[128] || "小组赛", pick: 2, matches: groups }];
  state.roundIdx = 0;
  state.matchIdx = 0;
  state.champion = null;
  state.ranking = null;
  state.eliminatedGroups = [];
  state.revivalPending = false;
  state.eightFinalists = null;
  render();
}

// 页面内确认弹窗（返回 Promise<boolean>）
function showConfirm(message) {
  return new Promise((resolve) => {
    // 清理可能存在的旧弹窗
    document.querySelectorAll(".modal-mask").forEach(el => el.remove());

    const mask = document.createElement("div");
    mask.className = "modal-mask";
    mask.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <p class="modal-msg">${message}</p>
        <div class="modal-actions">
          <button class="ghost-btn" data-act="cancel">取消</button>
          <button class="primary-btn" data-act="ok">确认</button>
        </div>
      </div>
    `;
    document.body.appendChild(mask);

    let ready = false; // 防止触发弹窗的那次 Enter 冒泡被误响应
    const close = (val) => {
      mask.remove();
      document.removeEventListener("keydown", onKey, true);
      resolve(val);
    };
    const onKey = (ev) => {
      if (!ready) return;
      if (ev.key === "Enter") { ev.preventDefault(); ev.stopPropagation(); close(true); }
      if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); close(false); }
    };
    mask.addEventListener("click", (e) => {
      if (e.target === mask) close(false);
      if (e.target.dataset.act === "ok") close(true);
      if (e.target.dataset.act === "cancel") close(false);
    });
    // 用捕获阶段，确保弹窗打开后才能响应键盘
    document.addEventListener("keydown", onKey, true);
    // 下一帧再开启键盘响应，避免触发弹窗的 Enter 冒泡上来
    requestAnimationFrame(() => {
      ready = true;
      mask.querySelector('[data-act="ok"]')?.focus();
    });
  });
}

// 当前轮结束后，用晋级者构建下一轮（二选一）
function buildNextRound() {
  const last = state.rounds[state.rounds.length - 1];
  let winners = [];
  let eliminatedThisRound = [];

  if (last.pick === 2) {
    // 小组赛：每组 winners 是数组（选 2 人），未选中的为淘汰
    last.matches.forEach(m => {
      m.winners.forEach(idx => winners.push(m.players[idx]));
      m.players.forEach((p, idx) => {
        if (!m.winners.includes(idx)) eliminatedThisRound.push(p);
      });
    });
  } else {
    // 二选一：winner 晋级，另一个淘汰
    last.matches.forEach(m => {
      winners.push(m.players[m.winner]);
      eliminatedThisRound.push(m.players[1 - m.winner]);
    });
  }

  // 收集本轮淘汰者，最近淘汰的放最前面
  if (eliminatedThisRound.length > 0) {
    state.eliminatedGroups.unshift({ round: last.name, players: eliminatedThisRound });
  }

  // 8 强 → 进入复活阶段（不直接进入车轮战）
  if (winners.length === 8) {
    state.revivalPending = true;
    state.eightFinalists = winners;
    return;
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

// 构建 十强车轮战（8 强 + 2 复活 = 10 人循环赛，共 45 场）
function startRoundrobin(participants) {
  const matches = [];
  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      matches.push({ players: [participants[i], participants[j]], winner: null });
    }
  }
  state.rounds.push({
    name: "十强车轮战",
    pick: 1,
    type: "roundrobin",
    participants,
    matches
  });
  state.revivalPending = false;
  state.roundIdx = state.rounds.length - 1;
  state.matchIdx = 0;
  render();
}

// 车轮战排名：胜场降序，同胜场看相互对决，仍相同按原始顺序
function computeRanking(round) {
  const wins = {};
  round.participants.forEach(p => { wins[p] = 0; });
  round.matches.forEach(m => {
    if (m.winner !== null) wins[m.players[m.winner]]++;
  });
  return round.participants.slice().sort((a, b) => {
    if (wins[b] !== wins[a]) return wins[b] - wins[a];
    const m = round.matches.find(mm =>
      mm.players.includes(a) && mm.players.includes(b)
    );
    if (m && m.winner !== null) return m.players[m.winner] === a ? -1 : 1;
    return 0;
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
    // 车轮战结束 → 计算排名，不再构建下一轮
    if (round.type === "roundrobin") {
      state.ranking = computeRanking(round);
      state.champion = state.ranking[0];
      render();
      if (document.activeElement) document.activeElement.blur();
      return;
    }
    buildNextRound();
    // 复活阶段：不推进 roundIdx，由 renderRevival 处理
    if (state.revivalPending) {
      render();
      if (document.activeElement) document.activeElement.blur();
      return;
    }
    if (!state.champion) {
      state.roundIdx++;
      state.matchIdx = 0;
    }
  }
  render();
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
  if (state.champion) return renderFinal();
  if (state.revivalPending) return renderRevival();

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

// 复活赛页面：从淘汰选手中选 2 人复活
function renderRevival() {
  const card = document.createElement("div");
  card.className = "card revival-card";

  const title = document.createElement("h2");
  title.className = "card-title";
  title.textContent = " 复活赛";
  card.appendChild(title);

  const sub = document.createElement("p");
  sub.className = "roster-tip";
  sub.textContent = "从以下淘汰选手中选择 2 位复活，与 8 强一同进入十强车轮战";
  card.appendChild(sub);

  // 已选择计数
  const counter = document.createElement("div");
  counter.className = "counter-wrap";
  counter.innerHTML = `
    <span class="pick-counter">
      <span class="pc-left">已选择(</span><span class="pc-num">0</span><span class="pc-right">/2)</span>
    </span>
  `;
  card.appendChild(counter);

  // 淘汰选手按轮次分组展示（最近淘汰在前）
  const box = document.createElement("div");
  box.className = "revival-list";

  state.eliminatedGroups.forEach(group => {
    const groupLabel = document.createElement("div");
    groupLabel.className = "revival-group-label";
    groupLabel.textContent = `${group.round}淘汰`;
    box.appendChild(groupLabel);

    const chipsRow = document.createElement("div");
    chipsRow.className = "chips";
    group.players.forEach(name => {
      const chip = document.createElement("div");
      chip.className = "revival-chip";
      chip.textContent = name;
      chip.dataset.name = name;
      chipsRow.appendChild(chip);
    });
    box.appendChild(chipsRow);
  });

  card.appendChild(box);

  // 确认按钮
  const actions = document.createElement("div");
  actions.className = "roster-actions";
  const confirmBtn = document.createElement("button");
  confirmBtn.className = "primary-btn";
  confirmBtn.id = "revivalConfirmBtn";
  confirmBtn.textContent = "确认复活";
  confirmBtn.disabled = true;
  actions.appendChild(confirmBtn);
  card.appendChild(actions);

  stage.innerHTML = "";
  stage.appendChild(card);

  // 已选择的选手（闭包内管理）
  const selected = [];

  box.querySelectorAll(".revival-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const name = chip.dataset.name;
      const idx = selected.indexOf(name);
      if (idx >= 0) {
        selected.splice(idx, 1);
        chip.classList.remove("selected");
      } else {
        if (selected.length >= 2) return;
        selected.push(name);
        chip.classList.add("selected");
      }
      counter.querySelector(".pc-num").textContent = selected.length;
      confirmBtn.disabled = selected.length !== 2;
    });
  });

  confirmBtn.addEventListener("click", async () => {
    if (selected.length !== 2) return;
    const ok = await showConfirm(`确认要复活「${selected[0]}」和「${selected[1]}」吗？`);
    if (!ok) return;
    const participants = [...state.eightFinalists, ...selected];
    startRoundrobin(participants);
  });
}

// 最终结果页：领奖台样式，展示 8 强排名
function renderFinal() {
  const r = state.ranking;
  const card = document.createElement("div");
  card.className = "card final-card";

  // 兜底：非标准人数走到单一冠军（未触发车轮战），显示简单冠军页
  if (!r) {
    const title = document.createElement("h2");
    title.className = "final-title";
    title.textContent = ` 冠军：${state.champion}`;
    card.appendChild(title);

    const actions = document.createElement("div");
    actions.className = "champion-actions";
    const againBtn = document.createElement("button");
    againBtn.className = "ghost-btn";
    againBtn.textContent = "再来一届";
    actions.appendChild(againBtn);
    card.appendChild(actions);

    stage.innerHTML = "";
    stage.appendChild(card);
    againBtn.addEventListener("click", init);
    return;
  }

  const title = document.createElement("h2");
  title.className = "final-title";
  title.textContent = " 十强最终排名";
  card.appendChild(title);

  // 领奖台区域：第2名 | 第1名 | 第3名（中间最高）
  const podium = document.createElement("div");
  podium.className = "podium";
  const order = [1, 0, 2]; // 第2、第1、第3
  const heights = ["podium-h2", "podium-h1", "podium-h3"];
  const medals = ["", "", ""];
  order.forEach((idx, i) => {
    const place = document.createElement("div");
    place.className = `podium-place place-${idx + 1}`;
    const medal = document.createElement("div");
    medal.className = "podium-medal";
    medal.textContent = medals[i];
    const name = document.createElement("div");
    name.className = "podium-name";
    name.textContent = r[idx];
    const block = document.createElement("div");
    block.className = `podium-block ${heights[i]}`;
    block.textContent = idx + 1;
    place.appendChild(medal);
    place.appendChild(name);
    place.appendChild(block);
    podium.appendChild(place);
  });
  card.appendChild(podium);

  // 第 4-8 名列表
  const rest = document.createElement("div");
  rest.className = "podium-rest";
  for (let i = 3; i < r.length; i++) {
    const item = document.createElement("div");
    item.className = "rest-item";
    item.innerHTML = `<span class="rest-rank">${i + 1}</span><span class="rest-name">${r[i]}</span>`;
    rest.appendChild(item);
  }
  card.appendChild(rest);

  // 操作按钮
  const actions = document.createElement("div");
  actions.className = "champion-actions";
  const againBtn = document.createElement("button");
  againBtn.className = "ghost-btn";
  againBtn.id = "againBtn";
  againBtn.textContent = "再来一届";
  actions.appendChild(againBtn);
  card.appendChild(actions);

  stage.innerHTML = "";
  stage.appendChild(card);

  againBtn.addEventListener("click", init);
}

restartBtn.addEventListener("click", init);

init();