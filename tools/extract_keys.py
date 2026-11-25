#!/usr/bin/env python3
"""Build keys.json: every root-level SEB setting from the Windows and macOS sources.

Usage: python3 -I tools/extract_keys.py ../seb-source --js > keys.js   (or without --js for plain JSON)
Reads (no code is run):
  seb-win-refactoring/SebWindowsConfig/SEBSettings.cs           Windows config tool defaults
  seb-win-refactoring/SebWindowsConfig/SebWindowsConfigForm*.cs  Windows labels, tooltips, tabs
  seb-win-refactoring/SafeExamBrowser.Configuration/...          keys the Windows client reads
  seb-mac/Classes/ConfigFiles/SEBSettings.m                      macOS/iOS defaults
  seb-mac/Base.lproj/Preferences*.xib                            macOS labels, tooltips, menus
  seb-mac/Classes/**                                             keys the macOS/iOS client reads
"""
import json, os, re, sys, glob
import xml.etree.ElementTree as ET

SRC = sys.argv[1]
W = os.path.join(SRC, 'seb-win-refactoring')
M = os.path.join(SRC, 'seb-mac')
rd = lambda p: open(p, encoding='utf-8-sig', errors='replace').read()

# ---------------- Windows config tool ----------------
cs = rd(f'{W}/SebWindowsConfig/SEBSettings.cs')
wconst = dict(re.findall(r'public const String (\w+)\s*=\s*"([^"]*)"', cs))
wint = dict(re.findall(r'public const int (\w+)\s*=\s*(-?\d+)', cs))
win_def = {}
for k, v in re.findall(r'SEBSettings\.settingsDefault\.Add\(SEBSettings\.(\w+),\s*(.+?)\);', cs):
    key = wconst.get(k)
    if not key: continue
    v = v.strip()
    if v in ('true', 'false'): val = (v == 'true')
    elif re.fullmatch(r'-?\d+', v): val = int(v)
    elif re.fullmatch(r'-?\d+\.\d+', v): val = float(v)
    elif v.startswith('"'): val = bytes(v[1:-1], 'utf-8').decode('unicode_escape')
    elif v.startswith('SEBSettings.') and v.split('.')[1] in wint: val = int(wint[v.split('.')[1]])
    elif 'ListObj' in v or 'List<' in v: val = []
    elif 'DictObj' in v or 'Dictionary' in v: val = {}
    elif 'byte[]' in v.lower() or 'new Byte' in v: val = {'__data': ''}
    else: val = {'__unknown': v}
    win_def[key] = val

# Windows labels/tooltips: control -> key via form code, control -> Text/ToolTip/tab via designer
form = rd(f'{W}/SebWindowsConfig/SebWindowsConfigForm.cs')
designer = rd(f'{W}/SebWindowsConfig/SebWindowsConfigForm.Designer.cs')
ctrl_key = {}
for ctrl, k in re.findall(r'(\w+)\.(?:Checked|Text|SelectedIndex|Value|SelectedItem)\s*=\s*[^;]*?settingsCurrent\[SEBSettings\.(\w+)\]', form):
    if k in wconst: ctrl_key.setdefault(ctrl, wconst[k])
for k, ctrl in re.findall(r'settingsCurrent\[SEBSettings\.(\w+)\]\s*=\s*[^;]*?\b(\w+)\.(?:Checked|Text|SelectedIndex|Value)', form):
    if k in wconst: ctrl_key.setdefault(ctrl, wconst[k])
def cs_string(expr):
    return ''.join(re.findall(r'"((?:[^"\\]|\\.)*)"', expr)).replace('\\"', '"').replace('\\r\\n', ' ').replace('\\n', ' ')
win_ui = {}
for ctrl, key in ctrl_key.items():
    t = re.search(rf'this\.{ctrl}\.Text = ((?:"(?:[^"\\]|\\.)*"\s*\+?\s*)+);', designer)
    tip = re.search(rf'SetToolTip\(this\.{ctrl},\s*((?:"(?:[^"\\]|\\.)*"\s*\+?\s*)+)\);', designer)
    tab = re.search(rf'this\.(tabPage\w+)\.Controls\.Add\(this\.{ctrl}\)', designer)
    if not tab:  # control inside a group box: find the group box's tab
        g = re.search(rf'this\.(\w+)\.Controls\.Add\(this\.{ctrl}\)', designer)
        if g: tab = re.search(rf'this\.(tabPage\w+)\.Controls\.Add\(this\.{g.group(1)}\)', designer)
    items = re.search(rf'this\.{ctrl}\.Items\.AddRange\(new object\[\] \{{([^}}]*)\}}\);', designer)
    win_ui[key] = {
        'label': cs_string(t.group(1)).strip() if t and not ctrl.startswith(('radioButton', 'comboBox', 'listBox')) else '',
        'help': cs_string(tip.group(1)).strip().replace("\\'", "'") if tip else '',
        'group': re.sub(r'^tabPage', '', tab.group(1)) if tab else '',
        'options': [cs_string(x) for x in re.findall(r'"(?:[^"\\]|\\.)*"', items.group(1))] if items else [],
    }

# Keys the Windows client actually reads
keys_cs = rd(f'{W}/SafeExamBrowser.Configuration/ConfigurationData/Keys.cs')
win_rt = set(re.findall(r'const string \w+ = "([^"]+)"', keys_cs))

# ---------------- macOS / iOS ----------------
m_src = rd(f'{M}/Classes/ConfigFiles/SEBSettings.m')
consts_h = rd(f'{M}/Classes/Global/Constants.h')
enums = {a: int(b) for a, b in re.findall(r'\b(\w+)\s*=\s*(-?\d+)\s*,?', consts_h)}
defines = {}
for a, b in re.findall(r'#define\s+(\w+)\s+(.+)', consts_h):
    defines[a] = b.strip()
for a, b in re.findall(r'static (?:NSString|NSInteger|const \w+)[^=]*?\b(\w+)\s*=\s*([^;]+);', consts_h):
    defines.setdefault(a, b.strip())

def mac_val(v):
    v = v.strip()
    while v in defines and defines[v] != v: v = defines[v]
    if v in ('@YES', 'YES'): return True
    if v in ('@NO', 'NO'): return False
    m = re.fullmatch(r'@?\(?(-?\d+)\)?', v)
    if m: return int(m.group(1))
    m = re.fullmatch(r'@?\(?(-?\d+\.\d+)\)?', v)
    if m: return float(m.group(1))
    if v.startswith('@"'): return v[2:-1].encode().decode('unicode_escape')
    m = re.search(r'numberWith(?:Long|Int|Integer|UnsignedInteger|Bool):\s*\(?(?:\w+\))?\s*([-\w.]+)\s*\]', v)
    if m:
        x = m.group(1)
        if re.fullmatch(r'-?\d+', x): return int(x)
        if x in ('YES', 'NO'): return x == 'YES'
        if x in enums: return enums[x]
        if x in defines: return mac_val(defines[x])
        return {'__unknown': x}
    m = re.search(r'numberWith(?:Float|Double):\s*([-\d.]+)', v)
    if m: return float(m.group(1))
    if re.search(r'numberWith(?:Float|Double):', v): return 1.0
    if re.search(r'NSData|NSMutableData', v): return {'__data': ''}
    if re.search(r'NSArray|NSMutableArray|^@\[', v): return []
    if re.search(r'NSDictionary|NSMutableDictionary|^@\{', v): return {}
    if v in enums: return enums[v]
    return {'__unknown': v[:60]}

start = m_src.index('- (NSDictionary *)defaultSEBSettings')
rootpart = m_src[start:]
rootpart = rootpart[:rootpart.index('nil]')]
mac_def = {}
for v, k in re.findall(r'\n\s*([^\n]+?),\s*\n\s*@"(\w+)",', rootpart):
    if v.strip().startswith('//'): continue
    mac_def[k] = mac_val(v)

# keys referenced in macOS/iOS code (outside the defaults file)
mac_use = {}
for path in glob.glob(f'{M}/Classes/**/*.*', recursive=True) + glob.glob(f'{M}/SEB*/**/*.*', recursive=True):
    if not path.endswith(('.m', '.swift', '.h', '.mm')) or path.endswith('SEBSettings.m'): continue
    txt = rd(path)
    ios = '/iOS' in path or 'iOS' in os.path.basename(path)
    for k in re.findall(r'org_safeexambrowser_SEB_(\w+)', txt):
        s = mac_use.setdefault(k, set()); s.add('ios' if ios else 'mac')

# macOS labels/tooltips/popup options from preference xibs
mac_ui = {}
def text_of(e):
    return (e.get('title') or '').strip()
for xib in glob.glob(f'{M}/Base.lproj/Preferences*.xib'):
    pane = os.path.basename(xib)[len('Preferences'):-4]
    tree = ET.parse(xib)
    parent = {c: p for p in tree.iter() for c in p}
    for b in tree.iter('binding'):
        kp = b.get('keyPath', '')
        m = re.match(r'values\.org_safeexambrowser_SEB_(\w+)$', kp)
        if not m: continue
        key = m.group(1)
        ctrl = parent.get(parent.get(b))  # binding -> connections -> control
        if ctrl is None: continue
        cell = next((c for c in ctrl if c.tag.endswith('Cell')), None)
        label = '' if ctrl.tag in ('matrix', 'popUpButton', 'segmentedControl') else (text_of(ctrl) or (text_of(cell) if cell is not None else ''))
        tip = ctrl.get('toolTip') or ''
        opts = []
        if ctrl.tag == 'popUpButton' and cell is not None:
            opts = [mi.get('title', '') for mi in cell.iter('menuItem')]
        if ctrl.tag == 'matrix':
            opts = [c.get('title', '') for c in ctrl.iter('buttonCell')]
        if ctrl.tag == 'segmentedControl':
            opts = [s.get('label', '') for s in ctrl.iter('segment')]
        if not label:  # use a nearby label: textField sibling just before the control
            sib = list(parent.get(ctrl, []))
            i = sib.index(ctrl) if ctrl in sib else -1
            for j in range(i - 1, max(i - 3, -1), -1):
                s = sib[j]
                if s.tag == 'textField':
                    c2 = next((c for c in s if c.tag.endswith('Cell')), None)
                    if c2 is not None and c2.get('title'): label = c2.get('title').strip(); break
        if b.get('name') not in ('value', 'selectedIndex', 'selectedTag', 'selectedValue', 'selectedObject'):
            continue  # e.g. an 'enabled' binding on a dependent control
        if ctrl.tag == 'matrix' and opts: opts = opts[1:] if not opts[0] else opts  # drop prototype cell
        if any(not o for o in opts) or b.get('name') not in ('selectedIndex',): opts = [] if b.get('name') != 'selectedIndex' or any(not o for o in opts) else opts
        cur = mac_ui.setdefault(key, {'label': '', 'help': '', 'group': pane, 'options': []})
        cur['label'] = cur['label'] or label
        cur['help'] = cur['help'] or tip.replace("\\'", "'")
        cur['options'] = cur['options'] or opts

# ---------------- default process lists ----------------
def objc_literal(text, i=0):
    """Parse an Objective-C @{...} / @[...] literal (strings, @YES/@NO, numbers). Returns (value, end)."""
    def ws(i):
        while i < len(text):
            if text.startswith('//', i): i = text.index('\n', i)
            elif text[i] in ' \t\r\n,': i += 1
            else: break
        return i
    i = ws(i)
    if text.startswith('@{', i):
        i += 2; d = {}
        while True:
            i = ws(i)
            if text[i] == '}': return d, i + 1
            k, i = objc_literal(text, i); i = ws(i); assert text[i] == ':', text[i-40:i+10]; v, i = objc_literal(text, i + 1); d[k] = v
    if text.startswith('@[', i):
        i += 2; a = []
        while True:
            i = ws(i)
            if text[i] == ']': return a, i + 1
            v, i = objc_literal(text, i); a.append(v)
    if text.startswith('@"', i):
        m = re.compile(r'@"((?:[^"\\]|\\.)*)"').match(text, i); return m.group(1).replace('\\"', '"'), m.end()
    for lit, val in (('@YES', True), ('@NO', False)):
        if text.startswith(lit, i): return val, i + len(lit)
    m = re.compile(r'@\(?(-?\d+)\)?').match(text, i)
    if m: return int(m.group(1)), m.end()
    m = re.compile(r'NSLocalizedString\(@"((?:[^"\\]|\\.)*)"[^)]*\)').match(text, i)
    if m: return m.group(1), m.end()
    m = re.compile(r'[A-Za-z_]\w*').match(text, i)
    if m:
        ident = m.group(0); val = defines.get(ident)
        if val is not None:
            lit = re.match(r'@"((?:[^"\\]|\\.)*)"', val)
            if lit: return lit.group(1), m.end()
            if ident in enums: return enums[ident], m.end()
        if ident in enums: return enums[ident], m.end()
        if ident in ('YES', 'NO'): return ident == 'YES', m.end()
        return '', m.end()
    raise ValueError('cannot parse at: ' + text[i:i+40])

preset_src = rd(f'{M}/Classes/ConfigFiles/SEBPresetSettings.m')
j = preset_src.index('@{', preset_src.index('defaultSettings'))
preset = objc_literal(preset_src, j)[0]['rootSettings']
sub_start = m_src.index('@"prohibitedProcesses" : @{')
proc_defaults = {}
for name in ('permittedProcesses', 'prohibitedProcesses'):
    k = m_src.index(f'@"{name}" : @{{', m_src.index('defaultSEBSettings'))
    proc_defaults[name] = objc_literal(m_src, m_src.index('@{', k))[0]
def fill(name, entry):
    out = dict(proc_defaults[name]); out.update(entry); return out
default_prohibited = [fill('prohibitedProcesses', e) for e in preset.get('prohibitedProcesses', [])]
default_permitted = [fill('permittedProcesses', e) for e in preset.get('permittedProcesses', [])]
strict = re.search(r'prohibitedProcessesDefaultStrict = new List<string>\s*\{(.*?)\};', cs, re.S)
for name in re.findall(r'"([^"]+)"', strict.group(1)) if strict else []:
    if not any(e.get('os') == 1 and e.get('executable', '').lower() in (name.lower(), name.lower()[:-4]) for e in default_prohibited):
        default_prohibited.append(fill('prohibitedProcesses', {'os': 1, 'executable': name, 'originalName': name, 'currentUser': True}))
explorer = re.search(r'prohibitedProcessesDefault = new List<string>\s*\{(.*?)\};', cs, re.S)
explorer_kiosk = re.findall(r'"([^"]+)"', explorer.group(1)) if explorer else []

# ---------------- merge ----------------
# Enums checked by hand against Constants.h and the Windows data mappers (index = value)
_pos = ['Left', 'Centre', 'Right']
_nw = ['Block', 'Open in same window', 'Open in new window']
ENUMS = {
    'newBrowserWindowByLinkPolicy': _nw, 'newBrowserWindowByScriptPolicy': _nw,
    'mainBrowserWindowPositioning': _pos, 'newBrowserWindowByLinkPositioning': _pos,
    'sebServicePolicy': ['Not required', 'Warn if not running', 'Required'],
    'minMacOSVersion': ['OS X 10.7', 'OS X 10.8', 'OS X 10.9', 'OS X 10.10', 'OS X 10.11', 'macOS 10.12', 'macOS 10.13', 'macOS 10.14',
                        'macOS 10.15', 'macOS 11', 'macOS 12', 'macOS 13', 'macOS 14', 'macOS 15', 'macOS 26'],
    'sebConfigPurpose': ['Start an exam', 'Configure the SEB client', 'MDM managed configuration'],
}
def vtype(v):
    if isinstance(v, bool): return 'bool'
    if isinstance(v, int): return 'int'
    if isinstance(v, float): return 'real'
    if isinstance(v, str): return 'string'
    if isinstance(v, list): return 'array'
    if isinstance(v, dict) and '__data' in v: return 'data'
    if isinstance(v, dict) and '__unknown' in v: return None
    if isinstance(v, dict): return 'dict'
    return None

IOS_HINT = re.compile(r'^mobile|iOS|ios$|ASAM|GuidedAccess|accessibilityFeature|allowiOS|browserUserAgentiOS|ScreenCaptureiOS|UploadsiOS', re.I)
NESTED = {'active','action','regex','expression','os','executable','path','identifier','title','arguments','argument','description',
          'originalName','signature','strongKill','autostart','iconInTaskbar','runInBackground','allowUserToChooseApp','certificateData',
          'type','name','exam','institution','clientName','clientSecret','apiDiscovery','pingInterval','sebServerURL'}
# keys of the "proxies" dictionary, not root keys
NESTED |= {k for k in win_rt if re.match(r'^(FTP|HTTPS?|SOCKS|RTSP)|^Auto(Configuration|Discovery)|^ExceptionsList$|^ExcludeSimpleHostnames$', k)}
TYPE_FIX = {'clientConfigKeepEncryption': 'bool', 'showProctoringDisclaimer': 'bool', 'defaultPageZoomLevel': 'real', 'defaultTextZoomLevel': 'real'}
all_keys = set(win_def) | set(mac_def) | (win_rt - NESTED)
out = []
for k in sorted(all_keys, key=str.lower):
    wd, md = win_def.get(k), mac_def.get(k)
    t = vtype(wd) if k in win_def else None
    t = t or (vtype(md) if k in mac_def else None) or TYPE_FIX.get(k)
    reads = []
    if k in win_rt: reads.append('win')
    use = mac_use.get(k, set())
    if 'mac' in use and not IOS_HINT.search(k): reads.append('mac')
    if 'ios' in use or IOS_HINT.search(k): reads.append('ios')
    ui = {}
    for src in (mac_ui.get(k), win_ui.get(k)):
        if not src: continue
        for f in ('label', 'help', 'group'):
            if src.get(f) and not ui.get(f): ui[f] = src[f]
    wopts = win_ui.get(k, {}).get('options'); mopts = mac_ui.get(k, {}).get('options')
    if wopts and all(wopts): ui['options'] = wopts
    elif mopts and all(mopts): ui['options'] = mopts
    clean = lambda v: None if (isinstance(v, dict) and ('__unknown' in v)) else ({'__data': ''} if isinstance(v, dict) and '__data' in v else v)
    entry = {'key': k, 'type': t or 'unknown', 'reads': reads,
             'winDefault': clean(wd) if k in win_def else None, 'macDefault': clean(md) if k in mac_def else None,
             'inWinTool': k in win_def, 'inMacTool': k in mac_def}
    entry.update({f: ui[f] for f in ('label', 'help', 'group', 'options') if ui.get(f)})
    if win_ui.get(k, {}).get('help') and mac_ui.get(k, {}).get('help') and win_ui[k]['help'] != mac_ui[k]['help']:
        entry['helpWin'] = win_ui[k]['help']
    if k in ENUMS: entry['options'] = ENUMS[k]
    if k == 'prohibitedProcesses': entry['macDefault'] = default_prohibited
    if k == 'permittedProcesses': entry['macDefault'] = default_permitted
    out.append(entry)
_result = ({'processDefaults': {'prohibitedProcesses': proc_defaults['prohibitedProcesses'], 'permittedProcesses': proc_defaults['permittedProcesses'],
                                 'explorerKioskProhibited': explorer_kiosk},
           'generatedFrom': {'windows': 'SafeExamBrowser/seb-win-refactoring', 'macos': 'SafeExamBrowser/seb-mac'}, 'keys': out})
if '--js' in sys.argv:
    sys.stdout.write('// Generated by tools/extract_keys.py from the SEB sources. Do not edit by hand.\nwindow.SEB_KEYS = ')
    json.dump(_result, sys.stdout, ensure_ascii=False, separators=(',', ':'))
    sys.stdout.write(';\n')
else:
    json.dump(_result, sys.stdout, indent=1, ensure_ascii=False)
