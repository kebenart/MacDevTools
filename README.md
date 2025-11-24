# MacDevTools

一个基于 Wails 和 React 构建的高性能开发者工具集，专为 macOS 原生体验而设计。

![MacDevTools](https://img.shields.io/badge/version-1.0.0-blue)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ 功能特性

### 🎨 **原生 macOS 体验**
- **沉浸式窗口**：隐藏式标题栏，带有原生交通灯按钮（红/黄/绿）
- **背景模糊**：半透明侧边栏，具有 macOS 风格的模糊效果
- **原生菜单**：完整的 macOS 菜单栏集成
- **原生对话框**：系统文件选择器用于导入/导出
- **macOS 快捷键**：所有键盘快捷键使用 `Cmd` 而不是 `Ctrl`

### 🛠️ **开发者工具**

#### 1. **JSON 工具**
- 格式化 JSON，带有适当的缩进
- 压缩 JSON（移除空白字符）
- 语法验证，带有错误高亮
- 实时预览

#### 2. **XML 工具**
- 格式化 XML 文档
- 将 XML 转换为 JSON
- 语法验证

#### 3. **Base64 工具**
- 将文本编码为 Base64
- 将 Base64 解码为文本
- 解码内容的实时预览

#### 4. **HTTP 工具**
- 发送 HTTP 请求（GET、POST、PUT、DELETE 等）
- 自定义请求头支持
- 请求体编辑器
- 响应查看器
- 语法高亮和代码折叠
- 右键菜单复制功能

### 📁 **文件管理**
- 虚拟文件系统，支持文件夹
- 创建、重命名、删除文件和文件夹
- 右键上下文菜单
- 基于标签页的编辑器，带有未保存状态跟踪
- 自动保存选项
- 可拖拽调整预览框宽度

### 🔍 **全局搜索与替换**
- 在所有工具的所有文件中搜索
- 替换功能，带有确认对话框
- 键盘快捷键：`Cmd+Shift+F`

### 💾 **备份与恢复**
- 将所有数据导出为 JSON 文件
- 导入备份文件
- 原生 macOS 保存/打开对话框

### 🎨 **主题**
- 浅色和深色模式
- macOS 风格的颜色调色板
- 平滑过渡动画
- HTTP 工具专用主题样式

### 🪟 **窗口行为**
- 点击关闭按钮时最小化到 Dock（而非直接关闭）
- 支持窗口最小化和最大化

---

## 📦 技术栈

### **后端**
- **Wails v2**：原生 Go 桌面框架
- **Go 1.21+**：业务逻辑和系统集成

### **前端**
- **React 18**：UI 框架
- **Vite**：构建工具和开发服务器
- **TailwindCSS**：实用优先的 CSS 框架
- **Zustand**：轻量级状态管理
- **Monaco Editor**：代码编辑器组件（支持语法高亮、代码折叠）
- **Lucide React**：图标库

---

## 🚀 快速开始

### **前置要求**

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

### **安装**

1. **克隆仓库**
   ```bash
   cd MacDevTools
   ```

2. **安装前端依赖**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

3. **开发模式运行**
   ```bash
   wails dev
   ```

4. **构建生产版本**
   ```bash
   wails build
   ```

   构建的应用位于 `build/bin/MacDevTools.app`

---

## 📖 HTTP 工具使用示例

HTTP 工具允许你发送各种 HTTP 请求并查看响应。请求格式类似于原始 HTTP 请求格式。

### **请求格式**

HTTP 请求的格式如下：

```
METHOD URL HTTP/1.1
Header-Name: Header-Value
Another-Header: Another-Value

请求体（可选）
```

### **示例 1: GET 请求**

```http
GET https://api.github.com/users/octocat HTTP/1.1
Accept: application/json
User-Agent: MacDevTools/1.0
```

**说明：**
- 第一行：`GET` 是请求方法，后面是完整的 URL
- 后续行：请求头，每行一个，格式为 `Key: Value`
- 空行后是请求体（GET 请求通常没有请求体）

### **示例 2: POST 请求（带 JSON 请求体）**

```http
POST https://api.example.com/users HTTP/1.1
Content-Type: application/json
Authorization: Bearer your-token-here

{
  "name": "John Doe",
  "email": "john@example.com"
}
```

**说明：**
- 使用 `POST` 方法
- 设置 `Content-Type` 为 `application/json`
- 添加 `Authorization` 请求头
- 空行后是 JSON 格式的请求体

### **示例 3: 使用相对路径和 Host 头**

```http
GET /api/v1/users HTTP/1.1
Host: api.example.com
Accept: application/json
```

**说明：**
- 如果 URL 不是完整路径，可以使用相对路径 `/api/v1/users`
- 通过 `Host` 请求头指定服务器地址
- 工具会自动组合为 `http://api.example.com/api/v1/users`

### **示例 4: PUT 请求（更新资源）**

```http
PUT https://api.example.com/users/123 HTTP/1.1
Content-Type: application/json
Authorization: Bearer your-token-here

{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

### **示例 5: DELETE 请求**

```http
DELETE https://api.example.com/users/123 HTTP/1.1
Authorization: Bearer your-token-here
```

### **使用步骤**

1. **创建 HTTP 文件**
   - 切换到 HTTP 工具（`Cmd+4` 或点击侧边栏）
   - 创建新文件（`Cmd+N`）或打开现有文件

2. **编写请求**
   - 在编辑器中输入 HTTP 请求内容
   - 支持语法高亮和自动补全（输入 `GET`、`POST` 等会提示）

3. **发送请求**
   - 点击工具栏的"发送"按钮
   - 或使用快捷键（如果有配置）

4. **查看响应**
   - 响应会自动显示在右侧预览面板
   - 响应格式包括：
     - 状态行（HTTP/1.1 状态码 状态文本）
     - 响应头
     - 响应体
   - 支持语法高亮、代码折叠和右键复制

### **响应预览**

发送请求后，预览面板会显示格式化的响应：

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

### **支持的 HTTP 方法**

- `GET` - 获取资源
- `POST` - 创建资源
- `PUT` - 更新资源（完整替换）
- `PATCH` - 部分更新资源
- `DELETE` - 删除资源
- `HEAD` - 获取响应头（不返回响应体）
- `OPTIONS` - 获取服务器支持的请求方法
- `TRACE` - 回显服务器收到的请求
- `CONNECT` - 建立隧道连接

### **提示和技巧**

1. **自动补全**：输入 HTTP 方法或常用请求头时会自动提示
2. **语法高亮**：HTTP 方法、URL、请求头等都有不同的颜色标识
3. **代码折叠**：可以折叠请求体部分，方便查看
4. **右键复制**：在预览面板中右键可以复制响应内容
5. **错误处理**：如果请求失败，错误信息会显示在预览面板中
6. **超时设置**：请求超时时间为 30 秒
7. **响应大小限制**：响应体最大为 10MB，超过部分会被截断

---

## ⌨️ 键盘快捷键

| 快捷键 | 操作 |
|--------|------|
| `Cmd+1/2/3/4` | 切换工具（JSON/XML/Base64/HTTP） |
| `Cmd+Shift+F` | 打开全局搜索 |
| `Cmd+W` | 关闭当前标签页 |
| `Cmd+S` | 保存文件（触发自动保存检查） |
| `Cmd+B` | 切换文件资源管理器 |
| `Cmd+G` | 切换预览面板 |
| `Cmd+,` | 打开设置 |
| `Cmd+N` | 新建文件 |
| `Cmd+Shift+N` | 新建文件夹 |
| `Cmd+D` | 复制文件/文件夹 |
| `Cmd+X` | 剪切 |
| `Cmd+C` | 复制 |
| `Cmd+V` | 粘贴 |
| `Delete` | 删除文件/文件夹 |

---

## 🏗️ 项目结构

```
MacDevTools/
├── main.go                 # Wails 应用入口点，包含 macOS 配置
├── app.go                  # 业务逻辑（JSON、XML、Base64、HTTP 工具）
├── go.mod                  # Go 依赖
├── wails.json              # Wails 配置
└── frontend/
    ├── package.json        # Node 依赖
    ├── vite.config.js      # Vite 配置
    ├── tailwind.config.js  # TailwindCSS 配置
    ├── index.html          # HTML 入口点
    └── src/
        ├── main.jsx        # React 入口点
        ├── App.jsx         # 根组件
        ├── index.css       # 全局样式
        ├── store/
        │   └── useAppStore.js    # Zustand 状态管理
        ├── hooks/
        │   └── useMacShortcuts.js # macOS 键盘快捷键
        ├── components/
        │   ├── macOS/
        │   │   └── TitleBarSpacer.jsx  # 交通灯间距
        │   ├── Layout/
        │   │   └── Sidebar.jsx         # 工具选择器
        │   ├── Explorer/
        │   │   ├── FileExplorer.jsx    # 文件树
        │   │   └── ContextMenu.jsx     # 右键菜单
        │   ├── Editor/
        │   │   ├── MainContent.jsx     # 主容器
        │   │   ├── TabBar.jsx          # 文件标签页
        │   │   ├── Toolbar.jsx         # 操作按钮
        │   │   ├── Editor.jsx          # Monaco 编辑器
        │   │   └── Preview.jsx         # 预览面板（支持语法高亮、代码折叠、右键复制）
        │   └── Modals/
        │       ├── SettingsModal.jsx   # 设置对话框
        │       └── GlobalSearchModal.jsx # 搜索与替换
        └── wailsjs/
            └── go/main/App.js   # 自动生成的 Go 绑定
```

---

## 🎨 macOS 特定实现细节

### **1. 窗口配置 (`main.go:113-144`)**

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

### **2. 关闭按钮行为 (`main.go:123-127`)**

```go
OnBeforeClose: func(ctx context.Context) (prevent bool) {
    // 最小化窗口而不是关闭（隐藏到 Dock）
    runtime.WindowMinimise(ctx)
    return true // 阻止默认关闭行为
}
```

### **3. 交通灯间距 (`TitleBarSpacer.jsx:12-17`)**

```jsx
<div
  className="h-[38px] w-full draggable"
  style={{ WebkitAppRegion: 'drag' }}
/>
```

### **4. 背景模糊 (`Sidebar.jsx:38-42`)**

```jsx
<div
  className="backdrop-macos"
  style={{ background: 'var(--macos-sidebar)' }}
/>
```

### **5. 原生文件对话框 (`app.go:97-144`)**

```go
func (a *App) OpenFileDialog() (string, error) {
    file, err := runtime.OpenFileDialog(a.ctx, ...)
    // ...
}
```

### **6. 键盘快捷键 (`useMacShortcuts.js:18`)**

```js
const isMod = e.metaKey || e.ctrlKey  // metaKey = macOS 上的 Cmd
```

### **7. 预览面板 (`Preview.jsx`)**

- 使用 Monaco Editor 提供语法高亮
- 支持代码折叠
- 右键菜单支持复制内容
- 可拖拽调整宽度
- 无标题栏和关闭按钮，仅通过快捷键控制

---

## 🎯 主要功能说明

### **文件操作**
- **创建文件/文件夹**：右键点击资源管理器空白区域
- **重命名**：右键点击文件/文件夹，选择"重命名"，或使用快捷键
- **删除**：右键点击文件/文件夹，选择"删除"，或使用 Delete 键（带确认对话框）
- **复制/剪切/粘贴**：支持文件操作，使用系统剪贴板

### **编辑器功能**
- **语法高亮**：根据文件类型自动高亮
- **代码折叠**：支持折叠代码块
- **自动保存**：可在设置中启用
- **标签页管理**：支持多个文件同时打开
- **预览面板**：实时预览格式化后的内容

### **HTTP 工具**
- **语法高亮**：HTTP 方法、URL、请求头等都有颜色区分
- **代码折叠**：支持折叠请求体等部分
- **深色/浅色主题**：根据应用主题自动切换
- **右键复制**：支持复制选中内容或全部内容

---

## 🤝 贡献

欢迎贡献！请遵循以下步骤：

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m '添加一些 AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

---

## 📝 许可证

本项目采用 MIT 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

- [Wails](https://wails.io/) - 出色的 Go + Web 框架
- [React](https://react.dev/) - UI 库
- [TailwindCSS](https://tailwindcss.com/) - CSS 框架
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - 代码编辑器
- [Lucide](https://lucide.dev/) - 精美的图标

---

## 📧 联系方式

如有问题或反馈，请在 GitHub 上提交 issue。

**为 macOS 开发者社区用心打造 ❤️**

