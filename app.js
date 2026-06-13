const BASE_KEY = "nail_studio_pwa_v62";
const BASE_OLD_KEYS = ["nail_studio_pwa_v61", "nail_studio_pwa_v60", "nail_studio_pwa_v59", "nail_studio_pwa_v58", "nail_studio_pwa_v57", "nail_studio_pwa_v56", "nail_studio_pwa_v55", "nail_studio_pwa_v54", "nail_studio_pwa_v53", "nail_studio_pwa_v52", "nail_studio_pwa_v51", "nail_studio_pwa_v50", "nail_studio_pwa_v49", "nail_studio_pwa_v48", "nail_studio_pwa_v47", "nail_studio_pwa_v46", "nail_studio_pwa_v45", "nail_studio_pwa_v44", "nail_studio_pwa_v43", "nail_studio_pwa_v42", "nail_studio_pwa_v41", "nail_studio_pwa_v40", "nail_studio_pwa_v39", "nail_studio_pwa_v38", "nail_studio_pwa_v37", "nail_studio_pwa_v36", "nail_studio_pwa_v35", "nail_studio_pwa_v34", "nail_studio_pwa_v33", "nail_studio_pwa_v32", "nail_studio_pwa_v31", "nail_studio_pwa_v30", "nail_studio_pwa_v29", "nail_studio_pwa_v28", "nail_studio_pwa_v27", "nail_studio_pwa_v26", "nail_studio_pwa_v25", "nail_studio_pwa_v24", "nail_studio_pwa_v23", "nail_studio_pwa_v22", "nail_studio_pwa_v21", "nail_studio_pwa_v20", "nail_studio_pwa_v19", "nail_studio_pwa_v18", "nail_studio_pwa_v17", "nail_studio_pwa_v16", "nail_studio_pwa_v15", "nail_studio_pwa_v14", "nail_studio_pwa_v13", "nail_studio_pwa_v12", "nail_studio_pwa_v11", "nail_studio_pwa_v10", "nail_studio_pwa_v9", "nail_studio_pwa_v8", "nail_studio_pwa_v7", "nail_studio_pwa_v6", "nail_studio_pwa_v5", "nail_studio_pwa_v4", "nail_studio_pwa_v3", "nail_studio_pwa_v2", "nail_studio_pwa_v1"];
const $ = id => document.getElementById(id);

// Studio-ID Verwaltung
// Jeder Kunde bekommt denselben GitHub-Link mit eigener Studio-ID, z. B.:
// https://DEINNAME.github.io/tt-nagelstudio/?studio=freund-test
// Neue Studios kannst du hier ergänzen oder verlängern.
const STUDIOS = {
  "freund-test": {
    name: "Freund Teststudio",
    type: "trial",
    validUntil: "2026-07-12",
    maxDevices: 2,
    allowedDeviceIds: [
      // Hier Geräte-ID eintragen, z. B. "DEV-ABC123XYZ"
    ]
  },
  "maria-nails": {
    name: "Maria Nails",
    type: "trial",
    validUntil: "2026-07-12",
    maxDevices: 2,
    allowedDeviceIds: []
  },
  "anna-beauty": {
    name: "Anna Beauty",
    type: "full",
    validUntil: null,
    maxDevices: 2,
    allowedDeviceIds: []
  }
};

function normalizeStudioId(value){
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
}
function getStudioIdFromUrl(){
  const params = new URLSearchParams(window.location.search);
  const fromUrl = normalizeStudioId(params.get("studio"));
  if(fromUrl){ localStorage.setItem("nail_studio_last_studio_id", fromUrl); return fromUrl; }
  return normalizeStudioId(localStorage.getItem("nail_studio_last_studio_id"));
}
const CURRENT_STUDIO_ID = getStudioIdFromUrl();
const CURRENT_STUDIO = CURRENT_STUDIO_ID ? (STUDIOS[CURRENT_STUDIO_ID] || null) : null;
function studioKeySuffix(){ return CURRENT_STUDIO_ID || "ohne-studio"; }
function studioStorageKey(baseKey){ return `${baseKey}_${studioKeySuffix()}`; }

// Geräte-Aktivierung
// Diese Geräte-ID wird einmal pro Browser/Gerät erzeugt und lokal gespeichert.
// Für echte Kontrolle trägst du diese Geräte-ID beim passenden Studio unter allowedDeviceIds ein.
const DEVICE_ID_KEY = "nail_studio_device_id";
function createDeviceId(){
  const randomPart = (crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()).replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toUpperCase();
  return `DEV-${randomPart}`;
}
function getDeviceId(){
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if(!id){
    id = createDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
const CURRENT_DEVICE_ID = getDeviceId();
function getDeviceActivationStatus(){
  if(!CURRENT_STUDIO){
    return {status:"invalid", active:false, deviceId:CURRENT_DEVICE_ID, message:"Keine gültige Studio-ID für Geräteprüfung."};
  }
  const allowed = Array.isArray(CURRENT_STUDIO.allowedDeviceIds) ? CURRENT_STUDIO.allowedDeviceIds : [];
  const max = Number(CURRENT_STUDIO.maxDevices || allowed.length || 1);
  if(allowed.includes(CURRENT_DEVICE_ID)){
    return {status:"active", active:true, deviceId:CURRENT_DEVICE_ID, maxDevices:max, usedDevices:allowed.length, message:"Dieses Gerät ist für dieses Studio aktiviert."};
  }
  if(allowed.length >= max){
    return {status:"blocked", active:false, deviceId:CURRENT_DEVICE_ID, maxDevices:max, usedDevices:allowed.length, message:"Dieses Gerät ist nicht aktiviert. Die maximale Geräteanzahl ist bereits erreicht."};
  }
  return {status:"waiting", active:false, deviceId:CURRENT_DEVICE_ID, maxDevices:max, usedDevices:allowed.length, message:"Dieses Gerät ist noch nicht aktiviert. Geräte-ID an den Entwickler senden und in app.js beim Studio eintragen."};
}
function isCurrentDeviceActive(){
  return getDeviceActivationStatus().active;
}

const KEY = studioStorageKey(BASE_KEY);
const OLD_KEYS = [
  ...BASE_OLD_KEYS.map(studioStorageKey),
  ...BASE_OLD_KEYS
];

function getStudioLicenseStatus(){
  if(!CURRENT_STUDIO_ID){
    return {status:"invalid", studioId:"", studioName:"", message:"Keine Studio-ID im Link gefunden. Beispiel: ?studio=freund-test"};
  }
  if(!CURRENT_STUDIO){
    return {status:"invalid", studioId:CURRENT_STUDIO_ID, studioName:"", message:`Studio-ID „${CURRENT_STUDIO_ID}“ ist nicht freigeschaltet.`};
  }
  if(CURRENT_STUDIO.type === "full"){
    return {status:"full", studioId:CURRENT_STUDIO_ID, studioName:CURRENT_STUDIO.name, message:"Vollversion aktiv."};
  }
  if(CURRENT_STUDIO.type === "trial"){
    const validUntil = CURRENT_STUDIO.validUntil || "";
    const end = new Date(validUntil + "T23:59:59");
    if(validUntil && new Date() <= end){
      return {status:"trial", studioId:CURRENT_STUDIO_ID, studioName:CURRENT_STUDIO.name, validUntil, message:`Testversion gültig bis ${validUntil}.`};
    }
    return {status:"expired", studioId:CURRENT_STUDIO_ID, studioName:CURRENT_STUDIO.name, validUntil, message:"Testversion abgelaufen."};
  }
  if(CURRENT_STUDIO.type === "expired"){
    return {status:"expired", studioId:CURRENT_STUDIO_ID, studioName:CURRENT_STUDIO.name, message:"Lizenz abgelaufen oder gesperrt."};
  }
  return {status:"invalid", studioId:CURRENT_STUDIO_ID, studioName:CURRENT_STUDIO.name || "", message:"Ungültiger Lizenzstatus."};
}
function isStudioLicenseActive(){
  const s = getStudioLicenseStatus();
  return s.status === "full" || s.status === "trial";
}
function requireActiveStudioLicense(){
  const s = getStudioLicenseStatus();
  if(!isStudioLicenseActive()){
    alert("Studio-Lizenz nicht aktiv\n\n" + s.message);
    return false;
  }
  const d = getDeviceActivationStatus();
  if(!d.active){
    alert("Gerät nicht aktiviert\n\n" + d.message + "\n\nGeräte-ID: " + d.deviceId);
    return false;
  }
  return true;
}
function renderStudioLicenseInfo(){
  const box = $("studioLicenseInfo");
  if(!box) return;
  const s = getStudioLicenseStatus();
  const d = getDeviceActivationStatus();
  const statusText = s.status === "full" ? "Vollversion" : s.status === "trial" ? "Testversion" : s.status === "expired" ? "Abgelaufen" : "Nicht aktiv";
  const deviceText = d.active ? "Aktiviert" : d.status === "blocked" ? "Blockiert" : "Wartet auf Freigabe";
  const link = `${location.origin}${location.pathname}?studio=${encodeURIComponent(s.studioId || "freund-test")}`;
  box.innerHTML = `
    <p class="hint"><strong>Studio-ID:</strong> ${escapeHtml(s.studioId || "nicht gesetzt")}</p>
    <p class="hint"><strong>Studio:</strong> ${escapeHtml(s.studioName || "-")}</p>
    <p class="hint"><strong>Lizenz:</strong> ${escapeHtml(statusText)}${s.validUntil ? ` · gültig bis ${escapeHtml(s.validUntil)}` : ""}</p>
    <p class="hint"><strong>Geräte-ID:</strong><br><code>${escapeHtml(d.deviceId)}</code></p>
    <p class="hint"><strong>Geräte-Aktivierung:</strong> ${escapeHtml(deviceText)}${d.maxDevices ? ` · ${escapeHtml(String(d.usedDevices || 0))}/${escapeHtml(String(d.maxDevices))} Geräte eingetragen` : ""}</p>
    <p class="hint"><strong>Direkter Studio-Link:</strong><br><code>${escapeHtml(link)}</code></p>
    <p class="hint">${escapeHtml(s.message)} ${escapeHtml(d.message || "")}</p>
  `;
}

let state;
let editingAppointmentId = null;
let selectedAppointmentId = null;
let movingAppointmentId = null;
let longPressTimer = null;
let touchDragGhost = null;
let touchDragOriginal = null;
let touchDragPointerId = null;
let suppressAppointmentClick = false;
let editingEmployeeId = null;
let editingCustomerId = null;

function uid(){ return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random()); }
function todayISO(){ const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); }
function defaultServices(){ return [
  {id:uid(), name:"Maniküre", price:25, duration:30},
  {id:uid(), name:"Pediküre", price:35, duration:45},
  {id:uid(), name:"Gelmodellage", price:55, duration:90},
  {id:uid(), name:"Auffüllen", price:40, duration:60},
  {id:uid(), name:"Nail Art", price:15, duration:30}
];}
function defaultState(){ return {
  version:"2.8", configured:false, studioId:CURRENT_STUDIO_ID, licensedStudioName:CURRENT_STUDIO ? CURRENT_STUDIO.name : "", studioName:CURRENT_STUDIO ? CURRENT_STUDIO.name : "", studioPhone:"", studioAddress:"", revenueEnabled:false, language:"de", displayDeviceMode:"auto", scheduleZoom:"normal", cloudBackupEnabled:false, cloudBackupProvider:"onedrive", cloudBackupAfterCleanup:false, lastLocalBackup:"", lastCloudBackup:"", openTime:"08:00", closeTime:"20:00",
  employees:[], customers:[], services:defaultServices(), appointments:[], excludedRevenueDays:[], manualRevenueItems:[],
  selectedDate:todayISO(), storageMode:"local"
};}
function loadState(){
  try{
    let data = JSON.parse(localStorage.getItem(KEY));
    if(!data){
      for(const k of OLD_KEYS){
        const old = JSON.parse(localStorage.getItem(k));
        if(old){ data = old; break; }
      }
    }
    data = data || defaultState();
    data.version = 68;
    data.studioId = CURRENT_STUDIO_ID;
    data.licensedStudioName = CURRENT_STUDIO ? CURRENT_STUDIO.name : "";
    if(CURRENT_STUDIO && (!data.studioName || data.studioName === "Mein Nagelstudio" || data.studioName === "Nagelstudio")) data.studioName = CURRENT_STUDIO.name;
    data.services = data.services && data.services.length ? data.services : defaultServices();
    data.excludedRevenueDays = data.excludedRevenueDays || [];
    data.manualRevenueItems = data.manualRevenueItems || [];
    data.customers = data.customers || [];
    data.appointments = (data.appointments || []).map(a => ({...a, status:a.status || "Gebucht", employeeAny: !!a.employeeAny}));
    data.employees = (data.employees || []).map((e, index) => { const auto = paletteColor(index); return normalizeEmployeeRecord({...e, color:(!e.color || isDefaultEmployeeColor(e.color)) ? auto.accent : e.color, rowColor:e.rowColor || auto.bg}, index); });
    data.studioPhone = data.studioPhone || "";
    data.studioAddress = data.studioAddress || "";
    if(typeof data.revenueEnabled !== "boolean") data.revenueEnabled = false;
    data.language = data.language || "de";
    data.displayDeviceMode = normalizeDisplayDeviceMode(data.displayDeviceMode || "auto");
    data.scheduleZoom = normalizeScheduleZoom(data.scheduleZoom || "normal");
    data.cloudBackupEnabled = !!data.cloudBackupEnabled;
    data.cloudBackupProvider = normalizeCloudProvider(data.cloudBackupProvider || "onedrive");
    data.cloudBackupAfterCleanup = !!data.cloudBackupAfterCleanup;
    data.lastLocalBackup = data.lastLocalBackup || "";
    data.lastCloudBackup = data.lastCloudBackup || "";
    return data;
  }catch{ return defaultState(); }
}
function saveState(){ localStorage.setItem(KEY, JSON.stringify(state)); }
function timeToMinutes(t){ const [h,m]=t.split(":").map(Number); return h*60+m; }
function minutesToTime(min){ return `${String(Math.floor(min/60)).padStart(2,"0")}:${String(min%60).padStart(2,"0")}`; }

function formatDateShort(dateString){
  if(!dateString || !dateString.includes("-")) return dateString || "";
  const [yyyy, mm, dd] = dateString.split("-");
  return `${dd}/${mm}/${String(yyyy).slice(-2)}`;
}

function money(n){ return Number(n||0).toLocaleString("de-DE",{style:"currency",currency:"EUR"}); }
function statusClass(status){ return "status-" + String(status || "Gebucht").replace(/\s+/g,"-"); }
function appointmentClass(a){ return `appointment ${statusClass(a && a.status)}${a && a.employeeAny ? " appointment-any-employee" : ""}`; }
function slots(){ const out=[]; for(let m=timeToMinutes(state.openTime); m<timeToMinutes(state.closeTime); m+=30) out.push(minutesToTime(m)); return out; }


// Version 49: automatische Mitarbeiterfarben für den Tagesplan.
// 12 dezente Pastell-Hintergründe wiederholen sich bei mehr als 12 Mitarbeitern.
// Die Werte werden pro Mitarbeiter gespeichert, damit die Zuordnung stabil bleibt.
const EMPLOYEE_COLOR_PALETTE = [
  {accent:"#d94f93", bg:"#fff0f7"}, // Rosa
  {accent:"#b88918", bg:"#fff7df"}, // Gold/Creme
  {accent:"#2f80ed", bg:"#edf6ff"}, // Hellblau
  {accent:"#1f8a5b", bg:"#effaf4"}, // Hellgrün
  {accent:"#8e5bd6", bg:"#f5efff"}, // Flieder
  {accent:"#d9822b", bg:"#fff3e8"}, // Apricot
  {accent:"#008b8b", bg:"#ecfbfb"}, // Mint
  {accent:"#a06a42", bg:"#fbf1e8"}, // Sand
  {accent:"#6c63c7", bg:"#f1f0ff"}, // Lavendel
  {accent:"#c85a54", bg:"#fff0ee"}, // Pfirsich
  {accent:"#4a90a4", bg:"#eefaff"}, // Eisblau
  {accent:"#6f8f3f", bg:"#f3f8ea"}  // Salbei
];
function paletteColor(index){ return EMPLOYEE_COLOR_PALETTE[index % EMPLOYEE_COLOR_PALETTE.length]; }
function isDefaultEmployeeColor(color){ return !color || String(color).toLowerCase() === "#2d1b25"; }
function ensureEmployeeColors(){
  (state.employees || []).forEach((emp, index) => {
    const auto = paletteColor(index);
    if(!emp.color || isDefaultEmployeeColor(emp.color)) emp.color = auto.accent;
    if(!emp.rowColor) emp.rowColor = auto.bg;
  });
}
function employeeRowStyle(emp, extraStyle=""){
  const bg = escapeHtml(emp.rowColor || "#fff");
  const accent = escapeHtml(emp.color || "#d94f93");
  return `style="${extraStyle}--employee-row-bg:${bg};--employee-accent:${accent};background:${bg};"`;
}
function newEmployeeRecord(name){
  const auto = paletteColor((state.employees || []).length);
  return {id:uid(), name, active:true, color:auto.accent, rowColor:auto.bg, workSettings:defaultEmployeeWorkSettings()};
}
function defaultEmployeeWorkSettings(){
  return {
    employmentType:"fulltime",
    workStart:"08:00",
    workEnd:"20:00",
    vacationEnabled:false,
    vacationFrom:"",
    vacationTo:"",
    vacationDates:[],
    weeklyWork:{enabled:false, days:{}},
    specialWorkDates:[],
    note:""
  };
}
const WEEKDAY_KEYS = ["mon","tue","wed","thu","fri","sat","sun"];
const WORKDAY_SETTING_KEYS = ["mon","tue","wed","thu","fri","sat"];
const WEEKDAY_LABELS = {mon:"Montag", tue:"Dienstag", wed:"Mittwoch", thu:"Donnerstag", fri:"Freitag", sat:"Samstag", sun:"Sonntag"};
const WEEKDAY_SHORT_LABELS = {mon:"Mo", tue:"Di", wed:"Mi", thu:"Do", fri:"Fr", sat:"Sa", sun:"So"};
function weekdayKeyFromDate(dateString){
  if(!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return "";
  const jsDay = new Date(dateString + "T00:00:00").getDay();
  return ["sun","mon","tue","wed","thu","fri","sat"][jsDay] || "";
}
function normalizeWeeklyWork(weekly){
  const out = {enabled:!!weekly?.enabled, days:{}};
  WEEKDAY_KEYS.forEach(key => {
    const src = weekly?.days?.[key] || {};
    const start = /^\d{2}:\d{2}$/.test(src.start || "") ? src.start : "08:00";
    const end = /^\d{2}:\d{2}$/.test(src.end || "") ? src.end : "20:00";
    out.days[key] = {enabled:!!src.enabled, start, end};
  });
  return out;
}
function normalizeSpecialWorkDates(items){
  const map = new Map();
  (Array.isArray(items) ? items : []).forEach(item => {
    const date = String(item?.date || "");
    const start = String(item?.start || "");
    const end = String(item?.end || "");
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    if(!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return;
    if(timeToMinutes(start) >= timeToMinutes(end)) return;
    map.set(date, {date, start, end});
  });
  return Array.from(map.values()).sort((a,b) => a.date.localeCompare(b.date));
}
function employeeSpecialWorkForDate(emp, date){
  const w = emp?.workSettings || defaultEmployeeWorkSettings();
  return normalizeSpecialWorkDates(w.specialWorkDates).find(item => item.date === date) || null;
}
function weeklyWorkSummary(weekly){
  const w = normalizeWeeklyWork(weekly);
  if(!w.enabled) return "";
  const parts = WORKDAY_SETTING_KEYS.filter(k => w.days[k].enabled).map(k => `${WEEKDAY_SHORT_LABELS[k]} ${w.days[k].start}–${w.days[k].end}`);
  return parts.length ? parts.join(", ") : "keine Wochentage freigegeben";
}
function employeeWorkWindowForDate(emp, date){
  const w = emp?.workSettings || defaultEmployeeWorkSettings();
  const weekly = normalizeWeeklyWork(w.weeklyWork);
  const dayKey = weekdayKeyFromDate(date);
  const special = employeeSpecialWorkForDate(emp, date);
  if(special){
    return {available:true, start:special.start, end:special.end, dayKey, special:true};
  }

  // Sonntag ist in dieser App kein Arbeitstag und wird auch in den
  // Einstellungen nicht mehr angeboten. Alte gespeicherte Sonntag-Freigaben
  // werden hier bewusst ignoriert.
  if(dayKey === "sun"){
    return {available:false, start:"", end:"", dayKey};
  }

  if(weekly.enabled){
    const day = weekly.days[dayKey];
    if(!day || !day.enabled){
      return {available:false, start:"", end:"", dayKey};
    }
    return {available:true, start:day.start, end:day.end, dayKey};
  }
  return {available:true, start:w.workStart || state.openTime || "08:00", end:w.workEnd || state.closeTime || "20:00", dayKey};
}
function normalizeEmploymentType(type){
  return ["fulltime","parttime","minijob","custom"].includes(type) ? type : "fulltime";
}
function normalizeEmployeeRecord(emp, index=0){
  const auto = paletteColor(index);
  const base = defaultEmployeeWorkSettings();
  const work = {...base, ...(emp.workSettings || {})};
  work.employmentType = normalizeEmploymentType(work.employmentType);
  work.workStart = /^\d{2}:\d{2}$/.test(work.workStart || "") ? work.workStart : base.workStart;
  work.workEnd = /^\d{2}:\d{2}$/.test(work.workEnd || "") ? work.workEnd : base.workEnd;
  work.vacationEnabled = !!work.vacationEnabled;
  work.vacationFrom = work.vacationFrom || "";
  work.vacationTo = work.vacationTo || "";
  work.vacationDates = Array.isArray(work.vacationDates) ? [...new Set(work.vacationDates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort() : [];
  work.weeklyWork = normalizeWeeklyWork(work.weeklyWork);
  work.specialWorkDates = normalizeSpecialWorkDates(work.specialWorkDates);
  work.note = work.note || "";
  return {
    ...emp,
    id:emp.id || uid(),
    name:emp.name || "",
    active:emp.active !== false,
    color:(!emp.color || isDefaultEmployeeColor(emp.color)) ? auto.accent : emp.color,
    rowColor:emp.rowColor || auto.bg,
    workSettings:work
  };
}
function employmentTypeLabel(type){
  const labels = {
    fulltime:"Vollzeit",
    parttime:"Teilzeit / Aushilfe",
    minijob:"Minijob",
    custom:"Individuell"
  };
  return labels[normalizeEmploymentType(type)] || labels.fulltime;
}
function employeeVacationCoversDate(emp, date){
  const w = emp?.workSettings || defaultEmployeeWorkSettings();
  if(!w.vacationEnabled || !date) return false;
  if(Array.isArray(w.vacationDates) && w.vacationDates.includes(date)) return true;
  if(!w.vacationFrom || !w.vacationTo) return false;
  const from = w.vacationFrom <= w.vacationTo ? w.vacationFrom : w.vacationTo;
  const to = w.vacationFrom <= w.vacationTo ? w.vacationTo : w.vacationFrom;
  return date >= from && date <= to;
}
function employeeVacationIssueText(emp, date){
  const w = emp?.workSettings || defaultEmployeeWorkSettings();
  if(!w.vacationEnabled) return "";
  if(Array.isArray(w.vacationDates) && w.vacationDates.includes(date)) return `${emp.name} ist am ${formatDateShort(date)} im Urlaub / gesperrt.`;
  if(w.vacationFrom && w.vacationTo) return `${emp.name} ist vom ${formatDateShort(w.vacationFrom)} bis ${formatDateShort(w.vacationTo)} im Urlaub.`;
  return `${emp.name} ist an diesem Tag im Urlaub / gesperrt.`;
}
function employeeAvailabilityIssue(emp, date, startTime, duration){
  if(!emp) return "Mitarbeiter nicht gefunden.";
  const w = emp.workSettings || defaultEmployeeWorkSettings();
  if(employeeVacationCoversDate(emp, date)) return employeeVacationIssueText(emp, date);
  if(!startTime) return "Bitte Uhrzeit eintragen.";
  const start = timeToMinutes(startTime);
  const end = start + Math.max(1, Number(duration || 60));
  const window = employeeWorkWindowForDate(emp, date);
  if(!window.available){
    const label = WEEKDAY_LABELS[window.dayKey] || "diesem Tag";
    return `${emp.name} hat an ${label} keinen freigegebenen Arbeitstag.`;
  }
  const workStart = timeToMinutes(window.start);
  const workEnd = timeToMinutes(window.end);
  if(start < workStart || end > workEnd){
    const weekly = normalizeWeeklyWork(w.weeklyWork);
    const dayLabel = WEEKDAY_LABELS[window.dayKey] || "diesen Tag";
    if(window.special){
      return `${emp.name} ist am ${formatDateShort(date)} nur von ${window.start} bis ${window.end} als Sonder-Arbeitstag freigegeben.`;
    }
    if(weekly.enabled){
      return `${emp.name} ist am ${dayLabel} nur von ${window.start} bis ${window.end} freigegeben.`;
    }
    return `${emp.name} ist als ${employmentTypeLabel(w.employmentType)} nur von ${window.start} bis ${window.end} freigegeben.`;
  }
  return "";
}
function isEmployeeAvailableForAppointment(emp, date, startTime, duration){
  return !employeeAvailabilityIssue(emp, date, startTime, duration);
}

state = loadState();


function normalizeNamePhone(name, phone){
  return {
    name:String(name || "").trim().toLowerCase().replace(/\s+/g," "),
    phone:String(phone || "").replace(/\s+/g,"").trim()
  };
}
function normalizePhoneSearch(value){
  return String(value || "").replace(/[^0-9+]/g, "").toLowerCase();
}
const COMMON_MOBILE_PREFIXES = ["0151","0152","0155","0157","0159","0160","0162","0163","0170","0171","0172","0173","0174","0175","0176","0177","0178","0179"];
function splitPhoneNumber(phone){
  const raw = String(phone || "").trim();
  const compact = raw.replace(/\s+/g, "");
  const prefix = COMMON_MOBILE_PREFIXES.find(p => compact.startsWith(p));
  if(prefix){
    return { prefix, number: compact.slice(prefix.length) };
  }
  return { prefix:"", number: raw };
}
function combinePhoneFields(prefixId="customerPhonePrefix", numberId="customerPhoneNumber"){
  const prefixEl = $(prefixId);
  const numberEl = $(numberId);
  const prefix = prefixEl ? prefixEl.value.trim().replace(/\s+/g, "") : "";
  const number = numberEl ? numberEl.value.trim().replace(/^[-\s/]+/, "") : "";
  return [prefix, number].filter(Boolean).join(" ").trim();
}
function setSplitPhoneFields(phone, prefixId="customerPhonePrefix", numberId="customerPhoneNumber"){
  const parts = splitPhoneNumber(phone);
  if($(prefixId)) $(prefixId).value = parts.prefix;
  if($(numberId)) $(numberId).value = parts.number;
}
function findCustomerByNamePhone(name, phone){
  const key = normalizeNamePhone(name, phone);
  if(!key.name || !key.phone) return null;
  return (state.customers || []).find(c => {
    const ck = normalizeNamePhone(c.name, c.phone);
    return ck.name === key.name && ck.phone === key.phone;
  });
}

function byName(a,b){ return String(a.name || "").localeCompare(String(b.name || ""), "de", {sensitivity:"base"}); }
function normalizeCloudProvider(provider){
  return ["onedrive","google","dropbox","icloud"].includes(provider) ? provider : "onedrive";
}
function normalizeDisplayDeviceMode(mode){
  return ["auto","iphone","ipad","pc"].includes(mode) ? mode : "auto";
}
function normalizeScheduleZoom(zoom){
  return ["small","normal","large"].includes(zoom) ? zoom : "normal";
}
function getEffectiveDeviceMode(){
  const selected = normalizeDisplayDeviceMode(state.displayDeviceMode || "auto");
  if(selected !== "auto") return selected;
  const w = window.innerWidth || document.documentElement.clientWidth || 1200;
  const h = window.innerHeight || document.documentElement.clientHeight || 900;
  const shortest = Math.min(w, h);
  const longest = Math.max(w, h);
  const touch = (navigator.maxTouchPoints || 0) > 0 || window.matchMedia?.("(pointer: coarse)").matches;
  if(shortest <= 640) return "iphone";
  // iPad Safari kann sich wie ein Desktop melden. Deshalb zählt hier zusätzlich die typische iPad-Größe.
  if((touch && longest <= 1366) || (shortest >= 700 && longest <= 1366)) return "ipad";
  return "pc";
}
function applyDeviceView(){
  const body = document.body;
  if(!body) return;
  const mode = getEffectiveDeviceMode();
  const zoom = normalizeScheduleZoom(state.scheduleZoom || "normal");
  body.classList.remove("app-device-auto","app-device-iphone","app-device-ipad","app-device-pc","schedule-zoom-small","schedule-zoom-normal","schedule-zoom-large");
  body.classList.add("app-device-" + mode, "schedule-zoom-" + zoom);
  body.dataset.deviceSetting = normalizeDisplayDeviceMode(state.displayDeviceMode || "auto");
  body.dataset.deviceMode = mode;
  body.dataset.scheduleZoom = zoom;
  updateDisplayModeHint();
}

function updateDisplayModeHint(){
  const el = $("displayModeHint");
  if(!el) return;
  const setting = normalizeDisplayDeviceMode(state.displayDeviceMode || "auto");
  const mode = document.body?.dataset?.deviceMode || getEffectiveDeviceMode();
  const zoom = normalizeScheduleZoom(state.scheduleZoom || "normal");
  const names = {auto:"Automatisch", iphone:"iPhone", ipad:"iPad", pc:"PC / Windows"};
  const zoomNames = {small:"Kompakt", normal:"Normal", large:"Groß"};
  el.textContent = `Aktiv: ${setting === "auto" ? "Automatisch → " + names[mode] : names[mode]} · Tagesplan: ${zoomNames[zoom]}`;
}

function escapeHtml(str){ return String(str??"").replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }

function boot(){
  $("currentDateInput").value = state.selectedDate || todayISO();
  bindEvents();
  state.configured ? showMain() : showSetup();
  startCurrentTimeTicker();
  window.addEventListener("resize", () => { if((state.displayDeviceMode || "auto") === "auto"){ applyDeviceView(); renderCalendar(); } });
}
function showSetup(){ $("setupScreen").classList.remove("hidden"); $("mainScreen").classList.add("hidden"); }
function showMain(){ $("setupScreen").classList.add("hidden"); $("mainScreen").classList.remove("hidden"); renderAll(); }

function bindEvents(){
  $("finishSetupBtn").onclick = () => {
    if(!requireActiveStudioLicense()) return;
    const names = $("employeesInput").value.split(",").map(s=>s.trim()).filter(Boolean).slice(0,20);
    state.studioName = $("studioNameInput").value.trim() || "Mein Nagelstudio";
    state.studioPhone = $("studioPhoneInput").value.trim();
    state.studioAddress = $("studioAddressInput").value.trim();
    state.openTime = $("openTimeInput").value || "08:00";
    state.closeTime = $("closeTimeInput").value || "20:00";
    state.employees = names.map((name, index)=>{ const auto = paletteColor(index); return {id:uid(), name, active:true, color:auto.accent, rowColor:auto.bg}; });
    state.configured = true; state.selectedDate = todayISO(); saveState(); showMain();
  };
  $("saveAppointmentBtn").onclick = saveAppointment;
  $("clearFormBtn").onclick = clearForm;
  $("employeeAnyBtn") && ($("employeeAnyBtn").onclick = () => setEmployeeAnyActive(!isEmployeeAnyActive()));
  $("serviceName").oninput = renderServiceSuggestions;
  $("serviceName").onchange = applyExactService;
  $("customerSearchInput").oninput = renderCustomerSearch;
  $("customerName").oninput = renderCustomerNameSuggestions;
  $("customerName").onchange = applyExactCustomer;
  $("customerPhonePrefix") && ($("customerPhonePrefix").onchange = () => { $("customerPhoneNumber") && $("customerPhoneNumber").focus(); });
  $("currentDateInput").onchange = e => { state.selectedDate=e.target.value; saveState(); renderCalendar(); renderReport(); };
  $("todayBtn").onclick = () => { state.selectedDate=todayISO(); $("currentDateInput").value=state.selectedDate; saveState(); switchTab("calendarTab"); renderCalendar(); renderReport(); };
  $("prevDayBtn").onclick = () => shiftDay(-1);
  $("nextDayBtn").onclick = () => shiftDay(1);
  $("settingsBtn").onclick = openSettings;
  document.querySelectorAll(".settings-tab").forEach(btn => btn.onclick = () => switchSettingsTab(btn.dataset.settingsTab));
  const openHiddenRevenue = () => { $("toggleRevenueFeature") && ($("toggleRevenueFeature").checked = !!state.revenueEnabled); if($("revenueEditDate")) $("revenueEditDate").value = state.selectedDate || todayISO(); renderRevenueEditor(); $("hiddenRevenueDialog") && $("hiddenRevenueDialog").showModal(); };
  $("hiddenRevenueOpenBtn") && ($("hiddenRevenueOpenBtn").onclick = openHiddenRevenue);
  $("hiddenRevenueFooterBtn") && ($("hiddenRevenueFooterBtn").onclick = openHiddenRevenue);
  $("closeHiddenRevenueBtn") && ($("closeHiddenRevenueBtn").onclick = () => $("hiddenRevenueDialog").close());
  $("revenueEditDate") && ($("revenueEditDate").onchange = renderRevenueEditor);
  $("addManualRevenueBtn") && ($("addManualRevenueBtn").onclick = addManualRevenueItem);
  $("revenueIncludeDayBtn") && ($("revenueIncludeDayBtn").onclick = () => setRevenueDayExcluded(false));
  $("revenueExcludeDayBtn") && ($("revenueExcludeDayBtn").onclick = () => setRevenueDayExcluded(true));
  $("cloudBackupNowBtn") && ($("cloudBackupNowBtn").onclick = cloudBackupNow);
  $("cloudBackupProvider") && ($("cloudBackupProvider").onchange = saveCloudBackupSettings);
  $("cloudBackupEnabled") && ($("cloudBackupEnabled").onchange = saveCloudBackupSettings);
  $("dashboardCleanupBackupBtn") && ($("dashboardCleanupBackupBtn").onclick = exportBackup);
  $("languageSelect") && ($("languageSelect").onchange = () => { state.language = $("languageSelect").value; saveState(); renderAll(); updateCleanupPreview(); applyLanguage(); });
  $("closeSettingsBtn").onclick = () => $("settingsDialog").close();
  $("saveSettingsBtn").onclick = saveSettings;
  $("addServiceBtn").onclick = addService;
  $("saveEmployeeBtn").onclick = saveEmployeeFromSettings;
  $("saveCustomerBtn").onclick = saveCustomerFromSettings;
  $("cancelCustomerEditBtn").onclick = cancelCustomerEdit;
  $("cancelEmployeeEditBtn").onclick = cancelEmployeeEdit;
  $("closeAppointmentBtn").onclick = () => $("appointmentDialog").close();
  $("deleteAppointmentBtn").onclick = deleteSelectedAppointment;
  $("editAppointmentBtn").onclick = editSelectedAppointment;
  $("completeAppointmentBtn").onclick = completeSelectedAppointment;
  $("noShowAppointmentBtn") && ($("noShowAppointmentBtn").onclick = noShowSelectedAppointment);
  $("exportBtn") && ($("exportBtn").onclick = exportBackup);
  $("settingsBackupBtn") && ($("settingsBackupBtn").onclick = exportBackup);
  $("importInput") && ($("importInput").onchange = importBackup);
  $("settingsImportInput") && ($("settingsImportInput").onchange = importBackup);
  $("cleanupPastAndBackupBtn") && ($("cleanupPastAndBackupBtn").onclick = cleanupPastCompletedAndBackup);
  $("cloudBackupProvider") && ($("cloudBackupProvider").onchange = saveCloudBackupSettings);
  $("cloudBackupEnabled") && ($("cloudBackupEnabled").onchange = saveCloudBackupSettings);
  $("cloudBackupAfterCleanup") && ($("cloudBackupAfterCleanup").onchange = saveCloudBackupSettings);
  $("refreshReportBtn").onclick = renderReport;
  $("reportDate") && ($("reportDate").onchange = () => { state.selectedDate = $("reportDate").value || state.selectedDate; $("currentDateInput").value = state.selectedDate; saveState(); renderReport(); });
  document.querySelectorAll(".report-mode").forEach(btn => btn.onclick = () => setReportMode(btn.dataset.reportMode));
  $("deleteWholeDayBtn").onclick = deleteWholeDayAppointments;
  $("toggleRevenueFeature") && ($("toggleRevenueFeature").onchange = () => { state.revenueEnabled = $("toggleRevenueFeature").checked; saveState(); applyRevenueVisibility(); renderReport(); });
  $("displayDeviceMode") && ($("displayDeviceMode").onchange = () => { state.displayDeviceMode = normalizeDisplayDeviceMode($("displayDeviceMode").value); saveState(); applyDeviceView(); renderCalendar(); });
  $("scheduleZoom") && ($("scheduleZoom").onchange = () => { state.scheduleZoom = normalizeScheduleZoom($("scheduleZoom").value); saveState(); applyDeviceView(); renderCalendar(); });
  $("deletePeriodType") && ($("deletePeriodType").onchange = updateDeletePeriodPreview);
  $("deleteDayInput") && ($("deleteDayInput").onchange = updateDeletePeriodPreview);
  document.querySelectorAll("[data-tab]").forEach(btn => btn.onclick = () => switchTab(btn.dataset.tab));
}

function switchTab(id){
  if(id==="reportTab" && !state.revenueEnabled) id="calendarTab";
  document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active", b.dataset.tab===id));
  document.querySelectorAll(".tab-panel").forEach(p=>p.classList.toggle("hidden", p.id!==id));
  if(id==="reportTab") renderReport();
}
function switchSettingsTab(id){
  const target = id || "settingsGeneralTab";
  document.querySelectorAll(".settings-tab").forEach(btn=>{
    btn.classList.toggle("active", btn.dataset.settingsTab === target);
  });
  document.querySelectorAll(".settings-tab-panel").forEach(panel=>{
    panel.classList.toggle("active", panel.id === target);
  });
}

function shiftDay(n){
  const d=new Date(state.selectedDate+"T12:00:00"); d.setDate(d.getDate()+n);
  state.selectedDate=d.toISOString().slice(0,10); $("currentDateInput").value=state.selectedDate; saveState(); renderCalendar(); renderReport();
}

const I18N = {
  de: {
    language:"Sprache", employee:"Mitarbeiter", edit:"Bearbeiten", delete:"Löschen", activate:"Aktivieren", deactivate:"Deaktivieren", cancelEdit:"Bearbeiten abbrechen", importBackup:"Backup importieren", deleteAppointmentsPeriod:"Termine im gewählten Zeitraum endgültig löschen", cleanupArchive:"Bereinigung & Backup", cleanupArchiveHint:"Löscht erledigte Termine und vergangene Tage dauerhaft aus der App und erzeugt danach automatisch ein Backup.", cleanupPastAndBackup:"Vergangene erledigte Termine löschen + Backup erzeugen", dashboardCleanupBackup:"Backup", cloudBackup:"Cloud-Backup", cloudBackupHint:"Optionales Cloud-Backup für später vorbereiten. Aktuell erzeugt die App weiterhin lokale Backup-Dateien.", cloudProvider:"Cloud-Anbieter", enableCloudBackup:"Cloud-Backup aktivieren", settingsStudio:"Studio", newAppointment:"Neuer Termin", appointmentWithEmployee:"Termin bei Mitarbeiter",
    time:"Uhrzeit", note:"Notiz", customer:"Kunde", phone:"Telefon", phonePrefix:"Vorwahl", phoneNumber:"Nummer", service:"Leistung", price:"Preis €", duration:"Dauer Min",
    saveAppointment:"Termin speichern", clearForm:"Formular leeren", customerSearch:"Kundensuche", settings:"Einstellungen",
    employeeDatabase:"Mitarbeiter-Datenbank", customerFile:"Kundendatenbank", serviceDatabase:"Leistungsdatenbank", systemInfo:"System Info", backup:"Backup",
    backupRestore:"Backup & Wiederherstellung", revenueFeature:"Umsatzfunktion",
    close:"Schließen", saveStudio:"Studio speichern", saveEmployee:"Mitarbeiter speichern", saveCustomer:"Kunde speichern",
    saveService:"Leistung speichern", exportBackup:"Backup exportieren", today:"Heute", studioName:"Studio-Name",
    studioPhone:"Telefonnummer vom Studio", studioAddress:"Adresse vom Studio", name:"Name", customerName:"Kundenname",
    email:"E-Mail", serviceName:"Name der Leistung", selectPeriod:"Zeitraum auswählen", selectDate:"Datum auswählen"
  },
  vi: {
    language:"Ngôn ngữ", employee:"Nhân viên", edit:"Sửa", delete:"Xóa", activate:"Kích hoạt", deactivate:"Tắt", cancelEdit:"Hủy sửa", importBackup:"Nhập sao lưu", deleteAppointmentsPeriod:"Xóa vĩnh viễn lịch hẹn trong khoảng đã chọn", cleanupArchive:"Dọn dẹp & sao lưu", cleanupArchiveHint:"Xóa vĩnh viễn lịch hẹn đã hoàn thành và các ngày cũ, sau đó tự tạo bản sao lưu.", cleanupPastAndBackup:"Xóa lịch hẹn cũ + tạo sao lưu", dashboardCleanupBackup:"Sao lưu", cloudBackup:"Sao lưu Cloud", cloudBackupHint:"Chuẩn bị sao lưu Cloud tùy chọn cho sau này. Hiện tại ứng dụng vẫn tạo file sao lưu cục bộ.", cloudProvider:"Nhà cung cấp Cloud", enableCloudBackup:"Bật sao lưu Cloud", settingsStudio:"Tiệm", newAppointment:"Lịch hẹn mới", appointmentWithEmployee:"Nhân viên",
    time:"Giờ", note:"Ghi chú", customer:"Khách hàng", phone:"Số điện thoại", phonePrefix:"Mã vùng", phoneNumber:"Số", service:"Dịch vụ", price:"Giá €", duration:"Thời gian phút",
    saveAppointment:"Lưu lịch hẹn", clearForm:"Xóa biểu mẫu", customerSearch:"Tìm khách", settings:"Cài đặt",
    employeeDatabase:"Danh sách nhân viên", customerFile:"Cơ sở dữ liệu khách hàng", serviceDatabase:"Danh sách dịch vụ", systemInfo:"Thông tin hệ thống", backup:"Sao lưu",
    backupRestore:"Sao lưu & khôi phục", revenueFeature:"Chức năng doanh thu",
    close:"Đóng", saveStudio:"Lưu tiệm", saveEmployee:"Lưu nhân viên", saveCustomer:"Lưu khách hàng",
    saveService:"Lưu dịch vụ", exportBackup:"Xuất sao lưu", today:"Hôm nay", studioName:"Tên tiệm",
    studioPhone:"Số điện thoại tiệm", studioAddress:"Địa chỉ tiệm", name:"Tên", customerName:"Tên khách hàng",
    email:"E-Mail", serviceName:"Tên dịch vụ", selectPeriod:"Chọn khoảng thời gian", selectDate:"Chọn ngày"
  },
  en: {
    language:"Language", employee:"Employee", edit:"Edit", delete:"Delete", activate:"Activate", deactivate:"Deactivate", cancelEdit:"Cancel edit", importBackup:"Import backup", deleteAppointmentsPeriod:"Permanently delete appointments in selected period", cleanupArchive:"Cleanup & backup", cleanupArchiveHint:"Permanently deletes completed appointments and past days, then automatically creates a backup.", cleanupPastAndBackup:"Delete past appointments + create backup", dashboardCleanupBackup:"Backup", cloudBackup:"Cloud backup", cloudBackupHint:"Prepare optional cloud backup for later. Currently the app still creates local backup files.", cloudProvider:"Cloud provider", enableCloudBackup:"Enable cloud backup", settingsStudio:"Studio", newAppointment:"New appointment", appointmentWithEmployee:"Appointment with employee",
    time:"Time", note:"Note", customer:"Customer", phone:"Phone", phonePrefix:"Prefix", phoneNumber:"Number", service:"Service", price:"Price €", duration:"Duration min",
    saveAppointment:"Save appointment", clearForm:"Clear form", customerSearch:"Customer search", settings:"Settings",
    employeeDatabase:"Employee database", customerFile:"Customer database", serviceDatabase:"Service database", systemInfo:"System info", backup:"Backup",
    backupRestore:"Backup & restore", revenueFeature:"Revenue feature",
    close:"Close", saveStudio:"Save studio", saveEmployee:"Save employee", saveCustomer:"Save customer",
    saveService:"Save service", exportBackup:"Export backup", today:"Today", studioName:"Studio name",
    studioPhone:"Studio phone", studioAddress:"Studio address", name:"Name", customerName:"Customer name",
    email:"Email", serviceName:"Service name", selectPeriod:"Select period", selectDate:"Select date"
  }
};
Object.assign(I18N.de, {
  initialSetup:"Ersteinrichtung", setupHint:"Die App läuft lokal auf diesem Gerät. Cloud-Backup nutzt aktuell Export oder Teilen-Menü.", opensAt:"Öffnet um", closesAt:"Schließt um", initialEmployees:"Erste Mitarbeiter, getrennt mit Komma", startApp:"App starten", dailySchedule:"Tagesplan", revenueReport:"Umsatzbericht", from:"Von", to:"Bis", refreshReport:"Bericht aktualisieren", period:"Zeitraum", appointmentsPeriod:"Termine Zeitraum", deletedFromRevenue:"Aus Umsatz gelöscht", daysInReport:"Tage im Bericht", deleteRevenueHint:"Mit „Aus Umsatz löschen“ wird der komplette Tag nicht mehr im Umsatzbericht gezählt. Die Termine bleiben im Kalender erhalten.", deletedRevenueDays:"Gelöschte Tage für Umsatzbericht", employeeHint:"Mitarbeiter hier anlegen, verändern oder deaktivieren.", calendarFontColor:"Schriftfarbe im Kalender", customerHint:"Kunden hier anlegen, bearbeiten oder löschen. Beim Eintippen im Terminformular werden Kundendaten vorgeschlagen.", serviceHint:"Leistungen mit Preisen und Dauer selbst gestalten und speichern.", deleteAppointmentsPermanently:"Termine endgültig löschen", deleteAppointmentsHint:"Achtung: Diese Funktion löscht Termine endgültig. Es gibt keine Wiederherstellung in der App. Vorher am besten ein Backup exportieren.", wholeDay:"Ganzer Tag", wholeWeek:"Ganze Woche", wholeMonth:"Ganzer Monat", appointment:"Termin", markDonePaid:"Als erledigt / bezahlt", markNoShow:"Nicht erschienen", localBackup:"💾 Lokal Backup", localBackupHint:"Exportiert und importiert lokale JSON-Backups. „Bereinigung + Backup“ löscht alle Termine vor heute und erstellt danach ein Backup. Termine von heute und danach bleiben erhalten.", cleanupAndBackup:"Bereinigung + Backup", cloudBackupNow:"Cloud Backup jetzt erstellen", autoAfterCleanup:"Automatisch nach „Bereinigung + Backup“", enableRevenueArea:"Umsatzbereich aktivieren", revenueVisibilityHint:"Wenn deaktiviert, werden Umsatzbericht, Umsatzbutton und Umsatzfunktionen ausgeblendet.", noLocalBackup:"Noch kein lokales Backup erstellt.", lastLocalBackup:"Letztes lokales Backup", noCloudBackup:"Noch kein Cloud Backup erstellt.", lastCloudBackup:"Letztes Cloud Backup", cloudDisabled:"Cloud Backup ist deaktiviert.", cloudStatusHint:"Bei aktivem Cloud Backup wird das Teilen/Speichern-Menü genutzt.", importSuccess:"Backup wurde erfolgreich wiederhergestellt.", importFailed:"Backup konnte nicht gelesen werden. Datei ist ungültig oder beschädigt.", backupManualDownload:"Backup-Datei manuell herunterladen", noCleanupData:"Keine alten Daten zum Bereinigen gefunden.", cleanupConfirm:"Es werden {appointments} vergangene Termine gelöscht. Termine von heute und danach bleiben erhalten. Danach wird automatisch ein Backup erstellt. Fortfahren?", cleanupRunning:"Bereinige und erstelle Backup...", cleanupDone:"Alle vergangenen Termine vor heute wurden gelöscht. Backup-Datei wurde erstellt: {filename}.", serviceFallback:"Leistung", employeeLabel:"Mitarbeiter", phoneLabel:"Telefon", internalStatus:"Status intern", priceLabel:"Preis", noteLabel:"Notiz", noAppointmentsInRange:"Keine Termine im Zeitraum.", noDeletedDays:"Keine Tage gelöscht.", appointmentsWord:"Termine", revenueDeletedPermanently:"Umsatz endgültig gelöscht", notRecoverable:"Nicht wiederherstellbar", revenueWord:"Umsatz", deleteRevenuePermanently:"Umsatz endgültig löschen", noAppointmentsInRange:"Keine Termine im Zeitraum.", noDeletedDays:"Keine Tage gelöscht.", days:"Tage"
});
Object.assign(I18N.vi, {
  initialSetup:"Thiết lập ban đầu", setupHint:"Ứng dụng lưu dữ liệu cục bộ trên thiết bị này. Sao lưu Cloud hiện dùng xuất file hoặc menu chia sẻ.", opensAt:"Mở cửa lúc", closesAt:"Đóng cửa lúc", initialEmployees:"Nhân viên ban đầu, cách nhau bằng dấu phẩy", startApp:"Bắt đầu ứng dụng", dailySchedule:"Lịch trong ngày", revenueReport:"Báo cáo doanh thu", from:"Từ", to:"Đến", refreshReport:"Cập nhật báo cáo", period:"Khoảng thời gian", appointmentsPeriod:"Lịch hẹn trong khoảng", deletedFromRevenue:"Đã xóa khỏi doanh thu", daysInReport:"Ngày trong báo cáo", deleteRevenueHint:"Khi dùng “Xóa khỏi doanh thu”, cả ngày sẽ không còn được tính trong báo cáo. Lịch hẹn vẫn ở trong lịch.", deletedRevenueDays:"Ngày đã xóa khỏi báo cáo doanh thu", employeeHint:"Tạo, sửa hoặc tắt nhân viên tại đây.", calendarFontColor:"Màu chữ trong lịch", customerHint:"Tạo, sửa hoặc xóa khách hàng. Khi nhập lịch hẹn, dữ liệu khách sẽ được gợi ý.", serviceHint:"Tự tạo dịch vụ với giá và thời lượng.", deleteAppointmentsPermanently:"Xóa lịch hẹn vĩnh viễn", deleteAppointmentsHint:"Chú ý: Chức năng này xóa lịch hẹn vĩnh viễn. Không thể khôi phục trong ứng dụng. Nên xuất sao lưu trước.", wholeDay:"Cả ngày", wholeWeek:"Cả tuần", wholeMonth:"Cả tháng", appointment:"Lịch hẹn", markDonePaid:"Đánh dấu xong / đã trả", localBackup:"💾 Sao lưu cục bộ", localBackupHint:"Xuất và nhập file sao lưu JSON cục bộ. “Dọn dẹp + Sao lưu” xóa dữ liệu cũ trước rồi mới tạo sao lưu.", cleanupAndBackup:"Dọn dẹp + Sao lưu", cloudBackupNow:"Tạo sao lưu Cloud ngay", autoAfterCleanup:"Tự động sau “Dọn dẹp + sao lưu”", enableRevenueArea:"Bật khu vực doanh thu", revenueVisibilityHint:"Khi tắt, báo cáo doanh thu, nút doanh thu và chức năng doanh thu sẽ bị ẩn.", noLocalBackup:"Chưa tạo sao lưu cục bộ.", lastLocalBackup:"Sao lưu cục bộ gần nhất", noCloudBackup:"Chưa tạo sao lưu Cloud.", lastCloudBackup:"Sao lưu Cloud gần nhất", cloudDisabled:"Sao lưu Cloud đang tắt.", cloudStatusHint:"Khi bật Cloud Backup, ứng dụng dùng menu chia sẻ/lưu.", importSuccess:"Đã khôi phục sao lưu thành công.", importFailed:"Không đọc được sao lưu. File không hợp lệ hoặc bị hỏng.", backupManualDownload:"Tải file sao lưu thủ công", noCleanupData:"Không có dữ liệu cũ để dọn dẹp.", cleanupConfirm:"Sẽ xóa {appointments} lịch hẹn cũ và {days} ngày doanh thu cũ. Sau đó sẽ tạo sao lưu dữ liệu đã dọn dẹp. Tiếp tục?", cleanupRunning:"Đang dọn dẹp và tạo sao lưu...", cleanupDone:"Dọn dẹp xong. Đã tạo file sao lưu: {filename}.", serviceFallback:"Dịch vụ", employeeLabel:"Nhân viên", phoneLabel:"Số điện thoại", internalStatus:"Trạng thái nội bộ", priceLabel:"Giá", noteLabel:"Ghi chú", noAppointmentsInRange:"Không có lịch hẹn trong khoảng này.", noDeletedDays:"Chưa xóa ngày nào.", appointmentsWord:"lịch hẹn", revenueDeletedPermanently:"Doanh thu đã xóa vĩnh viễn", notRecoverable:"Không thể khôi phục", revenueWord:"Doanh thu", deleteRevenuePermanently:"Xóa doanh thu vĩnh viễn", noAppointmentsInRange:"Không có lịch hẹn trong khoảng này.", noDeletedDays:"Chưa xóa ngày nào.", days:"ngày"
});
Object.assign(I18N.en, {
  initialSetup:"Initial setup", setupHint:"The app stores data locally on this device. Cloud backup currently uses export or the share menu.", opensAt:"Opens at", closesAt:"Closes at", initialEmployees:"Initial employees, separated by commas", startApp:"Start app", dailySchedule:"Daily schedule", revenueReport:"Revenue report", from:"From", to:"To", refreshReport:"Refresh report", period:"Period", appointmentsPeriod:"Appointments period", deletedFromRevenue:"Deleted from revenue", daysInReport:"Days in report", deleteRevenueHint:"When “Delete from revenue” is used, the whole day is no longer counted in the revenue report. Appointments stay in the calendar.", deletedRevenueDays:"Deleted days for revenue report", employeeHint:"Create, edit or deactivate employees here.", calendarFontColor:"Calendar font color", customerHint:"Create, edit or delete customers here. Customer data is suggested when typing in the appointment form.", serviceHint:"Create services with custom prices and durations.", deleteAppointmentsPermanently:"Permanently delete appointments", deleteAppointmentsHint:"Warning: This permanently deletes appointments. There is no restore function in the app. Export a backup first if needed.", wholeDay:"Whole day", wholeWeek:"Whole week", wholeMonth:"Whole month", appointment:"Appointment", markDonePaid:"Mark done / paid", markNoShow:"No-show", localBackup:"💾 Local Backup", localBackupHint:"Exports and imports local JSON backups. “Cleanup + Backup” deletes all appointments before today and then creates the backup. Today’s and future appointments remain.", cleanupAndBackup:"Cleanup + Backup", cloudBackupNow:"Create cloud backup now", autoAfterCleanup:"Automatically after “Cleanup + Backup”", enableRevenueArea:"Enable revenue area", revenueVisibilityHint:"When disabled, the revenue report, revenue button and revenue functions are hidden.", noLocalBackup:"No local backup created yet.", lastLocalBackup:"Last local backup", noCloudBackup:"No cloud backup created yet.", lastCloudBackup:"Last cloud backup", cloudDisabled:"Cloud backup is disabled.", cloudStatusHint:"When cloud backup is active, the share/save menu is used.", importSuccess:"Backup restored successfully.", importFailed:"Backup could not be read. The file is invalid or damaged.", backupManualDownload:"Download backup file manually", noCleanupData:"No old data found for cleanup.", cleanupConfirm:"{appointments} past appointments will be deleted. Today’s and future appointments will remain. Then a backup will be created. Continue?", cleanupRunning:"Cleaning and creating backup...", cleanupDone:"All appointments before today have been deleted. Backup file created: {filename}.", serviceFallback:"Service", employeeLabel:"Employee", phoneLabel:"Phone", internalStatus:"Internal status", priceLabel:"Price", noteLabel:"Note", noAppointmentsInRange:"No appointments in this period.", noDeletedDays:"No days deleted.", appointmentsWord:"appointments", revenueDeletedPermanently:"Revenue permanently deleted", notRecoverable:"Not recoverable", revenueWord:"Revenue", deleteRevenuePermanently:"Permanently delete revenue", noAppointmentsInRange:"No appointments in this period.", noDeletedDays:"No days deleted.", days:"days"
});
Object.assign(I18N.de, {
  displaySettings:"Darstellung / Geräteansicht",
  displaySettingsHint:"Optimiert die App für iPhone, iPad oder PC. „Automatisch“ erkennt die passende Ansicht selbst.",
  optimizeForDevice:"Darstellung optimieren für",
  deviceAuto:"Automatisch",
  deviceIphone:"iPhone",
  deviceIpad:"iPad",
  devicePc:"PC / Windows",
  scheduleZoom:"Tagesplan-Zoom",
  zoomSmall:"Klein",
  zoomNormal:"Normal",
  zoomLarge:"Groß",
  appointmentConflictTitle:"Termin nicht möglich",
  appointmentConflictMessage:"Dieser Mitarbeiter ist in dieser Zeit bereits belegt. Bestehender Termin: {customer}, {start}–{end}. Bitte eine andere Uhrzeit oder einen anderen Mitarbeiter wählen.",
  appointmentBlockCustomer:"Kundendaten",
  appointmentBlockService:"Leistung",
  appointmentBlockTime:"Termin"
});
Object.assign(I18N.vi, {
  displaySettings:"Hiển thị / chế độ thiết bị",
  displaySettingsHint:"Tối ưu ứng dụng cho iPhone, iPad hoặc PC. “Tự động” sẽ tự nhận diện chế độ phù hợp.",
  optimizeForDevice:"Tối ưu hiển thị cho",
  deviceAuto:"Tự động",
  deviceIphone:"iPhone",
  deviceIpad:"iPad",
  devicePc:"PC / Windows",
  scheduleZoom:"Phóng to lịch ngày",
  zoomSmall:"Nhỏ",
  zoomNormal:"Bình thường",
  zoomLarge:"Lớn",
  appointmentConflictTitle:"Không thể đặt lịch",
  appointmentConflictMessage:"Nhân viên này đã bận trong thời gian đó. Lịch hiện có: {customer}, {start}–{end}. Vui lòng chọn giờ khác hoặc nhân viên khác.",
  appointmentBlockCustomer:"Thông tin khách",
  appointmentBlockService:"Dịch vụ",
  appointmentBlockTime:"Lịch hẹn"
});
Object.assign(I18N.en, {
  displaySettings:"Display / device view",
  displaySettingsHint:"Optimizes the app for iPhone, iPad or PC. “Automatic” detects the best view itself.",
  optimizeForDevice:"Optimize display for",
  deviceAuto:"Automatic",
  deviceIphone:"iPhone",
  deviceIpad:"iPad",
  devicePc:"PC / Windows",
  scheduleZoom:"Schedule zoom",
  zoomSmall:"Small",
  zoomNormal:"Normal",
  zoomLarge:"Large",
  appointmentConflictTitle:"Appointment not possible",
  appointmentConflictMessage:"This employee is already busy at that time. Existing appointment: {customer}, {start}–{end}. Please choose another time or another employee.",
  appointmentBlockCustomer:"Customer details",
  appointmentBlockService:"Service",
  appointmentBlockTime:"Appointment"
});

function t(key){
  const lang = state.language || "de";
  return (I18N[lang] && I18N[lang][key]) || I18N.de[key] || key;
}
function applyLanguage(){
  document.documentElement.lang = state.language || "de";
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if(I18N[state.language || "de"]?.[key] || I18N.de[key]){
      el.textContent = t(key);
    }
  });
  const placeholders = [
    ["customerSearchInput", state.language==="vi" ? "Tìm tên hoặc số điện thoại" : state.language==="en" ? "Search name or phone number" : "Name oder Telefonnummer suchen"],
    ["customerName", state.language==="vi" ? "Tên đầy đủ" : state.language==="en" ? "Full name" : "Vollständiger Name"],
    ["customerPhonePrefix", state.language==="vi" ? "Mã VD 0171" : state.language==="en" ? "e.g. 0171" : "z. B. 0171"],
    ["customerPhoneNumber", state.language==="vi" ? "Số điện thoại" : state.language==="en" ? "Phone number" : "Telefonnummer"],
    ["serviceName", state.language==="vi" ? "Gõ chữ cái đầu" : state.language==="en" ? "Type first letter" : "Ersten Buchstaben tippen"],
    ["settingsEmployeeName", state.language==="vi" ? "Tên nhân viên" : state.language==="en" ? "Employee name" : "Mitarbeitername"],
    ["settingsCustomerName", state.language==="vi" ? "Tên đầy đủ" : state.language==="en" ? "Full name" : "Vollständiger Name"],
    ["settingsCustomerPhone", state.language==="vi" ? "Số điện thoại" : state.language==="en" ? "Phone number" : "Telefonnummer"],
    ["newServiceName", state.language==="vi" ? "ví dụ: Đắp gel" : state.language==="en" ? "e.g. Gel nails" : "z. B. Gelmodellage"]
  ];
  placeholders.forEach(([id, value]) => { if($(id)) $(id).placeholder = value; });
}

function renderAll(){
  applyDeviceView();
  $("studioTitle").textContent = state.studioName || "Nagelstudio";
  renderStudioContactLine();
  applyLanguage();
  dedupeCustomers();
  $("currentDateInput").value = state.selectedDate;
  if($("reportDate")) $("reportDate").value ||= state.selectedDate;
  $("reportFrom").value ||= state.selectedDate;
  $("reportTo").value ||= state.selectedDate;
  renderStartTimeOptions(); renderEmployeeSelect(); renderSettingsEmployeeList(); renderWorkTimeList(); renderCustomerDatalist(); renderSettingsCustomerList(); renderServiceDatalist(); renderServiceList(); renderCustomerSearch(); renderCalendar(); applyRevenueVisibility(); renderReport(); updateBackupStatuses(); renderStudioLicenseInfo();
}


function renderStudioContactLine(){
  const line = $("studioContactLine");
  if(!line) return;
  const parts = [state.studioPhone, state.studioAddress].filter(Boolean);
  line.textContent = parts.join(" · ");
}


function renderStartTimeOptions(){
  const select = $("startTime");
  if(!select) return;
  const current = select.value || "";
  const options = [`<option value="">--:--</option>`]
    .concat(slots().map(t => `<option value="${t}">${t}</option>`));
  select.innerHTML = options.join("");
  if(current && [...select.options].some(o => o.value === current)){
    select.value = current;
  }
}

function renderEmployeeSelect(){
  $("employeeSelect").innerHTML = state.employees.filter(e=>e.active).sort(byName).map(e=>`<option value="${e.id}">${escapeHtml(e.name)}</option>`).join("");
  updateEmployeeAnyButton();
}
function isEmployeeAnyActive(){
  const btn = $("employeeAnyBtn");
  return !!(btn && btn.classList.contains("active"));
}
function setEmployeeAnyActive(active){
  const btn = $("employeeAnyBtn");
  if(!btn) return;
  btn.classList.toggle("active", !!active);
  btn.setAttribute("aria-pressed", active ? "true" : "false");
}
function updateEmployeeAnyButton(){ setEmployeeAnyActive(isEmployeeAnyActive()); }
function renderSettingsEmployeeList(){
  const box = $("settingsEmployeeList");
  if(!box) return;
  box.innerHTML = state.employees.slice().sort(byName).map(e=>`
    <div class="employee-item" style="--employee-row-bg:${escapeHtml(e.rowColor || "#fff")};--employee-accent:${escapeHtml(e.color || "#d94f93")}">
      <div class="employee-list-name"><span class="employee-color-dot"></span><div><strong style="color:${escapeHtml(e.color || "#d94f93")}">${escapeHtml(e.name)}</strong><br><small>${e.active ? "Aktiv" : "Inaktiv"} · ${employmentTypeLabel(e.workSettings?.employmentType)} · ${escapeHtml(weeklyWorkSummary(e.workSettings?.weeklyWork) || ((e.workSettings?.workStart || state.openTime) + "–" + (e.workSettings?.workEnd || state.closeTime)))}</small></div></div>
      <div>
        <button data-edit="${e.id}">${t("edit")}</button>
        <button data-toggle="${e.id}">${e.active ? t("deactivate") : t("activate")}</button>
        <button class="danger" data-delete="${e.id}">${t("delete")}</button>
      </div>
    </div>`).join("");
  box.querySelectorAll("[data-edit]").forEach(btn=>btn.onclick=()=>editEmployee(btn.dataset.edit));
  box.querySelectorAll("[data-toggle]").forEach(btn=>btn.onclick=()=>toggleEmployee(btn.dataset.toggle));
  box.querySelectorAll("[data-delete]").forEach(btn=>btn.onclick=()=>deleteEmployee(btn.dataset.delete));
}
function editEmployee(id){
  const emp=state.employees.find(e=>e.id===id); if(!emp) return;
  editingEmployeeId=id;
  $("settingsEmployeeName").value=emp.name;
  $("settingsEmployeeColor").value=emp.color || "#2d1b25";
}
function toggleEmployee(id){
  const emp=state.employees.find(e=>e.id===id); if(!emp) return;
  emp.active=!emp.active;
  saveState(); renderAll();
}
function deleteEmployee(id){
  const emp=state.employees.find(e=>e.id===id); if(!emp) return;
  const hasAppointments = state.appointments.some(a=>a.employeeId===id);
  const msg = hasAppointments
    ? `Mitarbeiter "${emp.name}" löschen? Achtung: Termine von diesem Mitarbeiter bleiben im Kalender, aber der Name wird dort nicht mehr zugeordnet. Besser ist oft "Deaktivieren".`
    : `Mitarbeiter "${emp.name}" wirklich löschen?`;
  if(confirm(msg)){
    state.employees = state.employees.filter(e=>e.id!==id);
    if(editingEmployeeId===id) cancelEmployeeEdit();
    saveState();
    renderAll();
  }
}
function cancelEmployeeEdit(){
  editingEmployeeId=null;
  $("settingsEmployeeName").value="";
  $("settingsEmployeeColor").value=paletteColor((state.employees || []).length).accent;
}
function saveEmployeeFromSettings(){
  if(!requireActiveStudioLicense()) return;
  const name=$("settingsEmployeeName").value.trim();
  const color=$("settingsEmployeeColor").value || "#2d1b25";
  if(!name){ alert("Bitte Mitarbeitername eintragen."); return; }
  if(editingEmployeeId){
    const emp=state.employees.find(e=>e.id===editingEmployeeId);
    if(emp){ emp.name=name; emp.color=color; emp.workSettings = emp.workSettings || defaultEmployeeWorkSettings(); if(!emp.rowColor){ emp.rowColor = paletteColor((state.employees || []).indexOf(emp)).bg; } }
  }else{
    const auto = paletteColor((state.employees || []).length);
    state.employees.push({id:uid(), name, active:true, color, rowColor:auto.bg, workSettings:defaultEmployeeWorkSettings()});
  }
  editingEmployeeId=null;
  $("settingsEmployeeName").value="";
  $("settingsEmployeeColor").value=paletteColor((state.employees || []).length).accent;
  saveState(); renderAll();
}

function renderWorkTimeList(){
  const box = $("settingsWorkTimeList");
  if(!box) return;
  const employees = state.employees.slice().sort(byName);
  if(!employees.length){
    box.innerHTML = '<p class="hint">Noch keine Mitarbeiter vorhanden.</p>';
    return;
  }
  box.innerHTML = employees.map(emp => {
    emp.workSettings = emp.workSettings || defaultEmployeeWorkSettings();
    const w = emp.workSettings;
    return `
      <div class="worktime-card" data-employee-id="${escapeHtml(emp.id)}" style="--employee-row-bg:${escapeHtml(emp.rowColor || paletteColor((state.employees || []).indexOf(emp)).bg)};--employee-accent:${escapeHtml(emp.color || paletteColor((state.employees || []).indexOf(emp)).accent)}">
        <div class="worktime-card-header">
          <div class="worktime-card-title"><span class="employee-color-dot"></span><div><strong style="color:${escapeHtml(emp.color || paletteColor((state.employees || []).indexOf(emp)).accent)}">${escapeHtml(emp.name)}</strong><br><small>${emp.active ? "Aktiv" : "Inaktiv"}</small></div></div>
          <span class="worktime-badge">${employmentTypeLabel(w.employmentType)}</span>
        </div>
        <div class="worktime-section worktime-section-work">
          <div class="worktime-section-head">
            <strong>Arbeitszeiten</strong>
            <small>Arbeitsmodell, normale Zeiten, Wochentage und Sonder-Arbeitstage</small>
          </div>
          <div class="worktime-grid">
            <label>Arbeitsmodell
              <select data-work-field="employmentType">
                <option value="fulltime" ${w.employmentType==="fulltime" ? "selected" : ""}>Vollzeit</option>
                <option value="parttime" ${w.employmentType==="parttime" ? "selected" : ""}>Aushilfe / Teilzeit</option>
                <option value="minijob" ${w.employmentType==="minijob" ? "selected" : ""}>Minijob</option>
                <option value="custom" ${w.employmentType==="custom" ? "selected" : ""}>Individuell</option>
              </select>
            </label>
            <label>Freigegeben von
              <input type="time" data-work-field="workStart" value="${escapeHtml(w.workStart || state.openTime)}">
            </label>
            <label>Freigegeben bis
              <input type="time" data-work-field="workEnd" value="${escapeHtml(w.workEnd || state.closeTime)}">
            </label>
          </div>
          <div class="worktime-weekly">
            <label class="inline-checkbox"><input type="checkbox" data-work-field="weeklyEnabled" ${normalizeWeeklyWork(w.weeklyWork).enabled ? "checked" : ""}> Arbeitszeiten nach Wochentagen aktivieren</label>
            <small class="hint">Wenn aktiviert, sind nur angehakte Wochentage im Terminplaner freigegeben. Nicht angehakte Tage werden gesperrt. Sonntag ist geschlossen und wird hier nicht als Arbeitstag angeboten.</small>
            <div class="worktime-weekly-days">
              ${WORKDAY_SETTING_KEYS.map(dayKey => {
                const day = normalizeWeeklyWork(w.weeklyWork).days[dayKey];
                return `<div class="weekday-time-row" data-weekday="${dayKey}">
                  <label class="inline-checkbox"><input type="checkbox" data-weekday-enabled="${dayKey}" ${day.enabled ? "checked" : ""}> ${WEEKDAY_LABELS[dayKey]}</label>
                  <input type="time" data-weekday-start="${dayKey}" value="${escapeHtml(day.start)}">
                  <span>bis</span>
                  <input type="time" data-weekday-end="${dayKey}" value="${escapeHtml(day.end)}">
                </div>`;
              }).join("")}
            </div>
          </div>
          <div class="worktime-special-work">
            <strong>Sonder-Arbeitstage nach Datum</strong>
            <small class="hint">Hier kannst du für einzelne Mitarbeiter ein bestimmtes Datum mit eigener Arbeitszeit freigeben. Diese Freigabe gilt nur an diesem Datum und überschreibt die normalen Wochentagszeiten.</small>
            <div class="worktime-special-add">
              <label>Datum
                <input type="date" data-work-field="specialWorkDate">
              </label>
              <label>Von
                <input type="time" data-work-field="specialWorkStart" value="${escapeHtml(w.workStart || state.openTime || "08:00")}">
              </label>
              <label>Bis
                <input type="time" data-work-field="specialWorkEnd" value="${escapeHtml(w.workEnd || state.closeTime || "20:00")}">
              </label>
              <button type="button" data-add-special-work-date="${escapeHtml(emp.id)}">Arbeitstag hinzufügen</button>
            </div>
            <div class="worktime-special-dates" data-special-work-dates>
              ${normalizeSpecialWorkDates(w.specialWorkDates).map(s => specialWorkDateChipHtml(s)).join("") || '<small class="hint">Noch keine Sonder-Arbeitstage hinterlegt.</small>'}
            </div>
          </div>
        </div>
        <div class="worktime-section worktime-section-vacation">
          <div class="worktime-section-head">
            <strong>Urlaub / Sperrtage</strong>
            <small>Zeitraum oder einzelne Urlaubstage blockieren</small>
          </div>
          <div class="worktime-vacation-row">
            <label class="inline-checkbox"><input type="checkbox" data-work-field="vacationEnabled" ${w.vacationEnabled ? "checked" : ""}> Urlaub / Sperrtage aktivieren</label>
            <label>Zeitraum von <input type="date" data-work-field="vacationFrom" value="${escapeHtml(w.vacationFrom || "")}"></label>
            <label>Zeitraum bis <input type="date" data-work-field="vacationTo" value="${escapeHtml(w.vacationTo || "")}"></label>
          </div>
          <div class="worktime-single-vacation">
            <label>Einzelnen Urlaubstag hinzufügen
              <input type="date" data-work-field="vacationSingleDate">
            </label>
            <button type="button" data-add-vacation-date="${escapeHtml(emp.id)}">Urlaubstag hinzufügen</button>
          </div>
          <div class="worktime-vacation-dates" data-vacation-dates>
            ${(w.vacationDates || []).map(d => `<span class="vacation-date-chip" data-vacation-date="${escapeHtml(d)}">${formatDateShort(d)} <button type="button" data-remove-vacation-date="${escapeHtml(d)}" aria-label="Urlaubstag entfernen">×</button></span>`).join("") || '<small class="hint">Noch keine einzelnen Urlaubstage hinterlegt.</small>'}
          </div>
        </div>
        <label>Notiz
          <input data-work-field="note" value="${escapeHtml(w.note || "")}" placeholder="z. B. nur nach Absprache">
        </label>
        <div class="worktime-actions">
          <button type="button" data-save-worktime="${escapeHtml(emp.id)}">Arbeitszeit speichern</button>
          <button type="button" class="secondary" data-clear-vacation="${escapeHtml(emp.id)}">Urlaub / Sperrtage entfernen</button>
          <small>Der Terminplaner zeigt Zeiten außerhalb der Freigabe, Sonntage und aktiv gespeicherte Urlaubstage gesperrt an. Sonntag ist fest geschlossen.</small>
        </div>
      </div>`;
  }).join("");
  box.querySelectorAll("[data-save-worktime]").forEach(btn => btn.onclick = () => saveEmployeeWorkTime(btn.dataset.saveWorktime));
  box.querySelectorAll("[data-add-special-work-date]").forEach(btn => btn.onclick = () => addSpecialWorkDateToWorkTimeCard(btn.dataset.addSpecialWorkDate));
  box.querySelectorAll("[data-remove-special-work-date]").forEach(btn => btn.onclick = () => removeSpecialWorkDateFromWorkTimeCard(btn));
  box.querySelectorAll("[data-add-vacation-date]").forEach(btn => btn.onclick = () => addVacationDateToWorkTimeCard(btn.dataset.addVacationDate));
  box.querySelectorAll("[data-remove-vacation-date]").forEach(btn => btn.onclick = () => removeVacationDateFromWorkTimeCard(btn));
  box.querySelectorAll("[data-clear-vacation]").forEach(btn => btn.onclick = () => clearEmployeeVacation(btn.dataset.clearVacation, true));
  box.querySelectorAll('[data-work-field="vacationEnabled"]').forEach(chk => chk.onchange = () => {
    if(!chk.checked){
      const card = chk.closest(".worktime-card");
      clearVacationFieldsInCard(card);
    }
  });
}
function specialWorkDateChipHtml(item){
  return `<span class="special-work-date-chip" data-special-work-date="${escapeHtml(item.date)}" data-special-work-start="${escapeHtml(item.start)}" data-special-work-end="${escapeHtml(item.end)}">${formatDateShort(item.date)} · ${escapeHtml(item.start)}–${escapeHtml(item.end)} <button type="button" data-remove-special-work-date="${escapeHtml(item.date)}" aria-label="Sonder-Arbeitstag entfernen">×</button></span>`;
}
function refreshSpecialWorkDateRemoveButtons(card){
  card.querySelectorAll("[data-remove-special-work-date]").forEach(btn => btn.onclick = () => removeSpecialWorkDateFromWorkTimeCard(btn));
}
function addSpecialWorkDateToWorkTimeCard(id){
  const card = Array.from(document.querySelectorAll(".worktime-card")).find(el => el.dataset.employeeId === id);
  if(!card) return;
  const dateInput = card.querySelector('[data-work-field="specialWorkDate"]');
  const startInput = card.querySelector('[data-work-field="specialWorkStart"]');
  const endInput = card.querySelector('[data-work-field="specialWorkEnd"]');
  const list = card.querySelector("[data-special-work-dates]");
  const date = dateInput?.value || "";
  const start = startInput?.value || "";
  const end = endInput?.value || "";
  if(!date){ alert("Bitte zuerst ein Datum für den Sonder-Arbeitstag auswählen."); return; }
  if(!start || !end || timeToMinutes(start) >= timeToMinutes(end)){
    alert("Bitte eine gültige Arbeitszeit eintragen: Start muss vor Ende liegen.");
    return;
  }
  const existing = Array.from(list.querySelectorAll("[data-special-work-date]")).map(el => ({date:el.dataset.specialWorkDate, start:el.dataset.specialWorkStart, end:el.dataset.specialWorkEnd}));
  const filtered = existing.filter(item => item.date !== date);
  const all = normalizeSpecialWorkDates([...filtered, {date, start, end}]);
  list.innerHTML = all.map(specialWorkDateChipHtml).join("");
  dateInput.value = "";
  refreshSpecialWorkDateRemoveButtons(card);
  saveEmployeeWorkTime(id, true);
  alert("Sonder-Arbeitstag wurde gespeichert.");
}
function removeSpecialWorkDateFromWorkTimeCard(btn){
  const card = btn.closest(".worktime-card");
  const list = btn.closest("[data-special-work-dates]");
  const id = card?.dataset.employeeId;
  btn.closest("[data-special-work-date]")?.remove();
  if(list && !list.querySelector("[data-special-work-date]")) list.innerHTML = '<small class="hint">Noch keine Sonder-Arbeitstage hinterlegt.</small>';
  if(card) refreshSpecialWorkDateRemoveButtons(card);
  if(id) saveEmployeeWorkTime(id, true);
}
function vacationDateChipHtml(date){
  return `<span class="vacation-date-chip" data-vacation-date="${escapeHtml(date)}">${formatDateShort(date)} <button type="button" data-remove-vacation-date="${escapeHtml(date)}" aria-label="Urlaubstag entfernen">×</button></span>`;
}
function refreshVacationDateRemoveButtons(card){
  card.querySelectorAll("[data-remove-vacation-date]").forEach(btn => btn.onclick = () => removeVacationDateFromWorkTimeCard(btn));
}
function addVacationDateToWorkTimeCard(id){
  const card = Array.from(document.querySelectorAll(".worktime-card")).find(el => el.dataset.employeeId === id);
  if(!card) return;
  const input = card.querySelector('[data-work-field="vacationSingleDate"]');
  const list = card.querySelector("[data-vacation-dates]");
  const date = input?.value || "";
  if(!date){ alert("Bitte zuerst einen einzelnen Urlaubstag auswählen."); return; }
  const existing = Array.from(list.querySelectorAll("[data-vacation-date]")).map(el => el.dataset.vacationDate);
  if(existing.includes(date)){
    input.value = "";
    alert("Dieser Urlaubstag ist bereits hinterlegt.");
    return;
  }
  if(existing.length === 0) list.innerHTML = "";
  const allDates = [...existing, date].sort();
  list.innerHTML = allDates.map(vacationDateChipHtml).join("");
  input.value = "";
  const chk = card.querySelector('[data-work-field="vacationEnabled"]');
  if(chk) chk.checked = true;
  refreshVacationDateRemoveButtons(card);
  saveEmployeeWorkTime(id, true);
  alert("Einzelner Urlaubstag wurde gespeichert.");
}
function removeVacationDateFromWorkTimeCard(btn){
  const card = btn.closest(".worktime-card");
  const list = btn.closest("[data-vacation-dates]");
  const id = card?.dataset.employeeId;
  btn.closest("[data-vacation-date]")?.remove();
  if(list && !list.querySelector("[data-vacation-date]")) list.innerHTML = '<small class="hint">Noch keine einzelnen Urlaubstage hinterlegt.</small>';
  if(card) refreshVacationDateRemoveButtons(card);
  if(id) saveEmployeeWorkTime(id, true);
}
function clearVacationFieldsInCard(card){
  if(!card) return;
  const set = (field, value) => { const el = card.querySelector(`[data-work-field="${field}"]`); if(el) el.value = value; };
  set("vacationFrom", "");
  set("vacationTo", "");
  set("vacationSingleDate", "");
  const chk = card.querySelector('[data-work-field="vacationEnabled"]');
  if(chk) chk.checked = false;
  const list = card.querySelector("[data-vacation-dates]");
  if(list) list.innerHTML = '<small class="hint">Noch keine einzelnen Urlaubstage hinterlegt.</small>';
}
function clearEmployeeVacation(id, showAlert=false){
  const emp = state.employees.find(e => e.id === id);
  const card = Array.from(document.querySelectorAll(".worktime-card")).find(el => el.dataset.employeeId === id);
  if(!emp) return;
  clearVacationFieldsInCard(card);
  const current = emp.workSettings || defaultEmployeeWorkSettings();
  emp.workSettings = {
    ...current,
    vacationEnabled:false,
    vacationFrom:"",
    vacationTo:"",
    vacationDates:[]
  };
  saveState();
  renderAll();
  if(showAlert) alert(`Urlaub / Sperrtage für ${emp.name} wurden entfernt.`);
}
function saveEmployeeWorkTime(id, silent=false){
  const emp = state.employees.find(e => e.id === id);
  const card = Array.from(document.querySelectorAll(".worktime-card")).find(el => el.dataset.employeeId === id);
  if(!emp || !card) return;
  const get = field => card.querySelector(`[data-work-field="${field}"]`);
  const workStart = get("workStart")?.value || state.openTime || "08:00";
  const workEnd = get("workEnd")?.value || state.closeTime || "20:00";
  if(timeToMinutes(workStart) >= timeToMinutes(workEnd)){
    alert("Die Arbeitszeit muss eine gültige Zeitspanne haben: Start muss vor Ende liegen.");
    return;
  }
  const weeklyEnabled = !!get("weeklyEnabled")?.checked;
  const weeklyWork = {enabled:weeklyEnabled, days:{}};
  let selectedWeeklyDays = 0;
  for(const dayKey of WEEKDAY_KEYS){
    const isSettingDay = WORKDAY_SETTING_KEYS.includes(dayKey);
    const enabled = isSettingDay && !!card.querySelector(`[data-weekday-enabled="${dayKey}"]`)?.checked;
    const dayStart = isSettingDay ? (card.querySelector(`[data-weekday-start="${dayKey}"]`)?.value || workStart) : workStart;
    const dayEnd = isSettingDay ? (card.querySelector(`[data-weekday-end="${dayKey}"]`)?.value || workEnd) : workEnd;
    if(enabled){
      selectedWeeklyDays++;
      if(timeToMinutes(dayStart) >= timeToMinutes(dayEnd)){
        alert(`Die Arbeitszeit für ${WEEKDAY_LABELS[dayKey]} muss gültig sein: Start muss vor Ende liegen.`);
        return;
      }
    }
    weeklyWork.days[dayKey] = {enabled, start:dayStart, end:dayEnd};
  }
  if(weeklyEnabled && selectedWeeklyDays === 0){
    alert("Bitte mindestens einen Wochentag als Arbeitstag auswählen oder die Wochentags-Arbeitszeiten deaktivieren.");
    return;
  }
  const specialWorkDates = normalizeSpecialWorkDates(Array.from(card.querySelectorAll("[data-special-work-date]")).map(el => ({
    date:el.dataset.specialWorkDate,
    start:el.dataset.specialWorkStart,
    end:el.dataset.specialWorkEnd
  })));

  let vacationFrom = get("vacationFrom")?.value || "";
  let vacationTo = get("vacationTo")?.value || "";
  const pendingVacationDate = get("vacationSingleDate")?.value || "";
  const vacationDates = Array.from(card.querySelectorAll("[data-vacation-date]")).map(el => el.dataset.vacationDate).filter(Boolean);
  if(pendingVacationDate) vacationDates.push(pendingVacationDate);
  let uniqueVacationDates = [...new Set(vacationDates)].sort();
  const hasVacationData = !!(vacationFrom || vacationTo || uniqueVacationDates.length);
  const vacationEnabled = !!get("vacationEnabled")?.checked || hasVacationData;
  if(vacationEnabled){
    if((vacationFrom && !vacationTo) || (!vacationFrom && vacationTo)){
      alert("Bitte für den Urlaubszeitraum ein Von- und Bis-Datum eintragen oder beide Felder leer lassen.");
      return;
    }
  }else{
    // Wichtig: Wenn Urlaub/Sperrtage deaktiviert wird, werden alte gespeicherte Sperren wirklich gelöscht.
    vacationFrom = "";
    vacationTo = "";
    uniqueVacationDates = [];
  }
  emp.workSettings = {
    employmentType:normalizeEmploymentType(get("employmentType")?.value),
    workStart,
    workEnd,
    weeklyWork,
    specialWorkDates,
    vacationEnabled,
    vacationFrom,
    vacationTo,
    vacationDates:uniqueVacationDates,
    note:get("note")?.value.trim() || ""
  };
  saveState();
  renderAll();
  if(!silent) alert(`Arbeitszeit / Urlaub für ${emp.name} gespeichert.`);
}



function dedupeCustomers(){
  const map = new Map();
  const result = [];
  for(const c of (state.customers || [])){
    if(!c.phone) continue;
    const key = normalizeNamePhone(c.name, c.phone);
    if(!key.name || !key.phone) continue;
    const mapKey = key.name + "|" + key.phone;
    if(map.has(mapKey)){
      const existing = map.get(mapKey);
      existing.email = c.email || existing.email || "";
      existing.note = c.note || existing.note || "";
      existing.name = c.name || existing.name;
      existing.phone = c.phone || existing.phone;
    }else{
      map.set(mapKey, c);
      result.push(c);
    }
  }
  state.customers = result;
}

function renderCustomerDatalist(){
  const dl = $("customersDatalist");
  if(!dl) return;
  dl.innerHTML = (state.customers || []).map(c => 
    `<option value="${escapeHtml(c.name)}">${escapeHtml(c.phone || "")}</option>`
  ).join("");
}
function renderCustomerNameSuggestions(){
  const q = $("customerName").value.trim().toLowerCase();
  const box = $("customerSuggestions");
  if(!box) return;
  if(!q){ box.innerHTML = ""; return; }
  const matches = (state.customers || [])
    .filter(c => {
      const phoneQuery = normalizePhoneSearch(q);
      return c.name.toLowerCase().includes(q) || String(c.phone || "").toLowerCase().includes(q) || (phoneQuery && normalizePhoneSearch(c.phone).includes(phoneQuery));
    })
    .slice(0,8);
  box.innerHTML = matches.map(c => `
    <div class="suggestion" data-customer="${c.id}">
      <strong>${escapeHtml(c.name)}</strong><br>
      <small>${escapeHtml(c.phone || "")} ${c.email ? "· " + escapeHtml(c.email) : ""}</small>
    </div>
  `).join("");
  box.querySelectorAll("[data-customer]").forEach(el => el.onclick = () => selectCustomer(el.dataset.customer));
}
function selectCustomer(id){
  const c = (state.customers || []).find(x => x.id === id);
  if(!c) return;
  $("customerName").value = c.name;
  setSplitPhoneFields(c.phone || "");
  $("customerSuggestions").innerHTML = "";
}
function applyExactCustomer(){
  const typed = $("customerName").value.trim().toLowerCase();
  const c = (state.customers || []).find(x => x.name.toLowerCase() === typed);
  if(c) selectCustomer(c.id);
}
function renderSettingsCustomerList(){
  const box = $("settingsCustomerList");
  if(!box) return;
  const customers = (state.customers || []).slice().sort((a,b)=>a.name.localeCompare(b.name)).slice(0,200);
  if(!customers.length){
    box.innerHTML = `<small>Noch keine Kunden gespeichert.</small>`;
    return;
  }
  box.innerHTML = customers.map(c => `
    <div class="customer-item">
      <div>
        <strong>${escapeHtml(c.name)}</strong><br>
        <small>${escapeHtml(c.phone || "-")} ${c.email ? "· " + escapeHtml(c.email) : ""}</small>
      </div>
      <div>
        <button data-cust-edit="${c.id}">${t("edit")}</button>
        <button class="danger" data-cust-delete="${c.id}">${t("delete")}</button>
      </div>
    </div>
  `).join("");
  box.querySelectorAll("[data-cust-edit]").forEach(btn => btn.onclick = () => editCustomer(btn.dataset.custEdit));
  box.querySelectorAll("[data-cust-delete]").forEach(btn => btn.onclick = () => deleteCustomer(btn.dataset.custDelete));
}
function editCustomer(id){
  const c = (state.customers || []).find(x => x.id === id);
  if(!c) return;
  editingCustomerId = id;
  $("settingsCustomerName").value = c.name || "";
  $("settingsCustomerPhone").value = c.phone || "";
  $("settingsCustomerEmail").value = c.email || "";
  $("settingsCustomerNote").value = c.note || "";
}
function cancelCustomerEdit(){
  editingCustomerId = null;
  ["settingsCustomerName","settingsCustomerPhone","settingsCustomerEmail","settingsCustomerNote"].forEach(id => $(id).value = "");
}
function saveCustomerFromSettings(){
  if(!requireActiveStudioLicense()) return;
  const name = $("settingsCustomerName").value.trim();
  const phone = $("settingsCustomerPhone").value.trim();
  const email = $("settingsCustomerEmail").value.trim();
  const note = $("settingsCustomerNote").value.trim();
  if(!name){ alert("Bitte Kundennamen eintragen."); return; }
  if(!phone){ alert("Kunden werden nur mit Telefonnummer gespeichert. Bitte Telefonnummer eintragen."); return; }

  const duplicate = findCustomerByNamePhone(name, phone);

  if(editingCustomerId){
    const c = state.customers.find(x => x.id === editingCustomerId);
    if(c){
      c.name = name;
      c.phone = phone;
      c.email = email;
      c.note = note;
    }
    if(duplicate && duplicate.id !== editingCustomerId){
      duplicate.email = email || duplicate.email || "";
      duplicate.note = note || duplicate.note || "";
      state.customers = state.customers.filter(x => x.id !== editingCustomerId);
    }
  } else if(duplicate){
    duplicate.name = name;
    duplicate.phone = phone;
    duplicate.email = email;
    duplicate.note = note;
  } else {
    state.customers.push({id:uid(), name, phone, email, note, createdAt:todayISO()});
  }

  cancelCustomerEdit();
  saveState();
  renderSettingsCustomerList();
  renderCustomerDatalist();
}
function deleteCustomer(id){
  const c = (state.customers || []).find(x => x.id === id);
  if(!c) return;
  if(confirm(`Kunde "${c.name}" wirklich aus der Kundendatei löschen? Bestehende Termine bleiben erhalten.`)){
    state.customers = state.customers.filter(x => x.id !== id);
    if(editingCustomerId === id) cancelCustomerEdit();
    saveState();
    renderSettingsCustomerList();
    renderCustomerDatalist();
  }
}
function ensureCustomerFromAppointment(a){
  if(!a.customerName || !a.phone) return;

  const existing = findCustomerByNamePhone(a.customerName, a.phone);
  if(existing){
    existing.name = a.customerName;
    existing.phone = a.phone;
    return;
  }

  state.customers.push({
    id:uid(),
    name:a.customerName,
    phone:a.phone,
    email:"",
    note:"",
    createdAt:todayISO()
  });
}

function renderServiceDatalist(){
  $("servicesDatalist").innerHTML = state.services.slice().sort(byName).map(s=>`<option value="${escapeHtml(s.name)}">${money(s.price)} · ${s.duration} Min</option>`).join("");
}
function renderServiceSuggestions(){
  const q=$("serviceName").value.trim().toLowerCase();
  const box=$("serviceSuggestions");
  if(!q){ box.innerHTML=""; return; }
  const matches=state.services.slice().sort(byName).filter(s=>s.name.toLowerCase().startsWith(q) || s.name.toLowerCase().includes(q)).slice(0,8);
  box.innerHTML = matches.map(s=>`<div class="suggestion" data-id="${s.id}"><strong>${escapeHtml(s.name)}</strong><br><small>${money(s.price)} · ${s.duration} Min</small></div>`).join("");
  box.querySelectorAll(".suggestion").forEach(el=>el.onclick=()=>selectService(el.dataset.id));
}
function selectService(id){
  const s=state.services.find(x=>x.id===id); if(!s) return;
  $("serviceName").value=s.name; $("price").value=s.price; $("duration").value=String(s.duration); $("serviceSuggestions").innerHTML="";
}
function applyExactService(){
  const typed=$("serviceName").value.trim().toLowerCase();
  const s=state.services.find(x=>x.name.toLowerCase()===typed);
  if(s) selectService(s.id);
}
function renderServiceList(){
  const box=$("serviceList");
  if(!box) return;
  box.innerHTML = state.services.slice().sort(byName).map(s=>`
    <div class="service-item">
      <div><strong>${escapeHtml(s.name)}</strong><br><small>${money(s.price)} · ${s.duration} Min</small></div>
      <div><button data-edit="${s.id}">${t("edit")}</button><button data-del="${s.id}">${t("delete")}</button></div>
    </div>`).join("");
  box.querySelectorAll("[data-edit]").forEach(btn=>btn.onclick=()=>{ const s=state.services.find(x=>x.id===btn.dataset.edit); $("newServiceName").value=s.name; $("newServicePrice").value=s.price; $("newServiceDuration").value=s.duration; });
  box.querySelectorAll("[data-del]").forEach(btn=>btn.onclick=()=>{ if(confirm("Leistung wirklich löschen? Bestehende Termine bleiben erhalten.")){ state.services=state.services.filter(s=>s.id!==btn.dataset.del); saveState(); renderServiceList(); renderServiceDatalist(); }});
}
function addService(){
  if(!requireActiveStudioLicense()) return;
  const name=$("newServiceName").value.trim(), price=Number($("newServicePrice").value||0), duration=Number($("newServiceDuration").value||60);
  if(!name){ alert("Bitte Leistungsname eintragen."); return; }
  const existing=state.services.find(s=>s.name.toLowerCase()===name.toLowerCase());
  if(existing){ existing.price=price; existing.duration=duration; }
  else state.services.push({id:uid(), name, price, duration});
  $("newServiceName").value=""; $("newServicePrice").value="0"; $("newServiceDuration").value="60";
  saveState(); renderServiceList(); renderServiceDatalist();
}


function startMoveAppointment(id){
  movingAppointmentId = id;
  suppressAppointmentClick = true;
  document.body.classList.add("move-mode");
}

function cancelMoveAppointment(){
  movingAppointmentId = null;
  document.body.classList.remove("move-mode");
}
function moveAppointmentTo(employeeId, startTime){
  if(!movingAppointmentId) return false;
  const a = state.appointments.find(x => x.id === movingAppointmentId);
  if(!a){ cancelMoveAppointment(); return false; }
  const candidate = {...a, employeeId, startTime, date:state.selectedDate};
  const emp = state.employees.find(e => e.id === employeeId);
  const availabilityIssue = employeeAvailabilityIssue(emp, candidate.date, candidate.startTime, candidate.duration);
  if(availabilityIssue){
    alert("Termin nicht möglich\n\n" + availabilityIssue);
    cancelMoveAppointment();
    renderCalendar();
    return false;
  }
  const conflict = findAppointmentConflict(candidate, a.id);
  if(conflict){
    showAppointmentConflict(conflict);
    cancelMoveAppointment();
    renderCalendar();
    return false;
  }
  a.employeeId = employeeId;
  a.startTime = startTime;
  a.date = state.selectedDate;
  saveState();
  cancelMoveAppointment();
  renderAll();
  
  return true;
}


function beginTouchDragAppointment(el, pointerEvent){
  const id = el.dataset.id;
  if(!id) return;
  startMoveAppointment(id);
  touchDragOriginal = el;
  touchDragPointerId = pointerEvent.pointerId;
  el.setPointerCapture && el.setPointerCapture(pointerEvent.pointerId);

  touchDragGhost = el.cloneNode(true);
  touchDragGhost.classList.add("dragging-touch");
  touchDragGhost.style.left = (pointerEvent.clientX + 12) + "px";
  touchDragGhost.style.top = (pointerEvent.clientY + 12) + "px";
  document.body.appendChild(touchDragGhost);
  document.body.classList.add("dragging-appointment");
}
function moveTouchDragAppointment(pointerEvent){
  if(!touchDragGhost) return;
  touchDragGhost.style.left = (pointerEvent.clientX + 12) + "px";
  touchDragGhost.style.top = (pointerEvent.clientY + 12) + "px";

  document.querySelectorAll(".slot.drop-target").forEach(s => s.classList.remove("drop-target"));
  const under = document.elementFromPoint(pointerEvent.clientX, pointerEvent.clientY);
  const slot = under && under.closest ? under.closest(".slot[data-employee]") : null;
  if(slot) slot.classList.add("drop-target");
}
function finishTouchDragAppointment(pointerEvent){
  clearTimeout(longPressTimer);
  document.querySelectorAll(".slot.drop-target").forEach(s => s.classList.remove("drop-target"));

  if(touchDragGhost){
    touchDragGhost.remove();
    touchDragGhost = null;
  }

  const under = document.elementFromPoint(pointerEvent.clientX, pointerEvent.clientY);
  const slot = under && under.closest ? under.closest(".slot[data-employee]") : null;
  if(slot && movingAppointmentId){
    moveAppointmentTo(slot.dataset.employee, slot.dataset.time);
  }else{
    cancelMoveAppointment();
  }

  touchDragOriginal = null;
  touchDragPointerId = null;
  document.body.classList.remove("dragging-appointment");
  setTimeout(()=>{ suppressAppointmentClick=false; }, 150);
}

function renderCalendar(){
  const s=slots(), active=state.employees.filter(e=>e.active).sort(byName), todays=state.appointments.filter(a=>a.date===state.selectedDate);
  $("appointmentCount").textContent=`${todays.length} Termine`;
  const grid=document.createElement("div"); grid.className="grid"; grid.style.setProperty("--slots",s.length);
  grid.innerHTML=`<div class="corner">${t("employee")}</div>`+s.map(t=>`<div class="time-header">${t}</div>`).join("");
  for(const emp of active){
    grid.insertAdjacentHTML("beforeend",`<div class="employee-cell employee-row-colored" ${employeeRowStyle(emp)}><span class="employee-name-colored" style="color:${escapeHtml(emp.color || "#d94f93")}">${escapeHtml(emp.name)}</span></div>`);
    let skipUntil = null;
    for(const t of s){
      if(skipUntil && timeToMinutes(t) < skipUntil) continue;
      const a=todays.find(x=>x.employeeId===emp.id && x.startTime===t);
      if(a){
        const span=Math.max(1,Math.round(Number(a.duration)/30)); skipUntil=timeToMinutes(a.startTime)+Number(a.duration);
        grid.insertAdjacentHTML("beforeend",`<div class="slot employee-row-colored" ${employeeRowStyle(emp, `grid-column: span ${span};`)}><div class="${appointmentClass(a)}" data-id="${a.id}" draggable="true"><div class="name">${escapeHtml(a.customerName)}</div><div class="meta">${escapeHtml(a.serviceName||"Leistung")}${a.employeeAny ? " · Beliebig" : ""}</div><div class="meta">${escapeHtml(a.startTime)} · ${escapeHtml(a.phone||"")}</div></div></div>`);
      }else{
        const issue = employeeAvailabilityIssue(emp, state.selectedDate, t, 30);
        if(issue){
          grid.insertAdjacentHTML("beforeend",`<div class="slot employee-row-colored unavailable-slot" ${employeeRowStyle(emp)} title="${escapeHtml(issue)}"><span class="slot-lock">Gesperrt</span></div>`);
        }else{
          grid.insertAdjacentHTML("beforeend",`<div class="slot employee-row-colored" ${employeeRowStyle(emp)} data-employee="${emp.id}" data-time="${t}"></div>`);
        }
      }
    }
  }
  $("calendar").innerHTML="";
  const wrap=document.createElement("div");
  wrap.className="calendar-grid-wrap";
  wrap.appendChild(grid);
  $("calendar").appendChild(wrap);
  renderCurrentTimeLine(wrap);
  $("calendar").querySelectorAll(".slot[data-employee]").forEach(el=>{
    el.onclick=()=>{
      if(movingAppointmentId){
        moveAppointmentTo(el.dataset.employee, el.dataset.time);
        return;
      }
      $("employeeSelect").value=el.dataset.employee;
      setEmployeeAnyActive(false);
      $("startTime").value=el.dataset.time;
      window.scrollTo({top:0,behavior:"smooth"});
    };
    el.ondragover=(e)=>{ e.preventDefault(); el.classList.add("drop-target"); };
    el.ondragleave=()=>el.classList.remove("drop-target");
    el.ondrop=(e)=>{
      e.preventDefault();
      el.classList.remove("drop-target");
      const id = e.dataTransfer.getData("text/plain");
      if(id){
        movingAppointmentId = id;
        moveAppointmentTo(el.dataset.employee, el.dataset.time);
      }
    };
  });
  $("calendar").querySelectorAll(".appointment").forEach(el=>{
    el.ondragstart=(e)=>{
      e.dataTransfer.setData("text/plain", el.dataset.id);
      movingAppointmentId = el.dataset.id;
      document.body.classList.add("move-mode");
    };
    el.ondragend=()=>{ if(movingAppointmentId) cancelMoveAppointment(); };

    el.onpointerdown=(e)=>{
      if(e.button !== undefined && e.button !== 0) return;
      clearTimeout(longPressTimer);
      el._dragStart = {x:e.clientX, y:e.clientY};
      el._dragLatest = {pointerId:e.pointerId, clientX:e.clientX, clientY:e.clientY};
      if(e.pointerType === "touch") e.preventDefault();
      longPressTimer = setTimeout(()=>{
        beginTouchDragAppointment(el, el._dragLatest || e);
      }, e.pointerType === "touch" ? 260 : 360);
    };

    el.onpointermove=(e)=>{
      el._dragLatest = {pointerId:e.pointerId, clientX:e.clientX, clientY:e.clientY};
      if(touchDragGhost && touchDragPointerId === e.pointerId){
        e.preventDefault();
        moveTouchDragAppointment(e);
      }
    };

    el.onpointerup=(e)=>{
      if(touchDragGhost && touchDragPointerId === e.pointerId){
        e.preventDefault();
        finishTouchDragAppointment(e);
        return;
      }
      clearTimeout(longPressTimer);
      el._dragStart = null;
      el._dragLatest = null;
      setTimeout(()=>{ suppressAppointmentClick=false; }, 80);
    };

    el.onpointercancel=(e)=>{
      clearTimeout(longPressTimer);
      if(touchDragGhost){
        touchDragGhost.remove();
        touchDragGhost=null;
      }
      cancelMoveAppointment();
      document.body.classList.remove("dragging-appointment");
      touchDragPointerId=null;
      el._dragStart = null;
      el._dragLatest = null;
    };

    el.onpointerleave=(e)=>{
      if(!touchDragGhost && e.pointerType !== "touch") clearTimeout(longPressTimer);
    };

    el.onclick=e=>{
      e.stopPropagation();
      clearTimeout(longPressTimer);
      if(suppressAppointmentClick){
        suppressAppointmentClick=false;
        return;
      }
      showAppointment(el.dataset.id);
    };
  });
}

function renderCurrentTimeLine(wrap){
  if(state.selectedDate !== todayISO()) return;
  const start=timeToMinutes(state.openTime);
  const end=timeToMinutes(state.closeTime);
  const now=new Date();
  const nowMin=now.getHours()*60+now.getMinutes();
  if(nowMin < start || nowMin > end) return;
  const styles=getComputedStyle(document.documentElement); const employeeCol=parseFloat(styles.getPropertyValue("--employee-col")) || 190; const timeCol=parseFloat(styles.getPropertyValue("--time-col")) || 200; const left=employeeCol + ((nowMin-start)/30)*timeCol;
  const line=document.createElement("div");
  line.className="current-time-line";
  line.style.left=left+"px";
  const label=document.createElement("div");
  label.className="current-time-label";
  label.style.left=left+"px";
  label.textContent=minutesToTime(nowMin);
  wrap.appendChild(line);
  wrap.appendChild(label);
}
function startCurrentTimeTicker(){
  setInterval(() => {
    if(!$("calendarTab").classList.contains("hidden")) renderCalendar();
  }, 60000);
}


function appointmentEndTime(a){
  const start = timeToMinutes(a.startTime || "00:00");
  const duration = Math.max(1, Number(a.duration || 60));
  return minutesToTime(start + duration);
}
function findAppointmentConflict(candidate, ignoreId){
  const start = timeToMinutes(candidate.startTime || "00:00");
  const end = start + Math.max(1, Number(candidate.duration || 60));
  return state.appointments.find(existing => {
    if(!existing || existing.id === ignoreId) return false;
    if(existing.date !== candidate.date) return false;
    if(existing.employeeId !== candidate.employeeId) return false;
    if(existing.status === "Nicht erschienen") return false;
    const existingStart = timeToMinutes(existing.startTime || "00:00");
    const existingEnd = existingStart + Math.max(1, Number(existing.duration || 60));
    return start < existingEnd && end > existingStart;
  });
}
function showAppointmentConflict(conflict){
  const msg = t("appointmentConflictMessage")
    .replace("{customer}", conflict.customerName || t("customer"))
    .replace("{start}", conflict.startTime || "")
    .replace("{end}", appointmentEndTime(conflict));
  alert(t("appointmentConflictTitle") + "\n\n" + msg);
}
function saveAppointment(){
  if(!requireActiveStudioLicense()) return;
  const a={ id:editingAppointmentId||uid(), date:state.selectedDate, customerName:$("customerName").value.trim(), phone:combinePhoneFields(), serviceName:$("serviceName").value.trim(), price:Number($("price").value||0), duration:Number($("duration").value||60), employeeId:$("employeeSelect").value, employeeAny:isEmployeeAnyActive(), startTime:$("startTime").value, status:"Gebucht", note:$("note").value.trim() };
  const old = state.appointments.find(x=>x.id===a.id);
  if(old && (old.status==="Erledigt" || old.status==="Nicht erschienen")) a.status=old.status;
  if(!a.customerName||!a.employeeId||!a.startTime){ alert("Bitte Kunde, Mitarbeiter und Uhrzeit eintragen."); return; }
  if(!Number.isFinite(a.duration) || a.duration < 1){ alert("Bitte eine gültige Dauer in Minuten eintragen."); return; }
  a.duration = Math.max(1, Math.round(a.duration));
  const emp = state.employees.find(e => e.id === a.employeeId);
  const availabilityIssue = employeeAvailabilityIssue(emp, a.date, a.startTime, a.duration);
  if(availabilityIssue){ alert("Termin nicht möglich\n\n" + availabilityIssue); return; }
  const conflict = findAppointmentConflict(a, a.id);
  if(conflict){ showAppointmentConflict(conflict); return; }
  state.appointments=state.appointments.filter(x=>x.id!==a.id); state.appointments.push(a); ensureCustomerFromAppointment(a); saveState(); clearForm(); renderAll();
}
function clearForm(){
  editingAppointmentId=null; ["customerName","customerPhonePrefix","customerPhoneNumber","serviceName","note","startTime"].forEach(id=>{ if($(id)) $(id).value=""; }); $("price").value="0"; $("duration").value="60"; setEmployeeAnyActive(false); $("serviceSuggestions").innerHTML="";
}
function showAppointment(id){
  selectedAppointmentId=id; const a=state.appointments.find(x=>x.id===id); const emp=state.employees.find(e=>e.id===a.employeeId);
  $("appointmentDetails").innerHTML=`<p><strong>${escapeHtml(a.customerName)}</strong></p><p>${escapeHtml(a.serviceName)} · ${escapeHtml(a.startTime)} · ${a.duration} Min</p><p>Mitarbeiter: ${escapeHtml(emp?.name||"")}</p><p>Telefon: ${escapeHtml(a.phone||"-")}</p><p>Status intern: ${escapeHtml(a.status||"Gebucht")}${a.employeeAny ? " · Beliebig" : ""}</p><p>Preis: ${money(a.price)}</p><p>Notiz: ${escapeHtml(a.note||"-")}</p>`;
  $("appointmentDialog").showModal();
}
function editSelectedAppointment(){
  const a=state.appointments.find(x=>x.id===selectedAppointmentId);
  if(!a) return;
  renderAppointmentEditForm(a);
}

function renderAppointmentEditForm(a){
  const employeeOptions = state.employees
    .filter(e => e.active || e.id === a.employeeId)
    .sort(byName)
    .map(e => `<option value="${escapeHtml(e.id)}" ${e.id === a.employeeId ? "selected" : ""}>${escapeHtml(e.name)}</option>`)
    .join("");

  const timeOptions = slots()
    .map(time => `<option value="${escapeHtml(time)}" ${time === a.startTime ? "selected" : ""}>${escapeHtml(time)}</option>`)
    .join("");

  const serviceOptions = state.services
    .slice()
    .sort(byName)
    .map(s => `<option value="${escapeHtml(s.name)}">${money(s.price)} · ${s.duration} Min</option>`)
    .join("");

  $("appointmentDetails").innerHTML = `
    <div class="appointment-edit-form">
      <label>Kunde
        <input id="editApptCustomerName" value="${escapeHtml(a.customerName || "")}">
      </label>
      <div class="phone-split-row">
        <label>Vorwahl
          <input id="editApptPhonePrefix" list="mobilePrefixDatalist" inputmode="tel" value="${escapeHtml(splitPhoneNumber(a.phone || "").prefix)}">
        </label>
        <label>Nummer
          <input id="editApptPhoneNumber" inputmode="tel" value="${escapeHtml(splitPhoneNumber(a.phone || "").number)}">
        </label>
      </div>
      <label>Leistung
        <input id="editApptServiceName" list="editServicesDatalist" value="${escapeHtml(a.serviceName || "")}" placeholder="Leistung manuell eintragen">
        <datalist id="editServicesDatalist">${serviceOptions}</datalist>
      </label>
      <div class="grid-2">
        <label>Preis €
          <input id="editApptPrice" type="number" min="0" step="0.01" value="${Number(a.price || 0)}">
        </label>
        <label>Dauer / Zeit Minuten
          <input id="editApptDuration" type="number" min="1" step="1" inputmode="numeric" value="${Number(a.duration || 60)}">
        </label>
      </div>
      <div class="grid-2">
        <label>Mitarbeiter
          <select id="editApptEmployee">${employeeOptions}</select>
        </label>
        <label class="employee-any-edit-label">Beliebig
          <input id="editApptEmployeeAny" type="checkbox" ${a.employeeAny ? "checked" : ""}>
          <small>Termin im Tagesplan gelb markieren</small>
        </label>
        <label>Uhrzeit
          <select id="editApptStartTime">${timeOptions}</select>
        </label>
      </div>
      <label>Notiz
        <textarea id="editApptNote">${escapeHtml(a.note || "")}</textarea>
      </label>
      <div class="appointment-edit-actions">
        <button id="saveInlineAppointmentEditBtn" class="success">Änderungen speichern</button>
        <button id="cancelInlineAppointmentEditBtn" class="secondary">Abbrechen</button>
      </div>
      <small>Preis, Leistung und Minuten werden nur für diesen Termin gespeichert. Die Stammdaten der Leistung bleiben unverändert.</small>
    </div>`;

  $("saveInlineAppointmentEditBtn").onclick = saveInlineAppointmentEdit;
  $("cancelInlineAppointmentEditBtn").onclick = () => showAppointment(a.id);
}

function saveInlineAppointmentEdit(){
  const a=state.appointments.find(x=>x.id===selectedAppointmentId);
  if(!a) return;

  const updated = {
    ...a,
    customerName: $("editApptCustomerName").value.trim(),
    phone: combinePhoneFields("editApptPhonePrefix", "editApptPhoneNumber"),
    serviceName: $("editApptServiceName").value.trim(),
    price: Number($("editApptPrice").value || 0),
    duration: Number($("editApptDuration").value || 60),
    employeeId: $("editApptEmployee").value,
    employeeAny: !!($("editApptEmployeeAny") && $("editApptEmployeeAny").checked),
    startTime: $("editApptStartTime").value,
    note: $("editApptNote").value.trim()
  };

  if(!updated.customerName || !updated.employeeId || !updated.startTime){
    alert("Bitte Kunde, Mitarbeiter und Uhrzeit eintragen.");
    return;
  }
  if(!Number.isFinite(updated.duration) || updated.duration < 1){
    alert("Bitte eine gültige Dauer in Minuten eintragen.");
    return;
  }
  updated.duration = Math.max(1, Math.round(updated.duration));
  if(!Number.isFinite(updated.price) || updated.price < 0){
    alert("Bitte einen gültigen Preis eintragen.");
    return;
  }

  const emp = state.employees.find(e => e.id === updated.employeeId);
  const availabilityIssue = employeeAvailabilityIssue(emp, updated.date, updated.startTime, updated.duration);
  if(availabilityIssue){
    alert("Termin nicht möglich\n\n" + availabilityIssue);
    return;
  }

  const conflict = findAppointmentConflict(updated, updated.id);
  if(conflict){
    showAppointmentConflict(conflict);
    return;
  }

  Object.assign(a, updated);
  ensureCustomerFromAppointment(a);
  saveState();
  renderAll();
  showAppointment(a.id);
}
function completeSelectedAppointment(){
  const a=state.appointments.find(x=>x.id===selectedAppointmentId); if(!a) return;
  a.status="Erledigt";
  saveState(); $("appointmentDialog").close(); renderAll();
}
function noShowSelectedAppointment(){
  const a=state.appointments.find(x=>x.id===selectedAppointmentId); if(!a) return;
  a.status="Nicht erschienen";
  saveState(); $("appointmentDialog").close(); renderAll();
}
function deleteSelectedAppointment(){ if(!requireActiveStudioLicense()) return; if(selectedAppointmentId && confirm("Termin wirklich löschen?")){ state.appointments=state.appointments.filter(a=>a.id!==selectedAppointmentId); saveState(); $("appointmentDialog").close(); renderAll(); } }

function renderCustomerSearch(){
  const input=$("customerSearchInput"), box=$("customerSearchResults"); if(!input||!box) return;
  const q=input.value.trim().toLowerCase();
  if(!q){
    box.innerHTML=`<small>${t("customerSearch")} · offene Termine ab heute</small>`;
    return;
  }
  const today = todayISO();
  const results=state.appointments
    .filter(a => a.date >= today)
    .filter(a => a.status !== "Erledigt" && a.status !== "Nicht erschienen")
    .filter(a=>{
      const phoneQuery = normalizePhoneSearch(q);
      return String(a.customerName||"").toLowerCase().includes(q)||String(a.phone||"").toLowerCase().includes(q)||String(a.serviceName||"").toLowerCase().includes(q)||(phoneQuery && normalizePhoneSearch(a.phone).includes(phoneQuery));
    })
    .sort((a,b)=>(a.date+a.startTime).localeCompare(b.date+b.startTime))
    .slice(0,30);
  box.innerHTML = results.length ? results.map(a=>{
    const emp=state.employees.find(e=>e.id===a.employeeId);
    return `<div class="search-result customer-search-result" data-id="${a.id}">
      <div class="search-result-name">${escapeHtml(a.customerName)}</div>
      <div class="search-result-when">${escapeHtml(formatDateShort(a.date))} · ${escapeHtml(a.startTime)} · ${escapeHtml(emp?.name||"")}</div>
      <div class="search-result-details">
        <span>${escapeHtml(a.serviceName||t("serviceFallback"))}</span>
        <span>${t("phoneLabel")}: ${escapeHtml(a.phone||"-")}</span>
      </div>
    </div>`;
  }).join("") : `<small>${state.language==="vi" ? "Không tìm thấy lịch hẹn sắp tới" : state.language==="en" ? "No open future appointments found" : "Keine offenen zukünftigen Termine gefunden."}</small>`;
  box.querySelectorAll(".search-result").forEach(el=>el.onclick=()=>{ const a=state.appointments.find(x=>x.id===el.dataset.id); if(a){ state.selectedDate=a.date; $("currentDateInput").value=a.date; saveState(); renderCalendar(); showAppointment(a.id); }});
}

function applyRevenueVisibility(){
  const enabled = !!state.revenueEnabled;
  document.body.classList.toggle("revenue-enabled", enabled);
  document.body.classList.toggle("revenue-disabled", !enabled);
  document.querySelectorAll('[data-tab="reportTab"], #reportTab, .revenue-feature').forEach(el => {
    el.classList.toggle("is-hidden", !enabled);
    el.style.display = enabled ? "" : "none";
  });
  if(!enabled && $("reportTab") && !$("reportTab").classList.contains("hidden")){
    switchTab("calendarTab");
  }
}

function setReportMode(mode){
  const allowed = ["day","week","month"];
  const next = allowed.includes(mode) ? mode : "day";
  state.reportMode = next;
  saveState();
  document.querySelectorAll(".report-mode").forEach(btn => btn.classList.toggle("active", btn.dataset.reportMode === next));
  renderReport();
}

function addDaysISO(dateString, days){
  const d = new Date(dateString + "T00:00:00");
  d.setDate(d.getDate() + days);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0,10);
}
function startOfWeekISO(dateString){
  const d = new Date(dateString + "T00:00:00");
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0,10);
}
function startOfMonthISO(dateString){
  return String(dateString || todayISO()).slice(0,7) + "-01";
}
function endOfMonthISO(dateString){
  const d = new Date(startOfMonthISO(dateString) + "T00:00:00");
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0,10);
}
function eachDayISO(from, to){
  const out = [];
  for(let d=from; d<=to; d=addDaysISO(d,1)) out.push(d);
  return out;
}
function reportRangeForMode(){
  const base = $("reportDate")?.value || state.selectedDate || todayISO();
  const mode = state.reportMode || "day";
  if(mode === "week"){
    const from = startOfWeekISO(base);
    return {mode, from, to:addDaysISO(from,6)};
  }
  if(mode === "month") return {mode, from:startOfMonthISO(base), to:endOfMonthISO(base)};
  return {mode:"day", from:base, to:base};
}
function reportRangeText(from,to,mode){
  if(mode === "day") return formatDateShort(from);
  if(mode === "week") return `${formatDateShort(from)} - ${formatDateShort(to)}`;
  const [yyyy, mm] = from.split("-");
  return `${mm}/${yyyy}`;
}

function renderReport(){
  if(!state.revenueEnabled || !$("reportFrom")) return;
  if($("reportDate") && !$("reportDate").value) $("reportDate").value = state.selectedDate || todayISO();
  const mode = state.reportMode || "day";
  document.querySelectorAll(".report-mode").forEach(btn => btn.classList.toggle("active", btn.dataset.reportMode === mode));
  const {from, to} = reportRangeForMode();
  if($("reportFrom")) $("reportFrom").value = from;
  if($("reportTo")) $("reportTo").value = to;

  const included = a => a.status === "Erledigt" && !state.excludedRevenueDays.includes(a.date);
  const manualItemsForDay = d => (state.manualRevenueItems || []).filter(x => x.date === d);
  const manualRevenueForDay = d => state.excludedRevenueDays.includes(d) ? 0 : manualItemsForDay(d).reduce((sum,x)=>sum+Number(x.amount||0),0);
  const days = eachDayISO(from, to);
  const rangeAppointments = state.appointments.filter(a => a.date >= from && a.date <= to);
  const countedAppointments = rangeAppointments.filter(included);
  const rangeManualRevenue = (state.manualRevenueItems || []).filter(x => x.date >= from && x.date <= to && !state.excludedRevenueDays.includes(x.date)).reduce((sum,x)=>sum+Number(x.amount||0),0);
  const rangeRevenue = countedAppointments.reduce((sum,a)=>sum+Number(a.price||0),0) + rangeManualRevenue;
  const employeesWithRevenue = new Set(countedAppointments.map(a=>a.employeeId)).size;

  const today = todayISO();
  const todayRevenue = state.appointments.filter(a=>a.date===today && included(a)).reduce((sum,a)=>sum+Number(a.price||0),0) + manualRevenueForDay(today);
  if($("revenueToday")) $("revenueToday").textContent = money(todayRevenue);
  if($("revenueRange")) $("revenueRange").textContent = money(rangeRevenue);
  if($("appointmentsRange")) $("appointmentsRange").textContent = String(countedAppointments.length);
  if($("employeeRevenueCount")) $("employeeRevenueCount").textContent = String(employeesWithRevenue);
  if($("excludedDaysCount")) $("excludedDaysCount").textContent = `${state.excludedRevenueDays.length} ${t("days")}`;
  if($("reportRangeLabel")) $("reportRangeLabel").textContent = reportRangeText(from, to, mode);

  const list = $("dailyReportList");
  if(!list) return;
  const visibleDays = days.filter(d => rangeAppointments.some(a=>a.date===d) || manualItemsForDay(d).length);
  if(!visibleDays.length){
    list.innerHTML = `<small>${t("noAppointmentsInRange")}</small>`;
    return;
  }

  list.innerHTML = visibleDays.map(d => {
    const excluded = state.excludedRevenueDays.includes(d);
    const dayApps = state.appointments.filter(a => a.date === d && a.status === "Erledigt");
    const dayManual = manualItemsForDay(d);
    const dayManualRevenue = manualRevenueForDay(d);
    const dayRevenue = excluded ? 0 : dayApps.reduce((sum,a)=>sum+Number(a.price||0),0) + dayManualRevenue;
    const groups = {};
    dayApps.forEach(a => {
      const emp = state.employees.find(e=>e.id===a.employeeId);
      const empId = a.employeeId || "unknown";
      if(!groups[empId]) groups[empId] = {name: emp?.name || "Ohne Mitarbeiter", items: [], total:0};
      groups[empId].items.push(a);
      groups[empId].total += Number(a.price || 0);
    });
    const employeesHtml = Object.values(groups).length ? Object.values(groups).map(group => `
      <div class="report-employee-block">
        <div class="report-employee-title"><span>${escapeHtml(group.name)}</span><strong>${money(excluded ? 0 : group.total)}</strong></div>
        <div class="report-customer-rows">
          ${group.items.sort((a,b)=>String(a.startTime||"").localeCompare(String(b.startTime||""))).map(a => `
            <div class="report-customer-row">
              <span class="report-customer-time">${escapeHtml(a.startTime || "")}</span>
              <span class="report-customer-name">${escapeHtml(a.customerName || "Kunde")}</span>
              <span class="report-customer-service">${escapeHtml(a.serviceName || t("serviceFallback"))}</span>
              <strong>${money(excluded ? 0 : a.price)}</strong>
            </div>`).join("")}
        </div>
      </div>`).join("") : `<small>Keine bezahlten Kundentermine.</small>`;
    const manualHtml = dayManual.length && !excluded ? `
      <div class="report-employee-block manual-report-block">
        <div class="report-employee-title"><span>Manuelle Positionen</span><strong>${money(dayManualRevenue)}</strong></div>
        ${dayManual.map(x=>`<div class="report-customer-row"><span></span><span class="report-customer-name">${escapeHtml(x.label||"Manuell")}</span><span class="report-customer-service">${escapeHtml(x.note||"")}</span><strong>${money(x.amount)}</strong></div>`).join("")}
      </div>` : "";
    return `<section class="report-day-block ${excluded ? "is-excluded" : ""}">
      <div class="report-day-head">
        <div><strong>${formatDateShort(d)}</strong>${excluded ? ` <span class="hint">· ${t("revenueDeletedPermanently")}</span>` : ""}</div>
        <div class="report-day-total"><span>${dayApps.length} Termine</span><strong>${money(dayRevenue)}</strong></div>
      </div>
      ${employeesHtml}${manualHtml}
    </section>`;
  }).join("");

  if($("excludedDaysList")) $("excludedDaysList").innerHTML = "";
}

function deleteRevenueDayPermanently(day){
  if(!day) return;
  if(state.excludedRevenueDays.includes(day)){
    alert("Dieser Umsatz-Tag wurde bereits endgültig gelöscht.");
    return;
  }
  const first = confirm(`Umsatz vom ${day} endgültig löschen? Die Termine bleiben im Kalender, aber der Umsatz kann in der App nicht wiederhergestellt werden.`);
  if(!first) return;
  const second = confirm(`Letzte Bestätigung: Umsatz vom ${day} wirklich dauerhaft löschen?`);
  if(!second) return;
  state.excludedRevenueDays.push(day);
  saveState();
  renderReport();
}



function revenueDayTotal(day){
  const excluded = (state.excludedRevenueDays || []).includes(day);
  if(excluded) return 0;
  const appointmentRevenue = (state.appointments || [])
    .filter(a => a.date === day && a.status === "Erledigt")
    .reduce((sum,a)=>sum+Number(a.price||0),0);
  const manualRevenue = (state.manualRevenueItems || [])
    .filter(x => x.date === day)
    .reduce((sum,x)=>sum+Number(x.amount||0),0);
  return appointmentRevenue + manualRevenue;
}

function renderRevenueEditor(){
  if(!$('revenueEditDate')) return;
  const day = $('revenueEditDate').value || state.selectedDate || todayISO();
  $('revenueEditDate').value = day;
  const excluded = (state.excludedRevenueDays || []).includes(day);
  if($('revenueEditTotal')) $('revenueEditTotal').value = money(revenueDayTotal(day));
  if($('revenueEditDayStatus')) $('revenueEditDayStatus').textContent = excluded
    ? 'Dieser Tag ist aktuell aus dem Umsatz herausgenommen.'
    : 'Dieser Tag wird aktuell im Umsatz gezählt.';
  if($('revenueIncludeDayBtn')) $('revenueIncludeDayBtn').disabled = !excluded;
  if($('revenueExcludeDayBtn')) $('revenueExcludeDayBtn').disabled = excluded;

  const apps = (state.appointments || []).filter(a=>a.date===day).sort((a,b)=>{
    const empA = (state.employees || []).find(e=>e.id===a.employeeId)?.name || 'Ohne Mitarbeiter';
    const empB = (state.employees || []).find(e=>e.id===b.employeeId)?.name || 'Ohne Mitarbeiter';
    return empA.localeCompare(empB) || (a.startTime||'').localeCompare(b.startTime||'');
  });
  if($('revenueEditAppointments')){
    if(apps.length){
      const grouped = apps.reduce((acc,a)=>{
        const emp = (state.employees || []).find(e=>e.id===a.employeeId);
        const key = emp?.id || 'none';
        if(!acc[key]) acc[key] = {name: emp?.name || 'Ohne Mitarbeiter', items: []};
        acc[key].items.push(a);
        return acc;
      },{});
      $('revenueEditAppointments').innerHTML = Object.values(grouped).map(group=>`
        <section class="revenue-employee-group">
          <div class="revenue-employee-header">${escapeHtml(group.name)} <span>${group.items.length} Termin${group.items.length===1?'':'e'}</span></div>
          ${group.items.map(a=>`<div class="daily-item revenue-edit-item compact-revenue-item">
            <div class="revenue-appointment-info">
              <strong>${escapeHtml(a.startTime || '')} · ${escapeHtml(a.customerName || '')}</strong>
              <small>${escapeHtml(a.serviceName || 'Leistung')} · ${escapeHtml(a.durationMinutes || a.duration || '')} Min · Status: ${escapeHtml(a.status || 'Gebucht')}</small>
            </div>
            <div class="revenue-edit-controls">
              <input type="number" step="0.01" value="${Number(a.price||0)}" data-revenue-price="${a.id}" title="Preis">
              <select data-revenue-status="${a.id}" title="Status">
                <option value="Gebucht" ${a.status==='Gebucht'?'selected':''}>Gebucht</option>
                <option value="Erledigt" ${a.status==='Erledigt'?'selected':''}>Erledigt</option>
                <option value="Nicht erschienen" ${a.status==='Nicht erschienen'?'selected':''}>Nicht erschienen</option>
              </select>
              <button type="button" data-revenue-save="${a.id}">Speichern</button>
              <button type="button" class="danger" data-revenue-delete="${a.id}">Löschen</button>
            </div>
          </div>`).join('')}
        </section>`).join('');
    }else{
      $('revenueEditAppointments').innerHTML = '<small>Keine Termine an diesem Tag.</small>';
    }
    $('revenueEditAppointments').querySelectorAll('button[data-revenue-save]').forEach(btn=>{
      btn.onclick = () => saveRevenueAppointmentEdit(btn.dataset.revenueSave);
    });
    $('revenueEditAppointments').querySelectorAll('button[data-revenue-delete]').forEach(btn=>{
      btn.onclick = () => deleteRevenueAppointment(btn.dataset.revenueDelete);
    });
  }

  const items = (state.manualRevenueItems || []).filter(x=>x.date===day);
  if($('manualRevenueList')){
    $('manualRevenueList').innerHTML = items.length ? items.map(x=>`<div class="daily-item">
      <div><strong>${escapeHtml(x.title || 'Manuelle Position')}</strong><br><small>${money(Number(x.amount||0))}${x.note ? ' · ' + escapeHtml(x.note) : ''}</small></div>
      <button type="button" class="danger" data-manual-revenue-delete="${x.id}">Löschen</button>
    </div>`).join('') : '<small>Noch keine manuellen Umsatzpositionen für diesen Tag.</small>';
    $('manualRevenueList').querySelectorAll('button[data-manual-revenue-delete]').forEach(btn=>{
      btn.onclick = () => deleteManualRevenueItem(btn.dataset.manualRevenueDelete);
    });
  }
}

function saveRevenueAppointmentEdit(id){
  const a = (state.appointments || []).find(x=>x.id===id);
  if(!a) return;
  const priceInput = document.querySelector(`input[data-revenue-price="${CSS.escape(id)}"]`);
  const statusSelect = document.querySelector(`select[data-revenue-status="${CSS.escape(id)}"]`);
  a.price = Number(priceInput?.value || 0);
  a.status = statusSelect?.value || a.status || 'Gebucht';
  saveState();
  renderRevenueEditor();
  renderCalendar();
  renderReport();
}

function deleteRevenueAppointment(id){
  const a = (state.appointments || []).find(x=>x.id===id);
  if(!a) return;
  const name = a.customerName || 'diesen Kundentermin';
  if(!confirm(`Kundentermin von ${name} wirklich löschen?`)) return;
  state.appointments = (state.appointments || []).filter(x=>x.id!==id);
  if(selectedAppointmentId === id) selectedAppointmentId = null;
  saveState();
  renderRevenueEditor();
  renderCalendar();
  renderReport();
}

function addManualRevenueItem(){
  const day = $('revenueEditDate')?.value || state.selectedDate || todayISO();
  const title = $('manualRevenueTitle')?.value.trim() || 'Manuelle Umsatzposition';
  const amount = Number($('manualRevenueAmount')?.value || 0);
  const note = $('manualRevenueNote')?.value.trim() || '';
  if(!amount){ alert('Bitte einen Betrag eingeben.'); return; }
  state.manualRevenueItems = state.manualRevenueItems || [];
  state.manualRevenueItems.push({id:uid(), date:day, title, amount, note});
  if($('manualRevenueTitle')) $('manualRevenueTitle').value = '';
  if($('manualRevenueAmount')) $('manualRevenueAmount').value = '';
  if($('manualRevenueNote')) $('manualRevenueNote').value = '';
  saveState();
  renderRevenueEditor();
  renderReport();
}

function deleteManualRevenueItem(id){
  state.manualRevenueItems = (state.manualRevenueItems || []).filter(x=>x.id!==id);
  saveState();
  renderRevenueEditor();
  renderReport();
}

function setRevenueDayExcluded(excluded){
  const day = $('revenueEditDate')?.value || state.selectedDate || todayISO();
  state.excludedRevenueDays = state.excludedRevenueDays || [];
  const exists = state.excludedRevenueDays.includes(day);
  if(excluded && !exists) state.excludedRevenueDays.push(day);
  if(!excluded) state.excludedRevenueDays = state.excludedRevenueDays.filter(d=>d!==day);
  saveState();
  renderRevenueEditor();
  renderReport();
}

function addDaysISO(dateString, days){
  const d = new Date(dateString + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0,10);
}
function getDeleteRange(){
  const selected = $("deleteDayInput")?.value || todayISO();
  const type = $("deletePeriodType")?.value || "day";
  if(type === "day"){
    return {type, start:selected, end:selected, label:`Tag ${formatDateShort(selected)}`};
  }
  if(type === "week"){
    const d = new Date(selected + "T12:00:00");
    const day = d.getDay() || 7; // Montag = 1, Sonntag = 7
    d.setDate(d.getDate() - day + 1);
    const start = d.toISOString().slice(0,10);
    const end = addDaysISO(start, 6);
    return {type, start, end, label:`Woche ${formatDateShort(start)} bis ${formatDateShort(end)}`};
  }
  const [yyyy, mm] = selected.split("-");
  const start = `${yyyy}-${mm}-01`;
  const last = new Date(Number(yyyy), Number(mm), 0);
  const end = last.toISOString().slice(0,10);
  return {type, start, end, label:`Monat ${mm}/${String(yyyy).slice(-2)}`};
}
function updateDeletePeriodPreview(){
  const preview = $("deletePeriodPreview");
  if(!preview) return;
  const range = getDeleteRange();
  const count = state.appointments.filter(a => a.date >= range.start && a.date <= range.end).length;
  preview.textContent = `${range.label} · ${count} Termine gefunden`;
}

function deleteWholeDayAppointments(){
  const range = getDeleteRange();
  const count = state.appointments.filter(a => a.date >= range.start && a.date <= range.end).length;
  if(count === 0){
    alert("Im gewählten Zeitraum gibt es keine Termine.");
    return;
  }
  const first = confirm(`Es werden ${count} Termine endgültig gelöscht: ${range.label}. Vorher Backup exportieren empfohlen. Fortfahren?`);
  if(!first) return;
  const second = confirm(`Letzte Bestätigung: ${count} Termine wirklich unwiderruflich löschen?`);
  if(!second) return;
  state.appointments = state.appointments.filter(a => !(a.date >= range.start && a.date <= range.end));
  state.excludedRevenueDays = state.excludedRevenueDays.filter(d => !(d >= range.start && d <= range.end));
  saveState();
  renderAll();
  updateDeletePeriodPreview();
  updateCleanupPreview();
  $("cloudBackupProvider") && ($("cloudBackupProvider").value = state.cloudBackupProvider || "none");
  $("cloudBackupEnabled") && ($("cloudBackupEnabled").checked = !!state.cloudBackupEnabled);
  updateBackupStatuses();
  alert(`${count} Termine wurden gelöscht: ${range.label}.`);
}

function openSettings(){
  $("languageSelect") && ($("languageSelect").value=state.language || "de");
  $("displayDeviceMode") && ($("displayDeviceMode").value = normalizeDisplayDeviceMode(state.displayDeviceMode || "auto"));
  $("scheduleZoom") && ($("scheduleZoom").value = normalizeScheduleZoom(state.scheduleZoom || "normal"));
  updateDisplayModeHint();
  $("settingsStudioName").value=state.studioName;
  $("cloudBackupProvider") && ($("cloudBackupProvider").value = state.cloudBackupProvider || "share");
  $("cloudBackupEnabled") && ($("cloudBackupEnabled").checked = !!state.cloudBackupEnabled);
  updateBackupStatuses();
  $("settingsStudioPhone").value=state.studioPhone || "";
  $("settingsStudioAddress").value=state.studioAddress || "";
  $("deleteDayInput").value=state.selectedDate || todayISO();
  updateDeletePeriodPreview();
  updateCleanupPreview();
  $("cloudBackupProvider") && ($("cloudBackupProvider").value = state.cloudBackupProvider || "none");
  $("cloudBackupEnabled") && ($("cloudBackupEnabled").checked = !!state.cloudBackupEnabled);
  updateBackupStatuses();
  $("toggleRevenueFeature") && ($("toggleRevenueFeature").checked = !!state.revenueEnabled);
  $("settingsOpen").value=state.openTime;
  $("settingsClose").value=state.closeTime;
  renderSettingsEmployeeList();
  renderWorkTimeList();
  renderSettingsCustomerList();
  renderServiceList();
  $("settingsDialog").showModal();
}
function saveSettings(){
  if(!requireActiveStudioLicense()) return;
  state.studioName=$("settingsStudioName").value.trim()||state.studioName;
  state.studioPhone=$("settingsStudioPhone").value.trim();
  state.studioAddress=$("settingsStudioAddress").value.trim();
  state.revenueEnabled = $("toggleRevenueFeature") ? $("toggleRevenueFeature").checked : state.revenueEnabled;
  state.displayDeviceMode = $("displayDeviceMode") ? normalizeDisplayDeviceMode($("displayDeviceMode").value) : normalizeDisplayDeviceMode(state.displayDeviceMode || "auto");
  state.scheduleZoom = $("scheduleZoom") ? normalizeScheduleZoom($("scheduleZoom").value) : normalizeScheduleZoom(state.scheduleZoom || "normal");
  state.openTime=$("settingsOpen").value||state.openTime;
  state.closeTime=$("settingsClose").value||state.closeTime;
  saveState(); applyDeviceView(); renderAll(); applyRevenueVisibility();
  alert("Studio-Einstellungen gespeichert.");
}


function getPastCompletedCleanupCandidates(){
  const today = todayISO();
  // Löscht bewusst alle Termine vor heute – unabhängig davon, ob sie bearbeitet,
  // bezahlt, erledigt oder als nicht erschienen markiert wurden. Termine von heute
  // und alle zukünftigen Termine bleiben erhalten.
  return (state.appointments || []).filter(a => a && a.date < today);
}

function updateCleanupPreview(){
  const el = $("cleanupPreview");
  if(!el) return;
  el.textContent = state.language === "vi"
    ? "Tất cả lịch hẹn trong quá khứ sẽ bị xóa và một bản sao lưu sẽ được tạo. Lịch hẹn hôm nay và sau hôm nay không bị xóa."
    : state.language === "en"
      ? "All past appointments will be deleted and a backup will be created. Today’s and future appointments will not be deleted."
      : "Alle vergangene Termin werden gelöscht und ein Backup erstellt";
}

function nowStampForFilename(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  const hh = String(d.getHours()).padStart(2,"0");
  const mi = String(d.getMinutes()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}_${hh}-${mi}`;
}
function nowStampHuman(){
  const d = new Date();
  return `${d.toLocaleDateString("de-DE")} ${d.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})}`;
}
function safeStudioFilePrefix(){
  const name = (state.studioName || "Nagelstudio")
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "");
  return name || "Nagelstudio";
}
function buildBackupPayload(type){
  return {
    backupInfo:{
      backupType:type || "Normal",
      createdAt:nowStampHuman(),
      createdAtISO:new Date().toISOString(),
      appVersion:"2.8",
      note:type === "Bereinigung"
        ? "Backup nach Bereinigung: Alle Termine vor dem heutigen Tag wurden vorher entfernt. Termine von heute und danach bleiben erhalten."
        : "Normales Backup."
    },
    data:{...state, version:"2.8", studioId:CURRENT_STUDIO_ID, licensedStudioName:CURRENT_STUDIO ? CURRENT_STUDIO.name : ""}
  };
}
function setLocalBackupStatus(filename){
  state.lastLocalBackup = `${filename} · ${nowStampHuman()}`;
  saveState();
  updateBackupStatuses();
}
function setCloudBackupStatus(filename){
  state.lastCloudBackup = `${filename} · ${nowStampHuman()}`;
  saveState();
  updateBackupStatuses();
}
function updateBackupStatuses(){
  const local = $("localBackupStatus");
  if(local) local.textContent = state.lastLocalBackup ? `${t("lastLocalBackup")}: ${state.lastLocalBackup}` : t("noLocalBackup");
  const cloud = $("cloudBackupStatus");
  if(cloud){
    const provider = normalizeCloudProvider(state.cloudBackupProvider || "onedrive");
    const names = {onedrive:"OneDrive", google:"Google Drive", dropbox:"Dropbox", icloud:"iCloud Drive"};
    if(!state.cloudBackupEnabled){
      cloud.textContent = `${t("cloudDisabled")} ${state.lastCloudBackup ? `${t("lastCloudBackup")}: ${state.lastCloudBackup}` : t("noCloudBackup")}`;
    }else{
      cloud.textContent = `${names[provider]} · ${t("cloudStatusHint")} ${state.lastCloudBackup ? `${t("lastCloudBackup")}: ${state.lastCloudBackup}` : t("noCloudBackup")}`;
    }
  }
}
function createBackupDownload(filename, payload, statusType="local"){
  const backupText = JSON.stringify(payload, null, 2);
  const blob = new Blob([backupText], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  const area = $("lastBackupDownloadArea");
  if(area){
    area.innerHTML = "";
    const manual = document.createElement("a");
    manual.href = url;
    manual.download = filename;
    manual.textContent = t("backupManualDownload");
    area.appendChild(manual);
    const info = document.createElement("small");
    info.textContent = `${t("lastLocalBackup")}: ${filename}`;
    area.appendChild(info);
  }
  setTimeout(() => a.remove(), 1000);
  if(statusType === "cloud") setCloudBackupStatus(filename); else setLocalBackupStatus(filename);
  return true;
}
function isIOSLikeDevice(){
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  return /iPad|iPhone|iPod/.test(ua) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
async function shareBackupFile(filename, backupText, statusType="local"){
  if(!navigator.share || typeof File === "undefined") return false;
  const file = new File([backupText], filename, {type:"application/json"});
  if(navigator.canShare && !navigator.canShare({files:[file]})) return false;
  try{
    // Wichtig für iPhone/iPad: nur die Datei teilen.
    // Kein title/text übergeben, weil iOS/Speicherziele daraus sonst zusätzlich
    // eine kleine Textdatei im Backup-Ordner erzeugen können.
    await navigator.share({files:[file]});
    if(statusType === "cloud") setCloudBackupStatus(filename); else setLocalBackupStatus(filename);
    return true;
  }catch(err){
    if(err && err.name === "AbortError") return false;
    console.warn("share backup fallback", err);
    return false;
  }
}
async function downloadBackupWithName(filename, payloadToSave = buildBackupPayload("Normal"), statusType="local"){
  const suggestedName = filename || `${safeStudioFilePrefix()}_Backup_${nowStampForFilename()}.json`;
  const backupText = JSON.stringify(payloadToSave, null, 2);

  // iPad/iPhone: zuerst das native Teilen/Speichern-Menü öffnen. Der normale
  // Download-Link zeigt in Safari sonst nur „Möchtest du … laden?“.
  if(isIOSLikeDevice()){
    const shared = await shareBackupFile(suggestedName, backupText, statusType);
    if(shared) return true;
  }

  // Windows/Chrome/Edge: echter Speichern-Dialog mit Dateiname.
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: "Nagelstudio Backup JSON", accept: { "application/json": [".json"] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(backupText);
      await writable.close();
      if(statusType === "cloud") setCloudBackupStatus(suggestedName); else setLocalBackupStatus(suggestedName);
      return true;
    } catch (err) {
      if (err && err.name === "AbortError") return false;
      console.warn("showSaveFilePicker fallback", err);
    }
  }

  // Letzter Fallback für Browser ohne Speichern-/Teilen-API.
  return createBackupDownload(suggestedName, payloadToSave, statusType);
}
async function cleanupPastCompletedAndBackup(){
  const buttons = [$("cleanupPastAndBackupBtn")].filter(Boolean);
  const candidates = getPastCompletedCleanupCandidates();
  const today = todayISO();
  const oldRevenueDays = (state.excludedRevenueDays || []).filter(d => d < today);
  const msg = t("cleanupConfirm").replace("{appointments}", candidates.length).replace("{days}", oldRevenueDays.length);
  if(!confirm(msg)) return;
  buttons.forEach(btn => { btn.disabled = true; btn.dataset.oldHtml = btn.innerHTML; btn.textContent = t("cleanupRunning"); });
  const removeIds = new Set(candidates.map(a => a.id));
  state.appointments = (state.appointments || []).filter(a => !removeIds.has(a.id));
  state.excludedRevenueDays = (state.excludedRevenueDays || []).filter(d => d >= today);
  saveState();
  renderAll();
  updateCleanupPreview();
  const filename = `${safeStudioFilePrefix()}_Backup_${nowStampForFilename()}.json`;
  const payload = buildBackupPayload("Bereinigung");
  const backupOk = await downloadBackupWithName(filename, payload, "local");
  if(state.cloudBackupEnabled && state.cloudBackupAfterCleanup){
    await cloudBackupNow(true);
  }
  buttons.forEach(btn => { btn.disabled = false; if(btn.dataset.oldHtml){ btn.innerHTML = btn.dataset.oldHtml; delete btn.dataset.oldHtml; } });
  applyLanguage();
  if(backupOk) alert(t("cleanupDone").replace("{filename}", filename));
}
function saveCloudBackupSettings(){
  state.cloudBackupProvider = normalizeCloudProvider($("cloudBackupProvider") ? $("cloudBackupProvider").value : state.cloudBackupProvider);
  state.cloudBackupEnabled = $("cloudBackupEnabled") ? $("cloudBackupEnabled").checked : !!state.cloudBackupEnabled;
  state.cloudBackupAfterCleanup = $("cloudBackupAfterCleanup") ? $("cloudBackupAfterCleanup").checked : !!state.cloudBackupAfterCleanup;
  saveState();
  updateBackupStatuses();
}
async function cloudBackupNow(silent=false){
  saveCloudBackupSettings();
  const filename = `${safeStudioFilePrefix()}_Backup_${nowStampForFilename()}.json`;
  const payload = buildBackupPayload("CloudBackup");
  const json = JSON.stringify(payload,null,2);
  const shared = await shareBackupFile(filename, json, "cloud");
  if(shared){
    if(!silent) alert("Cloud-Backup wurde an das Teilen/Speichern-Menü übergeben.");
    return true;
  }
  const ok = await downloadBackupWithName(filename, payload, "cloud");
  if(ok && !silent) alert("Teilen-Menü ist nicht verfügbar. Backup wurde als Download erstellt. Du kannst die Datei danach manuell in deine Cloud verschieben.");
  return ok;
}
function exportBackup(){
  const filename = `${safeStudioFilePrefix()}_Backup_${nowStampForFilename()}.json`;
  downloadBackupWithName(filename, buildBackupPayload("Normal"));
}
function extractBackupData(raw){
  if(!raw || typeof raw !== "object") throw new Error("Kein JSON-Objekt");
  const imported = raw.data && typeof raw.data === "object" ? raw.data : raw;
  if(!Array.isArray(imported.employees)) imported.employees = [];
  if(!Array.isArray(imported.appointments)) imported.appointments = [];
  return imported;
}
function importBackup(e){
  const file=e.target.files && e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const raw=JSON.parse(reader.result);
      const imported = extractBackupData(raw);
      state={
        ...defaultState(),
        ...imported,
        version:"3.0",
        configured:true,
        services:Array.isArray(imported.services) && imported.services.length ? imported.services : defaultServices(),
        customers:Array.isArray(imported.customers) ? imported.customers : [],
        excludedRevenueDays:Array.isArray(imported.excludedRevenueDays) ? imported.excludedRevenueDays : [],
        manualRevenueItems:Array.isArray(imported.manualRevenueItems) ? imported.manualRevenueItems : [],
        language:imported.language || "de",
        revenueEnabled:typeof imported.revenueEnabled === "boolean" ? imported.revenueEnabled : false,
        displayDeviceMode:normalizeDisplayDeviceMode(imported.displayDeviceMode || "auto"),
        scheduleZoom:normalizeScheduleZoom(imported.scheduleZoom || "normal"),
        cloudBackupEnabled:!!imported.cloudBackupEnabled,
        cloudBackupProvider:normalizeCloudProvider(imported.cloudBackupProvider || "onedrive"),
        cloudBackupAfterCleanup:!!imported.cloudBackupAfterCleanup,
        lastLocalBackup:imported.lastLocalBackup || "",
        lastCloudBackup:imported.lastCloudBackup || ""
      };
      state.employees = (state.employees || []).map((e, index) => normalizeEmployeeRecord(e, index)).filter(e=>e.name);
      state.appointments = (state.appointments || []).map(a => ({...a, id:a.id || uid(), status:a.status || "Gebucht", employeeAny: !!a.employeeAny}));
      saveState();
      renderAll();
      alert(t("importSuccess"));
    }catch(err){
      console.error("Importfehler:", err);
      alert(t("importFailed"));
    }finally{
      e.target.value="";
    }
  };
  reader.readAsText(file);
}
function openSettings(){
  $("languageSelect") && ($("languageSelect").value=state.language || "de");
  $("displayDeviceMode") && ($("displayDeviceMode").value = normalizeDisplayDeviceMode(state.displayDeviceMode || "auto"));
  $("scheduleZoom") && ($("scheduleZoom").value = normalizeScheduleZoom(state.scheduleZoom || "normal"));
  updateDisplayModeHint();
  $("settingsStudioName").value=state.studioName;
  $("settingsStudioPhone").value=state.studioPhone || "";
  $("settingsStudioAddress").value=state.studioAddress || "";
  $("deleteDayInput") && ($("deleteDayInput").value=state.selectedDate || todayISO());
  $("cloudBackupProvider") && ($("cloudBackupProvider").value = normalizeCloudProvider(state.cloudBackupProvider || "onedrive"));
  $("cloudBackupEnabled") && ($("cloudBackupEnabled").checked = !!state.cloudBackupEnabled);
  $("cloudBackupAfterCleanup") && ($("cloudBackupAfterCleanup").checked = !!state.cloudBackupAfterCleanup);
  $("toggleRevenueFeature") && ($("toggleRevenueFeature").checked = !!state.revenueEnabled);
  $("settingsOpen").value=state.openTime;
  $("settingsClose").value=state.closeTime;
  renderSettingsEmployeeList();
  renderWorkTimeList();
  renderSettingsCustomerList();
  renderServiceList();
  updateDeletePeriodPreview();
  updateCleanupPreview();
  updateBackupStatuses();
  switchSettingsTab("settingsGeneralTab");
  $("settingsDialog").showModal();
}
function showAppointment(id){
  selectedAppointmentId=id;
  const a=state.appointments.find(x=>x.id===id); if(!a) return;
  const emp=state.employees.find(e=>e.id===a.employeeId);
  $("appointmentDetails").innerHTML=`<p><strong>${escapeHtml(a.customerName)}</strong></p><p>${escapeHtml(a.serviceName || t("serviceFallback"))} · ${escapeHtml(a.startTime)} · ${a.duration} Min</p><p>${t("employeeLabel")}: ${escapeHtml(emp?.name||"")}</p><p>${t("phoneLabel")}: ${escapeHtml(a.phone||"-")}</p><p>${t("internalStatus")}: ${escapeHtml(a.status||"Gebucht")}${a.employeeAny ? " · Beliebig" : ""}</p><p>${t("priceLabel")}: ${money(a.price)}</p><p>${t("noteLabel")}: ${escapeHtml(a.note||"-")}</p>`;
  $("appointmentDialog").showModal();
}
if("serviceWorker" in navigator){ window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js")); }
boot();
