import { useEffect, useRef } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useTranslation } from '../../constants/translations'
import MonacoEditor, { loader } from '@monaco-editor/react'
import { registerHTTPLanguage } from '../../utils/httpLanguage'
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

  // Initialize Monaco and register HTTP language
  useEffect(() => {
    loader.init().then((monaco) => {
      monacoRef.current = monaco
      registerHTTPLanguage()
    })
  }, [])

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
    
    // Store editor reference in store for toolbar access
    setEditorRef(editor)
    
    // Setup system clipboard integration (minimal - won't interfere with normal editing)
    setupEditorClipboard(monaco, editor, showToast, t)

    // [修复] 覆盖 Monaco 默认的 Cmd+G (查找下一个)，改为切换预览区域
    // 使用 useAppStore.getState() 确保获取最新状态和方法
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG, () => {
      useAppStore.getState().togglePreview()
    })
  }

  const handleEditorChange = (value) => {
    if (activeFileId && value !== undefined) {
      updateFileContent(activeFileId, value)
    }
  }

  // Get language based on current tool
  const getLanguage = () => {
    switch (currentTool) {
      case 'json':
        return 'json'
      case 'xml':
        return 'xml'
      case 'base64':
        return 'plaintext'
      case 'http':
        return 'http'
      default:
        return 'plaintext'
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
        key={activeFileId} // Force re-render when file changes
        height="100%"
        language={getLanguage()}
        value={content}
        onChange={handleEditorChange}
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