/* =====================================================================
   INTERFÍCIE (HUD)
   ===================================================================== */
const hudEl = document.getElementById('hud');
const selContent = document.getElementById('sel-content');
const selCount = document.getElementById('sel-count');
const actionsEl = document.getElementById('actions');
const toastEl = document.getElementById('toast');
const resEls = {
  food: document.getElementById('res-food'),
  wood: document.getElementById('res-wood'),
  gold: document.getElementById('res-gold'),
  stone: document.getElementById('res-stone'),
};

let toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1900);
}

function updateResourcesUI() {
  for (const k of Object.keys(resEls)) {
    const el = resEls[k];
    const val = String(Math.floor(state.resources[k]));
    if (el.textContent !== val) {
      el.textContent = val;
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    }
  }
}
function updatePopulationUI() {
  const used = unitCount(PLAYER.id), cap = popCap();
  document.getElementById('pop-val').textContent = used;
  document.getElementById('pop-cap').textContent = cap;
  document.querySelector('#panel-resources .pop').classList.toggle('full', used >= cap);
}

function hpBar(e, cls = '') {
  const pct = e.maxHp ? (e.hp / e.maxHp) * 100 : 0;
  return `<div class="bar ${cls}"><i style="width:${pct}%"></i><span>${e.hp} / ${e.maxHp}</span></div>`;
}
function ownerLine(e) {
  if (e.team === 0) return `<div class="sel-owner">Natura · Recurs neutral</div>`;
  const T = teamOf(e.team);
  return `<div class="sel-owner"><span class="dot" style="background:#${T.color.toString(16).padStart(6, '0')};box-shadow:0 0 6px #${T.color.toString(16).padStart(6, '0')}"></span>${T.name}${e.isOwn ? '' : ' · <b style="color:#ff8a7a">enemic</b>'}</div>`;
}

function unitTaskLine(u) {
  const tag = `<span class="state-tag ${u.state}">${STATE_LABEL[u.state]}</span>`;
  let detail = '';
  if (u.state === STATE.ATTACKING && u.attackTarget) detail = ` ${u.attackTarget.name}`;
  else if (u.state === STATE.CONVERTING && u.convTarget) detail = ` ${u.convTarget.name}${u.faith < 100 ? ' (esperant la fe)' : ''}`;
  else if (u.state === STATE.HEALING && u.healTarget) detail = ` ${u.healTarget.name}`;
  else if (u.state === STATE.MOVING && u.relicTarget) detail = ' cap a una relíquia';
  else if (u.state === STATE.MOVING && u.relic && u.relicDrop) detail = ' a guardar la relíquia';
  else if (u.state === STATE.TRADING) detail = u.tradeLoaded ? ` · porta <b>${u.tradeLoaded} 🪙</b>` : ' · anant a carregar';
  else if (u.state === STATE.GATHERING && u.gatherNode) detail = ` ${RES_LABEL[u.gatherNode.resourceType]} de ${u.gatherNode.name.toLowerCase()}`;
  else if (u.state === STATE.MOVING && u.gatherNode) detail = ` cap a ${u.gatherNode.name.toLowerCase()}`;
  else if (u.state === STATE.RETURNING) detail = u.dropTarget ? ` (${u.dropTarget.name})` : '';
  else if (u.state === STATE.BUILDING && u.buildTarget) detail = ` ${u.buildTarget.name}`;
  else if (u.state === STATE.MOVING && u.buildTarget) detail = ` a construir ${u.buildTarget.name.toLowerCase()}`;
  return tag + detail;
}
function carryLine(u) {
  if (!u.carry.amount || !u.carry.type) return `<span>🎒 Càrrega <b>buida</b></span>`;
  return `<span>🎒 Càrrega <b>${RES_ICON[u.carry.type]} ${u.carry.amount}/${capOf(u)}</b></span>`;
}

/* Signatura de l'estat visible: si canvia, es refà el panell de selecció */
function selectionSignature() {
  return state.selected.map(e => e.kind === 'unit'
    ? `${e.id}:${e.state}:${Math.ceil(e.hp)}:${e.carry.amount}:${Math.floor((e.faith || 0) / 4)}:${e.relic ? 1 : 0}:${e.gatherNode ? e.gatherNode.id : 0}:${e.buildTarget ? e.buildTarget.id : 0}`
    : `${e.id}:${e.kind}:${e.amount ?? ''}:${e.name}:${state.units.length}:${e.garrison ? e.garrison.length : 0}:${Math.ceil(e.hp / 50)}:${e.trainQueue ? e.trainQueue.length : ''}:${e.underConstruction ? Math.floor(e.progress * 50) : 'c'}:${popCap()}`).join('|');
}
let lastSelSignature = '';
let buildPage = 0;
let lastTechSig = '';

function updateSelectionUI(panelOnly = false) {
  lastSelSignature = selectionSignature();
  const sel = state.selected;
  selCount.textContent = sel.length ? `${sel.length} ${sel.length === 1 ? 'element' : 'elements'}` : '';
  if (!panelOnly) actionsEl.innerHTML = '';

  if (!sel.length) {
    selContent.innerHTML = `<div class="empty-hint">Cap element seleccionat<br><span style="font-size:12px">Fes clic o arrossega per seleccionar unitats</span></div>`;
    if (!panelOnly) actionsEl.innerHTML = `<div class="action-hint">Selecciona el <b>Centre de Ciutat</b> (<kbd>H</kbd>) per crear aldeans.</div>`;
    return;
  }

  const first = sel[0];
  if (sel.length === 1) {
    let stats = '';
    if (first.kind === 'unit') {
      if (first.category === 'monk') {
        stats = `<div class="stats"><span>${unitTaskLine(first)}</span>${first.relic ? '<span>🏺 <b>Porta una relíquia</b></span>' : ''}</div>
        <div class="bar faith"><i style="width:${first.faith}%"></i><span>🙏 Fe: ${Math.floor(first.faith)}%</span></div>
        <div class="stats"><span title="Abast de conversió">✨ <b>${first.convRange}</b></span><span title="Abast de curació">💚 <b>${first.healRange}</b></span><span title="Armadura">🛡 <b>${first.armor[0]}/${first.armor[1]}</b></span><span title="Visió">👁 <b>${first.los}</b></span></div>`;
      } else if (first.category === 'king') {
        stats = `<div class="stats"><span>${unitTaskLine(first)}</span><span>👑 <b>${state.victory === 'regicide' ? 'Si mor, perds la partida' : 'Rei'}</b></span></div>`;
      } else
      stats = `<div class="stats"><span>${unitTaskLine(first)}</span>${first.isMilitary || !first.isOwn ? (first.isMilitary && first.isOwn ? `<span>${STANCES[first.stance].icon} ${STANCES[first.stance].name}</span>` : '') : carryLine(first)}</div>
        <div class="stats"><span>⚔ Atac <b>${first.attack}</b></span><span>🛡 Armadura <b>${first.armor[0]}/${first.armor[1]}</b></span><span>🎯 Abast <b>${first.range ? first.range : 'cos a cos'}</b></span><span>👁 Visió <b>${first.los}</b></span></div>`;
    } else if (first.kind === 'building') {
      if (!first.isOwn) {
        stats = `<div class="stats"><span>🛡 Armadura <b>${first.armor[0]}/${first.armor[1]}</b></span><span>${first.underConstruction ? 'En construcció' : ''}</span></div>`;
      } else if (first.subtype === 'towncenter') {
        stats = `<div class="stats"><span>🏯 <b>${CONFIG.AGES[PLAYER.age].name}</b></span><span>👥 Població <b>${unitCount()}/${popCap()}</b></span><span>🔔 Refugiats <b>${first.garrison ? first.garrison.length : 0}/${CONFIG.GARRISON_MAX}</b></span><span>🏹 Fletxes <b>${1 + Math.min(10, first.garrison ? first.garrison.length : 0)}</b></span><span>🚩 Reunió <b>${first.rally ? (first.rally.node ? first.rally.node.name : 'terreny') : 'cap'}</b></span></div>`;
      } else if (first.underConstruction) {
        const n = state.units.filter(u => u.state === STATE.BUILDING && u.buildTarget === first).length;
        stats = `<div class="stats"><span>🔨 Constructors <b>${n}</b></span><span>${first.def.desc}</span></div>`;
      } else {
        const d = first.def;
        const parts = [];
        if (d.pop) parts.push(`<span>🏠 Població <b>+${d.pop}</b></span>`);
        if (d.dropoff) parts.push(`<span>📦 Magatzem <b>${d.dropoff.map(t => RES_ICON[t]).join(' ')}</b></span>`);
        if (first.subtype === 'mill') parts.push('<span>🌱 Permet construir <b>granges</b></span>');
        if (first.subtype === 'barracks') parts.push(`<span>🚩 Reunió <b>${first.rally ? 'establert' : 'cap'}</b></span>`);
        if (first.subtype === 'monastery') { const n = first.relics ? first.relics.length : 0; parts.push(`<span>🏺 Relíquies <b>${n}</b></span><span>🪙 <b>+${(n * RELIC_GOLD).toFixed(1)}/s</b></span>`); }
        if (first.subtype === 'wonder' && first.wonderEnd) parts.push(`<span>🏛️ Victòria en <b>${formatTime(Math.max(0, first.wonderEnd - state.elapsed))}</b></span>`);
        stats = `<div class="stats">${parts.join('')}</div>`;
      }
      if (first.trainQueue && first.isOwn && !first.underConstruction) {
        const items = first.trainQueue.map((it, i) =>
          `<div class="q-item" data-idx="${i}" title="${itemDef(it.kind).name} · clic: cancel·lar (retorna ${costText(it.paid || costFor(it.kind))})">${itemDef(it.kind).icon}${i === 0 ? '<i class="q-prog"></i>' : ''}</div>`).join('');
        if (items) stats += `<div class="queue-row"><div class="queue" id="train-queue">${items}</div><div class="train-status" id="train-status"></div></div>`;
      }
    }
    if (first.kind === 'relic') {
      stats = `<div class="stats"><span>${first.carrier ? `La porta un monjo (${teamOf(first.carrier.team).name})` : first.holder ? 'Guardada en un Monestir' : 'A terra: envia-hi un monjo'}</span></div>`;
    }
    const isRes = first.kind === 'resource';
    const resLabel = isRes ? RES_LABEL[first.resourceType] : '';
    const bar = first.kind === 'relic' ? `<div class="bar res"><i style="width:100%"></i><span>🪙 +${RELIC_GOLD} d'or/s en un Monestir</span></div>` : isRes
      ? `<div class="bar res"><i style="width:${(first.amount / first.maxAmount) * 100}%"></i><span>${resLabel}: ${first.amount}</span></div>`
      : first.underConstruction
        ? `<div class="bar build"><i style="width:${first.progress * 100}%"></i><span>Construcció: ${Math.floor(first.progress * 100)}%</span></div>`
        : hpBar(first);
    selContent.innerHTML = `
      <div class="portrait ${first.isOwn ? '' : first.team ? 'enemy' : 'neutral'}">${first.icon}</div>
      <div class="sel-info">
        <div class="sel-name">${first.name}</div>
        ${ownerLine(first)}
        ${bar}
        ${stats}
      </div>`;
  } else {
    // Selecció sense límit: amb molts elements es mostren agrupats per tipus
    const byType = new Map();
    sel.forEach(u => { if (!byType.has(u.subtype)) byType.set(u.subtype, []); byType.get(u.subtype).push(u); });
    const grouped = sel.length > 24;
    const shown = grouped ? [] : sel;
    const stIcon = { IDLE: '💤', MOVING: '👣', GATHERING: '⚒️', RETURNING: '🎒', BUILDING: '🔨', ATTACKING: '⚔️', GARRISONED: '🏰', TRADING: '🪙' };
    const minis = shown.map(u => `<div class="mini" data-id="${u.id}" title="${u.name} · ${STATE_LABEL[u.state]}"><span class="st">${stIcon[u.state] || ''}</span>${u.icon}<div class="hp" style="width:${(u.hp / u.maxHp) * 100}%"></div></div>`).join('');
    const counts = {};
    sel.forEach(u => { counts[u.state] = (counts[u.state] || 0) + 1; });
    const summary = Object.entries(counts).map(([k, v]) => `<span class="state-tag ${k}">${STATE_LABEL[k]}: ${v}</span>`).join(' ');
    const carried = { food: 0, wood: 0, gold: 0, stone: 0 };
    sel.forEach(u => { if (u.carry.type) carried[u.carry.type] = (carried[u.carry.type] || 0) + u.carry.amount; });
    const more = grouped ? [...byType.entries()].map(([k, list]) => {
      const hp = list.reduce((a, u) => a + u.hp / u.maxHp, 0) / list.length;
      return `<div class="mini grp" data-type="${k}" title="${list[0].name} ×${list.length} · clic: només aquests · Shift+clic: treure'ls"><span class="st">×${list.length}</span>${list[0].icon}<div class="hp" style="width:${hp * 100}%"></div></div>`;
    }).join('') : '';
    selContent.innerHTML = `
      <div class="portrait">${first.icon}</div>
      <div class="sel-info" style="justify-content:flex-start">
        <div class="sel-name">${sel.length} ${sel.every(u => u.subtype === 'villager') ? 'Aldeans' : 'Unitats'}${sel.some(u => u.isMilitary) && sel.length > 1 ? ` <small style="opacity:.7">· ${FORMATIONS[groupFormation(sel)].icon} ${FORMATIONS[groupFormation(sel)].name}</small>` : ''}</div>
        <div class="stats">${summary}<span>🎒 ${Object.keys(carried).filter(k => carried[k]).map(k => `${RES_ICON[k]} <b>${carried[k]}</b>`).join(' · ') || '<b>buida</b>'}</span></div>
        <div class="multi-grid">${minis}${more}</div>
      </div>`;
    selContent.querySelectorAll('.mini.grp').forEach(el => {
      el.addEventListener('click', ev => {
        const list = byType.get(el.dataset.type) || [];
        if (ev.shiftKey) { list.forEach(removeFromSelection); onSelectionChanged(); }
        else setSelection(list);
      });
    });
    selContent.querySelectorAll('.mini:not(.grp)').forEach(el => {
      el.addEventListener('click', ev => {
        const ent = sel.find(s => s.id === Number(el.dataset.id));
        if (!ent) return;
        if (ev.shiftKey) { removeFromSelection(ent); onSelectionChanged(); }
        else setSelection([ent]);
      });
    });
  }

  if (panelOnly) return;
  actionsEl.classList.remove('compact');

  // Botons d'acció contextuals
  if (first.kind === 'building' && first.isOwn && !first.underConstruction && buildingItems(first).length) {
    // Unitats i tecnologies de l'edifici (Centre, Caserna, Estable, Ferreria, magatzems)
    actionsEl.classList.add('compact');
    const T = PLAYER;
    for (const kind of buildingItems(first)) {
      const d = itemDef(kind);
      const tech = isTech(kind);
      if (tech && (T.techs.has(kind) || techQueued(T.id, kind))) continue;
      if (tech && d.ageUp && d.ageUp !== T.age + 1) continue;
      if (tech && d.requires && !T.techs.has(d.requires)) continue;     // només es mostra el pas següent de cada cadena
      const locked = (d.age || 0) > T.age;
      const cost = costFor(kind);
      const b = makeActionButton(locked ? '🔒' : d.icon, shortLabel(kind), costHTML(cost),
        kind === 'villager' ? 'C' : '', () => queueUnit(first, kind), true);
      b.dataset.item = kind;
      if (tech && (d.upgradeTo || d.elite || d.ageUp)) b.insertAdjacentHTML('beforeend', '<span class="upg">⬆</span>');
      b.title = tech
        ? `${d.name} — ${costText(cost)} · ${d.time}s\n${d.desc}${locked ? `\nRequereix: ${CONFIG.AGES[d.age].name}` : ''}`
        : `${d.name} — ${costText(cost)} · ${d.time}s\n${d.desc || ''}\n❤ ${d.hp} · ⚔ ${d.attack} · 🛡 ${d.armor.join('/')}${d.range ? ' · 🎯 ' + d.range : ''}${locked ? `\nRequereix: ${CONFIG.AGES[d.age].name}` : ''}`;
      actionsEl.appendChild(b);
    }
    if (first.subtype === 'market') {
      const P = PLAYER.prices;
      for (const r of ['food', 'wood', 'stone']) {
        const buy = makeActionButton(RES_ICON[r], 'Compra', costHTML({ gold: P[r] }), '', () => marketTrade(PLAYER.id, r, true), true);
        buy.title = `Compra 100 de ${RES_LABEL[r].toLowerCase()} per ${P[r]} d'or (el preu puja)`;
        actionsEl.appendChild(buy);
      }
      for (const r of ['food', 'wood', 'stone']) {
        const sell = makeActionButton(RES_ICON[r], 'Ven', '+' + costHTML({ gold: Math.floor(P[r] * sellRate(PLAYER.id)) }), '', () => marketTrade(PLAYER.id, r, false), true);
        sell.title = `Ven 100 de ${RES_LABEL[r].toLowerCase()} per ${Math.floor(P[r] * sellRate(PLAYER.id))} d'or (el preu baixa)`;
        actionsEl.appendChild(sell);
      }
    }
    if (first.subtype === 'towncenter') {
      const inside = first.garrison && first.garrison.length;
      const bell = makeActionButton(inside ? '🚪' : '🔔', inside ? 'A la feina' : 'Campana', inside ? `${first.garrison.length} dins` : 'Refugi', 'B', () => ringTownBell(first), true);
      bell.title = 'Campana: els aldeans propers es refugien al Centre (+1 fletxa per aldeà).\nTorna-la a prémer perquè tornin a la feina.';
      actionsEl.appendChild(bell);
    } else {
      actionsEl.appendChild(makeActionButton('🗑️', 'Enderrocar', 'Supr', '', () => demolishBuilding(first), true));
    }
    if (garrisonCap(first) > 0 && first.subtype !== 'towncenter') {
      const n = first.garrison ? first.garrison.length : 0;
      const g = makeActionButton('🚪', n ? 'Sortir' : 'Refugi', `${n}/${garrisonCap(first)}`, 'U', () => ungarrison(first), true);
      g.title = 'Unitats a dins (cada una afegeix una fletxa). Clic dret amb tropes seleccionades per fer-les entrar. U: fer-les sortir';
      actionsEl.appendChild(g);
    }
  } else if (first.kind === 'unit' && first.isOwn && !builders().length) {
    // Només militars: aturar i postures de combat
    actionsEl.classList.add('compact');
    const mil = state.selected.filter(s => s.kind === 'unit' && s.isOwn);
    const stop = makeActionButton('✋', 'Aturar', 'X', '', () => { commandStop(mil); updateSelectionUI(); }, true);
    stop.title = "Aturar (X)\nClic dret sobre un enemic: atacar (l'ordre directa ignora la postura)";
    actionsEl.appendChild(stop);
    const cur = mil.every(u => u.stance === mil[0].stance) ? mil[0].stance : null;
    const keysSt = { aggressive: 'Z', defensive: 'V', stand: 'N' };
    if (mil.some(u => u.canGround)) {
      const g = makeActionButton('☄️', 'Atacar terra', '', 'T', () => setGroundMode(true), true);
      g.title = 'Atacar el terra (T): el mangonell dispara a un punt, encara que no hi hagi ningú';
      actionsEl.appendChild(g);
    }
    const tre = mil.filter(u => u.packable);
    if (tre.length) {
      const g = makeActionButton('🏗️', tre[0].packTo === false || !tre[0].packed ? 'Desmuntar' : 'Muntar', tre[0].packT > 0 ? 'treballant…' : '', 'G', () => { togglePack(tre); updateSelectionUI(); }, true);
      g.title = 'Muntar / desmuntar el trabuc (G): muntat pot disparar, desmuntat es pot moure. Triga uns segons';
      actionsEl.appendChild(g);
    }
    const relicMonks = mil.filter(u => u.relic);
    if (relicMonks.length) {
      const d = makeActionButton('🏺', 'Deixar', 'relíquia', '', () => { relicMonks.forEach(unitDropRelic); updateSelectionUI(); }, true);
      d.title = 'Deixa la relíquia a terra. Clic dret sobre un Monestir teu per guardar-la (+0,5 d\'or/s)';
      actionsEl.appendChild(d);
    }
    if (mil.every(isMonk)) {
      const h = document.createElement('div');
      h.className = 'action-hint';
      h.innerHTML = '<kbd>clic dret</kbd> enemic: convertir · ferit propi: curar · relíquia: recollir';
      actionsEl.appendChild(h);
    }
    const carriers = mil.filter(u => u.garrison && u.garrison.length);
    if (carriers.length) actionsEl.appendChild(makeActionButton('🚪', 'Sortir', `${carriers[0].garrison.length}`, 'U', () => carriers.forEach(c => ungarrison(c)), true));
    for (const [k, st] of Object.entries(STANCES)) {
      if (!mil.some(u => u.isMilitary)) break;
      const b = makeActionButton(st.icon, st.name, cur === k ? '● activa' : '', keysSt[k], () => setStance(mil.filter(u => u.isMilitary), k), true);
      b.title = `Postura ${st.name} (${keysSt[k]}): ${st.desc}`;
      if (cur === k) b.style.boxShadow = '0 0 0 2px var(--gold) inset, 0 0 12px rgba(216,178,90,0.5)';
      actionsEl.appendChild(b);
    }
    // Formacions de batalla (grups de 2 o més)
    const fg = mil.filter(u => u.isMilitary || u.category === 'monk');
    if (fg.length > 1) {
      const curF = groupFormation(fg);
      for (const k of FORMATION_ORDER) {
        const F = FORMATIONS[k];
        const b = makeActionButton(F.icon, F.name, curF === k ? '● activa' : 'formació', curF === k ? '' : (FORMATION_ORDER[(FORMATION_ORDER.indexOf(curF) + 1) % 4] === k ? 'F' : ''), () => setFormation(fg, k), true);
        b.title = `Formació ${F.name} (F: canviar)\n${F.desc}`;
        if (curF === k) b.style.boxShadow = '0 0 0 2px var(--gold) inset, 0 0 12px rgba(216,178,90,0.5)';
        actionsEl.appendChild(b);
      }
    }
  } else if (first.kind === 'unit' && first.isOwn) {
    // Menú de construcció de l'aldeà
    actionsEl.classList.add('compact');
    const stop = makeActionButton('✋', 'Aturar', 'X', '', () => { commandStop(state.selected.filter(s => s.kind === 'unit')); updateSelectionUI(); }, true);
    stop.title = "Aturar (X): cancel·la l'ordre actual.\nClic dret: moure / recol·lectar / descarregar / construir.\nShift + clic dret: encadenar ordres.";
    actionsEl.appendChild(stop);
    // Pàgines del menú de construcció: Economia · Militar · Defensa (Tab per passar de pàgina)
    const PAGES = [['🏠', 'Economia'], ['⚔️', 'Militar'], ['🏰', 'Defensa']];
    PAGES.forEach(([ico, name], i) => {
      const pb = makeActionButton(ico, name, i === buildPage ? '● pàgina' : `pàgina ${i + 1}`, i === (buildPage + 1) % 3 ? 'Tab' : '', () => { buildPage = i; updateSelectionUI(); }, true);
      pb.title = `Menú de construcció: ${name} (Tab: pàgina següent)`;
      if (i === buildPage) pb.style.boxShadow = '0 0 0 2px var(--gold) inset, 0 0 12px rgba(216,178,90,0.5)';
      actionsEl.appendChild(pb);
    });
    for (const [type, def] of Object.entries(CONFIG.BUILDINGS)) {
      if ((def.page || 0) !== buildPage) continue;
      const locked = (def.age || 0) > PLAYER.age;
      const hk = Object.entries(CONFIG.BUILD_KEYS).find(([, t]) => t === type);
      const btn = makeActionButton(locked ? '🔒' : def.icon, def.short, costHTML(costFor(type)), hk ? hk[0].slice(3) : '', () => startPlacement(type), true);
      btn.dataset.build = type;
      btn.title = `${def.name} — ${costText(costFor(type))} · ${def.time}s\n${def.desc}${locked ? `\nRequereix: ${CONFIG.AGES[def.age].name}` : ''}\nClic esquerre: col·locar · Shift: col·locar-ne més · Clic dret/Esc: cancel·lar`;
      actionsEl.appendChild(btn);
    }
  } else if (first.kind === 'building' && first.isOwn) {
    actionsEl.classList.add('compact');
    const btn = makeActionButton('🗑️', 'Enderrocar', first.underConstruction && first.progress < 0.02 ? 'retorna cost' : 'Supr', '', () => demolishBuilding(first), true);
    actionsEl.appendChild(btn);
    if (garrisonCap(first) > 0 && !first.underConstruction) {
      const n = first.garrison ? first.garrison.length : 0;
      const g = makeActionButton('🚪', n ? 'Fer sortir' : 'Refugi', `${n}/${garrisonCap(first)} dins`, 'U', () => ungarrison(first), true);
      g.title = 'Unitats refugiades (cada una afegeix una fletxa). Clic dret amb tropes seleccionades per fer-les entrar. U: fer-les sortir';
      g.disabled = !n;
      actionsEl.appendChild(g);
    }
    const hint = document.createElement('div');
    hint.className = 'action-hint';
    hint.innerHTML = first.underConstruction
      ? 'Selecciona aldeans i fes<br><kbd>clic dret</kbd> al fonament<br>per ajudar a construir.'
      : (first.dropoffTypes ? `Els aldeans hi poden<br>descarregar ${first.dropoffTypes.map(t => RES_ICON[t]).join(' ')}.` : first.def.desc);
    actionsEl.appendChild(hint);
  } else if (first.team && !first.isOwn) {
    actionsEl.innerHTML = `<div class="action-hint">${first.kind === 'unit' ? 'Unitat' : 'Edifici'} de l'<b style="color:#ff8a7a">${teamOf(first.team).name}</b>.<br>Selecciona unitats i fes <kbd>clic dret</kbd><br>per atacar-lo.</div>`;
  } else if (first.kind === 'relic') {
    actionsEl.innerHTML = `<div class="action-hint">Relíquia sagrada. Només els <b>monjos</b> la poden portar.<br>Guardada en un <b>Monestir</b> dona +0,5 d'or per segon.${state.victory === 'standard' ? '<br>Qui tingui <b>totes</b> les relíquies uns minuts guanya.' : ''}</div>`;
  } else if (first.kind === 'resource' && first.subtype === 'farm') {
    actionsEl.innerHTML = `<div class="action-hint">Granja: ${first.amount} d'aliment.<br>Un sol granger hi pot treballar.<br>Descarrega al Molí o al Centre.</div>`;
  } else if (first.kind === 'resource') {
    actionsEl.innerHTML = `<div class="action-hint">Recurs natural (${RES_LABEL[first.resourceType]}).<br>Selecciona aldeans i fes <kbd>clic dret</kbd><br>sobre el recurs per recol·lectar-lo.</div>`;
  }
}

/* Mercat: 100 unitats de recurs per or; cada operació mou el preu */
/* Part del preu que es cobra en vendre (els Sarraïns paguen menys comissió) */
function sellRate(team) { return civOf(team).mods.marketFee || 0.7; }
function marketTrade(team, r, buy) {
  const T = teamOf(team), R = T.res, price = T.prices[r];
  if (buy) {
    if (R.gold < price) { if (team === PLAYER.id) toast(`Cal ${price} d'or per comprar`); return false; }
    R.gold -= price; R[r] += 100;
    T.prices[r] = Math.min(400, price + 6);
  } else {
    if (R[r] < 100) { if (team === PLAYER.id) toast(`Cal tenir 100 de ${RES_LABEL[r].toLowerCase()} per vendre`); return false; }
    R[r] -= 100; R.gold += Math.floor(price * sellRate(team));
    T.prices[r] = Math.max(25, price - 6);
  }
  if (team === PLAYER.id) { updateResourcesUI(); updateSelectionUI(); }
  return true;
}

/* Llista d'unitats i tecnologies que ofereix un edifici */
function buildingItems(b) {
  const out = [];
  const civ = teamOf(b.team).civ;
  if (b.subtype === 'towncenter') out.push('villager');
  if (b.def && b.def.trains) for (const k of b.def.trains) out.push(k === '@unique' ? uniqueUnitOf(b.team) : currentKind(b.team, k));
  for (const [k, d] of Object.entries(CONFIG.TECHS)) if (d.at === b.subtype && (!d.civ || d.civ === civ)) out.push(k);
  return out;
}

/* Cost compacte per als botons petits: punt de color del recurs + quantitat */
function costHTML(cost) {
  const e = Object.entries(cost).filter(([, v]) => v > 0);
  if (!e.length) return 'gratis';
  const fmt = (v) => v >= 1000 ? (v % 1000 ? (v / 1000).toFixed(1) : v / 1000) + 'k' : v;
  return e.map(([k, v]) => `<span class="cc"><i class="rd ${k}"></i>${fmt(v)}</span>`).join('');
}
/* Etiquetes curtes i inequívoques per als botons (el nom sencer surt al consell) */
const SHORT = {
  manatarms: 'Home armes', twohanded: 'Dues mans', skirmisher: 'Escaramus.', eliteskirm: 'Escar. elit', cavarcher: 'Arq. cavall',
  heavycavarcher: 'Arq. cav. P.', lightcav: 'Genet lleu.', cavalier: 'Cav. pesant', camel: 'Camell', heavycamel: 'Camell P.',
  cappedram: 'Ariet ref.', siegeram: 'Ariet setge', heavyscorpion: 'Escorpí P.', bombard: 'Canó', tradecart: 'Carro',
  throwingaxe: 'Destraler', trebuchet: 'Trabuc', knight: 'Cavaller',
  age1: 'Feudal', age2: 'Castells', age3: 'Imperial', handcart: 'Carro mà', doublebit: 'Doble fil', goldmining: 'Mineria',
  reseed: 'Resembra', horsecollar: 'Collar', bowsaw: 'Serra', twomansaw: 'Serra 2', goldshaft: "Pou d'or", stoneshaft: 'Pedrera',
  heavyplow: 'Arada', croprotation: 'Rotació', scalearmor: 'Escates', paddedarcher: 'Encoixin.', ironcasting: 'Fosa ferro',
  blastfurnace: 'Alt forn', bodkin: 'Punta perf.', chainmail: 'Cota malla', platemail: 'Plaques', chainbarding: 'Bardissa M.',
  leatherarcher: 'Cuir', ringarcher: 'Anelles', architecture: 'Arquitect.', treadmill: 'Grua', guardtower: 'Torre guàrd.',
  keep: 'Torrassa', siegeengineers: 'Enginyers', beardedaxe: 'Destral B.', illumination: 'Il·lumin.', blockprinting: 'Impremta',
  elite_throwingaxe: 'Elit', elite_mameluke: 'Elit', elite_samurai: 'Elit',
};
function shortLabel(kind) {
  const d = itemDef(kind);
  if (SHORT[kind]) return SHORT[kind];
  if (d && d.upgradeTo) return SHORT[d.upgradeTo] || CONFIG.UNITS[d.upgradeTo].name;
  return d.name.length > 11 ? d.name.split(' ')[0] : d.name;
}
function makeActionButton(icon, label, cost, hotkey, onClick, small = false) {
  const btn = document.createElement('button');
  btn.className = 'action-btn' + (small ? ' small' : '');
  btn.innerHTML = `${hotkey ? `<span class="hk">${hotkey}</span>` : ''}<span class="big">${icon}</span><span class="lbl">${label}</span><span class="cost">${cost}</span>`;
  btn.addEventListener('click', (e) => { e.preventDefault(); onClick(); btn.blur(); });
  return btn;
}

function onSelectionChanged() {
  if (placing.type && !builders().length) cancelPlacement();
  updateSelectionUI();
}

/* Actualització contínua de la barra d'entrenament i de l'estat del botó */
function updateTrainingUI() {
  // Botons de construcció: en vermell si no es poden pagar o falta un requisit
  actionsEl.querySelectorAll('[data-build]').forEach(btn => btn.classList.toggle('cant', !!buildBlockReason(btn.dataset.build)));
  actionsEl.querySelectorAll('[data-item]').forEach(btn => btn.classList.toggle('cant', !!itemBlockReason(btn.dataset.item)));
  const b = state.selected.length === 1 ? state.selected[0] : null;
  if (!b || !b.trainQueue || !b.isOwn) return;
  const prog = document.querySelector('#train-queue .q-prog');
  const status = document.getElementById('train-status');
  const item = b.trainQueue[0];
  if (item) {
    const idef = itemDef(item.kind);
    const f = Math.min(1, item.t / idef.time);
    if (prog) prog.style.width = (f * 100) + '%';
    if (status) status.innerHTML = item.blocked
      ? '<b>🏠 Població plena: calen cases</b>'
      : `${isTech(item.kind) ? 'Investigant' : 'Entrenant'} ${idef.name.toLowerCase()}… <b>${Math.floor(f * 100)}%</b> · ${Math.ceil(idef.time - item.t)}s`;
  } else if (status) status.textContent = '';
  actionsEl.querySelectorAll('[data-item]').forEach(btn => btn.classList.toggle('cant', !!itemBlockReason(btn.dataset.item)));
}
// Delegació: clic sobre un element de la cua = cancel·lar-lo
selContent.addEventListener('click', (e) => {
  const q = e.target.closest('.q-item');
  if (!q) return;
  const b = state.selected[0];
  if (b && b.trainQueue) cancelQueued(b, Number(q.dataset.idx));
});

document.getElementById('help-toggle').addEventListener('click', () => {
  const help = document.getElementById('help');
  help.classList.toggle('collapsed');
  document.getElementById('help-toggle').textContent = help.classList.contains('collapsed') ? 'mostrar ▼' : 'amagar ▲';
});
