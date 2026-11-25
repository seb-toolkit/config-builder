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
  loadDict(fromJsonable(s.values));
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

/* ---------------- The wizard ---------------- */
function wzAnswersFromState() {
  const v = state.values;
  let host = ''; try { host = new URL(v.startURL).host; } catch {}
  const others = (v.URLFilterRules || []).filter(r => r.action === 1 && !r.regex && r.expression && r.expression !== host).map(r => r.expression);
  const passwordSet = !!(v.hashedQuitPassword || state.newPasswords.hashedQuitPassword);
  return {
    startURL: v.startURL || '',
    platforms: { win: true, mac: true, ios: true },
    quitMode: 'password',
    quitPassword: '',
    passwordAlreadySet: passwordSet,
    quitURL: v.quitURL || '',
    sites: !v.URLFilterEnable ? (v.startURL ? 'any' : 'quiz') : others.length ? 'more' : 'quiz',   // a fresh builder defaults to the recommended choice
    otherSites: others.join('\n'),
    fullScreen: v.browserViewMode === 1,
    clipboard: v.clipboardPolicy === 1 ? 'block' : v.clipboardPolicy === 0 ? 'allow' : 'seb',
    spell: !!v.allowSpellCheck, print: !!v.allowPrint, backForward: !!v.allowBrowsingBackForward,
    downloads: !!v.allowDownloads, uploads: !!v.allowUploads,
    ms: (v.permittedProcesses || []).some(p => p && p.active && MS_BROKERS.includes(p.executable)) ? 'hello' : 'no',
    sendKey: !!v.sendBrowserExamKey,
    saveName: ''
  };
}

function wzApply(a) {
  const v = state.values;
  v.startURL = a.startURL.trim();
  // quitting
  v.allowQuit = true;
  if (a.quitMode === 'free') { v.hashedQuitPassword = ''; delete state.newPasswords.hashedQuitPassword; }
  else if (a.quitPassword) { state.newPasswords.hashedQuitPassword = a.quitPassword; }
  v.quitURL = a.quitURL.trim();
  // websites
  if (a.sites === 'any') v.URLFilterEnable = false;
  else {
    v.URLFilterEnable = true;
    let host = ''; try { host = new URL(v.startURL).host; } catch {}
    const want = [host, ...(a.sites === 'more' ? a.otherSites.split(/\r?\n/).map(s => s.trim()) : [])].filter(Boolean);
    const keep = v.URLFilterRules.filter(r => r.action !== 1 || r.regex);        // keep Block and regex rules
    const seen = new Set();
    if (a.ms !== 'no') want.push(...MS_DOMAINS);
    const allow = want.filter(x => !seen.has(x) && seen.add(x)).map(x => ({ active: true, action: 1, regex: false, expression: x }));
    v.URLFilterRules = keep.concat(allow);
  }
  if (a.ms === 'hello') {
    const have = new Set((v.permittedProcesses || []).map(p => p && p.executable));
    v.permittedProcesses = (v.permittedProcesses || []).concat(MS_BROKERS.filter(x => !have.has(x)).map(brokerEntry));
    for (const p of v.permittedProcesses) if (p && MS_BROKERS.includes(p.executable)) p.active = true;
    // On a separate desktop (the default) the sign-in window stays hidden; working files use the Explorer-shell kiosk mode instead.
    v.killExplorerShell = true; v.createNewDesktop = false;
  }
  v.browserViewMode = a.fullScreen ? 1 : 0;
  v.clipboardPolicy = a.clipboard === 'block' ? 1 : a.clipboard === 'allow' ? 0 : 2;
  v.enablePrivateClipboard = a.clipboard !== 'allow';
  v.allowSpellCheck = a.spell; v.allowPrint = a.print; v.allowBrowsingBackForward = a.backForward;
  v.allowDownloads = a.downloads; v.allowUploads = a.uploads;
  v.sendBrowserExamKey = a.sendKey;
  // which settings to show
  const p = a.platforms, n = [p.win, p.mac, p.ios].filter(Boolean).length;
  const plat = n === 1 ? (p.win ? 'win' : p.mac ? 'mac' : 'ios') : 'all';
  document.querySelector(`input[name=plat][value=${plat}]`).checked = true;
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

function openWizard() {
  let a = wzAnswersFromState();
  const setups = Object.keys(loadSetups()).sort();
  let base = '';      // '' = the settings currently in the builder, otherwise the name of a saved setup
  let step = 0;

  const steps = [];
  if (setups.length) steps.push({
    title: 'Where do you want to start?',
    body: () => {
      const opts = [{ v: '', label: 'The settings now in the builder' }, ...setups.map(n => ({ v: n, label: 'Saved setup: ' + n }))];
      return [el('p', { class: 'wz-q' }, 'Start from a saved setup to reuse it for a new exam; you can change anything in the next steps.'),
        wzRadio('wz-base', opts, base, v => { base = v; })];
    },
    leave: () => { if (base && useSetup(base)) a = wzAnswersFromState(); }
  });
  steps.push({
    title: 'What is the exam’s web address?',
    body: () => {
      const inp = el('input', { type: 'text', value: a.startURL, placeholder: 'https://moodle.example.ac.uk/mod/quiz/view.php?id=123', spellcheck: 'false', 'aria-label': 'Exam web address' });
      inp.addEventListener('input', () => { a.startURL = inp.value; });
      return [el('p', { class: 'wz-q' }, 'Open the quiz in your normal browser and paste its address here. This is the page SEB opens first.'), inp];
    },
    check: () => { try { const u = new URL(a.startURL.trim()); return /^https?:$/.test(u.protocol) ? '' : 'The address should start with https://'; } catch { return 'Paste a full web address, starting with https://'; } }
  });
  steps.push({
    title: 'Which computers will students use?',
    body: () => [el('p', { class: 'wz-q' }, 'One file works on all of them. This only decides which settings are shown to you, so there is less to look at.'),
      wzCheck('Windows', '', a.platforms.win, c => { a.platforms.win = c; }),
      wzCheck('Mac', '', a.platforms.mac, c => { a.platforms.mac = c; }),
      wzCheck('iPad or iPhone', '', a.platforms.ios, c => { a.platforms.ios = c; })],
    check: () => (a.platforms.win || a.platforms.mac || a.platforms.ios) ? '' : 'Choose at least one.'
  });
  steps.push({
    title: 'How do students leave SEB?',
    body: () => {
      const pw = el('input', { type: 'password', autocomplete: 'new-password', placeholder: a.passwordAlreadySet ? 'A password is already set; type one to replace it' : 'Quit password', 'aria-label': 'Quit password' });
      pw.addEventListener('input', () => { a.quitPassword = pw.value; });
      const url = el('input', { type: 'text', value: a.quitURL, placeholder: 'https://moodle.example.ac.uk/mod/quiz/review.php?…', spellcheck: 'false', 'aria-label': 'Quit link' });
      url.addEventListener('input', () => { a.quitURL = url.value; });
      const pwRow = el('div', { class: 'wz-sub' }, pw);
      const show = () => { pwRow.hidden = a.quitMode !== 'password'; };
      const radios = wzRadio('wz-quit', [
        { v: 'password', label: 'Quitting needs a password', help: 'Recommended. You tell invigilators the password; students cannot leave early.' },
        { v: 'free', label: 'Students can quit whenever they like', help: 'No password. Fine for practice quizzes.' }], a.quitMode, v => { a.quitMode = v; show(); });
      show();
      return [radios, pwRow,
        el('h4', {}, 'Quit link (optional)'),
        el('p', { class: 'wz-help' }, 'A web address that quits SEB as soon as it opens, such as the quiz review page. Students then leave without needing the password. Leave blank if you do not need it.'), url];
    },
    check: () => a.quitMode === 'password' && !a.quitPassword && !a.passwordAlreadySet ? 'Type a quit password, or choose “Students can quit whenever they like”.' : ''
  });
  steps.push({
    title: 'Which websites can students open?',
    body: () => {
      const ta = el('textarea', { rows: 4, placeholder: 'One per line, e.g.\nexample.org\n*.cdn.example.com', spellcheck: 'false', 'aria-label': 'Other websites' });
      ta.value = a.otherSites; ta.addEventListener('input', () => { a.otherSites = ta.value; });
      const box = el('div', { class: 'wz-sub' }, el('p', { class: 'wz-help' }, 'Other sites to allow, one per line. A name such as example.org also allows its subdomains.'), ta);
      const show = () => { box.hidden = a.sites !== 'more'; };
      const r = wzRadio('wz-sites', [
        { v: 'quiz', label: 'Only the exam’s own site', help: 'Recommended. Everything else is blocked.' },
        { v: 'more', label: 'The exam site and some others', help: 'For example a video host, a calculator site or a document viewer.' },
        { v: 'any', label: 'Any website', help: 'No filtering. Students can browse freely inside SEB.' }], a.sites, v => { a.sites = v; show(); });
      show();
      return [r, box, el('p', { class: 'wz-help' }, 'Not sure which sites the quiz needs? Finish the wizard, then use “Test the URL filter” to see every address it loads.')];
    }
  });
  steps.push({
    title: 'Do students sign in with a Microsoft account?',
    body: () => [
      el('p', { class: 'wz-q' }, 'For example a university login that asks for a second step (two-step verification). Choose how students are asked to prove it is them.'),
      wzRadio('wz-ms', [
        { v: 'no', label: 'No Microsoft sign-in', help: 'Or they are already signed in before SEB starts.' },
        { v: 'phone', label: 'Yes, they approve on their phone', help: 'The Authenticator app (tap or enter a number) or a text message. Nothing extra is needed in SEB; the Microsoft web addresses are allowed if you filter websites.' },
        { v: 'hello', label: 'Yes, with Windows Hello, a PIN, a passkey or a security key', help: 'Windows only. Permits the Windows sign-in components and changes the Windows kiosk mode so the prompt can appear.' }], a.ms, v => { a.ms = v; }),
      el('div', { class: 'note warn' }, 'Passkeys do not work in SEB for Mac or iPad. Use SEB 3.10.2 or later on Windows. The safest plan is for students to use the phone approval and delete any passkey they have enrolled. Microsoft is making passkeys the default sign-in method from September 2026, so students who enrolled one may be sent to it. Always test the whole sign-in on a real Windows computer first.'),
      el('p', { class: 'wz-help' }, 'The Windows option adds CredentialUIBroker.exe, PickerHost.exe and PinEnrollmentBroker.exe as permitted programs without a name or signature check. SEB’s developers warn that this means a student could pass off another program as one of these. Their own fix is planned for SEB 4.')]
  });
  steps.push({
    title: 'How should SEB look?',
    body: () => [wzRadio('wz-screen', [
      { v: 'full', label: 'Full screen', help: 'Recommended for exams.' },
      { v: 'window', label: 'In a window', help: 'Students can move and resize it.' }], a.fullScreen ? 'full' : 'window', v => { a.fullScreen = v === 'full'; })]
  });
  steps.push({
    title: 'What can students do in the exam?',
    body: () => [
      el('h4', {}, 'Copy and paste'),
      wzRadio('wz-clip', [
        { v: 'seb', label: 'Only inside the exam', help: 'Students can copy and paste within the quiz, but not to or from other programs.' },
        { v: 'block', label: 'Blocked', help: 'Windows only. On a Mac this behaves like “only inside the exam”.' },
        { v: 'allow', label: 'Allowed everywhere', help: 'Includes other programs. Not recommended.' }], a.clipboard, v => { a.clipboard = v; }),
      el('h4', {}, 'Allow students to…'),
      wzCheck('Use the spell checker', '', a.spell, c => { a.spell = c; }),
      wzCheck('Print', '', a.print, c => { a.print = c; }),
      wzCheck('Go back and forward between pages', 'Off is usual for quizzes that should not be revisited.', a.backForward, c => { a.backForward = c; }),
      wzCheck('Download files', '', a.downloads, c => { a.downloads = c; }),
      wzCheck('Upload files', 'Needed for file-upload questions.', a.uploads, c => { a.uploads = c; })]
  });
  steps.push({
    title: 'Will Moodle check the settings?',
    body: () => [el('p', { class: 'wz-q' }, 'If you upload this file to Moodle (quiz settings → Safe Exam Browser → “Upload my own config”), Moodle can check that students really opened the quiz with exactly these settings.'),
      wzRadio('wz-key', [
        { v: 'yes', label: 'Yes, let Moodle check', help: 'SEB sends its keys with every request. Upload the final file to Moodle after any change.' },
        { v: 'no', label: 'No, or not using Moodle’s check' }], a.sendKey ? 'yes' : 'no', v => { a.sendKey = v === 'yes'; })]
  });
  steps.push({
    title: 'Check your choices',
    body: () => {
      const yn = x => x ? 'Yes' : 'No';
      const rows = [
        ['Exam address', a.startURL.trim()],
        ['Leaving SEB', a.quitMode === 'password' ? (a.quitPassword || a.passwordAlreadySet ? 'With a password' : 'With a password (not set)') : 'Anyone can quit'],
        ['Quit link', a.quitURL.trim() || 'None'],
        ['Websites', a.sites === 'quiz' ? 'Only the exam’s own site' : a.sites === 'any' ? 'Any website' : 'The exam site and ' + (a.otherSites.split(/\r?\n/).filter(s => s.trim()).length) + ' other'],
        ['Microsoft sign-in', a.ms === 'hello' ? 'Windows Hello, PIN, passkey or key (programs permitted)' : a.ms === 'phone' ? 'Approval on phone' : 'None'],
        ['Screen', a.fullScreen ? 'Full screen' : 'Window'],
        ['Copy and paste', a.clipboard === 'seb' ? 'Only inside the exam' : a.clipboard === 'block' ? 'Blocked' : 'Allowed everywhere'],
        ['Spell check / print / back-forward', [yn(a.spell), yn(a.print), yn(a.backForward)].join(' / ')],
        ['Downloads / uploads', yn(a.downloads) + ' / ' + yn(a.uploads)],
        ['Moodle checks the settings', yn(a.sendKey)]];
      const tbl = el('table', {}, el('tbody', {}, rows.map(([k, v]) => el('tr', {}, el('th', {}, k), el('td', {}, v)))));
      const name = el('input', { type: 'text', value: a.saveName, placeholder: 'e.g. Year 2 Moodle quiz', 'aria-label': 'Setup name' });
      name.addEventListener('input', () => { a.saveName = name.value; });
      return [tbl,
        el('p', { class: 'wz-help' }, 'Everything else stays at the builder’s defaults. You can change any of it in the sections after you finish.'),
        el('h4', {}, 'Save these choices (optional)'),
        el('p', { class: 'wz-help' }, 'Give them a name to reuse them for another exam. Saved in this browser only; passwords are not saved.'), name];
    }
  });

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
    const s = steps[step], last = step === steps.length - 1;
    head.textContent = '';
    head.append(el('div', { class: 'wz-progress' }, `Step ${step + 1} of ${steps.length}`), el('h2', {}, s.title));
    bodyBox.textContent = ''; bodyBox.append(...s.body());
    err.hidden = true;
    backBtn.hidden = step === 0; nextBtn.hidden = last; finishBtn.hidden = !last;
    nextBtn.textContent = last ? 'Finish' : 'Next';
    const f = bodyBox.querySelector('input[type=text],input[type=password],textarea'); if (f) f.focus();
  }
  function go(delta) {
    const s = steps[step];
    if (delta > 0) {
      const msg = s.check ? s.check() : '';
      if (msg) { err.textContent = msg; err.hidden = false; return; }
      if (s.leave) s.leave();
    }
    step += delta; draw();
  }
  function finish(download) {
    const msg = steps.slice(1).map(s => s.check && s.check()).find(Boolean);
    if (msg) { err.textContent = msg; err.hidden = false; return; }
    wzApply(a);
    if (a.saveName.trim()) {
      const bad = saveSetup(a.saveName);
      if (bad) setStatus(bad, 'err'); else if (window.drawSetups) window.drawSetups();
    }
    dlg.close();
    if (download) $('#btnDownload').click();
    else { setStatus('Setup applied. Check the sections below, then download the file.', 'ok'); const t = $('#exam'); if (t) t.scrollIntoView(); }
  }
  backBtn.addEventListener('click', () => go(-1));
  nextBtn.addEventListener('click', () => go(1));
  finishBtn.addEventListener('click', () => finish(true));
  cancelBtn.addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal(); draw();
}

/* ---------------- The "Set up" section ---------------- */
function renderStart(sec) {
  sec.append(el('p', { class: 'intro' }, 'New to this? Answer a few plain questions and the builder fills in the settings for you. Or start from a setup you saved earlier. You can still change anything afterwards.'));
  sec.append(el('div', { class: 'row-actions' }, el('button', { class: 'primary', type: 'button', onclick: openWizard }, 'Set up with questions')));

  sec.append(el('h3', {}, 'Saved setups'));
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
  sec.append(el('div', { class: 'row-actions' }, nameIn,
    el('button', { type: 'button', onclick: () => {
      const n = nameIn.value.trim();
      if (n && loadSetups()[n] && !confirm(`Replace the setup “${n}”?`)) return;
      const bad = saveSetup(nameIn.value);
      msg.replaceChildren(el('div', { class: 'note ' + (bad ? 'err' : 'ok') }, bad || `Saved “${n}”.`)); nameIn.value = ''; draw();
    } }, 'Save current settings')));
  sec.append(msg);
  sec.append(el('p', { class: 'intro' }, 'Setups are saved in this browser on this computer, and include everything you changed except passwords, which you set again each time. To move setups to another computer, export them and import them there.'));
  sec.append(el('div', { class: 'row-actions' },
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
