import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useTranslation } from '../../constants/translations'
import MonacoEditor, { loader } from '@monaco-editor/react'
import { registerHTTPLanguage } from '../../utils/httpLanguage'
import { registerJSONLanguage } from '../../utils/jsonLanguage'
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
  const [httpPreviewTab, setHttpPreviewTab] = useState('response') // 'response', 'responseHeaders', 'request', 'requestHeaders'

  // Initialize Monaco and register HTTP language
  useEffect(() => {
    loader.init().then((monaco) => {
      monacoRef.current = monaco
      registerHTTPLanguage(monaco)
      registerJSONLanguage(monaco)
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
        const response = getHTTPResponse(activeFileId)
        const requestContent = content || ''
        
        // 解析单引号JSON的辅助函数
        const parseJSONWithSingleQuotes = (text) => {
          if (!text || typeof text !== 'string') return null
          
          // 先尝试标准JSON解析
          try {
            return JSON.parse(text.trim())
          } catch {
            // 如果失败，尝试将单引号替换为双引号
            try {
              // 简单的单引号替换（不处理字符串内的单引号转义）
              const doubleQuoted = text.trim().replace(/'/g, '"')
              return JSON.parse(doubleQuoted)
            } catch {
              // 更复杂的处理：处理字符串内的单引号
              let result = ''
              let inString = false
              let escaped = false
              
              for (let i = 0; i < text.length; i++) {
                const char = text[i]
                
                if (escaped) {
                  result += char
                  escaped = false
                  continue
                }
                
                if (char === '\\') {
                  escaped = true
                  result += char
                  continue
                }
                
                if (char === "'" && !escaped) {
                  if (!inString) {
                    inString = true
                    result += '"'
                  } else {
                    // 检查下一个字符，如果是非字母数字，可能是字符串结束
                    const nextChar = text[i + 1]
                    if (nextChar === undefined || /[\s,}\]:]/.test(nextChar)) {
                      inString = false
                      result += '"'
                    } else {
                      result += "\\'"
                    }
                  }
                } else {
                  result += char
                }
              }
              
              try {
                return JSON.parse(result.trim())
              } catch {
                return null
              }
            }
          }
        }
        
        // 格式化JSON（支持单引号）
        const formatJSON = (text) => {
          if (!text) return ''
          const parsed = parseJSONWithSingleQuotes(text)
          if (parsed !== null) {
            return JSON.stringify(parsed, null, 2)
          }
          return text
        }
        
        // 根据选中的tab返回不同内容
        if (httpPreviewTab === 'response') {
          // 响应body（格式化JSON）
          if (!response) {
            return '' // No response yet
          }
          
          if (response.body) {
            return formatJSON(response.body)
          }
          
          return ''
        } else if (httpPreviewTab === 'responseHeaders') {
          // 响应头
          if (!response) {
            return '' // No response yet
          }
          
          let headersText = ''
          if (response.headers && Object.keys(response.headers).length > 0) {
            for (const [key, value] of Object.entries(response.headers)) {
              headersText += `${key}: ${value}\n`
            }
          } else {
            headersText = 'No headers'
          }
          
          return headersText
        } else if (httpPreviewTab === 'request') {
          // 请求内容
          return requestContent
        } else if (httpPreviewTab === 'requestHeaders') {
          // 请求头 - 从请求内容中解析
          if (!requestContent) {
            return '' // No request content
          }
          
          const lines = requestContent.split('\n')
          let headersText = ''
          let foundHeaders = false
          
          // 跳过第一行（METHOD URL）
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim()
            if (line === '') {
              // 空行表示headers结束
              break
            }
            const colonIndex = line.indexOf(':')
            if (colonIndex !== -1) {
              foundHeaders = true
              headersText += `${line}\n`
            }
          }
          
          if (!foundHeaders) {
            headersText = 'No headers'
          }
          
          return headersText
        }
        
        return ''

      default:
        return ''
    }
  }

  const previewContent = getPreviewContent()

  // Get language for syntax highlighting
  const getLanguage = () => {
    switch (currentTool) {
      case 'json':
        return 'json-custom' // Use custom JSON language with single quote support
      case 'xml':
        return 'xml'
      case 'base64':
        return 'plaintext'
      case 'http':
        // HTTP工具的请求tab也使用http语言
        if (httpPreviewTab === 'request') {
          return 'http'
        }
        // 响应tab使用json-custom（如果响应是JSON，支持单引号）
        if (httpPreviewTab === 'response') {
          const response = getHTTPResponse(activeFileId)
          if (response && response.body) {
            // 尝试解析JSON（支持单引号）
            try {
              JSON.parse(response.body)
              return 'json-custom'
            } catch {
              // 尝试单引号JSON
              try {
                const doubleQuoted = response.body.trim().replace(/'/g, '"')
                JSON.parse(doubleQuoted)
                return 'json-custom'
              } catch {
                return 'plaintext'
              }
            }
          }
        }
        return 'plaintext'
      default:
        return 'plaintext'
    }
  }
  
  // 重置HTTP tab当切换文件或工具时
  useEffect(() => {
    if (currentTool !== 'http') {
      setHttpPreviewTab('response')
    }
  }, [currentTool, activeFileId])

  // Setup context menu with copy option
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
    
    // Ensure HTTP themes are registered
    registerHTTPLanguage(monaco)
    registerJSONLanguage(monaco)
    
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

  // HTTP工具显示tab切换
  const renderHttpTabs = () => {
    if (currentTool !== 'http') return null
    
    const response = getHTTPResponse(activeFileId)
    if (!response) return null
    
    return (
      <div className="flex items-center border-b border-macos-border" style={{ backgroundColor: 'var(--macos-explorer)' }}>
        <button
          onClick={() => setHttpPreviewTab('response')}
          className={`px-4 py-2 text-xs font-medium transition-colors ${
            httpPreviewTab === 'response'
              ? 'border-b-2 border-macos-accent text-macos-accent'
              : 'text-macos-text-sub hover:text-macos-text-main'
          }`}
          style={{
            color: httpPreviewTab === 'response' ? 'var(--macos-accent)' : 'var(--macos-text-sub)',
          }}
        >
          响应
        </button>
        <button
          onClick={() => setHttpPreviewTab('responseHeaders')}
          className={`px-4 py-2 text-xs font-medium transition-colors ${
            httpPreviewTab === 'responseHeaders'
              ? 'border-b-2 border-macos-accent text-macos-accent'
              : 'text-macos-text-sub hover:text-macos-text-main'
          }`}
          style={{
            color: httpPreviewTab === 'responseHeaders' ? 'var(--macos-accent)' : 'var(--macos-text-sub)',
          }}
        >
          响应头
        </button>
        <button
          onClick={() => setHttpPreviewTab('request')}
          className={`px-4 py-2 text-xs font-medium transition-colors ${
            httpPreviewTab === 'request'
              ? 'border-b-2 border-macos-accent text-macos-accent'
              : 'text-macos-text-sub hover:text-macos-text-main'
          }`}
          style={{
            color: httpPreviewTab === 'request' ? 'var(--macos-accent)' : 'var(--macos-text-sub)',
          }}
        >
          请求
        </button>
        <button
          onClick={() => setHttpPreviewTab('requestHeaders')}
          className={`px-4 py-2 text-xs font-medium transition-colors ${
            httpPreviewTab === 'requestHeaders'
              ? 'border-b-2 border-macos-accent text-macos-accent'
              : 'text-macos-text-sub hover:text-macos-text-main'
          }`}
          style={{
            color: httpPreviewTab === 'requestHeaders' ? 'var(--macos-accent)' : 'var(--macos-text-sub)',
          }}
        >
          请求头
        </button>
      </div>
    )
  }

  return (
    <div 
      className="flex-shrink-0 bg-macos-explorer border-l border-macos-border flex flex-col"
      style={{ width: `${previewWidth}px` }}
    >
      {/* HTTP工具显示tab */}
      {renderHttpTabs()}
      
      {/* Monaco Editor for Preview - No header, no close button */}
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          key={`preview-${activeFileId}-${currentTool}-${theme}-${httpPreviewTab}`}
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
