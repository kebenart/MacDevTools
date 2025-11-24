import { useEffect, useRef } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useTranslation } from '../../constants/translations'
import MonacoEditor, { loader } from '@monaco-editor/react'
import { registerHTTPLanguage } from '../../utils/httpLanguage'
import { copyToClipboard } from '../../utils/clipboard'

/**
 * Preview Component
 *
 * Shows formatted preview of content with:
 * - Syntax highlighting (Monaco Editor)
 * - Code folding support
 * - Right-click context menu with copy
 * - JSON: Prettified tree view
 * - XML: Formatted XML
 * - Base64: Decoded text
 * - HTTP: Response preview
 */
function Preview() {
  const {
    isPreviewVisible,
    togglePreview,
    activeFileId,
    currentTool,
    getFileContent,
    theme,
    showToast,
    previewWidth,
    getHTTPResponse,
    editorFontSize,
    editorFontFamily,
  } = useAppStore()
  const { t } = useTranslation()

  const editorRef = useRef(null)
  const monacoRef = useRef(null)

  // Initialize Monaco and register HTTP language
  useEffect(() => {
    loader.init().then((monaco) => {
      monacoRef.current = monaco
      registerHTTPLanguage(monaco)
      // Apply theme immediately after Monaco is ready
      if (currentTool === 'http') {
        const themeName = theme === 'dark' ? 'http-dark' : 'http-light'
        monaco.editor.setTheme(themeName)
      }
    })
  }, [currentTool, theme])

  // Get theme (must be before conditional returns)
  const getEditorTheme = () => {
    if (currentTool === 'http') {
      return theme === 'dark' ? 'http-dark' : 'http-light'
    }
    return theme === 'dark' ? 'vs-dark' : 'vs-light'
  }

  // Get current theme name
  const currentTheme = getEditorTheme()
  
  // Update theme when it changes (must be before any conditional returns)
  useEffect(() => {
    if (monacoRef.current && editorRef.current) {
      // Force apply theme, especially for HTTP tool
      const themeToApply = currentTool === 'http' 
        ? (theme === 'dark' ? 'http-dark' : 'http-light')
        : currentTheme
      monacoRef.current.editor.setTheme(themeToApply)
    }
  }, [currentTheme, currentTool, theme])

  if (!isPreviewVisible) return null

  const content = activeFileId ? getFileContent(activeFileId) : ''

  // Get preview content based on tool type
  const getPreviewContent = () => {
    if (!activeFileId) {
      return ''
    }

    switch (currentTool) {
      case 'json':
        if (!content) return ''
        try {
          const parsed = JSON.parse(content)
          return JSON.stringify(parsed, null, 2)
        } catch {
          return null // Will show error message
        }

      case 'xml':
        return content || ''

      case 'base64':
        if (!content) return ''
        try {
          const trimmed = content.trim()
          if (!/^[A-Za-z0-9+/]*={0,2}$/.test(trimmed)) {
            return null // Invalid base64
          }
          const decoded = atob(trimmed)
          // Check for binary content
          const hasBinary = /[\x00-\x08\x0E-\x1F]/.test(decoded)
          if (hasBinary) {
            return null // Binary content, will show message
          }
          return decoded
        } catch {
          return null // Invalid base64
        }

      case 'http':
        // Show HTTP response instead of request
        const response = getHTTPResponse(activeFileId)
        if (!response) {
          return '' // No response yet
        }
        
        // Format response for display
        let formattedResponse = ''
        
        // Status line with duration
        if (response.error) {
          formattedResponse += `Error: ${response.error}\n`
          if (response.duration) {
            formattedResponse += `Duration: ${response.duration}ms\n`
          }
          formattedResponse += '\n'
        } else {
          formattedResponse += `HTTP/1.1 ${response.statusCode} ${response.status}\n`
          if (response.duration) {
            formattedResponse += `Duration: ${response.duration}ms\n`
          }
        }
        
        // Headers
        if (response.headers && Object.keys(response.headers).length > 0) {
          formattedResponse += '\n'
          for (const [key, value] of Object.entries(response.headers)) {
            formattedResponse += `${key}: ${value}\n`
          }
        }
        
        // Body
        if (response.body) {
          formattedResponse += '\n'
          formattedResponse += response.body
        }
        
        return formattedResponse

      default:
        return ''
    }
  }

  const previewContent = getPreviewContent()

  // Get language for syntax highlighting
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

  // Setup context menu with copy option
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
    
    // Ensure HTTP themes are registered
    registerHTTPLanguage(monaco)
    
    // Apply theme immediately - force apply for HTTP tool
    const themeToApply = currentTool === 'http' 
      ? (theme === 'dark' ? 'http-dark' : 'http-light')
      : currentTheme
    monaco.editor.setTheme(themeToApply)

    // Override default copy action to use system clipboard
    editor.addAction({
      id: 'preview-copy',
      label: t('explorer.copy') || '复制',
      contextMenuGroupId: '1_cutcopypaste',
      contextMenuOrder: 1.5,
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC
      ],
      run: async () => {
        const selection = editor.getSelection()
        let textToCopy = ''
        
        if (selection && !selection.isEmpty()) {
          // Copy selected text
          textToCopy = editor.getModel().getValueInRange(selection)
        } else {
          // Copy all text if nothing selected
          textToCopy = editor.getValue()
        }

        if (textToCopy) {
          const result = await copyToClipboard(textToCopy)
          if (result.success) {
            showToast(t('messages.success.copiedToClipboard'), 'success')
          } else {
            showToast(result.error || t('messages.errors.copyFailed'), 'error')
          }
        }
      },
    })

    // Also add "Copy All" option
    editor.addAction({
      id: 'preview-copy-all',
      label: '复制全部',
      contextMenuGroupId: '1_cutcopypaste',
      contextMenuOrder: 1.6,
      run: async () => {
        const textToCopy = editor.getValue()
        if (textToCopy) {
          const result = await copyToClipboard(textToCopy)
          if (result.success) {
            showToast(t('messages.success.copiedToClipboard'), 'success')
          } else {
            showToast(result.error || t('messages.errors.copyFailed'), 'error')
          }
        }
      },
    })
  }

  // Render error messages
  const renderError = (message) => {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-macos-error text-sm text-center">{message}</div>
      </div>
    )
  }

  // Render special cases
  const renderSpecialContent = () => {
    if (!activeFileId) {
      return (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-macos-text-sub text-sm text-center">
            {t('preview.noFileSelected')}
          </div>
        </div>
      )
    }

    // HTTP tool: show message if no response yet
    if (currentTool === 'http') {
      const response = getHTTPResponse(activeFileId)
      if (!response) {
        return (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-macos-text-sub text-sm text-center">
              {t('preview.noHttpResponse') || '点击"发送"按钮发送请求，响应将显示在这里'}
            </div>
          </div>
        )
      }
      // If there's an error, we'll show it in the formatted response
      return null
    }

    // JSON parse error
    if (currentTool === 'json' && content) {
      try {
        JSON.parse(content)
      } catch {
        return renderError(t('preview.invalidJson'))
      }
    }

    // Base64 special cases
    if (currentTool === 'base64' && content) {
      try {
        const trimmed = content.trim()
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(trimmed)) {
          return renderError(t('preview.invalidBase64'))
        }
        const decoded = atob(trimmed)
        const hasBinary = /[\x00-\x08\x0E-\x1F]/.test(decoded)
        if (hasBinary) {
          return (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-macos-text-sub text-sm text-center">
                {t('preview.binaryContent')} ({decoded.length} bytes)
              </div>
            </div>
          )
        }
      } catch {
        return renderError(t('preview.invalidBase64'))
      }
    }

    return null
  }

  const specialContent = renderSpecialContent()
  if (specialContent) {
    return (
      <div 
        className="flex-shrink-0 bg-macos-explorer border-l border-macos-border flex flex-col"
        style={{ width: `${previewWidth}px` }}
      >
        {specialContent}
      </div>
    )
  }

  return (
    <div 
      className="flex-shrink-0 bg-macos-explorer border-l border-macos-border flex flex-col"
      style={{ width: `${previewWidth}px` }}
    >
      {/* Monaco Editor for Preview - No header, no close button */}
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          key={`preview-${activeFileId}-${currentTool}-${theme}`}
          height="100%"
          language={getLanguage()}
          value={previewContent || ''}
          onMount={handleEditorDidMount}
          theme={currentTheme}
          options={{
            fontFamily: editorFontFamily,
            fontSize: editorFontSize,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            lineNumbers: 'on',
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            readOnly: true, // Preview is read-only
            cursorStyle: 'line',
            cursorBlinking: 'blink',
            mouseWheelZoom: false,
            // Enable code folding
            folding: true,
            foldingStrategy: 'auto',
            showFoldingControls: 'always',
            // Enable context menu (includes copy by default)
            contextmenu: true,
            // Enable selection
            selectOnLineNumbers: true,
            // Disable editing features
            readOnlyMessage: { value: t('preview.readOnly') || '预览模式（只读）' },
          }}
        />
      </div>
    </div>
  )
}

export default Preview
