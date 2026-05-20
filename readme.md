# BlueByte OS

A browser-based operating system simulation that runs entirely as a static website — no server, no build step, no dependencies.

## Live Demo

Host any of these files on GitHub Pages and open `index.html` in your browser.

## Features

| Feature | Details |
|---|---|
| **Draggable Windows** | Click the title bar and drag to reposition |
| **Minimize / Maximize / Close** | Standard window controls |
| **Terminal** | Simulated shell with 15+ commands |
| **File Manager** | Virtual filesystem with folder navigation, file preview, create & delete |
| **Settings** | Change accent color, wallpaper, and text size — persisted in localStorage |
| **Lock Screen** | Auto-locks after 2 minutes of inactivity |
| **Keyboard Shortcuts** | Full Alt+key navigation (see table below) |
| **Start Menu** | Click the logo in the taskbar or press `Alt+W` |
| **Live Clock** | Updates every second in the taskbar |

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Alt + T` | Open Terminal |
| `Alt + F` | Open File Manager |
| `Alt + S` | Open Settings |
| `Alt + W` | Toggle Start Menu |
| `Alt + H` or `?` | Toggle Shortcut Guide |
| `Alt + C` | Close focused window |
| `Alt + M` | Minimize focused window |
| `Alt + X` | Maximize / Restore focused window |
| `Enter` or `Space` | Unlock from lock screen |

## Terminal Commands

```
help       — show all commands
ls         — list directory contents
cd <path>  — change directory
cat <file> — display file content
mkdir      — create directory
touch      — create file
echo       — print text
rm         — remove file or directory
pwd        — print working directory
clear      — clear the terminal
date       — current date and time
whoami     — current user
uname      — system info
neofetch   — system art + info
uptime     — uptime info
exit       — close terminal
```

## Project Structure

```
/
├── index.html        # Main entry point — the OS shell
├── README.md         # This file
└── assets/
    ├── style.css     # All styles and theme variables
    └── os.js         # All OS logic (windows, apps, terminal, FS)
```

## Hosting on GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set the source to the `main` branch, root `/`
4. Your OS will be live at [https://blueosport.github.io/PC/]

## Technologies

- **HTML5** — structure
- **CSS3** — styling, animations, CSS custom properties for theming
- **Vanilla JavaScript** — all logic (no frameworks)
- **localStorage** — persistence for settings and virtual filesystem

## Customisation

- Edit `assets/style.css` to add new accent colors or wallpapers
- Edit `assets/os.js` → `defaultFS()` to pre-populate the virtual filesystem
- Add new apps by extending `openApp()` in `assets/os.js`
