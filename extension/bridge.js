// Runs on localhost pages only, and does nothing unless the page is the SEB config builder
// (it must contain <meta name="seb-config-builder">). Relays messages between the page and the extension.
(() => {
  const start = () => {
    if (!document.querySelector('meta[name="seb-config-builder"]')) return;
    const port = chrome.runtime.connect({ name: 'seb-builder' });
    const toPage = msg => window.postMessage({ source: 'seb-monitor', ...msg }, location.origin);
    port.onMessage.addListener(toPage);
    port.onDisconnect.addListener(() => toPage({ type: 'disconnected' }));
    window.addEventListener('message', e => {
      if (e.source !== window || e.origin !== location.origin) return;
      const d = e.data;
      if (!d || d.source !== 'seb-builder') return;
      if (!['start', 'stop', 'update', 'hello'].includes(d.type)) return;
      port.postMessage({ type: d.type, payload: d.payload });
    });
    toPage({ type: 'hello', version: chrome.runtime.getManifest().version });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
