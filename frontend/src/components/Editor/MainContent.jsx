import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../../store/useAppStore'
import TabBar from './TabBar'
import Toolbar from './Toolbar'
import Editor from './Editor'
import Preview from './Preview'

/**
 * MainContent Component
 *
 * Contains:
 * - Tab bar for open files
 * - Toolbar with action buttons
 * - Code editor
 * - Preview panel (optional)
 * - Resizable preview panel with drag handle
 */
function MainContent() {
  const { isPreviewVisible, previewWidth, setPreviewWidth } = useAppStore()
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef(null)

  // Handle mouse move during resize
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return

      const container = resizeRef.current?.parentElement
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      const newWidth = containerRect.width - (e.clientX - containerRect.left)
      
      // Constrain width between 200px and 80% of container width
      const minWidth = 200
      const maxWidth = containerRect.width * 0.8
      const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
      
      setPreviewWidth(constrainedWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
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
    <div 
      className="flex-1 flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--macos-bg)' }} // [修复] 强制使用 CSS 变量背景
    >
      {/* Tabs */}
      <TabBar />

      {/* Toolbar */}
      <Toolbar />

      {/* Workspace (Editor + Preview) */}
      <div className="flex flex-1 overflow-hidden" ref={resizeRef}>
        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Editor />
        </div>

        {/* Resize Handle */}
        {isPreviewVisible && (
          <div
            onMouseDown={handleMouseDown}
            className="w-1 bg-macos-border hover:bg-macos-accent cursor-col-resize transition-colors"
            style={{ WebkitAppRegion: 'no-drag' }}
          />
        )}

        {/* Preview */}
        {isPreviewVisible && <Preview />}
      </div>
    </div>
  )
}

export default MainContent