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
    <div className="flex-1 flex flex-col bg-macos-bg overflow-hidden">
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
