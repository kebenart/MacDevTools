import { useEffect, useRef } from 'react'

/**
 * ContextMenu Component
 *
 * macOS-style context menu with:
 * - Rounded corners
 * - Shadow and blur
 * - Auto-positioning to stay in viewport
 */
function ContextMenu({ x, y, items, onClose }) {
  const menuRef = useRef(null)

  useEffect(() => {
    // Close on click outside
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose()
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [onClose])

  // Adjust position to stay in viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let adjustedX = x
      let adjustedY = y

      if (rect.right > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 10
      }

      if (rect.bottom > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 10
      }

      menuRef.current.style.left = `${adjustedX}px`
      menuRef.current.style.top = `${adjustedY}px`
    }
  }, [x, y])

  return (
    <div
      ref={menuRef}
      className="fixed z-[1000] min-w-[160px] bg-macos-explorer border border-macos-border
        rounded-md shadow-lg py-1 backdrop-blur-xl"
      style={{
        left: x,
        top: y,
      }}
    >
      {items.map((item, index) => {
        if (item.separator) {
          return (
            <div
              key={`separator-${index}`}
              className="h-px bg-macos-border my-1"
            />
          )
        }

        return (
          <button
            key={index}
            onClick={item.onClick}
            className={`w-full text-left px-4 py-1.5 text-sm transition-colors flex items-center justify-between
              ${
                item.danger
                  ? 'text-macos-error hover:bg-macos-error hover:text-white'
                  : 'text-macos-text-main hover:bg-macos-accent hover:text-white'
              }
            `}
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-macos-text-sub ml-4">{item.shortcut}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default ContextMenu
