// 手機離線版外殼：提供 builder.js 需要的主程式函式，並把資料檔存在 IndexedDB。
// 符文配置本身的畫面和邏輯都在 builder.js，和網站版是同一份。
let DATA = null;
let DELETED = new Set();          // 網站上「已標記賣掉」的記錄在電腦瀏覽器裡，手機看不到
const ACCT = {path:null, builtinPath:null};
const $ = s => document.querySelector(s);
const pctUp = (base, pct) => Math.ceil(base*pct/100 - 1e-9);     // 同 template.html，面板百分比一律進位
const normCN = s => (s||'').replace(/[小]/g, '');
let M_RUNES = {}, M_ARTS = {};
const runeById = id => M_RUNES[id];
const artById = id => M_ARTS[id];
const M_SUB_NAME = {1:'HP固',2:'HP%',3:'ATK固',4:'ATK%',5:'DEF固',6:'DEF%',8:'速度',9:'爆率',10:'爆傷',11:'抵抗',12:'命中'};
function subLineHtml(x){
  const u = x.s===2||x.s===4||x.s===6||x.s>=9 ? '%' : '';
  return `<span><span class="sname">${M_SUB_NAME[x.s]||'?'}</span> <span class="sval">+${x.v}${u}</span>${x.g?`<span class="sgrind">+${x.g}${u}</span>`:''}${x.gem?' ⇄':''}</span>`;
}
function positionTip(tip){ tip.style.display = 'none'; }         // 手機不用懸停卡，資料顯示在格子下方

window.BLD_EXTRA_BTN = '<button class="m-data" data-mact="file">更新資料</button>';

// ---------- IndexedDB：資料檔有好幾 MB，放不進 localStorage ----------
function mDb(){
  return new Promise((ok, no) => {
    const q = indexedDB.open('rune-builder', 1);
    q.onupgradeneeded = () => q.result.createObjectStore('kv');
    q.onsuccess = () => ok(q.result);
    q.onerror = () => no(q.error);
  });
}
async function mGet(key){
  const db = await mDb();
  return new Promise((ok, no) => {
    const q = db.transaction('kv').objectStore('kv').get(key);
    q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error);
  });
}
async function mPut(key, val){
  const db = await mDb();
  return new Promise((ok, no) => {
    const t = db.transaction('kv', 'readwrite');
    t.objectStore('kv').put(val, key);
    t.oncomplete = () => ok(); t.onerror = () => no(t.error); t.onabort = () => no(t.error);
  });
}

// ---------- 載入資料檔 ----------
function mIconUrl(uri){
  const [head, b64] = uri.split(',');
  const bin = atob(b64), bytes = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], {type: head.slice(5).split(';')[0]}));
}
function mApply(pack){
  Object.values(window.BLD_ICONS || {}).forEach(URL.revokeObjectURL);
  const icons = {};
  Object.entries(pack.icons).forEach(([k,v]) => { icons[k] = mIconUrl(v); });
  window.BLD_ICONS = icons;
  DATA = pack.data;
  M_RUNES = {}; M_ARTS = {};
  DATA.runes.forEach(r => { M_RUNES[r.id] = r; });
  DATA.artifacts.forEach(a => { M_ARTS[a.id] = a; });
  renderBuilder();
}
function mParse(text){
  const pack = JSON.parse(text);
  if(pack.type !== 'sw-mobile-pack' || !pack.data || !pack.icons) throw new Error('這不是符文配置的資料檔');
  return pack;
}
async function mImport(file){
  mBusy('匯入資料中…');
  try {
    const text = await file.text();
    const pack = mParse(text);
    await mPut('pack', text);
    if(navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    mApply(pack);
    bldToast(`已載入 ${pack.data.meta.name}（匯出於 ${pack.data.meta.exportedAt}）`);
  } catch(e){
    if(DATA){ renderBuilder(); bldToast('匯入失敗：' + e.message, true); }
    else mWelcome('匯入失敗：' + e.message);
  }
}
function mBusy(msg){ $('#app').innerHTML = `<div class="m-welcome"><p>${msg}</p></div>`; }
function mWelcome(err){
  $('#app').innerHTML = `<div class="m-welcome">
    <h1>符文配置</h1>
    ${err ? `<p class="m-err">${bldEsc(err)}</p>` : ''}
    <p>第一次使用要載入資料檔（sw-data-….json）。檔案傳到手機後按下方按鈕選取，之後離線也能開。</p>
    <button class="bld-apply" data-mact="file">選擇資料檔</button>
  </div>`;
}
document.addEventListener('click', e => {
  if(e.target.closest('[data-mact="file"]')) $('#m-file').click();
});
$('#m-file').addEventListener('change', e => {
  const f = e.target.files[0]; e.target.value = '';
  if(f) mImport(f);
});

(async function boot(){
  if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  mBusy('載入中…');
  try {
    const text = await mGet('pack');
    if(text) mApply(mParse(text)); else mWelcome();
  } catch(e){ mWelcome('讀取資料失敗：' + e.message); }
})();
