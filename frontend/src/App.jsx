import { useEffect, useCallback } from 'react'
import { useAppStore } from './store/useAppStore'
import { useMacShortcuts } from './hooks/useMacShortcuts'
import TitleBarSpacer from './components/macOS/TitleBarSpacer'
import Sidebar from './components/Layout/Sidebar'
import FileExplorer from './components/Explorer/FileExplorer'
import MainContent from './components/Editor/MainContent'
import SettingsModal from './components/Modals/SettingsModal'
import GlobalSearchModal from './components/Modals/GlobalSearchModal'
import Toast from './components/UI/Toast'
import ErrorBoundary from './components/UI/ErrorBoundary'

function App() {
  const { theme, language, initialize, refreshFileList } = useAppStore()

  // Initialize file system on mount
  useEffect(() => {
    initialize()
  }, [initialize])

  // Enable macOS shortcuts
  useMacShortcuts()

  // 窗口聚焦时刷新文件列表，同步本地文件系统变化
  useEffect(() => {
    const handleFocus = () => {
      refreshFileList()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refreshFileList])

  // Apply theme class to document
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
  }, [theme])

  // Apply language to document
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  return (
    <ErrorBoundary>
      <div className="w-screen h-screen flex flex-col bg-macos-bg overflow-hidden">
        {/* macOS Title Bar Spacer (for traffic lights) */}
        <TitleBarSpacer />

        {/* Main Application Window */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <Sidebar />

          {/* File Explorer */}
          <FileExplorer />

          {/* Main Content Area (Editor, Tabs, Preview) */}
          <MainContent />
        </div>

        {/* Modals */}
        <SettingsModal />
        <GlobalSearchModal />

        {/* Toast notifications */}
        <Toast />
      </div>
    </ErrorBoundary>
  )
}

export default App
