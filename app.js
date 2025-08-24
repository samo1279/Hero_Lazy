// Hero Lazy — simple PWA checklist with local archive
const TASKS = [
  {id:'body', title:'بدن 🏋️', desc:'۳۰ دقیقه حرکت / ۲ جلسه وزنه در هفته'},
  {id:'mind', title:'ذهن 🧘', desc:'خاموشی موبایل + روتین خواب'},
  {id:'future', title:'آینده 💼', desc:'رزومه/LinkedIn تنها ۳۰ دقیقه'},
  {id:'supp', title:'مکمل 💊', desc:'امگا۳ + برابِرین طبق برنامه'}
];

const state = {
  todayKey: null,
  data: null,
  installPrompt: null
};

const $ = s => document.querySelector(s);

function formatDate(d){
  return new Intl.DateTimeFormat('fa-IR', { dateStyle:'full'}).format(d);
}
function ymd(d){
  return d.toISOString().slice(0,10);
}

function loadToday(){
  const today = new Date();
  const key = 'herolazy:' + ymd(today);
  state.todayKey = key;

  // if last active date != today, archive it
  const last = localStorage.getItem('herolazy:last');
  if(last && last !== key){
    const lastData = JSON.parse(localStorage.getItem(last) || '{}');
    const score = Object.values(lastData).filter(Boolean).length;
    archivePush(last.replace('herolazy:',''), score);
  }
  localStorage.setItem('herolazy:last', key);

  // load today data or init
  const saved = localStorage.getItem(key);
  state.data = saved ? JSON.parse(saved) : Object.fromEntries(TASKS.map(t => [t.id,false]));
  render();
}

function archivePush(dateStr, score){
  const arKey = 'herolazy:archive';
  const arr = JSON.parse(localStorage.getItem(arKey) || '[]');
  arr.push({date:dateStr, score});
  // keep only last 14 days
  while(arr.length > 14) arr.shift();
  localStorage.setItem(arKey, JSON.stringify(arr));
}

function render(){
  $('#today').textContent = formatDate(new Date());
  const ul = $('#taskList');
  ul.innerHTML = '';
  TASKS.forEach(t => {
    const li = document.createElement('li');
    li.className = 'task';
    li.innerHTML = `
      <input id="cb-${t.id}" type="checkbox" class="checkbox" ${state.data[t.id] ? 'checked':''}>
      <div class="label">
        <div class="title">${t.title}</div>
        <div class="desc">${t.desc}</div>
      </div>
    `;
    ul.appendChild(li);
    li.querySelector('input').addEventListener('change', (e)=>{
      state.data[t.id] = e.target.checked;
      persist();
      updateProgress();
    });
  });
  updateProgress();
  renderArchive();
}

function updateProgress(){
  const val = Object.values(state.data).filter(Boolean).length;
  $('#progress').textContent = `${val} / ${TASKS.length}`;
}

function persist(){
  localStorage.setItem(state.todayKey, JSON.stringify(state.data));
}

function renderArchive(){
  const wrap = $('#archive');
  const ar = JSON.parse(localStorage.getItem('herolazy:archive') || '[]');
  wrap.innerHTML = '';
  // fill with last 7 days view (including today as preview)
  const days = [];
  for(let i=6;i>=0;i--){
    const d = new Date(); d.setDate(d.getDate()-i);
    const k = 'herolazy:' + ymd(d);
    const data = JSON.parse(localStorage.getItem(k) || '{}');
    const score = Object.values(data).filter(Boolean).length || (ar.find(x=>x.date===ymd(d))?.score ?? 0);
    days.push({date: new Intl.DateTimeFormat('fa-IR',{weekday:'short'}).format(d), score});
  }
  days.forEach(d=>{
    const el = document.createElement('div');
    el.className = 'badge';
    el.innerHTML = `<div class="score">${d.score}</div><div class="day">${d.date}</div>`;
    wrap.appendChild(el);
  });
}

// Reset today
$('#resetDay').addEventListener('click', (e)=>{
  e.preventDefault();
  if(confirm('امروز از اول؟ تیک‌ها پاک می‌شن.')){
    state.data = Object.fromEntries(TASKS.map(t => [t.id,false]));
    persist();
    render();
  }
});

// Install prompt
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault();
  state.installPrompt = e;
  $('#installBtn').hidden = false;
});
$('#installBtn').addEventListener('click', async ()=>{
  if(state.installPrompt){
    state.installPrompt.prompt();
    const res = await state.installPrompt.userChoice;
    if(res.outcome === 'accepted'){
      $('#installBtn').hidden = true;
    }
  }
});

// Notifications
async function enableNotifications(){
  if(!('Notification' in window)) return alert('مرورگر این قابلیت را پشتیبانی نمی‌کند.');
  const permission = await Notification.requestPermission();
  if(permission !== 'granted'){ alert('برای نوتیف اجازه ندادی. هر وقت خواستی از تنظیمات مرورگر فعالش کن.'); return; }
  // try service worker
  if('serviceWorker' in navigator){
    const reg = await navigator.serviceWorker.register('./sw.js');
    // schedule local daily reminder at 21:00 local time (fallback if periodic sync not available)
    scheduleDailyLocal(reg, 21, 0);
    alert('نوتیف فعال شد ✅ — هر شب حوالی ۹ پیامت می‌کنیم!');
  }
}
$('#notifyBtn').addEventListener('click', enableNotifications);

function scheduleDailyLocal(reg, h, m){
  function schedule(){
    const now = new Date();
    const target = new Date();
    target.setHours(h, m, 0, 0);
    if(target <= now) target.setDate(target.getDate()+1);
    const timeout = target - now;
    setTimeout(()=>{
      reg.showNotification('Hero Lazy', {
        body: 'هی قهرمان 😅 فقط دو تا ستون امروز بزن، بقیش بیخیال!',
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
      });
      schedule(); // schedule next
    }, timeout);
  }
  schedule();
}

// boot
if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js'); }
loadToday();
