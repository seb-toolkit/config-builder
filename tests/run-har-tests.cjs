// Tests for harimport.js. Run: node tests/run-har-tests.cjs
const assert = require('assert');
const H = require('../harimport.js');
const F = require('../sebfilter.js');
const har = JSON.stringify({ log: { entries: [
  { startedDateTime: '2026-11-25T10:00:00.000Z', request: { method: 'GET', url: 'https://moodle.example.ac.uk/mod/quiz/view.php?id=1', headers: [{ name: 'Sec-Fetch-Dest', value: 'document' }, { name: 'Cookie', value: 'SECRET' }] }, response: { status: 200, content: { mimeType: 'text/html' } }, _resourceType: 'document' },
  { startedDateTime: '2026-11-25T10:00:01.000Z', request: { method: 'GET', url: 'https://cdn.example.com/app.js', headers: [] }, response: { status: 200, content: { mimeType: 'application/javascript' } }, _resourceType: 'script' },
  { startedDateTime: '2026-11-25T10:00:02.000Z', request: { method: 'GET', url: 'https://embed.example.org/frame', headers: [{ name: 'sec-fetch-dest', value: 'iframe' }] }, response: { status: 200, content: {} }, _resourceType: 'document' },
  { startedDateTime: '2026-11-25T10:00:03.000Z', request: { method: 'POST', url: 'https://moodle.example.ac.uk/lib/ajax/service.php', headers: [] }, response: { status: 0, content: {} }, _resourceType: 'xhr', _error: 'net::ERR_BLOCKED' },
  { startedDateTime: '2026-11-25T10:00:04.000Z', request: { method: 'GET', url: 'data:image/png;base64,AAAA', headers: [] }, response: { status: 200, content: {} }, _resourceType: 'image' },
  { startedDateTime: '2026-11-25T10:00:05.000Z', request: { method: 'GET', url: 'https://ff.example.net/', headers: [] }, response: { status: 200, content: { mimeType: 'text/css' } } }
] } });
let r = H.parseHAR(har);
assert.strictEqual(r.requests.length, 5); assert.strictEqual(r.skipped, 1);
assert.deepStrictEqual(r.requests.map(x => x.rtype), ['main_frame', 'script', 'sub_frame', 'xmlhttprequest', 'stylesheet']);
assert.strictEqual(r.requests[3].error, 'net::ERR_BLOCKED'); assert.strictEqual(r.requests[0].status, 200);
assert(!JSON.stringify(r).includes('SECRET'), 'headers must not be kept');
assert.throws(() => H.parseHAR('nope'), /not a valid HAR/); assert.throws(() => H.parseHAR('{}'), /No requests/);
r = H.parseURLList('# c\nhttps://a.example.com/x\n"https://b.example.com/y",\n\nfile:///x\nnot a url\n');
assert.strictEqual(r.requests.length, 2); assert.strictEqual(r.skipped, 2); assert.strictEqual(r.requests[1].url, 'https://b.example.com/y');
assert.strictEqual(H.parseAny(har).kind, 'HAR'); assert.strictEqual(H.parseAny('https://a.com').kind, 'URL list');
// with the filter: a list entry is checked as a page, a script is not filtered unless content filtering is on
const f = F.createFilter({ enabled: true, contentFilter: false, rules: [{ active: true, action: 1, expression: 'moodle.example.ac.uk' }] });
const isMain = q => q.rtype === 'main_frame' || q.rtype === 'listed';
const res = H.parseHAR(har).requests.map(q => f.check(q.url, isMain(q)).result);
assert.deepStrictEqual(res, ['allow', 'unfiltered', 'unfiltered', 'unfiltered', 'unfiltered']);
assert.strictEqual(f.check('https://a.example.com/', isMain({ rtype: 'listed' })).result, 'block');
console.log('HAR import tests passed');
