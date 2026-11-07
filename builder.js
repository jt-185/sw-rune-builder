// ===== 符文配置：照遊戲內 Manage 畫面做的配裝工具 =====
// 畫面以 iPhone 16 Pro 橫向（874×402，扣掉安全區域約 750×382）為設計基準，版面和操作比照遊戲：
//   上排魔靈 / 六角槽位（可複選）/ 套裝視窗 / Before→After 固定六角位置 / Apply 確認視窗 / 長按看符文卡。
// 手機（mobile/）和網站分頁共用這一份，網站只是把同一個畫面等比放大。
//
// 「Apply」＝存成這隻魔靈的配置；存過之後，這份配置就是牠在工具裡的 Before 與綠字，比照遊戲裡裝上去的樣子。
// 真正身上的裝備來自最後一次 SWEX 匯出，「存檔清單」會拿存檔和它比對，列出開遊戲時要換哪些。
// 存檔放在 localStorage（依帳號分開）。本檔在主程式之前載入，只宣告函式。

const BLD_KEY = 'sw-tool:builds';
const BLD_W = 750, BLD_H = 382;       // 設計尺寸
const BLD_PAGE = 240;                 // 格子一次畫幾個
const BLD_STAT_KEY = {1:'hp_f',2:'hp_p',3:'atk_f',4:'atk_p',5:'def_f',6:'def_p',8:'spd',9:'cr',10:'cd',11:'res',12:'acc'};
const BLD_OPT = {1:'HP +',2:'HP %',3:'ATK +',4:'ATK %',5:'DEF +',6:'DEF %',8:'SPD',9:'CRI Rate',10:'CRI Dmg',11:'Resistance',12:'Accuracy'};
const BLD_NAME = {1:'HP',2:'HP',3:'ATK',4:'ATK',5:'DEF',6:'DEF',8:'SPD',9:'CRI Rate',10:'CRI Dmg',11:'Resistance',12:'Accuracy'};
const BLD_POP_IDS = ['',8,1,2,3,4,5,6,9,10,11,12];      // 遊戲下拉選單的排列
const BLD_SLOT_MAIN = {1:[3],2:[8,1,2,3,4,5,6],3:[5],4:[1,2,3,4,5,6,9,10],5:[1],6:[1,2,3,4,5,6,11,12]};
const BLD_INNATE_ID = {'HP':1,'HP%':2,'ATK':3,'ATK%':4,'DEF':5,'DEF%':6,'SPD':8,'爆率':9,'爆傷':10,'抵抗':11,'命中':12};
const BLD_GRID = [6,1,2,5,4,3];                          // Before/After 的六格＝遊戲裡的六角位置
const BLD_PANEL = [['hp','HP'],['atk','ATK'],['def','DEF'],['spd','SPD'],
                   ['cr','CRI Rate'],['cd','CRI Dmg'],['res','Resistance'],['acc','Accuracy']];
const BLD_SORT = [['grade','Grade'],['sub','Sub Property'],['subraw','Sub Property Before Grinding'],['lv','Power-up Lv.'],
                  ['obtained','Obtained'],['subsum','Sub Property Sum'],['score','Score'],['eff','Efficiency']];
const BLD_ART_SORT = [['grade','Grade'],['sub','Sub Property'],['lv','Power-up Lv.'],['obtained','Obtained'],['dmg','Damage Score'],['tank','Tank Score']];
const BLD_Q = {'傳說':[5,'Legend'],'英雄':[4,'Hero'],'稀有':[3,'Rare'],'魔法':[2,'Magic'],'普通':[1,'Normal']};
const BLD_SET_FX = {1:'HP +15%',2:'DEF +15%',3:'SPD +25%',4:'CRI Rate +12%',5:'CRI Dmg +40%',6:'Accuracy +20%',7:'Resistance +20%',8:'ATK +35%'};
const BLD_ATTR_EN = {'水':'Water','火':'Fire','風':'Wind','光':'Light','暗':'Dark'};
const BLD_ARCH_EN = {'攻擊型':'Attack','防禦型':'Defense','體力型':'HP','輔助型':'Support'};
// 魔礦副屬性：[篩選用名稱, 分類]。名稱比照遊戲，沒在錄影裡出現的依 SWEX mapping.js 改寫
const BLD_ART = {200:['ATK+ as HP lost','General'],201:['DEF+ as HP lost','General'],202:['SPD+ as HP lost','General'],
  203:['SPD under Inability +','General'],204:['ATK Increasing Effect +','General'],205:['DEF Increasing Effect +','General'],
  206:['SPD Increasing Effect +','General'],207:['CRI Rate Increasing Effect +','General'],208:['Counterattack DMG +','General'],
  209:['Co-op Attack DMG +','General'],210:['Bomb DMG +','General'],211:['Reflected DMG +','General'],212:['Crushing Hit DMG +','General'],
  213:['DMG taken under Inability -','General'],214:['CRIT DMG taken -','General'],215:['Life Drain +','General'],
  216:['HP when Revived +','General'],217:['Attack Bar when Revived +','General'],218:["Add'l DMG by HP",'General'],
  219:["Add'l DMG by ATK",'General'],220:["Add'l DMG by DEF",'General'],221:["Add'l DMG by SPD",'General'],
  222:['CD+ as more enemy HP','General'],223:['CD+ as less enemy HP','General'],224:['Own Turn 1-target CD+','General'],
  225:['Counter/Co-op DMG +','General'],226:['ATK/DEF UP Effect +','General'],
  300:['DMG dealt on Fire +','Attribute'],301:['DMG dealt on Water +','Attribute'],302:['DMG dealt on Wind +','Attribute'],
  303:['DMG dealt on Light +','Attribute'],304:['DMG dealt on Dark +','Attribute'],305:['DMG taken from Fire -','Attribute'],
  306:['DMG taken from Water -','Attribute'],307:['DMG taken from Wind -','Attribute'],308:['DMG taken from Light -','Attribute'],
  309:['DMG taken from Dark -','Attribute'],
  400:['[Skill 1] CRIT DMG +','Skill'],401:['[Skill 2] CRIT DMG +','Skill'],402:['[Skill 3] CRIT DMG +','Skill'],403:['[Skill 4] CRIT DMG +','Skill'],
  404:['[Skill 1] Recovery +','Skill'],405:['[Skill 2] Recovery +','Skill'],406:['[Skill 3] Recovery +','Skill'],
  407:['[Skill 1] Accuracy +','Skill'],408:['[Skill 2] Accuracy +','Skill'],409:['[Skill 3] Accuracy +','Skill'],
  410:['[Skill 3/4] CRIT DMG +','Skill'],411:['First Attack CRIT DMG +','Skill']};

const bldNewSubs = () => [0,1,2,3].map(() => ({s:'', min:''}));
const bldRuneFilter = () => ({sets:[], multi:false, slots:[], main:'', subs:bldNewSubs(), subPage:0, sort:'score', dir:-1,
  stars:'', ancient:'', q:'', minLv:'', minScore:'', minEff:'', innate:'', mod:'', loc:'', owner:'',
  hideUsed:false, hideLocked:false, showSold:false, showVal:false});
const bldArtFilter = () => ({cat:'屬性', fit:true, main:'', subs:bldNewSubs(), subPage:0, sort:'dmg', dir:-1,
  loc:'', owner:'', hideUsed:false, hideLocked:false, showVal:false});

let BLD = {view:'edit', mode:'rune', uid:null, work:null, f:bldRuneFilter(), af:bldArtFilter(), limit:BLD_PAGE, dataRef:null,
  effOpen:false, card:null, overlay:null, press:null, skipClick:false, restored:false,
  mon:{q:'', attr:'', arch:'', saved:false, limit:150}, hideDone:false};
let BLD_C = {data:null, plansKey:null, plans:{}, used:null, owner:null, sets:null, invCount:null, recent:null};

// ---------- 小工具 ----------
const bldEsc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// 手機版的圖示放在資料檔裡（window.BLD_ICONS），網站版直接讀 img/
const bldImg = f => (window.BLD_ICONS && BLD_ICONS[f]) || `img/monsters/${encodeURIComponent(f||'')}`;
const bldSetImg = en => { const k = String(en||'').toLowerCase() + '.png'; return (window.BLD_ICONS && BLD_ICONS['rune:'+k]) || `img/runes/${k}`; };
const bldPhone = () => document.body.classList.contains('swm');
const bldNow = () => new Date().toLocaleString('zh-Hant', {hour12:false});
const bldFilter = () => BLD.mode === 'rune' ? BLD.f : BLD.af;
const bldEl = id => document.getElementById(id);
function bldToast(msg, bad){
  let t = bldEl('bld-toast');
  if(!t){ t = document.createElement('div'); t.id = 'bld-toast'; document.body.appendChild(t); }
  t.textContent = msg; t.className = bad ? 'on bad' : 'on';
  clearTimeout(bldToast.timer);
  bldToast.timer = setTimeout(() => { t.className = ''; }, 2600);
}
// 六個符文位的形狀：同一個五邊形，每個槽位轉 60 度（1 朝上，順時針到 6）
const BLD_KITE = [[0,-1],[.84,-.3],[.62,.72],[-.62,.72],[-.84,-.3]];
function bldKitePts(slot, cx, cy, r){
  const a = (slot-1)*Math.PI/3, c = Math.cos(a), s = Math.sin(a);
  return BLD_KITE.map(([x,y]) => [cx + r*(x*c - y*s), cy + r*(x*s + y*c)]);
}
(function bldInjectShapes(){
  const clip = (slot, r) => `polygon(${bldKitePts(slot,50,50,r).map(([x,y]) => `${x.toFixed(1)}% ${y.toFixed(1)}%`).join(',')})`;
  let css = '';
  for(let i=1;i<=6;i++) css += `.rn.s${i}::before{clip-path:${clip(i,50)}}.rn.s${i}::after{clip-path:${clip(i,43)}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();

// ---------- 資料索引（換帳號 = DATA 換物件，整組重建）----------
function bldSync(){
  if(BLD.dataRef === DATA) return;
  BLD.dataRef = DATA; BLD.uid = null; BLD.work = null; BLD.limit = BLD_PAGE; BLD.card = null; BLD.overlay = null;
  BLD_C = {data:DATA, plansKey:null, plans:{}, used:null, owner:null, sets:null, invCount:null, recent:null};
}
function bldOwnerMap(){
  if(BLD_C.owner) return BLD_C.owner;
  const o = {};
  DATA.monsters.forEach(m => {
    (m.runeIds||[]).forEach(id => { o['r'+id] = m; });
    (m.artIds||[]).forEach(id => { o['a'+id] = m; });
  });
  return BLD_C.owner = o;
}
const bldMonById = uid => DATA.monsters.find(m => m.uid === uid);
const bldMon = () => BLD.uid ? bldMonById(BLD.uid) : null;
// 套裝視窗上的紅色數字＝該套裝還在倉庫裡的顆數（和遊戲實際比對過 23 種全部吻合）
function bldSets(){
  if(BLD_C.sets) return BLD_C.sets;
  const by = {};
  DATA.runes.forEach(r => {
    const s = by[r.setId] = by[r.setId] || {id:r.setId, name:r.set, en:r.setEn, pieces:r.pieces, inv:0};
    if(!r.owner) s.inv++;
  });
  return BLD_C.sets = Object.values(by).sort((a,b) => a.id-b.id);
}
function bldCurrent(m){
  const c = {runes:{1:null,2:null,3:null,4:null,5:null,6:null}, arts:[null,null]};
  (m.runeIds||[]).forEach(id => { const r = runeById(id); if(r) c.runes[r.slot] = id; });
  (m.artIds||[]).forEach(id => { const a = artById(id); if(a) c.arts[a.cat === '屬性' ? 0 : 1] = id; });
  return c;
}
const bldCopy = l => ({runes:{...l.runes}, arts:[...l.arts]});
function bldSame(a, b){
  return [1,2,3,4,5,6].every(s => (a.runes[s]||null) === (b.runes[s]||null)) &&
         [0,1].every(i => (a.arts[i]||null) === (b.arts[i]||null));
}
// Before：存過的配置，沒存過就是身上的裝備
function bldBase(m){
  const p = bldPlans()[m.uid];
  return p ? bldCopy({runes:p.runes, arts:p.arts||[null,null]}) : bldCurrent(m);
}
const bldDirty = m => !!(m && BLD.work) && !bldSame(BLD.work, bldBase(m));

// ---------- 存檔 ----------
function bldKey(){ return ACCT.path && ACCT.path !== ACCT.builtinPath ? BLD_KEY + ':' + ACCT.path : BLD_KEY; }
function bldPlans(){
  const k = bldKey();
  if(BLD_C.plansKey === k) return BLD_C.plans;
  BLD_C.plansKey = k; BLD_C.plans = {}; BLD_C.used = null; BLD_C.recent = null;
  try { BLD_C.plans = JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch(e) {}
  return BLD_C.plans;
}
function bldPersist(){
  BLD_C.used = null;
  try { localStorage.setItem(bldKey(), JSON.stringify(BLD_C.plans)); return true; }
  catch(e){ bldToast('存檔失敗：瀏覽器無法寫入（' + e.message + '）', true); return false; }
}
function bldUsed(){
  bldPlans();
  if(BLD_C.used) return BLD_C.used;
  const u = {};
  const add = (k, p, slot) => { (u[k] = u[k] || []).push({uid:p.uid, name:p.name, label:p.label, img:p.img, slot}); };
  Object.values(BLD_C.plans).forEach(p => {
    [1,2,3,4,5,6].forEach(s => { if(p.runes[s]) add('r'+p.runes[s], p, s); });
    (p.arts||[]).forEach((id,i) => { if(id) add('a'+id, p, i); });
  });
  return BLD_C.used = u;
}
const bldOthers = (key, uid) => (bldUsed()[key]||[]).filter(x => x.uid !== uid);
function bldRecent(){
  if(BLD_C.recent) return BLD_C.recent;
  let r = [];
  try { r = JSON.parse(localStorage.getItem(bldKey()+':recent') || '[]'); } catch(e) {}
  r = r.filter(uid => bldMonById(uid));
  Object.keys(bldPlans()).forEach(k => { if(r.length < 5 && !r.includes(+k) && bldMonById(+k)) r.push(+k); });
  return BLD_C.recent = r.slice(0,5);
}
function bldTouch(uid){
  const r = bldRecent();
  if(!r.includes(uid)){ r.unshift(uid); r.length = Math.min(r.length, 5); }
  try { localStorage.setItem(bldKey()+':recent', JSON.stringify(r)); } catch(e) {}
}
function bldLoad(uid){
  const m = bldMonById(uid); if(!m) return;
  BLD.uid = uid; BLD.work = bldBase(m); BLD.card = null; BLD.effOpen = false;
  bldTouch(uid);
  try { localStorage.setItem(bldKey()+':last', String(uid)); } catch(e) {}
}
function bldSave(){
  const m = bldMon(); if(!m) return false;
  const w = BLD.work;
  if(![1,2,3,4,5,6].some(s => w.runes[s]) && !w.arts.some(Boolean)){ bldToast('這份配置是空的，沒有東西可以存', true); return false; }
  const plans = bldPlans(), old = plans[m.uid];
  plans[m.uid] = {uid:m.uid, name:m.name, label:m.label, img:m.img, runes:{...w.runes}, arts:[...w.arts],
                  done:old ? old.done || {} : {}, savedAt:bldNow()};
  if(!bldPersist()) return false;
  const n = bldConflicts(m.uid).length;
  bldToast(n ? `已儲存（有 ${n} 項和其他存檔重複）` : '已儲存');
  return true;
}
function bldConflicts(uid){
  const w = uid === BLD.uid && BLD.work ? BLD.work : bldPlans()[uid];
  if(!w) return [];
  const out = [];
  [1,2,3,4,5,6].forEach(s => {
    const id = w.runes[s]; if(!id) return;
    const o = bldOthers('r'+id, uid);
    if(o.length){ const r = runeById(id); out.push({label: r ? `${r.setEn} (${s})` : `(${s})`, others:o}); }
  });
  (w.arts||[]).forEach((id,i) => {
    if(!id) return;
    const o = bldOthers('a'+id, uid);
    if(o.length) out.push({label: i ? 'Type Artifact' : 'Attribute Artifact', others:o});
  });
  return out;
}

// ---------- 面板數值（game_mechanics.json「面板數值計算」，百分比無條件進位）----------
// 套裝的百分比要和符文、文物分開進位：Deragron（文物 ATK+13%、猛攻）遊戲顯示 +2539，合併進位只有 +2538
function bldCalc(m, load){
  const acc = {hp_f:0,hp_p:0,atk_f:0,atk_p:0,def_f:0,def_p:0,spd:0,spd_p:0,cr:0,cd:0,res:0,acc:0};
  const count = {}, set = {hp_p:0, atk_p:0, def_p:0, spd_p:0};
  [1,2,3,4,5,6].forEach(s => {
    const r = load.runes[s] ? runeById(load.runes[s]) : null; if(!r) return;
    Object.entries(r.contrib||{}).forEach(([k,v]) => { if(k in acc) acc[k] += v; });
    (count[r.setId] = count[r.setId] || {n:0, r}).n++;
  });
  const sets = [];
  Object.entries(count).forEach(([sid,{n,r}]) => {
    const need = r.pieces || 2, times = Math.floor(n/need), sb = DATA.setBonus[sid];
    if(sb && times){ if(sb[0] in set) set[sb[0]] += sb[1]*times; else acc[sb[0]] += sb[1]*times; }
    sets.push({name:r.set, en:r.setEn, n, need, on:times>0, times});
  });
  load.arts.forEach(id => { const a = id ? artById(id) : null; if(a && a.mainKey) acc[a.mainKey] += a.mainVal; });
  const b = m.base, rp = b.rp || {};
  return {sets: sets.sort((x,y) => y.on-x.on || y.n-x.n), add:{
    hp:  pctUp(b.hp,  acc.hp_p  + (rp.hp||0))  + pctUp(b.hp,  set.hp_p)  + acc.hp_f,
    atk: pctUp(b.atk, acc.atk_p + (rp.atk||0)) + pctUp(b.atk, set.atk_p) + acc.atk_f,
    def: pctUp(b.def, acc.def_p + (rp.def||0)) + pctUp(b.def, set.def_p) + acc.def_f,
    spd: pctUp(b.spd, set.spd_p) + acc.spd,
    cr: acc.cr, cd: acc.cd, res: acc.res, acc: acc.acc}};
}
function bldDelta(d){
  if(!d) return '';
  return d > 0 ? `<span class="up">▲${d}</span>` : `<span class="dn">▼${-d}</span>`;
}

// ---------- 篩選 ----------
const bldSubIds = f => f.subs.filter(x => x.s).map(x => +x.s);
function bldRuneVal(r, key, f){
  const ids = bldSubIds(f);
  switch(key){
    case 'score': return r.score;
    case 'eff': return r.eff;
    case 'lv': return r.lv;
    case 'obtained': return r.id;
    case 'grade': return r.stars*1000 + (BLD_Q[r.q]||[0])[0]*100 + r.lv;
    case 'sub': return ids.length ? (r.statv||{})[ids[0]] || 0 : r.score;
    case 'subraw': return ids.length ? (r.rawByStat||{})[ids[0]] || 0 : r.score;
    case 'subsum':     // 遊戲的算法沒有公開，用選中條件以外再加總百分比類副屬性當近似值
      return Object.entries(r.statv||{}).reduce((n,[k,v]) => n + ([1,3,5].includes(+k) ? 0 : v), 0);
  }
  return 0;
}
function bldRuneList(){
  const f = BLD.f, m = bldMon(), own = bldOwnerMap();
  const subs = f.subs.filter(x => x.s);
  const minLv = +f.minLv||0, minScore = +f.minScore||0, minEff = +f.minEff||0;
  const ownerQ = f.owner.trim().toLowerCase();
  const list = DATA.runes.filter(r => {
    if(f.sets.length && !f.sets.includes(r.setId)) return false;
    if(f.slots.length && !f.slots.includes(r.slot)) return false;
    if(f.main && r.mainId !== +f.main) return false;
    for(const x of subs){
      const v = (r.statv||{})[x.s] || 0;
      if(!v || v < (+x.min||0)) return false;
    }
    if(f.stars && r.stars !== +f.stars) return false;
    if(f.ancient && r.ancient !== (f.ancient === 'yes')) return false;
    if(f.q && r.q !== f.q) return false;
    if(r.lv < minLv || r.score < minScore || r.eff < minEff) return false;
    if(f.innate === 'none' && r.innate) return false;
    if(f.innate === 'any' && !r.innate) return false;
    if(+f.innate && BLD_INNATE_ID[(r.innate||'').split(' ')[0]] !== +f.innate) return false;
    if(f.mod){
      const sub = r.sub2 || [], grind = sub.some(x => x.g), gem = sub.some(x => x.gem);
      if((f.mod === 'grind' && !grind) || (f.mod === 'nogrind' && grind) ||
         (f.mod === 'gem' && !gem) || (f.mod === 'nogem' && gem)) return false;
    }
    if(f.loc === 'inv' && r.owner) return false;
    if(f.loc === 'eq' && !r.owner) return false;
    if(f.loc === 'self' && own['r'+r.id] !== m) return false;
    if(ownerQ && !(r.owner + r.ownerLabel).toLowerCase().includes(ownerQ)) return false;
    if(f.hideUsed && bldOthers('r'+r.id, BLD.uid).length) return false;
    if(f.hideLocked && r.locked) return false;
    if(!f.showSold && DELETED.has(r.id)) return false;
    return true;
  });
  const val = new Map(list.map(r => [r.id, bldRuneVal(r, f.sort, f)]));
  return list.sort((a,b) => (val.get(a.id)-val.get(b.id))*f.dir || b.score-a.score);
}
const bldArtSub = (a, sid) => (a.subs.find(s => s.sid === sid) || {}).val || 0;
function bldArtVal(a, key, f){
  const ids = bldSubIds(f);
  switch(key){
    case 'sub': return ids.length ? bldArtSub(a, ids[0]) : a.dmg;
    case 'grade': return (BLD_Q[a.natRank]||[0])[0]*100 + a.lv;
    case 'obtained': return a.id;
  }
  return a[key] || 0;
}
const bldArtFits = (a, m) => !a.target || a.target === (a.cat === '屬性' ? m.attr : m.arch);
function bldArtList(){
  const f = BLD.af, m = bldMon(), own = bldOwnerMap();
  const subs = f.subs.filter(x => x.s);
  const ownerQ = f.owner.trim().toLowerCase();
  const list = DATA.artifacts.filter(a => {
    if(f.cat && a.cat !== f.cat) return false;
    if(f.fit && m && !bldArtFits(a, m)) return false;
    if(f.main && a.mainKey !== f.main) return false;
    for(const x of subs){
      const v = bldArtSub(a, +x.s);
      if(!v || v < (+x.min||0)) return false;
    }
    if(f.loc === 'inv' && a.owner) return false;
    if(f.loc === 'eq' && !a.owner) return false;
    if(f.loc === 'self' && own['a'+a.id] !== m) return false;
    if(ownerQ && !(a.owner + a.ownerLabel).toLowerCase().includes(ownerQ)) return false;
    if(f.hideUsed && bldOthers('a'+a.id, BLD.uid).length) return false;
    if(f.hideLocked && a.locked) return false;
    return true;
  });
  const val = new Map(list.map(a => [a.id, bldArtVal(a, f.sort, f)]));
  return list.sort((a,b) => (val.get(a.id)-val.get(b.id))*f.dir || b.dmg-a.dmg);
}

// ---------- 符文、魔礦的圖 ----------
const bldRune = (r, slot) => `<span class="rn s${slot}${r && r.ancient ? ' anc' : ''}">${r ? `<img src="${bldSetImg(r.setEn)}" alt="">` : ''}</span>`;
const bldArtIcon = a => `<svg class="am" viewBox="0 0 40 40"><use href="#am-${(BLD_Q[a.natRank]||[4])[0]}"/></svg>`;
const BLD_ART_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  ${[[3,'#7fd4ff','#2a7fc4','#7c8fa8'],[4,'#d9a6ff','#7a3fc0','#c98a2e'],[5,'#ffe08a','#e0641e','#d9902e']].map(([k,a,b,ring]) => `
  <radialGradient id="ag${k}" cx=".45" cy=".4" r=".62"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>
  <symbol id="am-${k}" viewBox="0 0 40 40">
    <polygon points="20,3 37,15.5 30.5,36 9.5,36 3,15.5" fill="#6f4a1a" stroke="${ring}" stroke-width="2.6" stroke-linejoin="round"/>
    <circle cx="20" cy="21" r="11.5" fill="url(#ag${k})" stroke="#f3cf85" stroke-width="1.2"/>
    <path d="M20 13c1 4 5 5 3 9 2-1 2-2 2-3 1 4-2 8-5 8s-6-3-5-7c1 1 1 2 3 2-2-4 1-6 2-9z" fill="#ffffff" opacity=".42"/>
    <polygon points="20,2.5 22.4,5.5 20,8.5 17.6,5.5" fill="${b}" stroke="#f3cf85" stroke-width=".8"/>
  </symbol>`).join('')}
</defs></svg>`;
function bldBadge(key, onThis, ownerImg){
  if(onThis) return '<span class="t-e">E</span>';
  return ownerImg ? `<img class="t-own" src="${bldImg(ownerImg)}" loading="lazy" alt="">` : '';
}
function bldTileRune(r){
  const f = BLD.f, m = bldMon(), w = BLD.work, base = m ? bldBase(m) : null;
  const sel = w && w.runes[r.slot] === r.id && (!base || base.runes[r.slot] !== r.id);
  const onThis = !!m && (bldOwnerMap()['r'+r.id] === m || (base && base.runes[r.slot] === r.id));
  const others = bldOthers('r'+r.id, BLD.uid);
  let tag = '';
  if(f.showVal){
    const v = bldRuneVal(r, f.sort, f);
    tag = f.sort === 'eff' ? `${v.toFixed(1)}%` : f.sort === 'obtained' || f.sort === 'lv' ? '' : String(v);
  }
  return `<div class="t${sel?' sel':''}${others.length?' used':''}" data-act="pick-r" data-id="${r.id}" data-tip="r${r.id}">
    <span class="t-st${r.lv>=15?' max':''}">${'★'.repeat(r.stars)}</span>
    ${bldRune(r, r.slot)}<span class="t-lv">+${r.lv}</span>
    ${bldBadge('r', onThis, r.ownerImg)}
    ${tag ? `<span class="t-val">${tag}</span>` : ''}
    ${others.length ? `<span class="t-plan"><img src="${bldImg(others[0].img)}" loading="lazy" alt=""></span>` : ''}
    ${r.locked ? '<span class="t-lock">🔒</span>' : ''}
  </div>`;
}
function bldTileArt(a){
  const f = BLD.af, m = bldMon(), w = BLD.work, base = m ? bldBase(m) : null, i = a.cat === '屬性' ? 0 : 1;
  const sel = w && w.arts[i] === a.id && (!base || base.arts[i] !== a.id);
  const onThis = !!m && (bldOwnerMap()['a'+a.id] === m || (base && base.arts[i] === a.id));
  const others = bldOthers('a'+a.id, BLD.uid);
  let tag = '';
  if(f.showVal){ const v = bldArtVal(a, f.sort, f); tag = ['obtained','lv','grade'].includes(f.sort) ? '' : String(v); }
  return `<div class="t art${sel?' sel':''}${others.length?' used':''}" data-act="pick-a" data-id="${a.id}" data-tip="a${a.id}">
    ${bldArtIcon(a)}${bldBadge('a', onThis, a.ownerImg)}
    ${tag ? `<span class="t-val">${tag}</span>` : ''}
    ${others.length ? `<span class="t-plan"><img src="${bldImg(others[0].img)}" loading="lazy" alt=""></span>` : ''}
    ${a.locked ? '<span class="t-lock">🔒</span>' : ''}
  </div>`;
}
// Before/After 的小格：符文固定在六角位置，有換的才是橘底
function bldCell(id, slot, side, isNew, m){
  const r = id ? runeById(id) : null;
  if(!r) return '<div class="c empty"></div>';
  const onThis = bldOwnerMap()['r'+id] === m || bldBase(m).runes[slot] === id;
  return `<div class="c${isNew?' sel':''}" data-act="cell" data-side="${side}" data-kind="r" data-slot="${slot}" data-id="${id}">
    <span class="t-st${r.lv>=15?' max':''}">${'★'.repeat(r.stars)}</span>${bldRune(r, slot)}<span class="t-lv">+${r.lv}</span>${bldBadge('r', onThis, r.ownerImg)}</div>`;
}
function bldCellArt(id, i, side, isNew, m){
  const a = id ? artById(id) : null;
  if(!a) return '<div class="c empty"></div>';
  const onThis = bldOwnerMap()['a'+id] === m || bldBase(m).arts[i] === id;
  return `<div class="c art${isNew?' sel':''}" data-act="cell" data-side="${side}" data-kind="a" data-slot="${i}" data-id="${id}">${bldArtIcon(a)}${bldBadge('a', onThis, a.ownerImg)}</div>`;
}

// ---------- 文字 ----------
const bldMainText = r => r.main.replace(/^\S+/, BLD_NAME[r.mainId] || '');
function bldInnateText(r){
  if(!r.innate) return '';
  const [k, v] = r.innate.split(' ');
  return `${BLD_NAME[BLD_INNATE_ID[k]] || k} ${v}`;
}
function bldSubHtml(x){
  const u = x.s===2||x.s===4||x.s===6||x.s>=9 ? '%' : '';
  return `<div class="sb"><span>${BLD_NAME[x.s]||'?'}</span> <b>+${x.v}${u}</b>${x.g?`<i>+${x.g}${u}</i>`:''}${x.gem?'<em>↻</em>':''}</div>`;
}
function bldArtEffect(s){
  const d = BLD_ART[s.sid], label = d ? d[0] : s.name;
  if(s.sid >= 218 && s.sid <= 221) return `Add'l DMG by ${s.val}% of ${label.split(' ').pop()}`;
  if(s.sid === 222 || s.sid === 223 || (s.sid >= 200 && s.sid <= 202)) return `${label}, Max ${s.val}%`;
  const sign = /-$/.test(label) ? '-' : '+';
  return `${label.replace(/\s*[+-]$/, '')} ${sign}${s.val}%`;
}
const bldArtTitle = a => a.cat === '屬性' ? `${BLD_ATTR_EN[a.target]||'All'} Artifact` : `${BLD_ARCH_EN[a.target]||'All'} Artifact`;
const bldEffects = load => load.arts.map(id => id ? artById(id) : null).filter(Boolean).flatMap(a => a.subs.map(bldArtEffect));

// ---------- 左側 ----------
function bldStripHtml(){
  // 遊戲上排是前後的魔靈；這裡放最近用過的，不足 5 隻用清單前面的補滿
  const rec = bldRecent().map(bldMonById).filter(Boolean);
  for(const c of DATA.monsters){ if(rec.length >= 5) break; if(!rec.includes(c)) rec.push(c); }
  return rec.map(c => `<button class="mp${c.uid===BLD.uid?' on':''}" data-act="mon-go" data-uid="${c.uid}"><img src="${bldImg(c.img)}" alt=""></button>`).join('') +
    `<button class="mp add" data-act="mon" title="選擇魔靈">🔍</button>`;
}
function bldStatsHtml(m, base, c, p){
  return BLD_PANEL.map(([k,label], i) => {
    // 爆率/抵抗/命中面板上限 100%，遊戲的 ▲▼ 也是用封頂後的值算
    const limited = ['cr','res','acc'].includes(k), lim = v => limited ? Math.min(100, v) : v;
    const flat = i < 4, now = m.base[k] + c.add[k], d = lim(m.base[k] + p.add[k]) - lim(now);
    const cap = limited && now >= 100;
    return `<div class="st${i===4?' gap':''}"><span class="st-l">${label}</span>
      <span class="st-v${cap?' cap':''}">${flat ? m.base[k] : `${cap ? 100 : now}%`}</span>
      <span class="st-g">${flat && c.add[k] ? `+${c.add[k]}` : ''}</span>
      <span class="st-d">${bldDelta(d)}</span></div>`;
  }).join('');
}
function bldEffHtml(w){
  const list = bldEffects(w);
  return list.length ? `<ul class="eff">${list.map(x => `<li>${bldEsc(x)}</li>`).join('')}</ul>` : '<p class="eff-none">No available Artifact effects.</p>';
}
function bldLeftHtml(){
  const m = bldMon();
  if(!m) return `<div class="g-strip">${bldStripHtml()}</div><p class="eff-none">請先選擇魔靈</p>`;
  const w = BLD.work, base = bldBase(m), c = bldCalc(m, base), p = bldCalc(m, w);
  const art = BLD.mode === 'art';
  const showEff = art || BLD.effOpen;
  const setIcons = sets => sets.filter(s => s.on).map(s => `<span class="ba-s"><img src="${bldSetImg(s.en)}" alt="">${s.times>1?`<b>×${s.times}</b>`:''}</span>`).join('');
  const conflicts = bldConflicts(m.uid);
  const mana = DATA.meta.mana ? ` / ${Math.floor(DATA.meta.mana/1e6).toLocaleString('en-US')}M` : '';
  return `<div class="g-strip">${bldStripHtml()}</div>
    <button class="g-pill" data-act="eff">▼<span>${art ? 'Details' : 'Artifact Effect'}</span></button>
    <div class="g-stats">${showEff ? bldEffHtml(w) : bldStatsHtml(m, base, c, p)}</div>
    <div class="g-rail r1">
      <button data-act="mode" data-mode="rune" class="${art?'':'on'}" title="符文"><svg viewBox="0 0 24 24"><polygon points="12,3 20,8 20,16 12,21 4,16 4,8"/></svg></button>
      <button data-act="mode" data-mode="art" class="${art?'on':''}" title="魔礦"><svg viewBox="0 0 24 24"><polygon points="12,3 21,10 17.5,20 6.5,20 3,10"/><circle cx="12" cy="13" r="3.5"/></svg></button>
    </div>
    <div class="g-rail r2">
      <button data-act="saved" title="存檔清單">✎</button>
      <button data-act="menu" title="更多">⋯</button>
      <button data-act="clear-all" title="全部卸下">✕</button>
    </div>
    <div class="g-ba${art?' art':''}">
      <div class="ba"><h5>Before<span>${art?'':setIcons(c.sets)}</span></h5><div class="ba-g">${art
        ? [0,1].map(i => bldCellArt(base.arts[i], i, 'before', false, m)).join('')
        : BLD_GRID.map(s => bldCell(base.runes[s], s, 'before', false, m)).join('')}</div></div>
      <span class="ba-arrow">〉</span>
      <div class="ba"><h5>After<span>${art?'':setIcons(p.sets)}</span></h5><div class="ba-g">${art
        ? [0,1].map(i => bldCellArt(w.arts[i], i, 'after', (w.arts[i]||null) !== (base.arts[i]||null), m)).join('')
        : BLD_GRID.map(s => bldCell(w.runes[s], s, 'after', (w.runes[s]||null) !== (base.runes[s]||null), m)).join('')}</div></div>
      ${conflicts.length
        ? `<div class="ba-cost warn">⚠ ${bldEsc(conflicts[0].label)} 已被 ${bldEsc(conflicts[0].others[0].name)} 的存檔使用${conflicts.length>1?` 等 ${conflicts.length} 項`:''}</div>`
        : `<div class="ba-cost"><i></i>Removal Cost <b>0${mana}</b></div>`}
    </div>
    <button class="g-apply" data-act="apply">Apply</button>`;
}

// ---------- 右側 ----------
function bldHexHtml(){
  const f = BLD.f, m = bldMon(), R = 34, D = 56, C = 90;
  const cells = [1,2,3,4,5,6].map(s => {
    const a = (s-1)*Math.PI/3, x = C + D*Math.sin(a), y = C - D*Math.cos(a), on = f.slots.includes(s);
    return `<g data-act="slot" data-slot="${s}" class="hx${on?' on':''}"><polygon points="${bldKitePts(s,x,y,R).map(p => p.map(n => n.toFixed(1)).join(',')).join(' ')}"/><text x="${x.toFixed(1)}" y="${y.toFixed(1)}">${s}</text></g>`;
  }).join('');
  return `<svg class="g-hex" viewBox="0 0 180 180">${cells}
    <g data-act="slot-all" class="hx-mid"><circle cx="${C}" cy="${C}" r="17" fill="transparent"/>
    <path d="M${C-12} ${C-2}c0-9 6-13 12-13s12 4 12 13c0 3-1 5-3 7l-1 5h-4v-3h-2v3h-4v-3h-2v3h-4l-1-5c-2-2-3-4-3-7zm6 0a3 3 0 1 0 0 .1zm12 0a3 3 0 1 0 0 .1z" fill-rule="evenodd"/></g></svg>`;
}
function bldSetBtn(){
  const sel = BLD.f.sets.map(id => bldSets().find(s => s.id === id)).filter(Boolean);
  if(!sel.length) return '<b>All</b>';
  return `<img src="${bldSetImg(sel[0].en)}" alt=""><b>${sel[0].en}${sel.length>1?` +${sel.length-1}`:''}</b>`;
}
const bldSubRow = (i, label) => `<button class="dd" data-act="pop-sub" data-i="${i}"><span>${bldEsc(label)}</span></button>`;
function bldSubLabel(x){
  if(!x.s) return 'All';
  return BLD.mode === 'rune' ? BLD_OPT[x.s] : (BLD_ART[x.s]||[x.s])[0];
}
function bldTopHtml(){
  const f = bldFilter(), k = f.subPage*2;
  const subs = `<h4>Sub Property <button class="sq" data-act="sub-page" title="第 ${f.subPage?'3、4':'1、2'} 條副屬性，點一下切換"><i></i><i></i><i></i><i></i>${f.subPage?'<b>2</b>':''}</button></h4>
    ${bldSubRow(k, bldSubLabel(f.subs[k]))}${bldSubRow(k+1, bldSubLabel(f.subs[k+1]))}`;
  if(BLD.mode === 'rune'){
    return `<div class="g-setbox">
        <button class="g-set" data-act="pop-set">${bldSetBtn()}<em></em></button>
        <div class="g-hexbox" id="bld-hex">${bldHexHtml()}</div>
      </div>
      <div class="g-props">
        <h4>Main Property</h4>
        <button class="dd" data-act="pop-main"><span>${f.main ? BLD_OPT[f.main] : 'All'}</span></button>
        ${subs}
      </div>`;
  }
  const catText = {'':'All','屬性':'Attribute Artifact','類型':'Type Artifact'}[f.cat];
  const mainText = {'':'All','hp_f':'HP+','atk_f':'ATK+','def_f':'DEF+'}[f.main];
  return `<div class="g-artprops">
      <div class="half"><h4>Artifact</h4><button class="dd" data-act="pop-artcat"><span>${catText}</span></button></div>
      <div class="half"><h4>Main Property</h4><button class="dd" data-act="pop-artmain"><span>${mainText}</span></button></div>
      <div class="full">${subs}</div>
    </div>`;
}
function bldBarHtml(){
  const f = bldFilter(), sorts = BLD.mode === 'rune' ? BLD_SORT : BLD_ART_SORT;
  return `<button class="ic" data-act="gear" title="更多條件">⚙</button>
    <button class="sortb" data-act="pop-sort"><span>${(sorts.find(([k]) => k === f.sort)||['',''])[1]}</span></button>
    <button class="ic ord${f.dir>0?' asc':''}" data-act="dir" title="${f.dir<0?'由大到小':'由小到大'}"><svg viewBox="0 0 24 24"><path d="M3 5h11v2.6H3zM3 10.7h9v2.6H3zM3 16.4h7V19H3z"/><path d="M18 4v11.5l3-3 1.5 1.5-5.7 5.8L11 14l1.5-1.5 3 3V4z" transform="translate(0 0)"/></svg></button>
    <span class="count" id="bld-count"></span>`;
}
function bldRightHtml(){
  return `<div class="g-title"><button class="g-chat" data-act="saved" title="存檔清單"><span id="bld-savedn"></span></button>
      <h3>${BLD.mode==='rune'?'Manage':'Manage Artifact'}</h3>
      <button class="g-x" data-act="close" title="選擇魔靈">✕</button></div>
    <div class="g-top" id="bld-top">${bldTopHtml()}</div>
    <div class="g-body"><div class="g-bar" id="bld-bar">${bldBarHtml()}</div><div class="g-grid" id="bld-grid"></div></div>`;
}
function bldRenderGrid(){
  const g = bldEl('bld-grid'); if(!g) return;
  const rune = BLD.mode === 'rune', list = rune ? bldRuneList() : bldArtList();
  const total = rune ? DATA.runes.length : DATA.artifacts.length;
  const rest = list.length - BLD.limit, shown = list.slice(0, BLD.limit).map(rune ? bldTileRune : bldTileArt).join('');
  // 不滿三排時補空格，比照遊戲的空背包
  const pad = Math.max(0, 27 - Math.min(list.length, BLD.limit));
  g.innerHTML = shown + '<div class="t blank"></div>'.repeat(pad) +
    (rest > 0 ? `<button class="more" data-act="more">再顯示 ${Math.min(rest, BLD_PAGE)} 個（還有 ${rest} 個）</button>` : '');
  bldEl('bld-count').textContent = `${list.length}/${total}`;
  try { localStorage.setItem('sw-tool:build-filter', JSON.stringify({f:BLD.f, af:BLD.af})); } catch(e) {}
}
const bldRenderLeft = () => { const el = bldEl('bld-left'); if(el) el.innerHTML = bldLeftHtml(); };
const bldRenderTop = () => { const el = bldEl('bld-top'); if(el) el.innerHTML = bldTopHtml(); };
const bldRenderBar = () => { const el = bldEl('bld-bar'); if(el) el.innerHTML = bldBarHtml(); };
function bldRefilter(){ BLD.limit = BLD_PAGE; bldRenderTop(); bldRenderBar(); bldRenderGrid(); }
function bldAfterPick(){ BLD.card = null; bldRenderCard(); bldRenderLeft(); bldRenderGrid(); }

// ---------- 符文卡（長按格子、點 Before/After）----------
function bldCardHtml(){
  const c = BLD.card; if(!c) return '';
  const close = `<button class="k-x" data-act="card-x">✕</button>`;
  const used = bldOthers(c.key, BLD.uid);
  const usedHtml = used.length ? `<div class="k-used">⚠ 已被 ${used.map(x => bldEsc(x.name)).join('、')} 的存檔使用</div>` : '';
  const btn = c.side === 'after' ? `<button class="k-b" data-act="card-remove">Remove Temporarily</button>`
            : c.side === 'grid' ? `<button class="k-b" data-act="card-pick">${c.selected ? 'Remove Temporarily' : 'Equip Temporarily'}</button>` : '';
  const id = +c.key.slice(1);
  if(c.key[0] === 'r'){
    const r = runeById(id); if(!r) return '';
    const n = r.pieces || 2, fx = BLD_SET_FX[r.setId];
    const own = r.owner ? `<img src="${bldImg(r.ownerImg)}" alt="">` : '';
    return `<div class="card ${c.side==='grid'?'rt':'lt'}">${close}
      <h4>+${r.lv} ${bldEsc(r.setEn)} Rune (${r.slot})</h4>
      <div class="k-l">
        <div class="k-top"><div class="k-ic${r.lv>=15?' max':''}"><span class="t-st${r.lv>=15?' max':''}">${'★'.repeat(r.stars)}</span>${bldRune(r, r.slot)}<span class="t-lv">+${r.lv}</span>${own}</div>
          <div class="k-main"><b>${bldEsc(bldMainText(r))}</b>${r.innate?`<small>${bldEsc(bldInnateText(r))}</small>`:''}</div></div>
        <div class="k-sub">${(r.sub2||[]).map(bldSubHtml).join('')}</div>
        <div class="k-set">${n} Set${fx?` : ${fx}`:''}</div>
        <div class="k-own">${r.owner ? `裝備於 ${bldEsc(r.owner)}` : '倉庫'}${r.locked?'・🔒':''}</div>${usedHtml}
      </div>
      <div class="k-r"><span class="k-q q${(BLD_Q[r.q]||[0])[0]}">${(BLD_Q[r.q]||['',r.q])[1]}</span><span class="k-sc">🔥 ${r.score}</span>${btn}</div>
    </div>`;
  }
  const a = artById(id); if(!a) return '';
  return `<div class="card ${c.side==='grid'?'rt':'lt'}">${close}
    <h4 class="a${(BLD_Q[a.natRank]||[0])[0]}">${bldEsc(bldArtTitle(a))}</h4>
    <div class="k-l">
      <div class="k-top"><div class="k-ic art">${bldArtIcon(a)}${a.ownerImg?`<img src="${bldImg(a.ownerImg)}" alt="">`:''}</div>
        <div class="k-main"><b>${bldEsc(a.main)}</b></div></div>
      <div class="k-sub">${a.subs.map(s => `<div class="sb"><span>${bldEsc(bldArtEffect(s))}</span></div>`).join('')}</div>
      <div class="k-own">${a.owner ? `裝備於 ${bldEsc(a.owner)}` : '倉庫'}${a.locked?'・🔒':''}</div>${usedHtml}
    </div>
    <div class="k-r"><span class="k-q q${(BLD_Q[a.natRank]||[0])[0]}">${(BLD_Q[a.natRank]||['',a.natRank])[1]}</span><span class="k-sc">Dmg ${a.dmg}</span>${btn}</div>
  </div>`;
}
function bldRenderCard(){ const el = bldEl('bld-card'); if(el) el.innerHTML = bldCardHtml(); }
function bldShowCard(key, side, extra){ BLD.card = {key, side, ...extra}; bldRenderCard(); }

// ---------- 彈出選單與視窗 ----------
function bldOptionsHtml(act, cur, dimmed){
  return BLD_POP_IDS.map(id => `<button data-act="${act}" data-v="${id}" class="${String(cur)===String(id)?'cur':''}${dimmed(id)?' dim':''}">${id ? BLD_OPT[id] : 'All'}</button>`).join('');
}
function bldMainDim(id){
  const s = BLD.f.slots;
  return !!id && s.length > 0 && !s.some(x => BLD_SLOT_MAIN[x].includes(id));
}
function bldOverlayHtml(){
  const o = BLD.overlay; if(!o) return '';
  const f = bldFilter();
  const wrap = (html, cls='') => `<div class="ov${cls}" data-act="ov-bg">${html}</div>`;
  switch(o.kind){
    case 'set': {
      const inv = DATA.runes.filter(r => !r.owner).length;
      return wrap(`<div class="dlg setd"><button class="d-x" data-act="ov-close">✕</button>
        <div class="set-g"><button data-act="set" data-id="0" class="${f.sets.length?'':'cur'}"><span class="allnum">${inv}</span><small>All</small></button>
        ${bldSets().map(s => `<button data-act="set" data-id="${s.id}" class="${f.sets.includes(s.id)?'cur':''}"><i>${s.inv}</i><img src="${bldSetImg(s.en)}" alt=""><small>${s.en}</small></button>`).join('')}</div>
        <label class="d-ck"><input type="checkbox" data-act="set-multi"${f.multi?' checked':''}> Select Multiple Runes</label></div>`);
    }
    case 'main': return wrap(`<div class="pop two" style="left:${o.x}px;top:${o.y}px">${bldOptionsHtml('main', f.main, bldMainDim)}</div>`);
    case 'sub': {
      const taken = new Set([+f.main, ...f.subs.map((x,i) => i===o.i ? 0 : +x.s)]);
      return wrap(`<div class="pop two" style="left:${o.x}px;top:${o.y}px">${bldOptionsHtml('sub', f.subs[o.i].s, id => !!id && taken.has(id))}</div>`);
    }
    case 'artsub': {
      const present = new Set(); DATA.artifacts.forEach(a => { if(!f.cat || a.cat === f.cat) a.subs.forEach(s => present.add(s.sid)); });
      const ids = Object.keys(BLD_ART).map(Number).filter(id => !o.cat || BLD_ART[id][1] === o.cat);
      return wrap(`<div class="dlg subd"><button class="d-x" data-act="ov-close">✕</button>
        <div class="d-row"><b>Category</b><select data-act="artsub-cat">${['','General','Attribute','Skill'].map(c => `<option value="${c}"${o.cat===c?' selected':''}>${c||'All'}</option>`).join('')}</select></div>
        <h5>Select Sub-Property</h5>
        <div class="d-list"><button data-act="artsub-pick" data-v="" class="${o.pick===''?'cur':''}">All</button>${ids.map(id => `<button data-act="artsub-pick" data-v="${id}" class="${String(o.pick)===String(id)?'cur':''}${present.has(id)?'':' dim'}">${bldEsc(BLD_ART[id][0])}</button>`).join('')}</div>
        <div class="d-btns"><button class="g-btn" data-act="artsub-ok">Select</button><button class="g-btn" data-act="ov-close">Cancel</button></div></div>`);
    }
    case 'sort': {
      const sorts = BLD.mode === 'rune' ? BLD_SORT : BLD_ART_SORT;
      return wrap(`<div class="pop one sortp">${sorts.map(([k,n]) => `<button data-act="sort" data-v="${k}" class="${f.sort===k?'cur':''}">${n}</button>`).join('')}</div>`);
    }
    case 'artcat': return wrap(`<div class="pop one" style="left:${o.x}px;top:${o.y}px">${[['','All'],['屬性','Attribute Artifact'],['類型','Type Artifact']].map(([k,n]) => `<button data-act="artcat" data-v="${k}" class="${f.cat===k?'cur':''}">${n}</button>`).join('')}</div>`);
    case 'artmain': return wrap(`<div class="pop one" style="left:${o.x}px;top:${o.y}px">${[['','All'],['hp_f','HP+'],['atk_f','ATK+'],['def_f','DEF+']].map(([k,n]) => `<button data-act="artmain" data-v="${k}" class="${f.main===k?'cur':''}">${n}</button>`).join('')}</div>`);
    case 'menu': {
      const m = bldMon(), plan = m && bldPlans()[m.uid], meta = DATA.meta;
      return wrap(`<div class="pop one menu">
        <button data-act="saved">存檔清單</button>
        ${m ? '<button data-act="reset-game">回到遊戲裡的裝備</button>' : ''}
        ${plan ? '<button data-act="reset-plan">回到上次 Apply</button>' : ''}
        ${window.bldUpdateData ? '<button data-act="update-data">更新資料檔</button>' : ''}
        <small>資料：${bldEsc(meta.name)}・${bldEsc(meta.exportedAt||'')}</small></div>`);
    }
    case 'gear': return wrap(bldGearHtml());
    case 'mon': return wrap(`<div class="dlg mond"><button class="d-x" data-act="ov-close">✕</button>
        <div class="m-top"><input id="bld-monq" value="${bldEsc(BLD.mon.q)}" placeholder="輸入魔靈名稱或族名"><span id="bld-mcount"></span></div>
        <div class="m-f" id="bld-mfilters">${bldMonFiltersHtml()}</div>
        <div class="m-list" id="bld-mlist"></div></div>`);
    case 'apply': return wrap(`<div class="dlg ask"><h3>Apply the changes now?</h3>
        <label class="d-ck"><input type="checkbox" data-act="apply-skip"> Don't show this again today</label>
        <div class="d-btns"><button class="g-btn" data-act="apply-yes">Yes</button><button class="g-btn" data-act="apply-no">No</button></div></div>`);
    case 'applyart': {
      const m = bldMon(), base = bldBase(m), w = BLD.work;
      const side = load => {
        const arts = load.arts.map(id => id ? artById(id) : null).filter(Boolean);
        if(!arts.length) return '<p class="eff-none">No available Artifact effects.</p>';
        return arts.map(a => `<div class="ad-m"><span>${bldEsc(a.main.split(' ')[0])}</span><b>+${a.mainVal}</b></div>`).join('') + bldEffHtml(load);
      };
      return wrap(`<div class="dlg artd"><div class="ad-c"><div><h5>Before</h5>${side(base)}</div><div><h5>After</h5>${side(w)}</div></div>
        <h3>Change the Artifact?</h3>
        <div class="d-btns"><button class="g-btn" data-act="apply-yes">YES</button><button class="g-btn" data-act="apply-no">NO</button></div></div>`);
    }
  }
  return '';
}
function bldGearHtml(){
  const f = bldFilter(), rune = BLD.mode === 'rune';
  const op = (v, l, c) => `<option value="${bldEsc(v)}"${String(c)===String(v)?' selected':''}>${bldEsc(l)}</option>`;
  const ck = (k, label) => `<label class="ck"><input type="checkbox" data-f="${k}"${f[k]?' checked':''}> ${label}</label>`;
  const subMin = f.subs.map((x,i) => x.s ? `<label>${bldEsc(bldSubLabel(x))} ≥ <input type="number" min="0" data-submin="${i}" value="${bldEsc(x.min)}"></label>` : '').join('');
  const common = `<label>所在位置 <select data-f="loc">${op('', '全部', f.loc)}${op('inv','倉庫',f.loc)}${op('eq','已裝備',f.loc)}${op('self','這隻身上',f.loc)}</select></label>
    <label>裝備者 <input data-f="owner" value="${bldEsc(f.owner)}" placeholder="魔靈名稱"></label>
    ${ck('hideUsed','隱藏已被其他存檔使用')}${ck('hideLocked','隱藏已鎖定')}${ck('showVal','格子上顯示排序數值')}`;
  return `<div class="dlg gear"><button class="d-x" data-act="ov-close">✕</button><h5>更多條件</h5>
    <div class="gear-b">${subMin ? `<div class="gear-sec">${subMin}</div>` : '<p class="gear-tip">在 Sub Property 選了副屬性後，這裡可以設定最低數值</p>'}
    ${rune ? `<label>星數 <select data-f="stars">${op('', '全部', f.stars)}${[6,5,4,3,2,1].map(n => op(n, n+'★', f.stars)).join('')}</select></label>
    <label>古代 <select data-f="ancient">${op('', '全部', f.ancient)}${op('yes','古代符文',f.ancient)}${op('no','一般符文',f.ancient)}</select></label>
    <label>Grade <select data-f="q">${op('', '全部', f.q)}${Object.entries(BLD_Q).map(([k,v]) => op(k,v[1],f.q)).join('')}</select></label>
    <label>強化 ≥ <input type="number" min="0" max="15" data-f="minLv" value="${bldEsc(f.minLv)}"></label>
    <label>Score ≥ <input type="number" min="0" data-f="minScore" value="${bldEsc(f.minScore)}"></label>
    <label>效率 ≥ <input type="number" min="0" data-f="minEff" value="${bldEsc(f.minEff)}"></label>
    <label>綴屬 <select data-f="innate">${op('', '全部', f.innate)}${op('any','有綴屬',f.innate)}${op('none','無綴屬',f.innate)}${BLD_POP_IDS.filter(Boolean).map(id => op(id, BLD_OPT[id], f.innate)).join('')}</select></label>
    <label>精煉 <select data-f="mod">${op('', '全部', f.mod)}${op('grind','有研磨',f.mod)}${op('nogrind','沒研磨',f.mod)}${op('gem','有轉換',f.mod)}${op('nogem','沒轉換',f.mod)}</select></label>
    ` : ck('fit','只看這隻可裝的')}
    ${common}${rune ? ck('showSold','顯示已標記賣掉的') : ''}</div>
    <div class="d-btns"><button class="g-btn" data-act="clear-f">Reset</button><button class="g-btn" data-act="ov-close">OK</button></div></div>`;
}
function bldRenderOverlay(){
  const el = bldEl('bld-ov'); if(!el) return;
  el.innerHTML = bldOverlayHtml();
  if(BLD.overlay && BLD.overlay.kind === 'mon'){
    bldRenderMonList();
    if(!bldPhone()) bldEl('bld-monq').focus();    // 橫向手機鍵盤會蓋掉整個畫面，不自動叫出來
  }
}
function bldOpen(kind, extra){ BLD.overlay = {kind, ...extra}; BLD.card = null; bldRenderCard(); bldRenderOverlay(); }
function bldClose(){ BLD.overlay = null; bldRenderOverlay(); }

// 魔靈選擇
function bldMonList(){
  const s = BLD.mon, q = s.q.toLowerCase().trim(), qn = normCN(s.q), plans = bldPlans();
  return DATA.monsters.filter(c => {
    if(s.attr && c.attr !== s.attr) return false;
    if(s.arch && c.arch !== s.arch) return false;
    if(s.saved && !plans[c.uid]) return false;
    return !q || (c.name+c.label).toLowerCase().includes(q) || (qn && normCN(c.name+c.label).includes(qn));
  });
}
function bldMonFiltersHtml(){
  const s = BLD.mon;
  return `${['',...Object.keys(BLD_ATTR_EN)].map(a => `<button data-act="mon-attr" data-v="${a}" class="${s.attr===a?'cur':''}">${a ? BLD_ATTR_EN[a] : 'All'}</button>`).join('')}<u></u>
    ${['',...Object.keys(BLD_ARCH_EN)].map(a => `<button data-act="mon-arch" data-v="${a}" class="${s.arch===a?'cur':''}">${a ? BLD_ARCH_EN[a] : 'All'}</button>`).join('')}<u></u>
    <button data-act="mon-saved" class="${s.saved?'cur':''}">有存檔</button>`;
}
function bldRenderMonList(){
  const el = bldEl('bld-mlist'); if(!el) return;
  const list = bldMonList(), plans = bldPlans();
  el.innerHTML = list.slice(0, BLD.mon.limit).map(c => `<button class="mc" data-act="mon-pick" data-uid="${c.uid}">
      <img src="${bldImg(c.img)}" loading="lazy" alt="">${plans[c.uid] ? '<i>📌</i>' : ''}
      <span><b>${bldEsc(c.name)}</b><small>${bldEsc(c.label)}・Lv${c.level}</small><small>${c.nRunes ? bldEsc(c.sets) : '沒裝符文'}</small></span>
    </button>`).join('') + (list.length > BLD.mon.limit ? `<button class="more" data-act="mon-more">再顯示（還有 ${list.length - BLD.mon.limit} 隻）</button>` : '');
  bldEl('bld-mcount').textContent = `${list.length} 隻`;
}
function bldMonRefresh(){ BLD.mon.limit = 150; bldEl('bld-mfilters').innerHTML = bldMonFiltersHtml(); bldRenderMonList(); }

// ---------- 存檔清單：開遊戲時看這頁照著換 ----------
function bldPlanItems(p, m){
  const cur = m ? bldCurrent(m) : {runes:{}, arts:[null,null]}, items = [];
  [1,2,3,4,5,6].forEach(s => {
    const id = p.runes[s] || null, c = cur.runes[s] || null;
    if(id || c) items.push({kind:'r', slot:s, id, cur:c, key: id ? 'r'+id : 'xr'+s, same:id===c});
  });
  [0,1].forEach(i => {
    const id = (p.arts||[])[i] || null, c = cur.arts[i] || null;
    if(id || c) items.push({kind:'a', slot:i, id, cur:c, key: id ? 'a'+id : 'xa'+i, same:id===c});
  });
  return items;
}
function bldWhere(it, m){
  const key = (it.kind === 'r' ? 'r' : 'a') + it.id, own = bldOwnerMap()[key];
  if(own) return own === m ? '<span class="where self">在這隻身上</span>'
    : `<span class="where on"><img src="${bldImg(own.img)}" loading="lazy" alt=""><span>拆自 <b>${bldEsc(own.name)}</b><small>${bldEsc(own.label)}・Lv${own.level}</small></span></span>`;
  return '<span class="where inv">倉庫</span>';
}
function bldSavedIcon(it, id){
  const r = it.kind === 'r' && id ? runeById(id) : null, a = it.kind === 'a' && id ? artById(id) : null;
  if(it.kind === 'r') return `<div class="c">${r ? `<span class="t-st${r.lv>=15?' max':''}">${'★'.repeat(r.stars)}</span>` : ''}${bldRune(r, it.slot)}${r ? `<span class="t-lv">+${r.lv}</span>` : ''}</div>`;
  return `<div class="c art">${a ? bldArtIcon(a) : ''}</div>`;
}
function bldItemRow(p, m, it){
  const done = !!(p.done||{})[it.key];
  const check = it.same ? '<span class="pr-same">✓</span>'
    : `<input type="checkbox" data-act="tick" data-uid="${p.uid}" data-key="${bldEsc(it.key)}"${done?' checked':''}>`;
  const conflict = it.id ? bldOthers((it.kind==='r'?'r':'a')+it.id, p.uid) : [];
  const warn = conflict.length ? `<span class="pr-warn">⚠ 也用於 ${conflict.map(o => bldEsc(o.name)).join('、')}</span>` : '';
  const cls = `pr${it.same?' same':''}${done&&!it.same?' done':''}`;
  if(!it.id){   // 這一格在存檔裡是空的：要把身上那顆卸下來
    const r = it.kind === 'r' ? runeById(it.cur) : artById(it.cur);
    return `<div class="${cls}"><div class="pr-ck">${check}</div>${bldSavedIcon(it, it.cur)}
      <div class="pr-main"><b>Remove</b> ${r ? bldEsc(it.kind==='r' ? `${r.setEn} ${bldMainText(r)}` : r.main) : ''}</div></div>`;
  }
  if(it.kind === 'r'){
    const r = runeById(it.id);
    if(!r) return `<div class="${cls} gone"><div class="pr-ck">${check}</div>${bldSavedIcon(it, null)}<div class="pr-main">資料裡找不到這顆符文（可能賣掉了）</div></div>`;
    return `<div class="${cls}"><div class="pr-ck">${check}</div>${bldSavedIcon(it, it.id)}
      <div class="pr-main"><b>${bldEsc(r.setEn)} (${r.slot})</b>${r.ancient?' <em>Ancient</em>':''}
        <div class="pr-stat">${bldEsc(bldMainText(r))}${r.innate?` <span>${bldEsc(bldInnateText(r))}</span>`:''}</div></div>
      <div class="pr-subs">${(r.sub2||[]).map(bldSubHtml).join('')}</div>
      <div class="pr-score">${r.score}</div>
      <div class="pr-where">${it.same ? '<span class="where self">已在身上</span>' : bldWhere(it, m)}${warn}</div></div>`;
  }
  const a = artById(it.id);
  if(!a) return `<div class="${cls} gone"><div class="pr-ck">${check}</div>${bldSavedIcon(it, null)}<div class="pr-main">資料裡找不到這個魔礦（可能賣掉了）</div></div>`;
  return `<div class="${cls}"><div class="pr-ck">${check}</div>${bldSavedIcon(it, it.id)}
    <div class="pr-main"><b>${bldEsc(bldArtTitle(a))}</b><div class="pr-stat">${bldEsc(a.main)}</div></div>
    <div class="pr-subs">${a.subs.map(s => `<div class="sb"><span>${bldEsc(bldArtEffect(s))}</span></div>`).join('')}</div>
    <div class="pr-score"></div>
    <div class="pr-where">${it.same ? '<span class="where self">已在身上</span>' : bldWhere(it, m)}${warn}</div></div>`;
}
function bldPlanCard(p){
  const m = bldMonById(p.uid), items = bldPlanItems(p, m);
  const todo = items.filter(x => !x.same), finished = todo.filter(x => (p.done||{})[x.key]).length;
  let chips = '', sets = [];
  if(m){
    const c = bldCalc(m, bldCurrent(m)), n = bldCalc(m, {runes:p.runes, arts:p.arts||[null,null]});
    sets = n.sets.filter(s => s.on);
    chips = BLD_PANEL.map(([k,label], i) => {
      const d = n.add[k] - c.add[k], v = m.base[k] + n.add[k];
      return `<span><small>${label}</small><b>${v}${i>=4?'%':''}</b>${bldDelta(d)}</span>`;
    }).join('');
  }
  return `<section class="pc${todo.length && finished===todo.length ? ' alldone' : ''}">
    <header>
      <img src="${bldImg(m ? m.img : p.img)}" alt="">
      <div class="pc-id"><b>${bldEsc(m ? m.name : p.name)}</b><small>${bldEsc(m ? `${m.label}・Lv${m.level}` : '這隻不在目前的資料裡')}・${bldEsc(p.savedAt)}</small>
        <div class="pc-sets">${sets.map(s => `<span><img src="${bldSetImg(s.en)}" alt="">${s.en}</span>`).join('')}</div></div>
      <div class="pc-prog">${todo.length ? `已換 <b>${finished}</b> / ${todo.length}` : '不用換'}</div>
      ${m ? `<button data-act="plan-edit" data-uid="${p.uid}">編輯</button>` : ''}
      <button class="del" data-act="plan-del" data-uid="${p.uid}">刪除</button>
    </header>
    ${chips ? `<div class="pc-stats">${chips}</div>` : ''}
    <div class="pc-rows">${items.map(it => bldItemRow(p, m, it)).join('')}</div>
  </section>`;
}
function bldSavedHtml(){
  const plans = Object.values(bldPlans()).sort((a,b) => String(b.savedAt).localeCompare(String(a.savedAt)));
  const shown = plans.filter(p => {
    if(!BLD.hideDone) return true;
    return bldPlanItems(p, bldMonById(p.uid)).filter(x => !x.same).some(x => !(p.done||{})[x.key]);
  });
  return `<div class="ps-bar">
      <button class="back" data-act="back">‹ Manage</button>
      <label><input type="checkbox" data-act="hide-done"${BLD.hideDone?' checked':''}> 隱藏已換完的</label>
      <span class="ps-note">「拆自」和「已在身上」以最後一次匯出（${bldEsc(DATA.meta.exportedAt||'')}）為準</span>
      <button data-act="plans-export"${plans.length?'':' disabled'}>匯出存檔</button>
      <button data-act="plans-import">匯入存檔</button>
      <input type="file" id="bld-import" accept=".json,application/json" hidden>
    </div>
    ${shown.length ? shown.map(bldPlanCard).join('') : `<p class="ps-none">${plans.length ? '全部都換完了' : '還沒有存檔。選魔靈、挑好符文後按 Apply，就會出現在這裡。'}</p>`}`;
}
async function bldExportPlans(){
  const blob = new Blob([JSON.stringify({type:'sw-tool-builds', account:DATA.meta.name, exportedAt:new Date().toISOString(), plans:bldPlans()}, null, 1)], {type:'application/json'});
  const name = `sw-tool-builds_${DATA.meta.name}_${new Date().toISOString().slice(0,10)}.json`;
  if(bldPhone() && navigator.canShare){       // 加到主畫面的 App 裡，下載連結不一定有反應，改走系統分享
    const file = new File([blob], name, {type:'application/json'});
    if(navigator.canShare({files:[file]})){
      try { await navigator.share({files:[file]}); } catch(e) {}
      return;
    }
  }
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function bldImportPlans(file){
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if(data.type !== 'sw-tool-builds' || !data.plans) throw new Error('不是符文配置的存檔');
      const num = v => Number.isSafeInteger(v) ? v : null;
      const plans = bldPlans();
      let n = 0;
      Object.values(data.plans).forEach(p => {
        if(!p || !Number.isSafeInteger(p.uid) || !p.runes) return;
        const runes = {};
        [1,2,3,4,5,6].forEach(s => { runes[s] = num(p.runes[s]); });
        plans[p.uid] = {uid:p.uid, name:String(p.name||''), label:String(p.label||''), img:String(p.img||''), runes,
                        arts:[num((p.arts||[])[0]), num((p.arts||[])[1])],
                        done:p.done && typeof p.done === 'object' ? p.done : {}, savedAt:String(p.savedAt||'')};
        n++;
      });
      if(bldPersist()) bldToast(`已匯入 ${n} 份存檔（同一隻魔靈以匯入的為準）`);
      if(BLD.uid) bldLoad(BLD.uid);
      renderBuilder();
    } catch(e){ bldToast('匯入失敗：' + e.message, true); }
  };
  reader.readAsText(file);
}

// ---------- Apply ----------
const BLD_SKIP_KEY = 'sw-tool:build-noask';
const bldToday = () => new Date().toDateString();
function bldNoAsk(){ try { return localStorage.getItem(BLD_SKIP_KEY) === bldToday(); } catch(e){ return false; } }
function bldApply(next){
  if(!bldMon()) return;
  if(BLD.mode === 'art' && !next && bldDirty(bldMon())){ bldOpen('applyart', {next}); return; }
  if(bldNoAsk()){ bldCommit(true, next); return; }
  bldOpen('apply', {next});
}
function bldCommit(yes, next){
  const m = bldMon();
  if(yes){ if(!bldSave()) { bldClose(); return; } }
  else if(next) BLD.work = bldBase(m);
  BLD.overlay = null; bldRenderOverlay();
  if(next) next();
  else bldRenderMain();
}
function bldGo(uid){
  const go = () => { bldLoad(uid); bldRenderMain(); };
  if(bldDirty(bldMon())) bldApply(go); else go();
}

// ---------- 事件 ----------
function bldClick(e){
  if(BLD.skipClick){ BLD.skipClick = false; return; }    // 長按看卡片，不算點擊
  const t = e.target.closest('[data-act]');
  if(!t){ if(BLD.card){ BLD.card = null; bldRenderCard(); } return; }
  const act = t.dataset.act, id = +t.dataset.id, uid = +t.dataset.uid, v = t.dataset.v;
  const f = bldFilter(), m = bldMon(), w = BLD.work, o = BLD.overlay;
  const X = 306;     // 右半邊的起點，彈出選單靠右對齊
  switch(act){
    case 'ov-bg': if(e.target === t) bldClose(); break;
    case 'ov-close': bldClose(); bldRefilter(); break;
    case 'mon': bldOpen('mon'); break;
    case 'close': bldOpen('mon'); break;
    case 'mon-go': if(uid !== BLD.uid) bldGo(uid); break;
    case 'mon-attr': BLD.mon.attr = v; bldMonRefresh(); break;
    case 'mon-arch': BLD.mon.arch = v; bldMonRefresh(); break;
    case 'mon-saved': BLD.mon.saved = !BLD.mon.saved; bldMonRefresh(); break;
    case 'mon-more': BLD.mon.limit += 150; bldRenderMonList(); break;
    case 'mon-pick': BLD.overlay = null; bldRenderOverlay(); bldGo(uid); break;
    case 'mode': BLD.mode = t.dataset.mode; BLD.limit = BLD_PAGE; BLD.card = null; bldRenderMain(); break;
    case 'eff': BLD.effOpen = !BLD.effOpen; bldRenderLeft(); break;
    case 'menu': bldOpen('menu'); break;
    case 'saved': BLD.overlay = null; BLD.view = 'saved'; renderBuilder(); break;
    case 'back': BLD.view = 'edit'; renderBuilder(); break;
    case 'slot': {
      const s = +t.dataset.slot, i = BLD.f.slots.indexOf(s);
      if(i >= 0) BLD.f.slots.splice(i, 1); else BLD.f.slots.push(s);
      BLD.limit = BLD_PAGE; bldEl('bld-hex').innerHTML = bldHexHtml(); bldRenderGrid(); break;
    }
    case 'slot-all': BLD.f.slots = []; BLD.limit = BLD_PAGE; bldEl('bld-hex').innerHTML = bldHexHtml(); bldRenderGrid(); break;
    case 'pop-set': bldOpen('set'); break;
    case 'set': {
      const sets = BLD.f.sets;
      if(!id) BLD.f.sets = [];
      else if(BLD.f.multi){ const i = sets.indexOf(id); if(i >= 0) sets.splice(i, 1); else sets.push(id); }
      else BLD.f.sets = [id];
      if(BLD.f.multi){ bldRenderOverlay(); bldRefilter(); } else { bldClose(); bldRefilter(); }
      break;
    }
    case 'set-multi': BLD.f.multi = t.checked; bldRenderGrid(); break;
    case 'pop-main': bldOpen('main', {x:X+196, y:62}); break;
    case 'main': BLD.f.main = v; bldClose(); bldRefilter(); break;
    case 'pop-sub': {
      const i = +t.dataset.i;
      if(BLD.mode === 'art') bldOpen('artsub', {i, cat:'', pick:f.subs[i].s});
      else bldOpen('sub', {i, x:X+196, y:i%2 ? 142 : 112});
      break;
    }
    case 'sub': f.subs[o.i].s = v; if(!v) f.subs[o.i].min = ''; bldClose(); bldRefilter(); break;
    case 'sub-page': f.subPage = f.subPage ? 0 : 1; bldRenderTop(); break;
    case 'artsub-pick': o.pick = v; bldRenderOverlay(); break;
    case 'artsub-ok': f.subs[o.i].s = o.pick; if(!o.pick) f.subs[o.i].min = ''; bldClose(); bldRefilter(); break;
    case 'pop-sort': bldOpen('sort'); break;
    case 'sort': f.sort = v; bldClose(); bldRefilter(); break;
    case 'dir': f.dir = -f.dir; bldRenderBar(); BLD.limit = BLD_PAGE; bldRenderGrid(); break;
    case 'pop-artcat': bldOpen('artcat', {x:X+120, y:62}); break;
    case 'artcat': BLD.af.cat = v; bldClose(); bldRefilter(); break;
    case 'pop-artmain': bldOpen('artmain', {x:X+300, y:62}); break;
    case 'artmain': BLD.af.main = v; bldClose(); bldRefilter(); break;
    case 'gear': bldOpen('gear'); break;
    case 'clear-f':
      if(BLD.mode === 'rune'){ const {slots, sort, dir} = BLD.f; BLD.f = {...bldRuneFilter(), slots, sort, dir}; }
      else { const {cat, sort, dir} = BLD.af; BLD.af = {...bldArtFilter(), cat, sort, dir}; }
      bldClose(); bldRefilter(); break;
    case 'more': BLD.limit += BLD_PAGE; bldRenderGrid(); break;
    case 'pick-r': {
      if(!m){ bldToast('請先選一隻魔靈', true); return; }
      bldPickRune(id); break;
    }
    case 'pick-a': {
      if(!m){ bldToast('請先選一隻魔靈', true); return; }
      bldPickArt(id); break;
    }
    case 'cell': {
      const key = t.dataset.kind + id;
      bldShowCard(key, t.dataset.side, {kind:t.dataset.kind, slot:+t.dataset.slot});
      break;
    }
    case 'card-x': BLD.card = null; bldRenderCard(); break;
    case 'card-remove': {
      const c = BLD.card;
      if(c.kind === 'r') w.runes[c.slot] = null; else w.arts[c.slot] = null;
      bldAfterPick(); break;
    }
    case 'card-pick': {
      const c = BLD.card, n = +c.key.slice(1);
      if(c.key[0] === 'r') bldPickRune(n); else bldPickArt(n);
      break;
    }
    case 'reset-game': BLD.work = bldCurrent(m); bldClose(); bldAfterPick(); break;
    case 'reset-plan': BLD.work = bldBase(m); bldClose(); bldAfterPick(); break;
    case 'update-data': bldClose(); window.bldUpdateData(); break;
    case 'clear-all':
      if(!m) return;
      if(BLD.mode === 'rune') BLD.work.runes = {1:null,2:null,3:null,4:null,5:null,6:null};
      else BLD.work.arts = [null,null];
      bldAfterPick(); break;
    case 'apply': bldApply(); break;
    case 'apply-skip':
      try { if(t.checked) localStorage.setItem(BLD_SKIP_KEY, bldToday()); else localStorage.removeItem(BLD_SKIP_KEY); } catch(e) {}
      break;
    case 'apply-yes': bldCommit(true, o && o.next); break;
    case 'apply-no': if(o && o.next) bldCommit(false, o.next); else bldClose(); break;
    case 'plan-edit': BLD.view = 'edit'; bldLoad(uid); renderBuilder(); break;
    case 'plan-del': {
      const p = bldPlans()[uid]; if(!p) return;
      if(!confirm(`刪除 ${p.name} 的存檔？`)) return;
      delete BLD_C.plans[uid]; bldPersist();
      if(BLD.uid === uid) bldLoad(uid);
      renderBuilder(); break;
    }
    case 'tick': {
      const p = bldPlans()[uid]; if(!p) return;
      p.done = p.done || {};
      if(t.checked) p.done[t.dataset.key] = true; else delete p.done[t.dataset.key];
      bldPersist(); bldRenderMain(); break;
    }
    case 'hide-done': BLD.hideDone = t.checked; bldRenderMain(); break;
    case 'plans-export': bldExportPlans(); break;
    case 'plans-import': bldEl('bld-import').click(); break;
  }
}
function bldPickRune(id){
  const m = bldMon(), w = BLD.work, r = runeById(id), base = bldBase(m).runes[r.slot] || null;
  w.runes[r.slot] = w.runes[r.slot] !== id ? id : (id === base ? null : base);
  bldAfterPick();
}
function bldPickArt(id){
  const m = bldMon(), w = BLD.work, a = artById(id), i = a.cat === '屬性' ? 0 : 1, base = bldBase(m).arts[i] || null;
  if(!bldArtFits(a, m)){ bldToast(`${m.name} 不能裝這個魔礦`, true); return; }
  w.arts[i] = w.arts[i] !== id ? id : (id === base ? null : base);
  bldAfterPick();
}
function bldInput(e){
  const el = e.target, f = bldFilter();
  if(el.id === 'bld-monq'){ BLD.mon.q = el.value; BLD.mon.limit = 150; bldRenderMonList(); return; }
  if(el.dataset.act === 'artsub-cat'){ BLD.overlay.cat = el.value; bldRenderOverlay(); return; }
  if(el.dataset.submin !== undefined){ f.subs[+el.dataset.submin].min = el.value; }
  else if(el.dataset.f){ f[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value; }
  else return;
  BLD.limit = BLD_PAGE; bldRenderGrid();
}
// 長按：手機和滑鼠都用同一套 pointer 事件
function bldPointerDown(e){
  BLD.skipClick = false;
  clearTimeout(BLD.press);
  const t = e.target.closest('[data-tip]'); if(!t) return;
  BLD.pressAt = [e.clientX, e.clientY];
  BLD.press = setTimeout(() => {
    BLD.skipClick = true;
    const key = t.dataset.tip, id = +key.slice(1), w = BLD.work, m = bldMon();
    const sel = !!m && (key[0] === 'r' ? w.runes[(runeById(id)||{}).slot] === id : w.arts.includes(id));
    bldShowCard(key, 'grid', {selected:sel});
  }, 420);
}
function bldPointerMove(e){
  if(BLD.pressAt && Math.hypot(e.clientX-BLD.pressAt[0], e.clientY-BLD.pressAt[1]) > 8) clearTimeout(BLD.press);
}
const bldPointerUp = () => clearTimeout(BLD.press);

// 畫面依可用空間等比縮放；手機鎖定直向時整個轉 90 度，側著拿一樣是橫向畫面
function bldFit(){
  const stage = bldEl('bld-stage'), host = bldEl('bld-main');
  if(!stage || !host) return;
  const app = parseFloat($('#app').style.zoom) || 1;
  const nav = document.querySelector('nav');
  const cs = getComputedStyle(bldEl('bld'));
  const padX = (parseFloat(cs.paddingLeft)||0) + (parseFloat(cs.paddingRight)||0);
  const padY = (parseFloat(cs.paddingTop)||0) + (parseFloat(cs.paddingBottom)||0);
  const top = nav ? nav.getBoundingClientRect().bottom : 0;
  let aw = innerWidth - padX*app, ah = innerHeight - top - padY*app;
  const rotate = bldPhone() && ah > aw;
  if(rotate) [aw, ah] = [ah, aw];
  const s = Math.max(.4, Math.min(aw/BLD_W, ah/BLD_H, 2.4)) / app;
  stage.style.zoom = s;
  stage.classList.toggle('rot', rotate);
}
function renderBuilder(){
  bldSync();
  if(!BLD.restored){
    BLD.restored = true;
    try {
      const s = JSON.parse(localStorage.getItem('sw-tool:build-filter') || 'null');
      if(s){ Object.assign(BLD.f, s.f); Object.assign(BLD.af, s.af); }
    } catch(e) {}
  }
  if(!BLD.uid){
    let last = 0; try { last = +localStorage.getItem(bldKey()+':last'); } catch(e) {}
    if(last && bldMonById(last)) bldLoad(last);
  }
  $('#app').innerHTML = `<div class="bld" id="bld">${BLD_ART_DEFS}<div id="bld-main"></div></div>`;
  const root = bldEl('bld');
  root.addEventListener('click', bldClick);
  root.addEventListener('input', bldInput);
  root.addEventListener('change', e => { if(e.target.id === 'bld-import' && e.target.files[0]) bldImportPlans(e.target.files[0]); });
  root.addEventListener('keydown', e => { if(e.key === 'Escape' && BLD.overlay) bldClose(); });
  root.addEventListener('pointerdown', bldPointerDown);
  root.addEventListener('pointermove', bldPointerMove);
  root.addEventListener('pointerup', bldPointerUp);
  root.addEventListener('pointercancel', bldPointerUp);
  root.addEventListener('contextmenu', e => { if(e.target.closest('[data-tip]')) e.preventDefault(); });
  // 滑鼠：移上去就看卡片，移開收起
  root.addEventListener('mouseover', e => {
    if(bldPhone() || !matchMedia('(hover:hover)').matches || BLD.overlay) return;
    const t = e.target.closest('[data-tip]');
    if(t){ if(!BLD.card || BLD.card.hover){ bldShowCard(t.dataset.tip, 'hover', {hover:true}); } }
    else if(BLD.card && BLD.card.hover){ BLD.card = null; bldRenderCard(); }
  });
  bldRenderMain();
  if(BLD.view === 'edit' && !BLD.uid) bldOpen('mon');
}
function bldRenderMain(){
  const el = bldEl('bld-main'); if(!el) return;
  if(BLD.view === 'saved'){ el.className = 'bld-saved'; el.innerHTML = bldSavedHtml(); return; }
  el.className = 'bld-host';
  el.innerHTML = `<div class="gs" id="bld-stage">
    <div class="g-left" id="bld-left">${bldLeftHtml()}</div>
    <div class="g-right">${bldRightHtml()}</div>
    <div id="bld-card">${bldCardHtml()}</div>
    <div id="bld-ov"></div>
  </div>`;
  bldEl('bld-savedn').textContent = Object.keys(bldPlans()).length || '';
  bldRenderGrid();
  bldFit();
  if(BLD.overlay) bldRenderOverlay();
}
addEventListener('resize', () => { if(bldEl('bld-stage')) bldFit(); });
