package main

import (
	"context"
	"embed"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/menu/keys"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Create an instance of the app structure
	app := NewApp()
	
	// Flag to track if we should quit (not minimize)
	var shouldQuit bool

	// Create application menu (macOS native)
	appMenu := menu.NewMenu()

	// 文件菜单
	fileMenu := appMenu.AddSubmenu("文件")
	fileMenu.AddText("新建文件", keys.CmdOrCtrl("n"), func(_ *menu.CallbackData) {
		runtime.EventsEmit(app.ctx, "menu:new-file")
	})
	fileMenu.AddText("新建文件夹", keys.CmdOrCtrl("shift+n"), func(_ *menu.CallbackData) {
		runtime.EventsEmit(app.ctx, "menu:new-folder")
	})
	fileMenu.AddSeparator()
	fileMenu.AddText("保存", keys.CmdOrCtrl("s"), func(_ *menu.CallbackData) {
		runtime.EventsEmit(app.ctx, "menu:save")
	})
	fileMenu.AddText("保存全部", keys.CmdOrCtrl("shift+s"), func(_ *menu.CallbackData) {
		runtime.EventsEmit(app.ctx, "menu:save-all")
	})
	fileMenu.AddSeparator()
	fileMenu.AddText("关闭标签", keys.CmdOrCtrl("w"), func(_ *menu.CallbackData) {
		runtime.EventsEmit(app.ctx, "menu:close-tab")
	})
	fileMenu.AddSeparator()
	fileMenu.AddText("退出", keys.CmdOrCtrl("q"), func(_ *menu.CallbackData) {
		shouldQuit = true
		runtime.Quit(app.ctx)
	})

	// 编辑菜单 - [修复关键] 手动发射事件，而不是让系统默认处理
	editMenu := appMenu.AddSubmenu("编辑")
	editMenu.AddText("撤销", keys.CmdOrCtrl("z"), func(_ *menu.CallbackData) {
		runtime.EventsEmit(app.ctx, "menu:undo")
	})
	editMenu.AddText("重做", keys.CmdOrCtrl("shift+z"), func(_ *menu.CallbackData) {
		runtime.EventsEmit(app.ctx, "menu:redo")
	})
	editMenu.AddSeparator()
	editMenu.AddText("剪切", keys.CmdOrCtrl("x"), func(_ *menu.CallbackData) {
		runtime.EventsEmit(app.ctx, "menu:cut")
	})
	editMenu.AddText("复制", keys.CmdOrCtrl("c"), func(_ *menu.CallbackData) {
		runtime.EventsEmit(app.ctx, "menu:copy")
	})
	editMenu.AddText("粘贴", keys.CmdOrCtrl("v"), func(_ *menu.CallbackData) {
		runtime.EventsEmit(app.ctx, "menu:paste")
	})
	editMenu.AddText("全选", keys.CmdOrCtrl("a"), func(_ *menu.CallbackData) {
		runtime.EventsEmit(app.ctx, "menu:select-all")
	})
	editMenu.AddSeparator()
	editMenu.AddText("查找", keys.CmdOrCtrl("f"), func(_ *menu.CallbackData) {
		runtime.EventsEmit(app.ctx, "menu:find")
	})
	editMenu.AddText("全局搜索", keys.CmdOrCtrl("shift+f"), func(_ *menu.CallbackData) {
		runtime.EventsEmit(app.ctx, "menu:global-search")
	})

	// 视图菜单
	viewMenu := appMenu.AddSubmenu("视图")
	viewMenu.AddText("切换预览", keys.CmdOrCtrl("g"), func(_ *menu.CallbackData) {
		runtime.EventsEmit(app.ctx, "menu:toggle-preview")
	})
	viewMenu.AddText("切换资源管理器", keys.CmdOrCtrl("b"), func(_ *menu.CallbackData) {
		runtime.EventsEmit(app.ctx, "menu:toggle-explorer")
	})

	// 工具菜单
	toolsMenu := appMenu.AddSubmenu("工具")
	toolsMenu.AddText("JSON 工具", keys.CmdOrCtrl("1"), func(_ *menu.CallbackData) {
		runtime.EventsEmit(app.ctx, "menu:switch-tool", "json")
	})
	toolsMenu.AddText("XML 工具", keys.CmdOrCtrl("2"), func(_ *menu.CallbackData) {
		runtime.EventsEmit(app.ctx, "menu:switch-tool", "xml")
	})
	toolsMenu.AddText("Base64 工具", keys.CmdOrCtrl("3"), func(_ *menu.CallbackData) {
		runtime.EventsEmit(app.ctx, "menu:switch-tool", "base64")
	})
	toolsMenu.AddText("HTTP 工具", keys.CmdOrCtrl("4"), func(_ *menu.CallbackData) {
		runtime.EventsEmit(app.ctx, "menu:switch-tool", "http")
	})

	// 窗口菜单
	windowMenu := appMenu.AddSubmenu("窗口")
	windowMenu.AddText("最小化", keys.CmdOrCtrl("m"), func(_ *menu.CallbackData) {
		runtime.WindowMinimise(app.ctx)
	})
	windowMenu.AddText("缩放", nil, func(_ *menu.CallbackData) {
		runtime.WindowToggleMaximise(app.ctx)
	})
	windowMenu.AddSeparator()
	windowMenu.AddText("设置", keys.CmdOrCtrl(","), func(_ *menu.CallbackData) {
		runtime.EventsEmit(app.ctx, "menu:settings")
	})

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "MacDevTools",
		Width:  1200,
		Height: 800,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 30, G: 30, B: 30, A: 255},
		OnStartup:        app.startup,
		OnBeforeClose: func(ctx context.Context) (prevent bool) {
			// If shouldQuit is true, allow the app to quit
			if shouldQuit {
				return false // Allow default close behavior (quit)
			}
			// Otherwise, minimize window instead of closing (hide to dock)
			runtime.WindowMinimise(ctx)
			return true // Prevent default close behavior
		},
		Menu: appMenu,
		Bind: []interface{}{
			app,
		},

		// ======== macOS Native Configuration ========
		Mac: &mac.Options{
			TitleBar:             mac.TitleBarHiddenInset(),
			WindowIsTranslucent:  true,
			WebviewIsTransparent: true,
			About: &mac.AboutInfo{
				Title:   "MacDevTools",
				Message: "A high-performance developer toolkit built with Wails and React.\n\nVersion: 1.0.0\nAuthor: Keben\nLicense: MIT",
				Icon:    nil,
			},
			Appearance: mac.NSAppearanceNameDarkAqua,
		},
	})

	if err != nil {
		log.Fatal("Error:", err.Error())
	}
}
