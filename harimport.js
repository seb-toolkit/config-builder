// harimport.js: turn a HAR file (browser DevTools "Save all as HAR") or a pasted list of URLs into
// request records for the URL filter test. Only the address, method, resource type, time and
// status of each request are kept. Cookies, headers and page content are read and dropped.
(function (root) {
  'use strict';

  // Names match chrome.webRequest resource types, which the rest of the page already uses.
  const FROM_CHROME_TYPE = {
    document: 'main_frame', stylesheet: 'stylesheet', script: 'script', image: 'image', font: 'font',
    xhr: 'xmlhttprequest', fetch: 'xmlhttprequest', websocket: 'websocket', media: 'media', ping: 'ping',
    other: 'other', texttrack: 'other', manifest: 'other', eventsource: 'other', prefetch: 'other', preflight: 'other'
  };
  const FRAME_DEST = new Set(['iframe', 'frame', 'embed', 'object']);

  function headerValue(headers, name) {
    if (!Array.isArray(headers)) return '';
    const h = headers.find(x => x && typeof x.name === 'string' && x.name.toLowerCase() === name);
    return h && typeof h.value === 'string' ? h.value.toLowerCase() : '';
  }

  function typeFromMime(mime) {
    mime = (mime || '').toLowerCase();
    if (mime.includes('html')) return 'main_frame';       // no better information: assume a page
    if (mime.includes('css')) return 'stylesheet';
    if (mime.includes('javascript') || mime.includes('ecmascript')) return 'script';
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('font/') || mime.includes('font')) return 'font';
    if (mime.includes('json') || mime.includes('xml')) return 'xmlhttprequest';
    return 'other';
  }

  function resourceType(entry) {
    const chrome = (entry._resourceType || '').toLowerCase();
    if (chrome) {
      const t = FROM_CHROME_TYPE[chrome] || 'other';
      if (t === 'main_frame') {
        const dest = headerValue(entry.request && entry.request.headers, 'sec-fetch-dest');
        if (FRAME_DEST.has(dest)) return 'sub_frame';
      }
      return t;
    }
    return typeFromMime(entry.response && entry.response.content && entry.response.content.mimeType);
  }

  const CHECKED = /^(https?|wss?|ftp):/i;

  // Returns { requests: [{time,url,rtype,method,status,error}], skipped }
  function parseHAR(text) {
    let har;
    try { har = JSON.parse(text); } catch { throw new Error('This is not a valid HAR (JSON) file.'); }
    const entries = har && har.log && har.log.entries;
    if (!Array.isArray(entries)) throw new Error('No requests found: this does not look like a HAR file.');
    const requests = []; let skipped = 0;
    for (const e of entries) {
      const url = e && e.request && e.request.url;
      if (typeof url !== 'string' || !CHECKED.test(url)) { skipped++; continue; }
      const status = e.response && e.response.status;
      requests.push({
        time: Date.parse(e.startedDateTime) || 0, url, rtype: resourceType(e), method: e.request.method || 'GET',
        status: status > 0 ? status : undefined, error: e._error || (status === 0 ? 'no response' : undefined)
      });
    }
    return { requests, skipped };
  }

  // One address per line. Blank lines and lines starting with # are ignored.
  // A list has no resource types, so each address is checked as if it were a page (the strictest case).
  function parseURLList(text) {
    const requests = []; let skipped = 0;
    for (let line of String(text).split(/\r?\n/)) {
      line = line.trim().replace(/,+$/, '').replace(/^["']+|["']+$/g, '');
      if (!line || line.startsWith('#')) continue;
      if (!CHECKED.test(line)) { skipped++; continue; }
      try { new URL(line); } catch { skipped++; continue; }
      requests.push({ time: 0, url: line, rtype: 'listed', method: '' });
    }
    return { requests, skipped };
  }

  // A file or pasted text: HAR if it parses as one, otherwise a URL list.
  function parseAny(text) {
    const t = String(text).trim();
    if (t.startsWith('{')) return { kind: 'HAR', ...parseHAR(t) };
    return { kind: 'URL list', ...parseURLList(t) };
  }

  root.HARImport = { parseHAR, parseURLList, parseAny };
  if (typeof module !== 'undefined') module.exports = root.HARImport;
})(typeof window !== 'undefined' ? window : globalThis);
