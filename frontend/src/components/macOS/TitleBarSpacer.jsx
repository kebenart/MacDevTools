import { Sun, Moon } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

/**
 * TitleBarSpacer Component
 *
 * Provides spacing for macOS traffic lights (red/yellow/green buttons)
 * in Wails TitleBarHiddenInset mode.
 *
 * IMPORTANT: This area must be draggable to allow window movement.
 */
function TitleBarSpacer() {
  const { theme, toggleTheme } = useAppStore()

  return (
    <div
      className="h-[38px] w-full draggable flex-shrink-0 relative"
      style={{
        WebkitAppRegion: 'drag',
        background: 'transparent',
      }}
    >
      {/* Theme Toggle Button - Right side */}
      <button
        onClick={toggleTheme}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded
          text-macos-text-sub hover:text-macos-text-main hover:bg-macos-item-hover
          transition-colors z-10"
        style={{
          WebkitAppRegion: 'no-drag', // Make button non-draggable
        }}
        title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
      >
        {theme === 'dark' ? (
          <Sun size={16} />
        ) : (
          <Moon size={16} />
        )}
      </button>
    </div>
  )
}

export default TitleBarSpacer
