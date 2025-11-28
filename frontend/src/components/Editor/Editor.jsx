import { useEffect, useRef } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useTranslation } from '../../constants/translations'
import MonacoEditor from '@monaco-editor/react'
import { registerHTTPLanguage } from '../../utils/httpLanguage'
import { registerJSONLanguage } from '../../utils/jsonLanguage'
import { setupEditorClipboard } from '../../utils/editorClipboard'

/**
 * Editor Component
 *
 * Monaco-based code editor with:
 * - Syntax highlighting
 * - macOS font (Menlo)
 * - Auto-sync with active file
 * - Custom HTTP language support
 */
function Editor() {
  const {
    activeFileId,
    currentTool,
    fileSystem,
    openTabs,
    findItemById,
    updateFileContent,
    getFileContent,
    isFileDirty,
    theme,
    showToast,
    setEditorRef,
    // 如果您已经在store中添加了viewStates支持，请解构它们，否则可忽略
    // saveViewState,
    // getViewState,
  } = useAppStore()
  const { t } = useTranslation()

  const editorRef = useRef(null)
  const monacoRef = useRef(null)

  // Find active file info from tabs or file system
  const activeTab = openTabs.find((tab) => tab.id === activeFileId)
  const activeFile = activeFileId
    ? findItemById(fileSystem[currentTool], activeFileId)
    : null

  // Get content from cache
  const content = activeFileId ? getFileContent(activeFileId) : ''
  const isDirty = activeFileId ? isFileDirty(activeFileId) : false

  // [修复] 在编辑器挂载前注册语言和主题
  // 这确保了当编辑器初始化并请求 'http-dark' 主题时，该主题已经存在
  const handleEditorWillMount = (monaco) => {
    monacoRef.current = monaco
    registerHTTPLanguage(monaco)
    registerJSONLanguage(monaco)
  }

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
    
    // Store editor reference in store for toolbar access
    setEditorRef(editor)
    
    // Setup system clipboard integration
    setupEditorClipboard(monaco, editor, showToast, t)

    // [修复] 覆盖 Monaco 默认的 Cmd+G (查找下一个)，改为切换预览区域
    // 使用 useAppStore.getState() 确保获取最新状态和方法
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG, () => {
      useAppStore.getState().togglePreview()
    })
    
    // [修复] 覆盖 Monaco 默认的格式化快捷键，使用自定义的 Cmd+Shift+L
    // 禁用 Monaco 的默认格式化快捷键（Shift+Alt+F / Shift+Option+F）
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
      // Do nothing - let our custom shortcut handle it
    })
    
    // 添加自定义格式化快捷键 Cmd+Shift+L
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyL,
      () => {
        const { currentTool } = useAppStore.getState()
        if (currentTool === 'json') {
          // 触发JSON格式化功能（保留所有内容，格式化JSON部分）
          const toolbar = document.querySelector('[data-testid="json-format-btn"]')
          if (toolbar) {
            toolbar.click()
          }
        } else {
          // 其他工具使用原有的格式化功能
          useAppStore.getState().formatActiveFile()
        }
      }
    )
    
    // [修复] 覆盖 Monaco 默认的 Cmd+Shift+O (Go to Symbol in Editor)，使用自定义的JSON过滤
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyO,
      () => {
        const { currentTool } = useAppStore.getState()
        if (currentTool === 'json') {
          // 触发JSON过滤功能
          const toolbar = document.querySelector('[data-testid="json-filter-btn"]')
          if (toolbar) {
            toolbar.click()
          }
        }
      }
    )
  }

  const handleEditorChange = (value) => {
    if (activeFileId && value !== undefined) {
      updateFileContent(activeFileId, value)
    }
  }

  // Get language based on current tool
  const getLanguage = () => {
    switch (currentTool) {
      case 'json': return 'json-custom' // Use custom JSON language with single quote support
      case 'xml': return 'xml'
      case 'base64': return 'plaintext'
      case 'http': return 'http'
      default: return 'plaintext'
    }
  }

  // Get theme based on tool and app theme
  const getEditorTheme = () => {
    if (currentTool === 'http') {
      return theme === 'dark' ? 'http-dark' : 'http-light'
    }
    return theme === 'dark' ? 'vs-dark' : 'vs-light'
  }

  if (!activeFileId || !activeTab) {
    return (
      <div className="flex-1 flex items-center justify-center bg-macos-bg">
        <div className="text-macos-text-sub text-sm">
          <p>{t('editor.noFileOpen')}</p>
          <p className="text-xs mt-2">
            {t('editor.noFileMessage')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--macos-bg)' }}>
      <MonacoEditor
        // [修复] 移除 key={activeFileId} 以保持编辑器实例存活，避免闪烁和状态丢失
        path={activeFile?.path || activeFileId} 
        height="100%"
        language={getLanguage()}
        value={content}
        onChange={handleEditorChange}
        beforeMount={handleEditorWillMount} // [修复] 关键点：挂载前注册主题
        onMount={handleEditorDidMount}
        theme={getEditorTheme()}
        options={{
          fontFamily: 'Menlo, Monaco, Courier New, monospace',
          fontSize: 13,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          lineNumbers: 'on',
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          readOnly: false,
          cursorStyle: 'line',
          cursorBlinking: 'blink',
          mouseWheelZoom: false,
          quickSuggestions: currentTool === 'http' ? true : false,
          acceptSuggestionOnEnter: 'on',
          formatOnPaste: true,
          formatOnType: true,
          suggestOnTriggerCharacters: true,
          wordBasedSuggestions: false,
        }}
      />

      {/* Status Bar */}
      <div
        className="h-6 flex items-center justify-between px-3 text-xs text-white"
        style={{ backgroundColor: 'var(--macos-accent)' }}
      >
        <div className="flex gap-3">
          <span>{t('editor.utf8')}</span>
          <span>{t(`tools.${currentTool}`).toUpperCase()}</span>
        </div>
        {isDirty && (
          <div className="flex items-center gap-2">
            <span>● {t('editor.unsaved')}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default Editor