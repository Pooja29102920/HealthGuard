/* ================================================================
   notifications.js  –  HealthGuard bidirectional notification bus
   ================================================================
   Schema: hg_notif_queue → [{id,to,type,title,body,ts,read}]

   Patient → Caregiver:
     sos_alert, new_medicine, new_appointment, water_started, pt_message

   Caregiver → Patient:
     cg_message, new_med_assigned, appointment_reminder

   Internal (self):
     water, medicine
================================================================ */
const Notif = (() => {

  /* ── localStorage bus ─────────────────────────────────── */
  const KEY = 'hg_notif_queue';
  const _all  = ()  => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const _save = (a) => localStorage.setItem(KEY, JSON.stringify(a));

  function push(toUserId, type, title, body) {
    const q = _all();
    q.push({ id: Date.now()+'_'+Math.random().toString(36).slice(2), to:toUserId, type, title, body, ts:new Date().toISOString(), read:false });
    if (q.length > 300) q.splice(0, q.length - 300);
    _save(q);
    // fire storage event on same tab too
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
  }

  const forUser   = (uid) => _all().filter(n => n.to === uid);
  const unread    = (uid) => forUser(uid).filter(n => !n.read);

  function markRead(id)    { const q=_all(); const n=q.find(x=>x.id===id); if(n){n.read=true;_save(q);} }
  function markAllRead(uid){ _save(_all().map(n=>n.to===uid?{...n,read:true}:n)); }

  /* ── Popup CSS injected once ─────────────────────────── */
  const CSS = `
    #hg-stack{position:fixed;bottom:80px;right:16px;z-index:9999;display:flex;flex-direction:column-reverse;gap:10px;width:min(340px,calc(100vw - 32px));pointer-events:none}
    @media(min-width:768px){#hg-stack{bottom:24px}}
    .hg-pop{pointer-events:all;background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.18);padding:14px 16px;display:flex;gap:12px;align-items:flex-start;animation:hgIn .35s cubic-bezier(.22,.68,0,1.2) forwards}
    .hg-pop.out{animation:hgOut .3s ease forwards}
    @keyframes hgIn{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}
    @keyframes hgOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(60px)}}
    .hg-ico{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0}
    .hg-bd{flex:1;min-width:0}
    .hg-ttl{font-weight:700;font-size:.85rem;color:#1e293b;font-family:'DM Sans',sans-serif}
    .hg-msg{font-size:.78rem;color:#64748b;line-height:1.4;margin-top:2px;font-family:'DM Sans',sans-serif;word-break:break-word}
    .hg-time{font-size:.67rem;color:#94a3b8;margin-top:3px;font-family:'DM Sans',sans-serif}
    .hg-x{background:none;border:none;cursor:pointer;color:#94a3b8;font-size:1rem;padding:0;margin-left:4px;flex-shrink:0;line-height:1}
    .hg-x:hover{color:#ef4444}
    .hg-t-sos_alert{border-left:4px solid #e11d48}
    .hg-t-sos_alert .hg-ico{background:#fff1f2}
    .hg-t-water .hg-ico,.hg-t-water_started .hg-ico{background:#e0f2fe}
    .hg-t-medicine .hg-ico,.hg-t-new_medicine .hg-ico,.hg-t-new_med_assigned .hg-ico{background:#fef9c3}
    .hg-t-new_appointment .hg-ico,.hg-t-appointment_reminder .hg-ico{background:#ede9fe}
    .hg-t-cg_message .hg-ico,.hg-t-pt_message .hg-ico{background:#dcfce7}
    /* Bell */
    #hg-badge{display:none;position:absolute;top:-5px;right:-5px;background:#ef4444;color:#fff;border-radius:99px;font-size:.6rem;font-weight:700;padding:1px 5px;min-width:16px;text-align:center;pointer-events:none}
    /* Panel */
    #hg-panel{position:fixed;top:0;right:0;bottom:0;width:min(320px,100vw);background:#fff;box-shadow:-4px 0 24px rgba(0,0,0,.15);z-index:10000;transform:translateX(100%);transition:transform .3s cubic-bezier(.22,.68,0,1.2);display:flex;flex-direction:column}
    #hg-panel.open{transform:translateX(0)}
    #hg-pov{display:none;position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:9999}
  `;

  const EMOJI = { sos_alert:'🚨', water:'💧', water_started:'💧', medicine:'💊', new_medicine:'💊', new_med_assigned:'💊', new_appointment:'📅', appointment_reminder:'📅', cg_message:'📩', pt_message:'💬' };

  let _stack=null, _panel=null, _pov=null, _badge=null, _uid=null;

  function _boot() {
    if (_stack) return;
    const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
    _stack = document.createElement('div'); _stack.id='hg-stack'; document.body.appendChild(_stack);
  }

  /* ── Show in-app popup ──────────────────────────────── */
  function showPopup(type, title, body, ms=6000) {
    _boot();
    const d = document.createElement('div');
    d.className = 'hg-pop hg-t-'+type;
    const t = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    d.innerHTML = '<div class="hg-ico">'+(EMOJI[type]||'🔔')+'</div>'
      +'<div class="hg-bd"><div class="hg-ttl">'+_e(title)+'</div><div class="hg-msg">'+_e(body)+'</div><div class="hg-time">'+t+'</div></div>'
      +'<button class="hg-x" onclick="this.closest(\'.hg-pop\').remove()">✕</button>';
    _stack.appendChild(d);
    if (ms > 0 && type !== 'sos_alert') setTimeout(()=>{ d.classList.add('out'); setTimeout(()=>d.remove(),350); }, ms);
  }

  /* ── OS notification ─────────────────────────────── */
  function _os(title, body) {
    if (window.Notification && Notification.permission==='granted') {
      try { new Notification(title,{body,icon:'icons/icon-192.png'}); } catch(e){}
    }
  }

  function requestPermission(cb) {
    if (!window.Notification) { cb&&cb(false); return; }
    if (Notification.permission==='granted') { cb&&cb(true); return; }
    Notification.requestPermission().then(p=>cb&&cb(p==='granted'));
  }

  /* ── Notification centre ─────────────────────────── */
  function initPanel(uid, color) {
    _uid = uid; _boot();
    _pov = document.createElement('div'); _pov.id='hg-pov'; _pov.onclick=closePanel; document.body.appendChild(_pov);
    _panel = document.createElement('div'); _panel.id='hg-panel';
    _panel.innerHTML =
      '<div style="background:'+color+';color:#fff;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">'
        +'<span style="font-weight:700;font-size:.95rem;font-family:DM Serif Display,serif">🔔 Notifications</span>'
        +'<div style="display:flex;gap:8px;align-items:center">'
          +'<button onclick="Notif.markAllRead(\''+uid+'\');Notif.refreshPanel()" style="font-size:.68rem;background:rgba(255,255,255,.2);border:none;color:#fff;padding:3px 8px;border-radius:6px;cursor:pointer;font-family:DM Sans,sans-serif">Mark all read</button>'
          +'<button onclick="Notif.closePanel()" style="background:none;border:none;color:#fff;font-size:1.3rem;cursor:pointer;line-height:1">×</button>'
        +'</div>'
      +'</div>'
      +'<div id="hg-plist" style="flex:1;overflow-y:auto;padding:12px;font-family:DM Sans,sans-serif"></div>';
    document.body.appendChild(_panel);
    refreshPanel();
  }

  function refreshPanel() {
    const list = document.getElementById('hg-plist');
    if (!list||!_uid) return;
    const notifs = forUser(_uid).slice(0,60).reverse();
    if (!notifs.length) { list.innerHTML='<div style="text-align:center;padding:40px 0;color:#94a3b8;font-size:.85rem">No notifications yet.</div>'; _updBadge(); return; }
    list.innerHTML = notifs.map(n=>{
      const time = new Date(n.ts).toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
      return '<div onclick="Notif.markRead(\''+n.id+'\');Notif.refreshPanel()" style="display:flex;gap:10px;align-items:flex-start;padding:10px 8px;border-radius:10px;cursor:pointer;margin-bottom:6px;background:'+(n.read?'#fff':'#f0f9ff')+';border:1px solid '+(n.read?'#f1f5f9':'#bae6fd')+'">'
        +'<span style="font-size:1.2rem;flex-shrink:0">'+(EMOJI[n.type]||'🔔')+'</span>'
        +'<div style="flex:1;min-width:0">'
          +'<div style="font-weight:'+(n.read?'500':'700')+';font-size:.82rem;color:#1e293b">'+_e(n.title)+'</div>'
          +'<div style="font-size:.76rem;color:#64748b;margin-top:2px;word-break:break-word">'+_e(n.body)+'</div>'
          +'<div style="font-size:.67rem;color:#94a3b8;margin-top:3px">'+time+'</div>'
        +'</div>'
        +(n.read?'':'<div style="width:8px;height:8px;background:#0ea5e9;border-radius:50%;flex-shrink:0;margin-top:4px"></div>')
        +'</div>';
    }).join('');
    _updBadge();
  }

  function _updBadge() {
    if (!_badge||!_uid) return;
    const c = unread(_uid).length;
    _badge.textContent = c>9?'9+':c; _badge.style.display = c?'block':'none';
  }

  function openPanel()  { _panel&&_panel.classList.add('open');    _pov&&(_pov.style.display='block');  refreshPanel(); }
  function closePanel() { _panel&&_panel.classList.remove('open'); _pov&&(_pov.style.display='none'); }

  function injectBell(slot, uid, color) {
    initPanel(uid, color);
    const wrap = document.createElement('div');
    wrap.style.cssText='position:relative;display:inline-flex;align-items:center';
    const btn = document.createElement('button');
    btn.style.cssText='background:none;border:none;cursor:pointer;font-size:1.4rem;line-height:1;padding:4px;position:relative';
    btn.innerHTML='🔔';
    _badge = document.createElement('span'); _badge.id='hg-badge';
    btn.appendChild(_badge); btn.onclick=openPanel;
    wrap.appendChild(btn); slot.appendChild(wrap);
    _updBadge();
  }

  /* ── Cross-tab listener ─────────────────────────────── */
  function startListening(uid, onNew) {
    _uid = uid;
    let seen = forUser(uid).length;
    window.addEventListener('storage', e => {
      if (e.key !== KEY) return;
      const cur = forUser(uid).length;
      if (cur > seen) {
        forUser(uid).slice(-(cur-seen)).forEach(n => {
          showPopup(n.type, n.title, n.body, n.type==='sos_alert'?0:7000);
          _os(n.title, n.body);
          if (onNew) onNew(n);
        });
        seen = cur;
      }
      _updBadge(); refreshPanel();
    });
  }

  /* ── Water timer ─────────────────────────────────────── */
  let _wId=null;
  function startWater(mins, patientId, userId, caregiverId) {
    stopWater();
    _wId = setInterval(()=>{
      const title='💧 Drink Water!', body='Time to hydrate — drink a glass of water now.';
      showPopup('water',title,body); _os(title,body); push(userId,'water',title,body);
      Storage.addHistory(patientId,'water','Water reminder triggered every '+mins+' min');
      // notify caregiver too
      if (caregiverId) { const u=Storage.userById(userId); push(caregiverId,'water_started','💧 '+(u?u.name:'Patient')+' drinking water','Water reminder triggered for your patient.'); }
    }, mins*60*1000);
  }
  function stopWater()  { if(_wId){clearInterval(_wId);_wId=null;} }
  function waterOn()    { return _wId!==null; }

  /* ── Medicine checker (every 30 s) ──────────────────── */
  let _mId=null, _notifiedMeds=new Set();
  function startMedCheck(getFn, patientId, userId, caregiverId, patientName) {
    stopMedCheck();
    _mId = setInterval(()=>{
      const hhmm = new Date().toTimeString().slice(0,5);
      (getFn()||[]).forEach(m=>{
        const k=m.id+'_'+hhmm;
        if(m.time===hhmm && !_notifiedMeds.has(k)){
          _notifiedMeds.add(k);
          const title='💊 Medicine Time!', body='Take '+m.dosage+' of '+m.name+(m.notes?' — '+m.notes:'');
          showPopup('medicine',title,body,0); _os(title,body); push(userId,'medicine',title,body);
          Storage.addHistory(patientId,'medicine','Medicine alert: '+m.name+' ('+m.dosage+') at '+hhmm);
          // notify caregiver
          if (caregiverId) push(caregiverId,'medicine','💊 '+patientName+' Medicine Time','Taking '+m.dosage+' of '+m.name+' at '+hhmm);
        }
      });
    },30000);
  }
  function stopMedCheck(){ if(_mId){clearInterval(_mId);_mId=null;} }

  /* ── Appointment 15-min checker ─────────────────────── */
  let _aId=null;
  function startApptCheck(getFn, cgUserId) {
    stopApptCheck();
    const DONE_KEY='hg_appt15_'+cgUserId;
    _aId = setInterval(()=>{
      const now=new Date(), done=new Set(JSON.parse(localStorage.getItem(DONE_KEY)||'[]'));
      getFn().forEach(({appt,patientName})=>{
        const diff=new Date(appt.date+'T'+appt.time)-now, k=appt.id+'_15';
        if(diff>0 && diff<=15*60*1000 && !done.has(k)){
          done.add(k); localStorage.setItem(DONE_KEY,JSON.stringify([...done]));
          const title='📅 Appointment in 15 min', body='With '+patientName+' — '+appt.doctor+' at '+appt.time;
          showPopup('appointment_reminder',title,body,0); _os(title,body); push(cgUserId,'appointment_reminder',title,body);
        }
      });
    },60000);
  }
  function stopApptCheck(){ if(_aId){clearInterval(_aId);_aId=null;} }

  /* ── Named push helpers ──────────────────────────────── */

  // Patient → Caregiver
  function pt_SOS(cgId, patientName, lat, lng) {
    push(cgId,'sos_alert','🚨 SOS ALERT — '+patientName, patientName+' needs help! Lat '+lat.toFixed(5)+', Lng '+lng.toFixed(5));
  }
  function pt_AddedMedicine(cgId, patientName, medName, dosage, time) {
    push(cgId,'new_medicine','💊 '+patientName+' added a medicine', medName+' ('+dosage+') at '+time);
  }
  function pt_AddedAppointment(cgId, patientName, doctor, date, time) {
    push(cgId,'new_appointment','📅 New appointment — '+patientName, 'Dr. '+doctor+' on '+date+' at '+time);
  }
  function pt_StartedWater(cgId, patientName, mins) {
    push(cgId,'water_started','💧 '+patientName+' started water reminders', 'Hydration reminder every '+mins+' min');
  }
  function pt_Message(cgId, patientName, msg) {
    push(cgId,'pt_message','💬 Message from '+patientName, msg);
  }

  // Caregiver → Patient
  function cg_Message(ptUserId, cgName, msg) {
    push(ptUserId,'cg_message','📩 Message from '+cgName, msg);
  }
  function cg_AssignedMed(ptUserId, cgName, medName, dosage, time) {
    push(ptUserId,'new_med_assigned','💊 New medicine from '+cgName, medName+' ('+dosage+') at '+time);
  }

  function _e(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  return {
    push, forUser, unread, markRead, markAllRead,
    showPopup, requestPermission,
    injectBell, openPanel, closePanel, refreshPanel,
    startListening,
    startWater, stopWater, waterOn,
    startMedCheck, stopMedCheck,
    startApptCheck, stopApptCheck,
    pt_SOS, pt_AddedMedicine, pt_AddedAppointment, pt_StartedWater, pt_Message,
    cg_Message, cg_AssignedMed,
  };
})();
