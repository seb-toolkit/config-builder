// SEB URL Monitor: service worker.
// Watches one test window (and any tabs/windows opened from it), reports every request to the
// builder page, and, if asked, replaces pages that SEB would block with a "blocked" page.
importScripts('sebfilter.js');

let session = null;   // { windowId, tabs:Set, config, filter, enforce, port }
let builderPort = null;

const send = msg => { try { builderPort && builderPort.postMessage(msg); } catch {} };

function setConfig(cfg) {
  session.config = cfg;
  session.enforce = !!cfg.enforce;
  session.filter = SEBFilter.createFilter({ enabled: !!cfg.enabled, contentFilter: !!cfg.contentFilter, rules: cfg.rules || [], startURL: cfg.startURL || '' });
  session.quitURL = (cfg.quitURL || '').replace(/\/+$/, '');
}

async function startSession(cfg) {
  await stopSession(false);
  let url;
  try { url = new URL(cfg.startURL); if (!/^https?:$/.test(url.protocol)) throw 0; }
  catch { send({ type: 'error', message: 'The start URL must be a full http(s) address.' }); return; }
  session = { tabs: new Set(), windowId: null };
  setConfig(cfg);
  const win = await chrome.windows.create({ url: url.href, type: 'normal', focused: true, width: 1200, height: 850 });
  session.windowId = win.id;
  for (const t of win.tabs || []) session.tabs.add(t.id);
  send({ type: 'state', running: true });
}

async function stopSession(closeWindow = true) {
  if (!session) return;
  const w = session.windowId;
  session = null;
  if (closeWindow && w != null) { try { await chrome.windows.remove(w); } catch {} }
  send({ type: 'state', running: false });
}

const watched = tabId => session && tabId >= 0 && session.tabs.has(tabId);

chrome.tabs.onCreated.addListener(tab => {
  if (!session) return;
  if (tab.windowId === session.windowId || (tab.openerTabId != null && session.tabs.has(tab.openerTabId))) {
    session.tabs.add(tab.id);
    send({ type: 'tab', tabId: tab.id, opener: tab.openerTabId ?? null });
  }
});
chrome.webNavigation.onCreatedNavigationTarget.addListener(d => {
  if (session && session.tabs.has(d.sourceTabId)) session.tabs.add(d.tabId);
});
chrome.tabs.onRemoved.addListener(tabId => { if (session) session.tabs.delete(tabId); });
chrome.windows.onRemoved.addListener(id => {
  if (session && id === session.windowId) { session = null; send({ type: 'state', running: false, reason: 'Test window closed' }); }
});

const BLOCKED_PAGE = chrome.runtime.getURL('blocked.html');

chrome.webRequest.onBeforeRequest.addListener(d => {
  if (!watched(d.tabId) || d.url.startsWith(BLOCKED_PAGE)) return;
  const isMain = d.type === 'main_frame';
  const verdict = session.filter.check(d.url, isMain);
  send({ type: 'request', id: d.requestId, time: d.timeStamp, url: d.url, rtype: d.type, method: d.method, tabId: d.tabId, frameId: d.frameId,
         initiator: d.initiator || '', result: verdict.result, rule: verdict.rule ? verdict.rule.expression : null, autoRule: !!(verdict.rule && verdict.rule.auto) });
  if (isMain && session.quitURL && d.url.replace(/\/+$/, '') === session.quitURL) send({ type: 'quit', url: d.url });
}, { urls: ['<all_urls>'] });

chrome.webRequest.onCompleted.addListener(d => {
  if (watched(d.tabId)) send({ type: 'status', id: d.requestId, status: d.statusCode, fromCache: d.fromCache });
}, { urls: ['<all_urls>'] });
chrome.webRequest.onErrorOccurred.addListener(d => {
  if (watched(d.tabId)) send({ type: 'status', id: d.requestId, error: d.error });
}, { urls: ['<all_urls>'] });

// Simulated blocking of top-level pages (what SEB's "URL filter" does for pages).
chrome.webNavigation.onBeforeNavigate.addListener(d => {
  if (!watched(d.tabId) || d.frameId !== 0 || !session.enforce) return;
  if (d.url.startsWith(BLOCKED_PAGE) || !/^https?:/.test(d.url)) return;
  if (session.filter.check(d.url, true).result === 'block') {
    chrome.tabs.update(d.tabId, { url: BLOCKED_PAGE + '?url=' + encodeURIComponent(d.url) });
  }
});

chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'seb-builder') return;
  const senderUrl = port.sender && port.sender.url || '';
  if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(senderUrl)) { port.disconnect(); return; }
  builderPort = port;
  port.onDisconnect.addListener(() => { if (builderPort === port) builderPort = null; });
  port.onMessage.addListener(async msg => {
    if (msg.type === 'hello') send({ type: 'state', running: !!session });
    if (msg.type === 'start') await startSession(msg.payload || {});
    if (msg.type === 'stop') await stopSession(true);
    if (msg.type === 'update' && session) setConfig(msg.payload || {});
  });
  send({ type: 'state', running: !!session });
});
