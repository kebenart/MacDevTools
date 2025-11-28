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

  // HTTP responses cache (fileId -> HTTPResponse)
  httpResponses: {},

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
  autoSave: true,
  keepLongestJson: false, // JSON过滤时是否只保留最长的JSON
  
  // Editor settings
  editorFontSize: 13,
  editorFontFamily: 'Menlo, Monaco, Courier New, monospace',

  // Shortcuts
  shortcuts: defaultShortcuts,

  // Initialize: load file system from backend
  initialize: async () => {
    try {
      const storagePath = await App.GetStoragePath()
      set({ storagePath })

      // Load user settings from config file
      try {
        const settings = await App.GetUserSettings()
        if (settings) {
          const updates = {}
          if (settings.theme) updates.theme = settings.theme
          if (settings.language) updates.language = settings.language
          if (settings.autoSave !== undefined) updates.autoSave = settings.autoSave
          if (settings.editorFontSize) updates.editorFontSize = settings.editorFontSize
          if (settings.editorFontFamily) updates.editorFontFamily = settings.editorFontFamily
          if (settings.keepLongestJson !== undefined) updates.keepLongestJson = settings.keepLongestJson
          if (Object.keys(updates).length > 0) {
            set(updates)
          }
        }
      } catch (error) {
        console.error('Failed to load user settings:', error)
      }

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
    // 注意这里要解构出 fileSystem 以便获取旧状态
    const { currentTool, fileSystem } = get()
    try {
      const result = await App.ReadDirectory(currentTool)
      if (result.success) {
        const oldItems = fileSystem[currentTool] || []
        const newItems = result.data || []

        // --- 新增：递归合并状态函数 ---
        // 作用：如果新列表里的文件夹在旧列表里存在且是展开的，则保持展开
        const mergeItems = (oldList, newList) => {
          if (!newList) return []
          return newList.map(newItem => {
            if (newItem.type === 'folder') {
              // 根据 ID (相对路径) 查找旧状态
              const oldItem = oldList?.find(o => o.id === newItem.id)
              if (oldItem) {
                newItem.expanded = oldItem.expanded // 关键：恢复展开状态
                // 递归处理子文件夹
                if (newItem.children && oldItem.children) {
                  newItem.children = mergeItems(oldItem.children, newItem.children)
                }
              }
            }
            return newItem
          })
        }
        // ------------------------------

        const mergedItems = mergeItems(oldItems, newItems)

        set((state) => ({
          fileSystem: {
            ...state.fileSystem,
            [currentTool]: mergedItems, // 使用合并后的列表
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
          let content = result.data
          let response = null
          
          // For HTTP tool, try to parse JSON format with request and response
          if (tool === 'http') {
            try {
              const parsed = JSON.parse(result.data)
              if (parsed.request && parsed.response) {
                // This is a saved HTTP file with response
                content = parsed.request
                response = parsed.response
              }
            } catch {
              // Not JSON format, treat as plain text (old format or new request)
              content = result.data
            }
          }
          
          set((state) => ({
            fileContents: {
              ...state.fileContents,
              [fileId]: { content, dirty: false, path: file.path },
            },
            // Restore HTTP response if exists
            ...(response && {
              httpResponses: {
                ...state.httpResponses,
                [fileId]: response,
              },
            }),
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
      const newHttpResponses = { ...state.httpResponses }
      delete newHttpResponses[fileId]
      return { 
        openTabs: newTabs, 
        activeFileId: newActiveId, 
        fileContents: newContents,
        httpResponses: newHttpResponses,
      }
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

    set({ openTabs: [], activeFileId: null, fileContents: {}, httpResponses: {} })
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
    const { autoSave, fileContents, httpResponses, currentTool } = get()

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
      let contentToSave = content
      
      // For HTTP tool, save request and response together as JSON
      if (currentTool === 'http') {
        const response = httpResponses[fileId]
        if (response) {
          // Save as JSON format with both request and response
          const httpData = {
            request: content,
            response: response,
          }
          contentToSave = JSON.stringify(httpData, null, 2)
        }
      }
      
      App.SaveFileContent(fileContents[fileId].path, contentToSave)
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
      // 记录改名前的状态（如果是文件夹且已展开）
      const wasExpanded = item.type === 'folder' && item.expanded

      const result = await App.RenameItem(item.path, newName)
      if (result.success) {
        // 更新 Tab 信息 (保持不变)
        set((state) => ({
          openTabs: state.openTabs.map((tab) =>
            tab.id === item.id
              ? { ...tab, id: result.data.id, name: newName, path: result.data.path }
              : tab
          ),
          activeFileId: state.activeFileId === item.id ? result.data.id : state.activeFileId,
          fileContents: Object.fromEntries(
            Object.entries(state.fileContents).map(([key, value]) =>
              key === item.id ? [result.data.id, { ...value, path: result.data.path }] : [key, value]
            )
          ),
        }))
        
        // 刷新列表（此时会触发上面的 mergeItems，但因为文件夹改名了ID变了，mergeItems 无法自动恢复该文件夹状态）
        await get().refreshFileList()

        // --- 新增：如果是文件夹且之前是展开的，手动恢复展开 ---
        if (wasExpanded) {
           const { currentTool, fileSystem } = get()
           const newId = result.data.id
           
           // 辅助函数：找到新ID并设为展开
           const expandItem = (items) => {
               return items.map(i => {
                   if (i.id === newId) return { ...i, expanded: true }
                   if (i.children) return { ...i, children: expandItem(i.children) }
                   return i
               })
           }
           
           set(state => ({
               fileSystem: {
                   ...state.fileSystem,
                   [currentTool]: expandItem(state.fileSystem[currentTool])
               }
           }))
        }
        // ----------------------------------------------------

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

  // 展开/收起所有文件夹
  toggleAllFolders: (expand = null) => {
    const { fileSystem, currentTool } = get()

    const toggleAllInArray = (items) => {
      return items.map((item) => {
        if (item.type === 'folder') {
          const newExpanded = expand !== null ? expand : !item.expanded
          return {
            ...item,
            expanded: newExpanded,
            children: item.children ? toggleAllInArray(item.children) : item.children,
          }
        }
        if (item.children) {
          return { ...item, children: toggleAllInArray(item.children) }
        }
        return item
      })
    }

    set({
      fileSystem: {
        ...fileSystem,
        [currentTool]: toggleAllInArray(fileSystem[currentTool]),
      },
    })
  },

  saveFile: async (fileId, force = false) => {
    const { fileContents, httpResponses, currentTool } = get()
    const fileData = fileContents[fileId]

    if (!fileData) return
    
    // For HTTP tool, always save if there's a response (even if not dirty)
    // For other tools, only save if dirty (unless forced)
    const shouldSave = force || fileData.dirty || (currentTool === 'http' && httpResponses[fileId])
    
    if (!shouldSave) return

    try {
      let contentToSave = fileData.content
      
      // For HTTP tool, save request and response together as JSON
      if (currentTool === 'http') {
        const response = httpResponses[fileId]
        if (response) {
          // Save as JSON format with both request and response
          const httpData = {
            request: fileData.content,
            response: response,
          }
          contentToSave = JSON.stringify(httpData, null, 2)
        }
      }
      
      const result = await App.SaveFileContent(fileData.path, contentToSave)
      if (result.success) {
        set((state) => ({
          fileContents: {
            ...state.fileContents,
            [fileId]: { ...state.fileContents[fileId], dirty: false },
          },
        }))
        // Only show toast if not auto-saving (force flag indicates auto-save)
        if (!force) {
          get().showToast('文件已保存', 'success')
        }
      } else {
        if (!force) {
          get().showToast(result.error, 'error')
        }
      }
    } catch (error) {
      if (!force) {
        get().showToast('保存失败', 'error')
      }
    }
  },

  saveAllFiles: async () => {
    const { fileContents, httpResponses, openTabs } = get()
    let savedCount = 0

    for (const [fileId, fileData] of Object.entries(fileContents)) {
      if (fileData.dirty) {
        try {
          // Determine tool type from openTabs
          const tab = openTabs.find(t => t.id === fileId)
          const toolType = tab?.toolType || get().currentTool
          
          let contentToSave = fileData.content
          
          // For HTTP tool, save request and response together as JSON
          if (toolType === 'http') {
            const response = httpResponses[fileId]
            if (response) {
              // Save as JSON format with both request and response
              const httpData = {
                request: fileData.content,
                response: response,
              }
              contentToSave = JSON.stringify(httpData, null, 2)
            }
          }
          
          const result = await App.SaveFileContent(fileData.path, contentToSave)
          if (result.success) {
            savedCount++
            // Mark as not dirty
            set((state) => ({
              fileContents: {
                ...state.fileContents,
                [fileId]: { ...state.fileContents[fileId], dirty: false },
              },
            }))
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

  // HTTP response actions
  setHTTPResponse: (fileId, response) => {
    set((state) => ({
      httpResponses: {
        ...state.httpResponses,
        [fileId]: response,
      },
    }))
  },
  getHTTPResponse: (fileId) => {
    return get().httpResponses[fileId] || null
  },

  // Theme
  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark'
    set({ theme: newTheme })
    // Auto-save theme setting
    App.SaveUserSettings({ theme: newTheme }).catch(err => console.error('Failed to save theme:', err))
  },

  // Settings
  toggleAutoSave: () => {
    const newAutoSave = !get().autoSave
    set({ autoSave: newAutoSave })
    // Auto-save autoSave setting
    App.SaveUserSettings({ autoSave: newAutoSave }).catch(err => console.error('Failed to save autoSave:', err))
  },
  setLanguage: (language) => {
    set({ language })
    // Auto-save language setting
    App.SaveUserSettings({ language }).catch(err => console.error('Failed to save language:', err))
  },
  setEditorFontSize: (size) => {
    set({ editorFontSize: size })
    // Auto-save font size setting
    App.SaveUserSettings({ editorFontSize: size }).catch(err => console.error('Failed to save font size:', err))
  },
  setEditorFontFamily: (family) => {
    set({ editorFontFamily: family })
    // Auto-save font family setting
    App.SaveUserSettings({ editorFontFamily: family }).catch(err => console.error('Failed to save font family:', err))
  },
  setKeepLongestJson: (keep) => {
    set({ keepLongestJson: keep })
    // Auto-save keepLongestJson setting
    App.SaveUserSettings({ keepLongestJson: keep }).catch(err => console.error('Failed to save keepLongestJson:', err))
  },

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
    const { theme, language, autoSave, editorFontSize, editorFontFamily, keepLongestJson, shortcuts } = get()
    return JSON.stringify(
      {
        settings: { theme, language, autoSave, editorFontSize, editorFontFamily, keepLongestJson },
        shortcuts,
      },
      null,
      2
    )
  },

  importBackup: (data) => {
    try {
      const imported = JSON.parse(data)
      let newSettings = { 
        theme: 'dark', 
        language: 'zh', 
        autoSave: true,
        editorFontSize: 13,
        editorFontFamily: 'Menlo, Monaco, Courier New, monospace',
        keepLongestJson: false,
      }
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
