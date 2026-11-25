# SEB config builder

> [!WARNING]
> **Untested with real SEB clients.** The files this tool makes have not yet been opened in Safe Exam Browser on Windows, macOS or iOS, and the URL monitor extension has not been tried against a live exam. The format and encryption follow SEB's source code and were checked with an independent decoder, but please test every file in SEB yourself before using it for an exam. Reports of what works and what doesn't are very welcome.

> This is an independent project. It is not made, endorsed or supported by the Safe Exam Browser team, ETH Zürich or the SEB Alliance. For official tools and support, see [safeexambrowser.org](https://safeexambrowser.org).

A web page that makes Safe Exam Browser `.seb` files for SEB on Windows, macOS and iOS. A single file serves every platform.

- **Every setting.** All 367 root keys from both official config tools and clients are editable. They are grouped and searchable, with the official labels and help text and each platform's defaults. Common settings get friendly sections at the top.
- **Same format as SEB.** Files can be plain, password-protected (`pswd`) or client-configuration (`pwcc`). Passwords are stored as SHA-256 hashes. Existing `.seb` files can be opened, edited and saved again.
- **URL filter testing.** Record an exam session in your own browser (DevTools Network tab: export a HAR file, or copy all URLs) and drop it into the page, or use the optional Chrome extension to work through the exam in a live test window. Every request is checked against your filter rules with a port of SEB for Windows' own matching code.

Everything runs locally in the browser. Nothing is uploaded.

## Run it

```bash
python3 -m http.server 8779 --bind 127.0.0.1 --directory seb-config-builder
```

Then open <http://localhost:8779>. You can also open `index.html` directly, but the URL monitor extension only connects when the page is served from `localhost`.

## Testing URLs without the extension

Open **Test the URL filter**, then drop in a HAR file (browser DevTools, Network tab, **Export HAR**) or paste a list of addresses (right-click the request list, **Copy**, **Copy all URLs**). This works on any hosted copy of the page. Only addresses, request types, times and status codes are read; cookies and headers are ignored. A pasted list has no request types, so each address is checked as if it were a page (the strictest case). Parsing is in `harimport.js` (`node tests/run-har-tests.cjs`).

## URL monitor extension (Chrome / Edge, optional)

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and choose `seb-config-builder/extension`.
3. Reload the builder page, then open **Test the URL filter → Open test window**.

The extension watches only the test window and any tabs or windows opened from it. It talks only to the builder page on `localhost`. Leave **Block pages SEB would block** on to replace blocked top-level pages with a "Blocked" page, as SEB would. Other requests (scripts, images, frames, XHR) are marked as they would be under SEB. They are blocked only when "filter embedded content" is on.

The monitor uses a separate window rather than an iframe. Moodle and most single sign-on pages refuse to load inside frames, and third-party cookie rules break logins there. A page also cannot see where a cross-site frame navigates.

## Files

| File | What it is |
|---|---|
| `index.html` | The builder UI |
| `seb-core.js` | `.seb` read/write: gzip, `plnd`/`pswd`/`pwcc`, RNCryptor (AES-256-CBC + HMAC-SHA256, PBKDF2-SHA1 10k), XML plist |
| `harimport.js` | Reads HAR files and URL lists for the URL filter test |
| `sebfilter.js` | SEB URL filter rules, ported from SEB for Windows (also copied into `extension/`) |
| `keys.js` | Generated settings catalogue (keys, types, defaults per tool, labels, help, which clients read each key, default process lists) |
| `tools/extract_keys.py` | Regenerates `keys.js` from the SEB sources |
| `tests/` | SEB for Windows' `SimplifiedRule` unit-test cases (371 checks) run against `sebfilter.js` |
| `extension/` | The URL monitor Chrome extension (Manifest V3) |
| `SEB-ANALYSIS.md` | What the SEB source code says about the file format, hashing, types and platform differences |

## Updating for a new SEB release

```bash
git -C ../seb-source/seb-win-refactoring pull
git -C ../seb-source/seb-mac pull
python3 -I tools/extract_keys.py ../seb-source --js > keys.js
node tests/run-filter-tests.cjs tests/seb-win-simplified-rule-cases.json
cp sebfilter.js extension/sebfilter.js
```

The test cases are taken from `seb-win-refactoring/SafeExamBrowser.Browser.UnitTests/Filters/Rules/SimplifiedRuleTests.cs`.

## Known limits

- Certificate-encrypted files (`pkhs`/`phsk`) can't be opened or made here. They need a key from the machine's certificate store.
- Regex URL rules are run with JavaScript's regex engine, while SEB for Windows uses .NET's. Ordinary patterns behave the same.
- The URL check follows SEB for Windows. SEB for macOS has its own implementation that is close but not identical.
- The Config Key and Browser Exam Key are not shown. Moodle works them out from the uploaded file.

## Acknowledgements

This tool exists because the [Safe Exam Browser](https://safeexambrowser.org) project publishes its source code. Safe Exam Browser is developed by ETH Zürich (IT Services) with the SEB Alliance, and is based on the original idea by Stefan Schneider, University of Giessen. Many thanks to Daniel R. Schneider, Damian Büchel and all SEB contributors.

Parts of this repository are derived from SEB's source code:

- [`SafeExamBrowser/seb-win-refactoring`](https://github.com/SafeExamBrowser/seb-win-refactoring) (SEB for Windows, © ETH Zürich, IT Services, MPL-2.0):
  - `sebfilter.js` and `extension/sebfilter.js` port its URL filter (`SafeExamBrowser.Browser/Filters`).
  - `tests/seb-win-simplified-rule-cases.json` is taken from its `SimplifiedRuleTests.cs`.
  - `seb-core.js` follows its configuration file handling (`SafeExamBrowser.Configuration`).
- [`SafeExamBrowser/seb-mac`](https://github.com/SafeExamBrowser/seb-mac) (SEB for macOS/iOS, © Daniel R. Schneider, ETH Zürich, IT Services, MPL-2.0): `seb-core.js` follows `SEBConfigFileManager.m`.
- Both repositories: `keys.js` holds setting names, default values, labels, help text and the default prohibited-process lists. `tools/extract_keys.py` extracts these from the sources.

The catalogue was generated from `seb-win-refactoring` at `4f08e2b` (17 Nov 2026) and `seb-mac` at `7a3ac82` (24 Nov 2026).

"Safe Exam Browser" and "SEB" are used here only to describe what this tool works with.

## Licence

[Mozilla Public License 2.0](LICENSE), the same licence as Safe Exam Browser.
