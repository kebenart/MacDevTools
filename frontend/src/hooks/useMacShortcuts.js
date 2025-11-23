import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { EventsOn } from '../wailsjs/runtime/runtime'
import { shortcutActions } from '../constants/translations'

/**
 * Custom hook for handling macOS keyboard shortcuts
 * IMPORTANT: Uses metaKey (Cmd) instead of ctrlKey
 * Uses configurable shortcuts from store
 */
export const useMacShortcuts = () => {
  const {
    openGlobalSearch,
    closeTab,
    activeFileId,
    togglePreview,
    toggleExplorer,
    setCurrentTool,
    openSettings,
    shortcuts,
    saveFile,
    saveAllFiles,
    // 文件操作
    selectedItem,
    copyItem,
    cutItem,
    pasteItem,
    duplicateItem,
    deleteItem,
    triggerRename,
    clipboard,
    storagePath,
    currentTool,
    createFile,
    createFolder,
    t,
  } = useAppStore()

  // 检查是否在编辑器或输入框中
  const isInEditorOrInput = () => {
    const activeElement = document.activeElement
    if (!activeElement) return false

    // 检查是否是输入元素
    const tagName = activeElement.tagName.toLowerCase()
    if (tagName === 'input' || tagName === 'textarea') return true
    if (activeElement.isContentEditable) return true

    // 检查是否在 Monaco 编辑器中（多种检测方式）
    if (activeElement.closest('.monaco-editor')) return true
    if (activeElement.classList.contains('monaco-mouse-cursor-text')) return true
    if (activeElement.closest('[data-keybinding-context]')) return true

    // 检查父元素是否包含 monaco-editor
    let parent = activeElement.parentElement
    while (parent) {
      if (parent.classList && parent.classList.contains('monaco-editor')) return true
      parent = parent.parentElement
    }

    return false
  }

  // 检查快捷键是否匹配
  const checkShortcut = (e, shortcut) => {
    if (!shortcut) return false

    const { key, modifiers = [] } = shortcut
    const pressedModifiers = []

    if (e.metaKey) pressedModifiers.push('meta')
    if (e.ctrlKey) pressedModifiers.push('ctrl')
    if (e.altKey) pressedModifiers.push('alt')
    if (e.shiftKey) pressedModifiers.push('shift')

    // 特殊按键处理（不区分大小写）
    const normalizeKey = (k) => {
      const keyMap = {
        'backspace': 'Backspace',
        'delete': 'Backspace',
        'enter': 'Enter',
        'escape': 'Escape',
        'tab': 'Tab',
        'arrowup': 'ArrowUp',
        'arrowdown': 'ArrowDown',
        'arrowleft': 'ArrowLeft',
        'arrowright': 'ArrowRight',
      }
      const lower = k.toLowerCase()
      return keyMap[lower] || lower
    }

    // 检查按键和修饰符是否匹配
    const keyMatches = normalizeKey(key) === normalizeKey(e.key)
    const modifiersMatch =
      modifiers.length === pressedModifiers.length &&
      modifiers.every(mod => pressedModifiers.includes(mod))

    return keyMatches && modifiersMatch
  }

  // 执行快捷键对应的动作
  const executeAction = (action) => {
    switch (action) {
      case 'globalSearch':
        openGlobalSearch()
        break
      case 'closeTab':
        if (activeFileId) {
          closeTab(activeFileId)
        }
        break
      case 'togglePreview':
        togglePreview()
        break
      case 'toggleExplorer':
        toggleExplorer()
        break
      case 'switchToJson':
        setCurrentTool('json')
        break
      case 'switchToXml':
        setCurrentTool('xml')
        break
      case 'switchToBase64':
        setCurrentTool('base64')
        break
      case 'switchToHttp':
        setCurrentTool('http')
        break
      case 'openSettings':
        openSettings()
        break
      case 'newFile':
        createFile('', currentTool)
        break
      case 'newFolder':
        createFolder('', 'NewFolder')
        break
      case 'save':
        if (activeFileId) {
          saveFile(activeFileId)
        }
        break
      case 'saveAll':
        saveAllFiles()
        break
      case 'find':
        // 这个功能需要在相应的组件中实现
        break
      // 文件操作快捷键
      case 'copy':
        if (selectedItem) {
          copyItem(selectedItem)
        }
        break
      case 'cut':
        if (selectedItem) {
          cutItem(selectedItem)
        }
        break
      case 'paste':
        if (clipboard) {
          const targetPath = selectedItem?.type === 'folder'
            ? selectedItem.path
            : `${storagePath}/${currentTool}`
          pasteItem(targetPath)
        }
        break
      case 'duplicate':
        if (selectedItem) {
          duplicateItem(selectedItem)
        }
        break
      case 'rename':
        if (selectedItem) {
          triggerRename(selectedItem.id)
        }
        break
      case 'delete':
        if (selectedItem) {
          const confirmMsg = selectedItem.type === 'folder'
            ? `确定要删除文件夹 "${selectedItem.name}" 及其所有内容吗？`
            : `确定要删除文件 "${selectedItem.name}" 吗？`
          if (confirm(confirmMsg)) {
            deleteItem(selectedItem)
          }
        }
        break
      default:
        break
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      // 全局快捷键（在任何地方都生效）
      const globalActions = [
        'globalSearch', 'closeTab', 'togglePreview', 'toggleExplorer',
        'switchToJson', 'switchToXml', 'switchToBase64', 'switchToHttp',
        'openSettings', 'save', 'saveAll'
      ]

      // 文件操作快捷键（只在文件列表有焦点时生效）
      const fileOperationActions = ['copy', 'cut', 'paste', 'duplicate', 'rename', 'delete', 'newFile', 'newFolder']

      // 检查所有配置的快捷键
      for (const [action, shortcut] of Object.entries(shortcuts)) {
        if (checkShortcut(e, shortcut)) {
          // 如果是文件操作快捷键，检查是否在编辑器中
          if (fileOperationActions.includes(action)) {
            if (isInEditorOrInput()) {
              // 在编辑器中，让编辑器处理这些快捷键
              return
            }
          }

          // 全局快捷键或不在编辑器中的文件操作快捷键
          e.preventDefault()
          executeAction(action)
          break
        }
      }
    }

    // Add event listener
    window.addEventListener('keydown', handleKeyDown)

    // Listen to Wails menu events
    const unsubscribers = [
      EventsOn('menu:global-search', openGlobalSearch),
      EventsOn('menu:close-tab', () => {
        if (activeFileId) closeTab(activeFileId)
      }),
      EventsOn('menu:toggle-preview', togglePreview),
      EventsOn('menu:toggle-explorer', toggleExplorer),
      EventsOn('menu:switch-tool', (tool) => setCurrentTool(tool)),
      EventsOn('menu:settings', openSettings),
    ]

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      // Unsubscribe from Wails events
      unsubscribers.forEach((unsub) => {
        if (typeof unsub === 'function') unsub()
      })
    }
  }, [
    openGlobalSearch,
    closeTab,
    activeFileId,
    togglePreview,
    toggleExplorer,
    setCurrentTool,
    openSettings,
    shortcuts,
    saveFile,
    saveAllFiles,
    selectedItem,
    copyItem,
    cutItem,
    pasteItem,
    duplicateItem,
    deleteItem,
    triggerRename,
    clipboard,
    storagePath,
    currentTool,
    createFile,
    createFolder,
  ])
}
