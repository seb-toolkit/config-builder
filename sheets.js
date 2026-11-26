// sheets.js: printable information sheets (students, invigilators, IT) written from the current setup.
// Everything is made in the browser. A quit password is never written into a sheet: the invigilator
// sheet has a blank line to fill in by hand.
(function (root) {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const lines = t => String(t || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const li = items => '<ul>' + items.map(x => '<li>' + x + '</li>').join('') + '</ul>';
  const ol = items => '<ol>' + items.map(x => '<li>' + x + '</li>').join('') + '</ol>';
  const blank = (label, v) => v ? esc(v) : '<span class="fill">' + esc(label) + '</span>';

  const CSS = `
  :root { color-scheme: light; }
  body { font: 15px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif; color: #111; max-width: 780px; margin: 24px auto; padding: 0 20px; }
  h1 { font-size: 26px; margin: 0 0 2px; } h2 { font-size: 18px; margin: 22px 0 4px; border-bottom: 2px solid #2457c5; padding-bottom: 2px; }
  .sub { color: #444; margin: 0 0 14px; } .box { border: 1px solid #999; border-radius: 6px; padding: 8px 12px; margin: 10px 0; }
  table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #999; padding: 5px 9px; text-align: left; vertical-align: top; }
  th { width: 30%; background: #f0f0f0; } ul, ol { margin: 4px 0 4px 22px; padding: 0; } li { margin: 2px 0; }
  .fill { display: inline-block; min-width: 190px; border-bottom: 1px solid #111; color: #777; font-size: 12px; }
  .small { font-size: 12px; color: #444; margin-top: 24px; border-top: 1px solid #999; padding-top: 6px; }
  .noprint { background: #eef3ff; border: 1px solid #9ab; padding: 8px 12px; margin-bottom: 14px; border-radius: 6px; }
  button { font: inherit; padding: 5px 14px; }
  @media print { .noprint { display: none; } body { margin: 0; max-width: none; } h2 { break-after: avoid; } li, tr { break-inside: avoid; } }`;

  function page(title, body) {
    return '<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + esc(title) + '</title><style>' + CSS + '</style></head><body>' +
      '<div class="noprint"><button onclick="window.print()">Print or save as PDF</button> &nbsp; Check the details, add anything missing by hand, then print.</div>' +
      body + '<p class="small">Made with the SEB Config Builder (an independent tool, not from the Safe Exam Browser project). Your own exam office’s instructions take priority over this sheet.</p></body></html>';
  }

  function head(f, who) {
    return '<h1>' + esc(f.exam || 'Exam') + ': ' + who + '</h1><p class="sub">' +
      [f.when && esc(f.when), f.where && esc(f.where)].filter(Boolean).join(' · ') + '</p>';
  }

  // What students can and cannot do, from the answers
  function rules(a) {
    const can = [], cannot = [];
    can.push('Answer the exam in Safe Exam Browser, which fills the screen.');
    if (a.sites === 'quiz') cannot.push('Open other websites. Only the exam’s own site works, so a blocked page is normal, not a fault.');
    else if (a.sites === 'more') {
      const extra = lines(a.otherSites).concat(a.yt ? ['youtube.com'] : [], a.vimeo ? ['vimeo.com'] : []);
      can.push('Open the exam site' + (extra.length ? ' and these sites: ' + extra.map(esc).join(', ') : ' and the other sites your lecturer listed') + '.');
      cannot.push('Open any other website.');
    } else { can.push('Browse the web inside SEB.'); if (a.blockAi) cannot.push('Open AI assistant websites, which are blocked.'); }
    cannot.push('Use other programs' + (a.task === 'programs' ? ', except those listed below' : '') + ', other windows, or other tabs.');
    const progs = lines(a.programs);
    if (progs.length) can.push('Use these programs: ' + progs.map(esc).join('; ') + '.');
    can.push(a.clipboard === 'seb' ? 'Copy and paste inside the exam only.' : a.clipboard === 'allow' ? 'Copy and paste.' : '');
    if (a.clipboard === 'block') cannot.push('Copy and paste.');
    if (a.downloads || a.uploads) can.push('Download' + (a.downloads && a.uploads ? ' and upload' : a.uploads ? ' (upload only)' : '') + ' files as the exam instructions describe. Downloads go to a temporary folder.');
    else cannot.push('Download or upload files.');
    if (a.backForward) can.push('Use the back and forward buttons.');
    if (a.print) can.push('Print.'); else cannot.push('Print.');
    if (a.spell) can.push('Use spell check.');
    return { can: can.filter(Boolean), cannot };
  }

  function startSteps(a, f) {
    const v = esc(f.sebVersion || 'the current version');
    const link = f.sebLink ? esc(f.sebLink) : 'safeexambrowser.org';
    const install = 'Install Safe Exam Browser (' + v + ') from <b>' + link + '</b> before the exam day, and do the practice quiz if there is one.';
    const start = a.moodle === 'upload' ? 'Open the quiz in Moodle and select <b>Launch Safe Exam Browser</b>.'
      : a.moodle === 'hidden' ? 'Open the <b>.seb</b> file you were given. SEB starts and opens the exam.'
      : 'Open the <b>.seb</b> file you were given, or follow the link from your exam page.';
    return [install, 'Save your work and close other programs (screen sharing, remote access, virtual machines).', start];
  }

  function leaving(a) {
    return a.quitMode === 'free' ? 'You can quit SEB when you have finished (Ctrl+Q on Windows, Cmd+Q on a Mac, or the quit button).'
      : a.quitMode === 'link' ? 'When you have submitted, select <b>Exit Safe Exam Browser</b> on the quiz page. If there is no button, ask the invigilator.'
      : 'Do not quit before you have submitted. The invigilator will give you the quit password when you are allowed to leave. Do not share it.';
  }

  function signIn(a) {
    return a.ms === 'hello' ? 'Sign in with your university Microsoft account. Windows Hello, a PIN or a passkey can be used on Windows. Test it before the exam.'
      : a.ms === 'phone' ? 'Sign in with your university Microsoft account and approve the sign-in on your phone. Charge your phone and test it before the exam.'
      : a.ms === 'sso' ? 'Sign in with your university account as usual. Test it before the exam.' : '';
  }

  function student(a, f) {
    const r = rules(a), si = signIn(a);
    return page('Student information sheet', head(f, 'information for students') +
      '<h2>Before the exam</h2>' + ol(startSteps(a, f)) +
      (si ? '<h2>Signing in</h2><p>' + si + '</p>' : '') +
      '<h2>During the exam</h2><table><tr><th>You can</th><td>' + li(r.can) + '</td></tr><tr><th>You cannot</th><td>' + li(r.cannot) + '</td></tr></table>' +
      '<h2>If something goes wrong</h2>' + li([
        'Stay calm and <b>do not restart or switch off</b> unless you are told to.',
        'Put your hand up or contact: ' + blank('invigilator or exam contact', f.contact) + '.',
        'Moodle normally saves your answers as you go. The invigilator will tell you what happens to your time.',
        'Please note the time and what the screen says.']) +
      '<h2>Leaving</h2><p>' + leaving(a) + '</p>' +
      '<p class="small">More help: ' + esc(f.site || 'https://seb-toolkit.github.io/config-builder/guides/students.html') + '</p>');
  }

  function invigilator(a, f) {
    const r = rules(a);
    const rows = [['Exam', blank('exam', f.exam)], ['Date and time', blank('date and time', f.when)], ['Room', blank('room', f.where)],
      ['Support contact', blank('IT or exam office', f.contact)], ['Quit password', '<span class="fill">write in by hand; do not share early</span>']];
    return page('Invigilator sheet', head(f, 'invigilator sheet') +
      '<table>' + rows.map(x => '<tr><th>' + x[0] + '</th><td>' + x[1] + '</td></tr>').join('') + '</table>' +
      '<h2>Before students arrive</h2>' + li([
        a.place === 'cluster' ? 'Check the room computers have the current Safe Exam Browser and that one has been tried with this exam.' : 'Check students know how to get Safe Exam Browser and that they did the practice quiz.',
        'Have the quit password and the support contact to hand.',
        'Tell students to close other programs and charge or plug in their computers.']) +
      '<h2>At the start</h2>' + ol(startSteps(a, f).slice(1).concat(['Check every student reaches the exam page, and note anyone who cannot start.'])) +
      '<h2>What students can and cannot do</h2><p>This helps you tell a fault from a rule.</p><table><tr><th>Can</th><td>' + li(r.can) + '</td></tr><tr><th>Cannot</th><td>' + li(r.cannot) + '</td></tr></table>' +
      '<h2>If a student has a problem</h2>' + li([
        'Ask them <b>not</b> to restart or switch off. Moodle usually saves answers as they go.',
        'Note the time, the student and the exact message.',
        'Common causes: another program is running; the network dropped; the sign-in prompt did not appear (see below).',
        'Contact support: ' + blank('support contact', f.contact) + '. Follow your exam rules on adjusting time.']) +
      (signIn(a) ? '<h2>Sign-in</h2><p>' + signIn(a) + '</p>' : '') +
      '<h2>At the end</h2><p>' + (a.quitMode === 'free' ? 'Students can quit themselves once they have submitted.' : a.quitMode === 'link' ? 'Students use the <b>Exit Safe Exam Browser</b> button on the quiz page after submitting. If it does not appear, check they submitted.' : 'Give the quit password only when a student has submitted and may leave. Students should not share it.') + '</p>' +
      '<h2>If one student cannot use SEB</h2>' + li([
        'First try to fix it, then <b>move them to a spare computer</b> that has SEB installed.',
        'Only if neither works, and only with the exam lead’s agreement, they may sit the exam without SEB while you watch them. Ask the exam lead to set this up.',
        'Do not give them the quit password or tell them to change settings.',
        'Write down the time, the fault and who agreed, and agree how any lost time is handled.']) +
      '<h2>Incident log</h2><table><tr><th>Time</th><th>Student</th><th>What happened</th><th>Action</th></tr>' + '<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>'.repeat(5) + '</table>');
  }

  function tech(a, f, summary, checklist) {
    return page('Technical summary', head(f, 'technical summary for IT and support') +
      '<h2>What the file does</h2><table>' + summary.map(([k, v]) => '<tr><th>' + esc(k) + '</th><td>' + esc(v) + '</td></tr>').join('') + '</table>' +
      '<h2>To do</h2>' + ol(checklist.map(esc)) +
      '<h2>Contacts and notes</h2><p>Support contact: ' + blank('name and number', f.contact) + '</p><p>SEB version tested: ' + blank('version', f.sebVersion) + '</p>');
  }

  root.SEBSheets = { student, invigilator, tech };
  if (typeof module !== 'undefined') module.exports = root.SEBSheets;
})(typeof window !== 'undefined' ? window : globalThis);
