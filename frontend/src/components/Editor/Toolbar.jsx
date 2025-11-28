import { useAppStore } from '../../store/useAppStore'
import { useTranslation } from '../../constants/translations'
import { Copy, Search, Eye, Filter } from 'lucide-react'
import { FormatJSON, CompressJSON, FormatXML, XMLToJSON, EncodeBase64, DecodeBase64, SendHTTPRequest } from '../../wailsjs/go/main/App'
import { copyToClipboard } from '../../utils/clipboard'

/**
 * Toolbar Component
 *
 * Action buttons based on current tool:
 * - JSON: Format, Compress
 * - XML: Format, Convert to JSON
 * - Base64: Encode, Decode
 * - HTTP: Send Request
 */
function Toolbar() {
  const {
    currentTool,
    activeFileId,
    updateFileContent,
    getFileContent,
    openGlobalSearch,
    togglePreview,
    isPreviewVisible,
    showToast,
    isLoading,
    setLoading,
    formatActiveFile,
    editorRef,
    setHTTPResponse,
    saveFile,
    keepLongestJson,
  } = useAppStore()
  const { t } = useTranslation()

  const content = activeFileId ? getFileContent(activeFileId) : ''

  const handleAction1 = async () => {
    if (!activeFileId || isLoading) return

    switch (currentTool) {
      case 'json':
        // JSON格式化：保留所有内容，但对其中的JSON进行格式化
        setLoading(true)
        try {
          const formatted = formatMixedContent(content)
          updateFileContent(activeFileId, formatted)
          showToast(t('messages.success.jsonFormatted'), 'success')
        } finally {
          setLoading(false)
        }
        break
      case 'xml':
        await formatActiveFile()
        break
      case 'base64':
        setLoading(true)
        const result = await EncodeBase64(content)
        updateFileContent(activeFileId, result.result)
        showToast(t('messages.success.base64Encoded'), 'success')
        setLoading(false)
        break
      case 'http':
        await handleHTTPSend()
        break
    }
  }

  const handleJSONFilter = async () => {
    if (!activeFileId || isLoading) return

    setLoading(true)
    try {
      const filteredJSON = extractAndFilterJSON(content)
      if (filteredJSON) {
        updateFileContent(activeFileId, filteredJSON)
        showToast(t('messages.success.jsonFiltered'), 'success')
      } else {
        showToast(t('messages.errors.noJsonFound'), 'error')
      }
    } finally {
      setLoading(false)
    }
  }

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

  // 过滤功能：只保留JSON，去掉其他文本
  const extractAndFilterJSON = (text) => {
    if (!text || typeof text !== 'string') return null

    // First, try to parse the entire text as JSON (支持单引号)
    const parsed = parseJSONWithSingleQuotes(text)
    if (parsed !== null) {
      return JSON.stringify(parsed, null, 2)
    }
    
    // If not valid JSON, extract JSON objects/arrays from text

    const jsonObjects = []
    let currentJson = ''
    let braceCount = 0
    let bracketCount = 0
    let inString = false
    let stringChar = null // 记录字符串引号类型 (' 或 ")
    let escaped = false
    let inJson = false

    for (let i = 0; i < text.length; i++) {
      const char = text[i]

      if (escaped) {
        escaped = false
        if (inJson) currentJson += char
        continue
      }

      if (char === '\\' && inString) {
        escaped = true
        if (inJson) currentJson += char
        continue
      }

      if ((char === '"' || char === "'") && !escaped) {
        if (!inString) {
          inString = true
          stringChar = char
        } else if (char === stringChar) {
          inString = false
          stringChar = null
        }
        if (inJson) currentJson += char
        continue
      }

      if (!inString) {
        if (char === '{') {
          if (!inJson) {
            inJson = true
            currentJson = char
            braceCount = 1
          } else {
            braceCount++
            currentJson += char
          }
        } else if (char === '[') {
          if (!inJson) {
            inJson = true
            currentJson = char
            bracketCount = 1
          } else {
            bracketCount++
            currentJson += char
          }
        } else if (char === '}' && inJson) {
          braceCount--
          currentJson += char
          if (braceCount === 0 && bracketCount === 0) {
            // Complete JSON object found
            const parsed = parseJSONWithSingleQuotes(currentJson.trim())
            if (parsed !== null) {
              jsonObjects.push(JSON.stringify(parsed, null, 2))
            }
            inJson = false
            currentJson = ''
          }
        } else if (char === ']' && inJson) {
          bracketCount--
          currentJson += char
          if (braceCount === 0 && bracketCount === 0) {
            // Complete JSON array found
            const parsed = parseJSONWithSingleQuotes(currentJson.trim())
            if (parsed !== null) {
              jsonObjects.push(JSON.stringify(parsed, null, 2))
            }
            inJson = false
            currentJson = ''
          }
        } else if (inJson) {
          currentJson += char
        }
      } else if (inJson) {
        currentJson += char
      }
    }

    if (jsonObjects.length === 0) {
      // Try regex approach as fallback
      const jsonRegex = /(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\[[^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*\])/g
      const matches = text.match(jsonRegex) || []
      
      for (const match of matches) {
        const parsed = parseJSONWithSingleQuotes(match.trim())
        if (parsed !== null) {
          jsonObjects.push(JSON.stringify(parsed, null, 2))
        }
      }
    }

    if (jsonObjects.length === 0) return null
    
    // 如果开启了"只保留最长JSON"选项，返回最长的那个
    if (keepLongestJson && jsonObjects.length > 1) {
      const longestJson = jsonObjects.reduce((longest, current) => 
        current.length > longest.length ? current : longest
      )
      return longestJson
    }
    
    // 否则返回所有JSON，用换行分隔
    return jsonObjects.join('\n\n')
  }

  // 格式化功能：保留所有内容，但对其中的JSON进行格式化
  const formatMixedContent = (text) => {
    if (!text || typeof text !== 'string') return text

    // First, try to parse the entire text as JSON (支持单引号)
    const parsed = parseJSONWithSingleQuotes(text.trim())
    if (parsed !== null) {
      return JSON.stringify(parsed, null, 2)
    }
    
    // If not valid JSON, format JSON parts within the text

    let result = text
    let currentJson = ''
    let braceCount = 0
    let bracketCount = 0
    let inString = false
    let stringChar = null // 记录字符串引号类型 (' 或 ")
    let escaped = false
    let inJson = false
    let jsonStart = -1
    const jsonReplacements = []

    for (let i = 0; i < text.length; i++) {
      const char = text[i]

      if (escaped) {
        escaped = false
        if (inJson) currentJson += char
        continue
      }

      if (char === '\\' && inString) {
        escaped = true
        if (inJson) currentJson += char
        continue
      }

      if ((char === '"' || char === "'") && !escaped) {
        if (!inString) {
          inString = true
          stringChar = char
        } else if (char === stringChar) {
          inString = false
          stringChar = null
        }
        if (inJson) currentJson += char
        continue
      }

      if (!inString) {
        if (char === '{') {
          if (!inJson) {
            inJson = true
            jsonStart = i
            currentJson = char
            braceCount = 1
          } else {
            braceCount++
            currentJson += char
          }
        } else if (char === '[') {
          if (!inJson) {
            inJson = true
            jsonStart = i
            currentJson = char
            bracketCount = 1
          } else {
            bracketCount++
            currentJson += char
          }
        } else if (char === '}' && inJson) {
          braceCount--
          currentJson += char
          if (braceCount === 0 && bracketCount === 0) {
            // Complete JSON object found
            const parsed = parseJSONWithSingleQuotes(currentJson.trim())
            if (parsed !== null) {
              const formattedJson = JSON.stringify(parsed, null, 2)
              jsonReplacements.push({
                start: jsonStart,
                end: i + 1,
                original: currentJson,
                formatted: formattedJson
              })
            }
            inJson = false
            currentJson = ''
            jsonStart = -1
          }
        } else if (char === ']' && inJson) {
          bracketCount--
          currentJson += char
          if (braceCount === 0 && bracketCount === 0) {
            // Complete JSON array found
            const parsed = parseJSONWithSingleQuotes(currentJson.trim())
            if (parsed !== null) {
              const formattedJson = JSON.stringify(parsed, null, 2)
              jsonReplacements.push({
                start: jsonStart,
                end: i + 1,
                original: currentJson,
                formatted: formattedJson
              })
            }
            inJson = false
            currentJson = ''
            jsonStart = -1
          }
        } else if (inJson) {
          currentJson += char
        }
      } else if (inJson) {
        currentJson += char
      }
    }

    // Apply replacements from end to start to maintain correct indices
    jsonReplacements.reverse().forEach(replacement => {
      result = result.substring(0, replacement.start) + 
               replacement.formatted + 
               result.substring(replacement.end)
    })

    return result
  }

  const handleAction2 = async () => {
    if (!activeFileId || isLoading) return

    setLoading(true)
    let result
    try {
      switch (currentTool) {
        case 'json':
          result = await CompressJSON(content)
          if (result.error) {
            showToast(result.error, 'error')
          } else {
            updateFileContent(activeFileId, result.result)
            showToast(t('messages.success.jsonCompressed'), 'success')
          }
          break

        case 'xml':
          result = await XMLToJSON(content)
          if (result.error) {
            showToast(result.error, 'error')
          } else {
            updateFileContent(activeFileId, result.result)
            showToast(t('messages.success.xmlToJson'), 'success')
          }
          break

        case 'base64':
          result = await DecodeBase64(content)
          if (result.error) {
            showToast(result.error, 'error')
          } else {
            updateFileContent(activeFileId, result.result)
            showToast(t('messages.success.base64Decoded'), 'success')
          }
          break
      }
    } finally {
      setLoading(false)
    }
  }

  const handleHTTPSend = async () => {
    if (!activeFileId) return

    // Improved HTTP parser
    const lines = content.split('\n')
    const firstLine = lines[0].trim()

    // Parse first line: METHOD URL or METHOD path
    const firstSpaceIndex = firstLine.indexOf(' ')
    if (firstSpaceIndex === -1) {
      showToast(t('messages.errors.invalidHttpFormat'), 'error')
      return
    }

    const method = firstLine.substring(0, firstSpaceIndex).toUpperCase()
    let urlOrPath = firstLine.substring(firstSpaceIndex + 1).trim()

    // Remove HTTP version if present (e.g., "HTTP/1.1")
    const httpVersionIndex = urlOrPath.lastIndexOf(' HTTP/')
    if (httpVersionIndex !== -1) {
      urlOrPath = urlOrPath.substring(0, httpVersionIndex).trim()
    }

    // Determine full URL
    let url = urlOrPath
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // Check if Host header exists
      let host = 'localhost'
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line === '') break
        if (line.toLowerCase().startsWith('host:')) {
          host = line.substring(5).trim()
          break
        }
      }
      url = `http://${host}${urlOrPath.startsWith('/') ? '' : '/'}${urlOrPath}`
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      showToast(t('messages.errors.invalidUrl', { url }), 'error')
      return
    }

    const headers = {}
    let bodyStart = 0

    // Parse headers
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line === '') {
        bodyStart = i + 1
        break
      }
      const colonIndex = line.indexOf(':')
      if (colonIndex !== -1) {
        const key = line.substring(0, colonIndex).trim()
        const value = line.substring(colonIndex + 1).trim()
        if (key && value) headers[key] = value
      }
    }

    const body = lines.slice(bodyStart).join('\n')

    try {
      setLoading(true)
      const response = await SendHTTPRequest({
        method: method || 'GET',
        url,
        headers,
        body,
      })

      // Save response to store for preview
      setHTTPResponse(activeFileId, response)

      if (response.error) {
        showToast(response.error, 'error')
      } else {
        // Show response status in toast
        const durationText = response.duration ? `${response.duration}ms` : ''
        showToast(`Status: ${response.status} ${response.statusCode} ${durationText}`, 'success')
        // Ensure preview is visible to show response
        if (!isPreviewVisible) {
          togglePreview()
        }
      }
      
      // Auto-save after receiving response (force save even if not dirty)
      try {
        await saveFile(activeFileId, true)
      } catch (error) {
        console.error('Auto-save failed:', error)
      }
    } catch (err) {
      showToast(`Request failed: ${err}`, 'error')
      // Save error response
      setHTTPResponse(activeFileId, {
        error: `Request failed: ${err}`,
        status: 'Error',
        statusCode: 0,
        headers: {},
        body: '',
        duration: 0,
      })
      
      // Auto-save even on error (force save even if not dirty)
      try {
        await saveFile(activeFileId, true)
      } catch (error) {
        console.error('Auto-save failed:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (activeFileId && content) {
      const result = await copyToClipboard(content)
      if (result.success) {
        showToast(t('messages.success.copiedToClipboard'), 'success')
      } else {
        showToast(result.error || t('messages.errors.copyFailed'), 'error')
      }
    }
  }

  const handlePaste = async () => {
    if (activeFileId && editorRef) {
      const editor = editorRef
      if (editor.systemClipboard) {
        await editor.systemClipboard.paste()
      }
    }
  }

  const getActionLabels = () => {
    switch (currentTool) {
      case 'json':
        return { btn1: t('toolbar.format'), btn2: t('toolbar.compress'), btn3: t('toolbar.filter') }
      case 'xml':
        return { btn1: t('toolbar.format'), btn2: t('toolbar.toJson') }
      case 'base64':
        return { btn1: t('toolbar.encode'), btn2: t('toolbar.decode') }
      case 'http':
        return { btn1: t('toolbar.send'), btn2: t('toolbar.save') }
      default:
        return { btn1: 'Action 1', btn2: 'Action 2' }
    }
  }

  const labels = getActionLabels()

  return (
    <div className="h-10 border-b border-macos-border bg-macos-bg flex items-center px-4 gap-2">
      {/* Action Buttons */}
      <button
        onClick={handleAction1}
        disabled={!activeFileId || isLoading}
        className="px-3 py-1 bg-macos-accent text-white rounded text-xs
          hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="json-format-btn"
      >
        {isLoading ? '加载中...' : labels.btn1}
      </button>

      {currentTool !== 'http' && (
        <button
          onClick={handleAction2}
          disabled={!activeFileId || isLoading}
          className="px-3 py-1 bg-macos-item-hover text-macos-text-main rounded text-xs
            hover:bg-macos-item-active disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {labels.btn2}
        </button>
      )}

      {currentTool === 'json' && (
        <button
          onClick={handleJSONFilter}
          disabled={!activeFileId || isLoading}
          className="px-3 py-1 bg-macos-item-hover text-macos-text-main rounded text-xs
            hover:bg-macos-item-active disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          title={t('toolbar.filterTooltip')}
          data-testid="json-filter-btn"
        >
          <Filter size={12} />
          {labels.btn3}
        </button>
      )}

      <div className="flex-1" />

      {/* Right side buttons */}
      <button
        onClick={openGlobalSearch}
        className="px-3 py-1 bg-macos-item-hover text-macos-text-main rounded text-xs
          hover:bg-macos-item-active flex items-center gap-1"
        title={t('toolbar.globalSearchTooltip')}
      >
        <Search size={12} />
        {t('toolbar.search')}
      </button>

      <button
        onClick={handleCopy}
        disabled={!activeFileId}
        className="px-3 py-1 bg-macos-item-hover text-macos-text-main rounded text-xs
          hover:bg-macos-item-active flex items-center gap-1 disabled:opacity-50"
      >
        <Copy size={12} />
        {t('toolbar.copy')}
      </button>

      <button
        onClick={handlePaste}
        disabled={!activeFileId}
        className="px-3 py-1 bg-macos-item-hover text-macos-text-main rounded text-xs
          hover:bg-macos-item-active flex items-center gap-1 disabled:opacity-50"
      >
        <div className="w-3 h-3 flex items-center justify-center text-xs font-bold">P</div>
        {t('toolbar.paste')}
      </button>

      <button
        onClick={togglePreview}
        className={`px-3 py-1 rounded text-xs flex items-center gap-1
          ${
            isPreviewVisible
              ? 'bg-macos-accent text-white'
              : 'bg-macos-item-hover text-macos-text-main hover:bg-macos-item-active'
          }
        `}
      >
        <Eye size={12} />
        {t('toolbar.preview')}
      </button>
    </div>
  )
}

export default Toolbar
