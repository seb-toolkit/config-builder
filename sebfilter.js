// sebfilter.js: SEB URL filter, ported from the Windows client
// (seb-win-refactoring: SafeExamBrowser.Browser/Filters/RequestFilter.cs, Rules/SimplifiedRule.cs,
//  Rules/RegexRule.cs, Responsibilities/Window/RequestResponsibility.cs, Handlers/RequestHandler.cs).
//
// Behaviour copied from there:
//  - Block rules are checked first, then allow rules; no match = blocked.
//  - If the start URL would be blocked, a simplified allow rule for the full start URL is added.
//  - URLFilterEnable filters main-frame (top page) navigations. URLFilterEnableContentFilter
//    additionally filters everything else (frames, scripts, images, XHR, ...).
//  - URLs are URL-decoded before matching; matching is case-insensitive.
// The macOS client has its own implementation; it is close but not identical.
(function (root) {
  'use strict';

  const URL_DELIMITER = /^(?:([^:]*):\/\/)?(?:([^:@]*)(?::([^@]*))?@)?(?:([^/:?#]*))?(?::([0-9*]*))?([^?#]*)?(?:\?([^#]*))?(?:#(.*))?/;
  // .NET Regex.Escape escapes \ * + ? | { [ ( ) ^ $ . # and white space
  const netEscape = s => s.replace(/[\\*+?|{[()^$.#]/g, '\\$&').replace(/ /g, '\\ ').replace(/\t/g, '\\t').replace(/\n/g, '\\n');
  const wild = s => s.replace(/\\\*/g, '.*');
  const build = s => new RegExp('^' + s + '$', 'i');
  const DEFAULT_PORT = { http: 80, https: 443, ftp: 21, ws: 80, wss: 443 };

  function simplifiedRule(expression) {
    if (!/[a-zA-Z0-9*]+/.test(expression)) throw new Error('Expression must contain at least one letter, digit or *.');
    const m = URL_DELIMITER.exec(expression) || [];
    const r = {};
    const [, scheme, user, pass, host = '', port, path, query, fragment] = m.map(x => x == null ? '' : x);
    if (scheme) r.scheme = build(wild(netEscape(scheme)));
    if (user) r.userInfo = build(wild(pass ? `${netEscape(user)}:${netEscape(pass)}` : `${netEscape(user)}(:.*)?`));
    {
      const isAlnum = /^[a-zA-Z0-9]+$/.test(host);
      const exactSub = host.startsWith('.');
      let h = wild(netEscape(exactSub ? host.slice(1) : host));
      if (!isAlnum && !exactSub) h = `(.+?\\.)*${h}`;
      r.host = build(h);
    }
    if (/^\d+$/.test(port)) r.port = parseInt(port, 10);
    if (path && path.trim() && path !== '/') {
      let p = wild(netEscape(path));
      p = p.endsWith('/') ? p + '?' : p + '/?';
      r.path = build(p);
    }
    if (query && query.trim()) r.query = build(query === '.' ? '\\??' : '\\??' + wild(netEscape(query)));
    if (fragment && fragment.trim()) r.fragment = build('#?' + wild(netEscape(fragment)));
    return url => {
      let u;
      try { u = new URL(url); } catch { return false; }
      const sch = u.protocol.replace(/:$/, '');
      const ui = u.username ? decodeURIComponent(u.username) + (u.password ? ':' + decodeURIComponent(u.password) : '') : '';
      const prt = u.port ? parseInt(u.port, 10) : (DEFAULT_PORT[sch] ?? -1);
      return (!r.scheme || r.scheme.test(sch)) &&
        (!r.userInfo || r.userInfo.test(ui)) &&
        r.host.test(u.hostname) &&
        (r.port == null || r.port === prt) &&
        (!r.path || r.path.test(u.pathname)) &&
        (!r.query || r.query.test(u.search)) &&
        (!r.fragment || r.fragment.test(u.hash));
    };
  }

  function regexRule(expression) {
    // .NET and JS regex syntax differ in places (e.g. inline options, named groups); most rules work in both.
    const re = new RegExp(expression, 'i');
    return url => re.test(url);
  }

  function urlDecode(s) {
    // WebUtility.UrlDecode: '+' -> space, %xx decoded; invalid sequences left as they are
    s = s.replace(/\+/g, ' ');
    try { return decodeURIComponent(s); } catch { return s.replace(/%([0-9a-f]{2})/gi, (m, h) => { try { return decodeURIComponent(m); } catch { return m; } }); }
  }

  // rules: [{active, action (1 allow / 0 block), regex, expression}]
  // Returns { check(url, isMainFrame) -> {result:'allow'|'block'|'unfiltered', rule, reason}, errors }
  function createFilter({ enabled, contentFilter, rules = [], startURL = '' }) {
    const allow = [], block = [], errors = [];
    for (const r of rules) {
      if (!r.active || !r.expression) continue;
      try {
        const test = r.regex ? regexRule(r.expression) : simplifiedRule(r.expression);
        (r.action === 1 ? allow : block).push({ rule: r, test });
      } catch (e) { errors.push({ rule: r, message: e.message }); }
    }
    const process = url => {
      for (const b of block) { try { if (b.test(url)) return { result: 'block', rule: b.rule }; } catch {} }
      for (const a of allow) { try { if (a.test(url)) return { result: 'allow', rule: a.rule }; } catch {} }
      return { result: 'block', rule: null, reason: 'No rule matches' };
    };
    let autoStart = null;
    if (enabled && startURL) {
      try {
        if (process(startURL).result !== 'allow') {
          autoStart = { active: true, action: 1, regex: false, expression: startURL, auto: true };
          allow.push({ rule: autoStart, test: simplifiedRule(startURL) });
        }
      } catch {}
    }
    const processContent = enabled && contentFilter;
    function check(rawUrl, isMainFrame) {
      if (!enabled || (!isMainFrame && !processContent)) return { result: 'unfiltered' };
      const url = urlDecode(rawUrl);
      try { new URL(url); } catch { return { result: 'unfiltered', reason: 'Not a valid absolute URL' }; }
      if (isMainFrame && url.startsWith('chrome-extension://')) return { result: 'unfiltered' };
      return process(url);
    }
    return { check, errors, autoStart };
  }

  root.SEBFilter = { createFilter, simplifiedRule, regexRule };
  if (typeof module !== 'undefined') module.exports = root.SEBFilter;
})(typeof window !== 'undefined' ? window : globalThis);
