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

## 📖 HTTP Tool Usage Examples

The HTTP tool allows you to send various HTTP requests and view responses. The request format is similar to raw HTTP request format.

### **Request Format**

HTTP requests follow this format:

```
METHOD URL HTTP/1.1
Header-Name: Header-Value
Another-Header: Another-Value

Request Body (optional)
```

### **Example 1: GET Request**

```http
GET https://api.github.com/users/octocat HTTP/1.1
Accept: application/json
User-Agent: MacDevTools/1.0
```

**Notes:**
- First line: `GET` is the method, followed by the full URL
- Subsequent lines: Request headers, one per line, format: `Key: Value`
- Request body follows after a blank line (GET requests usually don't have a body)

### **Example 2: POST Request (with JSON body)**

```http
POST https://api.example.com/users HTTP/1.1
Content-Type: application/json
Authorization: Bearer your-token-here

{
  "name": "John Doe",
  "email": "john@example.com"
}
```

**Notes:**
- Use `POST` method
- Set `Content-Type` to `application/json`
- Add `Authorization` header
- JSON body follows after blank line

### **Example 3: Using Relative Path with Host Header**

```http
GET /api/v1/users HTTP/1.1
Host: api.example.com
Accept: application/json
```

**Notes:**
- If URL is not a full path, you can use relative path `/api/v1/users`
- Specify server address via `Host` header
- Tool will automatically combine to `http://api.example.com/api/v1/users`

### **Example 4: PUT Request (Update Resource)**

```http
PUT https://api.example.com/users/123 HTTP/1.1
Content-Type: application/json
Authorization: Bearer your-token-here

{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

### **Example 5: DELETE Request**

```http
DELETE https://api.example.com/users/123 HTTP/1.1
Authorization: Bearer your-token-here
```

### **Usage Steps**

1. **Create HTTP File**
   - Switch to HTTP tool (`Cmd+4` or click sidebar)
   - Create new file (`Cmd+N`) or open existing file

2. **Write Request**
   - Enter HTTP request content in the editor
   - Syntax highlighting and autocomplete supported (typing `GET`, `POST`, etc. will show suggestions)

3. **Send Request**
   - Click the "Send" button in the toolbar
   - Or use keyboard shortcut (if configured)

4. **View Response**
   - Response will automatically appear in the preview panel on the right
   - Response format includes:
     - Status line (HTTP/1.1 Status Code Status Text)
     - Response headers
     - Response body
   - Supports syntax highlighting, code folding, and right-click copy

### **Response Preview**

After sending a request, the preview panel shows formatted response:

```
HTTP/1.1 200 OK

Content-Type: application/json
Content-Length: 1234
Date: Mon, 01 Jan 2024 12:00:00 GMT

{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com"
}
```

### **Supported HTTP Methods**

- `GET` - Retrieve resource
- `POST` - Create resource
- `PUT` - Update resource (full replacement)
- `PATCH` - Partial update resource
- `DELETE` - Delete resource
- `HEAD` - Get response headers (no body)
- `OPTIONS` - Get supported methods
- `TRACE` - Echo server request
- `CONNECT` - Establish tunnel connection

### **Tips & Tricks**

1. **Autocomplete**: Automatic suggestions when typing HTTP methods or common headers
2. **Syntax Highlighting**: HTTP methods, URLs, headers have different colors
3. **Code Folding**: Can fold request body sections for easier viewing
4. **Right-click Copy**: Right-click in preview panel to copy response content
5. **Error Handling**: If request fails, error message appears in preview panel
6. **Timeout**: Request timeout is 30 seconds
7. **Response Size Limit**: Response body max size is 10MB, larger responses will be truncated

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
