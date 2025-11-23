import { useAppStore } from '../../store/useAppStore'
import { useTranslation } from '../../constants/translations'
import { X } from 'lucide-react'

/**
 * Preview Component
 *
 * Shows formatted preview of content:
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
  } = useAppStore()
  const { t } = useTranslation()

  if (!isPreviewVisible) return null

  const content = activeFileId ? getFileContent(activeFileId) : ''

  const renderPreview = () => {
    if (!activeFileId || !content) {
      return (
        <div className="text-macos-text-sub text-sm text-center mt-10">
          {t('preview.noFileSelected')}
        </div>
      )
    }

    switch (currentTool) {
      case 'json':
        try {
          const parsed = JSON.parse(content)
          return (
            <pre className="text-xs font-mono whitespace-pre-wrap">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          )
        } catch {
          return (
            <div className="text-macos-error text-sm">{t('preview.invalidJson')}</div>
          )
        }

      case 'xml':
        return (
          <pre className="text-xs font-mono whitespace-pre-wrap">
            {content}
          </pre>
        )

      case 'base64':
        try {
          // Check if content is valid base64
          const trimmed = content.trim()
          if (!/^[A-Za-z0-9+/]*={0,2}$/.test(trimmed)) {
            return (
              <div className="text-macos-error text-sm">{t('preview.invalidBase64')}</div>
            )
          }
          const decoded = atob(trimmed)
          // Check for binary content
          const hasBinary = /[\x00-\x08\x0E-\x1F]/.test(decoded)
          return (
            <div>
              <div className="text-xs text-macos-text-sub mb-2">{t('preview.decoded')}</div>
              {hasBinary ? (
                <div className="text-macos-text-sub text-sm">
                  {t('preview.binaryContent')} ({decoded.length} bytes)
                </div>
              ) : (
                <pre className="text-xs font-mono whitespace-pre-wrap">{decoded}</pre>
              )}
            </div>
          )
        } catch {
          return (
            <div className="text-macos-error text-sm">{t('preview.invalidBase64')}</div>
          )
        }

      case 'http':
        return (
          <div className="text-xs font-mono">
            <div className="text-macos-text-sub mb-2">{t('preview.requestPreview')}</div>
            <pre className="whitespace-pre-wrap">{content}</pre>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="w-[400px] flex-shrink-0 bg-macos-explorer border-l border-macos-border flex flex-col">
      {/* Header */}
      <div className="h-8 border-b border-macos-border flex items-center justify-between px-4">
        <span className="text-xs font-bold text-macos-text-sub uppercase tracking-wider">
          {t('preview.title')}
        </span>
        <button
          onClick={togglePreview}
          className="text-macos-text-sub hover:text-macos-text-main"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">{renderPreview()}</div>
    </div>
  )
}

export default Preview
