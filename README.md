# MacDevTools

A high-performance developer toolkit built with Wails and React, designed to provide a native macOS experience.

![MacDevTools](https://img.shields.io/badge/version-1.0.0-blue)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### 🎨 **Native macOS Experience**
- **Immersive Window**: Hidden inset title bar with native traffic lights (red/yellow/green buttons)
- **Backdrop Blur**: Translucent sidebar with macOS-style blur effect
- **Native Menus**: Full macOS menu bar integration
- **Native Dialogs**: System file picker for import/export
- **macOS Shortcuts**: All keyboard shortcuts use `Cmd` instead of `Ctrl`

### 🛠️ **Developer Tools**

#### 1. **JSON Tools**
- Format JSON with proper indentation
- Compress JSON (remove whitespace)
- Syntax validation with error highlighting
- Real-time preview

#### 2. **XML Tools**
- Format XML documents
- Convert XML to JSON
- Syntax validation

#### 3. **Base64 Tools**
- Encode text to Base64
- Decode Base64 to text
- Real-time preview of decoded content

#### 4. **HTTP Tools**
- Send HTTP requests (GET, POST, PUT, DELETE, etc.)
- Custom headers support
- Request body editor
- Response viewer

### 📁 **File Management**
- Virtual file system with folders
- Create, rename, delete files and folders
- Right-click context menus
- Tab-based editor with dirty state tracking
- Auto-save option

### 🔍 **Global Search & Replace**
- Search across all files in all tools
- Replace functionality with confirmation
- Keyboard shortcut: `Cmd+Shift+F`

### 💾 **Backup & Restore**
- Export all data to JSON file
- Import backup files
- Native macOS save/open dialogs

### 🎨 **Theming**
- Light and Dark mode
- macOS-inspired color palette
- Smooth transitions

---

## 📦 Tech Stack

### **Backend**
- **Wails v2**: Native Go desktop framework
- **Go 1.21+**: Business logic and system integration

### **Frontend**
- **React 18**: UI framework
- **Vite**: Build tool and dev server
- **TailwindCSS**: Utility-first CSS framework
- **Zustand**: Lightweight state management
- **Monaco Editor**: Code editor component
- **Lucide React**: Icon library

---

## 🚀 Getting Started

### **Prerequisites**

1. **Go 1.21+**
   ```bash
   brew install go
   ```

2. **Node.js 18+**
   ```bash
   brew install node
   ```

3. **Wails CLI**
   ```bash
   go install github.com/wailsapp/wails/v2/cmd/wails@latest
   ```

### **Installation**

1. **Clone the repository**
   ```bash
   cd MacDevTools
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

3. **Run in development mode**
   ```bash
   wails dev
   ```

4. **Build for production**
   ```bash
   wails build
   ```

   The built app will be in `build/bin/MacDevTools.app`

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+1/2/3/4` | Switch between tools (JSON/XML/Base64/HTTP) |
| `Cmd+Shift+F` | Open global search |
| `Cmd+W` | Close current tab |
| `Cmd+S` | Save file (triggers auto-save check) |
| `Cmd+B` | Toggle file explorer |
| `Cmd+Shift+P` | Toggle preview panel |
| `Cmd+,` | Open settings |

---

## 🏗️ Project Structure

```
MacDevTools/
├── main.go                 # Wails app entry point with macOS config
├── app.go                  # Business logic (JSON, XML, Base64, HTTP tools)
├── go.mod                  # Go dependencies
├── wails.json              # Wails configuration
└── frontend/
    ├── package.json        # Node dependencies
    ├── vite.config.js      # Vite configuration
    ├── tailwind.config.js  # TailwindCSS configuration
    ├── index.html          # HTML entry point
    └── src/
        ├── main.jsx        # React entry point
        ├── App.jsx         # Root component
        ├── index.css       # Global styles
        ├── store/
        │   └── useAppStore.js    # Zustand state management
        ├── hooks/
        │   └── useMacShortcuts.js # macOS keyboard shortcuts
        ├── components/
        │   ├── macOS/
        │   │   └── TitleBarSpacer.jsx  # Traffic lights spacing
        │   ├── Layout/
        │   │   └── Sidebar.jsx         # Tool selector
        │   ├── Explorer/
        │   │   ├── FileExplorer.jsx    # File tree
        │   │   └── ContextMenu.jsx     # Right-click menu
        │   ├── Editor/
        │   │   ├── MainContent.jsx     # Main container
        │   │   ├── TabBar.jsx          # File tabs
        │   │   ├── Toolbar.jsx         # Action buttons
        │   │   ├── Editor.jsx          # Monaco editor
        │   │   └── Preview.jsx         # Preview panel
        │   └── Modals/
        │       ├── SettingsModal.jsx   # Settings dialog
        │       └── GlobalSearchModal.jsx # Search & replace
        └── wailsjs/
            └── go/main/App.js   # Auto-generated Go bindings
```

---

## 🎨 macOS-Specific Implementation Details

### **1. Window Configuration (`main.go:66-82`)**

```go
Mac: &mac.Options{
    TitleBar: mac.TitleBarHiddenInset(),
    WindowIsTranslucent: true,
    WebviewIsTransparent: true,
    About: &mac.AboutInfo{
        Title:   "MacDevTools",
        Message: "...",
    },
    Appearance: mac.NSAppearanceNameDarkAqua,
}
```

### **2. Traffic Lights Spacing (`TitleBarSpacer.jsx:12-17`)**

```jsx
<div
  className="h-[38px] w-full draggable"
  style={{ WebkitAppRegion: 'drag' }}
/>
```

### **3. Backdrop Blur (`Sidebar.jsx:38-42`)**

```jsx
<div
  className="backdrop-macos"
  style={{ background: 'var(--macos-sidebar)' }}
/>
```

### **4. Native File Dialogs (`app.go:31-62`)**

```go
func (a *App) OpenFileDialog() (string, error) {
    file, err := runtime.OpenFileDialog(a.ctx, ...)
    // ...
}
```

### **5. Keyboard Shortcuts (`useMacShortcuts.js:18`)**

```js
const isMod = e.metaKey || e.ctrlKey  // metaKey = Cmd on macOS
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Wails](https://wails.io/) - Amazing Go + Web framework
- [React](https://react.dev/) - UI library
- [TailwindCSS](https://tailwindcss.com/) - CSS framework
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code editor
- [Lucide](https://lucide.dev/) - Beautiful icons

---

## 📧 Contact

For questions or feedback, please open an issue on GitHub.

**Built with ❤️ for the macOS developer community**
