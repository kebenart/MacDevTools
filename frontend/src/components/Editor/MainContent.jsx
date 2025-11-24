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
 */
function MainContent() {
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
      <div className="flex flex-1 overflow-hidden">
        <Editor />
        <Preview />
      </div>
    </div>
  )
}

export default MainContent