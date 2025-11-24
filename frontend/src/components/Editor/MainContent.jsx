import { useState, useRef, useEffect } from 'react'
import TabBar from './TabBar'
import Toolbar from './Toolbar'
import Editor from './Editor'
import Preview from './Preview'
import { useAppStore } from '../../store/useAppStore'

/**
 * MainContent Component
 *
 * Contains:
 * - Tab bar for open files
 * - Toolbar with action buttons
 * - Code editor
 * - Preview panel (optional)
 * - Resizable preview panel
 */
function MainContent() {
  const { isPreviewVisible, previewWidth, setPreviewWidth } = useAppStore()
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef(null)

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e) => {
      e.preventDefault()
      e.stopPropagation()

      const container = resizeRef.current
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      // Calculate width from right edge of container to mouse position
      const newWidth = containerRect.right - e.clientX

      // Constrain width between 200px and 80% of container
      const minWidth = 200
      const maxWidth = containerRect.width * 0.8
      const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))

      setPreviewWidth(constrainedWidth)
    }

    const handleMouseUp = (e) => {
      e.preventDefault()
      e.stopPropagation()
      setIsResizing(false)
    }

    // Use capture phase and passive: false to ensure we can preventDefault
    document.addEventListener('mousemove', handleMouseMove, { capture: true, passive: false })
    document.addEventListener('mouseup', handleMouseUp, { capture: true, passive: false })
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, { capture: true })
      document.removeEventListener('mouseup', handleMouseUp, { capture: true })
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, setPreviewWidth])

  const handleMouseDown = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
  }

  return (
    <div className="flex-1 flex flex-col bg-macos-bg overflow-hidden">
      {/* Tabs */}
      <TabBar />

      {/* Toolbar */}
      <Toolbar />

      {/* Workspace (Editor + Preview) */}
      <div className="flex flex-1 overflow-hidden relative" ref={resizeRef}>
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Editor />
        </div>
        {isPreviewVisible && (
          <>
            {/* Resize handle - wider for easier grabbing */}
            <div
              data-resize-handle
              onMouseDown={handleMouseDown}
              onMouseEnter={(e) => {
                if (!isResizing) {
                  e.currentTarget.style.backgroundColor = 'var(--macos-accent)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isResizing) {
                  e.currentTarget.style.backgroundColor = 'var(--macos-border)'
                }
              }}
              className="w-2 cursor-col-resize transition-colors flex-shrink-0 relative z-20"
              style={{
                backgroundColor: isResizing ? 'var(--macos-accent)' : 'var(--macos-border)',
                minHeight: '100%',
              }}
              title="拖拽调整预览框宽度"
            />
            <Preview />
          </>
        )}
      </div>
    </div>
  )
}

export default MainContent
