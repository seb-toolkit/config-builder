# SEB config builder

A web page that makes Safe Exam Browser `.seb` files for SEB on Windows, macOS and iOS. A single file serves every platform.

- **Every setting.** All 367 root keys from both official config tools and clients are editable. They are grouped and searchable, with the official labels and help text and each platform's defaults. Common settings get friendly sections at the top.
- **Same format as SEB.** Files can be plain, password-protected (`pswd`) or client-configuration (`pwcc`). Passwords are stored as SHA-256 hashes. Existing `.seb` files can be opened, edited and saved again.
- **URL filter testing.** With the companion Chrome extension, you work through the exam in a test window. Every request is logged and checked against your filter rules with a port of SEB for Windows' own matching code.

Everything runs locally in the browser. Nothing is uploaded.

## Run it

```bash
python3 -m http.server 8779 --bind 127.0.0.1 --directory seb-config-builder
```

Then open <http://localhost:8779>. You can also open `index.html` directly, but the URL monitor extension only connects when the page is served from `localhost`.

## URL monitor extension (Chrome / Edge)

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
