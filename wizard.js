// wizard.js: the "Set up with questions" wizard and saved setups for the SEB config builder.
// Loaded before the main script; everything here runs only when called, so it can use the
// builder's globals (state, el, $, equal, toJsonable, fromJsonable, loadDict, render, changed ...).
'use strict';

/* ---------------- Saved setups (kept in this browser; never contain passwords) ---------------- */
const SETUPS_KEY = 'seb-config-builder-setups-v1';
const SETUP_SKIP = new Set(['examKeySalt', 'hashedQuitPassword', 'hashedAdminPassword', 'originatorVersion']);

function loadSetups() {
  try { const o = JSON.parse(localStorage.getItem(SETUPS_KEY) || '{}'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch { return {}; }
}
function storeSetups(o) {
  try { localStorage.setItem(SETUPS_KEY, JSON.stringify(o)); return true; } catch { return false; }
}

// The built-in defaults, without disturbing the current state.
function freshDefaults() {
  const keep = { values: state.values, newPasswords: state.newPasswords, extra: state.extra, filePassword: state.filePassword, userProcStart: state.userProcStart };
  resetState();
  const defaults = state.values;
  Object.assign(state, keep);
  return defaults;
}

// Only what differs from the defaults is saved, so a setup stays small and picks up
// new defaults when the builder is updated.
function currentSetupValues() {
  const def = freshDefaults();
  const out = {};
  for (const [k, v] of Object.entries(state.values)) {
    if (SETUP_SKIP.has(k) || v === undefined) continue;
    if (!equal(v, def[k])) out[k] = toJsonable(v);
  }
  for (const [k, v] of Object.entries(state.extra)) out[k] = toJsonable(v);
  return out;
}

function saveSetup(name) {
  name = name.trim();
  if (!name) return 'Give the setup a name.';
  const all = loadSetups();
  all[name] = { saved: new Date().toISOString(), values: currentSetupValues() };
  return storeSetups(all) ? '' : 'This browser would not save it (private browsing?). Use “Export setups” instead.';
}

function useSetup(name) {
  const s = loadSetups()[name];
  if (!s) return false;
  loadDict(fromJsonable(s.values));   // also marks the summary as ready
  setStatus(`Loaded the setup “${name}”. Passwords are not saved in setups, so set them again if needed.`, 'ok');
  return true;
}

/* ---------------- Microsoft sign-in (Entra ID) ---------------- */
// Windows security components that show the Windows Hello / passkey / security-key prompt.
// Same entries as in working exam files (see SEB issue #1518). Original name and signature are
// left empty because they differ between Windows versions, which SEB's maintainers note is a weak spot.
const MS_BROKERS = ['CredentialUIBroker.exe', 'PickerHost.exe', 'PinEnrollmentBroker.exe'];
// Web sign-in endpoints Microsoft documents for Entra ID. Not confirmed for SEB specifically: test with the URL filter test.
const MS_DOMAINS = ['login.microsoftonline.com', 'login.microsoft.com', 'login.live.com', 'login.windows.net', 'msauth.net', 'msftauth.net'];
function brokerEntry(exe) {
  return { active: true, autostart: false, iconInTaskbar: true, runInBackground: true, allowUserToChooseApp: false, strongKill: false, os: 1,
    title: '', description: '', executable: exe, originalName: '', windowHandlingProcess: '', path: '', identifier: '', arguments: [], signature: '' };
}

/* ---------------- Situation templates ---------------- */
// Each template pre-fills the wizard's answers. `answers` only lists what differs from the plain defaults;
// `assumptions` is the plain-language list shown to the user, and must match what `answers` really sets.
const TEMPLATES = [
  { id: 'closed', title: 'Closed-book Moodle quiz', blurb: 'A supervised or locked-down quiz where students may only use the quiz.',
    assumptions: ['Students use Windows or Mac laptops.', 'Students can only open the quiz site (and sign-in pages if you choose that later).', 'SEB fills the screen.', 'Leaving SEB needs a password that you give out.',
      'Copy and paste works inside the exam only.', 'No printing, no spell checker, no browser back and forward.', 'SEB sends its keys with each request. Moodle also turns this on itself when you upload the file.'],
    answers: { sites: 'quiz', fullScreen: true, clipboard: 'seb', spell: false, print: false, backForward: false, downloads: false, uploads: false, sendKey: true, quitMode: 'password' } },
  { id: 'closed-ms', title: 'Closed-book quiz with Microsoft sign-in', blurb: 'As above, and students log in with a university Microsoft account and two-step verification.',
    assumptions: ['Everything in the closed-book quiz.', 'Students sign in with Microsoft and approve on their phone (Authenticator app or text).', 'The Microsoft sign-in websites are allowed.',
      'Windows Hello, passkeys and security keys are not used. They are unreliable in SEB (the next steps explain).'],
    answers: { sites: 'quiz', fullScreen: true, clipboard: 'seb', spell: false, print: false, backForward: false, downloads: false, uploads: false, sendKey: true, quitMode: 'password', ms: 'phone' } },
  { id: 'practice', title: 'Practice or low-stakes quiz', blurb: 'Relaxed settings for a formative quiz.',
    assumptions: ['Students can quit SEB whenever they like, with no password.', 'SEB opens in a window rather than full screen.', 'Students can use the spell checker and the back and forward buttons.',
      'Only the quiz site can be opened.', 'Moodle does not check the settings file.'],
    answers: { sites: 'quiz', fullScreen: false, clipboard: 'seb', spell: true, print: false, backForward: true, downloads: false, uploads: false, sendKey: false, quitMode: 'free' } },
  { id: 'openbook', title: 'Open-book exam (any website)', blurb: 'Students may look things up on the web, but only inside SEB.',
    assumptions: ['Students can open any website inside SEB.', 'SEB fills the screen and leaving needs a password.', 'Copy and paste works inside SEB only, so students can copy from a web page into an answer.',
      'Other programs on the computer are still blocked.', 'SEB sends its keys with each request. Moodle also turns this on itself when you upload the file.'],
    answers: { sites: 'any', fullScreen: true, clipboard: 'seb', spell: false, print: false, backForward: true, downloads: false, uploads: false, sendKey: true, quitMode: 'password' } },
  { id: 'downup', title: 'Download a file, then upload an answer', blurb: 'Students fetch a file (data, a template) and hand back their work through Moodle.',
    assumptions: ['Students can download files and upload files.', 'The download site is allowed. You will add its address in the next steps, as well as the exam site.',
      'Downloads go to a temporary folder that is deleted when SEB quits.', 'When uploading, students can only choose from that folder (Windows).', 'SEB fills the screen and leaving needs a password.', 'SEB sends its keys with each request. Moodle also turns this on itself when you upload the file.'],
    answers: { task: 'files', sites: 'more', fullScreen: true, clipboard: 'seb', spell: false, print: false, backForward: false, downloads: true, uploads: true, tempDir: true, sendKey: true, quitMode: 'password' } },
  { id: 'upload', title: 'Quiz with file-upload questions', blurb: 'Students must attach a file to an answer.',
    assumptions: ['Students can upload files, for example a screenshot or a document.', 'Downloads stay switched off.', 'Only the quiz site can be opened.', 'SEB fills the screen and leaving needs a password.',
      'SEB sends its keys with each request. Moodle also turns this on itself when you upload the file.'],
    answers: { sites: 'quiz', fullScreen: true, clipboard: 'seb', spell: false, print: false, backForward: false, downloads: false, uploads: true, tempDir: true, sendKey: true, quitMode: 'password' } }
];

/* ---------------- The wizard ---------------- */
const WZ_CHIPS = {
  yt: { label: 'YouTube videos', hosts: ['youtube.com', 'youtube-nocookie.com', 'ytimg.com', 'googlevideo.com'] },
  vimeo: { label: 'Vimeo videos', hosts: ['vimeo.com', 'vimeocdn.com'] }
};
// Well-known generative AI assistants. A starting list only: new ones appear all the time, and search engines
// show AI answers on pages that cannot be blocked without blocking search itself.
const AI_HOSTS = ['chatgpt.com', 'openai.com', 'claude.ai', 'gemini.google.com', 'copilot.microsoft.com', 'perplexity.ai', 'poe.com',
  'character.ai', 'deepseek.com', 'grok.com', 'meta.ai', 'chat.mistral.ai', 'you.com', 'phind.com', 'duck.ai'];
// Moodle pages that lead away from the quiz (dashboard, courses, calendar, messages, profiles) and its home page.
// Allowed sites are still reachable only if no Block rule matches, and Block rules win.
const MOODLE_AREAS = ['/my/*', '/course/*', '/calendar/*', '/message/*', '/user/*', '/grade/*', '/admin/*', '/reportbuilder/*', '/badges/*', '/blog/*', '/search/*', '/tag/*', '/login/logout.php'];
const wzHomeRegex = host => '^https?://' + host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/?(\\?.*)?$';
const WZ_PROGRAM_HOSTS_NOTE = 'Find the file name in Task Manager (Details tab) while the program is running, for example EXCEL.EXE.';

function wzHost(url) { try { return new URL(url.trim()).host; } catch { return ''; } }
function wzLines(text) { return String(text || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean); }
function wzProgramLines(text) {            // "Name, file.exe" or just "file.exe"
  return wzLines(text).map(l => { const i = l.lastIndexOf(','); return i < 0 ? { title: '', executable: l } : { title: l.slice(0, i).trim(), executable: l.slice(i + 1).trim() }; });
}

function wzAnswersFromState() {
  const v = state.values;
  const host = wzHost(v.startURL || '');
  const chipHosts = new Set(Object.values(WZ_CHIPS).flatMap(c => c.hosts));
  const rules = (v.URLFilterRules || []).filter(r => r.action === 1 && !r.regex && r.expression);
  const hasMsDomain = rules.some(r => MS_DOMAINS.includes(r.expression));
  const allowAll = rules.some(r => r.expression === '*');
  const others = rules.filter(r => r.expression !== host && r.expression !== '*' && !MS_DOMAINS.includes(r.expression) && !chipHosts.has(r.expression)).map(r => r.expression);
  const lockMoodle = !!host && (v.URLFilterRules || []).some(r => r.action === 0 && !r.regex && r.expression === host + MOODLE_AREAS[0]);
  const blockAi = (v.URLFilterRules || []).some(r => r.action === 0 && !r.regex && AI_HOSTS.includes(r.expression));
  const passwordSet = !!(v.hashedQuitPassword || state.newPasswords.hashedQuitPassword);
  const programs = (v.permittedProcesses || []).filter(p => p && p.os === 1 && p.executable && !MS_BROKERS.includes(p.executable)).map(p => (p.title ? p.title + ', ' : '') + p.executable);
  const sit = window.wzSituation || {};
  return {
    // the situation
    place: sit.place || '', task: sit.task || '', moodle: sit.moodle || 'upload',
    browse: allowAll ? 'any' : !v.URLFilterEnable ? (v.startURL ? 'any' : 'quiz') : others.length ? 'more' : 'quiz',
    browseTouched: false, sig: '',
    // the details
    startURL: v.startURL || '',
    platforms: { win: true, mac: true, ios: true },
    quitMode: !v.allowQuit && v.quitURL ? 'link' : 'password',
    quitPassword: '', passwordAlreadySet: passwordSet, quitURL: v.quitURL || '',
    sites: allowAll ? 'any' : !v.URLFilterEnable ? (v.startURL ? 'any' : 'quiz') : others.length ? 'more' : 'quiz',   // a fresh builder defaults to the recommended choice
    blockAi, lockMoodle: lockMoodle || !v.startURL, contentFilter: !!v.URLFilterEnableContentFilter,
    otherSites: others.join('\n'),
    yt: rules.some(r => r.expression === 'youtube.com'), vimeo: rules.some(r => r.expression === 'vimeo.com'),
    downloadHost: '', ssoHost: '', programs: programs.join('\n'),
    fullScreen: v.browserViewMode === 1,
    clipboard: v.clipboardPolicy === 1 ? 'block' : v.clipboardPolicy === 0 ? 'allow' : 'seb',
    spell: !!v.allowSpellCheck, print: !!v.allowPrint, backForward: !!v.allowBrowsingBackForward,
    downloads: !!v.allowDownloads, uploads: !!v.allowUploads, tempDir: !!v.useTemporaryDownUploadDirectory,
    ms: (v.permittedProcesses || []).some(p => p && p.active && MS_BROKERS.includes(p.executable)) ? 'hello' : hasMsDomain ? 'phone' : 'no',
    sendKey: !!v.sendBrowserExamKey,
    linkWindow: (v.newBrowserWindowByLinkPolicy == null ? 2 : v.newBrowserWindowByLinkPolicy) === 0 ? 'block' : (v.newBrowserWindowByLinkPolicy == null ? 2 : v.newBrowserWindowByLinkPolicy) === 1 ? 'same' : 'new',
    saveName: ''
  };
}

// What the situation questions decide. Runs when the situation answers change; the details steps can still override it.
function wzSituationDefaults(a) {
  a.fullScreen = true;
  a.sites = a.browse;
  a.clipboard = a.task === 'programs' ? 'allow' : 'seb';
  a.backForward = a.task === 'web' || a.browse === 'any';
  a.spell = false; a.print = false;
  const files = a.task === 'files';
  a.downloads = files; a.uploads = files; a.tempDir = files;
  if (files && a.sites === 'quiz') a.sites = 'more';
  a.sendKey = a.moodle === 'upload';
  a.lockMoodle = a.moodle !== 'other';     // keep students out of Moodle's menus
  a.blockAi = a.sites === 'any';          // open-web exams: block the well-known AI assistants
  a.contentFilter = false;
  a.linkWindow = 'same';                  // a link that asks for a new window opens in the same one
}

function wzApply(a) {
  const v = state.values;
  v.startURL = a.startURL.trim();
  // leaving the exam
  v.allowQuit = a.quitMode !== 'link';
  if (a.quitMode === 'free') { v.hashedQuitPassword = ''; delete state.newPasswords.hashedQuitPassword; }
  else if (a.quitPassword) { state.newPasswords.hashedQuitPassword = a.quitPassword; }
  v.quitURL = a.quitURL.trim();
  // websites
  // rules this wizard manages (AI blocks and the allow-everything rule) are rebuilt each time
  const hostNow = wzHost(v.startURL);
  const managed = r => (r.action === 0 && !r.regex && (AI_HOSTS.includes(r.expression) || MOODLE_AREAS.some(p => r.expression === hostNow + p))) ||
    (r.action === 0 && r.regex && hostNow && r.expression === wzHomeRegex(hostNow)) || (r.action === 1 && !r.regex && r.expression === '*');
  v.URLFilterRules = (v.URLFilterRules || []).filter(r => !managed(r));
  if (a.sites === 'any' && !a.blockAi) { v.URLFilterEnable = false; v.URLFilterEnableContentFilter = false; }
  else if (a.sites === 'any') {
    // allow everything except the listed AI sites; block rules win, and the content filter also stops AI widgets embedded in pages
    v.URLFilterEnable = true; v.URLFilterEnableContentFilter = true;
    v.URLFilterRules = v.URLFilterRules.concat(AI_HOSTS.map(x => ({ active: true, action: 0, regex: false, expression: x })), [{ active: true, action: 1, regex: false, expression: '*' }]);
  } else {
    v.URLFilterEnable = true;
    v.URLFilterEnableContentFilter = !!a.contentFilter;
    if (a.lockMoodle && hostNow) v.URLFilterRules = v.URLFilterRules.concat(MOODLE_AREAS.map(p => ({ active: true, action: 0, regex: false, expression: hostNow + p })),
      [{ active: true, action: 0, regex: true, expression: wzHomeRegex(hostNow) }]);
    const want = [wzHost(v.startURL)];
    if (a.sites === 'more') {
      want.push(...wzLines(a.otherSites));
      if (a.yt) want.push(...WZ_CHIPS.yt.hosts);
      if (a.vimeo) want.push(...WZ_CHIPS.vimeo.hosts);
      want.push(...wzLines(a.downloadHost.replace(/[,;\s]+/g, '\n')));
    }
    if (a.ms === 'phone' || a.ms === 'hello') want.push(...MS_DOMAINS);
    if (a.ms === 'sso') want.push(...wzLines(a.ssoHost.replace(/[,;\s]+/g, '\n')).map(x => wzHost(x.includes('://') ? x : 'https://' + x) || x));
    const keep = v.URLFilterRules.filter(r => r.action !== 1 || r.regex);        // keep Block and regex rules
    const seen = new Set();
    const allow = want.filter(x => x && !seen.has(x) && seen.add(x)).map(x => ({ active: true, action: 1, regex: false, expression: x }));
    v.URLFilterRules = keep.concat(allow);
  }
  // programs students may run (Windows)
  const have = new Set((v.permittedProcesses || []).filter(p => p && p.os === 1).map(p => p.executable));
  const add = [];
  if (a.ms === 'hello') add.push(...MS_BROKERS.filter(x => !have.has(x)).map(brokerEntry));
  for (const p of wzProgramLines(a.programs)) if (!have.has(p.executable) && !MS_BROKERS.includes(p.executable)) { have.add(p.executable); add.push(Object.assign(brokerEntry(p.executable), { title: p.title, runInBackground: false })); }
  if (add.length) v.permittedProcesses = (v.permittedProcesses || []).concat(add);
  if (a.ms === 'hello') {
    for (const p of v.permittedProcesses) if (p && MS_BROKERS.includes(p.executable)) p.active = true;
    // On a separate desktop (the default) the sign-in window stays hidden; working files use the Explorer-shell kiosk mode instead.
    v.killExplorerShell = true; v.createNewDesktop = false;
  }
  v.browserViewMode = a.fullScreen ? 1 : 0;
  { const pol = a.linkWindow === 'block' ? 0 : a.linkWindow === 'new' ? 2 : 1; v.newBrowserWindowByLinkPolicy = pol; v.newBrowserWindowByScriptPolicy = pol; }
  v.clipboardPolicy = a.clipboard === 'block' ? 1 : a.clipboard === 'allow' ? 0 : 2;
  v.enablePrivateClipboard = a.clipboard !== 'allow';
  v.allowSpellCheck = a.spell; v.allowPrint = a.print; v.allowBrowsingBackForward = a.backForward;
  v.allowDownloads = a.downloads; v.allowUploads = a.uploads;
  // SEB for Mac needs this master switch as well as the two above (see SEBBrowserController.m).
  v.allowDownUploads = a.downloads || a.uploads;
  if (a.downloads || a.uploads) {
    v.useTemporaryDownUploadDirectory = a.tempDir;       // fresh folder, deleted when SEB quits
    v.allowCustomDownUploadLocation = false;             // students only see that folder in the upload dialog (Windows)
  }
  v.sendBrowserExamKey = a.sendKey;
  // which settings to show
  const p = a.platforms, n = [p.win, p.mac, p.ios].filter(Boolean).length;
  const plat = n === 1 ? (p.win ? 'win' : p.mac ? 'mac' : 'ios') : 'all';
  document.querySelector(`input[name=plat][value=${plat}]`).checked = true;
  window.wzSituation = { place: a.place, task: a.task, moodle: a.moodle };
  render(); changed();
}

function wzRadio(name, options, current, onPick) {
  const box = el('div', { class: 'wz-options' });
  for (const o of options) {
    const inp = el('input', { type: 'radio', name, value: o.v, checked: o.v === current });
    inp.addEventListener('change', () => onPick(o.v));
    box.append(el('label', { class: 'wz-opt' }, inp, el('span', {}, el('b', {}, o.label), o.help ? el('span', { class: 'wz-help' }, o.help) : null)));
  }
  return box;
}
function wzCheck(label, help, checked, onChange) {
  const inp = el('input', { type: 'checkbox', checked });
  inp.addEventListener('change', () => onChange(inp.checked));
  return el('label', { class: 'wz-opt' }, inp, el('span', {}, el('b', {}, label), help ? el('span', { class: 'wz-help' }, help) : null));
}
function wzText(a, key, placeholder, label, type = 'text') {
  const inp = el('input', { type, value: a[key] || '', placeholder, spellcheck: 'false', autocomplete: type === 'password' ? 'new-password' : 'off', 'aria-label': label });
  inp.addEventListener('input', () => { a[key] = inp.value; });
  return inp;
}

function wzSummaryRows(a) {
  const yn = x => x ? 'Yes' : 'No';
  const nOther = wzLines(a.otherSites).length + (a.yt ? 1 : 0) + (a.vimeo ? 1 : 0) + (a.downloadHost.trim() ? 1 : 0);
  const programs = wzProgramLines(a.programs).length;
  return [
    ['Exam address', a.startURL.trim()],
    ['Leaving SEB', a.quitMode === 'password' ? (a.quitPassword || a.passwordAlreadySet ? 'With a password' : 'With a password (not set)') : a.quitMode === 'link' ? 'Only through the exit link' : 'Anyone can quit'],
    ['Quit link', a.quitURL.trim() || 'None'],
    ['Websites', a.sites === 'quiz' ? 'Only the exam’s own site' : a.sites === 'any' ? 'Any website' : 'The exam site and ' + nOther + ' other' + (nOther === 1 ? '' : 's')],
    ['Sign-in', a.ms === 'hello' ? 'Microsoft: Windows Hello, PIN, passkey or key (programs permitted)' : a.ms === 'phone' ? 'Microsoft: approval on phone' : a.ms === 'sso' ? 'Another single sign-on' : 'None'],
    ['AI assistant websites', a.sites === 'any' ? (a.blockAi ? 'Well-known ones blocked (not a complete list)' : 'Not blocked') : (a.contentFilter ? 'Blocked: only allowed sites open, and embedded content is checked too' : 'Blocked: only allowed sites open')],
    ['Moodle menus and other courses', a.sites !== 'any' && a.moodle !== 'other' ? (a.lockMoodle ? 'Blocked' : 'Reachable') : 'Not applicable'],
    ['Programs students may run', programs ? programs + ' (Windows)' : 'None'],
    ['Links that open a new window', a.linkWindow === 'block' ? 'Blocked' : a.linkWindow === 'new' ? 'Open in a new SEB window' : 'Open in the same window'],
    ['Screen', a.fullScreen ? 'Full screen' : 'Window'],
    ['Copy and paste', a.clipboard === 'seb' ? 'Only inside the exam' : a.clipboard === 'block' ? 'Blocked' : 'Allowed everywhere'],
    ['Spell check / print / back-forward', [yn(a.spell), yn(a.print), yn(a.backForward)].join(' / ')],
    ['Downloads / uploads', yn(a.downloads) + ' / ' + yn(a.uploads)],
    ['SEB sends its keys', yn(a.sendKey)]];
}

// "Here is what I would set up, and why" (plain sentences from the situation)
function wzWhy(a) {
  const out = [];
  out.push('SEB fills the screen, so students cannot see other windows.');
  out.push(a.sites === 'any' ? 'Any website opens inside SEB, because students need to browse. Other programs stay blocked.'
    : a.sites === 'more' ? 'Only the exam site and the sites you list will open.' : 'Only the exam site opens, because students do not need to browse.');
  if (a.sites === 'any') out.push(a.blockAi ? 'Well-known AI assistants (ChatGPT, Gemini, Claude, Copilot, Perplexity and others) are blocked. This is a starting list, not a guarantee.' : 'No websites are blocked, so AI assistants can be opened.');
  else out.push('Because only listed sites open, AI assistant websites are blocked too.');
  if (a.sites !== 'any' && a.moodle !== 'other' && a.lockMoodle) out.push('Moodle’s own menus (dashboard, courses, calendar, messages, profiles, grades, site administration, log out and the home page) are blocked, so students cannot wander off through the university menu bar.');
  out.push(a.quitMode === 'free' ? 'Students can quit whenever they like.'
    : a.quitMode === 'link' ? 'Students can only leave through an exit link, such as the button Moodle shows on the quiz page once an attempt is finished.' : 'Leaving SEB needs a password that you give out.');
  out.push(a.linkWindow === 'block' ? 'A link that asks for a new window is blocked.' : a.linkWindow === 'new' ? 'A link that asks for a new window opens in a new SEB window, so check that window is covered by your website rules.' : 'A link that asks for a new window opens in the same window, so students stay on one page.');
  if (a.task === 'programs') out.push('The programs you name are permitted (Windows only), and copy and paste works between them and the exam.');
  else out.push('Copy and paste works inside the exam only.');
  if (a.task === 'files') out.push('Downloads and uploads are on. Downloads go to a temporary folder that SEB deletes when it quits.');
  if (a.task === 'web') out.push('The back and forward buttons work, so students can move around web pages.');
  out.push(a.moodle === 'upload' ? 'The file is plain XML, which Moodle accepts when you upload it to the quiz’s Safe Exam Browser settings.'
    : a.moodle === 'hidden' ? 'Students will start from a link in the file, so you will give them the file directly.' : 'The file is plain XML that SEB opens directly.');
  return out;
}
function wzWarnings(a) {
  const out = [];
  if (a.moodle === 'hidden') out.push('A hidden quiz steers students into SEB but cannot make them use it. Without Moodle’s Safe Exam Browser setting switched on, nothing on the server checks, and anyone with the link can open the quiz in an ordinary browser. The option “make available but don’t show on course page” also only exists if an administrator has enabled “Allow stealth activities”.');
  if (a.sites === 'any') out.push('An open-web exam cannot fully prevent generative AI. Search engines show AI answers on pages you cannot block without blocking search, new AI sites appear all the time, and SEB cannot see a second device. If AI is a concern, list the sites students need instead of allowing any.');
  if (a.quitMode === 'link' && a.moodle !== 'upload') out.push('The exit button on the quiz page is shown by Moodle’s Safe Exam Browser settings. Without them you must put a link to the exit address on a page students can reach, or they will not be able to leave. A quit password is safer here.');
  if (a.task === 'programs' && a.place !== 'cluster') out.push('Letting students run programs on their own computers is hard to control. It works best on university computers that you manage.');
  if (a.task === 'programs' && a.platforms && !a.platforms.win) out.push('Permitted programs are set up for Windows only in this builder.');
  return out;
}

// What to do outside the builder, from the situation
function wzChecklist(sit, a) {
  const place = sit.place || 'mixed', moodle = sit.moodle || 'upload', out = [];
  if (moodle === 'upload') out.push('In Moodle, open the quiz settings → Safe Exam Browser → “Require the use of Safe Exam Browser: Yes – Upload my own config”, and upload the file. Moodle replaces the start address with the quiz’s own, so you do not need to match it.');
  else if (moodle === 'hidden') {
    out.push('In Moodle, set the quiz’s Availability to “Make available but don’t show on course page” (ask your administrator to enable “Allow stealth activities” if the option is missing).');
    out.push('Give students the .seb file, for example as a download on a page in the course. The file’s start address opens the hidden quiz.');
  } else out.push('Follow your exam system’s own steps to give students the file or to load it. SEB opens the .seb file directly.');
  if (place === 'cluster') out.push('Ask IT to install the current SEB on the room computers (or the image) and to try this file on one of them before the exam.');
  else if (place === 'byod') out.push('Tell students where to install SEB (safeexambrowser.org), by when, and which version. Run a short practice quiz a few days before so installation problems show up early.');
  else out.push('Make sure room computers have the current SEB, and tell students with their own laptops where to install it. Run a short practice quiz first.');
  if (a && a.ms === 'hello') out.push('Test the Microsoft sign-in with Windows Hello or a passkey on a real Windows computer: this is the part most likely to go wrong.');
  out.push('Try the file yourself in SEB on a Windows computer and a Mac, as a student, before the exam.');
  return out;
}

function openWizard(templateId) {
  const tpl = typeof templateId === 'string' ? TEMPLATES.find(t => t.id === templateId) : null;
  let a = wzAnswersFromState();
  if (tpl) Object.assign(a, tpl.answers);
  const setups = tpl ? [] : Object.keys(loadSetups()).sort();
  let base = '';      // '' = the settings currently in the builder, otherwise the name of a saved setup
  const steps = [];

  if (tpl) steps.push({
    title: tpl.title,
    body: () => [el('p', { class: 'wz-q' }, tpl.blurb), el('h4', {}, 'This starting point assumes:'), el('ul', { class: 'wz-assume' }, tpl.assumptions.map(x => el('li', {}, x))),
      el('p', { class: 'wz-help' }, 'You will see each of these choices in the next steps and can change any of them. You will also add your exam’s address and a quit password.')]
  });
  if (setups.length) steps.push({
    title: 'Where do you want to start?',
    body: () => {
      const opts = [{ v: '', label: 'A fresh start: I will describe the situation' }, ...setups.map(n => ({ v: n, label: 'Saved setup: ' + n }))];
      return [el('p', { class: 'wz-q' }, 'Start from a saved setup to reuse it for a new exam; you can change anything in the next steps.'),
        wzRadio('wz-base', opts, base, v => { base = v; })];
    },
    leave: () => { if (base && useSetup(base)) { a = wzAnswersFromState(); a.skipSituation = true; } }
  });

  /* ---- Part 1: the situation ---- */
  const sit = [];
  if (!tpl) {
    sit.push({
      id: 'place', title: 'Where will students sit the exam?',
      body: () => [el('p', { class: 'wz-q' }, 'First the situation, then the details. This decides what SEB can reasonably do.'),
        wzRadio('wz-place', [
          { v: 'byod', label: 'On their own laptops', help: 'At home or in a room. Students install SEB themselves.' },
          { v: 'cluster', label: 'On university computers (a cluster or lab room)', help: 'Computers that you or IT manage, so SEB can be installed and tested for them.' },
          { v: 'mixed', label: 'A mix of both' }], a.place, v => { a.place = v; })],
      check: () => a.place ? '' : 'Choose one.',
      leave: () => { a.platforms = a.place === 'cluster' ? { win: true, mac: false, ios: false } : { win: true, mac: true, ios: false }; }
    });
    sit.push({
      id: 'os', title: 'Which computers will students use?',
      body: () => [el('p', { class: 'wz-q' }, 'One file works on all of them. This also tunes the advice and shows you fewer settings later.'),
        wzCheck('Windows', '', a.platforms.win, c => { a.platforms.win = c; }),
        wzCheck('Mac', '', a.platforms.mac, c => { a.platforms.mac = c; }),
        wzCheck('iPad or iPhone', 'Passkeys and some downloads and uploads behave differently on iPad.', a.platforms.ios, c => { a.platforms.ios = c; })],
      check: () => (a.platforms.win || a.platforms.mac || a.platforms.ios) ? '' : 'Choose at least one.'
    });
    sit.push({
      id: 'task', title: 'What will students be doing?',
      body: () => [wzRadio('wz-task', [
        { v: 'quiz', label: 'Answering a quiz', help: 'Just the exam itself.' },
        { v: 'web', label: 'Answering a quiz and using the web', help: 'For example looking things up or reading pages.' },
        { v: 'programs', label: 'Answering a quiz and using programs on the computer', help: 'For example Excel, a code editor or a calculator. Windows only.' },
        { v: 'files', label: 'Downloading a file, working on it and uploading it', help: 'Data files, templates and hand-in files.' }], a.task, v => { a.task = v; })],
      check: () => a.task ? '' : 'Choose one.',
      leave: () => { if (!a.browseTouched) a.browse = a.task === 'web' ? 'any' : a.task === 'files' ? 'more' : 'quiz'; }
    });
    sit.push({
      id: 'browse', title: 'Do students need to browse the web freely?',
      body: () => [wzRadio('wz-browse', [
        { v: 'quiz', label: 'No: only the exam', help: 'Everything else is blocked. Recommended.' },
        { v: 'more', label: 'Only a few sites that I will list', help: 'For example a video host, a document viewer, or the site a file is downloaded from.' },
        { v: 'any', label: 'Yes: any website', help: 'Open-web exams. Other programs stay blocked, and well-known AI assistants are blocked from a starting list. It cannot fully prevent AI use.' }], a.browse, v => { a.browse = v; a.browseTouched = true; })]
    });
    sit.push({
      id: 'exit', title: 'Can students leave the exam at any point?',
      body: () => [wzRadio('wz-exit', [
        { v: 'free', label: 'Yes, whenever they like', help: 'Practice or low-stakes quizzes.' },
        { v: 'password', label: 'Only with a password', help: 'Invigilated or high-stakes exams. You give the password out.' },
        { v: 'link', label: 'Only after they submit', help: 'Moodle’s Safe Exam Browser settings show an exit button on the quiz page once a student has finished an attempt. Students cannot leave before then.' }], a.quitMode, v => { a.quitMode = v; })]
    });
    sit.push({
      id: 'moodle', title: 'Is the exam in Moodle?',
      body: () => [wzRadio('wz-moodle', [
        { v: 'upload', label: 'Yes, and I can use Moodle’s Safe Exam Browser settings', help: 'You upload the file to the quiz. Moodle then launches SEB for students and checks that it is used.' },
        { v: 'hidden', label: 'Yes, but those Moodle settings are switched off for me', help: 'A hidden quiz that students reach only through a link in the file. This steers students into SEB but does not enforce it.' },
        { v: 'other', label: 'No: another exam system or a website', help: 'SEB opens the file directly.' }], a.moodle, v => { a.moodle = v; })],
      leave: () => {
        const sig = [a.place, a.task, a.browse, a.quitMode, a.moodle].join('|');
        if (sig !== a.sig) { wzSituationDefaults(a); a.sig = sig; }
      }
    });
    sit.push({
      id: 'recommend', title: 'Here is what I would set up',
      body: () => {
        const why = wzWhy(a), warn = wzWarnings(a);
        return [el('p', { class: 'wz-q' }, 'From your answers. You will check each of these, one at a time, in the next steps.'),
          el('ul', { class: 'wz-assume' }, why.map(x => el('li', {}, x))),
          ...warn.map(w => el('div', { class: 'note warn' }, w))];
      }
    });
  }
  const situation = sit;

  /* ---- Part 2: the details, step by step ---- */
  const details = [];
  details.push({
    id: 'address',
    title: a => a.moodle === 'hidden' ? 'Which hidden quiz?' : a.moodle === 'other' ? 'What is the exam’s web address?' : 'Which quiz is this for?',
    body: () => {
      const hint = a.moodle === 'upload'
        ? 'Open the quiz in your normal browser and paste its address. Moodle replaces it with the quiz’s own address when you upload, so what matters is that it names your Moodle site, so SEB can allow it.'
        : a.moodle === 'hidden'
          ? 'Make the quiz first: in its settings set Availability to “Make available but don’t show on course page”. Then open it and paste its address. SEB will open this page first.'
          : 'Paste the page SEB should open first.';
      const live = el('p', { class: 'wz-help' });
      const upd = () => { const h = wzHost(a.startURL); live.textContent = h ? `SEB will treat ${h} as the exam site and allow it.` : ''; };
      const inp = wzText(a, 'startURL', 'https://moodle.example.ac.uk/mod/quiz/view.php?id=123', 'Exam web address');
      inp.addEventListener('input', upd); upd();
      return [el('p', { class: 'wz-q' }, hint), inp, live];
    },
    check: () => { try { const u = new URL(a.startURL.trim()); return /^https?:$/.test(u.protocol) ? '' : 'The address should start with https://'; } catch { return 'Paste a full web address, starting with https://'; } }
  });
  details.push({
    id: 'signin', title: 'How do students sign in?',
    body: () => {
      const sso = el('div', { class: 'wz-sub' }, el('p', { class: 'wz-help' }, 'The sign-in site’s address, for example login.example.ac.uk. SEB will allow it.'), wzText(a, 'ssoHost', 'login.example.ac.uk', 'Single sign-on address'));
      const showSso = () => { sso.hidden = a.ms !== 'sso'; };
      const hello = a.platforms.win;
      showSso();
      return [
        el('p', { class: 'wz-q' }, 'Many universities use a single sign-on, often Microsoft with a second step. Choose what your students do.'),
        wzRadio('wz-ms', [
          { v: 'no', label: 'They are already signed in, or sign in with Moodle only' },
          { v: 'phone', label: 'Microsoft, approving on their phone', help: 'The Authenticator app (tap or enter a number) or a text message. Safest in SEB. The Microsoft web addresses are allowed if you filter websites.' },
          ...(hello ? [{ v: 'hello', label: 'Microsoft, with Windows Hello, a PIN, a passkey or a security key', help: 'Windows only. Permits the Windows sign-in components and changes the Windows kiosk mode so the prompt can appear.' }] : []),
          { v: 'sso', label: 'Another single sign-on', help: 'Shibboleth, Google or similar.' }], a.ms, v => { a.ms = v; showSso(); }),
        sso,
        el('div', { class: 'note warn' }, 'Passkeys do not work in SEB for Mac or iPad. Use SEB 3.10.2 or later on Windows. The safest plan is phone approval, with students deleting any passkey they have enrolled. Microsoft is making passkeys the default sign-in method from September 2026. Always test the whole sign-in on a real computer first.'),
        el('p', { class: 'wz-help' }, 'The Windows option adds CredentialUIBroker.exe, PickerHost.exe and PinEnrollmentBroker.exe as permitted programs without a name or signature check. SEB’s developers warn that a student could pass off another program as one of these. Their own fix is planned for SEB 4.'),
        el('p', { class: 'wz-help' }, 'Another way round: a Moodle plugin can sign students in before SEB starts. See the guide on Microsoft sign-in.')];
    },
    check: () => a.ms === 'sso' && !a.ssoHost.trim() ? 'Enter the sign-in address, or choose another answer.' : ''
  });
  details.push({
    id: 'sites', title: 'Which other websites do students need?',
    when: () => a.sites === 'more' || a.task === 'files',
    body: () => {
      const area = el('textarea', { rows: 4, placeholder: 'One per line, e.g.\nexample.org\n*.cdn.example.com', spellcheck: 'false', 'aria-label': 'Other websites' });
      area.value = a.otherSites; area.addEventListener('input', () => { a.otherSites = area.value; });
      const dl = a.task === 'files' ? [el('h4', {}, 'Where do students download the file from?'), el('p', { class: 'wz-help' }, 'Skip this if it is on your Moodle site. Otherwise SEB blocks the download.'), wzText(a, 'downloadHost', 'files.example.org', 'Download site')] : [];
      return [el('p', { class: 'wz-q' }, 'Your exam site' + (a.ms === 'no' ? '' : ' and the sign-in sites') + ' are already allowed. Tick what else the exam uses.'),
        wzCheck(WZ_CHIPS.yt.label, 'youtube.com and its video and image hosts', a.yt, c => { a.yt = c; }),
        wzCheck(WZ_CHIPS.vimeo.label, 'vimeo.com and its video host', a.vimeo, c => { a.vimeo = c; }),
        el('h4', {}, 'Anything else'), el('p', { class: 'wz-help' }, 'One address per line. A name such as example.org also allows its subdomains.'), area, ...dl,
        el('p', { class: 'wz-help' }, 'Not sure what the exam needs? Finish the wizard, then record a run through the quiz and use “Test the URL filter”: it lists every site and lets you allow them in one click.')];
    },
    check: () => a.sites === 'more' && !wzLines(a.otherSites).length && !a.yt && !a.vimeo && !a.downloadHost.trim() ? 'Add at least one site, or go back and choose “only the exam”.' : ''
  });
  details.push({
    id: 'programs', title: 'Which programs may students run?',
    when: () => a.task === 'programs',
    body: () => {
      const area = el('textarea', { rows: 5, placeholder: 'One per line: name, file\nExcel, EXCEL.EXE\nNotepad, notepad.exe', spellcheck: 'false', 'aria-label': 'Programs' });
      area.value = a.programs; area.addEventListener('input', () => { a.programs = area.value; });
      return [el('p', { class: 'wz-q' }, 'Everything not listed stays blocked. Windows only. ' + WZ_PROGRAM_HOSTS_NOTE),
        area,
        el('div', { class: 'note warn' }, 'Give the file name only, not a folder path. The builder does not check the program’s original name or signature, so a student could rename another program to match. This is safest on computers you manage. Windows Store apps (for example the new Calculator) do not work with SEB’s kiosk modes.')];
    },
    check: () => { const bad = wzProgramLines(a.programs).find(p => !p.executable || /[\\/]/.test(p.executable)); return bad ? 'Use just the file name, like EXCEL.EXE, with no folder path.' : (!wzProgramLines(a.programs).length ? 'Add at least one program, or go back and choose a different task.' : ''); }
  });
  details.push({
    id: 'leave', title: 'How do students leave?',
    when: () => a.quitMode !== 'free',
    body: () => {
      const pw = wzText(a, 'quitPassword', a.passwordAlreadySet ? 'A password is already set; type one to replace it' : 'Quit password', 'Quit password', 'password');
      const url = wzText(a, 'quitURL', 'https://moodle.example.ac.uk/seb-exit', 'Exit link');
      const site = (() => { try { return new URL(a.startURL.trim()).origin + '/'; } catch { return ''; } })();
      const suggestion = site ? site + 'seb-exit' : '';
      const suggest = suggestion ? el('button', { type: 'button', class: 'small', onclick: () => { a.quitURL = suggestion; url.value = suggestion; } }, 'Use ' + suggestion) : null;
      return [
        el('h4', {}, a.quitMode === 'link' ? 'Quit password (optional)' : 'Quit password'),
        el('p', { class: 'wz-help' }, 'Asked when students quit from the SEB toolbar, with Ctrl-Q or by closing the window. You give it to invigilators.'), pw,
        el('h4', {}, a.quitMode === 'link' ? 'Exit link' : 'Exit link (optional)'),
        el('p', { class: 'wz-help' }, 'SEB quits the moment it is about to open exactly this address, and the page does not need to exist. Choose an address students would never click by accident: not the quiz page, the review page or your home page, or SEB would quit when they got there. In Moodle, the quiz page shows an “Exit Safe Exam Browser” button linking to it once a student has finished an attempt, and it needs no password. On an https site the address must start with https://.'), url, suggest ? el('p', {}, suggest) : null];
    },
    check: () => {
      if (a.quitMode === 'password' && !a.quitPassword && !a.passwordAlreadySet) return 'Type a quit password, or go back and say students can quit freely.';
      if (a.quitMode === 'link') { try { return /^https?:$/.test(new URL(a.quitURL.trim()).protocol) ? '' : 'The exit link should start with https://'; } catch { return 'Enter the exit link: students can only leave through it.'; } }
      return '';
    }
  });
  details.push({
    id: 'finetune', title: 'Fine-tune (optional)',
    body: () => {
      const tempRow = wzCheck('Keep downloads in a temporary folder', 'Recommended. SEB makes a fresh empty folder for downloads and uploads and deletes it when SEB quits. Students can only pick files from that folder when uploading (Windows).', a.tempDir, c => { a.tempDir = c; });
      const showTemp = () => { tempRow.hidden = !(a.downloads || a.uploads); };
      showTemp();
      return [el('p', { class: 'wz-q' }, 'These follow from your answers. Change anything you like, or just press Next.'),
        el('h4', {}, 'Screen'),
        wzRadio('wz-screen', [{ v: 'full', label: 'Full screen' }, { v: 'window', label: 'In a window', help: 'Students can move and resize it.' }], a.fullScreen ? 'full' : 'window', v => { a.fullScreen = v === 'full'; }),
        el('h4', {}, 'Copy and paste'),
        wzRadio('wz-clip', [
          { v: 'seb', label: 'Only inside the exam', help: 'Students can copy and paste within the quiz, but not to or from other programs.' },
          { v: 'block', label: 'Blocked', help: 'Windows only. On a Mac this behaves like “only inside the exam”.' },
          { v: 'allow', label: 'Allowed everywhere', help: 'Includes other programs. Needed to move text between permitted programs and the exam.' }], a.clipboard, v => { a.clipboard = v; }),
        el('h4', {}, 'Allow students to…'),
        wzCheck('Use the spell checker', '', a.spell, c => { a.spell = c; }),
        wzCheck('Print', '', a.print, c => { a.print = c; }),
        wzCheck('Go back and forward between pages', '', a.backForward, c => { a.backForward = c; }),
        wzCheck('Download files', '', a.downloads, c => { a.downloads = c; showTemp(); }),
        wzCheck('Upload files', '', a.uploads, c => { a.uploads = c; showTemp(); }),
        tempRow,
        el('h4', {}, 'Generative AI websites'),
        a.sites === 'any'
          ? wzCheck('Block well-known AI assistant websites', 'A starting list (ChatGPT, Gemini, Claude, Copilot, Perplexity and others), not a complete one. New tools appear, search engines can show AI answers, and nothing here stops a second device.', a.blockAi, c => { a.blockAi = c; })
          : wzCheck('Also check images, scripts and embedded pages', 'Only listed sites open already, so AI websites are blocked. This stricter option also stops an allowed page from loading an AI chat widget from another site. Every site the quiz uses must then be allowed, so test it with a recorded run first.', a.contentFilter, c => { a.contentFilter = c; }),
        ...(a.sites !== 'any' && a.moodle !== 'other' ? [wzCheck('Keep students inside the quiz', 'Blocks Moodle’s dashboard, course pages, calendar, messages and profiles, and its home page, so the university menu bar leads nowhere during the quiz. Students can still use the quiz pages. Test it with a recorded run.', a.lockMoodle, c => { a.lockMoodle = c; })] : []),
        el('h4', {}, 'Links that open a new window'),
        el('p', { class: 'wz-help' }, 'Some links ask for a new window, and a Moodle quiz can be set to open its attempt in a pop-up. SEB’s own default is to open them in a new SEB window. Keeping students in one window is usually safer. Leave the quiz’s Moodle “browser security” setting on None for SEB exams.'),
        wzRadio('wz-linkwin', [
          { v: 'same', label: 'Open in the same window', help: 'Recommended.' },
          { v: 'block', label: 'Block them', help: 'Nothing opens. A link the quiz needs in a new window will not work.' },
          { v: 'new', label: 'Open in a new SEB window', help: 'SEB’s default. The new window is filtered by your website rules too.' }], a.linkWindow, v => { a.linkWindow = v; }),
        el('h4', {}, 'Exam keys'),
        a.moodle === 'upload'
          ? el('p', { class: 'wz-help' }, 'Moodle switches on SEB’s keys itself when you upload the file, so there is nothing to choose.')
          : wzCheck('Send SEB’s keys with each request', 'Lets an exam system check requests come from SEB with these settings. Useful but not proof: someone with the settings file can work the keys out.', a.sendKey, c => { a.sendKey = c; })];
    }
  });
  details.push({
    id: 'review', title: 'Check your choices',
    body: () => {
      const rows = wzSummaryRows(a);
      const tbl = el('table', {}, el('tbody', {}, rows.map(([k, v]) => el('tr', {}, el('th', {}, k), el('td', {}, v)))));
      const name = wzText(a, 'saveName', 'e.g. Year 2 Moodle quiz', 'Setup name');
      return [tbl,
        el('p', { class: 'wz-help' }, 'Everything else stays at the builder’s usual settings. You can change any of it in the sections after you finish. The next page lists what to do outside the builder.'),
        el('h4', {}, 'Save these choices (optional)'),
        el('p', { class: 'wz-help' }, 'Give them a name to reuse them for another exam. Saved in this browser only; passwords are not saved.'), name];
    }
  });

  situation.forEach(s => { s.when = () => !a.skipSituation; });
  steps.push(...situation, ...details);
  // Steps are filtered by `when` each time we move, so answers can change what is asked.
  const titleOf = s => typeof s.title === 'function' ? s.title(a) : s.title;
  const active = () => steps.filter(s => !s.when || s.when());
  let current = steps[0];

  const dlg = el('dialog', { id: 'wzDialog', class: 'wizard' });
  const head = el('div', { class: 'wz-head' });
  const bodyBox = el('div', { class: 'wz-body' });
  const err = el('div', { class: 'note err', hidden: true });
  const backBtn = el('button', { type: 'button' }, 'Back');
  const nextBtn = el('button', { type: 'button', class: 'primary' }, 'Next');
  const finishBtn = el('button', { type: 'button', class: 'primary' }, 'Finish and download .seb');
  const cancelBtn = el('button', { type: 'button' }, 'Cancel');
  dlg.append(head, bodyBox, err, el('div', { class: 'row-actions wz-foot' }, backBtn, nextBtn, finishBtn, cancelBtn));
  document.body.append(dlg);

  function draw() {
    const list = active(), i = list.indexOf(current), last = i === list.length - 1;
    const part = situation.includes(current) ? 'The situation' : 'The details';
    head.textContent = '';
    head.append(el('div', { class: 'wz-progress' }, `${part} · step ${i + 1} of ${list.length}`), el('h2', {}, titleOf(current)));
    bodyBox.textContent = ''; bodyBox.append(...current.body());
    err.hidden = true;
    backBtn.hidden = i === 0; nextBtn.hidden = last; finishBtn.hidden = !last;
    const f = bodyBox.querySelector('input[type=text],input[type=password],textarea'); if (f) f.focus();
  }
  function go(delta) {
    if (delta > 0) {
      const msg = current.check ? current.check() : '';
      if (msg) { err.textContent = msg; err.hidden = false; return; }
      if (current.leave) current.leave();
    }
    const list = active(); let i = list.indexOf(current) + delta;
    current = list[Math.max(0, Math.min(list.length - 1, i))];
    draw();
  }
  function finish(download) {
    const msg = active().map(s => s.check && s.check()).find(Boolean);
    if (msg) { err.textContent = msg; err.hidden = false; return; }
    wzApply(a);
    window.simpleReady = true; render();
    if (a.saveName.trim()) {
      const bad = saveSetup(a.saveName);
      if (bad) setStatus(bad, 'err'); else if (window.drawSetups) window.drawSetups();
    }
    dlg.close(); dlg.remove();
    if (download) $('#btnDownload').click();
    else { setStatus('Setup applied. Check the sections below, then download the file.', 'ok'); const t = $('#exam'); if (t) t.scrollIntoView(); }
  }
  backBtn.addEventListener('click', () => go(-1));
  nextBtn.addEventListener('click', () => go(1));
  finishBtn.addEventListener('click', () => finish(true));
  cancelBtn.addEventListener('click', () => { dlg.close(); dlg.remove(); });
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal(); draw();
}

/* ---------------- The "Set up" section ---------------- */
function renderStart(sec) {
  sec.append(el('p', { class: 'intro' }, 'Tell me about your situation (where students sit the exam, what they do, whether it is in Moodle) and I will suggest the settings. Then we go through the details one by one: web addresses, sign-in, what students may do.'));
  sec.append(el('div', { class: 'row-actions' },
    el('button', { class: 'primary bigbtn', type: 'button', onclick: () => openWizard() }, 'Describe my situation'),
    el('button', { class: 'bigbtn', type: 'button', onclick: () => $('#fileInput').click() }, 'Open a .seb file I already have')));
  sec.append(el('h3', {}, 'Or start from a ready-made case'));
  sec.append(el('div', { class: 'tpl-grid' },
    TEMPLATES.map(t => el('button', { class: 'tpl', type: 'button', onclick: () => openWizard(t.id) }, el('b', {}, t.title), el('span', {}, t.blurb)))));

  sec.append(el('h3', {}, 'Your saved setups'));
  const list = el('div');
  const msg = el('div');
  const nameIn = el('input', { type: 'text', placeholder: 'Name for the current settings', 'aria-label': 'Setup name' });
  const fileIn = el('input', { type: 'file', accept: '.json,application/json', hidden: true });
  const draw = () => {
    list.textContent = '';
    const all = loadSetups(), names = Object.keys(all).sort();
    if (!names.length) { list.append(el('p', { class: 'empty' }, 'No saved setups yet.')); return; }
    list.append(el('table', {}, el('tbody', {}, names.map(n => el('tr', {},
      el('td', {}, n),
      el('td', { class: 'tight' }, all[n].saved ? new Date(all[n].saved).toLocaleDateString() : ''),
      el('td', { class: 'tight' }, el('button', { class: 'small', type: 'button', onclick: () => { useSetup(n); } }, 'Use')),
      el('td', { class: 'tight' }, el('button', { class: 'small', type: 'button', onclick: () => { if (confirm(`Delete the setup “${n}”?`)) { const o = loadSetups(); delete o[n]; storeSetups(o); draw(); } } }, 'Delete')))))));
  };
  window.drawSetups = draw;
  sec.append(list);
  const more = el('details', {}, el('summary', {}, 'Save these settings, or move setups to another computer'));
  sec.append(more);
  more.append(el('div', { class: 'row-actions' }, nameIn,
    el('button', { type: 'button', onclick: () => {
      const n = nameIn.value.trim();
      if (n && loadSetups()[n] && !confirm(`Replace the setup “${n}”?`)) return;
      const bad = saveSetup(nameIn.value);
      msg.replaceChildren(el('div', { class: 'note ' + (bad ? 'err' : 'ok') }, bad || `Saved “${n}”.`)); nameIn.value = ''; draw();
    } }, 'Save current settings')));
  more.append(msg);
  more.append(el('p', { class: 'intro' }, 'Setups are saved in this browser on this computer, and include everything you changed except passwords, which you set again each time. To move setups to another computer, export them and import them there.'));
  more.append(el('div', { class: 'row-actions' },
    el('button', { type: 'button', onclick: () => {
      const all = loadSetups();
      if (!Object.keys(all).length) { msg.replaceChildren(el('div', { class: 'note warn' }, 'Nothing to export yet.')); return; }
      download(new TextEncoder().encode(JSON.stringify({ sebConfigBuilderSetups: 1, setups: all }, null, 1)), 'seb-setups.json', 'application/json');
    } }, 'Export setups'),
    el('button', { type: 'button', onclick: () => fileIn.click() }, 'Import setups'), fileIn));
  fileIn.addEventListener('change', async () => {
    try {
      const o = JSON.parse(await fileIn.files[0].text());
      if (!o || o.sebConfigBuilderSetups !== 1 || typeof o.setups !== 'object') throw new Error('This is not a setups file from this builder.');
      const all = loadSetups(); let n = 0;
      for (const [k, v] of Object.entries(o.setups)) if (v && typeof v.values === 'object') { all[k] = { saved: v.saved || '', values: v.values }; n++; }
      storeSetups(all); draw();
      msg.replaceChildren(el('div', { class: 'note ok' }, `Imported ${n} setup${n === 1 ? '' : 's'}.`));
    } catch (e) { msg.replaceChildren(el('div', { class: 'note err' }, e.message || 'Could not read that file.')); }
    fileIn.value = '';
  });
  draw();
}

/* ---------------- The "Your setup" summary (simple view) ---------------- */
function renderSummary(sec) {
  if (!window.simpleReady) { sec.classList.add('nosummary'); return; }
  const a = wzAnswersFromState();
  const rows = wzSummaryRows(a).filter(r => r[0] !== 'Exam address' || r[1]);
  sec.append(el('p', { class: 'intro' }, 'This is what the file will do. Anything not listed is left at the usual settings.'),
    el('table', { class: 'summary-table' }, el('tbody', {}, rows.map(([k, v]) => el('tr', {}, el('th', {}, k), el('td', {}, v))))));
  sec.append(el('div', { class: 'row-actions' },
    el('button', { class: 'primary bigbtn', type: 'button', onclick: () => $('#btnDownload').click() }, 'Download the .seb file'),
    el('button', { type: 'button', onclick: () => openWizard() }, 'Change my answers'),
    el('button', { type: 'button', onclick: () => openSheets() }, 'Make information sheets'),
    el('button', { type: 'button', onclick: () => setView(false, '#test') }, 'Check which websites the exam uses')));
  sec.append(el('h3', {}, 'What next?'),
    el('ol', { class: 'next-steps' },
      wzChecklist(window.wzSituation || {}, a).map(x => el('li', {}, x)),
      el('li', {}, 'Want to change a detail the questions did not cover? Use “I know SEB: show all settings” at the top.')));
}

/* ---------------- Printable information sheets ---------------- */
function openSheets() {
  const KEY = 'seb-config-builder-sheet-fields-v1';
  let f = {};
  try { f = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { f = {}; }
  const a = wzAnswersFromState();
  const dlg = el('dialog', { class: 'wz' });
  const field = (k, label, ph) => el('label', { class: 'wz-field' }, label, el('input', { type: 'text', value: f[k] || '', placeholder: ph || '', oninput: e => { f[k] = e.target.value; try { localStorage.setItem(KEY, JSON.stringify(f)); } catch {} } }));
  const make = (kind, name) => {
    const html = kind === 'tech' ? SEBSheets.tech(a, f, wzSummaryRows(a).filter(r => r[1]), wzChecklist(window.wzSituation || {}, a)) : SEBSheets[kind](a, f);
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    const w = window.open(url, '_blank');
    if (!w) download(new TextEncoder().encode(html), name, 'text/html');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  const dl = (kind, name) => {
    const html = kind === 'tech' ? SEBSheets.tech(a, f, wzSummaryRows(a).filter(r => r[1]), wzChecklist(window.wzSituation || {}, a)) : SEBSheets[kind](a, f);
    download(new TextEncoder().encode(html), name, 'text/html');
  };
  const row = (kind, title, blurb, name) => el('div', { class: 'wz-sheet' }, el('b', {}, title), el('span', {}, blurb),
    el('div', { class: 'row-actions' }, el('button', { class: 'primary', type: 'button', onclick: () => make(kind, name) }, 'Open to print'),
      el('button', { type: 'button', onclick: () => dl(kind, name) }, 'Download')));
  dlg.append(el('h3', {}, 'Information sheets'),
    el('p', { class: 'wz-q' }, 'One-page sheets written from your current settings. Fill in the details you know; leave the rest and write them in by hand. No password is ever included.'),
    field('exam', 'Exam name', 'e.g. ECM1234 Final test'), field('when', 'Date and time', 'e.g. Tue 12 Jan, 10:00 to 11:30'),
    field('where', 'Room or place', 'e.g. Cluster room B / at home'), field('contact', 'Who to contact in an emergency', 'name and phone or email'),
    field('sebVersion', 'SEB version to install', 'e.g. 3.8.0 for Windows, 3.6 for Mac'), field('sebLink', 'Where to get SEB', 'default: safeexambrowser.org'),
    row('student', 'For students', 'How to get ready, what they can and cannot do, who to ask, how to leave.', 'seb-student-sheet.html'),
    row('invigilator', 'For invigilators', 'Checks before and at the start, what to do about problems, an incident log and a blank for the quit password.', 'seb-invigilator-sheet.html'),
    row('tech', 'For IT and support', 'What the file does and what to set up and test.', 'seb-it-sheet.html'),
    el('div', { class: 'row-actions' }, el('button', { type: 'button', onclick: () => { dlg.close(); dlg.remove(); } }, 'Close')));
  document.body.append(dlg); dlg.showModal();
}
