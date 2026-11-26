// seb-core.js: read and write Safe Exam Browser (.seb) config files in the browser.
// Format verified against seb-win-refactoring (SafeExamBrowser.Configuration) and
// seb-mac (SEBConfigFileManager.m, RNCryptor). See SEB-ANALYSIS.md.
// Works in browsers and in Node 18+ (uses WebCrypto and Compression Streams only).

(function (root) {
  'use strict';

  const subtle = root.crypto.subtle;
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  // ---------- bytes ----------
  function concat(...parts) {
    const len = parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(len);
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  }
  function randomBytes(n) { return root.crypto.getRandomValues(new Uint8Array(n)); }
  function toBase64(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return root.btoa(s);
  }
  function fromBase64(b64) {
    const s = root.atob(b64.replace(/\s+/g, ''));
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  function toHex(bytes) { return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join(''); }
  function ascii(bytes, start, len) { return String.fromCharCode(...bytes.subarray(start, start + len)); }

  // ---------- gzip ----------
  async function pipe(bytes, stream) {
    const res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
    return new Uint8Array(await res.arrayBuffer());
  }
  const gzip = b => pipe(b, new CompressionStream('gzip'));
  const gunzip = b => pipe(b, new DecompressionStream('gzip'));
  const isGzip = b => b.length > 2 && b[0] === 0x1f && b[1] === 0x8b;

  // ---------- hashing ----------
  // SHA-256 of the NFC-normalised UTF-8 password, lowercase hex. Same as both clients.
  async function hashPassword(pw) {
    if (!pw) return '';
    const h = await subtle.digest('SHA-256', enc.encode(pw.normalize('NFC')));
    return toHex(new Uint8Array(h));
  }

  // ---------- RNCryptor (v3 write, v2/v3 read) ----------
  async function pbkdf2(password, salt) {
    const key = await subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-1', salt, iterations: 10000 }, key, 256);
    return new Uint8Array(bits);
  }
  async function hmac(keyBytes, data) {
    const key = await subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return new Uint8Array(await subtle.sign('HMAC', key, data));
  }
  async function rnEncrypt(plain, password) {
    const encSalt = randomBytes(8), hmacSalt = randomBytes(8), iv = randomBytes(16);
    const encKey = await pbkdf2(password, encSalt);
    const hmacKey = await pbkdf2(password, hmacSalt);
    const aes = await subtle.importKey('raw', encKey, 'AES-CBC', false, ['encrypt']);
    const cipher = new Uint8Array(await subtle.encrypt({ name: 'AES-CBC', iv }, aes, plain));
    const head = concat(new Uint8Array([3, 1]), encSalt, hmacSalt, iv, cipher);
    return concat(head, await hmac(hmacKey, head));
  }
  async function rnDecrypt(data, password) {
    if (data.length < 34 + 16 + 32) throw new Error('Encrypted data is too short.');
    const encSalt = data.subarray(2, 10), hmacSalt = data.subarray(10, 18), iv = data.subarray(18, 34);
    const body = data.subarray(0, data.length - 32), tag = data.subarray(data.length - 32);
    const hmacKey = await pbkdf2(password, hmacSalt);
    const calc = await hmac(hmacKey, body);
    if (calc.length !== tag.length || calc.some((b, i) => b !== tag[i])) {
      const e = new Error('Wrong password (or the file is damaged).'); e.code = 'BAD_PASSWORD'; throw e;
    }
    const encKey = await pbkdf2(password, encSalt);
    const aes = await subtle.importKey('raw', encKey, 'AES-CBC', false, ['decrypt']);
    return new Uint8Array(await subtle.decrypt({ name: 'AES-CBC', iv }, aes, data.subarray(34, data.length - 32)));
  }

  // ---------- plist ----------
  // Values: boolean, number, {__real: true, real: n}, string, Uint8Array (data),
  // Date, Array, plain object (dict). Plain JS numbers are written as <integer> when
  // whole and <real> otherwise; Windows ignores a value with the wrong plist type.
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const keySort = (a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : (a < b ? -1 : a > b ? 1 : 0);
  function plistValue(v, ind) {
    const pad = '\t'.repeat(ind);
    if (v === true) return pad + '<true/>';
    if (v === false) return pad + '<false/>';
    if (typeof v === 'number') return Number.isInteger(v) ? `${pad}<integer>${v}</integer>` : `${pad}<real>${v}</real>`;
    if (typeof v === 'string') return `${pad}<string>${esc(v)}</string>`;
    if (v instanceof Uint8Array) return `${pad}<data>${toBase64(v)}</data>`;
    if (v instanceof Date) return `${pad}<date>${v.toISOString().replace(/\.\d{3}Z$/, 'Z')}</date>`;
    if (v && typeof v === 'object' && v.__real) return `${pad}<real>${v.real}</real>`;
    if (Array.isArray(v)) {
      if (!v.length) return pad + '<array/>';
      return `${pad}<array>\n${v.map(x => plistValue(x, ind + 1)).join('\n')}\n${pad}</array>`;
    }
    if (v && typeof v === 'object') {
      const keys = Object.keys(v).sort(keySort);
      if (!keys.length) return pad + '<dict/>';
      return `${pad}<dict>\n${keys.map(k => `${pad}\t<key>${esc(k)}</key>\n${plistValue(v[k], ind + 1)}`).join('\n')}\n${pad}</dict>`;
    }
    throw new Error('Unsupported value in settings: ' + v);
  }
  function toPlist(dict) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
      '<plist version="1.0">\n' + plistValue(dict, 0) + '\n</plist>\n';
  }
  function fromPlist(xml) {
    const doc = new root.DOMParser().parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('The settings are not valid XML.');
    const plist = doc.documentElement;
    const first = Array.from(plist.childNodes).find(n => n.nodeType === 1);
    if (!first) throw new Error('The plist is empty.');
    return readNode(first);
  }
  function elementChildren(n) { return Array.from(n.childNodes).filter(c => c.nodeType === 1); }
  function readNode(n) {
    switch (n.nodeName) {
      case 'true': return true;
      case 'false': return false;
      case 'integer': return parseInt(n.textContent, 10);
      case 'real': return { __real: true, real: parseFloat(n.textContent) };
      case 'string': return n.textContent;
      case 'data': return fromBase64(n.textContent);
      case 'date': return new Date(n.textContent);
      case 'array': return elementChildren(n).map(readNode);
      case 'dict': {
        const out = {}; const kids = elementChildren(n);
        for (let i = 0; i < kids.length; i += 2) out[kids[i].textContent] = readNode(kids[i + 1]);
        return out;
      }
      default: throw new Error('Unknown plist element <' + n.nodeName + '>.');
    }
  }

  // ---------- .seb container ----------
  // Mirrors SEBConfigFileManager.m:
  //   start exam + password    -> gzip("pswd" + RNCryptor(gzip(xml), password))
  //   configure client         -> gzip("pwcc" + RNCryptor(gzip(xml), sha256hex(password) or ""))
  //   start exam, no password  -> gzip("plnd" + gzip(xml))
  //   plain: true (start exam, no password) -> the XML plist itself, uncompressed. Both SEB clients read it,
  //   and Moodle's "Upload my own config" accepts only this form (it parses the file as XML and rejects gzip).
  async function buildSeb(dict, { password = '', purpose = 0, plain = false } = {}) {
    if (plain && purpose !== 1 && !password) return enc.encode(toPlist(dict));
    const inner = await gzip(enc.encode(toPlist(dict)));
    let block;
    if (purpose === 1) {
      const key = password ? await hashPassword(password) : '';
      block = concat(enc.encode('pwcc'), await rnEncrypt(inner, key));
    } else if (password) {
      block = concat(enc.encode('pswd'), await rnEncrypt(inner, password));
    } else {
      block = concat(enc.encode('plnd'), inner);
    }
    return gzip(block);
  }

  // Returns { dict, prefix, xml }. Throws err.code = 'NEEDS_PASSWORD' / 'BAD_PASSWORD'.
  async function readSeb(bytes, password) {
    let data = isGzip(bytes) ? await gunzip(bytes) : bytes;
    let prefix = ascii(data, 0, 4);
    if (prefix === 'pkhs' || prefix === 'phsk') throw new Error('This file is encrypted for a certificate (identity). It can only be opened by SEB on a machine with that certificate.');
    let xmlBytes;
    if (prefix === '<?xm') {
      xmlBytes = data;
    } else if (prefix === 'plnd') {
      xmlBytes = data.subarray(4);
    } else if (prefix === 'pswd' || prefix === 'pwcc') {
      if (password == null) { const e = new Error('This file needs a password.'); e.code = 'NEEDS_PASSWORD'; e.prefix = prefix; throw e; }
      const body = data.subarray(4);
      if (prefix === 'pwcc') {
        const candidates = password === '' ? [''] : [await hashPassword(password), password];
        let ok = null, lastErr;
        for (const c of candidates) { try { ok = await rnDecrypt(body, c); break; } catch (e) { lastErr = e; } }
        if (!ok) throw lastErr;
        xmlBytes = ok;
      } else {
        xmlBytes = await rnDecrypt(body, password);
      }
    } else {
      throw new Error('This is not a recognised .seb file.');
    }
    if (isGzip(xmlBytes)) xmlBytes = await gunzip(xmlBytes);
    const xml = dec.decode(xmlBytes);
    return { dict: fromPlist(xml), prefix, xml };
  }

  root.SEB = { buildSeb, readSeb, toPlist, fromPlist, hashPassword, randomBytes, toBase64, fromBase64, rnEncrypt, rnDecrypt, gzip, gunzip };
})(typeof window !== 'undefined' ? window : globalThis);
