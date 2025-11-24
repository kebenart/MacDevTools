import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { EventsOn } from '../wailsjs/runtime/runtime'
import { copyToClipboard, pasteFromClipboard, cutToClipboard } from '../utils/clipboard'

/**
 * Custom hook for handling macOS keyboard shortcuts
 * IMPORTANT: Handles both Wails Menu events and keydown events
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
    // Editor ref
    editorRef,
    showToast,
    t,
  } = useAppStore()

  // 辅助函数：检查是否在原生输入框中
  const isNativeInput = () => {
    const el = document.activeElement
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
  }

  // --- 核心处理逻辑 (供菜单事件和快捷键调用) ---

  const handleCopy = async () => {
    // 1. Monaco Editor 优先
    if (editorRef && editorRef.hasTextFocus()) {
      const selection = editorRef.getSelection()
      if (!selection.isEmpty()) {
        const text = editorRef.getModel().getValueInRange(selection)
        await copyToClipboard(text)
        showToast(t('messages.success.copied'), 'success')
      }
      return
    }

    // 2. 原生输入框
    if (isNativeInput()) {
      const text = window.getSelection().toString()
      if (text) {
        await copyToClipboard(text)
        showToast(t('messages.success.copied'), 'success')
      }
      return
    }

    // 3. 文件管理器
    if (selectedItem) {
      copyItem(selectedItem)
    }
  }

  const handleCut = async () => {
    // 1. Monaco Editor
    if (editorRef && editorRef.hasTextFocus()) {
      const selection = editorRef.getSelection()
      if (!selection.isEmpty()) {
        const text = editorRef.getModel().getValueInRange(selection)
        const success = await cutToClipboard(text)
        if (success.success) {
          // 剪切成功后删除选中内容
          editorRef.executeEdits('keyboard', [{ range: selection, text: '' }])
          showToast(t('messages.success.cut'), 'success')
        }
      }
      return
    }

    // 2. 原生输入框
    if (isNativeInput()) {
      const text = window.getSelection().toString()
      if (text) {
        await cutToClipboard(text)
        document.execCommand('cut') // 尝试使用原生命令删除内容
      }
      return
    }

    // 3. 文件管理器
    if (selectedItem) {
      cutItem(selectedItem)
    }
  }

  const handlePaste = async () => {
    // 1. Monaco Editor
    if (editorRef && editorRef.hasTextFocus()) {
      const result = await pasteFromClipboard()
      if (result.success && result.data) {
        const selection = editorRef.getSelection()
        editorRef.executeEdits('keyboard', [{ range: selection, text: result.data, forceMoveMarkers: true }])
      }
      return
    }

    // 2. 原生输入框
    if (isNativeInput()) {
      const result = await pasteFromClipboard()
      if (result.success && result.data) {
        document.execCommand('insertText', false, result.data)
      }
      return
    }

    // 3. 文件管理器
    if (clipboard) {
      const targetPath = selectedItem?.type === 'folder'
        ? selectedItem.path
        : `${storagePath}/${currentTool}`
      pasteItem(targetPath)
    }
  }

  const handleSelectAll = () => {
    if (editorRef && editorRef.hasTextFocus()) {
      editorRef.trigger('keyboard', 'selectAll', null)
    } else if (isNativeInput()) {
      document.activeElement.select()
    }
  }

  const handleUndo = () => {
    if (editorRef && editorRef.hasTextFocus()) {
      editorRef.trigger('keyboard', 'undo', null)
    } else {
      document.execCommand('undo')
    }
  }

  const handleRedo = () => {
    if (editorRef && editorRef.hasTextFocus()) {
      editorRef.trigger('keyboard', 'redo', null)
    } else {
      document.execCommand('redo')
    }
  }

  // --- 事件监听 ---

  useEffect(() => {
    // 监听 Wails 菜单事件 (这是修复的关键，因为 macOS 原生菜单会拦截快捷键)
    const unsubscribers = [
      EventsOn('menu:global-search', openGlobalSearch),
      EventsOn('menu:close-tab', () => {
        if (activeFileId) closeTab(activeFileId)
      }),
      EventsOn('menu:toggle-preview', togglePreview),
      EventsOn('menu:toggle-explorer', toggleExplorer),
      EventsOn('menu:switch-tool', (tool) => setCurrentTool(tool)),
      EventsOn('menu:settings', openSettings),
      // 编辑菜单事件
      EventsOn('menu:copy', handleCopy),
      EventsOn('menu:cut', handleCut),
      EventsOn('menu:paste', handlePaste),
      EventsOn('menu:select-all', handleSelectAll),
      EventsOn('menu:undo', handleUndo),
      EventsOn('menu:redo', handleRedo),
      // 文件菜单事件
      EventsOn('menu:new-file', () => createFile('', currentTool)),
      EventsOn('menu:new-folder', () => createFolder('', 'NewFolder')),
      EventsOn('menu:save', () => {
        if (activeFileId) saveFile(activeFileId)
      }),
      EventsOn('menu:save-all', saveAllFiles),
    ]

    // 监听键盘事件 (处理非菜单快捷键，或 Windows/Linux 场景)
    const handleKeyDown = (e) => {
      // 检查快捷键匹配
      const checkShortcut = (shortcut) => {
        if (!shortcut) return false
        const { key, modifiers = [] } = shortcut
        const pressedModifiers = []
        if (e.metaKey) pressedModifiers.push('meta')
        if (e.ctrlKey) pressedModifiers.push('ctrl')
        if (e.altKey) pressedModifiers.push('alt')
        if (e.shiftKey) pressedModifiers.push('shift')

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

        const keyMatches = normalizeKey(key) === normalizeKey(e.key)
        const modifiersMatch =
          modifiers.length === pressedModifiers.length &&
          modifiers.every(mod => pressedModifiers.includes(mod))

        return keyMatches && modifiersMatch
      }

      // 执行动作
      const executeAction = (action) => {
        switch (action) {
          case 'globalSearch': openGlobalSearch(); break
          case 'closeTab': if (activeFileId) closeTab(activeFileId); break
          case 'togglePreview': togglePreview(); break
          case 'toggleExplorer': toggleExplorer(); break
          case 'switchToJson': setCurrentTool('json'); break
          case 'switchToXml': setCurrentTool('xml'); break
          case 'switchToBase64': setCurrentTool('base64'); break
          case 'switchToHttp': setCurrentTool('http'); break
          case 'openSettings': openSettings(); break
          case 'newFile': createFile('', currentTool); break
          case 'newFolder': createFolder('', 'NewFolder'); break
          case 'save': if (activeFileId) saveFile(activeFileId); break
          case 'saveAll': saveAllFiles(); break
          case 'find': 
             // 查找通常由编辑器内部处理，这里可以留空或调用 editor trigger
             if (editorRef) editorRef.trigger('keyboard', 'actions.find');
             break
          // 文件操作：如果在编辑器中，忽略这里的处理，由 menu 或编辑器默认行为接管
          // 如果不在编辑器且不在输入框，则执行文件操作
          case 'copy': 
             if (!editorRef?.hasTextFocus() && !isNativeInput() && selectedItem) copyItem(selectedItem);
             break
          case 'cut':
             if (!editorRef?.hasTextFocus() && !isNativeInput() && selectedItem) cutItem(selectedItem);
             break
          case 'paste':
             if (!editorRef?.hasTextFocus() && !isNativeInput()) handlePaste();
             break
          case 'duplicate':
             if (!editorRef?.hasTextFocus() && !isNativeInput() && selectedItem) duplicateItem(selectedItem);
             break
          case 'rename':
             if (!editorRef?.hasTextFocus() && !isNativeInput() && selectedItem) triggerRename(selectedItem.id);
             break
          case 'delete':
             if (!editorRef?.hasTextFocus() && !isNativeInput() && selectedItem) {
                if (confirm(selectedItem.type === 'folder' 
                    ? `确定要删除文件夹 "${selectedItem.name}" 及其所有内容吗？` 
                    : `确定要删除文件 "${selectedItem.name}" 吗？`)) {
                    deleteItem(selectedItem)
                }
             }
             break
        }
      }

      // 遍历检查所有快捷键配置
      for (const [action, shortcut] of Object.entries(shortcuts)) {
        if (checkShortcut(shortcut)) {
          // 如果是复制/粘贴/剪切/全选/撤销/重做，且主要目的是为了处理菜单栏
          // 则在 macOS 上通常由菜单事件处理。
          // 但为了保险，我们可以 e.preventDefault() 并让 executeAction 处理非菜单逻辑
          
          // 对于编辑器内部操作，Monaco 会处理 keydown，除非我们在这里拦截。
          // 我们只拦截全局和文件列表操作。
          
          const fileActions = ['copy', 'cut', 'paste', 'duplicate', 'rename', 'delete', 'newFile', 'newFolder']
          const isEditorActive = (editorRef && editorRef.hasTextFocus()) || isNativeInput()

          if (fileActions.includes(action) && isEditorActive) {
             // 让编辑器处理或等待菜单事件
             return
          }

          e.preventDefault()
          executeAction(action)
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      unsubscribers.forEach((unsub) => {
        if (typeof unsub === 'function') unsub()
      })
    }
  }, [
    openGlobalSearch, closeTab, activeFileId, togglePreview, toggleExplorer,
    setCurrentTool, openSettings, shortcuts, saveFile, saveAllFiles,
    selectedItem, copyItem, cutItem, pasteItem, duplicateItem, deleteItem,
    triggerRename, clipboard, storagePath, currentTool, createFile, createFolder,
    editorRef, t // 添加 editorRef 和 t 到依赖
  ])
}