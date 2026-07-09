const KEY = "nail_studio_pwa_v63";
const OLD_KEYS = ["nail_studio_pwa_v62", "nail_studio_pwa_v61", "nail_studio_pwa_v60", "nail_studio_pwa_v59", "nail_studio_pwa_v58", "nail_studio_pwa_v57", "nail_studio_pwa_v56", "nail_studio_pwa_v55", "nail_studio_pwa_v54", "nail_studio_pwa_v53", "nail_studio_pwa_v52", "nail_studio_pwa_v51", "nail_studio_pwa_v50", "nail_studio_pwa_v49", "nail_studio_pwa_v48", "nail_studio_pwa_v47", "nail_studio_pwa_v46", "nail_studio_pwa_v45", "nail_studio_pwa_v44", "nail_studio_pwa_v43", "nail_studio_pwa_v42", "nail_studio_pwa_v41", "nail_studio_pwa_v40", "nail_studio_pwa_v39", "nail_studio_pwa_v38", "nail_studio_pwa_v37", "nail_studio_pwa_v36", "nail_studio_pwa_v35", "nail_studio_pwa_v34", "nail_studio_pwa_v33", "nail_studio_pwa_v32", "nail_studio_pwa_v31", "nail_studio_pwa_v30", "nail_studio_pwa_v29", "nail_studio_pwa_v28", "nail_studio_pwa_v27", "nail_studio_pwa_v26", "nail_studio_pwa_v25", "nail_studio_pwa_v24", "nail_studio_pwa_v23", "nail_studio_pwa_v22", "nail_studio_pwa_v21", "nail_studio_pwa_v20", "nail_studio_pwa_v19", "nail_studio_pwa_v18", "nail_studio_pwa_v17", "nail_studio_pwa_v16", "nail_studio_pwa_v15", "nail_studio_pwa_v14", "nail_studio_pwa_v13", "nail_studio_pwa_v12", "nail_studio_pwa_v11", "nail_studio_pwa_v10", "nail_studio_pwa_v9", "nail_studio_pwa_v8", "nail_studio_pwa_v7", "nail_studio_pwa_v6", "nail_studio_pwa_v5", "nail_studio_pwa_v4", "nail_studio_pwa_v3", "nail_studio_pwa_v2", "nail_studio_pwa_v1"];
const $ = id => document.getElementById(id);

const LICENSE_STUDIO_ID_KEY = "nail_studio_license_studio_id";
const LICENSE_FILE = "studio-licenses.json";
let currentLicense = null;
let currentLicenseResult = {valid:false, reason:"Lizenz wurde noch nicht geprüft."};

function normalizeStudioId(id){
  return String(id || "").trim().toUpperCase();
}

function getStoredStudioId(){
  return normalizeStudioId(localStorage.getItem(LICENSE_STUDIO_ID_KEY));
}

function setStoredStudioId(id){
  const clean = normalizeStudioId(id);
  if(clean) localStorage.setItem(LICENSE_STUDIO_ID_KEY, clean);
  else localStorage.removeItem(LICENSE_STUDIO_ID_KEY);
  return clean;
}

function planLabel(plan){
  if(plan === "trial") return "Testversion";
  if(plan === "full") return "Vollversion";
  if(plan === "blocked") return "Gesperrt";
  return plan || "Unbekannt";
}

function formatLicenseDate(dateString){
  if(!dateString) return "-";
  const parts = String(dateString).split("-");
  if(parts.length !== 3) return dateString;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

async function loadLicenseFile(){
  if(location.protocol === "file:"){
    throw new Error("Bitte die App über GitHub Pages oder einen lokalen Server starten, nicht direkt per Doppelklick.");
  }
  let response;
  try{
    response = await fetch(LICENSE_FILE, {cache:"no-store"});
  }catch(err){
    throw new Error("studio-licenses.json konnte nicht geladen werden. Bitte Internetverbindung, GitHub Pages und Dateinamen prüfen.");
  }
  if(!response.ok){
    throw new Error(`studio-licenses.json wurde nicht gefunden oder ist nicht erreichbar. HTTP-Status: ${response.status}`);
  }
  try{
    const data = await response.json();
    if(!data || !Array.isArray(data.studios)){
      throw new Error("Die Datei muss ein Objekt mit dem Feld \"studios\" enthalten.");
    }
    return data;
  }catch(err){
    throw new Error("studio-licenses.json enthält ungültiges JSON oder hat nicht die erwartete Struktur.");
  }
}

function validateStudioLicense(data, studioId){
  if(!studioId){
    return {valid:false, reason:"Bitte geben Sie eine Studio-ID ein.", studio:null};
  }
  const studio = data.studios.find(item => normalizeStudioId(item.id) === studioId);
  if(!studio){
    return {valid:false, reason:"Diese Studio-ID wurde in studio-licenses.json nicht gefunden.", studio:null};
  }
  const plan = String(studio.plan || "").toLowerCase();
  if(studio.active !== true){
    return {valid:false, reason:"Diese Lizenz ist deaktiviert.", studio};
  }
  if(plan === "blocked"){
    return {valid:false, reason:"Diese Lizenz ist gesperrt.", studio};
  }
  if(!["trial", "full"].includes(plan)){
    return {valid:false, reason:"Der Lizenzplan ist ungültig. Erlaubt sind trial oder full.", studio};
  }
  if(plan === "trial"){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(studio.expiresAt || "")){
      return {valid:false, reason:"Für die Testversion fehlt ein gültiges Ablaufdatum.", studio};
    }
    if(todayISO() > studio.expiresAt){
      return {valid:false, reason:`Die Testversion ist am ${formatLicenseDate(studio.expiresAt)} abgelaufen.`, studio};
    }
  }
  return {valid:true, reason:"Lizenz gültig.", studio};
}

async function checkLicense(studioId){
  const cleanStudioId = normalizeStudioId(studioId || getStoredStudioId());
  try{
    const data = await loadLicenseFile();
    const result = validateStudioLicense(data, cleanStudioId);
    currentLicense = result.valid ? result.studio : null;
    currentLicenseResult = {...result, studioId:cleanStudioId};
    if(result.valid) setStoredStudioId(cleanStudioId);
    return currentLicenseResult;
  }catch(err){
    currentLicense = null;
    currentLicenseResult = {valid:false, reason:err.message || "Lizenz konnte nicht geprüft werden.", studioId:cleanStudioId};
    return currentLicenseResult;
  }
}

function hideLicenseScreen(){
  $("licenseScreen") && $("licenseScreen").classList.add("hidden");
}

function showLicenseScreen(result, mode="blocked"){
  const screen = $("licenseScreen");
  if(!screen) return;
  const studioId = normalizeStudioId(result?.studioId || getStoredStudioId());
  $("setupScreen") && $("setupScreen").classList.add("hidden");
  $("mainScreen") && $("mainScreen").classList.add("hidden");
  screen.classList.remove("hidden");
  if($("licenseStudioIdInput")) $("licenseStudioIdInput").value = studioId;
  if($("licenseTitle")) $("licenseTitle").textContent = mode === "first" ? "Studio-ID eingeben" : "App gesperrt";
  if($("licenseMessage")) $("licenseMessage").textContent = mode === "first" ? "Bitte geben Sie beim ersten Start Ihre Studio-ID ein." : "Die Lizenz konnte nicht gültig geprüft werden.";
  const box = $("licenseStatusBox");
  if(box){
    box.classList.remove("hidden", "license-ok", "license-error");
    box.classList.add(result?.valid ? "license-ok" : "license-error");
    const shownStudioId = studioId || "Keine Studio-ID gespeichert";
    box.innerHTML = `<div><strong>Grund:</strong> ${escapeHtml(result?.reason || "Bitte Studio-ID prüfen.")}</div><div><strong>Studio-ID:</strong> ${escapeHtml(shownStudioId)}</div>`;
  }
}

function continueAfterValidLicense(){
  hideLicenseScreen();
  updateLicenseInfoBox();
  state.configured ? showMain() : showSetup();
}

async function verifyLicenseAndContinue(){
  const stored = getStoredStudioId();
  if(!stored){
    currentLicenseResult = {valid:false, reason:"Bitte geben Sie eine Studio-ID ein.", studioId:""};
    showLicenseScreen(currentLicenseResult, "first");
    return false;
  }
  const result = await checkLicense(stored);
  if(result.valid){
    continueAfterValidLicense();
    return true;
  }
  showLicenseScreen(result, "blocked");
  return false;
}

async function submitLicenseFromScreen(){
  const input = normalizeStudioId($("licenseStudioIdInput")?.value || "");
  setStoredStudioId(input);
  const result = await checkLicense(input);
  if(result.valid){
    continueAfterValidLicense();
  }else{
    showLicenseScreen(result, input ? "blocked" : "first");
  }
}

async function changeStudioId(){
  const current = getStoredStudioId();
  const next = prompt("Neue Studio-ID eingeben:", current || "");
  if(next === null) return;
  setStoredStudioId(next);
  await verifyLicenseAndContinue();
}

function bindLicenseEvents(){
  $("licenseCheckBtn") && ($("licenseCheckBtn").onclick = submitLicenseFromScreen);
  $("licenseChangeStudioBtn") && ($("licenseChangeStudioBtn").onclick = () => {
    setStoredStudioId("");
    currentLicenseResult = {valid:false, reason:"Bitte geben Sie eine neue Studio-ID ein.", studioId:""};
    showLicenseScreen(currentLicenseResult, "first");
    $("licenseStudioIdInput") && $("licenseStudioIdInput").focus();
  });
  $("licenseStudioIdInput") && ($("licenseStudioIdInput").onkeydown = e => {
    if(e.key === "Enter") submitLicenseFromScreen();
  });
  $("settingsChangeStudioIdBtn") && ($("settingsChangeStudioIdBtn").onclick = changeStudioId);
  $("settingsRecheckLicenseBtn") && ($("settingsRecheckLicenseBtn").onclick = verifyLicenseAndContinue);
}

function licenseValidityLine(studio){
  const plan = String(studio?.plan || "").toLowerCase();
  if(plan === "trial"){
    const date = formatLicenseDate(studio.expiresAt);
    return `Lizenz gültig bis: ${date} · Testzeit läuft ab am: ${date}`;
  }
  if(plan === "full"){
    return "Lizenz gültig: Vollversion ohne Ablaufdatum";
  }
  return "Lizenzstatus unbekannt";
}

function licenseDaysUntilExpiry(studio){
  const expiresAt = studio?.expiresAt;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(expiresAt || "")) return null;
  const today = new Date(`${todayISO()}T00:00:00`);
  const expiry = new Date(`${expiresAt}T00:00:00`);
  if(Number.isNaN(today.getTime()) || Number.isNaN(expiry.getTime())) return null;
  return Math.ceil((expiry - today) / 86400000);
}

function licenseExpiryCountdownText(daysLeft){
  if(daysLeft === 0) return "heute";
  if(daysLeft === 1) return "morgen";
  return `in ${daysLeft} Tagen`;
}

function updateLicenseFooterBar(){
  const footer = $("licenseFooterBar");
  if(!footer) return;
  const result = currentLicenseResult || {};
  const studio = currentLicense || result.studio;
  const plan = String(studio?.plan || "").toLowerCase();
  const daysLeft = result.valid && studio && plan === "trial" ? licenseDaysUntilExpiry(studio) : null;

  // Standardmäßig bleibt die Lizenz-Leiste im Dashboard ausgeblendet.
  // Sie erscheint nur als Erinnerung ab 7 Tage vor Ablauf der Testlizenz.
  if(result.valid && studio && plan === "trial" && daysLeft !== null && daysLeft >= 0 && daysLeft <= 7){
    const date = formatLicenseDate(studio.expiresAt);
    footer.textContent = `Erinnerung: Lizenz läuft ${licenseExpiryCountdownText(daysLeft)} ab · Ablaufdatum: ${date}`;
    footer.classList.remove("hidden");
  }else{
    footer.classList.add("hidden");
    footer.textContent = "";
  }
}

function updateLicenseInfoBox(){
  const box = $("licenseInfoBox");
  const result = currentLicenseResult || {};
  const studio = currentLicense || result.studio;
  const studioId = result.studioId || getStoredStudioId() || "-";
  if(box){
    if(result.valid && studio){
      const plan = String(studio.plan || "").toLowerCase();
      box.innerHTML = [
        `<div><strong>Studio:</strong> ${escapeHtml(studio.name || "-")}</div>`,
        `<div><strong>Studio-ID:</strong> ${escapeHtml(studioId)}</div>`,
        `<div><strong>Plan:</strong> ${escapeHtml(planLabel(plan))}</div>`,
        plan === "trial" ? `<div><strong>Lizenz gültig bis:</strong> ${escapeHtml(formatLicenseDate(studio.expiresAt))}</div>` : `<div><strong>Lizenz gültig:</strong> Vollversion ohne Ablaufdatum</div>`,
        plan === "trial" ? `<div><strong>Testzeit läuft ab am:</strong> ${escapeHtml(formatLicenseDate(studio.expiresAt))}</div>` : ""
      ].filter(Boolean).join("");
    }else{
      box.innerHTML = `<div><strong>Status:</strong> Gesperrt oder nicht geprüft</div><div><strong>Grund:</strong> ${escapeHtml(result.reason || "-")}</div><div><strong>Studio-ID:</strong> ${escapeHtml(studioId)}</div>`;
    }
  }
  updateLicenseFooterBar();
}

let state;
let editingAppointmentId = null;
let selectedAppointmentId = null;
let selectedCalendarSlot = null;
let movingAppointmentId = null;
let longPressTimer = null;
let touchDragGhost = null;
let touchDragOriginal = null;
let touchDragPointerId = null;
let touchDragCleanupInstalled = false;
let suppressAppointmentClick = false;
let editingEmployeeId = null;
let editingCustomerId = null;
let dashboardReturnTimer = null;

function isIpadSafariLike(){
  const ua = navigator.userAgent || "";
  const isiPad = /iPad/i.test(ua) || (navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1);
  return isiPad || document.body.classList.contains("app-device-ipad");
}
function clearAppointmentDragBeforeInputFocus(){
  clearTimeout(longPressTimer);
  if(touchDragGhost) cleanupTouchDragAppointment();
  if(movingAppointmentId) cancelMoveAppointment();
  suppressAppointmentClick = false;
}
function installIpadKeyboardFocusFix(){
  if(window.__ipadKeyboardFocusFixInstalled) return;
  window.__ipadKeyboardFocusFixInstalled = true;
  const focusableInputTypes = new Set(["", "text", "search", "tel", "url", "email", "password", "number"]);
  const shouldDirectFocus = (el) => {
    if(!el || el.disabled || el.readOnly) return false;
    const tag = (el.tagName || "").toLowerCase();
    if(tag === "textarea") return true;
    if(tag !== "input") return false;
    return focusableInputTypes.has(String(el.type || "text").toLowerCase());
  };
  const focusFromRealTouch = (event) => {
    if(!isIpadSafariLike()) return;
    const target = event.target && event.target.closest ? event.target.closest("input, textarea") : null;
    if(!shouldDirectFocus(target)) return;
    clearAppointmentDragBeforeInputFocus();
    try{
      target.focus({preventScroll:true});
      const len = typeof target.value === "string" ? target.value.length : 0;
      if(typeof target.setSelectionRange === "function" && len >= 0){
        try{ target.setSelectionRange(len, len); }catch(err){}
      }
    }catch(err){
      try{ target.focus(); }catch(e){}
    }
  };
  document.addEventListener("touchend", focusFromRealTouch, {capture:true, passive:true});
  document.addEventListener("pointerdown", (event) => {
    if(event.pointerType === "touch") focusFromRealTouch(event);
  }, {capture:true, passive:true});
}

function normalizeDashboardReturnDelay(value){
  const ms = Math.round(Number(value));
  // Individuelle Zeiten erlauben: mindestens 1 Sekunde, maximal 60 Minuten.
  if(Number.isFinite(ms) && ms >= 1000 && ms <= 3600000) return ms;
  return 60000;
}

function dashboardReturnPresetValues(){
  return [10000, 30000, 60000, 120000, 180000, 240000, 300000];
}

function formatDashboardReturnDelay(ms){
  ms = normalizeDashboardReturnDelay(ms);
  if(ms % 60000 === 0) return String(ms / 60000) + " Minute" + (ms === 60000 ? "" : "n");
  if(ms % 1000 === 0) return String(ms / 1000) + " Sekunden";
  return String(ms) + " ms";
}

function setDashboardReturnDelayControls(ms){
  ms = normalizeDashboardReturnDelay(ms);
  const select = $("dashboardReturnDelayMs");
  const customWrap = $("dashboardReturnCustomWrap");
  const customValue = $("dashboardReturnCustomValue");
  const customUnit = $("dashboardReturnCustomUnit");
  if(!select) return;
  if(dashboardReturnPresetValues().includes(ms)){
    select.value = String(ms);
    if(customWrap) customWrap.style.display = "none";
  }else{
    select.value = "custom";
    if(customWrap) customWrap.style.display = "grid";
    if(customUnit && customValue){
      if(ms % 60000 === 0){ customUnit.value = "minutes"; customValue.value = String(ms / 60000); }
      else { customUnit.value = "seconds"; customValue.value = String(Math.round(ms / 1000)); }
    }
  }
}

function updateDashboardReturnCustomVisibility(){
  const select = $("dashboardReturnDelayMs");
  const customWrap = $("dashboardReturnCustomWrap");
  if(!select || !customWrap) return;
  customWrap.style.display = select.value === "custom" ? "grid" : "none";
}

function getDashboardReturnDelayFromControls(){
  const select = $("dashboardReturnDelayMs");
  if(!select) return getDashboardReturnDelay();
  if(select.value !== "custom") return normalizeDashboardReturnDelay(select.value);
  const value = Number($("dashboardReturnCustomValue")?.value || 1);
  const unit = $("dashboardReturnCustomUnit")?.value || "seconds";
  const ms = unit === "minutes" ? value * 60000 : value * 1000;
  return normalizeDashboardReturnDelay(ms);
}

function isDashboardReturnEnabled(){
  return state?.dashboardReturnEnabled !== false;
}

function getDashboardReturnDelay(){
  return normalizeDashboardReturnDelay(state?.dashboardReturnDelayMs ?? 60000);
}

function uid(){ return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random()); }
function todayISO(){ const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); }
function defaultServices(){ return [
  {id:uid(), name:"Maniküre", price:25, duration:30},
  {id:uid(), name:"Pediküre", price:35, duration:45},
  {id:uid(), name:"Pediküre & Auffüllen", price:100, duration:120},
  {id:uid(), name:"Pediküre Gel", price:50, duration:60},
  {id:uid(), name:"Pediküre mit Maniküre", price:50, duration:60},
  {id:uid(), name:"Gelmodellage", price:55, duration:90},
  {id:uid(), name:"Auffüllen", price:40, duration:60},
  {id:uid(), name:"Nail Art", price:15, duration:30}
];}
function ensureBuiltInServices(list){
  const services = Array.isArray(list) ? list : [];
  const wanted = [
    {name:"Pediküre & Auffüllen", price:100, duration:120},
    {name:"Pediküre Gel", price:50, duration:60},
    {name:"Pediküre mit Maniküre", price:50, duration:60}
  ];
  wanted.forEach(item => {
    const found = services.find(s => String(s.name || "").trim().toLowerCase() === item.name.toLowerCase());
    if(found){
      found.price = Number(found.price || item.price) || item.price;
      found.duration = Number(found.duration || item.duration) || item.duration;
    }else{
      services.push({id:uid(), ...item});
    }
  });
  return services;
}
function defaultState(){ return {
	  version:"3.02", configured:false, studioName:"", studioPhone:"", studioAddress:"", revenueEnabled:false, language:"de", displayDeviceMode:"auto", scheduleZoom:"normal", reportPrintFormat:"a4", scheduleIntervalMinutes:15, dashboardReturnEnabled:true, dashboardReturnDelayMs:60000, cloudBackupEnabled:false, cloudBackupProvider:"onedrive", cloudBackupAfterCleanup:false, lastLocalBackup:"", lastCloudBackup:"", openTime:"08:00", closeTime:"20:00",
  employees:[], customers:[], services:defaultServices(), appointments:[], excludedRevenueDays:[], manualRevenueItems:[], employeeDailyRevenueRecords:[], revenue2Entries:[], revenue2DeletedAppointmentIds:[], revenue2CashEntries:[], revenue2CashDeletedAppointmentIds:[], cashWithdrawals:[], cashDeposits:[], journalRevenueCorrections:{}, journalRevenueDeletedDays:[], periodRevenueManualEdits:{week:{},month:{}}, paymentSales:[],
  selectedDate:todayISO(), journalDate:todayISO(), storageMode:"local"
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
    data.version = 70;
    data.services = ensureBuiltInServices(data.services && data.services.length ? data.services : defaultServices());
    data.excludedRevenueDays = data.excludedRevenueDays || [];
    data.manualRevenueItems = data.manualRevenueItems || [];
    data.employeeDailyRevenueRecords = data.employeeDailyRevenueRecords || [];
    data.revenue2Entries = data.revenue2Entries || [];
    data.revenue2DeletedAppointmentIds = data.revenue2DeletedAppointmentIds || [];
    data.revenue2CashEntries = data.revenue2CashEntries || [];
    data.revenue2CashDeletedAppointmentIds = data.revenue2CashDeletedAppointmentIds || [];
    data.cashWithdrawals = data.cashWithdrawals || [];
    data.cashDeposits = data.cashDeposits || [];
    data.periodRevenueManualEdits = data.periodRevenueManualEdits || {week:{}, month:{}};
    data.periodRevenueManualEdits.week = data.periodRevenueManualEdits.week || {};
    data.periodRevenueManualEdits.month = data.periodRevenueManualEdits.month || {};
    data.journalRevenueCorrections = data.journalRevenueCorrections || {};
    data.journalRevenueDeletedDays = data.journalRevenueDeletedDays || [];
    data.paymentSales = data.paymentSales || [];
    data.journalDate = data.journalDate || data.selectedDate || todayISO();
    data.customers = data.customers || [];
    data.appointments = (data.appointments || []).map(a => ({...a, status:a.status || "Gebucht", employeeAny: !!a.employeeAny}));
    data.employees = (data.employees || []).map((e, index) => { const auto = paletteColor(index); return normalizeEmployeeRecord({...e, color:(!e.color || isDefaultEmployeeColor(e.color)) ? auto.accent : e.color, rowColor:e.rowColor || auto.bg}, index); });
    data.studioPhone = data.studioPhone || "";
    data.studioAddress = data.studioAddress || "";
    if(typeof data.revenueEnabled !== "boolean") data.revenueEnabled = false;
    data.language = data.language || "de";
    data.displayDeviceMode = normalizeDisplayDeviceMode(data.displayDeviceMode || "auto");
    data.scheduleZoom = normalizeScheduleZoom(data.scheduleZoom || "normal");
    data.reportPrintFormat = normalizeReportPrintFormat(data.reportPrintFormat || "a4");
    data.scheduleIntervalMinutes = normalizeScheduleIntervalMinutes(data.scheduleIntervalMinutes || 15);
    if(typeof data.dashboardReturnEnabled !== "boolean") data.dashboardReturnEnabled = true;
    data.dashboardReturnDelayMs = normalizeDashboardReturnDelay(data.dashboardReturnDelayMs ?? 60000);
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

// Tagesplan-Raster: wird in den Einstellungen zwischen 15 und 30 Minuten gewählt.
// Wird für Zeitleiste, Termin-Spaltenbreite und Verfügbarkeit genutzt.

function formatDateShort(dateString){
  if(!dateString || !dateString.includes("-")) return dateString || "";
  const [yyyy, mm, dd] = dateString.split("-");
  return `${dd}/${mm}/${String(yyyy).slice(-2)}`;
}

function getJournalDate(){
  return state.journalDate || state.selectedDate || todayISO();
}
function setJournalDate(day, persist=true){
  state.journalDate = day || todayISO();
  updateJournalDateControl();
  if(persist) saveState();
}
function activeCashJournalTab(){
  const active = document.querySelector("#cashJournalDialog .cash-journal-tab.active");
  return active?.dataset?.journalTab || "settingsCashTab";
}
function isoWeekNumber(dateString){
  const d = new Date(dateString + "T12:00:00");
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}
function journalWeekSelectLabel(monday){
  const weekYear = new Date(addDaysISO(monday, 3) + "T12:00:00").getFullYear();
  const kw = String(isoWeekNumber(monday)).padStart(2,"0");
  const sunday = addDaysISO(monday, 6);
  return `KW ${kw} / ${weekYear} (${formatDateShort(monday)} - ${formatDateShort(sunday)})`;
}
function buildJournalWeekOptions(){
  const select = $("journalWeekSelect");
  if(!select) return;
  const currentYear = new Date(todayISO() + "T12:00:00").getFullYear();
  const base = getJournalDate();
  let currentValue = startOfWeekISO(base);
  let html = "";
  let monday = startOfWeekISO(`${currentYear}-01-04`);
  while(new Date(monday + "T12:00:00").getFullYear() <= currentYear || isoWeekNumber(monday) === 1){
    const weekYear = new Date(addDaysISO(monday, 3) + "T12:00:00").getFullYear();
    if(weekYear === currentYear){
      html += `<option value="${monday}">${journalWeekSelectLabel(monday)}</option>`;
    }
    monday = addDaysISO(monday, 7);
    if(html.length > 200000) break;
  }
  select.innerHTML = html;
  const hasCurrentValue = Array.from(select.options).some(option => option.value === currentValue);
  if(!hasCurrentValue){
    currentValue = startOfWeekISO(todayISO());
    state.journalDate = currentValue;
  }
  select.value = currentValue;
}
function journalMonthSelectLabel(monthStart){
  const d = new Date(monthStart + "T12:00:00");
  return d.toLocaleDateString("de-DE", {month:"long", year:"numeric"});
}
function buildJournalMonthOptions(){
  const select = $("journalMonthSelect");
  if(!select) return;
  const currentYear = new Date(todayISO() + "T12:00:00").getFullYear();
  const base = getJournalDate();
  let currentValue = startOfMonthISO(base);
  let html = "";
  for(let month = 1; month <= 12; month++){
    const value = `${currentYear}-${String(month).padStart(2,"0")}-01`;
    html += `<option value="${value}">${journalMonthSelectLabel(value)}</option>`;
  }
  select.innerHTML = html;
  const hasCurrentValue = Array.from(select.options).some(option => option.value === currentValue);
  if(!hasCurrentValue){
    currentValue = startOfMonthISO(todayISO());
    state.journalDate = currentValue;
  }
  select.value = currentValue;
}
function updateJournalDateControl(target = activeCashJournalTab()){
  const isWeek = target === "settingsWeeklyRevenueTab";
  const isMonth = target === "settingsMonthlyRevenueTab";
  $("journalDateControl")?.classList.toggle("hidden", isWeek || isMonth);
  $("journalWeekControl")?.classList.toggle("hidden", !isWeek);
  $("journalMonthControl")?.classList.toggle("hidden", !isMonth);
  if($("journalDateInput")) $("journalDateInput").value = getJournalDate();
  if(isWeek) buildJournalWeekOptions();
  if(isMonth) buildJournalMonthOptions();
}
function refreshCashJournalViews(){
  updateJournalDateControl();
  renderCashTab();
  renderEmployeeDailyRevenue();
  renderPeriodRevenue("week");
  renderPeriodRevenue("month");
  renderRevenue2();
}

function money(n){ return Number(n||0).toLocaleString("de-DE",{style:"currency",currency:"EUR"}); }
function statusClass(status){ return "status-" + String(status || "Gebucht").replace(/\s+/g,"-"); }
function isPedicureRefillService(name){
  return String(name || "").trim().toLowerCase() === "pediküre & auffüllen";
}
function isPedicureService(name){
  return String(name || "").trim().toLowerCase().includes("pediküre");
}
function appointmentClass(a){
  const isPedicureRefill = a && isPedicureRefillService(a.serviceName);
  const isPedicure = a && isPedicureService(a.serviceName);
  const isAnyPedicure = !!(a && a.employeeAny && isPedicure);
  const pedicureClass = isPedicureRefill ? " appointment-pedicure-refill" : isPedicure ? " appointment-pedicure" : "";
  const anyPedicureClass = isAnyPedicure ? " appointment-pedicure-any" : "";
  const shortClass = a && Number(a.duration || 0) <= 30 ? " appointment-short" : "";
  return `appointment ${statusClass(a && a.status)}${a && a.employeeAny ? " appointment-any-employee" : ""}${pedicureClass}${anyPedicureClass}${shortClass}`;
}
function slots(){ const out=[]; for(let m=timeToMinutes(state.openTime); m<timeToMinutes(state.closeTime); m+=getSlotIntervalMinutes()) out.push(minutesToTime(m)); return out; }


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

// Wenn die Studio-Öffnungszeiten geändert werden, sollen Mitarbeiter mit
// unveränderten Standard-Arbeitszeiten automatisch mitgehen. Sonst bleibt bei
// alten Installationen intern weiter "20:00" gespeichert und der Tagesplan
// zeigt ab 20 Uhr fälschlich "Gesperrt", obwohl das Studio z. B. bis 22 Uhr offen ist.
function syncDefaultEmployeeWorkTimesWithStudioHours(oldOpen="08:00", oldClose="20:00", newOpen=state?.openTime || "08:00", newClose=state?.closeTime || "20:00"){
  if(!Array.isArray(state?.employees)) return false;
  let changed = false;
  const validNewOpen = /^\d{2}:\d{2}$/.test(newOpen || "") ? newOpen : "08:00";
  const validNewClose = /^\d{2}:\d{2}$/.test(newClose || "") ? newClose : "20:00";
  const defaultStartCandidates = new Set(["", "08:00", oldOpen].filter(Boolean));
  const defaultEndCandidates = new Set(["", "20:00", oldClose].filter(Boolean));
  const updateDefaultRange = (obj) => {
    if(!obj) return;
    if(defaultStartCandidates.has(obj.start || obj.workStart || "")){
      if(Object.prototype.hasOwnProperty.call(obj, "start") && obj.start !== validNewOpen){ obj.start = validNewOpen; changed = true; }
      if(Object.prototype.hasOwnProperty.call(obj, "workStart") && obj.workStart !== validNewOpen){ obj.workStart = validNewOpen; changed = true; }
    }
    if(defaultEndCandidates.has(obj.end || obj.workEnd || "")){
      if(Object.prototype.hasOwnProperty.call(obj, "end") && obj.end !== validNewClose){ obj.end = validNewClose; changed = true; }
      if(Object.prototype.hasOwnProperty.call(obj, "workEnd") && obj.workEnd !== validNewClose){ obj.workEnd = validNewClose; changed = true; }
    }
  };
  state.employees.forEach((emp, index) => {
    emp.workSettings = normalizeEmployeeRecord(emp, index).workSettings;
    const w = emp.workSettings;

    // Wichtig: Der Tagesplan prüft nicht nur die Studio-Öffnungszeiten,
    // sondern auch die Arbeitszeiten jedes Mitarbeiters. Bei bestehenden
    // Installationen standen diese oft noch auf 20:00. Deshalb werden alle
    // Standard-Endzeiten 20:00 bzw. die vorherige Studio-Schließzeit auf die
    // neue Studio-Schließzeit mitgezogen. Individuelle Zeiten wie 18:00 oder
    // spezielle Sonder-Arbeitstage bleiben unverändert.
    updateDefaultRange(w);

    const weekly = normalizeWeeklyWork(w.weeklyWork);
    Object.keys(weekly.days || {}).forEach(dayKey => {
      const day = weekly.days[dayKey];
      if(day && day.enabled) updateDefaultRange(day);
    });
    w.weeklyWork = weekly;
  });
  return changed;
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
if(syncDefaultEmployeeWorkTimesWithStudioHours("08:00", "20:00", state.openTime, state.closeTime)){
  saveState();
}


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
function normalizeReportPrintFormat(format){
  return ["a4","thermal80","thermal58"].includes(format) ? format : "a4";
}
function normalizeScheduleIntervalMinutes(value){
  const minutes = Number(value);
  return [15,30].includes(minutes) ? minutes : 15;
}
function getSlotIntervalMinutes(){
  return normalizeScheduleIntervalMinutes(state?.scheduleIntervalMinutes || 15);
}
function saveReportPrintFormatFromSelect(){
  if(!$("reportPrintFormat")) return;
  state.reportPrintFormat = normalizeReportPrintFormat($("reportPrintFormat").value);
  saveState();
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
  const interval = normalizeScheduleIntervalMinutes(state.scheduleIntervalMinutes || 15);
  const names = {auto:t("deviceAuto"), iphone:"iPhone", ipad:"iPad", pc:"PC / Windows"};
  const zoomNames = {small:"Kompakt", normal:"Normal", large:"Groß"};
  el.textContent = `${t("activeLabel")}: ${setting === "auto" ? t("deviceAuto") + " → " + names[mode] : names[mode]} · ${t("scheduleLabel")}: ${zoomNames[zoom]} · ${interval} Min`;
}

function escapeHtml(str){ return String(str??"").replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
function reportFileDate(day = todayISO()){ return String(day || todayISO()).replace(/[^0-9-]/g,""); }
function reportNumber(n){ return Number(n || 0).toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2}); }
function reportTitleBase(){
  const name = (state.studioName || "Nagelstudio").trim();
  return name || "Nagelstudio";
}
function reportGeneratedAt(){
  return new Date().toLocaleString("de-DE",{dateStyle:"medium",timeStyle:"short"});
}
function reportTable(columns, rows){
  if(!rows.length) return `<p class="empty">${t("noEntries")}</p>`;
  return `<table><thead><tr>${columns.map(c=>`<th>${escapeHtml(c)}</th>`).join("")}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(cell=>`<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
function reportSummary(items){
  if(!items || !items.length) return "";
  return `<div class="summary-grid">${items.map(item=>`
    <div class="summary-item">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.value)}</strong>
    </div>`).join("")}</div>`;
}
function reportSection(title, content){
  return `<section class="report-section"><h2>${escapeHtml(title)}</h2>${content}</section>`;
}
function closeDialogBeforeReport(id){
  const dialog = $(id);
  if(dialog && dialog.open){
    try{ dialog.close(); }catch(err){ console.warn("Dialog konnte vor dem Druck nicht geschlossen werden", err); }
  }
}
function prepareMainWindowForReport(){
  closeDialogBeforeReport("cashJournalDialog");
  closeDialogBeforeReport("hiddenRevenueDialog");
}
function accountingReportStyles(format = "a4"){
  const printFormat = normalizeReportPrintFormat(format);
  const thermal = printFormat === "thermal80" || printFormat === "thermal58";
  const pageSize = printFormat === "thermal58" ? "58mm 297mm" : printFormat === "thermal80" ? "80mm 297mm" : "A4";
  const screenWidth = printFormat === "thermal58" ? "58mm" : printFormat === "thermal80" ? "80mm" : "1120px";
  const pageMargin = thermal ? "3mm" : "14mm";
  return `
    :root{color-scheme:light;}
    *{box-sizing:border-box;}
    body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;background:#f6f6f6;}
    .toolbar{position:sticky;top:0;z-index:10;display:flex;gap:10px;justify-content:flex-end;align-items:center;padding:12px 18px;background:#fff;border-bottom:1px solid #ddd;}
    .toolbar span{margin-right:auto;color:#555;font-weight:700;}
    button{border:0;border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer;background:#d94f93;color:#fff;}
    button.secondary{background:#eee;color:#222;}
    main{max-width:${screenWidth};margin:22px auto;padding:${thermal ? "8px 6px" : "28px"};background:#fff;border:1px solid #ddd;box-shadow:0 8px 30px rgba(0,0,0,.08);}
    header{display:flex;justify-content:space-between;gap:18px;border-bottom:3px solid #111;padding-bottom:18px;margin-bottom:20px;}
    h1{font-size:30px;margin:0 0 6px;}
    .meta{text-align:right;color:#444;font-size:13px;line-height:1.5;}
    .summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:18px 0 22px;}
    .summary-item{border:1px solid #ccc;padding:12px;border-radius:8px;background:#fafafa;}
    .summary-item span{display:block;color:#555;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;}
    .summary-item strong{display:block;margin-top:6px;font-size:21px;}
    .report-section{break-inside:avoid;margin-top:22px;}
    h2{font-size:18px;margin:0 0 10px;border-bottom:1px solid #ccc;padding-bottom:7px;}
    table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:10px;}
    th,td{border:1px solid #ccc;padding:8px 9px;text-align:left;vertical-align:top;}
    th{background:#f0f0f0;font-weight:900;}
    td.amount,th.amount{text-align:right;white-space:nowrap;}
    .empty{color:#666;border:1px dashed #bbb;padding:12px;border-radius:8px;background:#fafafa;}
    footer{margin-top:26px;color:#555;font-size:12px;border-top:1px solid #ddd;padding-top:10px;}
    ${thermal ? `
      body{background:#fff;}
      .toolbar{font-size:12px;flex-wrap:wrap;justify-content:flex-start;}
      .toolbar span{flex:1 0 100%;margin-right:0;}
      main{border:0;box-shadow:none;}
      header{display:block;border-bottom:1px solid #111;padding-bottom:8px;margin-bottom:8px;}
      h1{font-size:16px;line-height:1.15;}
      .meta{text-align:left;font-size:10px;margin-top:6px;}
      .summary-grid{display:block;margin:8px 0;}
      .summary-item{border:0;border-top:1px dashed #aaa;border-radius:0;padding:5px 0;background:#fff;}
      .summary-item span{font-size:9px;letter-spacing:0;text-transform:none;}
      .summary-item strong{font-size:14px;margin-top:2px;}
      .report-section{margin-top:10px;break-inside:auto;}
      h2{font-size:13px;border-bottom:1px dashed #999;padding-bottom:4px;margin-bottom:5px;}
      table{font-size:10px;table-layout:fixed;}
      th,td{border:0;border-bottom:1px dashed #ddd;padding:3px 2px;word-break:break-word;}
      th{background:#fff;font-weight:900;}
      footer{font-size:9px;margin-top:10px;padding-top:5px;border-top:1px dashed #aaa;}
    ` : ""}
    @media print{
      body{background:#fff;}
      .toolbar{display:none;}
      main{box-shadow:none;border:0;margin:0;max-width:none;padding:0;}
      @page{size:${pageSize};margin:${pageMargin};}
    }
  `;
}
function openAccountingReport(title, subtitle, summaryItems, sections, fileStem){
  const printFormat = normalizeReportPrintFormat(state.reportPrintFormat || "a4");
  const formatLabel = printFormat === "thermal80" ? "Thermodrucker 80 mm" : printFormat === "thermal58" ? "Thermodrucker 58 mm" : "A4 Standardpapier";
  prepareMainWindowForReport();
  const body = `
    <main>
      <header>
        <div>
          <h1>${escapeHtml(title)}</h1>
          <div>${escapeHtml(subtitle)}</div>
        </div>
        <div class="meta">
          <strong>${escapeHtml(reportTitleBase())}</strong><br>
          ${state.studioAddress ? `${escapeHtml(state.studioAddress)}<br>` : ""}
          ${state.studioPhone ? `Telefon: ${escapeHtml(state.studioPhone)}<br>` : ""}
          Erstellt: ${escapeHtml(reportGeneratedAt())}
        </div>
      </header>
      ${reportSummary(summaryItems)}
      ${sections.join("")}
      <footer>${escapeHtml(t("reportAutoFooter"))}</footer>
    </main>`;
  const excelDocument = `<!doctype html><html><head><meta charset="utf-8"><style>table{border-collapse:collapse}th,td{border:1px solid #999;padding:6px}th{background:#eee}.amount{text-align:right}</style></head><body>${body}</body></html>`;
  const reportDocument = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${accountingReportStyles(printFormat)}</style></head><body>
    <div class="toolbar">
      <span>${escapeHtml(formatLabel)} · ${escapeHtml(t("printPdfHint"))}</span>
      <button onclick="window.print()">${escapeHtml(t("printPdf"))}</button>
      <button class="secondary" id="excelBtn">${escapeHtml(t("excelDownload"))}</button>
      <button class="secondary" onclick="window.close()">${escapeHtml(t("close"))}</button>
    </div>
    ${body}
    <script>
      const excelHtml = ${JSON.stringify(excelDocument)};
      const filename = ${JSON.stringify(fileStem + ".xls")};
      document.getElementById("excelBtn").addEventListener("click", () => {
        const blob = new Blob(["\\ufeff" + excelHtml], {type:"application/vnd.ms-excel;charset=utf-8"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
      setTimeout(() => window.print(), 450);
    <\/script>
  </body></html>`;
  const win = window.open("", "_blank");
  if(!win){
    alert("Der Bericht konnte nicht geöffnet werden. Bitte Pop-up-Fenster für diese App erlauben.");
    return;
  }
  win.document.open();
  win.document.write(reportDocument);
  win.document.close();
}
function accountingRowsForEntries(records){
  return records.map(r => [
    escapeHtml(r.startTime || ""),
    escapeHtml(r.employeeName || t("withoutEmployee")),
    escapeHtml(r.customerName || t("customerFallback")),
    escapeHtml(r.serviceName || t("serviceFallback")),
    `<span class="amount">${money(r.price || 0)}</span>`
  ]);
}
function revenue2EmployeeTotalRows(records){
  const groups = {};
  records.forEach(r => {
    const key = r.employeeId || r.employeeName || "none";
    if(!groups[key]) groups[key] = {name:r.employeeName || t("withoutEmployee"), total:0};
    groups[key].total += revenue2EntryPrice(r);
  });
  return Object.values(groups)
    .sort((a,b)=>a.name.localeCompare(b.name))
    .map(group => [
      escapeHtml(group.name),
      `<span class="amount">${money(group.total)}</span>`
    ]);
}

function revenue2EmployeeDetailRows(records){
  return records.slice()
    .sort((a,b)=>String(a.employeeName||"").localeCompare(String(b.employeeName||"")) || String(a.customerName||"").localeCompare(String(b.customerName||"")) || String(a.startTime||"").localeCompare(String(b.startTime||"")))
    .map(r => [
      escapeHtml(r.employeeName || t("withoutEmployee")),
      escapeHtml(r.customerName || t("customerFallback")),
      `<span class="amount">${money(revenue2EntryPrice(r))}</span>`
    ]);
}

function employeeSummaryRowsForCashReport(records){
  const groups = {};
  records.forEach(r => {
    const key = r.employeeId || r.employeeName || "none";
    if(!groups[key]) groups[key] = {name:r.employeeName || t("withoutEmployee"), count:0, total:0};
    groups[key].count += 1;
    groups[key].total += Number(r.price || 0);
  });
  return Object.values(groups)
    .sort((a,b)=>a.name.localeCompare(b.name))
    .map(group => [
      escapeHtml(group.name),
      String(group.count),
      `<span class="amount">${money(group.total)}</span>`
    ]);
}

function employeePaidSummaryRowsForEmployeeReport(records){
  const groups = {};
  records.filter(r => r.status === "Erledigt").forEach(r => {
    const key = r.employeeId || r.employeeName || "none";
    if(!groups[key]) groups[key] = {name:r.employeeName || t("withoutEmployee"), total:0};
    groups[key].total += Number(r.price || 0);
  });
  return Object.values(groups)
    .sort((a,b)=>a.name.localeCompare(b.name))
    .map(group => [
      escapeHtml(group.name),
      `<span class="amount">${money(group.total)}</span>`
    ]);
}


function journalPeriodRange(type, base = getJournalDate()){
  if(type === "month"){
    return {from:startOfMonthISO(base), to:endOfMonthISO(base), label:reportRangeText(startOfMonthISO(base), endOfMonthISO(base), "month")};
  }
  const from = startOfWeekISO(base);
  const to = addDaysISO(from, 6);
  return {from, to, label:`${formatDateShort(from)} - ${formatDateShort(to)}`};
}
function journalDayDeleted(day){
  state.journalRevenueDeletedDays = state.journalRevenueDeletedDays || [];
  return state.journalRevenueDeletedDays.includes(day);
}
function journalDayRawTotal(day){
  ensureEmployeeDailyRevenueRecordsForDay(day);
  const appointmentTotal = employeeDailyRevenueRecordsForDay(day)
    .filter(r => r.status === "Erledigt")
    .reduce((sum,r)=>sum + Number(r.price || 0), 0);
  const manualTotal = (state.manualRevenueItems || [])
    .filter(x => x.date === day)
    .reduce((sum,x)=>sum + Number(x.amount || 0), 0);
  return appointmentTotal + manualTotal;
}
function journalDayCustomerCount(day){
  ensureEmployeeDailyRevenueRecordsForDay(day);
  return employeeDailyRevenueRecordsForDay(day).filter(r => r.status === "Erledigt").length;
}
function journalDayTotal(day){
  state.journalRevenueCorrections = state.journalRevenueCorrections || {};
  if(journalDayDeleted(day)) return 0;
  const corrected = state.journalRevenueCorrections[day];
  if(corrected !== undefined && corrected !== null && corrected !== "") return Number(corrected || 0);
  return journalDayRawTotal(day);
}
function journalDayHasManualTotal(day){
  state.journalRevenueCorrections = state.journalRevenueCorrections || {};
  const corrected = state.journalRevenueCorrections[day];
  return journalDayDeleted(day) || (corrected !== undefined && corrected !== null && corrected !== "");
}
function syncJournalViewsAfterDayChange(day){
  const activeDay = getJournalDate();
  if(day === activeDay){
    renderCashTab();
  }
  renderPeriodRevenue("week");
  renderPeriodRevenue("month");
}
function saveJournalDayCorrection(day){
  const input = document.querySelector(`input[data-journal-day-correction="${CSS.escape(day)}"]`);
  const value = Number(input?.value || 0);
  if(!Number.isFinite(value) || value < 0){
    alert(t("validAmountSingleAlert"));
    return;
  }
  state.journalRevenueCorrections = state.journalRevenueCorrections || {};
  state.journalRevenueDeletedDays = (state.journalRevenueDeletedDays || []).filter(d => d !== day);
  state.journalRevenueCorrections[day] = value;
  saveState();
  syncJournalViewsAfterDayChange(day);
}
function deleteJournalDayFromPeriod(day){
  if(!confirm(`Umsatz vom ${formatDateShort(day)} aus Wochen-/Monatsumsatz löschen?`)) return;
  state.journalRevenueDeletedDays = state.journalRevenueDeletedDays || [];
  if(!state.journalRevenueDeletedDays.includes(day)) state.journalRevenueDeletedDays.push(day);
  saveState();
  syncJournalViewsAfterDayChange(day);
}
function restoreJournalDayInPeriod(day){
  state.journalRevenueDeletedDays = (state.journalRevenueDeletedDays || []).filter(d => d !== day);
  saveState();
  syncJournalViewsAfterDayChange(day);
}
function renderPeriodRevenue(type){
  const isMonth = type === "month";
  const list = $(isMonth ? "monthlyRevenueList" : "weeklyRevenueList");
  if(!list) return;
  const range = journalPeriodRange(isMonth ? "month" : "week");
  const days = eachDayISO(range.from, range.to);
  const rows = days.map(day => {
    const corrected = state.journalRevenueCorrections?.[day];
    const deleted = journalDayDeleted(day);
    const total = journalDayTotal(day);
    const count = deleted ? 0 : journalDayCustomerCount(day);
    return {day, corrected, deleted, total, count};
  });
  const activeRows = rows.filter(r => !r.deleted && (r.total > 0 || r.count > 0 || r.corrected !== undefined));
  const displayRows = activeRows.length ? activeRows : rows;
  const total = rows.reduce((sum,r)=>sum + r.total, 0);
  const rangeEl = $(isMonth ? "monthlyRevenueRange" : "weeklyRevenueRange");
  const daysCountEl = $(isMonth ? "monthlyRevenueDaysCount" : "weeklyRevenueDaysCount");
  const totalEl = $(isMonth ? "monthlyRevenueTotal" : "weeklyRevenueTotal");
  if(rangeEl) rangeEl.textContent = range.label;
  if(daysCountEl) daysCountEl.textContent = String(activeRows.length);
  if(totalEl) totalEl.textContent = money(total);

  // Wochen Umsatz und Monat Umsatz sind reine Tagesumsatz-Übersichten.
  // Korrektur-, Speichern- und Löschen-Funktionen bleiben hier bewusst ausgeblendet,
  // damit die Synchronisierung aus Bezahlen/Kasse unverändert als Quelle dient.
  list.innerHTML = `
    <div class="period-revenue-table period-revenue-table-readonly">
      <div class="period-revenue-row period-revenue-row-readonly period-revenue-head">
        <span>${escapeHtml(t("date"))}</span><span>${escapeHtml(t("dailyRevenue"))}</span>
      </div>
      ${displayRows.map(r => `
        <div class="period-revenue-row period-revenue-row-readonly ${r.deleted ? 'period-revenue-deleted' : ''}">
          <strong>${formatDateShort(r.day)}</strong>
          <strong>${r.deleted ? escapeHtml(t("deletedStatus")) : money(r.total)}</strong>
        </div>`).join("")}
    </div>`;
}


let periodRevenueEditType = "week";

function periodRevenueEditKey(type){
  const range = journalPeriodRange(type === "month" ? "month" : "week");
  return `${range.from}_${range.to}`;
}
function periodRevenueBaseRows(type){
  const normalizedType = type === "month" ? "month" : "week";
  const range = journalPeriodRange(normalizedType);
  const rows = eachDayISO(range.from, range.to).map(day => {
    const corrected = state.journalRevenueCorrections?.[day];
    const deleted = journalDayDeleted(day);
    const total = journalDayTotal(day);
    const count = deleted ? 0 : journalDayCustomerCount(day);
    return {day, corrected, deleted, total, count};
  });
  return {range, rows};
}
function getPeriodRevenueManualMap(type){
  state.periodRevenueManualEdits = state.periodRevenueManualEdits || {week:{}, month:{}};
  state.periodRevenueManualEdits.week = state.periodRevenueManualEdits.week || {};
  state.periodRevenueManualEdits.month = state.periodRevenueManualEdits.month || {};
  const normalizedType = type === "month" ? "month" : "week";
  const key = periodRevenueEditKey(normalizedType);
  return state.periodRevenueManualEdits[normalizedType][key] || null;
}
function periodRevenueManualRows(type){
  const normalizedType = type === "month" ? "month" : "week";
  const {range, rows} = periodRevenueBaseRows(normalizedType);
  const manual = getPeriodRevenueManualMap(normalizedType);
  const values = manual && manual.values ? manual.values : {};
  const mergedRows = rows.map(r => {
    const manualValue = values[r.day];
    const hasManual = manualValue !== undefined && manualValue !== null && manualValue !== "";
    return {...r, manual: hasManual, editTotal: hasManual ? Number(manualValue || 0) : Number(r.total || 0)};
  });
  return {range, rows:mergedRows};
}
function renderPeriodRevenueManualEdit(){
  const type = periodRevenueEditType === "month" ? "month" : "week";
  const isMonth = type === "month";
  const {range, rows} = periodRevenueManualRows(type);
  const total = rows.reduce((sum,r)=>sum + Number(r.editTotal || 0), 0);
  if($("periodRevenueEditTitle")) $("periodRevenueEditTitle").textContent = isMonth ? t("monthEdit") : t("weekEdit");
  if($("periodRevenueEditRangeLabel")) $("periodRevenueEditRangeLabel").textContent = isMonth ? t("month") : t("week");
  if($("periodRevenueEditRange")) $("periodRevenueEditRange").textContent = range.label;
  if($("periodRevenueEditDays")) $("periodRevenueEditDays").textContent = String(rows.length);
  if($("periodRevenueEditTotal")) $("periodRevenueEditTotal").textContent = money(total);
  const list = $("periodRevenueEditList");
  if(!list) return;
  list.innerHTML = `
    <div class="period-revenue-edit-table">
      <div class="period-revenue-edit-row period-revenue-edit-head">
        <span>${escapeHtml(t("date"))}</span><span>${escapeHtml(t("dailyRevenue"))}</span><span>${escapeHtml(t("manualChange"))}</span>
      </div>
      ${rows.map(r => `
        <div class="period-revenue-edit-row">
          <strong>${formatDateShort(r.day)}</strong>
          <span>${r.deleted ? escapeHtml(t("deletedStatus")) : money(r.total)}</span>
          <input type="number" min="0" step="0.01" inputmode="decimal" value="${Number(r.editTotal || 0).toFixed(2)}" data-period-manual-day="${escapeHtml(r.day)}" aria-label="${escapeHtml(t("revenueWord"))} ${formatDateShort(r.day)}">
        </div>`).join("")}
    </div>`;
  list.querySelectorAll("input[data-period-manual-day]").forEach(input => {
    input.oninput = () => {
      const sum = Array.from(list.querySelectorAll("input[data-period-manual-day]")).reduce((acc, el) => acc + Number(el.value || 0), 0);
      if($("periodRevenueEditTotal")) $("periodRevenueEditTotal").textContent = money(sum);
    };
  });
}
function openPeriodRevenueEdit(type){
  periodRevenueEditType = type === "month" ? "month" : "week";
  renderPeriodRevenueManualEdit();
  const dialog = $("periodRevenueEditDialog");
  if(dialog) dialog.showModal();
}
function savePeriodRevenueManualEdit(){
  const type = periodRevenueEditType === "month" ? "month" : "week";
  const key = periodRevenueEditKey(type);
  const values = {};
  let valid = true;
  document.querySelectorAll("#periodRevenueEditList input[data-period-manual-day]").forEach(input => {
    const val = Number(input.value || 0);
    if(!Number.isFinite(val) || val < 0) valid = false;
    values[input.dataset.periodManualDay] = val;
  });
  if(!valid){ alert(t("validAmountAlert")); return; }
  state.periodRevenueManualEdits = state.periodRevenueManualEdits || {week:{}, month:{}};
  state.periodRevenueManualEdits[type] = state.periodRevenueManualEdits[type] || {};
  const {range} = periodRevenueBaseRows(type);
  state.periodRevenueManualEdits[type][key] = {range, values, updatedAt:new Date().toISOString()};
  saveState();
  renderPeriodRevenueManualEdit();
  alert(t("changeSaved"));
}
function resetPeriodRevenueManualEdit(){
  const type = periodRevenueEditType === "month" ? "month" : "week";
  if(!confirm(type === "month" ? t("resetMonthManualConfirm") : t("resetWeekManualConfirm"))) return;
  const key = periodRevenueEditKey(type);
  state.periodRevenueManualEdits = state.periodRevenueManualEdits || {week:{}, month:{}};
  state.periodRevenueManualEdits[type] = state.periodRevenueManualEdits[type] || {};
  delete state.periodRevenueManualEdits[type][key];
  saveState();
  renderPeriodRevenueManualEdit();
}
function printPeriodRevenueManualEdit(){
  const type = periodRevenueEditType === "month" ? "month" : "week";
  const isMonth = type === "month";
  const {range, rows} = periodRevenueManualRows(type);
  const total = rows.reduce((sum,r)=>sum + Number(r.editTotal || 0), 0);
  const tableRows = rows.map(r => [
    escapeHtml(formatDateShort(r.day)),
    `<span class="amount">${money(r.total)}</span>`,
    `<span class="amount">${money(r.editTotal)}</span>`
  ]);
  openAccountingReport(isMonth ? t("monthEdit") : t("weekEdit"), range.label, [
    {label: isMonth ? t("month") : t("week"), value: range.label},
    {label: t("days"), value: String(rows.length)},
    {label: t("totalRevenue"), value: money(total)}
  ], [
    reportSection(t("manualReport"), reportTable([t("date"), t("dailyRevenue"), t("manual")], tableRows))
  ]);
}


function periodRevenueReportRows(type){
  const isMonth = type === "month";
  const range = journalPeriodRange(isMonth ? "month" : "week");
  const rows = eachDayISO(range.from, range.to).map(day => {
    const corrected = state.journalRevenueCorrections?.[day];
    const deleted = journalDayDeleted(day);
    const total = journalDayTotal(day);
    const count = deleted ? 0 : journalDayCustomerCount(day);
    return {day, corrected, deleted, total, count};
  });
  return {range, rows};
}

function printPeriodRevenueReport(type){
  const isMonth = type === "month";
  renderPeriodRevenue(isMonth ? "month" : "week");
  const {range, rows} = periodRevenueReportRows(isMonth ? "month" : "week");
  const activeRows = rows.filter(r => !r.deleted && (r.total > 0 || r.count > 0 || r.corrected !== undefined));
  const total = rows.reduce((sum, r) => sum + Number(r.total || 0), 0);
  const dayCount = activeRows.length;
  const tableRows = activeRows.map(r => [
    escapeHtml(formatDateShort(r.day)),
    `<span class="amount">${money(r.total)}</span>`
  ]);
  openAccountingReport(isMonth ? t("monthlyRevenue") : t("weeklyRevenue"), range.label, [
    {label: isMonth ? t("month") : t("week"), value: range.label},
    {label: t("days"), value: String(dayCount)},
    {label: t("totalRevenue"), value: money(total)}
  ], [
    reportSection(t("dailyTotals"), reportTable([t("date"), t("totalRevenue")], tableRows))
  ], `${isMonth ? "monat_umsatz" : "wochen_umsatz"}_${reportFileDate(range.from)}_${reportFileDate(range.to)}`);
}

function printAccountingReport(type){
  const day = getJournalDate();
  ensureEmployeeDailyRevenueRecordsForDay(day);
  ensureRevenue2SnapshotsForDay(day);
  const employeeRecords = employeeDailyRevenueRecordsForDay(day).slice().sort((a,b)=>String(a.employeeName||"").localeCompare(String(b.employeeName||"")) || String(a.startTime||"").localeCompare(String(b.startTime||"")));
  if(type === "cash"){
    renderCashTab();
    const paid = employeeRecords.filter(r => r.status === "Erledigt");
    const deposits = cashDepositsForDay(day).slice().sort((a,b)=>String(a.createdAt||"").localeCompare(String(b.createdAt||"")));
    const withdrawals = cashWithdrawalsForDay(day).slice().sort((a,b)=>String(a.createdAt||"").localeCompare(String(b.createdAt||"")));
    const rawEmployeeTotal = paid.reduce((sum,r)=>sum+Number(r.price||0),0);
    const employeeTotal = journalDayTotal(day);
    const manualAdjustment = employeeTotal - rawEmployeeTotal;
    const depositTotal = deposits.reduce((sum,r)=>sum+Number(r.amount||0),0);
    const withdrawalTotal = withdrawals.reduce((sum,r)=>sum+Number(r.amount||0),0);
    const balance = employeeTotal + depositTotal - withdrawalTotal;
    const employeeRows = employeeSummaryRowsForCashReport(paid);
    if(journalDayHasManualTotal(day)){
      employeeRows.push([`${t("weeklyRevenue")} / ${t("monthlyRevenue")}`, journalDayDeleted(day) ? t("deletedDay") : t("correction"), `<span class="amount">${money(manualAdjustment)}</span>`]);
    }
    openAccountingReport(t("cashReport"), `${t("date")}: ${formatDateShort(day)}`, [
      {label:t("totalRevenue"), value:money(employeeTotal)},
      {label:t("deposits"), value:money(depositTotal)},
      {label:t("withdrawals"), value:money(withdrawalTotal)},
      {label:t("cashBalance"), value:money(balance)}
    ], [
      reportSection(t("employeeRevenueSection"), reportTable([t("employee"),t("employeeCount"),t("sum")], employeeRows)),
      reportSection(t("cashDepositsReport"), reportTable([t("description"),t("labelAmount")], deposits.map(x=>[escapeHtml(x.reason||t("deposits")), `<span class="amount">${money(x.amount||0)}</span>`]))),
      reportSection(t("cashWithdrawalsReport"), reportTable([t("description"),t("labelAmount")], withdrawals.map(x=>[escapeHtml(x.reason||t("withdrawals")), `<span class="amount">${money(x.amount||0)}</span>`])))
    ], `kassenbericht_${reportFileDate(day)}`);
    return;
  }
  if(type === "employee"){
    renderEmployeeDailyRevenue();
    const paidTotal = employeeRecords.filter(r=>r.status==="Erledigt").reduce((sum,r)=>sum+Number(r.price||0),0);
    const openTotal = employeeRecords.filter(r=>(r.status||"Gebucht")==="Gebucht").reduce((sum,r)=>sum+Number(r.price||0),0);
    const noShowCount = employeeRecords.filter(r=>r.status==="Nicht erschienen").length;
    openAccountingReport(t("employeeRevenue"), `${t("date")}: ${formatDateShort(day)}`, [
      {label:t("sumPaid"), value:money(paidTotal)},
      {label:t("openAmount"), value:money(openTotal)},
      {label:t("noShowStatus"), value:String(noShowCount)},
      {label:t("customersTotal"), value:String(employeeRecords.length)}
    ], [
      reportSection(t("allCustomersByEmployee"), reportTable([t("employee"),t("timeShort"),t("customerFallback"),t("service"),t("status"),t("labelAmount")], employeeRecords.map(r=>[
        escapeHtml(r.employeeName||t("withoutEmployee")),
        escapeHtml(r.startTime||""),
        escapeHtml(r.customerName||t("customerFallback")),
        escapeHtml(r.serviceName||t("serviceFallback")),
        escapeHtml(employeeDailyRevenueStatusLabel(r.status||"Gebucht")),
        `<span class="amount">${money(r.price||0)}</span>`
      ]))),
      reportSection(t("totalSingleEmployees"), reportTable([t("employee"),t("sumPaid")], employeePaidSummaryRowsForEmployeeReport(employeeRecords)))
    ], `mitarbeiter_umsatz_${reportFileDate(day)}`);
    return;
  }
  renderRevenue2();
  const employeeEntries = revenue2Sorted(revenue2EntriesForDay(day));
  openAccountingReport(t("income"), `${t("date")}: ${formatDateShort(day)}`, [], [
    reportSection(t("employeeIncome"), reportTable([t("employee"),t("sum")], revenue2EmployeeTotalRows(employeeEntries))),
    reportSection(t("employeeIncomeDetails"), reportTable([t("employee"),t("customerFallback"),t("labelAmount")], revenue2EmployeeDetailRows(employeeEntries)))
  ], `einnahme_${reportFileDate(day)}`);
}

async function boot(){
  try{
    const currentDateInput = $("currentDateInput");
    if(currentDateInput) currentDateInput.value = state.selectedDate || todayISO();

    bindLicenseEvents();

    if(typeof startCurrentTimeTicker === "function") startCurrentTimeTicker();

    window.addEventListener("resize", () => {
      try{
        if((state.displayDeviceMode || "auto") === "auto"){
          applyDeviceView();
          renderCalendar();
        }
      }catch(err){
        console.error("Fehler beim Aktualisieren der Ansicht:", err);
      }
    });

    await verifyLicenseAndContinue();

    try{
      bindEvents();
    }catch(err){
      console.error("Fehler beim Verbinden der App-Buttons:", err);
      showStartupError(err);
    }
  }catch(err){
    console.error("Startfehler:", err);
    showStartupError(err);
  }
}

function showStartupError(err){
  const message = err && err.message ? err.message : "Unbekannter Fehler";
  showLicenseScreen({
    valid:false,
    reason:`Die App konnte nicht starten: ${message}`,
    studioId:getStoredStudioId(),
  }, "blocked");
}
function showSetup(){ hideLicenseScreen(); $("setupScreen").classList.remove("hidden"); $("mainScreen").classList.add("hidden"); }
function showMain(){ hideLicenseScreen(); $("setupScreen").classList.add("hidden"); $("mainScreen").classList.remove("hidden"); renderAll(); setTimeout(() => scrollCalendarToCurrentTime({smooth:false}), 50); }

function bindEvents(){
  $("finishSetupBtn").onclick = () => {
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
  $("customerSearchInput").oninput = () => { renderCustomerSearch(); scheduleDashboardReturnToTodayNow(); };
  $("customerName").oninput = renderCustomerNameSuggestions;
  $("customerName").onchange = applyExactCustomer;
  bindDashboardReturnCancelOnAppointmentInput();
  $("dashboardReturnDelayMs") && ($("dashboardReturnDelayMs").onchange = updateDashboardReturnCustomVisibility);
  $("customerPhonePrefix") && ($("customerPhonePrefix").onchange = () => { $("customerPhoneNumber") && $("customerPhoneNumber").focus(); });
  $("currentDateInput").onchange = e => { state.selectedDate=e.target.value; saveState(); renderCalendar(); renderReport(); if(state.selectedDate===todayISO()) setTimeout(() => scrollCalendarToCurrentTime({smooth:true}), 50); };
  $("todayBtn").onclick = () => { state.selectedDate=todayISO(); $("currentDateInput").value=state.selectedDate; saveState(); switchTab("calendarTab"); renderCalendar(); renderReport(); setTimeout(() => scrollCalendarToCurrentTime({smooth:true}), 50); };
  $("prevDayBtn").onclick = () => shiftDay(-1);
  $("nextDayBtn").onclick = () => shiftDay(1);
  $("settingsBtn").onclick = openSettings;
  document.querySelectorAll(".settings-tab").forEach(btn => btn.onclick = () => switchSettingsTab(btn.dataset.settingsTab));
  document.querySelectorAll(".cash-journal-tab").forEach(btn => btn.onclick = () => switchCashJournalTab(btn.dataset.journalTab));
  const openHiddenRevenue = () => { $("toggleRevenueFeature") && ($("toggleRevenueFeature").checked = !!state.revenueEnabled); if($("revenueEditDate")) $("revenueEditDate").value = state.selectedDate || todayISO(); renderRevenueEditor(); $("hiddenRevenueDialog") && $("hiddenRevenueDialog").showModal(); };
  $("hiddenRevenueOpenBtn") && ($("hiddenRevenueOpenBtn").onclick = openHiddenRevenue);
  $("hiddenRevenueFooterBtn") && ($("hiddenRevenueFooterBtn").onclick = openHiddenRevenue);
  $("footerRevenue2TabBtn") && ($("footerRevenue2TabBtn").onclick = openRevenue2FromFooter);
  $("footerWeeklyEditBtn") && ($("footerWeeklyEditBtn").onclick = () => openPeriodRevenueEdit("week"));
  $("footerMonthlyEditBtn") && ($("footerMonthlyEditBtn").onclick = () => openPeriodRevenueEdit("month"));
  $("periodRevenueEditCloseBtn") && ($("periodRevenueEditCloseBtn").onclick = () => $("periodRevenueEditDialog").close());
  $("periodRevenueEditSaveBtn") && ($("periodRevenueEditSaveBtn").onclick = savePeriodRevenueManualEdit);
  $("periodRevenueEditResetBtn") && ($("periodRevenueEditResetBtn").onclick = resetPeriodRevenueManualEdit);
  $("periodRevenueEditPrintBtn") && ($("periodRevenueEditPrintBtn").onclick = printPeriodRevenueManualEdit);
  $("printCashReportBtn") && ($("printCashReportBtn").onclick = () => printAccountingReport("cash"));
  $("printWeeklyRevenueReportBtn") && ($("printWeeklyRevenueReportBtn").onclick = () => printPeriodRevenueReport("week"));
  $("printMonthlyRevenueReportBtn") && ($("printMonthlyRevenueReportBtn").onclick = () => printPeriodRevenueReport("month"));
  $("addCashWithdrawalBtn") && ($("addCashWithdrawalBtn").onclick = addCashWithdrawal);
  $("addCashDepositBtn") && ($("addCashDepositBtn").onclick = addCashDeposit);
  $("journalDateInput") && ($("journalDateInput").onchange = () => { setJournalDate($("journalDateInput").value || todayISO()); refreshCashJournalViews(); });
  $("journalWeekSelect") && ($("journalWeekSelect").onchange = () => { setJournalDate($("journalWeekSelect").value || startOfWeekISO(todayISO())); refreshCashJournalViews(); });
  $("journalMonthSelect") && ($("journalMonthSelect").onchange = () => { setJournalDate($("journalMonthSelect").value || startOfMonthISO(todayISO())); refreshCashJournalViews(); });
  $("closeHiddenRevenueBtn") && ($("closeHiddenRevenueBtn").onclick = () => $("hiddenRevenueDialog").close());
  $("revenueEditDate") && ($("revenueEditDate").onchange = renderRevenueEditor);
  $("addManualRevenueBtn") && ($("addManualRevenueBtn").onclick = addManualRevenueItem);
  $("revenueIncludeDayBtn") && ($("revenueIncludeDayBtn").onclick = () => setRevenueDayExcluded(false));
  $("revenueExcludeDayBtn") && ($("revenueExcludeDayBtn").onclick = () => setRevenueDayExcluded(true));
  $("cloudBackupNowBtn") && ($("cloudBackupNowBtn").onclick = cloudBackupNow);
  $("cloudBackupProvider") && ($("cloudBackupProvider").onchange = saveCloudBackupSettings);
  $("cloudBackupEnabled") && ($("cloudBackupEnabled").onchange = saveCloudBackupSettings);
  $("dashboardPaymentBtn") && ($("dashboardPaymentBtn").onclick = openPaymentSystem);
  $("dashboardCashJournalBtn") && ($("dashboardCashJournalBtn").onclick = openCashJournal);
  $("languageSelect") && ($("languageSelect").onchange = () => { state.language = $("languageSelect").value; saveState(); renderAll(); updateCleanupPreview(); renderPaymentSystem(); renderPeriodRevenue("week"); renderPeriodRevenue("month"); if($("periodRevenueEditDialog")?.open) renderPeriodRevenueManualEdit(); renderRevenue2(); applyLanguage(); });
  $("closeSettingsBtn") && ($("closeSettingsBtn").onclick = closeSettingsWithSave);
  $("closePaymentBtn") && ($("closePaymentBtn").onclick = () => $("paymentDialog").close());
  $("paymentSearchInput") && ($("paymentSearchInput").oninput = renderPaymentSystem);
  $("paymentAppointmentSelect") && ($("paymentAppointmentSelect").onchange = paymentLoadAppointment);
  $("paymentClearCartBtn") && ($("paymentClearCartBtn").onclick = paymentClearCart);
  $("paymentDiscountInput") && ($("paymentDiscountInput").oninput = renderPaymentCart);
  $("paymentTipInput") && ($("paymentTipInput").oninput = renderPaymentCart);
  $("paymentCompleteBtn") && ($("paymentCompleteBtn").onclick = completePaymentSale);
  document.querySelectorAll(".payment-method").forEach(btn => btn.onclick = () => setPaymentMethod(btn.dataset.paymentMethod));
  $("closeCashJournalBtn") && ($("closeCashJournalBtn").onclick = () => $("cashJournalDialog").close());
  $("saveSettingsBtn") && ($("saveSettingsBtn").onclick = saveSettings);
  $("addServiceBtn").onclick = addService;
  $("saveEmployeeBtn").onclick = saveEmployeeFromSettings;
  $("saveCustomerBtn").onclick = saveCustomerFromSettings;
  $("cancelCustomerEditBtn").onclick = cancelCustomerEdit;
  $("cancelEmployeeEditBtn").onclick = cancelEmployeeEdit;
  $("closeAppointmentBtn").onclick = () => $("appointmentDialog").close();
  $("deleteAppointmentBtn").onclick = deleteSelectedAppointment;
  $("editAppointmentBtn").onclick = editSelectedAppointment;
  $("completeAppointmentBtn").onclick = paySelectedAppointment;
  $("noShowAppointmentBtn") && ($("noShowAppointmentBtn").onclick = noShowSelectedAppointment);
  $("exportBtn") && ($("exportBtn").onclick = exportBackup);
  $("settingsBackupBtn") && ($("settingsBackupBtn").onclick = exportBackup);
  $("importInput") && ($("importInput").onchange = importBackup);
  $("settingsImportInput") && ($("settingsImportInput").onchange = importBackup);
  $("cleanupPastAndBackupBtn") && ($("cleanupPastAndBackupBtn").onclick = cleanupPastCompletedAndBackup);
  $("systemCleanBtn") && ($("systemCleanBtn").onclick = systemCleanAllRevenueAndAppointments);
  $("cloudBackupProvider") && ($("cloudBackupProvider").onchange = saveCloudBackupSettings);
  $("cloudBackupEnabled") && ($("cloudBackupEnabled").onchange = saveCloudBackupSettings);
  $("cloudBackupAfterCleanup") && ($("cloudBackupAfterCleanup").onchange = saveCloudBackupSettings);
  $("refreshReportBtn").onclick = renderReport;
  $("printEmployeeDailyRevenueReportBtn") && ($("printEmployeeDailyRevenueReportBtn").onclick = () => printAccountingReport("employee"));
  $("printRevenue2ReportBtn") && ($("printRevenue2ReportBtn").onclick = () => printAccountingReport("revenue2"));
  $("reportDate") && ($("reportDate").onchange = () => { state.selectedDate = $("reportDate").value || state.selectedDate; $("currentDateInput").value = state.selectedDate; saveState(); renderReport(); });
  document.querySelectorAll(".report-mode").forEach(btn => btn.onclick = () => setReportMode(btn.dataset.reportMode));
  $("deleteWholeDayBtn").onclick = deleteWholeDayAppointments;
  $("toggleRevenueFeature") && ($("toggleRevenueFeature").onchange = () => { state.revenueEnabled = $("toggleRevenueFeature").checked; saveState(); applyRevenueVisibility(); renderReport(); });
  $("displayDeviceMode") && ($("displayDeviceMode").onchange = () => { state.displayDeviceMode = normalizeDisplayDeviceMode($("displayDeviceMode").value); saveState(); applyDeviceView(); renderCalendar(); });
  $("scheduleZoom") && ($("scheduleZoom").onchange = () => { state.scheduleZoom = normalizeScheduleZoom($("scheduleZoom").value); saveState(); applyDeviceView(); renderCalendar(); });
  $("scheduleIntervalMinutes") && ($("scheduleIntervalMinutes").onchange = () => { state.scheduleIntervalMinutes = normalizeScheduleIntervalMinutes($("scheduleIntervalMinutes").value); saveState(); renderStartTimeOptions(); renderCalendar(); });
  if($("reportPrintFormat")){
    $("reportPrintFormat").onchange = saveReportPrintFormatFromSelect;
    $("reportPrintFormat").oninput = saveReportPrintFormatFromSelect;
  }
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
  const settingsDialog = $("settingsDialog");
  if(settingsDialog) settingsDialog.classList.toggle("backup-tab-active", target === "settingsBackupTab");
  if(target === "settingsCashTab") renderCashTab();
  if(target === "settingsEmployeeDailyRevenueTab") renderEmployeeDailyRevenue();
  if(target === "settingsWeeklyRevenueTab") renderPeriodRevenue("week");
  if(target === "settingsMonthlyRevenueTab") renderPeriodRevenue("month");
  if(target === "settingsRevenue2Tab") renderRevenue2();
}

function openRevenue2FromFooter(){
  const cashJournalDialog = $("cashJournalDialog");
  setJournalDate(getJournalDate(), false);
  switchCashJournalTab("settingsRevenue2Tab");
  if(cashJournalDialog && !cashJournalDialog.open) cashJournalDialog.showModal();
}

function openCashJournal(){
  // Kasse / Mitarbeiter-Umsatz sollen beim Öffnen immer mit dem heutigen Datum starten.
  setJournalDate(todayISO(), false);
  switchCashJournalTab("settingsCashTab");
  $("cashJournalDialog") && $("cashJournalDialog").showModal();
}


let paymentCart = [];
let paymentMethod = "Bar";

function openPaymentSystem(options = {}){
  if(!options.keepCart) paymentCart = [];
  paymentMethod = "Bar";
  if($("paymentDiscountInput")) $("paymentDiscountInput").value = "0";
  if($("paymentTipInput")) $("paymentTipInput").value = "0";
  setPaymentMethod("Bar");
  renderPaymentSystem();
  $("paymentDialog") && $("paymentDialog").showModal();
}

function setPaymentMethod(method){
  paymentMethod = method || "Bar";
  document.querySelectorAll(".payment-method").forEach(btn=>btn.classList.toggle("active", btn.dataset.paymentMethod === paymentMethod));
}

function localizedPaymentMethod(method){
  if(method === "Bar") return t("cashPayment");
  if(method === "Karte") return t("cardPayment");
  if(method === "Gutschein") return t("voucherPayment");
  return method || "";
}

function renderPaymentSystem(){
  renderPaymentAppointments();
  renderPaymentServices();
  renderPaymentCart();
}

function renderPaymentAppointments(){
  const select = $("paymentAppointmentSelect");
  if(!select) return;
  const day = state.selectedDate || todayISO();
  const apps = (state.appointments || [])
    .filter(a => a.date === day && a.status !== "Nicht erschienen")
    .sort((a,b)=>(a.startTime || "").localeCompare(b.startTime || ""));
  select.innerHTML = `<option value="">${escapeHtml(t("noAppointmentFreeSale"))}</option>` + apps.map(a=>{
    const paid = a.status === "Erledigt" ? " ✓" : "";
    return `<option value="${escapeHtml(a.id)}">${escapeHtml(a.startTime || "")} · ${escapeHtml(a.customerName || t("customerFallback"))} · ${escapeHtml(a.serviceName || t("serviceFallback"))} · ${money(a.price || 0)}${paid}</option>`;
  }).join("");
}

function renderPaymentServices(){
  const grid = $("paymentServiceGrid");
  if(!grid) return;
  const q = ($("paymentSearchInput")?.value || "").trim().toLowerCase();
  const services = (state.services || []).filter(s => !q || String(s.name || "").toLowerCase().includes(q));
  grid.innerHTML = services.length ? services.map(s=>`
    <button type="button" class="payment-service-card" data-payment-service="${escapeHtml(s.id)}">
      <strong>${escapeHtml(s.name || t("serviceFallback"))}</strong>
      <span>${money(s.price || 0)}</span>
      <small>${Number(s.duration || 0)} Min</small>
    </button>`).join("") : `<p class="hint">${escapeHtml(t("noServiceFound"))}</p>`;
  grid.querySelectorAll("[data-payment-service]").forEach(btn=>btn.onclick=()=>{
    const service = (state.services || []).find(s=>s.id === btn.dataset.paymentService);
    if(service) addPaymentCartItem(service.name, Number(service.price || 0), service.id);
  });
}

function paymentLoadAppointment(){
  const id = $("paymentAppointmentSelect")?.value;
  if(!id) return;
  const a = (state.appointments || []).find(x=>x.id === id);
  if(!a) return;
  const matchedService = (state.services || []).find(s => String(s.name || "").trim().toLowerCase() === String(a.serviceName || "").trim().toLowerCase());
  const appointmentPrice = Number(a.price || 0) || Number(matchedService?.price || 0);
  paymentCart = [{id: uid(), sourceAppointmentId: a.id, serviceId: matchedService?.id, title: a.serviceName || matchedService?.name || t("appointment"), qty: 1, price: appointmentPrice}];
  renderPaymentCart();
}

function addPaymentCartItem(title, price, serviceId){
  const existing = paymentCart.find(x=>x.serviceId === serviceId && !x.sourceAppointmentId);
  if(existing) existing.qty += 1;
  else paymentCart.push({id: uid(), serviceId, title: title || t("serviceFallback"), qty: 1, price: Number(price || 0)});
  renderPaymentCart();
}

function paymentClearCart(){
  paymentCart = [];
  if($("paymentAppointmentSelect")) $("paymentAppointmentSelect").value = "";
  if($("paymentDiscountInput")) $("paymentDiscountInput").value = "0";
  if($("paymentTipInput")) $("paymentTipInput").value = "0";
  renderPaymentCart();
}

function paymentTotals(){
  const subtotal = paymentCart.reduce((sum,item)=>sum + Number(item.price || 0) * Number(item.qty || 1), 0);
  const discount = Math.max(0, Number($("paymentDiscountInput")?.value || 0));
  const tip = Math.max(0, Number($("paymentTipInput")?.value || 0));
  return {subtotal, discount, tip, total: Math.max(0, subtotal - discount + tip)};
}

function renderPaymentCart(){
  const list = $("paymentCartList");
  if(!list) return;
  list.innerHTML = paymentCart.length ? paymentCart.map(item=>`
    <div class="payment-cart-item">
      <div class="payment-cart-info">
        <strong>${escapeHtml(item.title)}</strong>
        <label class="payment-price-edit">${escapeHtml(t("amountEuro"))}
          <input type="number" min="0" step="0.01" value="${Number(item.price || 0)}" data-payment-price="${escapeHtml(item.id)}">
        </label>
        <small>${money(item.price)} × ${Number(item.qty || 1)}</small>
      </div>
      <div class="payment-cart-actions">
        <button type="button" data-payment-minus="${escapeHtml(item.id)}">−</button>
        <span>${Number(item.qty || 1)}</span>
        <button type="button" data-payment-plus="${escapeHtml(item.id)}">+</button>
        <button type="button" data-payment-remove="${escapeHtml(item.id)}">×</button>
      </div>
    </div>`).join("") : `<p class="hint">${escapeHtml(t("emptyCart"))}</p>`;
  list.querySelectorAll("[data-payment-price]").forEach(input=>input.oninput=()=>updatePaymentItemPrice(input.dataset.paymentPrice, input.value));
  list.querySelectorAll("[data-payment-minus]").forEach(btn=>btn.onclick=()=>changePaymentQty(btn.dataset.paymentMinus, -1));
  list.querySelectorAll("[data-payment-plus]").forEach(btn=>btn.onclick=()=>changePaymentQty(btn.dataset.paymentPlus, 1));
  list.querySelectorAll("[data-payment-remove]").forEach(btn=>btn.onclick=()=>{ paymentCart = paymentCart.filter(x=>x.id !== btn.dataset.paymentRemove); renderPaymentCart(); });
  const totals = paymentTotals();
  if($("paymentSubtotal")) $("paymentSubtotal").textContent = money(totals.subtotal);
  if($("paymentTotal")) $("paymentTotal").textContent = money(totals.total);
}

function updatePaymentItemPrice(id, value){
  const item = paymentCart.find(x=>x.id === id);
  if(!item) return;
  item.price = Math.max(0, Number(String(value).replace(",", ".") || 0));
  const totals = paymentTotals();
  if($("paymentSubtotal")) $("paymentSubtotal").textContent = money(totals.subtotal);
  if($("paymentTotal")) $("paymentTotal").textContent = money(totals.total);
}

function changePaymentQty(id, delta){
  const item = paymentCart.find(x=>x.id === id);
  if(!item) return;
  item.qty = Math.max(1, Number(item.qty || 1) + delta);
  renderPaymentCart();
}

function paymentSaleDateFromCart(){
  const appointmentItem = paymentCart.find(item => item.sourceAppointmentId);
  if(appointmentItem){
    const appointment = (state.appointments || []).find(a => a.id === appointmentItem.sourceAppointmentId);
    if(appointment?.date) return appointment.date;
  }
  // Freie Bar-/Kartenverkäufe aus „Bezahlen“ gehören in die heutige Kasse.
  return todayISO();
}

function showPaymentNotice(message, options = {}){
  const type = options.type || "success";
  let note = document.getElementById("paymentSuccessNotice");
  if(!note){
    note = document.createElement("div");
    note.id = "paymentSuccessNotice";
    note.setAttribute("role", "status");
    note.style.position = "fixed";
    note.style.left = "50%";
    note.style.top = "22px";
    note.style.transform = "translateX(-50%)";
    note.style.zIndex = "20000";
    note.style.borderRadius = "18px";
    note.style.padding = "16px 22px";
    note.style.fontWeight = "900";
    note.style.boxShadow = "0 18px 40px rgba(0,0,0,.22)";
    note.style.maxWidth = "min(92vw, 620px)";
    note.style.textAlign = "center";
    note.style.pointerEvents = "none";
    document.body.appendChild(note);
  }
  if(type === "success"){
    note.style.background = "#f0fff4";
    note.style.border = "3px solid #2fb344";
    note.style.color = "#166534";
  }else{
    note.style.background = "#fff7ed";
    note.style.border = "3px solid #f97316";
    note.style.color = "#9a3412";
  }
  note.textContent = message || "";
  note.style.display = "block";
  clearTimeout(showPaymentNotice.timer);
  showPaymentNotice.timer = setTimeout(() => { if(note) note.style.display = "none"; }, options.duration || 3000);
}

function completePaymentSale(){
  if(!paymentCart.length){ showPaymentNotice(t("selectServiceOrAppointmentFirst"), {type:"warning", duration:3000}); return; }
  const totals = paymentTotals();
  const sale = {id: uid(), date: paymentSaleDateFromCart(), createdAt: new Date().toISOString(), method: paymentMethod, items: paymentCart.map(x=>({...x})), subtotal: totals.subtotal, discount: totals.discount, tip: totals.tip, total: totals.total};
  state.paymentSales = state.paymentSales || [];
  state.paymentSales.push(sale);

  // Verknüpfung Bezahlen -> Kasse/Umsatz:
  // Beim Abschluss werden verknüpfte Termine als bezahlt markiert und der tatsächlich kassierte Betrag
  // direkt in den Mitarbeiter-Umsatz/Kasse-Datensatz übernommen. Dadurch erscheint der Umsatz sofort in „Kasse“.
  const touchedDays = new Set([sale.date]);
  paymentCart.forEach(item=>{
    if(item.sourceAppointmentId){
      const paidAmount = Number(item.price || 0) * Number(item.qty || 1);
      const a = (state.appointments || []).find(x=>x.id === item.sourceAppointmentId);
      if(a){
        a.status = "Erledigt";
        a.price = paidAmount;
        touchedDays.add(a.date || sale.date);
      }
      ensureEmployeeDailyRevenueRecordsForDay(a?.date || sale.date);
      const record = employeeDailyRevenueRecordByAppointmentId(item.sourceAppointmentId);
      if(record){
        record.status = "Erledigt";
        record.price = paidAmount;
        record.originalServicePrice = paidAmount;
        record.serviceName = item.title || record.serviceName || "Leistung";
        record.updatedAt = new Date().toISOString();
      }
    }
  });

  const appointmentAmount = paymentCart
    .filter(item => item.sourceAppointmentId)
    .reduce((sum,item)=>sum + Number(item.price || 0) * Number(item.qty || 1), 0);
  const manualAmount = totals.total - appointmentAmount;
  if(Math.abs(manualAmount) > 0.001){
    state.manualRevenueItems = state.manualRevenueItems || [];
    const productNote = sale.items.filter(x=>!x.sourceAppointmentId).map(x=>`${x.title} x${x.qty}`).join(", ");
    state.manualRevenueItems.push({
      id: uid(),
      date: sale.date,
      title: `${t("paymentTitlePlain")} ${localizedPaymentMethod(paymentMethod)}`,
      label: `${t("paymentTitlePlain")} ${localizedPaymentMethod(paymentMethod)}`,
      note: productNote || t("discountTipCorrection"),
      amount: manualAmount,
      paymentSaleId: sale.id
    });
  }

  saveState();
  touchedDays.forEach(day => ensureEmployeeDailyRevenueRecordsForDay(day));
  // Wenn Kasse/Mitarbeiter-Umsatz geöffnet ist, direkt auf den Verkaufstag stellen,
  // damit „Bezahlen“ sofort sichtbar synchronisiert ist.
  if($("cashJournalDialog")?.open){
    setJournalDate(sale.date, false);
  }
  renderAll();
  renderCashTab();
  renderEmployeeDailyRevenue();
  renderReport();
  paymentClearCart();
  showPaymentNotice(t("paymentSavedToCash"), {type:"success", duration:3000});
  scheduleDashboardReturnToTodayNow();
}

function switchCashJournalTab(id){
  const target = id || "settingsCashTab";
  const dialog = $("cashJournalDialog");
  if(!dialog) return;
  updateJournalDateControl(target);
  dialog.querySelectorAll(".cash-journal-tab").forEach(btn=>{
    btn.classList.toggle("active", btn.dataset.journalTab === target);
  });
  dialog.querySelectorAll(".settings-tab-panel").forEach(panel=>{
    panel.classList.toggle("active", panel.id === target);
  });
  dialog.classList.toggle("employee-revenue-tab-active", target === "settingsEmployeeDailyRevenueTab");
  dialog.classList.toggle("weekly-revenue-tab-active", target === "settingsWeeklyRevenueTab");
  dialog.classList.toggle("monthly-revenue-tab-active", target === "settingsMonthlyRevenueTab");
  if(target === "settingsCashTab") renderCashTab();
  if(target === "settingsEmployeeDailyRevenueTab") renderEmployeeDailyRevenue();
  if(target === "settingsWeeklyRevenueTab") renderPeriodRevenue("week");
  if(target === "settingsMonthlyRevenueTab") renderPeriodRevenue("month");
  if(target === "settingsRevenue2Tab") renderRevenue2();
}

function shiftDay(n){
  const d=new Date(state.selectedDate+"T12:00:00"); d.setDate(d.getDate()+n);
  state.selectedDate=d.toISOString().slice(0,10); $("currentDateInput").value=state.selectedDate; saveState(); renderCalendar(); renderReport(); if(state.selectedDate===todayISO()) setTimeout(() => scrollCalendarToCurrentTime({smooth:true}), 50);
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
  initialSetup:"Ersteinrichtung", setupHint:"Die App läuft lokal auf diesem Gerät. Cloud-Backup nutzt aktuell Export oder Teilen-Menü.", opensAt:"Öffnet um", closesAt:"Schließt um", initialEmployees:"Erste Mitarbeiter, getrennt mit Komma", startApp:"App starten", dailySchedule:"Tagesplan", revenueReport:"Umsatzbericht", from:"Von", to:"Bis", refreshReport:"Bericht aktualisieren", period:"Zeitraum", appointmentsPeriod:"Termine Zeitraum", deletedFromRevenue:"Aus Umsatz gelöscht", daysInReport:"Tage im Bericht", deleteRevenueHint:"Mit „Aus Umsatz löschen“ wird der komplette Tag nicht mehr im Umsatzbericht gezählt. Die Termine bleiben im Kalender erhalten.", deletedRevenueDays:"Gelöschte Tage für Umsatzbericht", employeeHint:"Mitarbeiter hier anlegen, verändern oder deaktivieren.", calendarFontColor:"Schriftfarbe im Kalender", customerHint:"Kunden hier anlegen, bearbeiten oder löschen. Beim Eintippen im Terminformular werden Kundendaten vorgeschlagen.", serviceHint:"Leistungen mit Preisen und Dauer selbst gestalten und speichern.", deleteAppointmentsPermanently:"Termine endgültig löschen", deleteAppointmentsHint:"Achtung: Diese Funktion löscht Termine endgültig. Es gibt keine Wiederherstellung in der App. Vorher am besten ein Backup exportieren.", wholeDay:"Ganzer Tag", wholeWeek:"Ganze Woche", wholeMonth:"Ganzer Monat", appointment:"Termin", markDonePaid:"Bezahlen", markNoShow:"Nicht erschienen", localBackup:"💾 Lokal Backup", localBackupHint:"Exportiert und importiert lokale JSON-Backups. „Bereinigung + Backup“ löscht zuerst alle Termine von heute und Vergangenheit sowie Mitarbeiter Umsatz, Einnahme, Kasse, Wochen Umsatz und Monat Umsatz. Danach wird ein Backup erstellt. Nur Zukunft-Termine bleiben erhalten.", cleanupAndBackup:"Bereinigung + Backup", cloudBackupNow:"Cloud Backup jetzt erstellen", autoAfterCleanup:"Automatisch nach „Bereinigung + Backup“", enableRevenueArea:"Umsatzbereich aktivieren", revenueVisibilityHint:"Wenn deaktiviert, werden Umsatzbericht, Umsatzbutton und Umsatzfunktionen ausgeblendet.", noLocalBackup:"Noch kein lokales Backup erstellt.", lastLocalBackup:"Letztes lokales Backup", noCloudBackup:"Noch kein Cloud Backup erstellt.", lastCloudBackup:"Letztes Cloud Backup", cloudDisabled:"Cloud Backup ist deaktiviert.", cloudStatusHint:"Bei aktivem Cloud Backup wird das Teilen/Speichern-Menü genutzt.", importSuccess:"Backup wurde erfolgreich wiederhergestellt.", importFailed:"Backup konnte nicht gelesen werden. Datei ist ungültig oder beschädigt.", backupManualDownload:"Backup-Datei manuell herunterladen", noCleanupData:"Keine alten Daten zum Bereinigen gefunden.", cleanupConfirm:"Alle Termine von heute und Vergangenheit sowie alle Umsätze aus Mitarbeiter Umsatz, Einnahme, Kasse, Wochen Umsatz und Monat Umsatz werden gelöscht. Danach wird ein Backup erstellt. Nur Zukunft-Termine bleiben erhalten. Fortfahren?", cleanupRunning:"Bereinige und erstelle Backup...", cleanupDone:"Bereinigung abgeschlossen. Nur Zukunft-Termine bleiben erhalten. Backup wurde erstellt: {filename}.", serviceFallback:"Leistung", employeeLabel:"Mitarbeiter", phoneLabel:"Telefon", internalStatus:"Status intern", priceLabel:"Preis", noteLabel:"Notiz", noAppointmentsInRange:"Keine Termine im Zeitraum.", noDeletedDays:"Keine Tage gelöscht.", appointmentsWord:"Termine", revenueDeletedPermanently:"Umsatz endgültig gelöscht", notRecoverable:"Nicht wiederherstellbar", revenueWord:"Umsatz", deleteRevenuePermanently:"Umsatz endgültig löschen", noAppointmentsInRange:"Keine Termine im Zeitraum.", noDeletedDays:"Keine Tage gelöscht.", days:"Tage"
});
Object.assign(I18N.vi, {
  initialSetup:"Thiết lập ban đầu", setupHint:"Ứng dụng lưu dữ liệu cục bộ trên thiết bị này. Sao lưu Cloud hiện dùng xuất file hoặc menu chia sẻ.", opensAt:"Mở cửa lúc", closesAt:"Đóng cửa lúc", initialEmployees:"Nhân viên ban đầu, cách nhau bằng dấu phẩy", startApp:"Bắt đầu ứng dụng", dailySchedule:"Lịch trong ngày", revenueReport:"Báo cáo doanh thu", from:"Từ", to:"Đến", refreshReport:"Cập nhật báo cáo", period:"Khoảng thời gian", appointmentsPeriod:"Lịch hẹn trong khoảng", deletedFromRevenue:"Đã xóa khỏi doanh thu", daysInReport:"Ngày trong báo cáo", deleteRevenueHint:"Khi dùng “Xóa khỏi doanh thu”, cả ngày sẽ không còn được tính trong báo cáo. Lịch hẹn vẫn ở trong lịch.", deletedRevenueDays:"Ngày đã xóa khỏi báo cáo doanh thu", employeeHint:"Tạo, sửa hoặc tắt nhân viên tại đây.", calendarFontColor:"Màu chữ trong lịch", customerHint:"Tạo, sửa hoặc xóa khách hàng. Khi nhập lịch hẹn, dữ liệu khách sẽ được gợi ý.", serviceHint:"Tự tạo dịch vụ với giá và thời lượng.", deleteAppointmentsPermanently:"Xóa lịch hẹn vĩnh viễn", deleteAppointmentsHint:"Chú ý: Chức năng này xóa lịch hẹn vĩnh viễn. Không thể khôi phục trong ứng dụng. Nên xuất sao lưu trước.", wholeDay:"Cả ngày", wholeWeek:"Cả tuần", wholeMonth:"Cả tháng", appointment:"Lịch hẹn", markDonePaid:"Thanh toán", markNoShow:"Không đến", localBackup:"💾 Sao lưu cục bộ", localBackupHint:"Xuất và nhập file sao lưu JSON cục bộ. “Dọn dẹp + Sao lưu” xóa tất cả lịch hẹn hôm nay và quá khứ cùng doanh thu nhân viên, thu nhập, kassa, doanh thu tuần và doanh thu tháng. Sau đó tạo sao lưu. Chỉ lịch hẹn tương lai được giữ lại.", cleanupAndBackup:"Dọn dẹp + Sao lưu", cloudBackupNow:"Tạo sao lưu Cloud ngay", autoAfterCleanup:"Tự động sau “Dọn dẹp + sao lưu”", enableRevenueArea:"Bật khu vực doanh thu", revenueVisibilityHint:"Khi tắt, báo cáo doanh thu, nút doanh thu và chức năng doanh thu sẽ bị ẩn.", noLocalBackup:"Chưa tạo sao lưu cục bộ.", lastLocalBackup:"Sao lưu cục bộ gần nhất", noCloudBackup:"Chưa tạo sao lưu Cloud.", lastCloudBackup:"Sao lưu Cloud gần nhất", cloudDisabled:"Sao lưu Cloud đang tắt.", cloudStatusHint:"Khi bật Cloud Backup, ứng dụng dùng menu chia sẻ/lưu.", importSuccess:"Đã khôi phục sao lưu thành công.", importFailed:"Không đọc được sao lưu. File không hợp lệ hoặc bị hỏng.", backupManualDownload:"Tải file sao lưu thủ công", noCleanupData:"Không có dữ liệu cũ để dọn dẹp.", cleanupConfirm:"Tất cả lịch hẹn hôm nay và quá khứ cùng doanh thu nhân viên, thu nhập, kassa, doanh thu tuần và doanh thu tháng sẽ bị xóa. Sau đó sẽ tạo sao lưu. Chỉ lịch hẹn tương lai được giữ lại. Tiếp tục?", cleanupRunning:"Đang dọn dẹp và tạo sao lưu...", cleanupDone:"Dọn dẹp xong. Chỉ lịch hẹn tương lai được giữ lại. Đã tạo file sao lưu: {filename}.", serviceFallback:"Dịch vụ", employeeLabel:"Nhân viên", phoneLabel:"Số điện thoại", internalStatus:"Trạng thái nội bộ", priceLabel:"Giá", noteLabel:"Ghi chú", noAppointmentsInRange:"Không có lịch hẹn trong khoảng này.", noDeletedDays:"Chưa xóa ngày nào.", appointmentsWord:"lịch hẹn", revenueDeletedPermanently:"Doanh thu đã xóa vĩnh viễn", notRecoverable:"Không thể khôi phục", revenueWord:"Doanh thu", deleteRevenuePermanently:"Xóa doanh thu vĩnh viễn", noAppointmentsInRange:"Không có lịch hẹn trong khoảng này.", noDeletedDays:"Chưa xóa ngày nào.", days:"ngày"
});
Object.assign(I18N.en, {
  initialSetup:"Initial setup", setupHint:"The app stores data locally on this device. Cloud backup currently uses export or the share menu.", opensAt:"Opens at", closesAt:"Closes at", initialEmployees:"Initial employees, separated by commas", startApp:"Start app", dailySchedule:"Daily schedule", revenueReport:"Revenue report", from:"From", to:"To", refreshReport:"Refresh report", period:"Period", appointmentsPeriod:"Appointments period", deletedFromRevenue:"Deleted from revenue", daysInReport:"Days in report", deleteRevenueHint:"When “Delete from revenue” is used, the whole day is no longer counted in the revenue report. Appointments stay in the calendar.", deletedRevenueDays:"Deleted days for revenue report", employeeHint:"Create, edit or deactivate employees here.", calendarFontColor:"Calendar font color", customerHint:"Create, edit or delete customers here. Customer data is suggested when typing in the appointment form.", serviceHint:"Create services with custom prices and durations.", deleteAppointmentsPermanently:"Permanently delete appointments", deleteAppointmentsHint:"Warning: This permanently deletes appointments. There is no restore function in the app. Export a backup first if needed.", wholeDay:"Whole day", wholeWeek:"Whole week", wholeMonth:"Whole month", appointment:"Appointment", markDonePaid:"Pay", markNoShow:"No-show", localBackup:"💾 Local Backup", localBackupHint:"Exports and imports local JSON backups. “Cleanup + Backup” deletes all appointments from today and the past plus Employee Revenue, Income, Cash Register, Weekly Revenue and Monthly Revenue. Then it creates the backup. Only future appointments remain.", cleanupAndBackup:"Cleanup + Backup", cloudBackupNow:"Create cloud backup now", autoAfterCleanup:"Automatically after “Cleanup + Backup”", enableRevenueArea:"Enable revenue area", revenueVisibilityHint:"When disabled, the revenue report, revenue button and revenue functions are hidden.", noLocalBackup:"No local backup created yet.", lastLocalBackup:"Last local backup", noCloudBackup:"No cloud backup created yet.", lastCloudBackup:"Last cloud backup", cloudDisabled:"Cloud backup is disabled.", cloudStatusHint:"When cloud backup is active, the share/save menu is used.", importSuccess:"Backup restored successfully.", importFailed:"Backup could not be read. The file is invalid or damaged.", backupManualDownload:"Download backup file manually", noCleanupData:"No old data found for cleanup.", cleanupConfirm:"All appointments from today and the past plus all revenue data from Employee Revenue, Income, Cash Register, Weekly Revenue and Monthly Revenue will be deleted. Then a backup will be created. Only future appointments remain. Continue?", cleanupRunning:"Cleaning and creating backup...", cleanupDone:"Cleanup completed. Only future appointments remain. Backup file created: {filename}.", serviceFallback:"Service", employeeLabel:"Employee", phoneLabel:"Phone", internalStatus:"Internal status", priceLabel:"Price", noteLabel:"Note", noAppointmentsInRange:"No appointments in this period.", noDeletedDays:"No days deleted.", appointmentsWord:"appointments", revenueDeletedPermanently:"Revenue permanently deleted", notRecoverable:"Not recoverable", revenueWord:"Revenue", deleteRevenuePermanently:"Permanently delete revenue", noAppointmentsInRange:"No appointments in this period.", noDeletedDays:"No days deleted.", days:"days"
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
  scheduleInterval:"Tagesplan-Takt",
  interval15:"15 Minuten",
  interval30:"30 Minuten",
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
  scheduleInterval:"Nhịp lịch ngày",
  interval15:"15 phút",
  interval30:"30 phút",
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
  scheduleInterval:"Schedule interval",
  interval15:"15 minutes",
  interval30:"30 minutes",
  zoomSmall:"Small",
  zoomNormal:"Normal",
  zoomLarge:"Large",
  appointmentConflictTitle:"Appointment not possible",
  appointmentConflictMessage:"This employee is already busy at that time. Existing appointment: {customer}, {start}–{end}. Please choose another time or another employee.",
  appointmentBlockCustomer:"Customer details",
  appointmentBlockService:"Service",
  appointmentBlockTime:"Appointment"
});

Object.assign(I18N.de, { employeeAny:"Beliebig" });
Object.assign(I18N.vi, { employeeAny:"Bất kỳ" });
Object.assign(I18N.en, { employeeAny:"Any" });


Object.assign(I18N.de, {
  openRevenue:"Umsatzbericht", cashRegister:"Kasse", day:"Tag", week:"Woche", month:"Monat", date:"Datum", dailyRevenueTotal:"Tageseinnahme / Gesamt", appointments:"Termine", dailyRevenueByEmployee:"Tagesumsatz nach Mitarbeiter", dailyRevenueByEmployeeHint:"Kompakte Übersicht mit Kundenterminen, Leistung und Preis. Der Bericht kann nach Tag, Woche oder Monat angezeigt werden.", workTimeVacation:"Arbeitszeit / Urlaub", workTimeVacationHint:"Alle Mitarbeiter werden hier gelistet. Lege pro Mitarbeiter fest, ob Vollzeit, Aushilfe / Teilzeit, Minijob oder individuell gearbeitet wird. Die freigegebenen Zeiten, Arbeitszeiten nach Wochentagen Montag bis Samstag, Urlaubszeiträume und einzelne Urlaubstage werden im Terminplaner berücksichtigt.", reportPrintFormat:"Bericht Druckformat", reportPrintFormatHint:"Gilt für Kassenbericht, Mitarbeiter Umsatz und Einnahme. Excel-Export bleibt unverändert.", versionLabel:"Version:", developerLabel:"Hersteller / Entwickler:", copyrightLabel:"Copyright:", revenueJournal:"Umsatzjournal", employeeRevenue:"Mitarbeiter Umsatz", weeklyRevenue:"Wochen Umsatz", monthlyRevenue:"Monat Umsatz", selectDay:"Tag auswählen", printReport:"Bericht Drucken", currentCash:"Aktuell in der Kasse", total:"Gesamt", depositChange:"Einzahlen / Wechselgeld", description:"Bezeichnung", amountEuro:"Betrag €", saveDeposit:"Einzahlung speichern", depositsTotal:"Einzahlungen gesamt", cashWithdrawal:"Geld Entnahme aus der Kasse", withdrawalReason:"Wofür wurde Geld entnommen?", saveWithdrawal:"Entnahme speichern", withdrawalsTotal:"Entnahmen gesamt", employeeRevenueHint:"Zeigt alle Termine vom ausgewählten Tag: offen, bezahlt und nicht erschienen. Beträge können direkt hier geändert werden.", openAmount:"Offene Betrag", sumPaid:"Summe Bezahlt", periodRevenueHintWeek:"Zeigt die Gesamtsumme je Tag der ausgewählten Woche. Es werden keine einzelnen Kundeninformationen angezeigt.", totalRevenue:"Gesamt Umsatz", periodRevenueHintMonth:"Zeigt die Gesamtsumme je Tag des ausgewählten Monats. Es werden keine einzelnen Kundeninformationen angezeigt.", income:"Einnahme", entries:"Einträge", employeeIncome:"Einnahme Mitarbeiter", fromCashRegister:"Aus der Kasse", remainingCash:"Noch in der Kasse", editRevenue:"Umsatz bearbeiten", editRevenueHint:"Tag auswählen, Tagesumsatz prüfen und Termine direkt je Mitarbeiter nachbearbeiten.", dailyRevenue:"Tagesumsatz", includeDayRevenue:"Tag wieder zum Umsatz zählen", excludeDayRevenue:"Tag aus Umsatz nehmen", appointmentsByEmployee:"Termine nach Mitarbeiter", addManualRevenueItem:"Manuelle Umsatzposition hinzufügen", amount:"Betrag", manualRevenueTitlePlaceholder:"z. B. Trinkgeld, Verkauf, Korrektur", optional:"Optional", saveManualItem:"Manuelle Position speichern", noEntries:"Keine Einträge vorhanden.", noAppointmentsToday:"Für diesen Tag sind noch keine Termine vorhanden.", customersCount:"Kunden", openStatus:"Offen", paidStatus:"Bezahlt", bookedStatus:"Gebucht", noPaidRevenueToday:"Für diesen Tag sind noch keine Umsätze mit Status „Bezahlt“ vorhanden.", noRevenue2EmployeeEntries:"Noch keine Einträge. Klicke im Reiter „Mitarbeiter Umsatz“ auf den gelben Button „E“.", noRevenue2CashEntries:"Noch keine Einträge. Klicke im Reiter „Mitarbeiter Umsatz“ auf den blauen Button „A“", noPaidCustomers:"Keine bezahlten Kundentermine.", noAppointmentsOnDay:"Keine Termine an diesem Tag.", noManualRevenueItems:"Noch keine manuellen Umsatzpositionen für diesen Tag.", withoutEmployee:"Ohne Mitarbeiter", customerFallback:"Kunde", noShowStatus:"Nicht erschienen", saveWord:"Speichern", statusChangeTitle:"Status ändern", changeAmountTitle:"Betrag ändern", changeIncomeAmountTitle:"Betrag in Einnahme ändern", dayExcludedStatus:"Dieser Tag ist aktuell aus dem Umsatz herausgenommen.", dayIncludedStatus:"Dieser Tag wird aktuell im Umsatz gezählt.", activeLabel:"Aktiv", scheduleLabel:"Tagesplan", cashReport:"Kassenbericht", cashBalance:"Kassenbestand", systemCleanBtn:"System bereinigen", systemCleanHint:"Löscht alle gespeicherten Umsätze und alle Termine im Tagesplan. Kundendatenbank und Leistungsdatenbank bleiben erhalten.", systemCleanConfirm:"System bereinigen? Alle gespeicherten Umsätze und alle Termine im Tagesplan werden endgültig gelöscht – Vergangenheit und Zukunft. Kundendatenbank und Leistungsdatenbank bleiben erhalten.", systemCleanConfirmFinal:"Letzte Bestätigung: Diese Bereinigung kann in der App nicht rückgängig gemacht werden. Jetzt wirklich löschen?", systemCleanDone:"System wurde bereinigt. Alle Umsätze und Termine wurden gelöscht. Kundendatenbank und Leistungsdatenbank sind erhalten geblieben."
});
Object.assign(I18N.en, {
  openRevenue:"Revenue report", cashRegister:"Cash register", day:"Day", week:"Week", month:"Month", date:"Date", dailyRevenueTotal:"Daily revenue / total", appointments:"Appointments", dailyRevenueByEmployee:"Daily revenue by employee", dailyRevenueByEmployeeHint:"Compact overview with customer appointments, service and price. The report can be shown by day, week or month.", workTimeVacation:"Working time / vacation", workTimeVacationHint:"All employees are listed here. Set whether each employee works full-time, part-time/temp, mini-job or individual days. Approved times, weekday working hours Monday to Saturday, vacation periods and single vacation days are considered in the appointment planner.", reportPrintFormat:"Report print format", reportPrintFormatHint:"Applies to cash report, employee revenue and income. Excel export remains unchanged.", versionLabel:"Version:", developerLabel:"Manufacturer / developer:", copyrightLabel:"Copyright:", revenueJournal:"Revenue journal", employeeRevenue:"Employee revenue", weeklyRevenue:"Weekly revenue", monthlyRevenue:"Monthly revenue", selectDay:"Select day", printReport:"Print report", currentCash:"Currently in cash register", total:"Total", depositChange:"Deposit / change", description:"Description", amountEuro:"Amount €", saveDeposit:"Save deposit", depositsTotal:"Deposits total", cashWithdrawal:"Cash withdrawal", withdrawalReason:"What was cash withdrawn for?", saveWithdrawal:"Save withdrawal", withdrawalsTotal:"Withdrawals total", employeeRevenueHint:"Shows all appointments for the selected day: open, paid and no-show. Amounts can be changed directly here.", openAmount:"Open amount", sumPaid:"Sum paid", periodRevenueHintWeek:"Shows the total amount per day of the selected week. No individual customer information is shown.", totalRevenue:"Total revenue", periodRevenueHintMonth:"Shows the total amount per day of the selected month. No individual customer information is shown.", income:"Income", entries:"Entries", employeeIncome:"Employee income", fromCashRegister:"From cash register", remainingCash:"Still in cash register", editRevenue:"Edit revenue", editRevenueHint:"Select a day, check daily revenue and edit appointments directly by employee.", dailyRevenue:"Daily revenue", includeDayRevenue:"Count day in revenue again", excludeDayRevenue:"Exclude day from revenue", appointmentsByEmployee:"Appointments by employee", addManualRevenueItem:"Add manual revenue item", amount:"Amount", manualRevenueTitlePlaceholder:"e.g. tip, sale, correction", optional:"Optional", saveManualItem:"Save manual item", noEntries:"No entries available.", noAppointmentsToday:"No appointments for this day yet.", customersCount:"Customers", openStatus:"Open", paidStatus:"Paid", bookedStatus:"Booked", noPaidRevenueToday:"No revenue with status “Paid” for this day yet.", noRevenue2EmployeeEntries:"No entries yet. Click the yellow “E” button in the Employee revenue tab.", noRevenue2CashEntries:"No entries yet. Click the blue “A” button in the Employee revenue tab.", noPaidCustomers:"No paid customer appointments.", noAppointmentsOnDay:"No appointments on this day.", noManualRevenueItems:"No manual revenue items for this day yet.", withoutEmployee:"Without employee", customerFallback:"Customer", noShowStatus:"No-show", saveWord:"Save", statusChangeTitle:"Change status", changeAmountTitle:"Change amount", changeIncomeAmountTitle:"Change income amount", dayExcludedStatus:"This day is currently excluded from revenue.", dayIncludedStatus:"This day is currently counted in revenue.", activeLabel:"Active", scheduleLabel:"Schedule", cashReport:"Cash report", cashBalance:"Cash balance", systemCleanBtn:"Clean system", systemCleanHint:"Deletes all saved revenue and all appointments in the daily schedule. Customer database and service database remain saved.", systemCleanConfirm:"Clean system? All saved revenue and all appointments in the daily schedule will be permanently deleted – past and future. Customer database and service database remain saved.", systemCleanConfirmFinal:"Final confirmation: This cleanup cannot be undone in the app. Really delete now?", systemCleanDone:"System cleaned. All revenue and appointments were deleted. Customer database and service database were kept."
});
Object.assign(I18N.vi, {
  openRevenue:"Báo cáo doanh thu", cashRegister:"Kassa", day:"Ngày", week:"Tuần", month:"Tháng", date:"Ngày", dailyRevenueTotal:"Doanh thu ngày / tổng", appointments:"Lịch hẹn", dailyRevenueByEmployee:"Doanh thu ngày theo nhân viên", dailyRevenueByEmployeeHint:"Tổng quan gọn với lịch hẹn khách, dịch vụ và giá. Báo cáo có thể xem theo ngày, tuần hoặc tháng.", workTimeVacation:"Giờ làm / nghỉ phép", workTimeVacationHint:"Tất cả nhân viên được liệt kê ở đây. Thiết lập toàn thời gian, phụ/part-time, mini-job hoặc ngày làm riêng. Thời gian được phép, giờ làm theo thứ Hai đến thứ Bảy, kỳ nghỉ và ngày nghỉ lẻ sẽ được tính trong lịch hẹn.", reportPrintFormat:"Định dạng in báo cáo", reportPrintFormatHint:"Áp dụng cho báo cáo kassa, doanh thu nhân viên và thu nhập. Xuất Excel không thay đổi.", versionLabel:"Phiên bản:", developerLabel:"Nhà sản xuất / phát triển:", copyrightLabel:"Bản quyền:", revenueJournal:"Nhật ký doanh thu", employeeRevenue:"Doanh thu nhân viên", weeklyRevenue:"Doanh thu tuần", monthlyRevenue:"Doanh thu tháng", selectDay:"Chọn ngày", printReport:"In báo cáo", currentCash:"Hiện có trong kassa", total:"Tổng", depositChange:"Nạp tiền / tiền lẻ", description:"Mô tả", amountEuro:"Số tiền €", saveDeposit:"Lưu khoản nạp", depositsTotal:"Tổng tiền nạp", cashWithdrawal:"Rút tiền khỏi kassa", withdrawalReason:"Rút tiền để làm gì?", saveWithdrawal:"Lưu khoản rút", withdrawalsTotal:"Tổng tiền rút", employeeRevenueHint:"Hiển thị tất cả lịch hẹn của ngày đã chọn: mở, đã trả và không đến. Có thể sửa số tiền trực tiếp tại đây.", openAmount:"Số tiền còn mở", sumPaid:"Tổng đã trả", periodRevenueHintWeek:"Hiển thị tổng tiền từng ngày trong tuần đã chọn. Không hiển thị thông tin khách riêng lẻ.", totalRevenue:"Tổng doanh thu", periodRevenueHintMonth:"Hiển thị tổng tiền từng ngày trong tháng đã chọn. Không hiển thị thông tin khách riêng lẻ.", income:"Thu nhập", entries:"Mục", employeeIncome:"Thu nhập nhân viên", fromCashRegister:"Từ kassa", remainingCash:"Còn trong kassa", editRevenue:"Sửa doanh thu", editRevenueHint:"Chọn ngày, kiểm tra doanh thu ngày và sửa lịch hẹn trực tiếp theo nhân viên.", dailyRevenue:"Doanh thu ngày", includeDayRevenue:"Tính lại ngày vào doanh thu", excludeDayRevenue:"Loại ngày khỏi doanh thu", appointmentsByEmployee:"Lịch hẹn theo nhân viên", addManualRevenueItem:"Thêm mục doanh thu thủ công", amount:"Số tiền", manualRevenueTitlePlaceholder:"ví dụ: tiền tip, bán hàng, chỉnh sửa", optional:"Tùy chọn", saveManualItem:"Lưu mục thủ công", noEntries:"Chưa có mục nào.", noAppointmentsToday:"Chưa có lịch hẹn cho ngày này.", customersCount:"Khách", openStatus:"Mở", paidStatus:"Đã trả", bookedStatus:"Đã đặt", noPaidRevenueToday:"Chưa có doanh thu trạng thái “Đã trả” cho ngày này.", noRevenue2EmployeeEntries:"Chưa có mục nào. Nhấn nút “E” màu vàng trong tab Doanh thu nhân viên.", noRevenue2CashEntries:"Chưa có mục nào. Nhấn nút “A” màu xanh trong tab Doanh thu nhân viên.", noPaidCustomers:"Không có lịch hẹn khách đã trả.", noAppointmentsOnDay:"Không có lịch hẹn trong ngày này.", noManualRevenueItems:"Chưa có mục doanh thu thủ công cho ngày này.", withoutEmployee:"Không có nhân viên", customerFallback:"Khách", noShowStatus:"Không đến", saveWord:"Lưu", statusChangeTitle:"Đổi trạng thái", changeAmountTitle:"Đổi số tiền", changeIncomeAmountTitle:"Đổi số tiền thu nhập", dayExcludedStatus:"Ngày này hiện đã bị loại khỏi doanh thu.", dayIncludedStatus:"Ngày này hiện được tính vào doanh thu.", activeLabel:"Đang bật", scheduleLabel:"Lịch ngày", cashReport:"Báo cáo kassa", cashBalance:"Số dư kassa", systemCleanBtn:"Dọn dẹp hệ thống", systemCleanHint:"Xóa toàn bộ doanh thu đã lưu và toàn bộ lịch hẹn trong lịch ngày. Cơ sở dữ liệu khách hàng và dịch vụ vẫn được giữ lại.", systemCleanConfirm:"Dọn dẹp hệ thống? Toàn bộ doanh thu đã lưu và toàn bộ lịch hẹn trong lịch ngày sẽ bị xóa vĩnh viễn – quá khứ và tương lai. Cơ sở dữ liệu khách hàng và dịch vụ vẫn được giữ lại.", systemCleanConfirmFinal:"Xác nhận lần cuối: Việc dọn dẹp này không thể hoàn tác trong ứng dụng. Thực sự xóa ngay bây giờ?", systemCleanDone:"Hệ thống đã được dọn dẹp. Toàn bộ doanh thu và lịch hẹn đã bị xóa. Cơ sở dữ liệu khách hàng và dịch vụ vẫn được giữ lại."
});

Object.assign(I18N.de, {
  paymentTitle:"💳 Bezahlen", paymentTitlePlain:"Bezahlen", paymentProducts:"Leistungen / Produkte", searchPlaceholder:"Suchen...", cart:"Warenkorb", clear:"Leeren", todayAppointmentCustomer:"Termin/Kunde von heute", subtotal:"Zwischensumme", discountEuro:"Rabatt €", tipEuro:"Trinkgeld €", cashPayment:"Bar", cardPayment:"Karte", voucherPayment:"Gutschein", completePayment:"Bezahlung abschließen", paymentLocalHint:"Hinweis: Diese Kasse speichert lokal Umsatzpositionen und markiert ausgewählte Termine als bezahlt. Für eine echte Deutschland-Kasse müssen TSE, DSFinV-K und GoBD noch angebunden werden.", noAppointmentFreeSale:"Ohne Termin / freier Verkauf", noServiceFound:"Keine Leistung gefunden.", emptyCart:"Noch keine Position im Warenkorb.", selectServiceOrAppointmentFirst:"Bitte zuerst eine Leistung oder einen Termin auswählen.", paymentSavedToCash:"Bezahlung gespeichert und in Kasse übernommen", discountTipCorrection:"Rabatt / Trinkgeld / Korrektur"
});
Object.assign(I18N.en, {
  paymentTitle:"💳 Payment", paymentTitlePlain:"Payment", paymentProducts:"Services / products", searchPlaceholder:"Search...", cart:"Cart", clear:"Clear", todayAppointmentCustomer:"Today’s appointment/customer", subtotal:"Subtotal", discountEuro:"Discount €", tipEuro:"Tip €", cashPayment:"Cash", cardPayment:"Card", voucherPayment:"Voucher", completePayment:"Complete payment", paymentLocalHint:"Note: This checkout stores revenue items locally and marks selected appointments as paid. For a real German cash register, TSE, DSFinV-K and GoBD still need to be connected.", noAppointmentFreeSale:"No appointment / free sale", noServiceFound:"No service found.", emptyCart:"No items in the cart yet.", selectServiceOrAppointmentFirst:"Please select a service or appointment first.", paymentSavedToCash:"Payment saved and added to cash register", discountTipCorrection:"Discount / tip / correction"
});
Object.assign(I18N.vi, {
  paymentTitle:"💳 Thanh toán", paymentTitlePlain:"Thanh toán", paymentProducts:"Dịch vụ / sản phẩm", searchPlaceholder:"Tìm kiếm...", cart:"Giỏ hàng", clear:"Xóa", todayAppointmentCustomer:"Lịch hẹn/khách hôm nay", subtotal:"Tạm tính", discountEuro:"Giảm giá €", tipEuro:"Tiền tip €", cashPayment:"Tiền mặt", cardPayment:"Thẻ", voucherPayment:"Phiếu quà tặng", completePayment:"Hoàn tất thanh toán", paymentLocalHint:"Ghi chú: Kassa này lưu doanh thu cục bộ và đánh dấu lịch hẹn đã chọn là đã thanh toán. Để dùng như kassa chính thức tại Đức, cần kết nối TSE, DSFinV-K và GoBD.", noAppointmentFreeSale:"Không có lịch hẹn / bán tự do", noServiceFound:"Không tìm thấy dịch vụ.", emptyCart:"Chưa có mục nào trong giỏ hàng.", selectServiceOrAppointmentFirst:"Vui lòng chọn dịch vụ hoặc lịch hẹn trước.", paymentSavedToCash:"Thanh toán đã lưu và chuyển vào kassa", discountTipCorrection:"Giảm giá / tip / điều chỉnh"
});


Object.assign(I18N.de, {
  appointmentBlockCustomer:"Kundendaten", appointmentBlockService:"Leistung", appointmentBlockTime:"Termin", employeeAny:"Beliebig",
  displaySettings:"Darstellung / Geräteansicht", displaySettingsHint:"Optimiert die App für iPhone, iPad oder PC. „Automatisch“ erkennt die passende Ansicht selbst.", optimizeForDevice:"Darstellung optimieren für", deviceAuto:"Automatisch", deviceIphone:"iPhone", deviceIpad:"iPad", devicePc:"PC / Windows", scheduleZoom:"Tagesplan-Zoom", zoomSmall:"Klein", zoomNormal:"Normal", zoomLarge:"Groß", scheduleInterval:"Tagesplan-Takt", interval15:"15 Minuten", interval30:"30 Minuten",
  selectWeek:"KW auswählen", selectMonth:"Monat auswählen", weekEdit:"Wochen ändern", monthEdit:"Monat ändern", manualChange:"Manuell ändern", reset:"Zurücksetzen", periodManualHint:"Manuelle Änderungen in diesem Fenster dienen nur für diesen Bericht. Die automatische Synchronisierung von Bezahlen, Kasse, Mitarbeiter Umsatz, Wochen Umsatz und Monat Umsatz bleibt unverändert.", manualReport:"Manuell geänderter Bericht", manual:"Manuell", dailyTotals:"Tages-Gesamtsummen", deletedStatus:"Gelöscht", validAmountAlert:"Bitte gültige Beträge eintragen.", validAmountSingleAlert:"Bitte einen gültigen Betrag eintragen.", changeSaved:"Änderung gespeichert.", resetWeekManualConfirm:"Manuelle Wochenänderung zurücksetzen?", resetMonthManualConfirm:"Manuelle Monatsänderung zurücksetzen?",
  employeeRevenueNote:"Anmerkung: aktuell haben die Button E und A keine Funktion. „E“ soll später für „Eintragung Bonus“ und „A“ für „Aufteilung Leistung / Mitarbeiter“ sein.", reportAutoFooter:"Bericht automatisch aus dem Umsatzjournal erstellt.", printPdfHint:"PDF über den Druckdialog speichern oder an den angeschlossenen Drucker senden.", printPdf:"Drucken / PDF", excelDownload:"Excel herunterladen", deposits:"Einzahlungen", withdrawals:"Entnahmen", employeeRevenueSection:"Umsatz Mitarbeiter", employeeCount:"Anzahl", sum:"Summe", cashDepositsReport:"Einzahlungen / Wechselgeld", cashWithdrawalsReport:"Geldentnahmen", labelAmount:"Betrag", noShowStatus:"Nicht erschienen", customersTotal:"Kunden Gesamt", allCustomersByEmployee:"Alle Kunden nach Mitarbeiter", timeShort:"Zeit", status:"Status", totalSingleEmployees:"Gesamtsumme einzelne Mitarbeiter", sumPaid:"Summe Bezahlt", employeeIncomeDetails:"Einzelne Kunden nach Mitarbeiter", amount:"Betrag", deletedDay:"Tag gelöscht", correction:"Korrektur"
});
Object.assign(I18N.vi, {
  appointmentBlockCustomer:"Thông tin khách hàng", appointmentBlockService:"Dịch vụ", appointmentBlockTime:"Lịch hẹn", employeeAny:"Bất kỳ",
  displaySettings:"Hiển thị / thiết bị", displaySettingsHint:"Tối ưu ứng dụng cho iPhone, iPad hoặc PC. “Tự động” sẽ nhận diện chế độ phù hợp.", optimizeForDevice:"Tối ưu hiển thị cho", deviceAuto:"Tự động", deviceIphone:"iPhone", deviceIpad:"iPad", devicePc:"PC / Windows", scheduleZoom:"Phóng to lịch ngày", zoomSmall:"Nhỏ", zoomNormal:"Bình thường", zoomLarge:"Lớn", scheduleInterval:"Khoảng thời gian lịch", interval15:"15 phút", interval30:"30 phút",
  selectWeek:"Chọn tuần/KW", selectMonth:"Chọn tháng", weekEdit:"Sửa tuần", monthEdit:"Sửa tháng", manualChange:"Sửa thủ công", reset:"Đặt lại", periodManualHint:"Các thay đổi thủ công trong cửa sổ này chỉ dùng cho báo cáo này. Đồng bộ tự động từ Thanh toán, Sổ quỹ, Doanh thu nhân viên, Doanh thu tuần và Doanh thu tháng vẫn giữ nguyên.", manualReport:"Báo cáo đã sửa thủ công", manual:"Thủ công", dailyTotals:"Tổng doanh thu theo ngày", deletedStatus:"Đã xóa", validAmountAlert:"Vui lòng nhập số tiền hợp lệ.", validAmountSingleAlert:"Vui lòng nhập một số tiền hợp lệ.", changeSaved:"Đã lưu thay đổi.", resetWeekManualConfirm:"Đặt lại thay đổi thủ công của tuần?", resetMonthManualConfirm:"Đặt lại thay đổi thủ công của tháng?",
  employeeRevenueNote:"Ghi chú: hiện tại các nút E và A chưa có chức năng. Sau này “E” dùng cho “nhập thưởng” và “A” dùng cho “chia dịch vụ / nhân viên”", reportAutoFooter:"Báo cáo được tạo tự động từ nhật ký doanh thu.", printPdfHint:"Lưu PDF qua hộp thoại in hoặc gửi đến máy in đã kết nối.", printPdf:"In / PDF", excelDownload:"Tải Excel", deposits:"Tiền nạp", withdrawals:"Tiền rút", employeeRevenueSection:"Doanh thu nhân viên", employeeCount:"Số lượng", sum:"Tổng", cashDepositsReport:"Nạp tiền / tiền lẻ", cashWithdrawalsReport:"Rút tiền", labelAmount:"Số tiền", noShowStatus:"Không đến", customersTotal:"Tổng khách", allCustomersByEmployee:"Tất cả khách theo nhân viên", timeShort:"Giờ", status:"Trạng thái", totalSingleEmployees:"Tổng từng nhân viên", sumPaid:"Tổng đã trả", employeeIncomeDetails:"Từng khách theo nhân viên", amount:"Số tiền", deletedDay:"Ngày đã xóa", correction:"Điều chỉnh",
  cashRegister:"Sổ quỹ", currentCash:"Hiện có trong quỹ", cashReport:"Báo cáo sổ quỹ", cashBalance:"Số dư quỹ", cashWithdrawal:"Rút tiền khỏi quỹ", fromCashRegister:"Từ sổ quỹ", remainingCash:"Còn trong quỹ", noRevenue2CashEntries:"Chưa có mục nào. Nhấn nút “A” màu xanh trong tab Doanh thu nhân viên."
});
Object.assign(I18N.en, {
  appointmentBlockCustomer:"Customer data", appointmentBlockService:"Service", appointmentBlockTime:"Appointment", employeeAny:"Any",
  displaySettings:"Display / device view", displaySettingsHint:"Optimizes the app for iPhone, iPad or PC. “Automatic” detects the matching view.", optimizeForDevice:"Optimize display for", deviceAuto:"Automatic", deviceIphone:"iPhone", deviceIpad:"iPad", devicePc:"PC / Windows", scheduleZoom:"Schedule zoom", zoomSmall:"Small", zoomNormal:"Normal", zoomLarge:"Large", scheduleInterval:"Schedule interval", interval15:"15 minutes", interval30:"30 minutes",
  selectWeek:"Select week/KW", selectMonth:"Select month", weekEdit:"Edit week", monthEdit:"Edit month", manualChange:"Manual edit", reset:"Reset", periodManualHint:"Manual changes in this window are only used for this report. Automatic sync from Payment, Cash register, Employee revenue, Weekly revenue and Monthly revenue remains unchanged.", manualReport:"Manually changed report", manual:"Manual", dailyTotals:"Daily totals", deletedStatus:"Deleted", validAmountAlert:"Please enter valid amounts.", validAmountSingleAlert:"Please enter a valid amount.", changeSaved:"Change saved.", resetWeekManualConfirm:"Reset manual weekly change?", resetMonthManualConfirm:"Reset manual monthly change?",
  employeeRevenueNote:"Note: the E and A buttons currently have no function. Later, “E” is intended for bonus entry and “A” for splitting service / employee.", reportAutoFooter:"Report automatically created from the revenue journal.", printPdfHint:"Save PDF via the print dialog or send it to the connected printer.", printPdf:"Print / PDF", excelDownload:"Download Excel", deposits:"Deposits", withdrawals:"Withdrawals", employeeRevenueSection:"Employee revenue", employeeCount:"Count", sum:"Sum", cashDepositsReport:"Deposits / change", cashWithdrawalsReport:"Cash withdrawals", labelAmount:"Amount", noShowStatus:"No-show", customersTotal:"Customers total", allCustomersByEmployee:"All customers by employee", timeShort:"Time", status:"Status", totalSingleEmployees:"Total per employee", sumPaid:"Sum paid", employeeIncomeDetails:"Individual customers by employee", amount:"Amount", deletedDay:"Day deleted", correction:"Correction"
});

function t(key){
  const lang = state.language || "de";
  return (I18N[lang] && I18N[lang][key]) || I18N.de[key] || key;
}

const STATIC_TEXT_I18N = {
  vi: {
    "Noch keine Mitarbeiter vorhanden.": "Chưa có nhân viên.",
    "Arbeitszeiten": "Giờ làm việc",
    "Arbeitsmodell, normale Zeiten, Wochentage und Sonder-Arbeitstage": "Mô hình làm việc, giờ thường, ngày trong tuần và ngày làm đặc biệt",
    "Arbeitszeiten nach Wochentagen aktivieren": "Bật giờ làm theo ngày trong tuần",
    "Wenn aktiviert, sind nur angehakte Wochentage im Terminplaner freigegeben. Nicht angehakte Tage werden gesperrt. Sonntag ist geschlossen und kann hier nicht aktiviert werden.": "Khi bật, chỉ những ngày trong tuần được chọn mới có thể đặt lịch. Ngày không chọn sẽ bị khóa. Chủ nhật đóng cửa và không thể bật ở đây.",
    "Sonder-Arbeitstage nach Datum": "Ngày làm đặc biệt theo ngày",
    "Hier kannst du für einzelne Mitarbeiter ein bestimmtes Datum mit eigener Arbeitszeit freigeben. Diese Freigabe gilt nur an diesem Datum und überschreibt den normalen Wochenplan.": "Tại đây có thể mở một ngày cụ thể với giờ làm riêng cho từng nhân viên. Thiết lập này chỉ áp dụng cho ngày đó và ghi đè lịch tuần thông thường.",
    "Datum": "Ngày", "Arbeitstag hinzufügen": "Thêm ngày làm", "Einzelnen Urlaubstag hinzufügen": "Thêm một ngày nghỉ", "Urlaubstag hinzufügen": "Thêm ngày nghỉ", "Urlaub / Sperrtage entfernen": "Xóa nghỉ phép / ngày khóa", "Der Terminplaner zeigt Zeiten außerhalb der Freigabe, Sonntage und aktiv gespeicherte Urlaubstage automatisch gesperrt an.": "Lịch hẹn tự động khóa thời gian ngoài giờ cho phép, Chủ nhật và ngày nghỉ đã lưu.",
    "Kunde": "Khách hàng", "Mitarbeiter": "Nhân viên", "Termin im Tagesplan gelb markieren": "Đánh dấu lịch hẹn màu vàng trong lịch ngày", "Uhrzeit": "Giờ", "Änderungen speichern": "Lưu thay đổi", "Abbrechen": "Hủy", "Schließen": "Đóng", "Speichern": "Lưu", "Löschen": "Xóa", "Bearbeiten": "Sửa", "Aktiv": "Đang bật", "Inaktiv": "Tắt", "Vollzeit": "Toàn thời gian", "Aushilfe / Teilzeit": "Phụ / bán thời gian", "Minijob": "Mini-job", "Individuell": "Tùy chỉnh",
    "Mo": "T2", "Di": "T3", "Mi": "T4", "Do": "T5", "Fr": "T6", "Sa": "T7", "Montag": "Thứ Hai", "Dienstag": "Thứ Ba", "Mittwoch": "Thứ Tư", "Donnerstag": "Thứ Năm", "Freitag": "Thứ Sáu", "Samstag": "Thứ Bảy",
    "Noch keine Eintragung eingetragen.": "Chưa có khoản nạp nào.", "Noch keine Geldentnahme eingetragen.": "Chưa có khoản rút nào.", "Keine Einträge vorhanden.": "Chưa có mục nào.", "Noch keine manuellen Umsatzpositionen für diesen Tag.": "Chưa có mục doanh thu thủ công cho ngày này.", "Keine Termine an diesem Tag.": "Không có lịch hẹn trong ngày này.", "Keine bezahlten Kundentermine.": "Không có lịch hẹn khách đã trả.", "Offen": "Mở", "Bezahlt": "Đã trả", "Gebucht": "Đã đặt", "Nicht erschienen": "Không đến", "Leistung": "Dịch vụ", "Status": "Trạng thái", "Betrag": "Số tiền", "Preis": "Giá", "Notiz": "Ghi chú", "Telefon": "Số điện thoại", "Name": "Tên", "Gesamt": "Tổng", "Tagesumsatz": "Doanh thu ngày", "Gesamt Umsatz": "Tổng doanh thu", "Bericht Drucken": "In báo cáo", "Wochen ändern": "Sửa tuần", "Monat ändern": "Sửa tháng", "Zurücksetzen": "Đặt lại", "Manuell ändern": "Sửa thủ công", "Manuell": "Thủ công"
  },
  en: {
    "Noch keine Mitarbeiter vorhanden.": "No employees available yet.",
    "Arbeitszeiten": "Working hours",
    "Arbeitsmodell, normale Zeiten, Wochentage und Sonder-Arbeitstage": "Work model, normal hours, weekdays and special working days",
    "Arbeitszeiten nach Wochentagen aktivieren": "Enable working hours by weekday",
    "Wenn aktiviert, sind nur angehakte Wochentage im Terminplaner freigegeben. Nicht angehakte Tage werden gesperrt. Sonntag ist geschlossen und kann hier nicht aktiviert werden.": "When enabled, only checked weekdays are available in the appointment planner. Unchecked days are blocked. Sunday is closed and cannot be enabled here.",
    "Sonder-Arbeitstage nach Datum": "Special working days by date",
    "Hier kannst du für einzelne Mitarbeiter ein bestimmtes Datum mit eigener Arbeitszeit freigeben. Diese Freigabe gilt nur an diesem Datum und überschreibt den normalen Wochenplan.": "Here you can open a specific date with custom working hours for individual employees. This only applies to that date and overrides the normal weekly schedule.",
    "Datum": "Date", "Arbeitstag hinzufügen": "Add working day", "Einzelnen Urlaubstag hinzufügen": "Add single vacation day", "Urlaubstag hinzufügen": "Add vacation day", "Urlaub / Sperrtage entfernen": "Remove vacation / blocked days", "Der Terminplaner zeigt Zeiten außerhalb der Freigabe, Sonntage und aktiv gespeicherte Urlaubstage automatisch gesperrt an.": "The appointment planner automatically blocks times outside availability, Sundays and saved vacation days.",
    "Kunde": "Customer", "Mitarbeiter": "Employee", "Termin im Tagesplan gelb markieren": "Mark appointment yellow in schedule", "Uhrzeit": "Time", "Änderungen speichern": "Save changes", "Abbrechen": "Cancel", "Schließen": "Close", "Speichern": "Save", "Löschen": "Delete", "Bearbeiten": "Edit", "Aktiv": "Active", "Inaktiv": "Inactive", "Vollzeit": "Full-time", "Aushilfe / Teilzeit": "Assistant / part-time", "Minijob": "Mini job", "Individuell": "Custom",
    "Mo": "Mon", "Di": "Tue", "Mi": "Wed", "Do": "Thu", "Fr": "Fri", "Sa": "Sat", "Montag": "Monday", "Dienstag": "Tuesday", "Mittwoch": "Wednesday", "Donnerstag": "Thursday", "Freitag": "Friday", "Samstag": "Saturday",
    "Noch keine Eintragung eingetragen.": "No deposit entered yet.", "Noch keine Geldentnahme eingetragen.": "No withdrawal entered yet.", "Keine Einträge vorhanden.": "No entries available.", "Noch keine manuellen Umsatzpositionen für diesen Tag.": "No manual revenue items for this day yet.", "Keine Termine an diesem Tag.": "No appointments on this day.", "Keine bezahlten Kundentermine.": "No paid customer appointments.", "Offen": "Open", "Bezahlt": "Paid", "Gebucht": "Booked", "Nicht erschienen": "No-show", "Leistung": "Service", "Status": "Status", "Betrag": "Amount", "Preis": "Price", "Notiz": "Note", "Telefon": "Phone", "Name": "Name", "Gesamt": "Total", "Tagesumsatz": "Daily revenue", "Gesamt Umsatz": "Total revenue", "Bericht Drucken": "Print report", "Wochen ändern": "Edit week", "Monat ändern": "Edit month", "Zurücksetzen": "Reset", "Manuell ändern": "Manual edit", "Manuell": "Manual"
  }
};
function translateStaticTextNodes(root = document.body){
  const lang = state.language || "de";
  if(lang === "de" || !STATIC_TEXT_I18N[lang] || !root) return;
  const dict = STATIC_TEXT_I18N[lang];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node){
      const parent = node.parentElement;
      if(!parent) return NodeFilter.FILTER_REJECT;
      if(["SCRIPT","STYLE","TEXTAREA"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if(parent.closest("input,select,option")) return NodeFilter.FILTER_REJECT;
      const text = node.nodeValue.trim();
      return text && dict[text] ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });
  const nodes = [];
  while(walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    const original = node.nodeValue;
    const trimmed = original.trim();
    const before = original.slice(0, original.indexOf(trimmed));
    const after = original.slice(original.indexOf(trimmed) + trimmed.length);
    node.nodeValue = before + dict[trimmed] + after;
  });
}

function applyLanguage(){
  document.documentElement.lang = state.language || "de";
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if(I18N[state.language || "de"]?.[key] || I18N.de[key]){
      el.textContent = t(key);
    }
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if(I18N[state.language || "de"]?.[key] || I18N.de[key]) el.placeholder = t(key);
  });
  document.querySelectorAll("[data-i18n-title]").forEach(el => {
    const key = el.getAttribute("data-i18n-title");
    if(I18N[state.language || "de"]?.[key] || I18N.de[key]) el.title = t(key);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach(el => {
    const key = el.getAttribute("data-i18n-aria-label");
    if(I18N[state.language || "de"]?.[key] || I18N.de[key]) el.setAttribute("aria-label", t(key));
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
  renderStartTimeOptions(); renderEmployeeSelect(); renderSettingsEmployeeList(); renderWorkTimeList(); renderCustomerDatalist(); renderSettingsCustomerList(); renderServiceDatalist(); renderServiceList(); renderCustomerSearch(); renderCalendar(); applyRevenueVisibility(); renderReport(); renderEmployeeDailyRevenue(); renderCashTab(); updateBackupStatuses(); updateLicenseInfoBox();
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

function ensureServiceFromAppointment(a){
  const name = String(a.serviceName || "").trim();
  if(!name) return;

  state.services = Array.isArray(state.services) ? state.services : [];
  const existing = state.services.find(s => String(s.name || "").trim().toLowerCase() === name.toLowerCase());
  if(existing) return;

  const price = Number(a.price || 0);
  const duration = Number(a.duration || 60);
  state.services.push({
    id:uid(),
    name,
    price:Number.isFinite(price) && price >= 0 ? price : 0,
    duration:Number.isFinite(duration) && duration >= 1 ? Math.max(1, Math.round(duration)) : 60
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
  document.querySelectorAll(".slot.drop-target").forEach(s => s.classList.remove("drop-target"));
}

function cleanupTouchDragAppointment(options = {}){
  clearTimeout(longPressTimer);
  const release = options.releaseEvent;
  if(touchDragOriginal && touchDragPointerId !== null && touchDragOriginal.releasePointerCapture){
    try{ touchDragOriginal.releasePointerCapture(touchDragPointerId); }catch(err){}
  }else if(release?.target?.releasePointerCapture && release.pointerId !== undefined){
    try{ release.target.releasePointerCapture(release.pointerId); }catch(err){}
  }
  if(touchDragGhost){
    touchDragGhost.remove();
    touchDragGhost = null;
  }
  document.querySelectorAll(".slot.drop-target").forEach(s => s.classList.remove("drop-target"));
  touchDragOriginal = null;
  touchDragPointerId = null;
  document.body.classList.remove("dragging-appointment");
  if(options.cancelMove !== false) cancelMoveAppointment();
}

function installTouchDragSafetyGuards(){
  if(touchDragCleanupInstalled) return;
  touchDragCleanupInstalled = true;
  window.addEventListener("blur", () => cleanupTouchDragAppointment(), {passive:true});
  document.addEventListener("visibilitychange", () => { if(document.hidden) cleanupTouchDragAppointment(); }, {passive:true});
  document.addEventListener("pointercancel", e => cleanupTouchDragAppointment({releaseEvent:e}), {passive:true});
  document.addEventListener("pointerup", e => {
    if(touchDragGhost && touchDragPointerId !== null && e.pointerId !== touchDragPointerId){
      cleanupTouchDragAppointment({releaseEvent:e});
      setTimeout(()=>{ suppressAppointmentClick=false; }, 150);
    }
  }, {passive:true});
}
function moveAppointmentTo(employeeId, startTime){
  clearSelectedCalendarSlot();
  if(!movingAppointmentId) return false;
  const a = state.appointments.find(x => x.id === movingAppointmentId);
  if(!a){ cancelMoveAppointment(); return false; }
  const candidate = {...a, employeeId, startTime, date:state.selectedDate};
  if(isAppointmentDateTimeInPast(candidate.date, candidate.startTime)){
    showPastAppointmentWarning();
    cancelMoveAppointment();
    renderCalendar();
    return false;
  }
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
  installTouchDragSafetyGuards();
  startMoveAppointment(id);
  touchDragOriginal = el;
  touchDragPointerId = pointerEvent.pointerId;
  if(el.setPointerCapture && pointerEvent.pointerId !== undefined){
    try{ el.setPointerCapture(pointerEvent.pointerId); }catch(err){}
  }

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

  const under = document.elementFromPoint(pointerEvent.clientX, pointerEvent.clientY);
  const slot = under && under.closest ? under.closest(".slot[data-employee]") : null;
  const activeMoveId = movingAppointmentId;

  cleanupTouchDragAppointment({cancelMove:false, releaseEvent:pointerEvent});

  if(slot && activeMoveId){
    movingAppointmentId = activeMoveId;
    moveAppointmentTo(slot.dataset.employee, slot.dataset.time);
  }else{
    cancelMoveAppointment();
  }

  setTimeout(()=>{ suppressAppointmentClick=false; }, 150);
}


function selectedCalendarSlotMatches(employeeId, time){
  return selectedCalendarSlot
    && selectedCalendarSlot.date === state.selectedDate
    && selectedCalendarSlot.employeeId === employeeId
    && selectedCalendarSlot.time === time;
}
function applySelectedCalendarSlotHighlight(){
  const calendar = $("calendar");
  if(!calendar) return;
  calendar.querySelectorAll(".slot.selected-free-slot").forEach(el => el.classList.remove("selected-free-slot"));
  if(!selectedCalendarSlot || selectedCalendarSlot.date !== state.selectedDate) return;
  const slot = Array.from(calendar.querySelectorAll(".slot[data-employee][data-time]")).find(el =>
    el.dataset.employee === selectedCalendarSlot.employeeId && el.dataset.time === selectedCalendarSlot.time
  );
  if(slot) slot.classList.add("selected-free-slot");
}
function setSelectedCalendarSlot(employeeId, time){
  selectedCalendarSlot = {date:state.selectedDate, employeeId, time};
  applySelectedCalendarSlotHighlight();
}
function clearSelectedCalendarSlot(){
  selectedCalendarSlot = null;
  const calendar = $("calendar");
  if(calendar) calendar.querySelectorAll(".slot.selected-free-slot").forEach(el => el.classList.remove("selected-free-slot"));
}

function renderCalendar(){
  const s=slots(), active=state.employees.filter(e=>e.active).sort(byName), todays=state.appointments.filter(a=>a.date===state.selectedDate);
  $("appointmentCount").textContent=`${todays.length} Termine`;
  const grid=document.createElement("div");
  grid.className="grid";
  grid.style.setProperty("--slots",s.length);
  grid.style.gridTemplateRows = `56px repeat(${active.length}, var(--row-h))`;
  grid.innerHTML=`<div class="corner" style="grid-column:1;grid-row:1;">${t("employee")}</div>`+
    s.map((slotTime, slotIndex)=>`<div class="time-header${timeToMinutes(slotTime) % 60 === 0 ? " full-hour" : ""}" data-time="${slotTime}" style="grid-column:${slotIndex + 2};grid-row:1;">${slotTime}</div>`).join("");

  for(const [employeeIndex, emp] of active.entries()){
    const gridRow = employeeIndex + 2;
    grid.insertAdjacentHTML("beforeend",`<div class="employee-cell employee-row-colored" ${employeeRowStyle(emp, `grid-column:1;grid-row:${gridRow};`)}><span class="employee-name-colored" style="color:${escapeHtml(emp.color || "#d94f93")}">${escapeHtml(emp.name)}</span></div>`);
    let skipUntil = null;
    for(const [slotIndex, t] of s.entries()){
      const slotMin = timeToMinutes(t);
      if(skipUntil && slotMin < skipUntil) continue;
      const a=todays.find(x=>x.employeeId===emp.id && x.startTime===t);
      const gridColumn = slotIndex + 2;
      if(a){
        const intervalMinutes = getSlotIntervalMinutes();
        // Version 3.01: Jedes Tagesplan-Element bekommt eine feste Grid-Position.
        // Dadurch kann ein Termin mit manueller Dauer (z. B. 125 Min) keine zusätzlichen
        // Auto-Grid-Zellen erzeugen. Mitarbeiterleiste und horizontale Zeitleiste bleiben synchron.
        const rawDuration = Number(a.duration || intervalMinutes);
        const rawSpan=Math.max(1,Math.ceil(rawDuration/intervalMinutes));
        const remainingSlots=Math.max(1, s.length - slotIndex);
        const span=Math.min(rawSpan, remainingSlots);
        skipUntil=slotMin+(span * intervalMinutes);
        grid.insertAdjacentHTML("beforeend",`<div class="slot employee-row-colored${slotMin % 60 === 0 ? " full-hour-slot" : ""}" ${employeeRowStyle(emp, `grid-column:${gridColumn} / span ${span};grid-row:${gridRow};`)}><div class="${appointmentClass(a)}" data-id="${a.id}" draggable="true"><div class="name">${escapeHtml(a.customerName)} <span class="appointment-time-inline">${escapeHtml(a.startTime)}</span></div><div class="meta">${escapeHtml(a.serviceName||"Leistung")}</div><div class="meta appointment-phone-line">${escapeHtml(a.phone||"")}</div></div></div>`);
      }else{
        const fixedPosition = `grid-column:${gridColumn};grid-row:${gridRow};`;
        const pastIssue = isAppointmentDateTimeInPast(state.selectedDate, t) ? pastAppointmentWarningText() : "";
        const issue = pastIssue || employeeAvailabilityIssue(emp, state.selectedDate, t, getSlotIntervalMinutes());
        if(issue){
          if(pastIssue){
            grid.insertAdjacentHTML("beforeend",`<div class="slot employee-row-colored unavailable-slot past-slot${slotMin % 60 === 0 ? " full-hour-slot" : ""}" ${employeeRowStyle(emp, fixedPosition)} title="${escapeHtml(issue)}"></div>`);
          }else{
            grid.insertAdjacentHTML("beforeend",`<div class="slot employee-row-colored unavailable-slot${slotMin % 60 === 0 ? " full-hour-slot" : ""}" ${employeeRowStyle(emp, fixedPosition)} title="${escapeHtml(issue)}"><span class="slot-lock">Gesperrt</span></div>`);
          }
        }else{
          grid.insertAdjacentHTML("beforeend",`<div class="slot employee-row-colored ${slotMin % 60 === 0 ? 'full-hour-slot ' : ''}${selectedCalendarSlotMatches(emp.id, t) ? 'selected-free-slot' : ''}" ${employeeRowStyle(emp, fixedPosition)} data-employee="${emp.id}" data-time="${t}"></div>`);
        }
      }
    }
  }
  $("calendar").innerHTML="";
  const wrap=document.createElement("div");
  wrap.className="calendar-grid-wrap";
  wrap.appendChild(grid);
  $("calendar").appendChild(wrap);
  bindCalendarScrollFix();
  updateCalendarNameColumnLock();
  renderCurrentTimeLine(wrap);
  $("calendar").querySelectorAll(".slot[data-employee]").forEach(el=>{
    el.onclick=()=>{
      if(movingAppointmentId){
        moveAppointmentTo(el.dataset.employee, el.dataset.time);
        return;
      }
      if(isAppointmentDateTimeInPast(state.selectedDate, el.dataset.time)){
        clearSelectedCalendarSlot();
        showPastAppointmentWarning();
        renderCalendar();
        return;
      }
      setSelectedCalendarSlot(el.dataset.employee, el.dataset.time);
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
    const isTouchLike = (navigator.maxTouchPoints || 0) > 0 || window.matchMedia?.("(pointer: coarse)").matches || document.body.classList.contains("app-device-ipad") || document.body.classList.contains("app-device-iphone");
    el.draggable = !isTouchLike;
    el.ondragstart=(e)=>{
      if(isTouchLike){ e.preventDefault(); return false; }
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
      cleanupTouchDragAppointment({releaseEvent:e});
      el._dragStart = null;
      el._dragLatest = null;
      setTimeout(()=>{ suppressAppointmentClick=false; }, 150);
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


function updateCalendarNameColumnLock(){
  const calendar = $("calendar");
  if(!calendar) return;
  const grid = calendar.querySelector(".grid");
  if(!grid) return;
  // V138: Die Namensspalte bleibt wieder per echtem CSS-sticky links.
  // Die vorherige translateX-Korrektur hat auf iPad Safari die Scrollbreite
  // vergrößert und dadurch rechts leeren Platz sowie falsche Zeitlinien erzeugt.
  calendar.querySelectorAll(".corner,.employee-cell").forEach(el => {
    el.style.left = "0px";
    el.style.right = "auto";
    el.style.transform = "none";
  });
}

function bindCalendarScrollFix(){
  const calendar = $("calendar");
  if(!calendar || calendar.dataset.nameColumnScrollFixBound === "1") return;
  calendar.dataset.nameColumnScrollFixBound = "1";
  calendar.addEventListener("scroll", updateCalendarNameColumnLock, {passive:true});
  window.addEventListener("resize", updateCalendarNameColumnLock, {passive:true});
}

function renderCurrentTimeLine(wrap){
  if(state.selectedDate !== todayISO()) return;
  const pos = getCurrentTimeLinePosition({wrap});
  if(!pos) return;
  const left = pos.left;
  const line=document.createElement("div");
  line.className="current-time-line";
  line.style.left=left+"px";
  if(pos.headerHeight) line.style.top=pos.headerHeight+"px";
  const label=document.createElement("div");
  label.className="current-time-label";
  label.style.left=left+"px";
  if(pos.headerHeight) label.style.top=Math.max(4, Math.round((pos.headerHeight - 24) / 2))+"px";
  label.textContent=minutesToTime(pos.nowMin);
  wrap.appendChild(line);
  wrap.appendChild(label);
}

function getCurrentTimeLinePosition(options={}){
  if(state.selectedDate !== todayISO()) return null;
  const now=new Date();
  const realNowMin=now.getHours()*60+now.getMinutes();
  const interval=getSlotIntervalMinutes();

  const calendar = options.calendar || $("calendar");
  const scope = options.wrap || calendar || document;
  const grid = scope.querySelector ? scope.querySelector(".grid") : null;
  if(!grid) return null;

  const headers = Array.from(grid.querySelectorAll(".time-header[data-time]"));
  if(!headers.length) return null;

  const headerHeight = Math.round(Math.max(
    headers[0]?.getBoundingClientRect?.().height || 0,
    grid.querySelector(".corner")?.getBoundingClientRect?.().height || 0,
    42
  ));

  const slotInfo = headers.map(el => ({el, min:timeToMinutes(el.dataset.time || el.textContent || "00:00")}));
  const first = slotInfo[0];
  const last = slotInfo[slotInfo.length-1];
  if(!first || !last) return null;

  let targetMin = realNowMin;
  if(options.clamp){
    targetMin = Math.max(first.min, Math.min(last.min + interval, realNowMin));
  }else if(realNowMin < first.min || realNowMin > last.min + interval){
    // Wenn die aktuelle Uhrzeit außerhalb des angezeigten Plans liegt,
    // keine gelbe Linie anzeigen. Dadurch klebt 18:43 nicht rechts, wenn
    // der sichtbare Plan z.B. erst bei 19:15 beginnt.
    return null;
  }

  let current = null;
  for(let i=0;i<slotInfo.length;i++){
    const startMin = slotInfo[i].min;
    const endMin = startMin + interval;
    if(targetMin >= startMin && targetMin <= endMin){
      current = slotInfo[i];
      break;
    }
  }
  if(!current) current = targetMin < first.min ? first : last;

  const colWidth = Math.max(1, Math.round(current.el.getBoundingClientRect().width || current.el.offsetWidth || parseFloat(getComputedStyle(grid).getPropertyValue("--time-col")) || 160));
  const fraction = Math.max(0, Math.min(1, (targetMin - current.min) / interval));
  const left = Math.round(current.el.offsetLeft + fraction * colWidth);

  return {
    left,
    nowMin: realNowMin,
    scrollMin: targetMin,
    headerHeight
  };
}

function scrollCalendarToCurrentTime(options={}){
  const calendar = $("calendar");
  if(!calendar || state.selectedDate !== todayISO()) return;
  const pos = getCurrentTimeLinePosition({clamp:true});
  if(!pos) return;
  const maxLeft = Math.max(0, calendar.scrollWidth - calendar.clientWidth);
  const targetLeft = Math.max(0, Math.min(maxLeft, pos.left - Math.round(calendar.clientWidth * 0.35)));
  const behavior = options.smooth ? "smooth" : "auto";
  try{
    calendar.scrollTo({left:targetLeft, top:0, behavior});
  }catch(err){
    calendar.scrollLeft = targetLeft;
    calendar.scrollTop = 0;
  }
  updateCalendarNameColumnLock();
  setTimeout(updateCalendarNameColumnLock, 80);
}

function cancelDashboardReturnTimer(){
  if(dashboardReturnTimer){
    clearTimeout(dashboardReturnTimer);
    dashboardReturnTimer = null;
  }
}

function appointmentFormHasInput(){
  const ids = ["customerName","customerPhonePrefix","customerPhoneNumber","serviceName","note","startTime"];
  const hasText = ids.some(id => {
    const el = $(id);
    if(!el) return false;
    return String(el.value || "").trim() !== "";
  });
  const priceChanged = $("price") && Number($("price").value || 0) > 0;
  const durationChanged = $("duration") && String($("duration").value || "60") !== "60";
  const employeeAny = isEmployeeAnyActive();
  return hasText || priceChanged || durationChanged || employeeAny || !!editingAppointmentId;
}

function isUserWorkingOnAppointment(){
  const active = document.activeElement;
  const formPanel = document.querySelector(".appointment-form-panel");
  const inlineEdit = document.querySelector(".appointment-edit-form");
  const appointmentDialog = $("appointmentDialog");
  const paymentDialog = $("paymentDialog");
  return !!(
    appointmentFormHasInput() ||
    (formPanel && active && formPanel.contains(active)) ||
    (inlineEdit && active && inlineEdit.contains(active)) ||
    (appointmentDialog && appointmentDialog.open) ||
    (paymentDialog && paymentDialog.open)
  );
}

function bindDashboardReturnCancelOnAppointmentInput(){
  const ids = ["customerName","customerPhonePrefix","customerPhoneNumber","serviceName","price","duration","employeeSelect","startTime","note"];
  ids.forEach(id => {
    const el = $(id);
    if(!el || el.dataset.dashboardReturnCancelBound === "1") return;
    el.dataset.dashboardReturnCancelBound = "1";
    ["focus","input","change"].forEach(eventName => {
      el.addEventListener(eventName, cancelDashboardReturnTimer);
    });
  });
}

function closeDashboardOverlayDialogs(){
  ["appointmentDialog","paymentDialog"].forEach(id => {
    const dlg = $(id);
    if(dlg && dlg.open){
      try{ dlg.close(); }catch(err){}
    }
  });
}

function clearCustomerSearchView(){
  const input = $("customerSearchInput");
  if(input) input.value = "";
  renderCustomerSearch();
}

function returnDashboardToTodayNow(){
  dashboardReturnTimer = null;
  if(isUserWorkingOnAppointment()) return;
  closeDashboardOverlayDialogs();
  state.selectedDate = todayISO();
  if($("currentDateInput")) $("currentDateInput").value = state.selectedDate;
  saveState();
  switchTab("calendarTab");
  clearCustomerSearchView();
  renderCalendar();
  renderReport();
  requestAnimationFrame(() => scrollCalendarToCurrentTime({smooth:true}));
  setTimeout(() => scrollCalendarToCurrentTime({smooth:true}), 80);
  setTimeout(() => scrollCalendarToCurrentTime({smooth:false}), 350);
}

function scheduleDashboardReturnToTodayNow(delay=null){
  cancelDashboardReturnTimer();
  if(!isDashboardReturnEnabled()) return;
  const ms = normalizeDashboardReturnDelay(delay ?? getDashboardReturnDelay());
  dashboardReturnTimer = setTimeout(returnDashboardToTodayNow, ms);
}
function startCurrentTimeTicker(){
  setInterval(() => {
    if(!$("calendarTab").classList.contains("hidden")) renderCalendar();
  }, 60000);
}


function pastAppointmentWarningText(){
  return "Bitte neuen Termin wählen – diese Zeit liegt in der Vergangenheit.";
}

function isAppointmentDateTimeInPast(date, startTime){
  if(!date || !startTime) return false;
  const today = todayISO();
  if(date < today) return true;
  if(date > today) return false;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return timeToMinutes(startTime) < nowMin;
}

function showPastAppointmentWarning(){
  const text = pastAppointmentWarningText();
  let note = $("pastAppointmentWarning");
  if(!note){
    note = document.createElement("div");
    note.id = "pastAppointmentWarning";
    note.setAttribute("role", "alert");
    note.style.position = "fixed";
    note.style.left = "50%";
    note.style.top = "18px";
    note.style.transform = "translateX(-50%)";
    note.style.zIndex = "99999";
    note.style.maxWidth = "92vw";
    note.style.padding = "12px 16px";
    note.style.borderRadius = "14px";
    note.style.background = "#fff7ed";
    note.style.color = "#9a3412";
    note.style.border = "1px solid #fed7aa";
    note.style.boxShadow = "0 12px 30px rgba(0,0,0,.18)";
    note.style.fontWeight = "800";
    note.style.textAlign = "center";
    document.body.appendChild(note);
  }
  note.textContent = text;
  note.style.display = "block";
  clearTimeout(note._hideTimer);
  note._hideTimer = setTimeout(() => { note.style.display = "none"; }, 2600);
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
function activeEmployeesInScheduleOrder(selectedEmployeeId=""){
  const active = state.employees.filter(e => e.active).sort(byName);
  if(!selectedEmployeeId) return active;
  const selectedIndex = active.findIndex(e => e.id === selectedEmployeeId);
  if(selectedIndex < 0) return active;
  return active.slice(selectedIndex).concat(active.slice(0, selectedIndex));
}
function findNextFreeEmployeeForAnyAppointment(candidate, ignoreId, excludedEmployeeIds=[]){
  const excluded = new Set(excludedEmployeeIds.filter(Boolean));
  return activeEmployeesInScheduleOrder(candidate.employeeId).find(emp => {
    if(excluded.has(emp.id)) return false;
    const test = {...candidate, employeeId:emp.id};
    return !employeeAvailabilityIssue(emp, test.date, test.startTime, test.duration) && !findAppointmentConflict(test, ignoreId);
  }) || null;
}
function moveAnyAppointmentAwayFromFixedAppointment(fixedAppointment){
  const movedIds = new Set();
  const movedAppointments = [];
  const rollbackMovedAppointments = () => {
    movedAppointments.forEach(item => {
      item.appointment.employeeId = item.employeeId;
    });
  };
  let guard = 0;
  while(guard < 50){
    guard += 1;
    const conflict = findAppointmentConflict(fixedAppointment, fixedAppointment.id);
    if(!conflict) return true;
    if(movedIds.has(conflict.id) || !conflict.employeeAny || (conflict.status || "Gebucht") !== "Gebucht"){
      rollbackMovedAppointments();
      showAppointmentConflict(conflict);
      return false;
    }
    const freeEmployee = findNextFreeEmployeeForAnyAppointment(
      {...conflict, employeeId:fixedAppointment.employeeId},
      conflict.id,
      [fixedAppointment.employeeId]
    );
    if(!freeEmployee){
      rollbackMovedAppointments();
      showAnyEmployeeFullyBookedPopup();
      return false;
    }
    movedAppointments.push({appointment:conflict, employeeId:conflict.employeeId});
    conflict.employeeId = freeEmployee.id;
    movedIds.add(conflict.id);
  }
  rollbackMovedAppointments();
  showAnyEmployeeFullyBookedPopup();
  return false;
}
function showAnyEmployeeFullyBookedPopup(){
  const text = "Bitte UHRZEIT NEU wählen !!! Diese Uhrzeit sind alle besetzt";
  let popup = $("anyEmployeeBookedPopup");
  if(!popup){
    popup = document.createElement("div");
    popup.id = "anyEmployeeBookedPopup";
    popup.className = "any-employee-booked-popup hidden";
    popup.innerHTML = `
      <div class="any-employee-booked-box" role="alertdialog" aria-modal="true" aria-live="assertive">
        <p>${escapeHtml(text)}</p>
        <button type="button">OK</button>
      </div>`;
    document.body.appendChild(popup);
    popup.querySelector("button").onclick = () => popup.classList.add("hidden");
    popup.onclick = (event) => {
      if(event.target === popup) popup.classList.add("hidden");
    };
  }
  popup.querySelector("p").textContent = text;
  popup.classList.remove("hidden");
}
function showAppointmentConflict(conflict){
  const msg = t("appointmentConflictMessage")
    .replace("{customer}", conflict.customerName || t("customer"))
    .replace("{start}", conflict.startTime || "")
    .replace("{end}", appointmentEndTime(conflict));
  alert(t("appointmentConflictTitle") + "\n\n" + msg);
}
function saveAppointment(){
  const a={ id:editingAppointmentId||uid(), date:state.selectedDate, customerName:$("customerName").value.trim(), phone:combinePhoneFields(), serviceName:$("serviceName").value.trim(), price:Number($("price").value||0), duration:Number($("duration").value||60), employeeId:$("employeeSelect").value, employeeAny:isEmployeeAnyActive(), startTime:$("startTime").value, status:"Gebucht", note:$("note").value.trim() };
  const old = state.appointments.find(x=>x.id===a.id);
  if(old && (old.status==="Erledigt" || old.status==="Nicht erschienen")) a.status=old.status;
  if(!a.customerName||!a.employeeId||!a.startTime){ alert("Bitte Kunde, Mitarbeiter und Uhrzeit eintragen."); return; }
  if(isAppointmentDateTimeInPast(a.date, a.startTime)){ showPastAppointmentWarning(); return; }
  if(!Number.isFinite(a.duration) || a.duration < 1){ alert("Bitte eine gültige Dauer in Minuten eintragen."); return; }
  a.duration = Math.max(1, Math.round(a.duration));
  if(a.employeeAny){
    const freeEmployee = findNextFreeEmployeeForAnyAppointment(a, a.id);
    if(!freeEmployee){ showAnyEmployeeFullyBookedPopup(); return; }
    a.employeeId = freeEmployee.id;
  }else{
    const emp = state.employees.find(e => e.id === a.employeeId);
    const availabilityIssue = employeeAvailabilityIssue(emp, a.date, a.startTime, a.duration);
    if(availabilityIssue){ alert("Termin nicht möglich\n\n" + availabilityIssue); return; }
    if(!moveAnyAppointmentAwayFromFixedAppointment(a)) return;
  }
  state.appointments=state.appointments.filter(x=>x.id!==a.id); state.appointments.push(a); ensureCustomerFromAppointment(a); ensureServiceFromAppointment(a); saveState(); clearForm(); renderAll(); scheduleDashboardReturnToTodayNow();
}
function clearForm(){
  cancelDashboardReturnTimer();
  editingAppointmentId=null;
  clearSelectedCalendarSlot();
  ["customerName","customerPhonePrefix","customerPhoneNumber","serviceName","note","startTime"].forEach(id=>{ if($(id)) $(id).value=""; }); $("price").value="0"; $("duration").value="60"; setEmployeeAnyActive(false); $("serviceSuggestions").innerHTML="";
}
function showAppointment(id){
  clearSelectedCalendarSlot();
  selectedAppointmentId=id; const a=state.appointments.find(x=>x.id===id); const emp=state.employees.find(e=>e.id===a.employeeId);
  $("appointmentDetails").innerHTML=`<p><strong>${escapeHtml(a.customerName)}</strong></p><p>${escapeHtml(a.serviceName)} · ${escapeHtml(a.startTime)} · ${a.duration} Min</p><p>Mitarbeiter: ${escapeHtml(emp?.name||"")}</p><p>Telefon: ${escapeHtml(a.phone||"-")}</p><p>Status intern: ${escapeHtml(employeeDailyRevenueStatusLabel(a.status||"Gebucht"))}</p><p>Preis: ${money(a.price)}</p><p>Notiz: ${escapeHtml(a.note||"-")}</p>`;
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

  const sortedServices = state.services.slice().sort(byName);
  const hasCurrentService = sortedServices.some(s => String(s.name || "").trim().toLowerCase() === String(a.serviceName || "").trim().toLowerCase());
  const serviceOptions = [
    !hasCurrentService && a.serviceName ? `<option value="${escapeHtml(a.serviceName)}" selected>${escapeHtml(a.serviceName)} · aktueller Termin</option>` : "",
    ...sortedServices.map(s => `<option value="${escapeHtml(s.name)}" ${String(s.name || "").trim().toLowerCase() === String(a.serviceName || "").trim().toLowerCase() ? "selected" : ""}>${escapeHtml(s.name)} · ${money(s.price)} · ${s.duration} Min</option>`)
  ].join("");

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
      <label>Leistung auswählen
        <select id="editApptServiceName">${serviceOptions}</select>
      </label>
      <div class="grid-2 appointment-edit-date-time">
        <label>Datum
          <input id="editApptDate" type="date" value="${escapeHtml(a.date || state.selectedDate || todayISO())}">
        </label>
        <label>Uhrzeit
          <select id="editApptStartTime">${timeOptions}</select>
        </label>
      </div>
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
      </div>
      <label>Notiz
        <textarea id="editApptNote">${escapeHtml(a.note || "")}</textarea>
      </label>
      <div class="appointment-edit-actions">
        <button id="saveInlineAppointmentEditBtn" class="success">Änderungen speichern</button>
        <button id="cancelInlineAppointmentEditBtn" class="secondary">Abbrechen</button>
      </div>
      <small>Neue Leistungen werden mit Preis und Minuten automatisch in der Leistungsdatenbank gespeichert.</small>
    </div>`;

  const serviceSelect = $("editApptServiceName");
  if(serviceSelect){
    serviceSelect.onchange = () => {
      const selectedService = (state.services || []).find(s => String(s.name || "").trim().toLowerCase() === String(serviceSelect.value || "").trim().toLowerCase());
      if(selectedService){
        $("editApptPrice").value = Number(selectedService.price || 0);
        $("editApptDuration").value = Number(selectedService.duration || 60);
      }
    };
  }
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
    date: $("editApptDate").value || a.date,
    serviceName: $("editApptServiceName").value.trim(),
    price: Number($("editApptPrice").value || 0),
    duration: Number($("editApptDuration").value || 60),
    employeeId: $("editApptEmployee").value,
    employeeAny: !!($("editApptEmployeeAny") && $("editApptEmployeeAny").checked),
    startTime: $("editApptStartTime").value,
    note: $("editApptNote").value.trim()
  };

  if(!updated.customerName || !updated.employeeId || !updated.date || !updated.startTime){
    alert("Bitte Kunde, Datum, Mitarbeiter und Uhrzeit eintragen.");
    return;
  }
  if(isAppointmentDateTimeInPast(updated.date, updated.startTime) && (updated.date !== a.date || updated.startTime !== a.startTime)){
    showPastAppointmentWarning();
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

  if(updated.employeeAny){
    const freeEmployee = findNextFreeEmployeeForAnyAppointment(updated, updated.id);
    if(!freeEmployee){
      showAnyEmployeeFullyBookedPopup();
      return;
    }
    updated.employeeId = freeEmployee.id;
  }else{
    const emp = state.employees.find(e => e.id === updated.employeeId);
    const availabilityIssue = employeeAvailabilityIssue(emp, updated.date, updated.startTime, updated.duration);
    if(availabilityIssue){
      alert("Termin nicht möglich\n\n" + availabilityIssue);
      return;
    }

    if(!moveAnyAppointmentAwayFromFixedAppointment(updated)) return;
  }

  Object.assign(a, updated);
  state.selectedDate = a.date;
  if($("currentDateInput")) $("currentDateInput").value = a.date;
  ensureCustomerFromAppointment(a);
  ensureServiceFromAppointment(a);
  saveState();
  renderAll();
  showAppointment(a.id);
  scheduleDashboardReturnToTodayNow();
}
function paySelectedAppointment(){
  openPaymentForAppointment(selectedAppointmentId);
}

function openPaymentForAppointment(appointmentId){
  const a = (state.appointments || []).find(x => x.id === appointmentId);
  if(!a) return;
  selectedAppointmentId = appointmentId;

  // Terminfenster schließen und direkt in den Bezahlen-Bereich wechseln.
  try{ if($("appointmentDialog") && $("appointmentDialog").open) $("appointmentDialog").close(); }catch(err){}

  const matchedService = (state.services || []).find(s => String(s.name || "").trim().toLowerCase() === String(a.serviceName || "").trim().toLowerCase());
  const appointmentPrice = Number(a.price || 0) || Number(matchedService?.price || 0);
  paymentCart = [{
    id: uid(),
    sourceAppointmentId: a.id,
    serviceId: matchedService?.id,
    title: a.serviceName || matchedService?.name || t("appointment"),
    qty: 1,
    price: appointmentPrice
  }];
  paymentMethod = "Bar";
  if($("paymentDiscountInput")) $("paymentDiscountInput").value = "0";
  if($("paymentTipInput")) $("paymentTipInput").value = "0";

  openPaymentSystem({keepCart:true});

  // Nach dem Rendern den Kunden/Termin im Auswahlfeld anzeigen.
  setTimeout(() => {
    if($("paymentAppointmentSelect")){
      $("paymentAppointmentSelect").value = a.id;
    }
    renderPaymentCart();
  }, 0);
}
function noShowSelectedAppointment(){
  const a=state.appointments.find(x=>x.id===selectedAppointmentId); if(!a) return;
  a.status="Nicht erschienen";
  saveState(); $("appointmentDialog").close(); renderAll(); scheduleDashboardReturnToTodayNow();
}
function deleteSelectedAppointment(){ if(selectedAppointmentId && confirm("Termin wirklich löschen?")){ state.appointments=state.appointments.filter(a=>a.id!==selectedAppointmentId); saveState(); $("appointmentDialog").close(); renderAll(); scheduleDashboardReturnToTodayNow(); } }

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
  box.querySelectorAll(".search-result").forEach(el=>el.onclick=()=>{ const a=state.appointments.find(x=>x.id===el.dataset.id); if(a){ state.selectedDate=a.date; $("currentDateInput").value=a.date; saveState(); renderCalendar(); showAppointment(a.id); scheduleDashboardReturnToTodayNow(); }});
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


function employeeDailyRevenueStatusLabel(status){
  if(status === "Erledigt") return "Bezahlt";
  if(status === "Nicht erschienen") return "Nicht erschienen";
  return "Offen";
}
function employeeDailyRevenueStatusClass(status){
  if(status === "Erledigt") return "employee-daily-revenue-status-done";
  if(status === "Nicht erschienen") return "employee-daily-revenue-status-noshow";
  return "employee-daily-revenue-status-open";
}



function employeeRevenueVisual(employeeId, fallbackName){
  const employees = state.employees || [];
  const emp = employees.find(e => e.id === employeeId) || employees.find(e => (e.name || "") === (fallbackName || ""));
  if(!emp){
    return {name: fallbackName || t("withoutEmployee"), color: "#8a6f7f", rowColor: "#f7f2f5", badge: ""};
  }
  const idx = Math.max(0, employees.indexOf(emp));
  const pal = paletteColor(idx);
  return {
    name: emp.name || fallbackName || t("withoutEmployee"),
    color: emp.color || pal.accent,
    rowColor: emp.rowColor || pal.bg,
    badge: employmentTypeLabel(emp.workSettings?.employmentType)
  };
}
function employeeRevenueCardStyle(employeeId, fallbackName){
  const visual = employeeRevenueVisual(employeeId, fallbackName);
  return `--employee-row-bg:${escapeHtml(visual.rowColor)};--employee-accent:${escapeHtml(visual.color)}`;
}
function employeeRevenueNameHtml(employeeId, fallbackName){
  const visual = employeeRevenueVisual(employeeId, fallbackName);
  return `<div class="employee-revenue-name" style="--employee-row-bg:${escapeHtml(visual.rowColor)};--employee-accent:${escapeHtml(visual.color)}"><span class="employee-color-dot"></span><div><strong style="color:${escapeHtml(visual.color)}">${escapeHtml(visual.name)}</strong>${visual.badge ? `<br><small>${escapeHtml(visual.badge)}</small>` : ""}</div></div>`;
}

function employeeDailyRevenueRecordFromAppointment(a){
  const emp = (state.employees || []).find(e => e.id === a.employeeId);
  return {
    id: uid(),
    appointmentId: a.id,
    date: a.date,
    employeeId: a.employeeId || "none",
    employeeName: emp?.name || t("withoutEmployee"),
    startTime: a.startTime || "",
    customerName: a.customerName || t("customerFallback"),
    serviceName: a.serviceName || t("serviceFallback"),
    status: a.status || "Gebucht",
    price: Number(a.price || 0),
    originalServicePrice: Number(a.price || 0),
    createdAt: new Date().toISOString(),
    source: "mitarbeiter-umsatz"
  };
}
function ensureEmployeeDailyRevenueRecordsForDay(day){
  state.employeeDailyRevenueRecords = state.employeeDailyRevenueRecords || [];
  const apps = (state.appointments || []).filter(a => a.date === day);
  const appIds = new Set(apps.map(a => a.id));
  let changed = false;

  // Mitarbeiter Umsatz soll den Tagesplan beim Status identisch spiegeln:
  // Offen/Gebucht, Bezahlt und Nicht erschienen werden immer aus dem aktuellen Termin übernommen.
  // Manuell geänderte Beträge in Mitarbeiter Umsatz bleiben dabei erhalten.
  apps.forEach(a => {
    const emp = (state.employees || []).find(e => e.id === a.employeeId);
    const record = state.employeeDailyRevenueRecords.find(r => r.appointmentId === a.id);
    if(!record){
      state.employeeDailyRevenueRecords.push(employeeDailyRevenueRecordFromAppointment(a));
      changed = true;
      return;
    }

    const next = {
      date: a.date,
      employeeId: a.employeeId || "none",
      employeeName: emp?.name || t("withoutEmployee"),
      startTime: a.startTime || "",
      customerName: a.customerName || t("customerFallback"),
      serviceName: a.serviceName || t("serviceFallback"),
      status: a.status || "Gebucht"
    };
    Object.entries(next).forEach(([key, value]) => {
      if(record[key] !== value){
        record[key] = value;
        changed = true;
      }
    });
    // Den ursprünglichen Leistungsbetrag separat merken, damit Teilbeträge über den A-Button
    // vom Originalpreis abgezogen werden können, ohne Stammdaten oder Termin-Verknüpfungen zu ändern.
    if(record.originalServicePrice === undefined || record.originalServicePrice === null){
      record.originalServicePrice = Number(a.price || record.price || 0);
      changed = true;
    }
  });

  // Wenn ein Termin im Tagesplan gelöscht wurde, soll er auch aus Mitarbeiter Umsatz verschwinden.
  // Bereits einmalig nach Umsatz 2 übertragene Einträge bleiben dort separat gespeichert.
  const before = state.employeeDailyRevenueRecords.length;
  state.employeeDailyRevenueRecords = state.employeeDailyRevenueRecords.filter(r => r.date !== day || appIds.has(r.appointmentId));
  if(state.employeeDailyRevenueRecords.length !== before) changed = true;

  if(changed) saveState();
}
function employeeDailyRevenueRecordsForDay(day){
  state.employeeDailyRevenueRecords = state.employeeDailyRevenueRecords || [];
  return state.employeeDailyRevenueRecords.filter(r => r.date === day);
}
function employeeDailyRevenueRecordByAppointmentId(id){
  return (state.employeeDailyRevenueRecords || []).find(r => r.appointmentId === id);
}
function renderEmployeeDailyRevenue(){
  const list = $("employeeDailyRevenueList");
  if(!list) return;
  const day = getJournalDate();
  ensureEmployeeDailyRevenueRecordsForDay(day);
  const records = employeeDailyRevenueRecordsForDay(day).sort((a,b) => {
    return String(a.employeeName || t("withoutEmployee")).localeCompare(String(b.employeeName || t("withoutEmployee"))) || String(a.startTime || "").localeCompare(String(b.startTime || ""));
  });
  const groups = {};
  records.forEach(r => {
    const key = r.employeeId || "none";
    if(!groups[key]) groups[key] = {id: key, name: r.employeeName || t("withoutEmployee"), items: [], total: 0};
    groups[key].items.push(r);
    groups[key].total += Number(r.price || 0);
  });
  const paidTotal = records
    .filter(r => r.status === "Erledigt")
    .reduce((sum,r)=>sum + Number(r.price || 0), 0);
  const openTotal = records
    .filter(r => (r.status || "Gebucht") === "Gebucht")
    .reduce((sum,r)=>sum + Number(r.price || 0), 0);
  if($("employeeDailyRevenueDate")) $("employeeDailyRevenueDate").textContent = formatDateShort(day);
  if($("employeeDailyRevenuePaidTotal")) $("employeeDailyRevenuePaidTotal").textContent = money(paidTotal);
  if($("employeeDailyRevenueOpenTotal")) $("employeeDailyRevenueOpenTotal").textContent = money(openTotal);
  const groupList = Object.values(groups).sort((a,b)=>a.name.localeCompare(b.name));
  if(!groupList.length){
    list.innerHTML = `<p class="hint">${t("noAppointmentsToday")}</p>`;
    renderRevenue2();
    renderCashTab();
    return;
  }
  list.innerHTML = groupList.map(group => `
    <section class="employee-daily-revenue-card" style="${employeeRevenueCardStyle(group.id, group.name)}">
      <div class="employee-daily-revenue-head">
        ${employeeRevenueNameHtml(group.id, group.name)}
        <span>${group.items.length} ${t("customersCount")}</span>
        <b>${money(group.total)}</b>
      </div>
      <div class="employee-daily-revenue-rows">
        ${group.items.map(r => `
          <div class="employee-daily-revenue-row">
            <span class="employee-daily-revenue-time">${escapeHtml(r.startTime || "")}</span>
            <span class="employee-daily-revenue-customer">${escapeHtml(r.customerName || t("customerFallback"))}</span>
            <span class="employee-daily-revenue-service">${escapeHtml(r.serviceName || t("serviceFallback"))}</span>
            <select class="employee-daily-revenue-status employee-daily-revenue-status-select ${employeeDailyRevenueStatusClass(r.status || "Gebucht")}" data-employee-daily-status="${escapeHtml(r.appointmentId)}" title="${t("statusChangeTitle")}">
              <option value="Gebucht" ${(r.status || "Gebucht") === "Gebucht" ? "selected" : ""}>${t("openStatus")}</option>
              <option value="Erledigt" ${(r.status || "Gebucht") === "Erledigt" ? "selected" : ""}>${t("paidStatus")}</option>
              <option value="Nicht erschienen" ${(r.status || "Gebucht") === "Nicht erschienen" ? "selected" : ""}>${t("noShowStatus")}</option>
            </select>
            <input class="employee-daily-revenue-price" type="number" min="0" step="0.01" value="${Number(r.price || 0)}" data-employee-daily-price="${escapeHtml(r.appointmentId)}" title="${t("changeAmountTitle")}">
            <button type="button" class="employee-daily-revenue-save" data-employee-daily-save="${escapeHtml(r.appointmentId)}">${t("saveWord")}</button>
            <button type="button" class="employee-daily-revenue-delete danger" data-employee-daily-delete="${escapeHtml(r.appointmentId)}" ${(r.status || "Gebucht") === "Erledigt" ? 'disabled title="Bezahlte Kunden können nicht gelöscht werden"' : ''}>${t("delete")}</button>
            <div class="employee-daily-revenue-mini-actions">
              <button type="button" class="employee-daily-revenue-mini-btn employee-daily-revenue-done-open ${r.revenue2Done ? 'employee-daily-revenue-done-active' : ''}" data-employee-daily-done="${escapeHtml(r.appointmentId)}" title="Nur dieser E-Button übernimmt den Termin einmalig in Einnahme" ${r.revenue2Done ? 'disabled' : ''}>${r.revenue2Done ? '' : 'E'}</button>
              <button type="button" class="employee-daily-revenue-mini-btn employee-daily-revenue-a-open ${r.actionADone ? 'employee-daily-revenue-a-active' : ''}" data-employee-daily-action-a="${escapeHtml(r.appointmentId)}" title="Diesen Umsatz nach Aus der Kasse übernehmen" ${r.actionADone ? 'disabled' : ''}>${r.actionADone ? '' : 'A'}</button>
            </div>
          </div>`).join("")}
      </div>
    </section>`).join("");
  list.querySelectorAll('button[data-employee-daily-save]').forEach(btn => {
    btn.onclick = () => saveEmployeeDailyRevenuePrice(btn.dataset.employeeDailySave);
  });
  list.querySelectorAll('button[data-employee-daily-delete]').forEach(btn => {
    btn.onclick = () => deleteEmployeeDailyRevenueAppointment(btn.dataset.employeeDailyDelete);
  });
  list.querySelectorAll('button[data-employee-daily-done]').forEach(btn => {
    btn.onclick = () => markEmployeeDailyRevenueDoneForRevenue2(btn.dataset.employeeDailyDone);
  });
  list.querySelectorAll('button[data-employee-daily-action-a]').forEach(btn => {
    btn.onclick = () => markEmployeeDailyRevenueActionAUsed(btn.dataset.employeeDailyActionA);
  });
  list.querySelectorAll('select[data-employee-daily-status]').forEach(select => {
    select.onchange = () => changeEmployeeDailyRevenueStatus(select.dataset.employeeDailyStatus, select.value);
  });
  list.querySelectorAll('input[data-employee-daily-price]').forEach(input => {
    input.onkeydown = e => {
      if(e.key === 'Enter') saveEmployeeDailyRevenuePrice(input.dataset.employeeDailyPrice);
    };
  });
  renderRevenue2();
}

function markEmployeeDailyRevenueActionAUsed(id){
  ensureEmployeeDailyRevenueRecordsForDay(getJournalDate());
  state.revenue2CashEntries = state.revenue2CashEntries || [];
  const record = employeeDailyRevenueRecordByAppointmentId(id);
  if(!record || record.actionADone === true) return;

  // Beim A-Button wird der aktuell im Feld stehende Betrag übertragen.
  // Danach bleibt im Mitarbeiter-Umsatz-Feld automatisch der Rest vom ursprünglichen Leistungsbetrag stehen.
  const input = document.querySelector(`input[data-employee-daily-price="${CSS.escape(id)}"]`);
  const transferAmount = Number(input?.value ?? record.price ?? 0);
  if(!Number.isFinite(transferAmount) || transferAmount < 0){
    alert(t("validAmountSingleAlert"));
    return;
  }

  const appointment = (state.appointments || []).find(a => a.id === id);
  const originalAmount = Number(record.originalServicePrice ?? appointment?.price ?? record.price ?? 0);
  if(transferAmount > originalAmount){
    alert("Der übertragene Betrag darf nicht höher sein als der gespeicherte Leistungsbetrag.");
    return;
  }

  const cashRecord = {...record, price: transferAmount};
  if(!revenue2CashEntryByAppointmentId(id)){
    state.revenue2CashEntries.push(revenue2CashEntryFromRecord(cashRecord));
  }

  record.originalServicePrice = originalAmount;
  record.actionAPrice = transferAmount;
  record.price = Math.max(0, originalAmount - transferAmount);
  record.status = "Erledigt";
  if(appointment){
    appointment.status = "Erledigt";
  }
  record.actionADone = true;
  record.actionADoneAt = new Date().toISOString();
  record.updatedAt = new Date().toISOString();
  saveState();
  renderEmployeeDailyRevenue();
  renderRevenue2();
  renderCashTab();
  renderPeriodRevenue("week");
  renderPeriodRevenue("month");
}

function changeEmployeeDailyRevenueStatus(id, status){
  ensureEmployeeDailyRevenueRecordsForDay(getJournalDate());
  const allowed = ["Gebucht", "Erledigt", "Nicht erschienen"];
  const nextStatus = allowed.includes(status) ? status : "Gebucht";
  const record = employeeDailyRevenueRecordByAppointmentId(id);
  const appointment = (state.appointments || []).find(a => a.id === id);
  if(!record && !appointment) return;

  // Nur die Status-Auswahl im Reiter „Mitarbeiter Umsatz“ synchronisiert den Status mit dem Tagesplan.
  // Der grüne Button „Erledigt“ daneben bleibt unverändert und dient weiterhin nur der Übertragung nach „Einnahme“.
  if(record){
    record.status = nextStatus;
    record.updatedAt = new Date().toISOString();
  }
  if(appointment){
    appointment.status = nextStatus;
  }
  saveState();
  renderAll();
  renderEmployeeDailyRevenue();
  renderCashTab();
  renderPeriodRevenue("week");
  renderPeriodRevenue("month");
}

function saveEmployeeDailyRevenuePrice(id){
  ensureEmployeeDailyRevenueRecordsForDay(getJournalDate());
  const record = employeeDailyRevenueRecordByAppointmentId(id);
  if(!record) return;
  const input = document.querySelector(`input[data-employee-daily-price="${CSS.escape(id)}"]`);
  const price = Number(input?.value || 0);
  if(!Number.isFinite(price) || price < 0){
    alert(t("validAmountSingleAlert"));
    return;
  }
  record.price = price;
  // Wenn der Betrag im „Mitarbeiter Umsatz“ bewusst gespeichert wird, gilt er ab jetzt
  // als neue Leistungsbetrag-Basis für die Restbetrag-Berechnung des A-Buttons.
  // Das verändert keine Kundendaten, Leistungsdaten oder Tagesplan-Verknüpfungen.
  if(record.actionADone !== true){
    record.originalServicePrice = price;
    record.manualServicePriceSavedAt = new Date().toISOString();
  }
  record.updatedAt = new Date().toISOString();
  saveState();
  renderEmployeeDailyRevenue();
  renderRevenue2();
  renderCashTab();
  renderPeriodRevenue("week");
  renderPeriodRevenue("month");
}

function deleteEmployeeDailyRevenueAppointment(id){
  ensureEmployeeDailyRevenueRecordsForDay(getJournalDate());
  const record = employeeDailyRevenueRecordByAppointmentId(id);
  const appointment = (state.appointments || []).find(a => a.id === id);
  if(!record && !appointment) return;
  const currentStatus = record?.status || appointment?.status || "Gebucht";
  if(currentStatus === "Erledigt"){
    alert("Bezahlte Kunden können im Mitarbeiter Umsatz nicht gelöscht werden.");
    renderEmployeeDailyRevenue();
    return;
  }
  const name = record?.customerName || appointment?.customerName || "diesen Termin";
  if(!confirm("Termin wirklich löschen ?")) return;

  // Löschen in „Mitarbeiter Umsatz“ entfernt den Termin aus der Tagesplan-Datenbasis
  // und aus der Mitarbeiter-Umsatz-Liste. Umsatz-2-Einträge werden bewusst NICHT gelöscht.
  state.appointments = (state.appointments || []).filter(a => a.id !== id);
  state.employeeDailyRevenueRecords = (state.employeeDailyRevenueRecords || []).filter(r => r.appointmentId !== id);

  if(selectedAppointmentId === id){
    selectedAppointmentId = null;
    if($("appointmentDialog")?.open) $("appointmentDialog").close();
  }

  saveState();
  renderAll();
  renderEmployeeDailyRevenue();
  renderRevenue2();
  renderCashTab();
  renderPeriodRevenue("week");
  renderPeriodRevenue("month");
}


function cashWithdrawalsForDay(day){
  state.cashWithdrawals = state.cashWithdrawals || [];
  return state.cashWithdrawals.filter(item => item.date === day);
}

function cashDepositsForDay(day){
  state.cashDeposits = state.cashDeposits || [];
  return state.cashDeposits.filter(item => item.date === day);
}

function renderCashTab(){
  const revenueList = $("cashEmployeeRevenueList");
  const depositList = $("cashDepositList");
  const withdrawalList = $("cashWithdrawalList");
  if(!revenueList && !depositList && !withdrawalList) return;
  const day = getJournalDate();
  ensureEmployeeDailyRevenueRecordsForDay(day);
  const records = employeeDailyRevenueRecordsForDay(day).filter(r => r.status === "Erledigt").slice().sort((a,b)=>{
    return String(a.employeeName || t("withoutEmployee")).localeCompare(String(b.employeeName || t("withoutEmployee"))) || String(a.startTime || "").localeCompare(String(b.startTime || ""));
  });
  const groups = {};
  records.forEach(r => {
    const key = r.employeeId || r.employeeName || "none";
    if(!groups[key]) groups[key] = {id:key, name:r.employeeName || t("withoutEmployee"), count:0, total:0};
    groups[key].count += 1;
    groups[key].total += Number(r.price || 0);
  });
  const rawTotal = records.reduce((sum,r)=>sum + Number(r.price || 0), 0);
  const total = journalDayTotal(day);
  const hasManualTotal = journalDayHasManualTotal(day);
  const adjustment = total - rawTotal;
  if($("cashDate")) $("cashDate").textContent = formatDateShort(day);
  if($("cashEmployeeRevenueTotal")) $("cashEmployeeRevenueTotal").textContent = money(total);
  if(revenueList){
    const groupList = Object.values(groups).sort((a,b)=>a.name.localeCompare(b.name));
    const rowsHtml = groupList.length ? groupList.map(group => `
      <div class="cash-employee-row" style="${employeeRevenueCardStyle(group.id, group.name)}">
        ${employeeRevenueNameHtml(group.id, group.name)}
        <span>${group.count} bezahlt</span>
        <strong>${money(group.total)}</strong>
      </div>`).join("") : `<p class="hint">${t("noPaidRevenueToday")}</p>`;
    const manualHtml = hasManualTotal ? `
      <div class="cash-employee-row cash-journal-sync-row">
        <span>Wochen-/Monatsumsatz</span>
        <span>${journalDayDeleted(day) ? "Tag gelöscht" : "Korrektur"}</span>
        <strong>${money(adjustment)}</strong>
      </div>` : "";
    revenueList.innerHTML = rowsHtml + manualHtml;
  }

  const deposits = cashDepositsForDay(day).slice().sort((a,b)=>String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  const depositTotal = deposits.reduce((sum,item)=>sum + Number(item.amount || 0), 0);
  if($("cashDepositTotal")) $("cashDepositTotal").textContent = money(depositTotal);
  if(depositList){
    depositList.innerHTML = deposits.length ? deposits.map(item => `
      <div class="cash-withdrawal-row cash-deposit-row">
        <span>${escapeHtml(item.reason || "Einzahlung")}</span>
        <strong>${money(item.amount || 0)}</strong>
        <button type="button" class="cash-withdrawal-delete danger" data-cash-deposit-delete="${escapeHtml(item.id)}">${t("delete")}</button>
      </div>`).join("") : '<p class="hint">Noch keine Einzahlung eingetragen.</p>';
    depositList.querySelectorAll('button[data-cash-deposit-delete]').forEach(btn => {
      btn.onclick = () => deleteCashDeposit(btn.dataset.cashDepositDelete);
    });
  }

  const withdrawals = cashWithdrawalsForDay(day).slice().sort((a,b)=>String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  const withdrawalTotal = withdrawals.reduce((sum,item)=>sum + Number(item.amount || 0), 0);
  const currentBalance = total + depositTotal - withdrawalTotal;
  if($("cashWithdrawalTotal")) $("cashWithdrawalTotal").textContent = money(withdrawalTotal);
  if($("cashCurrentBalance")) $("cashCurrentBalance").textContent = money(currentBalance);
  if(withdrawalList){
    withdrawalList.innerHTML = withdrawals.length ? withdrawals.map(item => `
      <div class="cash-withdrawal-row">
        <span>${escapeHtml(item.reason || "Entnahme")}</span>
        <strong>${money(item.amount || 0)}</strong>
        <button type="button" class="cash-withdrawal-delete danger" data-cash-withdrawal-delete="${escapeHtml(item.id)}">${t("delete")}</button>
      </div>`).join("") : '<p class="hint">Noch keine Geldentnahme eingetragen.</p>';
    withdrawalList.querySelectorAll('button[data-cash-withdrawal-delete]').forEach(btn => {
      btn.onclick = () => deleteCashWithdrawal(btn.dataset.cashWithdrawalDelete);
    });
  }
}

function addCashWithdrawal(){
  const reasonInput = $("cashWithdrawalReason");
  const amountInput = $("cashWithdrawalAmount");
  const reason = (reasonInput?.value || "").trim();
  const amount = Number(amountInput?.value || 0);
  if(!reason){ alert("Bitte eintragen, wofür Geld entnommen wurde."); return; }
  if(!Number.isFinite(amount) || amount <= 0){ alert(t("validAmountSingleAlert")); return; }
  state.cashWithdrawals = state.cashWithdrawals || [];
  state.cashWithdrawals.push({ id: uid(), date: getJournalDate(), reason, amount, createdAt: new Date().toISOString() });
  saveState();
  if(reasonInput) reasonInput.value = "";
  if(amountInput) amountInput.value = "";
  renderCashTab();
}

function addCashDeposit(){
  const reasonInput = $("cashDepositReason");
  const amountInput = $("cashDepositAmount");
  const reason = (reasonInput?.value || "").trim();
  const amount = Number(amountInput?.value || 0);
  if(!reason){ alert("Bitte eine Bezeichnung für die Einzahlung eintragen."); return; }
  if(!Number.isFinite(amount) || amount <= 0){ alert(t("validAmountSingleAlert")); return; }
  state.cashDeposits = state.cashDeposits || [];
  state.cashDeposits.push({ id: uid(), date: getJournalDate(), reason, amount, createdAt: new Date().toISOString() });
  saveState();
  if(reasonInput) reasonInput.value = "";
  if(amountInput) amountInput.value = "";
  renderCashTab();
}

function deleteCashDeposit(id){
  state.cashDeposits = state.cashDeposits || [];
  const item = state.cashDeposits.find(x => x.id === id);
  if(!item) return;
  if(!confirm(`Einzahlung „${item.reason || "Einzahlung"}“ wirklich löschen?`)) return;
  state.cashDeposits = state.cashDeposits.filter(x => x.id !== id);
  saveState();
  renderCashTab();
}

function deleteCashWithdrawal(id){
  state.cashWithdrawals = state.cashWithdrawals || [];
  const item = state.cashWithdrawals.find(x => x.id === id);
  if(!item) return;
  if(!confirm(`Geldentnahme „${item.reason || "Entnahme"}“ wirklich löschen?`)) return;
  state.cashWithdrawals = state.cashWithdrawals.filter(x => x.id !== id);
  saveState();
  renderCashTab();
}

function revenue2EntryFromRecord(record){
  return {
    id: uid(),
    appointmentId: record.appointmentId,
    date: record.date,
    employeeId: record.employeeId || "none",
    employeeName: record.employeeName || t("withoutEmployee"),
    startTime: record.startTime || "",
    customerName: record.customerName || t("customerFallback"),
    serviceName: record.serviceName || t("serviceFallback"),
    price: Number(record.price || 0),
    createdAt: new Date().toISOString(),
    source: "mitarbeiter-umsatz-erledigt-button"
  };
}
function revenue2CashEntryFromRecord(record){
  return {
    id: uid(),
    appointmentId: record.appointmentId,
    date: record.date,
    employeeId: record.employeeId || "none",
    employeeName: record.employeeName || t("withoutEmployee"),
    startTime: record.startTime || "",
    customerName: record.customerName || t("customerFallback"),
    serviceName: record.serviceName || t("serviceFallback"),
    price: Number(record.price || 0),
    createdAt: new Date().toISOString(),
    source: "mitarbeiter-umsatz-a-button"
  };
}
function revenue2EntriesForDay(day){
  state.revenue2Entries = state.revenue2Entries || [];
  return state.revenue2Entries.filter(entry => entry.date === day);
}
function revenue2CashEntriesForDay(day){
  state.revenue2CashEntries = state.revenue2CashEntries || [];
  return state.revenue2CashEntries.filter(entry => entry.date === day);
}
function revenue2EntryByAppointmentId(id){
  return (state.revenue2Entries || []).find(entry => entry.appointmentId === id);
}
function revenue2CashEntryByAppointmentId(id){
  return (state.revenue2CashEntries || []).find(entry => entry.appointmentId === id);
}
function markEmployeeDailyRevenueDoneForRevenue2(id){
  ensureEmployeeDailyRevenueRecordsForDay(getJournalDate());
  state.revenue2Entries = state.revenue2Entries || [];
  const record = employeeDailyRevenueRecordByAppointmentId(id);
  if(!record) return;
  // Wichtig: Nur dieser Button im Reiter „Mitarbeiter Umsatz“ überträgt den Betrag einmalig nach „Umsatz 2“.
  // Der Termin-Status in „Mitarbeiter Umsatz“ bleibt unverändert.
  // Nach der ersten Übertragung ist der Button gesperrt; spätere Änderungen/Löschungen im Mitarbeiter Umsatz wirken nicht auf Umsatz 2.
  if(record.revenue2Done === true) return;
  if(!revenue2EntryByAppointmentId(id)){
    state.revenue2Entries.push(revenue2EntryFromRecord(record));
  }
  record.revenue2Done = true;
  record.revenue2DoneAt = new Date().toISOString();
  saveState();
  renderEmployeeDailyRevenue();
  renderRevenue2();
}

function revenue2EntryPrice(entry){
  return Number(entry.price || 0);
}

function revenue2EntryByKindAndAppointmentId(id, kind){
  return kind === "cash" ? revenue2CashEntryByAppointmentId(id) : revenue2EntryByAppointmentId(id);
}

function saveRevenue2Price(id, kind = "employee"){
  const entry = revenue2EntryByKindAndAppointmentId(id, kind);
  if(!entry) return;
  const input = document.querySelector(`input[data-revenue2-price="${CSS.escape(id)}"][data-revenue2-kind="${CSS.escape(kind)}"]`);
  const price = Number(input?.value || 0);
  if(!Number.isFinite(price) || price < 0){
    alert(t("validAmountSingleAlert"));
    return;
  }
  entry.price = price;
  entry.updatedAt = new Date().toISOString();
  saveState();
  renderRevenue2();
}

function deleteRevenue2Entry(id, kind = "employee"){
  state.revenue2Entries = state.revenue2Entries || [];
  state.revenue2DeletedAppointmentIds = state.revenue2DeletedAppointmentIds || [];
  state.revenue2CashEntries = state.revenue2CashEntries || [];
  state.revenue2CashDeletedAppointmentIds = state.revenue2CashDeletedAppointmentIds || [];
  const entry = revenue2EntryByKindAndAppointmentId(id, kind);
  if(!entry) return;
  const name = entry.customerName || "diesen Eintrag";
  if(!confirm(`Eintrag von ${name} wirklich aus Einnahme löschen?`)) return;

  if(kind === "cash"){
    state.revenue2CashEntries = state.revenue2CashEntries.filter(x => x.appointmentId !== id);
    if(!state.revenue2CashDeletedAppointmentIds.includes(id)){
      state.revenue2CashDeletedAppointmentIds.push(id);
    }
  } else {
    state.revenue2Entries = state.revenue2Entries.filter(x => x.appointmentId !== id);
    if(!state.revenue2DeletedAppointmentIds.includes(id)){
      state.revenue2DeletedAppointmentIds.push(id);
    }
  }

  // Mitarbeiter Umsatz bleibt vollständig unverändert. Bereits gedrückte E- und A-Buttons bleiben gesperrt/grau.
  saveState();
  renderRevenue2();
}


function ensureRevenue2SnapshotsForDay(day){
  state.revenue2Entries = state.revenue2Entries || [];
  state.revenue2CashEntries = state.revenue2CashEntries || [];
  state.revenue2DeletedAppointmentIds = state.revenue2DeletedAppointmentIds || [];
  state.revenue2CashDeletedAppointmentIds = state.revenue2CashDeletedAppointmentIds || [];
  let changed = false;
  (state.employeeDailyRevenueRecords || []).forEach(record => {
    if(record.date === day && record.revenue2Done === true && !(state.revenue2DeletedAppointmentIds || []).includes(record.appointmentId) && !revenue2EntryByAppointmentId(record.appointmentId)){
      state.revenue2Entries.push({
        id: uid(),
        appointmentId: record.appointmentId,
        date: record.date,
        employeeId: record.employeeId || "none",
        employeeName: record.employeeName || t("withoutEmployee"),
        startTime: record.startTime || "",
        customerName: record.customerName || t("customerFallback"),
        serviceName: record.serviceName || t("serviceFallback"),
        price: Number(record.revenue2Price !== undefined && record.revenue2Price !== null ? record.revenue2Price : record.price || 0),
        createdAt: record.revenue2DoneAt || new Date().toISOString(),
        source: "mitarbeiter-umsatz-erledigt-button"
      });
      changed = true;
    }
    if(record.date === day && record.actionADone === true && !(state.revenue2CashDeletedAppointmentIds || []).includes(record.appointmentId) && !revenue2CashEntryByAppointmentId(record.appointmentId)){
      state.revenue2CashEntries.push({
        id: uid(),
        appointmentId: record.appointmentId,
        date: record.date,
        employeeId: record.employeeId || "none",
        employeeName: record.employeeName || t("withoutEmployee"),
        startTime: record.startTime || "",
        customerName: record.customerName || t("customerFallback"),
        serviceName: record.serviceName || t("serviceFallback"),
        price: Number(record.actionAPrice !== undefined && record.actionAPrice !== null ? record.actionAPrice : record.price || 0),
        createdAt: record.actionADoneAt || new Date().toISOString(),
        source: "mitarbeiter-umsatz-a-button"
      });
      changed = true;
    }
  });
  if(changed) saveState();
}

function revenue2Sorted(records){
  return records.slice().sort((a,b)=>{
    return String(a.employeeName || t("withoutEmployee")).localeCompare(String(b.employeeName || t("withoutEmployee"))) || String(a.startTime || "").localeCompare(String(b.startTime || ""));
  });
}

function renderRevenue2Box(list, records, kind, emptyText){
  if(!list) return;
  const groups = {};
  records.forEach(r => {
    const key = r.employeeId || r.employeeName || "none";
    if(!groups[key]) groups[key] = {id: key, name:r.employeeName || t("withoutEmployee"), items:[], total:0};
    groups[key].items.push(r);
    groups[key].total += revenue2EntryPrice(r);
  });
  const groupList = Object.values(groups).sort((a,b)=>a.name.localeCompare(b.name));
  if(!groupList.length){
    list.innerHTML = `<p class="hint">${emptyText}</p>`;
    return;
  }
  list.innerHTML = groupList.map(group => `
    <section class="revenue2-card" style="${employeeRevenueCardStyle(group.id, group.name)}">
      <div class="revenue2-head">
        ${employeeRevenueNameHtml(group.id, group.name)}
        <span>${group.items.length} ${t("customersCount")}</span>
        <b>${money(group.total)}</b>
      </div>
      <div class="revenue2-rows">
        ${group.items.map(r=>`
          <div class="revenue2-row">
            <span>${escapeHtml(r.startTime || "")}</span>
            <span><strong>${escapeHtml(r.customerName || t("customerFallback"))}</strong></span>
            <span>${escapeHtml(r.serviceName || t("serviceFallback"))}</span>
            <input class="revenue2-price" type="number" min="0" step="0.01" value="${revenue2EntryPrice(r)}" data-revenue2-price="${escapeHtml(r.appointmentId)}" data-revenue2-kind="${escapeHtml(kind)}" title="${t("changeIncomeAmountTitle")}">
            <button type="button" class="revenue2-save" data-revenue2-save="${escapeHtml(r.appointmentId)}" data-revenue2-kind="${escapeHtml(kind)}">${t("saveWord")}</button>
            <button type="button" class="revenue2-delete danger" data-revenue2-delete="${escapeHtml(r.appointmentId)}" data-revenue2-kind="${escapeHtml(kind)}">${t("delete")}</button>
          </div>`).join("")}
      </div>
    </section>`).join("");
}

function renderRevenue2(){
  const employeeList = $("revenue2EmployeeList");
  const cashList = $("revenue2CashList");
  if(!employeeList || !cashList) return;
  const day = getJournalDate();
  ensureRevenue2SnapshotsForDay(day);
  const records = revenue2Sorted(revenue2EntriesForDay(day));
  const cashRecords = revenue2Sorted(revenue2CashEntriesForDay(day));
  const savedRevenue2Total = records.reduce((sum,r)=>sum + revenue2EntryPrice(r), 0);
  const cashRevenueTotal = cashRecords.reduce((sum,r)=>sum + revenue2EntryPrice(r), 0);
  const remainingCashTotal = savedRevenue2Total - cashRevenueTotal;
  if($("revenue2Date")) $("revenue2Date").textContent = formatDateShort(day);
  if($("revenue2SavedTotal")) $("revenue2SavedTotal").textContent = money(savedRevenue2Total);
  if($("revenue2EmployeeTotal")) $("revenue2EmployeeTotal").textContent = money(cashRevenueTotal);
  if($("revenue2Total")) $("revenue2Total").textContent = money(remainingCashTotal);
  if($("revenue2CalculationLine")) $("revenue2CalculationLine").textContent = `${t("employeeIncome")}: ${money(savedRevenue2Total)} - ${t("fromCashRegister")}: ${money(cashRevenueTotal)} = ${t("remainingCash")}: ${money(remainingCashTotal)}`;
  if($("revenue2Count")) $("revenue2Count").textContent = String(records.length + cashRecords.length);
  if($("revenue2EmployeePanelTotal")) $("revenue2EmployeePanelTotal").textContent = money(savedRevenue2Total);
  if($("revenue2CashPanelTotal")) $("revenue2CashPanelTotal").textContent = money(cashRevenueTotal);
  renderRevenue2Box(employeeList, records, "employee", t("noRevenue2EmployeeEntries"));
  renderRevenue2Box(cashList, cashRecords, "cash", t("noRevenue2CashEntries"));
  document.querySelectorAll('button[data-revenue2-save]').forEach(btn => {
    btn.onclick = () => saveRevenue2Price(btn.dataset.revenue2Save, btn.dataset.revenue2Kind || "employee");
  });
  document.querySelectorAll('button[data-revenue2-delete]').forEach(btn => {
    btn.onclick = () => deleteRevenue2Entry(btn.dataset.revenue2Delete, btn.dataset.revenue2Kind || "employee");
  });
  document.querySelectorAll('input[data-revenue2-price]').forEach(input => {
    input.onkeydown = e => {
      if(e.key === 'Enter') saveRevenue2Price(input.dataset.revenue2Price, input.dataset.revenue2Kind || "employee");
    };
  });
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
      if(!groups[empId]) groups[empId] = {name: emp?.name || t("withoutEmployee"), items: [], total:0};
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
              <span class="report-customer-name">${escapeHtml(a.customerName || t("customerFallback"))}</span>
              <span class="report-customer-service">${escapeHtml(a.serviceName || t("serviceFallback"))}</span>
              <strong>${money(excluded ? 0 : a.price)}</strong>
            </div>`).join("")}
        </div>
      </div>`).join("") : `<small>${t("noPaidCustomers")}</small>`;
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
    ? t("dayExcludedStatus")
    : t("dayIncludedStatus");
  if($('revenueIncludeDayBtn')) $('revenueIncludeDayBtn').disabled = !excluded;
  if($('revenueExcludeDayBtn')) $('revenueExcludeDayBtn').disabled = excluded;

  const apps = (state.appointments || []).filter(a=>a.date===day).sort((a,b)=>{
    const empA = (state.employees || []).find(e=>e.id===a.employeeId)?.name || t("withoutEmployee");
    const empB = (state.employees || []).find(e=>e.id===b.employeeId)?.name || t("withoutEmployee");
    return empA.localeCompare(empB) || (a.startTime||'').localeCompare(b.startTime||'');
  });
  if($('revenueEditAppointments')){
    if(apps.length){
      const grouped = apps.reduce((acc,a)=>{
        const emp = (state.employees || []).find(e=>e.id===a.employeeId);
        const key = emp?.id || 'none';
        if(!acc[key]) acc[key] = {name: emp?.name || t("withoutEmployee"), items: []};
        acc[key].items.push(a);
        return acc;
      },{});
      $('revenueEditAppointments').innerHTML = Object.values(grouped).map(group=>`
        <section class="revenue-employee-group">
          <div class="revenue-employee-header">${escapeHtml(group.name)} <span>${group.items.length} ${t("appointments")}</span></div>
          ${group.items.map(a=>`<div class="daily-item revenue-edit-item compact-revenue-item">
            <div class="revenue-appointment-info">
              <strong>${escapeHtml(a.startTime || '')} · ${escapeHtml(a.customerName || '')}</strong>
              <small>${escapeHtml(a.serviceName || 'Leistung')} · ${escapeHtml(a.durationMinutes || a.duration || '')} Min · Status: ${escapeHtml(a.status || 'Gebucht')}</small>
            </div>
            <div class="revenue-edit-controls">
              <input type="number" step="0.01" value="${Number(a.price||0)}" data-revenue-price="${a.id}" title="${t("priceLabel")}">
              <select data-revenue-status="${a.id}" title="Status">
                <option value="Gebucht" ${a.status==='Gebucht'?'selected':''}>Gebucht</option>
                <option value="Erledigt" ${a.status==='Erledigt'?'selected':''}>${t("paidStatus")}</option>
                <option value="Nicht erschienen" ${a.status==='Nicht erschienen'?'selected':''}>${t("noShowStatus")}</option>
              </select>
              <button type="button" data-revenue-save="${a.id}">${t("saveWord")}</button>
              <button type="button" class="danger" data-revenue-delete="${a.id}">${t("delete")}</button>
            </div>
          </div>`).join('')}
        </section>`).join('');
    }else{
      $('revenueEditAppointments').innerHTML = `<small>${t("noAppointmentsOnDay")}</small>`;
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
      <button type="button" class="danger" data-manual-revenue-delete="${x.id}">${t("delete")}</button>
    </div>`).join('') : `<small>${t("noManualRevenueItems")}</small>`;
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
  $("scheduleIntervalMinutes") && ($("scheduleIntervalMinutes").value = String(normalizeScheduleIntervalMinutes(state.scheduleIntervalMinutes || 15)));
  $("reportPrintFormat") && ($("reportPrintFormat").value = normalizeReportPrintFormat(state.reportPrintFormat || "a4"));
  updateDisplayModeHint();
  $("settingsStudioName").value=state.studioName;
  $("dashboardReturnEnabled") && ($("dashboardReturnEnabled").checked = isDashboardReturnEnabled());
  setDashboardReturnDelayControls(getDashboardReturnDelay());
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
  renderCashTab();
  renderWorkTimeList();
  renderSettingsCustomerList();
  renderServiceList();
  $("settingsDialog").showModal();
}
function closeSettingsWithSave(){
  saveSettings(true);
  $("settingsDialog") && $("settingsDialog").close();
}
function saveSettings(silent=false){
  const previousOpenTime = state.openTime || "08:00";
  const previousCloseTime = state.closeTime || "20:00";
  state.studioName=$("settingsStudioName").value.trim()||state.studioName;
  state.studioPhone=$("settingsStudioPhone").value.trim();
  state.studioAddress=$("settingsStudioAddress").value.trim();
  state.revenueEnabled = $("toggleRevenueFeature") ? $("toggleRevenueFeature").checked : state.revenueEnabled;
  state.displayDeviceMode = $("displayDeviceMode") ? normalizeDisplayDeviceMode($("displayDeviceMode").value) : normalizeDisplayDeviceMode(state.displayDeviceMode || "auto");
  state.scheduleZoom = $("scheduleZoom") ? normalizeScheduleZoom($("scheduleZoom").value) : normalizeScheduleZoom(state.scheduleZoom || "normal");
  state.scheduleIntervalMinutes = $("scheduleIntervalMinutes") ? normalizeScheduleIntervalMinutes($("scheduleIntervalMinutes").value) : normalizeScheduleIntervalMinutes(state.scheduleIntervalMinutes || 15);
  state.dashboardReturnEnabled = $("dashboardReturnEnabled") ? $("dashboardReturnEnabled").checked : isDashboardReturnEnabled();
  state.dashboardReturnDelayMs = getDashboardReturnDelayFromControls();
  if(!state.dashboardReturnEnabled) cancelDashboardReturnTimer();
  state.reportPrintFormat = $("reportPrintFormat") ? normalizeReportPrintFormat($("reportPrintFormat").value) : normalizeReportPrintFormat(state.reportPrintFormat || "a4");
  state.openTime=$("settingsOpen").value||state.openTime;
  state.closeTime=$("settingsClose").value||state.closeTime;
  syncDefaultEmployeeWorkTimesWithStudioHours(previousOpenTime, previousCloseTime, state.openTime, state.closeTime);
  saveState(); applyDeviceView(); renderAll(); applyRevenueVisibility();
  if(!silent) alert("Studio-Einstellungen gespeichert.");
}


function getPastCompletedCleanupCandidates(){
  const today = todayISO();
  // Bereinigung + Backup löscht alle Termine von heute und Vergangenheit –
  // unabhängig vom Status: offen/gebucht, bezahlt oder nicht erschienen.
  // Nur Termine in der Zukunft bleiben erhalten.
  return (state.appointments || []).filter(a => a && a.date <= today);
}

function updateCleanupPreview(){
  const el = $("cleanupPreview");
  if(!el) return;
  el.textContent = state.language === "vi"
    ? "Tất cả lịch hẹn hôm nay và quá khứ cùng toàn bộ doanh thu trong Nhật ký doanh thu, Doanh thu nhân viên, Thu nhập, Kassa, Doanh thu tuần và Doanh thu tháng sẽ bị xóa. Sau đó bản sao lưu sẽ được tạo. Chỉ lịch hẹn tương lai được giữ lại."
    : state.language === "en"
      ? "All appointments from today and the past plus all revenue data from Employee Revenue, Income, Cash Register, Weekly Revenue and Monthly Revenue will be deleted. Then a backup will be created. Only future appointments remain."
      : "Alle Termine von heute und Vergangenheit sowie alle Umsätze aus Mitarbeiter Umsatz, Einnahme, Kasse, Wochen Umsatz und Monat Umsatz werden gelöscht. Danach wird ein Backup erstellt. Nur Zukunft-Termine bleiben erhalten.";
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
      appVersion:"3.17",
      note:type === "Bereinigung"
        ? "Backup nach Bereinigung: Alle Termine von heute und Vergangenheit sowie alle Umsatzdaten aus Mitarbeiter Umsatz, Einnahme, Kasse, Wochen Umsatz und Monat Umsatz wurden vorher endgültig entfernt. Nur Zukunft-Termine bleiben erhalten."
        : "Normales Backup."
    },
    data:{...state, version:"3.02"}
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

function clearAllRevenueAndAppointmentData(){
  // Vollbereinigung: Nur Umsatz- und Terminplan-Daten werden entfernt.
  // Stammdaten wie Kundendatenbank, Leistungsdatenbank, Mitarbeiter und Einstellungen bleiben unverändert.
  state.appointments = [];
  state.excludedRevenueDays = [];
  state.manualRevenueItems = [];
  state.employeeDailyRevenueRecords = [];
  state.revenue2Entries = [];
  state.revenue2DeletedAppointmentIds = [];
  state.revenue2CashEntries = [];
  state.revenue2CashDeletedAppointmentIds = [];
  state.cashWithdrawals = [];
  state.cashDeposits = [];
  state.journalRevenueCorrections = {};
  state.journalRevenueDeletedDays = [];
}

function systemCleanAllRevenueAndAppointments(){
  const msg1 = t("systemCleanConfirm");
  if(!confirm(msg1)) return;
  const msg2 = t("systemCleanConfirmFinal");
  if(!confirm(msg2)) return;
  clearAllRevenueAndAppointmentData();
  saveState();
  renderAll();
  updateCleanupPreview();
  applyLanguage();
  alert(t("systemCleanDone"));
}

async function cleanupPastCompletedAndBackup(){
  const buttons = [$("cleanupPastAndBackupBtn")].filter(Boolean);
  const candidates = getPastCompletedCleanupCandidates();
  const today = todayISO();
  const msg = t("cleanupConfirm").replace("{appointments}", candidates.length);
  if(!confirm(msg)) return;
  buttons.forEach(btn => { btn.disabled = true; btn.dataset.oldHtml = btn.innerHTML; btn.textContent = t("cleanupRunning"); });

  // Reihenfolge ist wichtig: Erst endgültig löschen, dann Backup der bereinigten Daten erstellen.
  // Termine von heute und Vergangenheit werden entfernt; nur Zukunft-Termine bleiben erhalten.
  state.appointments = (state.appointments || []).filter(a => a && a.date > today);

  // Alle Umsatzdaten aus „Mitarbeiter Umsatz“, „Einnahme“ und „Kasse“ vollständig entfernen,
  // damit sie weder in der App noch im danach erzeugten Backup gespeichert sind.
  state.employeeDailyRevenueRecords = [];
  state.revenue2Entries = [];
  state.revenue2DeletedAppointmentIds = [];
  state.revenue2CashEntries = [];
  state.revenue2CashDeletedAppointmentIds = [];
  state.cashWithdrawals = [];
  state.cashDeposits = [];

  // Umsatzjournal/klassischer Umsatzbericht sowie Wochen- und Monatsumsatz bereinigen.
  // Korrekturen und gelöschte Tage von heute und Vergangenheit werden entfernt.
  state.excludedRevenueDays = (state.excludedRevenueDays || []).filter(d => d > today);
  state.manualRevenueItems = (state.manualRevenueItems || []).filter(item => item && item.date > today);
  state.journalRevenueDeletedDays = (state.journalRevenueDeletedDays || []).filter(d => d > today);
  const cleanedCorrections = {};
  Object.entries(state.journalRevenueCorrections || {}).forEach(([day, value]) => {
    if(day > today) cleanedCorrections[day] = value;
  });
  state.journalRevenueCorrections = cleanedCorrections;

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
        version:"3.02",
        configured:true,
        services:Array.isArray(imported.services) && imported.services.length ? imported.services : defaultServices(),
        customers:Array.isArray(imported.customers) ? imported.customers : [],
        excludedRevenueDays:Array.isArray(imported.excludedRevenueDays) ? imported.excludedRevenueDays : [],
        manualRevenueItems:Array.isArray(imported.manualRevenueItems) ? imported.manualRevenueItems : [],
        language:imported.language || "de",
        revenueEnabled:typeof imported.revenueEnabled === "boolean" ? imported.revenueEnabled : false,
        displayDeviceMode:normalizeDisplayDeviceMode(imported.displayDeviceMode || "auto"),
        scheduleZoom:normalizeScheduleZoom(imported.scheduleZoom || "normal"),
        scheduleIntervalMinutes:normalizeScheduleIntervalMinutes(imported.scheduleIntervalMinutes || 15),
        reportPrintFormat:normalizeReportPrintFormat(imported.reportPrintFormat || "a4"),
        dashboardReturnEnabled: typeof imported.dashboardReturnEnabled === "boolean" ? imported.dashboardReturnEnabled : true,
        dashboardReturnDelayMs: normalizeDashboardReturnDelay(imported.dashboardReturnDelayMs ?? 60000),
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
  $("scheduleIntervalMinutes") && ($("scheduleIntervalMinutes").value = String(normalizeScheduleIntervalMinutes(state.scheduleIntervalMinutes || 15)));
  $("reportPrintFormat") && ($("reportPrintFormat").value = normalizeReportPrintFormat(state.reportPrintFormat || "a4"));
  updateDisplayModeHint();
  $("settingsStudioName").value=state.studioName;
  $("dashboardReturnEnabled") && ($("dashboardReturnEnabled").checked = isDashboardReturnEnabled());
  setDashboardReturnDelayControls(getDashboardReturnDelay());
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
  renderCashTab();
  renderWorkTimeList();
  renderSettingsCustomerList();
  renderServiceList();
  renderEmployeeDailyRevenue();
  updateDeletePeriodPreview();
  updateCleanupPreview();
  updateBackupStatuses();
  switchSettingsTab("settingsGeneralTab");
  $("settingsDialog").showModal();
}
function showAppointment(id){
  clearSelectedCalendarSlot();
  selectedAppointmentId=id;
  const a=state.appointments.find(x=>x.id===id); if(!a) return;
  const emp=state.employees.find(e=>e.id===a.employeeId);
  $("appointmentDetails").innerHTML=`<p><strong>${escapeHtml(a.customerName)}</strong></p><p>${escapeHtml(a.serviceName || t("serviceFallback"))} · ${escapeHtml(a.startTime)} · ${a.duration} Min</p><p>${t("employeeLabel")}: ${escapeHtml(emp?.name||"")}</p><p>${t("phoneLabel")}: ${escapeHtml(a.phone||"-")}</p><p>${t("internalStatus")}: ${escapeHtml(employeeDailyRevenueStatusLabel(a.status||"Gebucht"))}</p><p>${t("priceLabel")}: ${money(a.price)}</p><p>${t("noteLabel")}: ${escapeHtml(a.note||"-")}</p>`;
  $("appointmentDialog").showModal();
}
installIpadKeyboardFocusFix();
if("serviceWorker" in navigator){ window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js")); }
boot();
