// ===========================
// BlueByte OS — Core Runtime
// ===========================

// ── Persistent State ────────────────────────────────────────────────────────
const LS_SETTINGS = 'bb_os_settings';
const LS_FS       = 'bb_os_fs';

let settings = loadSettings();
let fileSystem = loadFS();

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(LS_SETTINGS)) || defaultSettings(); }
  catch { return defaultSettings(); }
}
function defaultSettings() {
  return { accentColor: 'cyan', wallpaper: 'mesh', textSize: 'medium', userName: 'Operator' };
}
function saveSettings() { localStorage.setItem(LS_SETTINGS, JSON.stringify(settings)); }

function loadFS() {
  try { return JSON.parse(localStorage.getItem(LS_FS)) || defaultFS(); }
  catch { return defaultFS(); }
}
function defaultFS() {
  return {
    '/': { name:'root', path:'/', isDir:true },
    '/documents': { name:'documents', path:'/documents', isDir:true },
    '/documents/welcome.txt': {
      name:'welcome.txt', path:'/documents/welcome.txt', isDir:false,
      content:`=========================================
      WELCOME TO BLUEBYTE OS
=========================================
A keyboard-driven Web OS simulation.

CORE UTILITIES:
  Terminal   (Alt+T)
  File Mgr   (Alt+F)
  Settings   (Alt+S)
  About

KEYBOARD SHORTCUTS:
  Alt+W  — Toggle Start Menu
  Alt+H  — Toggle Shortcut Guide
  ?      — Shortcut Guide toggle
  Alt+C  — Close focused window
  Alt+M  — Minimize focused window
  Alt+X  — Maximize/Restore window
`
    },
    '/documents/readme.md': {
      name:'readme.md', path:'/documents/readme.md', isDir:false,
      content:`# BlueByte OS

An open-source browser-based OS simulation.

## Features
- Draggable windows
- Virtual terminal
- File manager
- Customisable themes
- Lock screen

Built with pure HTML, CSS, and JavaScript.
`
    },
    '/downloads': { name:'downloads', path:'/downloads', isDir:true },
    '/downloads/placeholder.txt': {
      name:'placeholder.txt', path:'/downloads/placeholder.txt', isDir:false,
      content:'No downloads yet. Use the terminal to create files.'
    },
    '/notes': { name:'notes', path:'/notes', isDir:true },
    '/notes/todo.txt': {
      name:'todo.txt', path:'/notes', isDir:false,
      content:`# TODO
- [ ] Explore File Manager
- [ ] Change accent color in Settings
- [ ] Try terminal commands
`
    },
  };
}
function saveFS() { localStorage.setItem(LS_FS, JSON.stringify(fileSystem)); }

// ── Apply Theme ──────────────────────────────────────────────────────────────
function applyTheme() {
  const html = document.documentElement;
  html.className = 'accent-' + settings.accentColor;
  const desktop = document.getElementById('desktop');
  desktop.className = 'wallpaper-' + ({mesh:'mesh', matrix:'matrix', solid:'solid'}[settings.wallpaper] || 'mesh');
  const sz = {small:'12px',medium:'14px',large:'16px'}[settings.textSize] || '14px';
  document.body.style.fontSize = sz;
}
applyTheme();

// ── Clock ────────────────────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const t = now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
  document.getElementById('clock-time').textContent = t;
  document.getElementById('lock-time').textContent =
    now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:true});
  document.getElementById('lock-date').textContent =
    now.toLocaleDateString([], {weekday:'long',month:'long',day:'numeric'});
}
setInterval(updateClock, 1000);
updateClock();

// ── Lock Screen ──────────────────────────────────────────────────────────────
let locked = false;
let lockElapsed = 0;
let inactivityTimer = null;
let lockElapsedTimer = null;

function resetInactivity() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => { if (!locked) lock(); }, 120000);
}
['mousemove','mousedown','keydown','scroll','touchstart'].forEach(e =>
  window.addEventListener(e, resetInactivity));
resetInactivity();

function lock() {
  locked = true;
  lockElapsed = 0;
  document.getElementById('lock-screen').classList.add('locked');
  lockElapsedTimer = setInterval(() => {
    lockElapsed++;
    const m = Math.floor(lockElapsed / 60);
    const s = String(lockElapsed % 60).padStart(2, '0');
    document.getElementById('lock-timer').textContent = `Idle: ${m}m ${s}s`;
  }, 1000);
}

function unlock() {
  locked = false;
  document.getElementById('lock-screen').classList.remove('locked');
  clearInterval(lockElapsedTimer);
  resetInactivity();
}

// ── Start Menu ───────────────────────────────────────────────────────────────
let startOpen = false;
function toggleStartMenu(e) {
  if (e) e.stopPropagation();
  startOpen = !startOpen;
  document.getElementById('start-menu').classList.toggle('open', startOpen);
  document.getElementById('start-btn').classList.toggle('active', startOpen);
}
function closeStartMenu() {
  startOpen = false;
  document.getElementById('start-menu').classList.remove('open');
  document.getElementById('start-btn').classList.remove('active');
}
document.addEventListener('click', () => closeStartMenu());

// ── Shortcut Guide ───────────────────────────────────────────────────────────
function openShortcutGuide()  { document.getElementById('shortcut-guide').classList.add('open'); }
function closeShortcutGuide() { document.getElementById('shortcut-guide').classList.remove('open'); }

// ── Window System ────────────────────────────────────────────────────────────
let windows = {};
let winZTop = 100;
let focusedWinId = null;
let dragState = null;

function getNextPos() {
  const offset = Object.keys(windows).length * 28;
  return { x: 80 + offset % 200, y: 60 + offset % 120 };
}

function createWindow(id, title, width, height, buildFn) {
  if (windows[id]) { focusWindow(id); restoreWindow(id); return; }

  const pos = getNextPos();
  const el = document.createElement('div');
  el.className = 'win';
  el.id = 'win-' + id;
  el.style.cssText = `left:${pos.x}px;top:${pos.y}px;width:${width}px;height:${height}px;pointer-events:auto;`;

  el.innerHTML = `
    <div class="win-bar" id="winbar-${id}">
      <div class="win-dot"></div>
      <span class="win-title">${title}</span>
      <div class="win-controls">
        <button class="win-btn" onclick="minimizeWindow('${id}')" title="Minimize">─</button>
        <button class="win-btn" onclick="toggleMaxWindow('${id}')" title="Maximize">□</button>
        <button class="win-btn close" onclick="closeWindow('${id}')" title="Close">✕</button>
      </div>
    </div>
    <div class="win-body" id="winbody-${id}"></div>
  `;

  document.getElementById('win-container').appendChild(el);

  windows[id] = { id, title, minimized: false, maximized: false, x: pos.x, y: pos.y, w: width, h: height };
  buildFn(document.getElementById('winbody-' + id));

  // Drag
  el.querySelector('.win-bar').addEventListener('mousedown', e => {
    if (e.target.closest('.win-controls')) return;
    if (windows[id].maximized) return;
    focusWindow(id);
    const rect = el.getBoundingClientRect();
    dragState = { id, startX: e.clientX, startY: e.clientY, winX: rect.left, winY: rect.top };
    e.preventDefault();
  });

  el.addEventListener('mousedown', () => focusWindow(id));
  focusWindow(id);
  updateTaskbar();
}

function focusWindow(id) {
  focusedWinId = id;
  winZTop++;
  const el = document.getElementById('win-' + id);
  if (!el) return;
  el.style.zIndex = winZTop;
  document.querySelectorAll('.win').forEach(w => w.classList.remove('focused'));
  el.classList.add('focused');
  updateTaskbar();
}

function closeWindow(id) {
  const el = document.getElementById('win-' + id);
  if (el) el.remove();
  delete windows[id];
  if (focusedWinId === id) focusedWinId = null;
  updateTaskbar();
}

function minimizeWindow(id) {
  const el = document.getElementById('win-' + id);
  if (!el) return;
  windows[id].minimized = true;
  el.style.display = 'none';
  if (focusedWinId === id) focusedWinId = null;
  updateTaskbar();
}

function restoreWindow(id) {
  const el = document.getElementById('win-' + id);
  if (!el) return;
  windows[id].minimized = false;
  el.style.display = 'flex';
  focusWindow(id);
}

function toggleMaxWindow(id) {
  const el = document.getElementById('win-' + id);
  if (!el) return;
  const w = windows[id];
  if (w.maximized) {
    el.style.cssText = `left:${w.x}px;top:${w.y}px;width:${w.w}px;height:${w.h}px;pointer-events:auto;z-index:${winZTop};`;
    w.maximized = false;
  } else {
    w.x = parseInt(el.style.left); w.y = parseInt(el.style.top);
    w.w = parseInt(el.style.width); w.h = parseInt(el.style.height);
    el.style.cssText = `left:0;top:0;width:100%;height:100%;pointer-events:auto;z-index:${winZTop};border-radius:0;`;
    w.maximized = true;
  }
  focusWindow(id);
}

// Global drag
document.addEventListener('mousemove', e => {
  if (!dragState) return;
  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;
  const nx = Math.max(0, Math.min(window.innerWidth - 120, dragState.winX + dx));
  const ny = Math.max(0, Math.min(window.innerHeight - 80, dragState.winY + dy));
  const el = document.getElementById('win-' + dragState.id);
  if (el) { el.style.left = nx + 'px'; el.style.top = ny + 'px'; }
});
document.addEventListener('mouseup', () => { dragState = null; });

function updateTaskbar() {
  const container = document.getElementById('taskbar-apps');
  container.innerHTML = '';
  Object.values(windows).forEach(w => {
    const btn = document.createElement('button');
    btn.className = 'taskbar-app-btn' + (focusedWinId === w.id ? ' active' : '');
    btn.title = w.title;
    const icons = { terminal:'⌨', files:'📁', settings:'⚙', about:'ℹ', voidbrowser:'🌐' };
    btn.innerHTML = `<span style="font-size:13px;">${icons[w.id]||'🗔'}</span><span class="hidden-sm">${w.title}</span>`;
    if (!w.minimized) btn.innerHTML += '<span class="dot"></span>';
    btn.onclick = () => {
      if (windows[w.id].minimized) { restoreWindow(w.id); }
      else if (focusedWinId === w.id) { minimizeWindow(w.id); }
      else { restoreWindow(w.id); }
    };
    container.appendChild(btn);
  });
}

// ── App Launcher ─────────────────────────────────────────────────────────────
function openApp(id) {
  switch (id) {
    case 'terminal':    openTerminal(); break;
    case 'files':       openFileManager(); break;
    case 'settings':    openSettings(); break;
    case 'about':       openAbout(); break;
    case 'voidbrowser': openVoidBrowser(); break;
  }
}

// ── Terminal App ─────────────────────────────────────────────────────────────
function openTerminal() {
  createWindow('terminal', '⌨ Terminal', 700, 460, body => {
    body.style.cssText = 'display:flex;flex-direction:column;height:100%;';
    body.innerHTML = `
      <div id="term-output"></div>
      <div id="term-input-row">
        <span id="term-prompt">operator@bluebyte:~$</span>
        <input id="term-input" type="text" autocomplete="off" spellcheck="false" placeholder="type a command…">
      </div>
    `;
    termPrint('output', 'BlueByte OS Terminal v1.0.0');
    termPrint('output', 'Type <b style="color:var(--accent)">help</b> for available commands.\n');

    const inp = document.getElementById('term-input');
    let histIdx = -1;
    const hist = [];

    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const cmd = inp.value.trim();
        inp.value = '';
        if (cmd) { hist.unshift(cmd); histIdx = -1; }
        termPrint('input', 'operator@bluebyte:~$ ' + cmd);
        runTermCmd(cmd);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (histIdx < hist.length - 1) { histIdx++; inp.value = hist[histIdx]; }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (histIdx > 0) { histIdx--; inp.value = hist[histIdx]; } else { histIdx = -1; inp.value = ''; }
      }
    });

    // Auto-focus input when window is clicked
    body.addEventListener('click', () => inp.focus());
    inp.focus();
  });
}

let termCwd = '/';

function termPrint(type, text) {
  const out = document.getElementById('term-output');
  if (!out) return;
  const line = document.createElement('div');
  line.className = 'line-' + type;
  line.innerHTML = text;
  out.appendChild(line);
  out.scrollTop = out.scrollHeight;
}

function termPromptUpdate() {
  const el = document.getElementById('term-prompt');
  if (el) el.textContent = `operator@bluebyte:${termCwd}$`;
}

function runTermCmd(raw) {
  if (!raw) return;
  const parts = raw.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (cmd) {
    case 'help':
      termPrint('output', `
<b style="color:var(--accent)">Available Commands:</b>
  <span style="color:#94a3b8">ls</span>               — list directory contents
  <span style="color:#94a3b8">cd &lt;path&gt;</span>        — change directory
  <span style="color:#94a3b8">cat &lt;file&gt;</span>       — display file contents
  <span style="color:#94a3b8">mkdir &lt;name&gt;</span>     — create directory
  <span style="color:#94a3b8">touch &lt;name&gt;</span>     — create empty file
  <span style="color:#94a3b8">echo &lt;text&gt;</span>      — print text
  <span style="color:#94a3b8">rm &lt;path&gt;</span>        — remove file/directory
  <span style="color:#94a3b8">pwd</span>              — print working directory
  <span style="color:#94a3b8">clear</span>            — clear terminal
  <span style="color:#94a3b8">date</span>             — show current date/time
  <span style="color:#94a3b8">whoami</span>           — display current user
  <span style="color:#94a3b8">uname</span>            — system information
  <span style="color:#94a3b8">neofetch</span>         — system info art
  <span style="color:#94a3b8">uptime</span>           — system uptime
  <span style="color:#94a3b8">history</span>          — command history note
  <span style="color:#94a3b8">exit</span>             — close terminal
`);
      break;

    case 'ls': {
      const target = args[0] ? resolvePath(args[0]) : termCwd;
      const entries = Object.values(fileSystem).filter(n =>
        n.path !== target && n.path.startsWith(target === '/' ? '/' : target + '/') &&
        !n.path.slice((target === '/' ? 1 : target.length + 1)).includes('/')
      );
      if (entries.length === 0) { termPrint('output', '(empty directory)'); break; }
      const html = entries.map(e =>
        e.isDir
          ? `<span style="color:#60a5fa;font-weight:700;">${e.name}/</span>`
          : `<span style="color:#94a3b8;">${e.name}</span>`
      ).join('  ');
      termPrint('output', html);
      break;
    }

    case 'pwd':
      termPrint('output', termCwd);
      break;

    case 'cd': {
      const target = args[0] ? resolvePath(args[0]) : '/';
      if (fileSystem[target] && fileSystem[target].isDir) {
        termCwd = target;
        termPromptUpdate();
      } else {
        termPrint('error', `cd: no such directory: ${args[0]}`);
      }
      break;
    }

    case 'cat': {
      if (!args[0]) { termPrint('error', 'cat: missing operand'); break; }
      const p = resolvePath(args[0]);
      const node = fileSystem[p];
      if (!node) { termPrint('error', `cat: ${args[0]}: No such file`); break; }
      if (node.isDir) { termPrint('error', `cat: ${args[0]}: Is a directory`); break; }
      termPrint('output', `<pre style="white-space:pre-wrap;color:#94a3b8;">${escHtml(node.content || '')}</pre>`);
      break;
    }

    case 'mkdir': {
      if (!args[0]) { termPrint('error', 'mkdir: missing operand'); break; }
      const p = resolvePath(args[0]);
      if (fileSystem[p]) { termPrint('error', `mkdir: cannot create '${args[0]}': Already exists`); break; }
      fileSystem[p] = { name: args[0].split('/').pop(), path: p, isDir: true };
      saveFS();
      termPrint('success', `Created directory: ${args[0]}`);
      break;
    }

    case 'touch': {
      if (!args[0]) { termPrint('error', 'touch: missing operand'); break; }
      const p = resolvePath(args[0]);
      if (!fileSystem[p]) {
        fileSystem[p] = { name: args[0].split('/').pop(), path: p, isDir: false, content: '' };
        saveFS();
        termPrint('success', `Created file: ${args[0]}`);
      }
      break;
    }

    case 'echo':
      termPrint('output', args.join(' '));
      break;

    case 'rm': {
      if (!args[0]) { termPrint('error', 'rm: missing operand'); break; }
      const p = resolvePath(args[0]);
      if (!fileSystem[p]) { termPrint('error', `rm: cannot remove '${args[0]}': No such file`); break; }
      delete fileSystem[p];
      // Remove children if directory
      Object.keys(fileSystem).forEach(k => { if (k.startsWith(p + '/')) delete fileSystem[k]; });
      saveFS();
      termPrint('success', `Removed: ${args[0]}`);
      break;
    }

    case 'clear':
      { const out = document.getElementById('term-output'); if (out) out.innerHTML = ''; break; }

    case 'date':
      termPrint('output', new Date().toString());
      break;

    case 'whoami':
      termPrint('output', 'operator');
      break;

    case 'uname':
      termPrint('output', 'BlueByte OS 1.0.0 (WebKernel 5.10) ' + navigator.platform);
      break;

    case 'uptime':
      termPrint('output', 'up 0 days, 0 hours (simulated virtual machine)');
      break;

    case 'history':
      termPrint('output', 'Command history is available using ↑ / ↓ arrow keys.');
      break;

    case 'neofetch':
      termPrint('output', `
<pre style="color:var(--accent);line-height:1.4;">
██████╗ ██╗     ██╗   ██╗███████╗
██╔══██╗██║     ██║   ██║██╔════╝
██████╔╝██║     ██║   ██║█████╗
██╔══██╗██║     ██║   ██║██╔══╝
██████╔╝███████╗╚██████╔╝███████╗
╚═════╝ ╚══════╝ ╚═════╝ ╚══════╝</pre>
<span style="color:#94a3b8;">
  OS:     BlueByte OS 1.0.0
  Host:   WebKernel (Browser-based)
  Shell:  bb-shell v1.0
  Theme:  ${settings.accentColor.charAt(0).toUpperCase() + settings.accentColor.slice(1)}
  User:   operator
  Date:   ${new Date().toLocaleDateString()}
</span>`);
      break;

    case 'exit':
      closeWindow('terminal');
      break;

    default:
      termPrint('error', `${cmd}: command not found. Type <b>help</b> for commands.`);
  }
}

function resolvePath(p) {
  if (p.startsWith('/')) return normalize(p);
  if (p === '..') return normalize(termCwd + '/..');
  if (p === '.') return termCwd;
  return normalize(termCwd + '/' + p);
}

function normalize(p) {
  const parts = p.split('/').filter(Boolean);
  const stack = [];
  for (const part of parts) {
    if (part === '..') stack.pop();
    else if (part !== '.') stack.push(part);
  }
  return '/' + stack.join('/');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── File Manager App ─────────────────────────────────────────────────────────
let fmCwd = '/';

function openFileManager() {
  createWindow('files', '📁 File Manager', 680, 460, body => {
    body.style.cssText = 'display:flex;flex-direction:column;height:100%;';
    body.innerHTML = `
      <div id="fm-toolbar">
        <button class="settings-btn" onclick="fmNavigate('..')" title="Up">↑ Up</button>
        <div id="fm-path">/</div>
        <button class="settings-btn" onclick="fmRefresh()" title="Refresh">↻</button>
        <button class="settings-btn" onclick="fmNewFolder()" title="New Folder">+ Folder</button>
        <button class="settings-btn" onclick="fmNewFile()" title="New File">+ File</button>
      </div>
      <div style="display:flex;flex:1;overflow:hidden;">
        <div id="fm-tree"></div>
        <div id="fm-files"></div>
        <div id="fm-preview"></div>
      </div>
    `;
    fmCwd = '/';
    fmRender();
  });
}

function fmRender() {
  const tree = document.getElementById('fm-tree');
  const files = document.getElementById('fm-files');
  const preview = document.getElementById('fm-preview');
  const pathEl = document.getElementById('fm-path');
  if (!tree || !files) return;

  pathEl.textContent = fmCwd;

  // Tree: top-level dirs
  const topDirs = Object.values(fileSystem).filter(n =>
    n.isDir && n.path !== '/' && !n.path.slice(1).includes('/')
  );
  tree.innerHTML = `<div class="fm-folder-item ${fmCwd==='/'?'active':''}" onclick="fmNavigate('/')">📁 /root</div>` +
    topDirs.map(d => `<div class="fm-folder-item ${fmCwd===d.path?'active':''}" onclick="fmNavigate('${d.path}')">📁 ${d.name}</div>`).join('');

  // Files in current dir
  const entries = Object.values(fileSystem).filter(n =>
    n.path !== fmCwd &&
    n.path.startsWith(fmCwd === '/' ? '/' : fmCwd + '/') &&
    !n.path.slice((fmCwd === '/' ? 1 : fmCwd.length + 1)).includes('/')
  );

  if (entries.length === 0) {
    files.innerHTML = `<div style="padding:20px;color:#334155;font-family:monospace;font-size:11px;">(empty)</div>`;
  } else {
    files.innerHTML = entries.map(e => {
      const icon = e.isDir ? '📁' : fileIcon(e.name);
      return `<div class="fm-file" onclick="fmSelect(event,'${e.path}')" ondblclick="fmOpen('${e.path}')">
        <div class="fm-icon">${icon}</div>
        <div class="fm-name">${e.name}</div>
      </div>`;
    }).join('');
  }

  preview.innerHTML = '';
  preview.classList.remove('visible');
}

function fileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  return { txt:'📄', md:'📝', js:'📜', ts:'📜', json:'🗃', html:'🌐', css:'🎨', png:'🖼', jpg:'🖼', gif:'🖼' }[ext] || '📄';
}

function fmNavigate(p) {
  const target = p === '..' ? normalize(fmCwd + '/..') : p;
  if (fileSystem[target] && fileSystem[target].isDir) { fmCwd = target; fmRender(); }
}

function fmSelect(e, path) {
  const node = fileSystem[path];
  const preview = document.getElementById('fm-preview');
  if (!node || node.isDir) { preview.classList.remove('visible'); return; }
  preview.classList.add('visible');
  preview.innerHTML = `<div style="color:var(--accent);font-weight:700;margin-bottom:8px;">${node.name}</div>
    <pre>${escHtml(node.content || '(empty file)')}</pre>`;
}

function fmOpen(path) {
  const node = fileSystem[path];
  if (!node) return;
  if (node.isDir) { fmCwd = path; fmRender(); return; }
  // Open file content in a viewer window
  const wid = 'fv_' + path.replace(/[^a-z0-9]/gi,'_');
  createWindow(wid, '📄 ' + node.name, 520, 400, body => {
    body.style.cssText = 'padding:14px;overflow-y:auto;';
    body.innerHTML = `<pre style="white-space:pre-wrap;font-family:monospace;font-size:12px;color:#94a3b8;line-height:1.7;">${escHtml(node.content || '(empty file)')}</pre>`;
  });
}

function fmRefresh() { fmRender(); }

function fmNewFolder() {
  const name = prompt('Folder name:');
  if (!name) return;
  const p = normalize(fmCwd + '/' + name);
  if (fileSystem[p]) { alert('Already exists.'); return; }
  fileSystem[p] = { name, path: p, isDir: true };
  saveFS(); fmRender();
}

function fmNewFile() {
  const name = prompt('File name:');
  if (!name) return;
  const p = normalize(fmCwd + '/' + name);
  if (fileSystem[p]) { alert('Already exists.'); return; }
  fileSystem[p] = { name, path: p, isDir: false, content: '' };
  saveFS(); fmRender();
}

// ── Settings App ─────────────────────────────────────────────────────────────
function openSettings() {
  createWindow('settings', '⚙ Settings', 520, 400, body => {
    body.innerHTML = `<div id="settings-body">

      <div class="settings-section">
        <h3>Accent Color</h3>
        <div class="settings-row">
          <label>Color Theme</label>
          <div class="color-swatches">
            <div class="color-swatch ${settings.accentColor==='cyan'?'active':''}"   style="background:#22d3ee;" onclick="setAccent('cyan',this)"   title="Cyan"></div>
            <div class="color-swatch ${settings.accentColor==='blue'?'active':''}"   style="background:#3b82f6;" onclick="setAccent('blue',this)"   title="Blue"></div>
            <div class="color-swatch ${settings.accentColor==='indigo'?'active':''}" style="background:#6366f1;" onclick="setAccent('indigo',this)" title="Indigo"></div>
            <div class="color-swatch ${settings.accentColor==='emerald'?'active':''}"style="background:#10b981;" onclick="setAccent('emerald',this)"title="Emerald"></div>
            <div class="color-swatch ${settings.accentColor==='slate'?'active':''}"  style="background:#94a3b8;" onclick="setAccent('slate',this)"  title="Slate"></div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h3>Wallpaper</h3>
        <div class="settings-row">
          <label>Background Style</label>
          <select class="settings-select" onchange="setWallpaper(this.value)">
            <option value="mesh"   ${settings.wallpaper==='mesh'?'selected':''}>Midnight Mesh</option>
            <option value="matrix" ${settings.wallpaper==='matrix'?'selected':''}>Blue Matrix Grid</option>
            <option value="solid"  ${settings.wallpaper==='solid'?'selected':''}>Solid Black</option>
          </select>
        </div>
      </div>

      <div class="settings-section">
        <h3>Text Size</h3>
        <div class="settings-row">
          <label>Font Size</label>
          <select class="settings-select" onchange="setTextSize(this.value)">
            <option value="small"  ${settings.textSize==='small'?'selected':''}>Small</option>
            <option value="medium" ${settings.textSize==='medium'?'selected':''}>Medium</option>
            <option value="large"  ${settings.textSize==='large'?'selected':''}>Large</option>
          </select>
        </div>
      </div>

      <div class="settings-section">
        <h3>System</h3>
        <div class="settings-row">
          <label>Reset all data</label>
          <button class="settings-btn danger" onclick="systemReset()">Factory Reset</button>
        </div>
        <div class="settings-row">
          <label>Lock Screen Now</label>
          <button class="settings-btn" onclick="lock()">Lock</button>
        </div>
      </div>

    </div>`;
  });
}

function setAccent(color, el) {
  settings.accentColor = color;
  saveSettings();
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
  applyTheme();
}
function setWallpaper(val) { settings.wallpaper = val; saveSettings(); applyTheme(); }
function setTextSize(val)  { settings.textSize  = val; saveSettings(); applyTheme(); }

function systemReset() {
  if (!confirm('Reset all files and settings?')) return;
  localStorage.removeItem(LS_SETTINGS);
  localStorage.removeItem(LS_FS);
  window.location.reload();
}

// ── About App ─────────────────────────────────────────────────────────────────
function openAbout() {
  createWindow('about', 'ℹ About BlueByte OS', 420, 380, body => {
    body.innerHTML = `<div id="about-body">
      <div class="about-logo">💻</div>
      <h2>BlueByte OS</h2>
      <p>A browser-based operating system simulation.<br>Built with pure HTML, CSS, and JavaScript.<br>No frameworks. No build step. Fully static.</p>
      <table class="about-table">
        <tr><td>Version</td><td>1.0.0</td></tr>
        <tr><td>Kernel</td><td>WebKernel 5.10</td></tr>
        <tr><td>Shell</td><td>bb-shell 1.0</td></tr>
        <tr><td>Browser</td><td>${navigator.userAgent.split(' ').pop()}</td></tr>
        <tr><td>Platform</td><td>${navigator.platform}</td></tr>
        <tr><td>Theme</td><td id="about-theme">${settings.accentColor}</td></tr>
        <tr><td>Wallpaper</td><td>${settings.wallpaper}</td></tr>
        <tr><td>Date</td><td>${new Date().toLocaleDateString()}</td></tr>
      </table>
    </div>`;
  });
}

// ── Void Browser App ─────────────────────────────────────────────────────────
let voidBrowserEngine = 'brave';
let voidBrowserChooserVisible = false;
let vbHistory = [];
let vbHistIdx  = -1;

const VB_ENGINES = {
  brave:      { label: '🦁 Brave',  search: q => `https://search.brave.com/search?q=${encodeURIComponent(q)}` },
  duckduckgo: { label: '🦆 DDG',    search: q => `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(q)}` },
  yahoo:      { label: '🔍 Yahoo',  search: q => `https://search.yahoo.com/search?p=${encodeURIComponent(q)}` },
};

function openVoidBrowser() {
  if (windows['voidbrowser']) {
    if (windows['voidbrowser'].minimized) { restoreWindow('voidbrowser'); }
    else { focusWindow('voidbrowser'); }
    return;
  }
  voidBrowserChooserVisible = false;
  vbHistory = [];
  vbHistIdx  = -1;

  createWindow('voidbrowser', '🌐 Void Browser', 960, 620, body => {
    body.style.cssText = 'display:flex;flex-direction:column;height:100%;position:relative;overflow:hidden;';
    body.innerHTML = `
      <div id="vb-toolbar">
        <button class="vb-nav-btn" id="vb-back"  onclick="vbGoBack()"  title="Back"    disabled>&#8592;</button>
        <button class="vb-nav-btn" id="vb-fwd"   onclick="vbGoFwd()"   title="Forward" disabled>&#8594;</button>
        <button class="vb-nav-btn"               onclick="vbReload()"  title="Reload">&#8635;</button>
        <div id="vb-engine-badge" onclick="vbToggleEngineChooser()" title="Alt+B to switch engine">${VB_ENGINES[voidBrowserEngine].label}</div>
        <input id="vb-addressbar" type="text" placeholder="Search or enter a URL…"
               onkeydown="if(event.key==='Enter'){vbNavigate(this.value)}" />
        <button class="vb-nav-btn" onclick="vbNavigate(document.getElementById('vb-addressbar').value)" title="Go">&#8629;</button>
        <button class="vb-nav-btn" onclick="vbOpenNewTab()" title="Open in new tab" style="font-size:10px;width:30px;">&#10187;</button>
      </div>
      <div id="vb-content">
        <iframe id="vb-frame"
          sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals allow-presentation"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture; accelerometer; gyroscope; payment"
          allowfullscreen
          src="about:blank"></iframe>
        <div id="vb-engine-chooser" class="hidden">
          <div id="vb-ec-box">
            <div class="vb-ec-title">&#9889; Choose Search Engine</div>
            <div class="vb-ec-option" onclick="vbSelectEngine('brave')">
              <span class="vb-ec-key">1</span><span>Brave Search</span>
            </div>
            <div class="vb-ec-option" onclick="vbSelectEngine('duckduckgo')">
              <span class="vb-ec-key">2</span><span>DuckDuckGo</span>
            </div>
            <div class="vb-ec-option" onclick="vbSelectEngine('yahoo')">
              <span class="vb-ec-key">3</span><span>Yahoo Search</span>
            </div>
            <div class="vb-ec-hint">Press 1 · 2 · 3 to select &nbsp;|&nbsp; Esc / Alt+B to close</div>
          </div>
        </div>
      </div>
      <div id="vb-status">Ready — search or enter a URL above &nbsp;|&nbsp; Alt+B switches engine</div>
    `;

    const frame = document.getElementById('vb-frame');
    frame.addEventListener('load', () => {
      try {
        const src = frame.src;
        if (src && src.includes('/proxy?url=')) {
          const realUrl = decodeURIComponent(src.split('/proxy?url=')[1].split('&')[0]);
          const ab = document.getElementById('vb-addressbar');
          if (ab && document.activeElement !== ab) ab.value = realUrl;
          const st = document.getElementById('vb-status');
          if (st) st.textContent = realUrl;
        } else if (src === 'about:blank') {
          const st = document.getElementById('vb-status');
          if (st) st.textContent = 'Ready — search or enter a URL above';
        }
      } catch (_) {}
      vbUpdateNavBtns();
    });
  });
}

function vbGetProxyUrl(url) {
  return '/proxy?url=' + encodeURIComponent(url);
}

function vbNavigate(input) {
  if (!input || !input.trim()) return;
  input = input.trim();
  let url;
  if (/^https?:\/\//i.test(input)) {
    url = input;
  } else if (/^[a-z0-9-]+\.[a-z]{2,}/i.test(input) && !input.includes(' ')) {
    url = 'https://' + input;
  } else {
    url = VB_ENGINES[voidBrowserEngine].search(input);
  }
  const frame = document.getElementById('vb-frame');
  const ab    = document.getElementById('vb-addressbar');
  const st    = document.getElementById('vb-status');
  if (!frame) return;
  if (vbHistIdx < vbHistory.length - 1) vbHistory = vbHistory.slice(0, vbHistIdx + 1);
  vbHistory.push(url);
  vbHistIdx = vbHistory.length - 1;
  frame.src = vbGetProxyUrl(url);
  if (ab) ab.value = url;
  if (st) st.textContent = 'Loading: ' + url;
  vbUpdateNavBtns();
}

function vbGoBack() {
  if (vbHistIdx > 0) {
    vbHistIdx--;
    const url = vbHistory[vbHistIdx];
    const frame = document.getElementById('vb-frame');
    const ab    = document.getElementById('vb-addressbar');
    if (frame) frame.src = vbGetProxyUrl(url);
    if (ab)    ab.value  = url;
    vbUpdateNavBtns();
  }
}

function vbGoFwd() {
  if (vbHistIdx < vbHistory.length - 1) {
    vbHistIdx++;
    const url = vbHistory[vbHistIdx];
    const frame = document.getElementById('vb-frame');
    const ab    = document.getElementById('vb-addressbar');
    if (frame) frame.src = vbGetProxyUrl(url);
    if (ab)    ab.value  = url;
    vbUpdateNavBtns();
  }
}

function vbReload() {
  const frame = document.getElementById('vb-frame');
  if (frame && frame.src !== 'about:blank') { frame.src = frame.src; }
}

function vbUpdateNavBtns() {
  const back = document.getElementById('vb-back');
  const fwd  = document.getElementById('vb-fwd');
  if (back) back.disabled = vbHistIdx <= 0;
  if (fwd)  fwd.disabled  = vbHistIdx >= vbHistory.length - 1;
}

function vbOpenNewTab() {
  const ab = document.getElementById('vb-addressbar');
  if (ab && ab.value) {
    let url = ab.value.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function vbToggleEngineChooser() {
  voidBrowserChooserVisible = !voidBrowserChooserVisible;
  const ec = document.getElementById('vb-engine-chooser');
  if (ec) ec.classList.toggle('hidden', !voidBrowserChooserVisible);
  if (voidBrowserChooserVisible) {
    const ab = document.getElementById('vb-addressbar');
    if (ab) ab.blur();
    focusWindow('voidbrowser');
  }
}

function vbHideEngineChooser() {
  voidBrowserChooserVisible = false;
  const ec = document.getElementById('vb-engine-chooser');
  if (ec) ec.classList.add('hidden');
}

function vbSelectEngine(engine) {
  voidBrowserEngine = engine;
  vbHideEngineChooser();
  const badge = document.getElementById('vb-engine-badge');
  if (badge) badge.textContent = VB_ENGINES[engine].label;
  const st = document.getElementById('vb-status');
  if (st) st.textContent = 'Engine set to ' + VB_ENGINES[engine].label;
}

// ── Global Keyboard Shortcuts ─────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (locked) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); unlock(); }
    return;
  }

  // Engine chooser intercept — only when browser is focused and chooser is open
  if (voidBrowserChooserVisible && windows['voidbrowser'] && focusedWinId === 'voidbrowser') {
    if (e.key === '1') { e.preventDefault(); vbSelectEngine('brave');      return; }
    if (e.key === '2') { e.preventDefault(); vbSelectEngine('duckduckgo'); return; }
    if (e.key === '3') { e.preventDefault(); vbSelectEngine('yahoo');      return; }
    if (e.key === 'Escape') { e.preventDefault(); vbHideEngineChooser();   return; }
  }

  if (e.key === '?') {
    const t = e.target;
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
    e.preventDefault();
    openShortcutGuide();
    return;
  }

  if (e.altKey) {
    switch (e.key.toLowerCase()) {
      case 't': e.preventDefault(); openApp('terminal');  break;
      case 'f': e.preventDefault(); openApp('files');     break;
      case 's': e.preventDefault(); openApp('settings');  break;
      case 'w': e.preventDefault(); toggleStartMenu(null); break;
      case 'h': e.preventDefault(); openShortcutGuide();  break;
      case 'b': e.preventDefault();
        if (windows['voidbrowser'] && !windows['voidbrowser'].minimized) {
          vbToggleEngineChooser();
        } else {
          openVoidBrowser();
        }
        break;
      case 'c': e.preventDefault(); if (focusedWinId) closeWindow(focusedWinId); break;
      case 'm': e.preventDefault(); if (focusedWinId) minimizeWindow(focusedWinId); break;
      case 'x': e.preventDefault(); if (focusedWinId) toggleMaxWindow(focusedWinId); break;
    }
  }
});
