// ===== 符文配置：模擬遊戲內「Manage」畫面，先在這裡配好符文/魔礦並暫存，再開遊戲照著換 =====
// 面板三段數字跟遊戲一樣：白字基礎值 / 綠字＝目前實際裝備帶來的加成 / 青字 ▲＝換成這份配置後的變化。
// 「目前實際裝備」來自最後一次 SWEX 匯出，所以重新匯出後，存檔裡已經換好的項目會自動變成「已在身上」。
// 存檔放在瀏覽器 localStorage（依帳號分開），可用「匯出存檔」備份成 JSON。
// 本檔在主程式之前載入，只宣告函式；DATA、$、runeById 等主程式的東西都是執行時才用到。

const BLD_KEY = 'sw-tool:builds';
const BLD_PAGE = 240;                 // 符文/魔礦格一次畫幾個（全部 5000 顆一次畫出來太慢）
const BLD_STAT_KEY = {1:'hp_f',2:'hp_p',3:'atk_f',4:'atk_p',5:'def_f',6:'def_p',8:'spd',9:'cr',10:'cd',11:'res',12:'acc'};
const BLD_STAT_NAME = {1:'HP',2:'HP%',3:'ATK',4:'ATK%',5:'DEF',6:'DEF%',8:'速度',9:'爆擊率',10:'爆擊傷害',11:'效果抵抗',12:'效果命中'};
const BLD_SUB_ORDER = [8,2,4,6,9,10,11,12,1,3,5];
// parse.py 的 fmt_stat 寫進 r.innate 的屬性名（綴屬只有文字，篩選時用字首比對）
const BLD_INNATE_NAME = {1:'HP',2:'HP%',3:'ATK',4:'ATK%',5:'DEF',6:'DEF%',8:'SPD',9:'爆率',10:'爆傷',11:'抵抗',12:'命中'};
const BLD_PANEL = [['hp','體力'],['atk','攻擊力'],['def','防禦力'],['spd','速度'],
                   ['cr','爆擊率'],['cd','爆擊傷害'],['res','效果抵抗'],['acc','效果命中']];
const BLD_RUNE_SORT = [['score','Score'],['eff','效率'],['spd','速度'],['cr','爆擊率'],['cd','爆擊傷害'],
  ['hp_p','HP%'],['atk_p','ATK%'],['def_p','DEF%'],['res','效果抵抗'],['acc','效果命中'],
  ['hp_f','HP 固定值'],['atk_f','ATK 固定值'],['def_f','DEF 固定值'],['lv','強化等級'],
  ['gain_hp','實際 HP（此魔靈）'],['gain_atk','實際 ATK（此魔靈）'],['gain_def','實際 DEF（此魔靈）']];
const BLD_SORT_TAG = {spd:'速',cr:'爆率',cd:'爆傷',hp_p:'HP',atk_p:'ATK',def_p:'DEF',res:'抵抗',acc:'命中',
                      hp_f:'HP',atk_f:'ATK',def_f:'DEF',gain_hp:'HP',gain_atk:'ATK',gain_def:'DEF'};
const BLD_ATTRS = ['水','火','風','光','暗'];
const BLD_ARCHS = ['攻擊型','防禦型','體力型','輔助型'];

const bldNewSubs = () => [0,1,2,3].map(() => ({s:'', min:''}));
const bldRuneFilter = () => ({sets:[], slot:'', main:'', subs:bldNewSubs(), subRows:2, sort:'score', dir:-1,
  stars:'', ancient:'', q:'', minLv:'', minScore:'', minEff:'', innate:'', mod:'', loc:'', owner:'',
  hideUsed:false, hideLocked:false, showSold:false});
const bldArtFilter = () => ({cat:'屬性', fit:true, main:'', subs:bldNewSubs(), subRows:2, sort:'dmg', dir:-1,
  loc:'', owner:'', hideUsed:false, hideLocked:false});

let BLD = {view:'edit', mode:'rune', uid:null, work:null, f:bldRuneFilter(), af:bldArtFilter(),
  adv:false, top:false, info:null, longPress:false, setPop:false, artEff:false, limit:BLD_PAGE, dataRef:null,
  mon:{open:false, q:'', attr:'', arch:'', saved:false, limit:150}, hideDone:false};
let BLD_C = {data:null, plansKey:null, plans:{}, used:null, owner:null, sets:null, artSubs:null};

// ---------- 小工具 ----------
const bldEsc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// 手機版的圖示放在資料檔裡（window.BLD_ICONS），網站版直接讀 img/
const bldImg = f => (window.BLD_ICONS && BLD_ICONS[f]) || `img/monsters/${encodeURIComponent(f||'')}`;
const bldSetImg = en => { const k = String(en||'').toLowerCase() + '.png'; return (window.BLD_ICONS && BLD_ICONS['rune:'+k]) || `img/runes/${k}`; };
const bldPhone = () => document.body.classList.contains('swm');
const bldNow = () => new Date().toLocaleString('zh-Hant', {hour12:false});
const bldFilter = () => BLD.mode === 'rune' ? BLD.f : BLD.af;
function bldToast(msg, bad){
  let t = document.getElementById('bld-toast');
  if(!t){ t = document.createElement('div'); t.id = 'bld-toast'; document.body.appendChild(t); }
  t.textContent = msg; t.className = bad ? 'on bad' : 'on';
  clearTimeout(bldToast.timer);
  bldToast.timer = setTimeout(() => { t.className = ''; }, 2600);
}
// 遊戲裡六個符文位的形狀：同一個五邊形，每個槽位轉 60 度（1 朝上，順時針到 6）
const BLD_KITE = [[0,-1],[.8,-.2],[.62,.74],[-.62,.74],[-.8,-.2]];
function bldKitePts(slot, cx, cy, r){
  const a = (slot-1)*Math.PI/3, c = Math.cos(a), s = Math.sin(a);
  return BLD_KITE.map(([x,y]) => [cx + r*(x*c - y*s), cy + r*(x*s + y*c)]);
}
const BLD_CLIP = {};
for(let i=1;i<=6;i++) BLD_CLIP[i] = `polygon(${bldKitePts(i,50,50,50).map(([x,y]) => `${x.toFixed(1)}% ${y.toFixed(1)}%`).join(',')})`;

// ---------- 資料索引（換帳號 = DATA 換物件，整組重建）----------
function bldSync(){
  if(BLD.dataRef === DATA) return;
  BLD.dataRef = DATA; BLD.uid = null; BLD.work = null; BLD.limit = BLD_PAGE;
  BLD_C = {data:DATA, plansKey:null, plans:{}, used:null, owner:null, sets:null, artSubs:null};
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
function bldSets(){
  if(BLD_C.sets) return BLD_C.sets;
  const by = {};
  DATA.runes.forEach(r => { (by[r.setId] = by[r.setId] || {id:r.setId, name:r.set, en:r.setEn, pieces:r.pieces, n:0}).n++; });
  return BLD_C.sets = Object.values(by).sort((a,b) => b.n - a.n);
}
function bldArtSubs(){
  if(BLD_C.artSubs) return BLD_C.artSubs;
  const by = {};
  DATA.artifacts.forEach(a => a.subs.forEach(s => { by[s.sid] = s.name; }));
  return BLD_C.artSubs = Object.entries(by).map(([k,v]) => [+k, v]).sort((a,b) => a[0]-b[0]);
}
// 目前實際裝備（最後一次匯出時身上的東西）
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

// ---------- 存檔 ----------
function bldKey(){ return ACCT.path && ACCT.path !== ACCT.builtinPath ? BLD_KEY + ':' + ACCT.path : BLD_KEY; }
function bldPlans(){
  const k = bldKey();
  if(BLD_C.plansKey === k) return BLD_C.plans;
  BLD_C.plansKey = k; BLD_C.plans = {}; BLD_C.used = null;
  try { BLD_C.plans = JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch(e) {}
  return BLD_C.plans;
}
function bldPersist(){
  BLD_C.used = null;
  try { localStorage.setItem(bldKey(), JSON.stringify(BLD_C.plans)); return true; }
  catch(e){ bldToast('存檔失敗：瀏覽器無法寫入（' + e.message + '）', true); return false; }
}
// 哪顆符文/魔礦被哪些存檔用了：'r'+id / 'a'+id -> [{uid,name,label,img,slot}]
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
function bldLoad(uid){
  const m = bldMonById(uid); if(!m) return;
  BLD.uid = uid;
  const p = bldPlans()[uid];
  BLD.work = p ? bldCopy({runes:p.runes, arts:p.arts||[null,null]}) : bldCurrent(m);
  BLD.artEff = false;
}
function bldSave(){
  const m = bldMon(); if(!m) return;
  const w = BLD.work;
  if(![1,2,3,4,5,6].some(s => w.runes[s]) && !w.arts.some(Boolean)){ bldToast('這份配置是空的，沒有東西可以存', true); return; }
  const plans = bldPlans(), old = plans[m.uid];
  plans[m.uid] = {uid:m.uid, name:m.name, label:m.label, img:m.img, runes:{...w.runes}, arts:[...w.arts],
                  done:old ? old.done || {} : {}, savedAt:bldNow()};
  if(!bldPersist()) return;
  const n = bldConflicts(m.uid).length;
  bldToast(n ? `已儲存（有 ${n} 項和其他存檔重複）` : '已儲存');
  bldRenderMain();
}
// 這份配置裡，同時也被其他存檔用到的項目
function bldConflicts(uid){
  const w = uid === BLD.uid && BLD.work ? BLD.work : bldPlans()[uid];
  if(!w) return [];
  const out = [];
  [1,2,3,4,5,6].forEach(s => {
    const id = w.runes[s]; if(!id) return;
    const o = bldOthers('r'+id, uid);
    if(o.length){ const r = runeById(id); out.push({label: r ? `${r.set} ${s}號位` : `${s}號位`, others:o}); }
  });
  (w.arts||[]).forEach((id,i) => {
    if(!id) return;
    const o = bldOthers('a'+id, uid);
    if(o.length) out.push({label: i ? '類型魔礦' : '屬性魔礦', others:o});
  });
  return out;
}

// ---------- 面板數值（公式同 game_mechanics.json「面板數值計算」，百分比那段無條件進位）----------
function bldCalc(m, load){
  const acc = {hp_f:0,hp_p:0,atk_f:0,atk_p:0,def_f:0,def_p:0,spd:0,spd_p:0,cr:0,cd:0,res:0,acc:0};
  const count = {};
  [1,2,3,4,5,6].forEach(s => {
    const r = load.runes[s] ? runeById(load.runes[s]) : null; if(!r) return;
    Object.entries(r.contrib||{}).forEach(([k,v]) => { if(k in acc) acc[k] += v; });
    (count[r.setId] = count[r.setId] || {n:0, r}).n++;
  });
  const sets = [];
  Object.entries(count).forEach(([sid,{n,r}]) => {
    const need = r.pieces || 2, times = Math.floor(n/need), sb = DATA.setBonus[sid];
    if(sb && times) acc[sb[0]] = (acc[sb[0]]||0) + sb[1]*times;
    sets.push({name:r.set, en:r.setEn, n, need, on:times>0});
  });
  load.arts.forEach(id => { const a = id ? artById(id) : null; if(a && a.mainKey) acc[a.mainKey] += a.mainVal; });
  const b = m.base, rp = b.rp || {};
  return {sets: sets.sort((x,y) => y.on-x.on || y.n-x.n), add:{
    hp:  pctUp(b.hp,  acc.hp_p  + (rp.hp||0))  + acc.hp_f,
    atk: pctUp(b.atk, acc.atk_p + (rp.atk||0)) + acc.atk_f,
    def: pctUp(b.def, acc.def_p + (rp.def||0)) + acc.def_f,
    spd: pctUp(b.spd, acc.spd_p) + acc.spd,
    cr: acc.cr, cd: acc.cd, res: acc.res, acc: acc.acc}};
}
const bldPct = k => ['cr','res','acc'].includes(k);     // 這三項面板上限 100%，超過的另外標 (+N)
function bldPctText(v, k){
  if(!bldPct(k) || v < 100) return `${v}%`;
  return `<span class="capped">100%</span>${v>100?`<small>(+${v-100})</small>`:''}`;
}
function bldDelta(d){
  if(!d) return '';
  return d > 0 ? `<span class="up">▲${d}</span>` : `<span class="dn">▼${-d}</span>`;
}

// ---------- 篩選 ----------
function bldRuneVal(r, key, m){
  if(key === 'score') return r.score;
  if(key === 'eff') return r.eff;
  if(key === 'lv') return r.lv;
  const c = r.contrib || {};
  if(key.startsWith('gain_')){
    const k = key.slice(5);
    return (m ? pctUp(m.base[k], c[k+'_p']||0) : 0) + (c[k+'_f']||0);
  }
  return c[key] || 0;
}
function bldRuneList(){
  const f = BLD.f, m = bldMon(), own = bldOwnerMap();
  const subs = f.subs.slice(0, f.subRows).filter(x => x.s);
  const minLv = +f.minLv||0, minScore = +f.minScore||0, minEff = +f.minEff||0;
  const ownerQ = f.owner.trim().toLowerCase();
  const innateName = BLD_INNATE_NAME[f.innate];
  const list = DATA.runes.filter(r => {
    if(f.sets.length && !f.sets.includes(r.setId)) return false;
    if(f.slot && r.slot !== +f.slot) return false;
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
    if(innateName && !(r.innate||'').startsWith(innateName + ' +')) return false;
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
  const val = new Map(list.map(r => [r.id, bldRuneVal(r, f.sort, m)]));
  return list.sort((a,b) => (val.get(a.id)-val.get(b.id))*f.dir || b.score-a.score);
}
const bldArtSub = (a, sid) => (a.subs.find(s => s.sid === sid) || {}).val || 0;
function bldArtVal(a, key){
  if(key.startsWith('sub:')) return bldArtSub(a, +key.slice(4));
  return a[key] || 0;
}
const bldArtFits = (a, m) => !a.target || a.target === (a.cat === '屬性' ? m.attr : m.arch);
function bldArtList(){
  const f = BLD.af, m = bldMon(), own = bldOwnerMap();
  const subs = f.subs.slice(0, f.subRows).filter(x => x.s);
  const ownerQ = f.owner.trim().toLowerCase();
  const list = DATA.artifacts.filter(a => {
    if(a.cat !== f.cat) return false;
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
  const val = new Map(list.map(a => [a.id, bldArtVal(a, f.sort)]));
  return list.sort((a,b) => (val.get(a.id)-val.get(b.id))*f.dir || b.dmg-a.dmg);
}

// ---------- 格子 ----------
function bldRuneShape(r, slot){
  return `<span class="bt-rune${r && r.ancient ? ' anc' : ''}" style="clip-path:${BLD_CLIP[slot]}">${r ? `<img src="${bldSetImg(r.setEn)}" alt="">` : ''}</span>`;
}
function bldTileRune(r){
  const f = BLD.f, m = bldMon(), w = BLD.work;
  const sel = w && w.runes[r.slot] === r.id;
  const others = bldOthers('r'+r.id, BLD.uid);
  const v = bldRuneVal(r, f.sort, m);
  const tag = f.sort === 'lv' ? '' : f.sort === 'score' ? String(v) : f.sort === 'eff' ? `${v.toFixed(1)}%`
            : `${BLD_SORT_TAG[f.sort]} ${v}${/_p$|^(cr|cd|res|acc)$/.test(f.sort) ? '%' : ''}`;
  return `<div class="bt${sel?' sel':''}${others.length?' used':''}" data-act="pick-r" data-id="${r.id}" data-tip="r${r.id}">
    <span class="bt-stars${r.lv>=15?' max':''}">${'★'.repeat(r.stars)}</span>
    ${bldRuneShape(r, r.slot)}
    <span class="bt-lv">+${r.lv}</span>
    ${r.ownerImg ? `<img class="bt-own" src="${bldImg(r.ownerImg)}" loading="lazy" alt="">` : ''}
    ${tag ? `<span class="bt-val">${tag}</span>` : ''}
    ${others.length ? `<span class="bt-plan"><img src="${bldImg(others[0].img)}" loading="lazy" alt=""><b>📌</b></span>` : ''}
    ${r.locked ? '<span class="bt-lock">🔒</span>' : ''}
  </div>`;
}
function bldArtGlyph(a){
  return `<span class="bt-art t-${bldEsc(a.target||'any')}">${bldEsc(a.main.split(' ')[0])}</span>`;
}
function bldTileArt(a){
  const f = BLD.af, w = BLD.work;
  const i = a.cat === '屬性' ? 0 : 1;
  const sel = w && w.arts[i] === a.id;
  const others = bldOthers('a'+a.id, BLD.uid);
  const v = bldArtVal(a, f.sort);
  const tag = f.sort === 'lv' ? '' : f.sort === 'rolls' ? `強化 ${v}` : f.sort.startsWith('sub:') ? `${v}%` : String(v);
  return `<div class="bt${sel?' sel':''}${others.length?' used':''}" data-act="pick-a" data-id="${a.id}" data-tip="a${a.id}">
    <span class="bt-stars art">${bldEsc(a.target||'通用')} ${bldEsc(a.main.split(' ')[1]||'')}</span>
    ${bldArtGlyph(a)}
    <span class="bt-lv">+${a.lv}</span>
    ${a.ownerImg ? `<img class="bt-own" src="${bldImg(a.ownerImg)}" loading="lazy" alt="">` : ''}
    ${tag ? `<span class="bt-val">${tag}</span>` : ''}
    ${others.length ? `<span class="bt-plan"><img src="${bldImg(others[0].img)}" loading="lazy" alt=""><b>📌</b></span>` : ''}
    ${a.locked ? '<span class="bt-lock">🔒</span>' : ''}
  </div>`;
}
// 左邊用的小格：方案列、Before/After
function bldMiniRune(id, slot, act){
  const r = id ? runeById(id) : null;
  return `<div class="mt${r?'':' empty'}" ${act?`data-act="${act}" data-slot="${slot}"`:''} ${r?`data-tip="r${id}"`:''}>
    ${bldRuneShape(r, slot)}<span class="mt-n">${slot}</span>${r ? `<span class="mt-lv">+${r.lv}</span>` : ''}
    ${r && r.ownerImg ? `<img class="mt-own" src="${bldImg(r.ownerImg)}" alt="">` : ''}
  </div>`;
}
function bldMiniArt(id, i, act){
  const a = id ? artById(id) : null;
  return `<div class="mt${a?'':' empty'}" ${act?`data-act="${act}" data-idx="${i}"`:''} ${a?`data-tip="a${id}"`:''}>
    ${a ? bldArtGlyph(a) : `<span class="bt-art t-none">${i?'類':'屬'}</span>`}${a ? `<span class="mt-lv">+${a.lv}</span>` : ''}
    ${a && a.ownerImg ? `<img class="mt-own" src="${bldImg(a.ownerImg)}" alt="">` : ''}
  </div>`;
}

// ---------- 左側：魔靈面板 ----------
function bldStarClass(m){ return m.awaken >= 2 ? 'a2' : m.awaken ? '' : 'a0'; }
function bldLeftHtml(){
  const m = bldMon();
  if(!m) return `<div class="bld-noneselect"><p>先選一隻魔靈</p><button class="bld-apply" data-act="mon">選擇魔靈</button></div>`;
  const cur = bldCurrent(m), w = BLD.work, c = bldCalc(m, cur), p = bldCalc(m, w), b = m.base;
  const plan = bldPlans()[m.uid];
  const dirty = plan ? !bldSame(w, {runes:plan.runes, arts:plan.arts||[null,null]}) : !bldSame(w, cur);
  const row = ([k,label], gap) => {
    const d = p.add[k] - c.add[k];
    const flat = !['cr','cd','res','acc'].includes(k);
    const now = b[k] + c.add[k], next = b[k] + p.add[k];
    return `<div class="bs${gap?' gap':''}"><span class="bs-l">${label}</span>
      <span class="bs-v">${flat ? b[k] : bldPctText(now, k)}</span>
      <span class="bs-g">${flat && c.add[k] ? `+${c.add[k]}` : ''}</span>
      <span class="bs-d">${bldDelta(d)}</span>
      <span class="bs-t">${d ? `→ ${flat ? next : bldPctText(next, k)}` : ''}</span></div>`;
  };
  const before = [], after = [];
  [1,2,3,4,5,6].forEach(s => {
    if((cur.runes[s]||null) === (w.runes[s]||null)) return;
    if(cur.runes[s]) before.push(bldMiniRune(cur.runes[s], s, 'revert-r'));
    if(w.runes[s]) after.push(bldMiniRune(w.runes[s], s, 'revert-r'));
  });
  [0,1].forEach(i => {
    if((cur.arts[i]||null) === (w.arts[i]||null)) return;
    if(cur.arts[i]) before.push(bldMiniArt(cur.arts[i], i, 'revert-a'));
    if(w.arts[i]) after.push(bldMiniArt(w.arts[i], i, 'revert-a'));
  });
  const cells = list => list.join('') + '<div class="mt blank"></div>'.repeat(Math.max(0, 8-list.length));
  const conflicts = bldConflicts(m.uid);
  const arts = w.arts.map(id => id ? artById(id) : null).filter(Boolean);
  return `
  <div class="bl-head">
    <button class="bl-pic" data-act="mon" title="更換魔靈"><img src="${bldImg(m.img)}" alt=""><span>更換</span></button>
    <div class="bl-id">
      <div class="bl-name"><span>Lv.${m.level}</span> <b>${bldEsc(m.name)}</b></div>
      <div class="bl-sub">${bldEsc(m.label)}・${bldEsc(m.arch)}</div>
      <div class="bl-stars ${bldStarClass(m)}">${'★'.repeat(m.stars)}</div>
      <button class="bl-arteff" data-act="arteff">${BLD.artEff?'▲':'▼'} 魔礦效果</button>
    </div>
    <div class="bl-rail">
      <button data-act="mode" data-mode="rune" class="${BLD.mode==='rune'?'on':''}" title="符文"><svg viewBox="0 0 24 24"><polygon points="${bldKitePts(1,12,12,10).map(x=>x.join(',')).join(' ')}"/></svg></button>
      <button data-act="mode" data-mode="art" class="${BLD.mode==='art'?'on':''}" title="魔礦"><svg viewBox="0 0 24 24"><rect x="5.5" y="5.5" width="13" height="13" rx="2" transform="rotate(45 12 12)"/></svg></button>
    </div>
  </div>
  ${BLD.artEff ? `<div class="bl-effs">${arts.length ? arts.map(a => `<div><b>${bldEsc(a.target||'通用')} ${bldEsc(a.main)}</b>${a.subs.map(s => `<span>${bldEsc(s.name)} +${s.val}%</span>`).join('')}</div>`).join('') : '<div class="dim">這份配置沒有裝魔礦</div>'}</div>` : ''}
  <div class="bl-stats">${BLD_PANEL.map((x,i) => row(x, i===4)).join('')}</div>
  <div class="bl-sets">${p.sets.length ? p.sets.map(s => `<span class="${s.on?'on':''}"><img src="${bldSetImg(s.en)}" alt="">${s.name} ${s.n}/${s.need}</span>`).join('') : '<span>沒有裝符文</span>'}</div>
  <div class="bl-strip">
    ${[1,2,3,4,5,6].map(s => bldMiniRune(w.runes[s], s, 'goto-r')).join('')}
    <i></i>
    ${[0,1].map(i => bldMiniArt(w.arts[i], i, 'goto-a')).join('')}
  </div>
  <div class="bl-tools">
    <button data-act="reset-game" title="回到遊戲裡目前的裝備">↺ 目前裝備</button>
    ${plan ? '<button data-act="reset-plan" title="放棄這次修改，回到上次儲存的內容">↺ 上次存檔</button>' : ''}
    <button data-act="clear-all" title="全部卸下">✕ 全部卸下</button>
  </div>
  <div class="bl-ba">
    <div><h5>Before</h5><div class="mt-grid">${cells(before)}</div></div>
    <span class="bl-arrow">›</span>
    <div><h5>After</h5><div class="mt-grid">${cells(after)}</div></div>
  </div>
  ${conflicts.length ? `<div class="bl-warn">${conflicts.map(x => `⚠ ${bldEsc(x.label)} 已被 <b>${x.others.map(o => bldEsc(o.name)).join('、')}</b> 的存檔使用`).join('<br>')}</div>` : ''}
  <div class="bl-save">
    <button class="bld-apply" data-act="save">儲存</button>
    <span class="bl-state${dirty?' dirty':''}">${dirty ? '有未儲存的變更' : plan ? `已存檔 ${bldEsc(plan.savedAt)}` : '尚未修改'}</span>
  </div>`;
}

// ---------- 右側：篩選 ----------
function bldHex(){
  const f = BLD.f, m = bldMon(), w = BLD.work, cur = m ? bldCurrent(m) : null;
  const R = 44, D = 70, C = 110;
  const cells = [1,2,3,4,5,6].map(s => {
    const a = (s-1)*Math.PI/3, x = C + D*Math.sin(a), y = C - D*Math.cos(a);
    const on = String(f.slot) === String(s);
    const changed = w && cur && (w.runes[s]||null) !== (cur.runes[s]||null);
    return `<g data-act="slot" data-slot="${s}" class="hx${on?' on':''}"><polygon points="${bldKitePts(s,x,y,R*.82).map(p => p.map(n => n.toFixed(1)).join(',')).join(' ')}"/>
      <text x="${x.toFixed(1)}" y="${y.toFixed(1)}">${s}</text>${changed?`<circle cx="${(x+15).toFixed(1)}" cy="${(y-13).toFixed(1)}" r="5"/>`:''}</g>`;
  }).join('');
  return `<svg class="bld-hex" viewBox="0 0 220 220">${cells}
    <g data-act="slot" data-slot="" class="hx mid${f.slot?'':' on'}"><circle cx="${C}" cy="${C}" r="24"/><text x="${C}" y="${C}">全部</text></g></svg>`;
}
function bldSetBtn(){
  const sel = BLD.f.sets.map(id => bldSets().find(s => s.id === id)).filter(Boolean);
  if(!sel.length) return '<b>全部套裝</b>';
  return `<img src="${bldSetImg(sel[0].en)}" alt=""><b>${sel[0].name}${sel.length>1?` +${sel.length-1}`:''}</b>`;
}
function bldSetPop(){
  const f = BLD.f;
  return `<div class="bld-setpop">
    <div class="sp-top"><button data-act="set-all" class="${f.sets.length?'':'on'}">全部套裝</button><span>可複選</span><button data-act="set-close">完成</button></div>
    <div class="sp-grid">${bldSets().map(s => `<button data-act="set" data-id="${s.id}" class="${f.sets.includes(s.id)?'on':''}"><img src="${bldSetImg(s.en)}" alt=""><span>${s.name}</span><small>${s.n}</small></button>`).join('')}</div>
  </div>`;
}
const bldOpt = (v, label, cur) => `<option value="${bldEsc(v)}"${String(cur)===String(v)?' selected':''}>${bldEsc(label)}</option>`;
function bldSubRows(opts){
  const f = bldFilter();
  return f.subs.slice(0, f.subRows).map((x,i) => `<div class="bf-sub">
    <select data-sub="${i}">${bldOpt('', '全部', x.s)}${opts.map(([id,n]) => bldOpt(id, n, x.s)).join('')}</select>
    <input type="number" min="0" data-submin="${i}" value="${bldEsc(x.min)}" placeholder="≥ 數值" title="這條副屬性至少要多少（空白＝只要有就好）">
  </div>`).join('');
}
function bldMainOpts(){
  const f = BLD.f, ids = new Set();
  DATA.runes.forEach(r => { if(!f.slot || r.slot === +f.slot) ids.add(r.mainId); });
  return [...BLD_SUB_ORDER].filter(id => ids.has(id));
}
function bldTopHtml(){
  const f = bldFilter();
  if(BLD.mode === 'rune'){
    return `<div class="bf-left">
        <div class="bf-setwrap"><button class="bf-set" data-act="set-pop">${bldSetBtn()}<em>▼</em></button>${BLD.setPop?bldSetPop():''}</div>
        <div id="bld-hexbox">${bldHex()}</div>
      </div>
      <div class="bf-right">
        <h4>主屬性 <button class="bf-clear" data-act="clear-f">清除條件</button></h4>
        <select data-f="main">${bldOpt('', '全部', f.main)}${bldMainOpts().map(id => bldOpt(id, BLD_STAT_NAME[id], f.main)).join('')}</select>
        <h4>副屬性 <button data-act="sub-more" title="${f.subRows>2?'收合成 2 條':'展開成 4 條'}">${f.subRows>2?'▤':'▦'}</button></h4>
        ${bldSubRows(BLD_SUB_ORDER.map(id => [id, BLD_STAT_NAME[id]]))}
      </div>`;
  }
  const m = bldMon(), w = BLD.work;
  const artBtn = (cat, i) => {
    const a = w && w.arts[i] ? artById(w.arts[i]) : null;
    return `<button class="bf-cat${f.cat===cat?' on':''}" data-act="art-cat" data-cat="${cat}"><b>${cat}魔礦</b><small>${a ? bldEsc(a.main) : '未裝'}</small></button>`;
  };
  return `<div class="bf-left">
      ${artBtn('屬性',0)}${artBtn('類型',1)}
      <label class="bf-check"><input type="checkbox" data-f="fit"${f.fit?' checked':''}> 只看${m?`「${bldEsc(f.cat==='屬性'?m.attr:m.arch)}」`:'這隻'}可裝的</label>
    </div>
    <div class="bf-right">
      <h4>主屬性 <button class="bf-clear" data-act="clear-f">清除條件</button></h4>
      <select data-f="main">${bldOpt('', '全部', f.main)}${bldOpt('hp_f','HP',f.main)}${bldOpt('atk_f','ATK',f.main)}${bldOpt('def_f','DEF',f.main)}</select>
      <h4>副屬性 <button data-act="sub-more" title="${f.subRows>2?'收合成 2 條':'展開成 4 條'}">${f.subRows>2?'▤':'▦'}</button></h4>
      ${bldSubRows(bldArtSubs())}
    </div>`;
}
function bldAdvHtml(){
  const f = bldFilter(), rune = BLD.mode === 'rune';
  const common = `
    <label>所在位置 <select data-f="loc">${bldOpt('', '全部', f.loc)}${bldOpt('inv','倉庫',f.loc)}${bldOpt('eq','已裝備',f.loc)}${bldOpt('self','這隻身上',f.loc)}</select></label>
    <label>裝備者 <input data-f="owner" value="${bldEsc(f.owner)}" placeholder="魔靈名稱"></label>
    <label class="ck"><input type="checkbox" data-f="hideUsed"${f.hideUsed?' checked':''}> 隱藏已被其他存檔使用</label>
    <label class="ck"><input type="checkbox" data-f="hideLocked"${f.hideLocked?' checked':''}> 隱藏已鎖定</label>`;
  if(!rune) return `<div class="bld-adv">${common}</div>`;
  return `<div class="bld-adv">
    <label>星數 <select data-f="stars">${bldOpt('', '全部', f.stars)}${[6,5,4,3,2,1].map(n => bldOpt(n, n+'★', f.stars)).join('')}</select></label>
    <label>古代 <select data-f="ancient">${bldOpt('', '全部', f.ancient)}${bldOpt('yes','古代符文',f.ancient)}${bldOpt('no','一般符文',f.ancient)}</select></label>
    <label>品質 <select data-f="q">${bldOpt('', '全部', f.q)}${['傳說','英雄','稀有','魔法','普通'].map(q => bldOpt(q,q,f.q)).join('')}</select></label>
    <label>強化 ≥ <input type="number" min="0" max="15" data-f="minLv" value="${bldEsc(f.minLv)}"></label>
    <label>Score ≥ <input type="number" min="0" data-f="minScore" value="${bldEsc(f.minScore)}"></label>
    <label>效率 ≥ <input type="number" min="0" data-f="minEff" value="${bldEsc(f.minEff)}"></label>
    <label>綴屬 <select data-f="innate">${bldOpt('', '全部', f.innate)}${bldOpt('any','有綴屬',f.innate)}${bldOpt('none','無綴屬',f.innate)}${BLD_SUB_ORDER.map(id => bldOpt(id, BLD_STAT_NAME[id], f.innate)).join('')}</select></label>
    <label>精煉 <select data-f="mod">${bldOpt('', '全部', f.mod)}${bldOpt('grind','有研磨',f.mod)}${bldOpt('nogrind','沒研磨',f.mod)}${bldOpt('gem','有轉換',f.mod)}${bldOpt('nogem','沒轉換',f.mod)}</select></label>
    ${common}
    <label class="ck"><input type="checkbox" data-f="showSold"${f.showSold?' checked':''}> 顯示已標記賣掉的</label>
  </div>`;
}
// 手機上收起來的篩選條件，用一行字摘要
function bldSummary(){
  const f = bldFilter(), bits = [];
  if(BLD.mode === 'rune'){
    const names = f.sets.map(id => (bldSets().find(s => s.id === id)||{}).name).filter(Boolean);
    bits.push(names.length ? names.join('/') : '全部套裝');
    if(f.slot) bits.push(`${f.slot}號位`);
    if(f.main) bits.push(BLD_STAT_NAME[f.main]);
    f.subs.forEach(x => { if(x.s) bits.push(BLD_STAT_NAME[x.s] + (x.min ? `≥${x.min}` : '')); });
  } else {
    bits.push(`${f.cat}魔礦`);
    if(f.main) bits.push(f.main.split('_')[0].toUpperCase());
    f.subs.forEach(x => { if(x.s) bits.push((bldArtSubs().find(([id]) => id === +x.s)||[])[1] + (x.min ? `≥${x.min}` : '')); });
  }
  return bits.join('・');
}
function bldBarHtml(){
  const f = bldFilter(), rune = BLD.mode === 'rune';
  const sorts = rune ? BLD_RUNE_SORT
    : [['dmg','輸出分'],['tank','坦度分'],['lv','強化等級'],['rolls','強化次數'],...bldArtSubs().map(([id,n]) => ['sub:'+id, n])];
  return `<button class="bb-top${BLD.top?' on':''}" data-act="top"><span id="bld-sum">${bldEsc(bldSummary())}</span><em>▼</em></button>
    <button class="bb-ic${BLD.adv?' on':''}" data-act="adv" title="更多條件">⚙</button>
    <select class="bb-sort" data-f="sort">${sorts.map(([k,n]) => bldOpt(k, n, f.sort)).join('')}</select>
    <button class="bb-ic" data-act="dir" title="${f.dir<0?'由大到小':'由小到大'}">${f.dir<0?'↓':'↑'}</button>
    <button class="bb-clear" data-act="clear-f">清除條件</button>
    <span class="bb-count" id="bld-count"></span>`;
}
function bldRightHtml(){
  return `<div class="br-title">管理</div>
    <div class="br-top${BLD.top?' open':''}" id="bld-top">${bldTopHtml()}</div>
    <div class="br-body">
      <div class="br-bar" id="bld-bar">${bldBarHtml()}</div>
      <div id="bld-advbox">${BLD.adv?bldAdvHtml():''}</div>
      <div class="br-grid" id="bld-grid"></div>
    </div>
    <div class="br-info" id="bld-info">${bldInfoHtml()}</div>`;
}
function bldRenderGrid(){
  const g = document.getElementById('bld-grid'); if(!g) return;
  const rune = BLD.mode === 'rune', list = rune ? bldRuneList() : bldArtList();
  const total = rune ? DATA.runes.length : DATA.artifacts.length;
  const rest = list.length - BLD.limit;
  g.innerHTML = (list.length ? list.slice(0, BLD.limit).map(rune ? bldTileRune : bldTileArt).join('')
                             : '<p class="br-none">沒有符合條件的項目</p>') +
    (rest > 0 ? `<button class="br-more" data-act="more">再顯示 ${Math.min(rest, BLD_PAGE)} 個（還有 ${rest} 個）</button>` : '');
  document.getElementById('bld-count').textContent = `${list.length}/${total}`;
  const sum = document.getElementById('bld-sum'); if(sum) sum.textContent = bldSummary();
}
function bldRenderLeft(){ const el = document.getElementById('bld-left'); if(el) el.innerHTML = bldLeftHtml(); }
function bldRenderTop(){ const el = document.getElementById('bld-top'); if(el) el.innerHTML = bldTopHtml(); }
function bldRenderBar(){
  const el = document.getElementById('bld-bar'); if(el) el.innerHTML = bldBarHtml();
  const adv = document.getElementById('bld-advbox'); if(adv) adv.innerHTML = BLD.adv ? bldAdvHtml() : '';
}
function bldAfterPick(){
  bldTipHide(); bldRenderLeft(); bldRenderGrid();
  const h = document.getElementById('bld-hexbox'); if(h) h.innerHTML = bldHex();
  if(BLD.mode === 'art') bldRenderTop();
}

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
function bldItemRow(p, m, it){
  const done = !!(p.done||{})[it.key];
  const check = it.same ? '<span class="pr-same">✓</span>'
    : `<input type="checkbox" data-act="tick" data-uid="${p.uid}" data-key="${bldEsc(it.key)}"${done?' checked':''}>`;
  const conflict = it.id ? bldOthers((it.kind==='r'?'r':'a')+it.id, p.uid) : [];
  const warn = conflict.length ? `<span class="pr-warn">⚠ 也用於 ${conflict.map(o => bldEsc(o.name)).join('、')}</span>` : '';
  const cls = `pr${it.same?' same':''}${done&&!it.same?' done':''}`;
  if(!it.id){   // 這一格在存檔裡是空的：要把身上那顆卸下來
    const r = it.kind === 'r' ? runeById(it.cur) : artById(it.cur);
    return `<div class="${cls}"><div class="pr-ck">${check}</div>
      ${it.kind==='r' ? bldMiniRune(it.cur, it.slot) : bldMiniArt(it.cur, it.slot)}
      <div class="pr-main"><b>卸下</b> ${r ? bldEsc(it.kind==='r' ? `${r.set} ${r.main}` : r.main) : ''}</div></div>`;
  }
  if(it.kind === 'r'){
    const r = runeById(it.id);
    if(!r) return `<div class="${cls} gone"><div class="pr-ck">${check}</div>${bldMiniRune(null, it.slot)}<div class="pr-main">資料裡找不到這顆符文（可能賣掉了）</div></div>`;
    return `<div class="${cls}" data-tip="r${r.id}"><div class="pr-ck">${check}</div>
      ${bldMiniRune(it.id, it.slot)}
      <div class="pr-main"><b>${bldEsc(r.set)}</b> <span class="pr-star${r.lv>=15?' max':''}">${r.stars}★</span> +${r.lv}${r.ancient?' <em>古代</em>':''}
        <div class="pr-stat">${bldEsc(r.main)}${r.innate?` <span>(${bldEsc(r.innate)})</span>`:''}</div></div>
      <div class="pr-subs">${(r.subs||[]).map(s => `<span>${bldEsc(s)}</span>`).join('')}</div>
      <div class="pr-score">${r.score}</div>
      <div class="pr-where">${it.same ? '<span class="where self">已在身上</span>' : bldWhere(it, m)}${warn}</div></div>`;
  }
  const a = artById(it.id);
  if(!a) return `<div class="${cls} gone"><div class="pr-ck">${check}</div>${bldMiniArt(null, it.slot)}<div class="pr-main">資料裡找不到這個魔礦（可能賣掉了）</div></div>`;
  return `<div class="${cls}" data-tip="a${a.id}"><div class="pr-ck">${check}</div>
    ${bldMiniArt(it.id, it.slot)}
    <div class="pr-main"><b>${bldEsc(a.cat)}魔礦</b> ${bldEsc(a.target||'通用')}<div class="pr-stat">${bldEsc(a.main)}</div></div>
    <div class="pr-subs">${a.subs.map(s => `<span>${bldEsc(s.name)} +${s.val}%</span>`).join('')}</div>
    <div class="pr-score"></div>
    <div class="pr-where">${it.same ? '<span class="where self">已在身上</span>' : bldWhere(it, m)}${warn}</div></div>`;
}
function bldPlanCard(p){
  const m = bldMonById(p.uid), items = bldPlanItems(p, m);
  const todo = items.filter(x => !x.same), finished = todo.filter(x => (p.done||{})[x.key]).length;
  let chips = '';
  if(m){
    const c = bldCalc(m, bldCurrent(m)), n = bldCalc(m, {runes:p.runes, arts:p.arts||[null,null]});
    chips = BLD_PANEL.map(([k,label]) => {
      const d = n.add[k] - c.add[k], pct = !['hp','atk','def','spd'].includes(k), v = m.base[k] + n.add[k];
      return `<span><small>${label}</small><b>${v}${pct?'%':''}</b>${bldDelta(d)}</span>`;
    }).join('');
  }
  const sets = m ? bldCalc(m, {runes:p.runes, arts:p.arts||[null,null]}).sets.filter(s => s.on) : [];
  return `<section class="pc${todo.length && finished===todo.length ? ' alldone' : ''}">
    <header>
      <img src="${bldImg(m ? m.img : p.img)}" alt="">
      <div class="pc-id"><b>${bldEsc(m ? m.name : p.name)}</b><small>${bldEsc(m ? `${m.label}・Lv${m.level}` : '這隻不在目前的資料裡')}・${bldEsc(p.savedAt)}</small>
        <div class="pc-sets">${sets.map(s => `<span><img src="${bldSetImg(s.en)}" alt="">${s.name}</span>`).join('')}</div></div>
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
    const todo = bldPlanItems(p, bldMonById(p.uid)).filter(x => !x.same);
    return todo.some(x => !(p.done||{})[x.key]);
  });
  return `<div class="ps-bar">
      <label><input type="checkbox" data-act="hide-done"${BLD.hideDone?' checked':''}> 隱藏已換完的</label>
      <span class="ps-note">「拆自」的魔靈和「已在身上」都以最後一次匯出為準，重新匯出後會自動更新</span>
      <button data-act="plans-export"${plans.length?'':' disabled'}>匯出存檔</button>
      <button data-act="plans-import">匯入存檔</button>
      <input type="file" id="bld-import" accept=".json,application/json" hidden>
    </div>
    ${shown.length ? shown.map(bldPlanCard).join('') : `<p class="br-none light">${plans.length ? '全部都換完了' : '還沒有存檔。到「配置」選魔靈、挑好符文後按「儲存」，就會出現在這裡。'}</p>`}`;
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

// ---------- 魔靈選擇 ----------
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
  return `${['',...BLD_ATTRS].map(a => `<button data-act="mon-attr" data-v="${a}" class="${s.attr===a?'on':''}">${a||'全部'}</button>`).join('')}
    <span></span>
    ${['',...BLD_ARCHS].map(a => `<button data-act="mon-arch" data-v="${a}" class="${s.arch===a?'on':''}">${a||'全部'}</button>`).join('')}
    <span></span>
    <button data-act="mon-saved" class="${s.saved?'on':''}">有存檔</button>`;
}
function bldRenderMonList(){
  const el = document.getElementById('bld-mlist'); if(!el) return;
  const list = bldMonList(), plans = bldPlans();
  el.innerHTML = list.slice(0, BLD.mon.limit).map(c => `<button class="mc" data-act="mon-pick" data-uid="${c.uid}">
      <img src="${bldImg(c.img)}" loading="lazy" alt="">
      ${plans[c.uid] ? '<i>📌</i>' : ''}
      <span><b>${bldEsc(c.name)}</b><small>${bldEsc(c.label)}・Lv${c.level}</small>
      <small class="mc-r">${c.nRunes ? `${bldEsc(c.sets)}` : '沒裝符文'}</small></span>
    </button>`).join('') + (list.length > BLD.mon.limit ? `<button class="br-more" data-act="mon-more">再顯示（還有 ${list.length - BLD.mon.limit} 隻）</button>` : '');
  document.getElementById('bld-mcount').textContent = `${list.length} 隻`;
}
function bldOpenMon(){
  BLD.mon.open = true; BLD.mon.limit = 150;
  document.getElementById('bld-modal').innerHTML = `<div class="bm" data-act="mon-bg"><div class="bm-panel">
    <div class="bm-top"><input id="bld-monq" value="${bldEsc(BLD.mon.q)}" placeholder="輸入魔靈名稱或族名，例：Clara / 皮耶蕾特"><span id="bld-mcount"></span><button data-act="mon-close">✕</button></div>
    <div class="bm-filters" id="bld-mfilters">${bldMonFiltersHtml()}</div>
    <div class="bm-list" id="bld-mlist"></div></div></div>`;
  bldRenderMonList();
  if(!bldPhone()) document.getElementById('bld-monq').focus();
}
function bldCloseMon(){ BLD.mon.open = false; const el = document.getElementById('bld-modal'); if(el) el.innerHTML = ''; }

// ---------- 懸停資訊卡 ----------
function bldTipEl(){
  let t = document.getElementById('bld-tip');
  if(!t){ t = document.createElement('div'); t.id = 'bld-tip'; document.body.appendChild(t); }
  return t;
}
function bldTipHide(){ const t = document.getElementById('bld-tip'); if(t) t.style.display = 'none'; }
function bldTipUsed(key){
  const o = bldOthers(key, BLD.view === 'edit' ? BLD.uid : null);
  return o.length ? `<div class="tp-warn">${o.map(x => `⚠ 已被 <b>${bldEsc(x.name)}</b> 的存檔使用`).join('<br>')}</div>` : '';
}
function bldTipHtml(tip){
  const id = +tip.slice(1);
  if(tip[0] === 'r'){
    const r = runeById(id); if(!r) return '';
    const ctx = [...new Set((r.usedIn||[]).map(x => `${x.mon}・${x.ctx}`))];
    return `<div class="tp-head"><img src="${bldSetImg(r.setEn)}" alt=""><b>${r.set}</b>
        ${r.ancient?'<span class="anc-badge" title="古代符文">A</span>':''}<span class="qbadge qbadge-${r.q}">${r.q}</span>
        <span class="tp-lv">${r.stars}★ +${r.lv}</span></div>
      <div class="tp-dim">${r.slot}號位・Score ${r.score}・效率 ${r.eff.toFixed(1)}%</div>
      <div class="tp-main">${bldEsc(r.main)}${r.innate?` <span>${bldEsc(r.innate)}</span>`:''}</div>
      <div class="substack">${(r.sub2||[]).map(subLineHtml).join('')}</div>
      <div class="tp-own">${r.owner ? `裝備於 <b>${bldEsc(r.owner)}</b>（${bldEsc(r.ownerLabel)}）` : '在倉庫'}${r.locked?'・🔒 已鎖定':''}</div>
      ${ctx.length ? `<div class="tp-dim">隊伍：${bldEsc(ctx.slice(0,3).join('、'))}${ctx.length>3?` 等 ${ctx.length} 處`:''}</div>` : ''}
      ${bldTipUsed('r'+id)}`;
  }
  const a = artById(id); if(!a) return '';
  return `<div class="tp-head"><b>${a.cat}魔礦</b> <span class="tp-lv">${bldEsc(a.target||'通用')} +${a.lv}</span></div>
    <div class="tp-dim">輸出分 ${a.dmg}・坦度分 ${a.tank}</div>
    <div class="tp-main">${bldEsc(a.main)}</div>
    <div class="tp-subs">${a.subs.map(s => `<div>${bldEsc(s.name)} <b>+${s.val}%</b>${s.rolls?`<small> 強化 ${s.rolls} 次</small>`:''}</div>`).join('')}</div>
    <div class="tp-own">${a.owner ? `裝備於 <b>${bldEsc(a.owner)}</b>（${bldEsc(a.ownerLabel)}）` : '在倉庫'}${a.locked?'・🔒 已鎖定':''}</div>
    ${bldTipUsed('a'+id)}`;
}

// 手機沒有滑鼠懸停：點一下或長按時，把這顆的資料顯示在格子下方這一列
function bldInfoHtml(){
  if(!BLD.info) return '<span class="bi-hint">點一下裝上，長按只看資料</span>';
  const id = +BLD.info.slice(1), key = BLD.info, used = bldOthers(key, BLD.uid);
  const usedHtml = used.length ? `<em>⚠ ${used.map(x => bldEsc(x.name)).join('、')} 的存檔已用</em>` : '';
  if(key[0] === 'r'){
    const r = runeById(id); if(!r) return '';
    return `<div><b>${bldEsc(r.set)}</b> ${r.slot}號位 ${r.stars}★ +${r.lv}${r.ancient?' 古代':''}・Score ${r.score}・效率 ${r.eff.toFixed(0)}%・${r.owner ? bldEsc(r.owner) : '倉庫'}${r.locked?' 🔒':''} ${usedHtml}</div>
      <div><i>${bldEsc(r.main)}</i>${r.innate?` <u>${bldEsc(r.innate)}</u>`:''}　${(r.subs||[]).map(bldEsc).join('　')}</div>`;
  }
  const a = artById(id); if(!a) return '';
  return `<div><b>${bldEsc(a.cat)}魔礦</b> ${bldEsc(a.target||'通用')} +${a.lv}・輸出 ${a.dmg}・坦度 ${a.tank}・${a.owner ? bldEsc(a.owner) : '倉庫'}${a.locked?' 🔒':''} ${usedHtml}</div>
    <div><i>${bldEsc(a.main)}</i>　${a.subs.map(s => `${bldEsc(s.name)} +${s.val}%`).join('　')}</div>`;
}
function bldShowInfo(key){
  BLD.info = key;
  const el = document.getElementById('bld-info'); if(el) el.innerHTML = bldInfoHtml();
}
function bldTouchStart(e){
  BLD.longPress = false;
  clearTimeout(bldTouchStart.timer);
  const t = e.target.closest('[data-tip]'); if(!t) return;
  bldTouchStart.timer = setTimeout(() => { BLD.longPress = true; bldShowInfo(t.dataset.tip); }, 420);
}
const bldTouchEnd = () => clearTimeout(bldTouchStart.timer);

// ---------- 事件 ----------
function bldClick(e){
  if(BLD.longPress){ BLD.longPress = false; return; }     // 長按只看資料，不算點擊
  const tipped = e.target.closest('[data-tip]');
  if(tipped) bldShowInfo(tipped.dataset.tip);
  // 手機：篩選面板蓋在格子上面，點旁邊先收起來，這一下不算選符文
  if(bldPhone() && (BLD.top || BLD.adv) && !e.target.closest('.br-top,.bb-top,#bld-advbox,.bb-ic,.bb-sort')){
    BLD.top = false; BLD.adv = false; BLD.setPop = false;
    document.getElementById('bld-top').classList.remove('open');
    bldRenderBar(); bldRenderGrid();
    return;
  }
  const setWrap = e.target.closest('.bf-setwrap');
  if(BLD.setPop && !setWrap){ BLD.setPop = false; bldRenderTop(); }
  const t = e.target.closest('[data-act]');
  if(!t) return;
  const act = t.dataset.act, id = +t.dataset.id, uid = +t.dataset.uid;
  const f = bldFilter(), m = bldMon(), w = BLD.work;
  const refilter = () => { BLD.limit = BLD_PAGE; bldRenderGrid(); };
  switch(act){
    case 'view': BLD.view = t.dataset.view; bldCloseMon(); renderBuilder(); break;
    case 'mon': bldOpenMon(); break;
    case 'mon-close': bldCloseMon(); break;
    case 'mon-bg': if(e.target === t) bldCloseMon(); break;
    case 'mon-attr': BLD.mon.attr = t.dataset.v; bldMonRefresh(); break;
    case 'mon-arch': BLD.mon.arch = t.dataset.v; bldMonRefresh(); break;
    case 'mon-saved': BLD.mon.saved = !BLD.mon.saved; bldMonRefresh(); break;
    case 'mon-more': BLD.mon.limit += 150; bldRenderMonList(); break;
    case 'mon-pick': bldLoad(uid); bldCloseMon(); bldRenderMain(); break;
    case 'mode': BLD.mode = t.dataset.mode; BLD.limit = BLD_PAGE; BLD.setPop = false; bldRenderMain(); break;
    case 'arteff': BLD.artEff = !BLD.artEff; bldRenderLeft(); break;
    case 'goto-r':
      BLD.mode = 'rune'; BLD.f.slot = t.dataset.slot; BLD.limit = BLD_PAGE; bldRenderMain(); break;
    case 'goto-a':
      BLD.mode = 'art'; BLD.af.cat = t.dataset.idx === '0' ? '屬性' : '類型'; BLD.limit = BLD_PAGE; bldRenderMain(); break;
    case 'slot':
      BLD.f.slot = t.dataset.slot;
      if(BLD.f.main && !bldMainOpts().includes(+BLD.f.main)) BLD.f.main = '';
      bldRenderTop(); refilter(); break;
    case 'set-pop': BLD.setPop = !BLD.setPop; bldRenderTop(); break;
    case 'set-close': BLD.setPop = false; bldRenderTop(); break;
    case 'set-all': BLD.f.sets = []; bldRenderTop(); refilter(); break;
    case 'set': {
      const i = BLD.f.sets.indexOf(id);
      if(i >= 0) BLD.f.sets.splice(i, 1); else BLD.f.sets.push(id);
      bldRenderTop(); refilter(); break;
    }
    case 'sub-more':
      f.subRows = f.subRows > 2 ? 2 : 4;
      if(f.subRows === 2) f.subs.slice(2).forEach(x => { x.s = ''; x.min = ''; });
      bldRenderTop(); refilter(); break;
    case 'art-cat': BLD.af.cat = t.dataset.cat; bldRenderTop(); refilter(); break;
    case 'top':
      BLD.top = !BLD.top; BLD.adv = false; BLD.setPop = false;
      document.getElementById('bld-top').classList.toggle('open', BLD.top);
      bldRenderBar(); refilter(); break;
    case 'adv':
      BLD.adv = !BLD.adv;
      if(BLD.adv && BLD.top){ BLD.top = false; document.getElementById('bld-top').classList.remove('open'); }
      bldRenderBar(); refilter(); break;
    case 'dir': f.dir = -f.dir; bldRenderBar(); refilter(); break;
    case 'clear-f':
      if(BLD.mode === 'rune'){ const slot = BLD.f.slot, sort = BLD.f.sort, dir = BLD.f.dir; BLD.f = {...bldRuneFilter(), slot, sort, dir}; }
      else { const cat = BLD.af.cat, sort = BLD.af.sort, dir = BLD.af.dir; BLD.af = {...bldArtFilter(), cat, sort, dir}; }
      bldRenderTop(); bldRenderBar(); refilter(); break;
    case 'more': BLD.limit += BLD_PAGE; bldRenderGrid(); break;
    case 'pick-r': {
      if(!m){ bldToast('請先選一隻魔靈', true); return; }
      const r = runeById(id), cur = bldCurrent(m).runes[r.slot] || null;
      w.runes[r.slot] = w.runes[r.slot] !== id ? id : (id === cur ? null : cur);
      bldAfterPick(); break;
    }
    case 'pick-a': {
      if(!m){ bldToast('請先選一隻魔靈', true); return; }
      const a = artById(id), i = a.cat === '屬性' ? 0 : 1, cur = bldCurrent(m).arts[i] || null;
      if(!bldArtFits(a, m)){ bldToast(`${m.name} 不能裝這個魔礦（限${a.target}）`, true); return; }
      w.arts[i] = w.arts[i] !== id ? id : (id === cur ? null : cur);
      bldAfterPick(); break;
    }
    case 'revert-r': w.runes[t.dataset.slot] = bldCurrent(m).runes[t.dataset.slot] || null; bldAfterPick(); break;
    case 'revert-a': w.arts[+t.dataset.idx] = bldCurrent(m).arts[+t.dataset.idx] || null; bldAfterPick(); break;
    case 'reset-game': BLD.work = bldCurrent(m); bldAfterPick(); break;
    case 'reset-plan': bldLoad(m.uid); bldAfterPick(); break;
    case 'clear-all': BLD.work = {runes:{1:null,2:null,3:null,4:null,5:null,6:null}, arts:[null,null]}; bldAfterPick(); break;
    case 'save': bldSave(); break;
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
    case 'plans-import': document.getElementById('bld-import').click(); break;
  }
}
function bldMonRefresh(){
  BLD.mon.limit = 150;
  document.getElementById('bld-mfilters').innerHTML = bldMonFiltersHtml();
  bldRenderMonList();
}
function bldInput(e){
  const el = e.target, f = bldFilter();
  if(el.id === 'bld-monq'){ BLD.mon.q = el.value; BLD.mon.limit = 150; bldRenderMonList(); return; }
  if(el.dataset.sub !== undefined){ f.subs[+el.dataset.sub].s = el.value; }
  else if(el.dataset.submin !== undefined){ f.subs[+el.dataset.submin].min = el.value; }
  else if(el.dataset.f){
    const k = el.dataset.f;
    f[k] = el.type === 'checkbox' ? el.checked : el.value;
    if(k === 'fit') bldRenderTop();
  } else return;
  BLD.limit = BLD_PAGE; bldRenderGrid();
}
function renderBuilder(){
  bldSync();
  const meta = DATA.meta;
  $('#app').innerHTML = `<div class="bld" id="bld">
    <div class="bld-views">
      <button data-act="view" data-view="edit" class="${BLD.view==='edit'?'on':''}">配置</button>
      <button data-act="view" data-view="saved" id="bld-savedtab" class="${BLD.view==='saved'?'on':''}"></button>
      <span>資料來源：${bldEsc(meta.name)}${meta.exportedAt ? `・匯出於 ${bldEsc(meta.exportedAt)}` : ''}</span>
      ${window.BLD_EXTRA_BTN || ''}
    </div>
    <div id="bld-main"></div>
    <div id="bld-modal"></div>
  </div>`;
  const root = $('#bld');
  root.addEventListener('click', bldClick);
  root.addEventListener('input', bldInput);
  root.addEventListener('change', e => { if(e.target.id === 'bld-import' && e.target.files[0]) bldImportPlans(e.target.files[0]); });
  root.addEventListener('keydown', e => { if(e.key === 'Escape' && BLD.mon.open) bldCloseMon(); });
  root.addEventListener('touchstart', bldTouchStart, {passive:true});
  root.addEventListener('touchmove', bldTouchEnd, {passive:true});
  root.addEventListener('touchend', bldTouchEnd);
  root.addEventListener('mouseover', e => {
    if(bldPhone()) return;
    const t = e.target.closest('[data-tip]');
    if(!t){ bldTipHide(); return; }
    const tip = bldTipEl(), html = bldTipHtml(t.dataset.tip);
    if(!html){ bldTipHide(); return; }
    tip.innerHTML = html;
    positionTip(tip, e, t, true);
  });
  root.addEventListener('mouseleave', bldTipHide);
  bldTipHide();
  bldRenderMain();
  if(BLD.view === 'edit' && !BLD.uid) bldOpenMon();
}
function bldRenderMain(){
  const el = document.getElementById('bld-main'); if(!el) return;
  bldTipHide();
  document.getElementById('bld-savedtab').textContent = `存檔（${Object.keys(bldPlans()).length}）`;
  if(BLD.view === 'saved'){ el.className = 'bld-saved'; el.innerHTML = bldSavedHtml(); return; }
  el.className = 'bld-edit';
  el.innerHTML = `<div class="bld-left" id="bld-left">${bldLeftHtml()}</div><div class="bld-right">${bldRightHtml()}</div>`;
  bldRenderGrid();
}
