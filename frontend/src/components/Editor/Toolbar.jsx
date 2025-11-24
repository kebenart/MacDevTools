import { useAppStore } from '../../store/useAppStore'
import { useTranslation } from '../../constants/translations'
import { Copy, Search, Eye } from 'lucide-react'
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
    editorRef,
  } = useAppStore()
  const { t } = useTranslation()

  const content = activeFileId ? getFileContent(activeFileId) : ''

  const handleAction1 = async () => {
    if (!activeFileId || isLoading) return

    setLoading(true)
    let result
    try {
      switch (currentTool) {
        case 'json':
          result = await FormatJSON(content)
          if (result.error) {
            showToast(result.error, 'error')
          } else {
            updateFileContent(activeFileId, result.result)
            showToast(t('messages.success.jsonFormatted'), 'success')
          }
          break

        case 'xml':
          result = await FormatXML(content)
          if (result.error) {
            showToast(result.error, 'error')
          } else {
            updateFileContent(activeFileId, result.result)
            showToast(t('messages.success.xmlFormatted'), 'success')
          }
          break

        case 'base64':
          result = await EncodeBase64(content)
          updateFileContent(activeFileId, result.result)
          showToast(t('messages.success.base64Encoded'), 'success')
          break

        case 'http':
          // Parse HTTP request and send
          await handleHTTPSend()
          break
      }
    } finally {
      setLoading(false)
    }
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
      const response = await SendHTTPRequest({
        method: method || 'GET',
        url,
        headers,
        body,
      })

      if (response.error) {
        showToast(response.error, 'error')
      } else {
        // Show response status and truncated body
        const bodyPreview = response.body.length > 500
          ? response.body.substring(0, 500) + '...(truncated)'
          : response.body
        showToast(`Status: ${response.status}\n\n${bodyPreview}`, 'success')
      }
    } catch (err) {
      showToast(`Request failed: ${err}`, 'error')
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
        return { btn1: t('toolbar.format'), btn2: t('toolbar.compress') }
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
        data-format-action="true"
        className="px-3 py-1 bg-macos-accent text-white rounded text-xs
          hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
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
