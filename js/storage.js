/* =============================================================
   storage.js  –  HealthGuard data layer (localStorage)
   All app state lives here. No globals needed elsewhere.
   ============================================================= */

const Storage = {

  /* ---------- raw helpers ---------------------------------- */
  _get(key)      { try { return JSON.parse(localStorage.getItem(key)); } catch(e) { return null; } },
  _set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
  _del(key)      { localStorage.removeItem(key); },

  /* ---------- password hash (demo only, NOT crypto-safe) -- */
  _hash(pw) {
    let h = 5381;
    for (let i = 0; i < pw.length; i++) h = Math.imul(h, 31) + pw.charCodeAt(i) | 0;
    return (h >>> 0).toString(16);
  },

  /* ==========================================================
     AUTH
     hg_users   : [{id, name, email, hash, role, createdAt}]
     hg_session : {userId}
  ========================================================== */
  _users()         { return this._get('hg_users') || []; },
  _setUsers(arr)   { this._set('hg_users', arr); },

  register(name, email, password, role) {
    const users = this._users();
    const norm  = email.trim().toLowerCase();
    if (users.find(u => u.email === norm)) {
      return { ok: false, msg: 'An account with this email already exists.' };
    }
    if (!name.trim()) return { ok: false, msg: 'Name is required.' };
    if (password.length < 6) return { ok: false, msg: 'Password must be at least 6 characters.' };

    const user = {
      id:        'u' + Date.now(),
      name:      name.trim(),
      email:     norm,
      hash:      this._hash(password),
      role:      role,        // 'patient' | 'caregiver'
      createdAt: new Date().toISOString()
    };
    users.push(user);
    this._setUsers(users);
    return { ok: true, user };
  },

  login(email, password) {
    const norm = email.trim().toLowerCase();
    const user = this._users().find(u => u.email === norm);
    if (!user)                         return { ok: false, msg: 'No account found with that email.' };
    if (user.hash !== this._hash(password)) return { ok: false, msg: 'Incorrect password.' };
    this._set('hg_session', { userId: user.id });
    return { ok: true, user };
  },

  logout() { this._del('hg_session'); },

  currentUser() {
    const s = this._get('hg_session');
    if (!s) return null;
    return this._users().find(u => u.id === s.userId) || null;
  },

  userById(id) { return this._users().find(u => u.id === id) || null; },

  /* ==========================================================
     PATIENT RECORDS
     hg_patients : [{id, userId|null, caregiverId|null,
                     name, age, condition, contact, notes, addedAt}]
  ========================================================== */
  _patients()       { return this._get('hg_patients') || []; },
  _setPatients(arr) { this._set('hg_patients', arr); },

  /* ensure every patient-role user has a record */
  ensurePatientRecord(user) {
    let rec = this._patients().find(p => p.userId === user.id);
    if (!rec) {
      rec = {
        id:          'pr' + user.id,
        userId:      user.id,
        caregiverId: null,
        name:        user.name,
        age:         '',
        condition:   '',
        contact:     '',
        notes:       '',
        addedAt:     new Date().toISOString()
      };
      const all = this._patients();
      all.push(rec);
      this._setPatients(all);
    }
    return rec;
  },

  patientRecordForUser(userId) {
    return this._patients().find(p => p.userId === userId) || null;
  },

  patientsForCaregiver(caregiverId) {
    return this._patients().filter(p => p.caregiverId === caregiverId);
  },

  /* link an existing patient-account to a caregiver */
  linkPatientByEmail(caregiverId, email) {
    const norm = email.trim().toLowerCase();
    const pUser = this._users().find(u => u.email === norm && u.role === 'patient');
    if (!pUser) return { ok: false, msg: 'No patient account found with that email.' };

    const all = this._patients();
    let rec = all.find(p => p.userId === pUser.id);
    if (!rec) {
      rec = { id:'pr'+pUser.id, userId:pUser.id, caregiverId:null, name:pUser.name, age:'', condition:'', contact:'', notes:'', addedAt:new Date().toISOString() };
      all.push(rec);
    }
    if (rec.caregiverId && rec.caregiverId !== caregiverId)
      return { ok: false, msg: 'That patient is already linked to another caregiver.' };
    rec.caregiverId = caregiverId;
    this._setPatients(all);
    return { ok: true, patient: rec };
  },

  /* add a manual (no account) patient */
  addManualPatient(caregiverId, name, age, condition, contact, notes) {
    const rec = {
      id:          'pm' + Date.now(),
      userId:      null,
      caregiverId: caregiverId,
      name:        name.trim(),
      age:         age,
      condition:   condition,
      contact:     contact,
      notes:       notes,
      addedAt:     new Date().toISOString()
    };
    const all = this._patients();
    all.push(rec);
    this._setPatients(all);
    return rec;
  },

  /* CASCADE DELETE – removes patient + every piece of their data */
  deletePatient(patientId) {
    this._setPatients(this._patients().filter(p => p.id !== patientId));
    this._set('hg_medicines',    (this._get('hg_medicines')    || []).filter(m => m.pid !== patientId));
    this._set('hg_appointments', (this._get('hg_appointments') || []).filter(a => a.pid !== patientId));
    this._set('hg_reports',      (this._get('hg_reports')      || []).filter(r => r.pid !== patientId));
    this._del('hg_sos_'  + patientId);
    this._del('hg_hist_' + patientId);
  },

  /* ==========================================================
     MEDICINES
     hg_medicines : [{id, pid, name, dosage, time, notes, by}]
     by = 'patient' | 'caregiver'
  ========================================================== */
  medicinesFor(patientId) {
    return (this._get('hg_medicines') || []).filter(m => m.pid === patientId);
  },

  addMedicine(patientId, name, dosage, time, notes, by) {
    const all = this._get('hg_medicines') || [];
    const med = { id: Date.now(), pid: patientId, name, dosage, time, notes: notes||'', by: by||'patient' };
    all.push(med);
    this._set('hg_medicines', all);
    this.addHistory(patientId, 'medicine', 'Medicine "' + name + '" (' + dosage + ') at ' + time + (by==='caregiver' ? ' — by caregiver' : ''));
    return med;
  },

  deleteMedicine(id) {
    this._set('hg_medicines', (this._get('hg_medicines') || []).filter(m => m.id !== id));
  },

  /* ==========================================================
     APPOINTMENTS
     hg_appointments : [{id, pid, doctor, date, time, notes}]
  ========================================================== */
  appointmentsFor(patientId) {
    return (this._get('hg_appointments') || []).filter(a => a.pid === patientId);
  },

  addAppointment(patientId, doctor, date, time, notes) {
    const all = this._get('hg_appointments') || [];
    const a   = { id: Date.now(), pid: patientId, doctor, date, time, notes: notes||'' };
    all.push(a);
    this._set('hg_appointments', all);
    this.addHistory(patientId, 'appointment', 'Appointment with ' + doctor + ' on ' + date + ' at ' + time);
    return a;
  },

  deleteAppointment(id) {
    this._set('hg_appointments', (this._get('hg_appointments') || []).filter(a => a.id !== id));
  },

  /* ==========================================================
     REPORTS
     hg_reports : [{id, pid, label, fileName, size, uploadedAt}]
  ========================================================== */
  reportsFor(patientId) {
    return (this._get('hg_reports') || []).filter(r => r.pid === patientId);
  },

  addReport(patientId, label, fileName, size) {
    const all = this._get('hg_reports') || [];
    const r   = { id: Date.now(), pid: patientId, label, fileName, size, uploadedAt: new Date().toISOString() };
    all.push(r);
    this._set('hg_reports', all);
    this.addHistory(patientId, 'report', 'Report "' + label + '" uploaded');
    return r;
  },

  deleteReport(id) {
    this._set('hg_reports', (this._get('hg_reports') || []).filter(r => r.id !== id));
  },

  /* ==========================================================
     SOS LOCATION  (per patient)
  ========================================================== */
  saveSOS(patientId, lat, lng, accuracy) {
    const data = { lat, lng, accuracy, ts: new Date().toISOString() };
    this._set('hg_sos_' + patientId, data);
    this.addHistory(patientId, 'sos', 'SOS sent — Lat ' + lat.toFixed(5) + ', Lng ' + lng.toFixed(5));
    return data;
  },

  getSOS(patientId) { return this._get('hg_sos_' + patientId); },

  /* ==========================================================
     WATER INTERVAL  (per user account)
  ========================================================== */
  getWaterMins(userId)       { return this._get('hg_water_' + userId); },
  setWaterMins(userId, mins) {
    if (mins) { this._set('hg_water_' + userId, mins); }
    else      { this._del('hg_water_' + userId); }
  },

  /* ==========================================================
     HISTORY LOG  (per patient record)
  ========================================================== */
  addHistory(patientId, type, msg) {
    const key  = 'hg_hist_' + patientId;
    const list = this._get(key) || [];
    list.unshift({ type, msg, ts: new Date().toISOString() });
    this._set(key, list.slice(0, 200));
  },

  getHistory(patientId)   { return this._get('hg_hist_' + patientId) || []; },
  clearHistory(patientId) { this._del('hg_hist_' + patientId); }
};
