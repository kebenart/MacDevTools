/**
 * TitleBarSpacer Component
 *
 * Provides spacing for macOS traffic lights (red/yellow/green buttons)
 * in Wails TitleBarHiddenInset mode.
 *
 * IMPORTANT: This area must be draggable to allow window movement.
 */
function TitleBarSpacer() {
  return (
    <div
      className="h-[38px] w-full draggable flex-shrink-0"
      style={{
        WebkitAppRegion: 'drag',
        background: 'transparent',
      }}
    />
  )
}

export default TitleBarSpacer
