# Safe Exam Browser config files: what the source says

Sources read (shallow clones in `../seb-source/`, November 2026):

- Windows: `SafeExamBrowser/seb-win-refactoring`. The runtime client is in `SafeExamBrowser.Configuration`. The config tool is in `SebWindowsConfig`.
- macOS/iOS: `SafeExamBrowser/seb-mac`. Config files are handled in `Classes/ConfigFiles/SEBConfigFileManager.m`. Defaults are in `Classes/ConfigFiles/SEBSettings.m`.

## 1. File format: one file works on both platforms

Both clients read the same container. The layers, from the outside in:

```
gzip( prefix(4 bytes) + payload )
```

| Prefix | Payload | Who reads it |
|---|---|---|
| `plnd` | gzip(XML plist) | both |
| `pswd` | RNCryptor(gzip(XML plist), settings password) | both. The exam password prompt appears on start. |
| `pwcc` | RNCryptor(gzip(XML plist), SHA-256 hex of the admin password) | both. It reconfigures the client. |
| `pkhs` / `phsk` | public-key encrypted inner block | both, but this needs a certificate on the client. The builder does not offer it. |
| *(none)* `<?xm…` | raw XML plist, optionally gzipped once | both: Mac checks for a `<?xm` prefix, Windows has an `XmlParser` |

Differences between the clients' own writers:

- **Unencrypted files.** The Mac tool writes `gzip(xml)` with no prefix. The Windows tool writes `gzip(gzip("plnd" + xml))`. The Windows parser only peeks through one gzip layer, so that output looks odd. Both readers accept the spec form `gzip("plnd" + gzip(xml))`, so the builder writes that.
- **RNCryptor version.** Windows writes header bytes `02 01`. Mac writes `03 01` (RNCryptor v3). Windows only *logs* a version mismatch and then decrypts anyway. Mac's RNDecryptor accepts v2 and v3. The two versions differ only in how a non-ASCII password is turned into bytes, and both clients use UTF-8. The builder writes v3.

RNCryptor block layout (both clients):

```
[0] version  [1] options=0x01  [2..9] encryption salt  [10..17] HMAC salt
[18..33] IV  [34..n-32] AES-256-CBC/PKCS7 ciphertext  [n-32..n] HMAC-SHA256 over all prior bytes
key = PBKDF2-HMAC-SHA1(password UTF-8, salt, 10 000 iterations, 32 bytes)  (one key per salt)
```

The public spec page does not name the PBKDF2 hash. The code does: Windows uses `Rfc2898DeriveBytes`, whose default is SHA-1, and Mac uses `kCCPRFHmacAlgSHA1` with 10000 rounds.

## 2. Password hashes

`hashedQuitPassword`, `hashedAdminPassword` and the `pwcc` key are all **SHA-256 of the UTF-8 password, as lowercase hex**. Both clients compare hashes without regard to case.

The Mac client now **normalises to Unicode NFC** before hashing, "so accented characters produce the same hash as on Windows and in Moodle" (SEBKeychainManager.m). The builder does the same with `String.normalize('NFC')`.

## 3. Types matter (Windows is strict)

The Windows mappers use `value is int`, `value is bool` and `value is string`. A value of the wrong plist type, such as `<string>1</string>` where an `<integer>` is expected, is **silently ignored**, and the client falls back to its default. The Mac client also checks types against its defaults dictionary. So every value has to be written as the right plist element.

## 4. Settings keys

- The Windows runtime reads 207 key names, counting nested keys such as process and URL-rule fields.
- The Mac defaults dictionary has about 335 to 367 keys, because it also covers iOS, Zoom, Jitsi and proctoring.
- The two config tools share **167 keys**. Only these 7 shared keys have different defaults:

| Key | Windows tool | Mac tool |
|---|---|---|
| allowedDisplayBuiltinEnforce | false | true |
| downloadDirectoryWin | "" | "Downloads" |
| enableZoomText | true | false |
| minMacOSVersion | 4 | 10 (= macOS 12) |
| showMenuBar | false | true |
| systemAlwaysOn | true | false |
| urlFilterTrustedContent | false | true |

**Missing keys fall back to the client's own default.** So a file that leaves out one of these keys behaves differently on each platform. The builder writes them explicitly.

### Same idea, different keys

| Feature | Windows | macOS |
|---|---|---|
| Clipboard | `clipboardPolicy` int: 0 allow, 1 block, 2 isolated | `enablePrivateClipboard` bool |
| Wi-Fi control | `allowWlan` | `allowWLAN` (case differs!) |
| Downloads/uploads | `allowDownloads`, `allowUploads` | `allowDownUploads` |
| Download folder | `downloadDirectoryWin` | `downloadDirectoryOSX` |
| User agent | `browserUserAgentWinDesktopMode(Custom)` | `browserUserAgentMac(Custom)` |
| Right mouse button | `enableRightMouse` | `enableRightMouseMac` |
| Popups from script | not read: Windows uses `newBrowserWindowByLinkPolicy` for all | `newBrowserWindowByScriptPolicy` |

### Windows only (examples)

- The `insideSebEnable*` group: the Ctrl-Alt-Del screen options (task manager, log off, shut down, switch user, lock computer, change password, ease of access, VMware shade, network selector).
- Kiosk mode (`killExplorerShell` / `createNewDesktop`) and `sebServicePolicy`.
- `enableAltTab`, `enableCtrlEsc`, `enableAltEsc`, `enableStartMenu`, `enablePrintScreen`, `enableWindowsUpdate`.
- `showTaskBar`, `taskBarHeight`, `showTime`, `showInputLanguage`, `audioControlEnabled`.
- The proxy dictionary (`proxies`, `proxySettingsPolicy`).

### macOS only (examples)

- `minMacOSVersion`, `enableMacOSAAC` (Assessment Mode), `enableAppSwitcherCheck`, `forceAppFolderInstall`.
- `allowSiri`, `allowDictation`, `allowDictionaryLookup`, `allowScreenCapture`, `allowDisplayMirroring`.
- `showMenuBar`, `allowOpenAndSavePanel`, `allowShareSheet`, `detectStoppedProcess`.
- All `mobile*` keys, which apply to iOS.

### Shared structures

- **URL filter.** `URLFilterEnable`, `URLFilterEnableContentFilter`, and `URLFilterRules`, an array of `{active: bool, regex: bool, expression: string, action: int}` where action is 0 block and 1 allow. Windows skips inactive rules.
- **Processes.** `prohibitedProcesses` and `permittedProcesses` are arrays of dicts with `os` (0 macOS, 1 Windows). Windows reads only `os == 1` entries, using `executable` and `originalName`. macOS reads `os == 0` entries and matches on `identifier` (bundle id) or `executable`.
- **Enums shared by both.** `browserViewMode` (0 window, 1 fullscreen), `newBrowserWindowByLinkPolicy` (0 block, 1 same window, 2 new window), `mainBrowserWindowPositioning` (0 left, 1 centre, 2 right) and `sebConfigPurpose` (0 start exam, 1 configure client).

## 5. Default prohibited-process lists (important)

- **macOS.** The default settings include a list of 197 prohibited processes (`SEBPresetSettings.m`): 101 macOS apps (`os = 0`) and 96 Windows programs (`os = 1`). The Mac config tool writes this whole list into every file.
  - A file that contains `prohibitedProcesses` **replaces** that list on the Mac client.
  - So a file listing only a few extra apps would quietly drop SEB's built-in macOS protections.
- **Windows.** The client has its own built-in blacklist (`DataValues.cs`). Entries from the file are merged into it, with same-named entries replaced.
  - On save, the Windows config tool also inserts a "strict" list (Skype, TeamViewer, VNC and similar).
  - It adds a list of browsers too, but only when `killExplorerShell` kiosk mode is on.

The builder starts from the macOS preset list plus the Windows strict list. Your additions go after it.

## 6. URL filter semantics (Windows client)

These come from `RequestFilter.cs`, `SimplifiedRule.cs`, `RequestResponsibility.cs` and `RequestHandler.cs`:

- **Rule order.** Block rules are checked first, then allow rules. A URL that matches nothing is **blocked**.
- **Start URL.** If the start URL would be blocked, SEB adds an allow rule for that exact URL.
- **What gets filtered.** `URLFilterEnable` filters top-level navigations. `URLFilterEnableContentFilter` (effective only with `URLFilterEnable`) also filters frames, scripts, images, XHR and other requests.
- **Matching.** URLs are URL-decoded first, and matching ignores case.
- **Simplified patterns.**
  - `host` matches that host and its subdomains. `.host` matches that host only.
  - A host made only of letters and digits (for example `localhost`) must match exactly.
  - `*` is a wildcard. A path matches with or without a trailing slash.
  - `?.` means "no query string".
- **Tests.** `sebfilter.js` passes all 371 checks in SEB's `SimplifiedRuleTests.cs`.

## 7. Settings catalogue

`tools/extract_keys.py` builds the catalogue from these sources:

- **Windows tool:** default values, labels and tooltips from `SebWindowsConfig/SEBSettings.cs` and `SebWindowsConfigForm.Designer.cs`.
- **Mac tool:** defaults from `SEBSettings.m` and `SEBPresetSettings.m`; labels, tooltips and menu choices from the `Preferences*.xib` bindings.
- **Which client reads each key:**
  - Windows: `SafeExamBrowser.Configuration/ConfigurationData/Keys.cs`
  - macOS and iOS: references to `org_safeexambrowser_SEB_<key>` in `seb-mac/Classes`

Result: 367 root keys (365 with a default in at least one tool).

- 86 are read by both desktop clients.
- 105 are read only by Windows, and 105 only by macOS.
- About 40 are read only by iOS.
- About 55 are not read by any current client. They are legacy keys, kept by the tools.
