import { create } from 'zustand'
import { defaultShortcuts, translations } from '../constants/translations'
import * as App from '../wailsjs/go/main/App'

const initialFileSystem = {
  json: [],
  xml: [],
  base64: [],
  http: [],
}

export const useAppStore = create((set, get) => ({
  // Current tool (json, xml, base64, http)
  currentTool: 'json',

  // File system
  fileSystem: initialFileSystem,

  // File content cache (id -> content)
  fileContents: {},

  // Active file ID
  activeFileId: null,

  // Open tabs (array of file IDs with path info)
  openTabs: [],

  // Storage path
  storagePath: '',

  // Clipboard for copy/paste
  clipboard: null, // { item: FileItem, operation: 'copy' | 'cut' }

  // Selected item in explorer (for keyboard shortcuts)
  selectedItem: null,

  // Rename mode trigger (set to item id to trigger rename)
  renamingItemId: null,

  // Current editor reference
  editorRef: null,

  // UI state
  isPreviewVisible: true,
  isExplorerVisible: true,
  isSettingsOpen: false,
  isGlobalSearchOpen: false,
  previewWidth: 400, // Preview panel width in pixels

  // Toast notifications
  toast: null,

  // Loading state
  isLoading: false,

  // Theme
  theme: 'dark',
  language: 'zh',

  // Settings
  autoSave: false,

  // Shortcuts
  shortcuts: defaultShortcuts,

  // Initialize: load file system from backend
  initialize: async () => {
    try {
      const storagePath = await App.GetStoragePath()
      set({ storagePath })

      // Load all tool directories
      const tools = ['json', 'xml', 'base64', 'http']
      const newFileSystem = {}

      for (const tool of tools) {
        const result = await App.ReadDirectory(tool)
        if (result.success) {
          newFileSystem[tool] = result.data || []
        } else {
          newFileSystem[tool] = []
        }
      }

      set({ fileSystem: newFileSystem })
    } catch (error) {
      console.error('Failed to initialize:', error)
    }
  },

  // Refresh current tool's file list
  refreshFileList: async () => {
    const { currentTool } = get()
    try {
      const result = await App.ReadDirectory(currentTool)
      if (result.success) {
        set((state) => ({
          fileSystem: {
            ...state.fileSystem,
            [currentTool]: result.data || [],
          },
        }))
      }
    } catch (error) {
      console.error('Failed to refresh file list:', error)
    }
  },

  // Actions
  setCurrentTool: (tool) => {
    set({ currentTool: tool })
    // Refresh file list when switching tools
    get().refreshFileList()
  },

  setActiveFileId: (id) => set({ activeFileId: id }),

  // File operations
  findItemById: (items, id) => {
    for (const item of items) {
      if (item.id === id) return item
      if (item.children) {
        const found = get().findItemById(item.children, id)
        if (found) return found
      }
    }
    return null
  },

  // Helper to determine tool from file path
  getToolFromPath: (path) => {
    const { storagePath } = get()
    if (!path || !storagePath) return null
    
    // Extract relative path from storage path
    const relPath = path.replace(storagePath + '/', '').split('/')[0]
    const tools = ['json', 'xml', 'base64', 'http']
    return tools.includes(relPath) ? relPath : null
  },

  openFile: async (fileId, tool) => {
    const { currentTool, fileSystem, openTabs, fileContents, storagePath } = get()

    // If tool is not provided, try to determine from tab's path
    if (!tool) {
      const tab = openTabs.find(t => t.id === fileId)
      if (tab && tab.path) {
        // Extract tool from path (e.g., /path/to/storage/json/file.json -> json)
        const relPath = tab.path.replace(storagePath + '/', '').split('/')[0]
        const tools = ['json', 'xml', 'base64', 'http']
        tool = tools.includes(relPath) ? relPath : currentTool
      } else {
        tool = currentTool
      }
    }

    // Switch tool if needed
    if (tool !== currentTool) {
      set({ currentTool: tool })
    }

    // Find file in the correct tool's file system
    let file = get().findItemById(fileSystem[tool], fileId)
    
    // If not found in current tool, search in all tools
    if (!file) {
      const tools = ['json', 'xml', 'base64', 'http']
      for (const t of tools) {
        file = get().findItemById(fileSystem[t], fileId)
        if (file) {
          tool = t
          if (tool !== currentTool) {
            set({ currentTool: tool })
          }
          break
        }
      }
    }
    
    if (!file || file.type !== 'file') return

    // Load content if not cached
    if (!fileContents[fileId]) {
      try {
        const result = await App.ReadFileContent(file.path)
        if (result.success) {
          set((state) => ({
            fileContents: {
              ...state.fileContents,
              [fileId]: { content: result.data, dirty: false, path: file.path },
            },
          }))
        }
      } catch (error) {
        console.error('Failed to read file:', error)
        return
      }
    }

    // Add to tabs if not already open
    if (!openTabs.some((tab) => tab.id === fileId)) {
      set({ openTabs: [...openTabs, { id: fileId, name: file.name, path: file.path }] })
    }

    // Set as active
    set({ activeFileId: fileId })
  },

  // Helper function to check unsaved files
  checkUnsavedFiles: async (fileIds) => {
    const dirtyFiles = []
    for (const fileId of fileIds) {
      if (get().isFileDirty(fileId)) {
        const file = get().findItemById(get().fileSystem[get().currentTool], fileId)
        const fileName = file ? file.name : '未知文件'
        dirtyFiles.push({ id: fileId, name: fileName })
      }
    }

    if (dirtyFiles.length === 0) {
      return { shouldContinue: true, filesToSave: [] }
    }

    if (dirtyFiles.length === 1) {
      const userChoice = await App.ShowUnsavedChangesDialog(dirtyFiles[0].name)
      switch (userChoice) {
        case '保存':
          return { shouldContinue: true, filesToSave: [dirtyFiles[0].id] }
        case '不保存':
          return { shouldContinue: true, filesToSave: [] }
        case '取消':
          return { shouldContinue: false, filesToSave: [] }
        default:
          return { shouldContinue: false, filesToSave: [] }
      }
    } else {
      // For multiple files, ask once and apply to all
      const userChoice = await App.ShowUnsavedChangesDialog(`${dirtyFiles.length} 个未保存的文件`)
      switch (userChoice) {
        case '保存':
          return { shouldContinue: true, filesToSave: dirtyFiles.map(f => f.id) }
        case '不保存':
          return { shouldContinue: true, filesToSave: [] }
        case '取消':
          return { shouldContinue: false, filesToSave: [] }
        default:
          return { shouldContinue: false, filesToSave: [] }
      }
    }
  },

  closeTab: async (fileId) => {
    const result = await get().checkUnsavedFiles([fileId])
    if (!result.shouldContinue) {
      return
    }

    if (result.filesToSave.length > 0) {
      await get().saveFile(fileId)
    }

    set((state) => {
      const newTabs = state.openTabs.filter((tab) => tab.id !== fileId)
      let newActiveId = state.activeFileId
      if (state.activeFileId === fileId) {
        newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null
      }

      const newContents = { ...state.fileContents }
      delete newContents[fileId]
      return { openTabs: newTabs, activeFileId: newActiveId, fileContents: newContents }
    })
  },

  // 关闭所有标签页
  closeAllTabs: async () => {
    const { openTabs } = get()
    const tabIds = openTabs.map(tab => tab.id)
    
    const result = await get().checkUnsavedFiles(tabIds)
    if (!result.shouldContinue) {
      return
    }

    // Save files that need to be saved
    for (const fileId of result.filesToSave) {
      await get().saveFile(fileId)
    }

    set({ openTabs: [], activeFileId: null, fileContents: {} })
  },

  // 关闭其他标签页
  closeOtherTabs: async (fileId) => {
    const { openTabs, fileContents } = get()
    const tab = openTabs.find((t) => t.id === fileId)
    if (!tab) return

    const otherTabIds = openTabs.filter(t => t.id !== fileId).map(t => t.id)
    const result = await get().checkUnsavedFiles(otherTabIds)
    if (!result.shouldContinue) {
      return
    }

    // Save files that need to be saved
    for (const fileId of result.filesToSave) {
      await get().saveFile(fileId)
    }

    const newContents = { [fileId]: fileContents[fileId] }
    set({ openTabs: [tab], activeFileId: fileId, fileContents: newContents })
  },

  // 关闭左侧标签页
  closeLeftTabs: async (fileId) => {
    const { openTabs, activeFileId, fileContents } = get()
    const index = openTabs.findIndex((t) => t.id === fileId)
    if (index <= 0) return

    const leftTabIds = openTabs.slice(0, index).map(t => t.id)
    const result = await get().checkUnsavedFiles(leftTabIds)
    if (!result.shouldContinue) {
      return
    }

    // Save files that need to be saved
    for (const fileId of result.filesToSave) {
      await get().saveFile(fileId)
    }

    const newTabs = openTabs.slice(index)
    const newContents = {}
    newTabs.forEach((tab) => {
      if (fileContents[tab.id]) {
        newContents[tab.id] = fileContents[tab.id]
      }
    })

    let newActiveId = activeFileId
    if (!newTabs.some((t) => t.id === activeFileId)) {
      newActiveId = newTabs.length > 0 ? newTabs[0].id : null
    }

    set({ openTabs: newTabs, activeFileId: newActiveId, fileContents: newContents })
  },

  // 关闭右侧标签页
  closeRightTabs: async (fileId) => {
    const { openTabs, activeFileId, fileContents } = get()
    const index = openTabs.findIndex((t) => t.id === fileId)
    if (index < 0 || index >= openTabs.length - 1) return

    const rightTabIds = openTabs.slice(index + 1).map(t => t.id)
    const result = await get().checkUnsavedFiles(rightTabIds)
    if (!result.shouldContinue) {
      return
    }

    // Save files that need to be saved
    for (const fileId of result.filesToSave) {
      await get().saveFile(fileId)
    }

    const newTabs = openTabs.slice(0, index + 1)
    const newContents = {}
    newTabs.forEach((tab) => {
      if (fileContents[tab.id]) {
        newContents[tab.id] = fileContents[tab.id]
      }
    })

    let newActiveId = activeFileId
    if (!newTabs.some((t) => t.id === activeFileId)) {
      newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null
    }

    set({ openTabs: newTabs, activeFileId: newActiveId, fileContents: newContents })
  },

  // Get file content
  getFileContent: (fileId) => {
    const { fileContents } = get()
    return fileContents[fileId]?.content || ''
  },

  // Check if file is dirty
  isFileDirty: (fileId) => {
    const { fileContents } = get()
    return fileContents[fileId]?.dirty || false
  },

  updateFileContent: (fileId, content) => {
    const { autoSave, fileContents } = get()

    set((state) => ({
      fileContents: {
        ...state.fileContents,
        [fileId]: {
          ...state.fileContents[fileId],
          content,
          dirty: !autoSave,
        },
      },
    }))

    // Auto save if enabled
    if (autoSave && fileContents[fileId]?.path) {
      App.SaveFileContent(fileContents[fileId].path, content)
    }
  },

  createFile: async (parentPath, tool) => {
    const extensions = {
      json: '.json',
      xml: '.xml',
      base64: '.base',
      http: '.http',
    }

    const fileName = `untitled${extensions[tool]}`

    try {
      const result = await App.CreateFile(tool, parentPath || '', fileName)
      if (result.success) {
        await get().refreshFileList()
        // Open the new file
        get().openFile(result.data.id, tool)
      } else {
        get().showToast(result.error, 'error')
      }
    } catch (error) {
      get().showToast('创建文件失败', 'error')
    }
  },

  createFolder: async (parentPath, name = 'NewFolder') => {
    const { currentTool } = get()

    try {
      const result = await App.CreateFolder(currentTool, parentPath || '', name)
      if (result.success) {
        await get().refreshFileList()
      } else {
        get().showToast(result.error, 'error')
      }
    } catch (error) {
      get().showToast('创建文件夹失败', 'error')
    }
  },

  deleteItem: async (item) => {
    console.log('Deleting item:', item)
    console.log('Item path:', item.path)
    console.log('Item type:', item.type)
    console.log('Item name:', item.name)
    
    if (!item || !item.path) {
      console.error('Delete failed: Invalid item or missing path', item)
      get().showToast('删除失败: 无效的项目或缺少路径', 'error')
      return
    }
    
    try {
      const result = await App.DeleteItem(item.path)
      console.log('Delete result:', result)
      
      if (result.success) {
        if (get().openTabs.some((tab) => tab.id === item.id)) {
          await get().closeTab(item.id)
        }
        await get().refreshFileList()
        get().showToast('删除成功', 'success')
      } else {
        console.error('Delete failed:', result.error)
        get().showToast(result.error || '删除失败', 'error')
      }
    } catch (error) {
      console.error('Delete error:', error)
      get().showToast(`删除失败: ${error.message || error}`, 'error')
    }
  },

  renameItem: async (item, newName) => {
    try {
      const result = await App.RenameItem(item.path, newName)
      if (result.success) {
        // Update tab name if open
        set((state) => ({
          openTabs: state.openTabs.map((tab) =>
            tab.id === item.id
              ? { ...tab, id: result.data.id, name: newName, path: result.data.path }
              : tab
          ),
          // Update active file id if it was renamed
          activeFileId: state.activeFileId === item.id ? result.data.id : state.activeFileId,
          // Update file contents cache
          fileContents: Object.fromEntries(
            Object.entries(state.fileContents).map(([key, value]) =>
              key === item.id ? [result.data.id, { ...value, path: result.data.path }] : [key, value]
            )
          ),
        }))
        await get().refreshFileList()
        get().showToast('重命名成功', 'success')
      } else {
        get().showToast(result.error, 'error')
      }
    } catch (error) {
      get().showToast('重命名失败', 'error')
    }
  },

  toggleFolder: (folderId) => {
    const { fileSystem, currentTool } = get()

    const toggleInArray = (items) => {
      return items.map((item) => {
        if (item.id === folderId && item.type === 'folder') {
          return { ...item, expanded: !item.expanded }
        }
        if (item.children) {
          return { ...item, children: toggleInArray(item.children) }
        }
        return item
      })
    }

    set({
      fileSystem: {
        ...fileSystem,
        [currentTool]: toggleInArray(fileSystem[currentTool]),
      },
    })
  },

  saveFile: async (fileId) => {
    const { fileContents } = get()
    const fileData = fileContents[fileId]

    if (!fileData || !fileData.dirty) return

    try {
      const result = await App.SaveFileContent(fileData.path, fileData.content)
      if (result.success) {
        set((state) => ({
          fileContents: {
            ...state.fileContents,
            [fileId]: { ...state.fileContents[fileId], dirty: false },
          },
        }))
        get().showToast('文件已保存', 'success')
      } else {
        get().showToast(result.error, 'error')
      }
    } catch (error) {
      get().showToast('保存失败', 'error')
    }
  },

  saveAllFiles: async () => {
    const { fileContents } = get()
    let savedCount = 0

    for (const [fileId, fileData] of Object.entries(fileContents)) {
      if (fileData.dirty) {
        try {
          const result = await App.SaveFileContent(fileData.path, fileData.content)
          if (result.success) {
            savedCount++
          }
        } catch (error) {
          console.error('Failed to save file:', error)
        }
      }
    }

    if (savedCount > 0) {
      // Mark all as not dirty
      set((state) => ({
        fileContents: Object.fromEntries(
          Object.entries(state.fileContents).map(([key, value]) => [key, { ...value, dirty: false }])
        ),
      }))
      get().showToast(`已保存 ${savedCount} 个文件`, 'success')
    }
  },

  // Open in Finder
  openInFinder: async (item) => {
    try {
      const result = await App.OpenInFinder(item.path)
      if (!result.success) {
        get().showToast(result.error, 'error')
      }
    } catch (error) {
      get().showToast('打开 Finder 失败', 'error')
    }
  },

  // Open storage folder in Finder
  openStorageInFinder: async () => {
    try {
      const result = await App.OpenStorageInFinder()
      if (!result.success) {
        get().showToast(result.error, 'error')
      }
    } catch (error) {
      get().showToast('打开 Finder 失败', 'error')
    }
  },

  // Copy item to clipboard
  copyItem: (item) => {
    set({ clipboard: { item, operation: 'copy' } })
    get().showToast('已复制', 'info')
  },

  // Cut item to clipboard
  cutItem: (item) => {
    set({ clipboard: { item, operation: 'cut' } })
    get().showToast('已剪切', 'info')
  },

  // Paste item from clipboard
  pasteItem: async (targetPath) => {
    const { clipboard, currentTool } = get()
    if (!clipboard) {
      get().showToast('剪贴板为空', 'error')
      return
    }

    try {
      let result
      if (clipboard.operation === 'cut') {
        // Move operation
        result = await App.MoveItem(clipboard.item.path, targetPath || '')
        if (result.success) {
          set({ clipboard: null })
          get().showToast('移动成功', 'success')
        }
      } else {
        // Copy operation
        result = await App.CopyItem(clipboard.item.path, clipboard.item.path)
        if (result.success) {
          get().showToast('粘贴成功', 'success')
        }
      }

      if (!result.success) {
        get().showToast(result.error, 'error')
      } else {
        await get().refreshFileList()
      }
    } catch (error) {
      get().showToast('操作失败', 'error')
    }
  },

  // Duplicate item (create copy in same directory)
  duplicateItem: async (item) => {
    try {
      const result = await App.DuplicateItem(item.path)
      if (result.success) {
        await get().refreshFileList()
        get().showToast('复制成功', 'success')
      } else {
        get().showToast(result.error, 'error')
      }
    } catch (error) {
      get().showToast('复制失败', 'error')
    }
  },

  // Clear clipboard
  clearClipboard: () => {
    set({ clipboard: null })
  },

  // Selected item actions
  setSelectedItem: (item) => set({ selectedItem: item }),
  clearSelectedItem: () => set({ selectedItem: null }),

  // Rename mode actions
  triggerRename: (itemId) => set({ renamingItemId: itemId }),
  clearRenaming: () => set({ renamingItemId: null }),

  // Set storage path
  setStoragePath: async (newPath) => {
    try {
      const result = await App.SetStoragePath(newPath)
      if (result.success) {
        set({ storagePath: newPath })
        await get().initialize()
        get().showToast('存储路径已更新', 'success')
      } else {
        get().showToast(result.error, 'error')
      }
    } catch (error) {
      get().showToast('设置存储路径失败', 'error')
    }
  },

  // Select storage directory
  selectStorageDirectory: async () => {
    try {
      const dir = await App.SelectStorageDirectory()
      if (dir) {
        await get().setStoragePath(dir)
      }
    } catch (error) {
      console.error('Failed to select directory:', error)
    }
  },

  // UI actions
  togglePreview: () => set((state) => ({ isPreviewVisible: !state.isPreviewVisible })),
  toggleExplorer: () => set((state) => ({ isExplorerVisible: !state.isExplorerVisible })),
  setPreviewWidth: (width) => set({ previewWidth: width }),
  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
  openGlobalSearch: () => set({ isGlobalSearchOpen: true }),
  closeGlobalSearch: () => set({ isGlobalSearchOpen: false }),

  // Toast actions
  showToast: (message, type = 'info') => {
    set({ toast: { message, type } })
    setTimeout(() => {
      set({ toast: null })
    }, 4000)
  },
  hideToast: () => set({ toast: null }),

  // Loading actions
  setLoading: (loading) => set({ isLoading: loading }),

  // Theme
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

  // Settings
  toggleAutoSave: () => set((state) => ({ autoSave: !state.autoSave })),
  setLanguage: (language) => set({ language }),

  // Shortcuts
  updateShortcut: (action, shortcut) =>
    set((state) => ({
      shortcuts: { ...state.shortcuts, [action]: shortcut },
    })),
  resetShortcuts: () => set({ shortcuts: defaultShortcuts }),

  // Editor reference
  setEditorRef: (editorRef) => set({ editorRef }),

  // Translation helper
  t: (key) => {
    const { language } = get()
    const keys = key.split('.')
    let value = translations[language]
    for (const k of keys) {
      if (value && value[k]) {
        value = value[k]
      } else {
        value = translations.en
        for (const k of keys) {
          if (value && value[k]) {
            value = value[k]
          } else {
            return key
          }
        }
        break
      }
    }
    return value || key
  },

  // Format active file
  formatActiveFile: async () => {
    const { activeFileId, getFileContent, updateFileContent, showToast, t, setLoading, currentTool } = get()
    if (!activeFileId) return

    setLoading(true)
    const content = getFileContent(activeFileId)
    let result

    try {
      switch (currentTool) {
        case 'json':
          result = await App.FormatJSON(content)
          if (result.error) {
            showToast(result.error, 'error')
          } else {
            updateFileContent(activeFileId, result.result)
            showToast(t('messages.success.jsonFormatted'), 'success')
          }
          break
        case 'xml':
          result = await App.FormatXML(content)
          if (result.error) {
            showToast(result.error, 'error')
          } else {
            updateFileContent(activeFileId, result.result)
            showToast(t('messages.success.xmlFormatted'), 'success')
          }
          break
        // Add other formatters here if needed
      }
    } finally {
      setLoading(false)
    }
  },

  // Backup/Restore (exports current memory state for backup)
  exportBackup: () => {
    const { theme, language, autoSave, shortcuts } = get()
    return JSON.stringify(
      {
        settings: { theme, language, autoSave },
        shortcuts,
      },
      null,
      2
    )
  },

  importBackup: (data) => {
    try {
      const imported = JSON.parse(data)
      let newSettings = { theme: 'dark', language: 'zh', autoSave: false }
      let newShortcuts = defaultShortcuts

      if (imported.settings) {
        newSettings = { ...newSettings, ...imported.settings }
      }
      if (imported.shortcuts) {
        newShortcuts = imported.shortcuts
      }

      set({
        ...newSettings,
        shortcuts: newShortcuts,
      })

      return true
    } catch {
      return false
    }
  },
}))
