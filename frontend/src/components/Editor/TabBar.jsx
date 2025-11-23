import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useTranslation } from '../../constants/translations'
import { X } from 'lucide-react'

/**
 * TabBar Component
 *
 * Displays tabs for all open files with:
 * - Active tab highlighting
 * - Dirty indicator (unsaved changes)
 * - Close button
 * - Horizontal scrolling (hidden scrollbar)
 * - Right-click context menu
 */
function TabBar() {
  const {
    openTabs,
    activeFileId,
    openFile,
    closeTab,
    closeAllTabs,
    closeOtherTabs,
    closeLeftTabs,
    closeRightTabs,
    isFileDirty,
    currentTool,
  } = useAppStore()
  const { t } = useTranslation()

  const [contextMenu, setContextMenu] = useState(null)
  const containerRef = useRef(null)

  // 关闭右键菜单
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // 处理右键菜单
  const handleContextMenu = (e, tab) => {
    e.preventDefault()
    const tabIndex = openTabs.findIndex((t) => t.id === tab.id)

    const items = [
      {
        label: t('tabs.close'),
        onClick: () => closeTab(tab.id),
      },
      {
        label: t('tabs.closeOthers'),
        onClick: () => closeOtherTabs(tab.id),
        disabled: openTabs.length <= 1,
      },
      { separator: true },
      {
        label: t('tabs.closeLeft'),
        onClick: () => closeLeftTabs(tab.id),
        disabled: tabIndex === 0,
      },
      {
        label: t('tabs.closeRight'),
        onClick: () => closeRightTabs(tab.id),
        disabled: tabIndex === openTabs.length - 1,
      },
      { separator: true },
      {
        label: t('tabs.closeAll'),
        onClick: () => closeAllTabs(),
      },
    ]

    setContextMenu({ x: e.clientX, y: e.clientY, items })
  }

  if (openTabs.length === 0) {
    return (
      <div className="h-9 bg-macos-explorer border-b border-macos-border flex items-center px-4">
        <span className="text-xs text-macos-text-sub">{t('explorer.noFilesOpen')}</span>
      </div>
    )
  }

  return (
    <>
      <div
        ref={containerRef}
        className="h-9 bg-macos-explorer border-b border-macos-border flex items-end px-2 gap-px overflow-x-auto scrollbar-hide"
        style={{
          scrollbarWidth: 'none', /* Firefox */
          msOverflowStyle: 'none', /* IE and Edge */
        }}
      >
        <style>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {openTabs.map((tab) => {
          const isActive = activeFileId === tab.id
          const isDirty = isFileDirty(tab.id)

          return (
            <div
              key={tab.id}
              onClick={() => openFile(tab.id, currentTool)}
              onContextMenu={(e) => handleContextMenu(e, tab)}
              className={`
                h-[34px] px-3 flex items-center gap-2 cursor-pointer
                min-w-[120px] max-w-[200px] border-r border-macos-border
                transition-colors group flex-shrink-0
                ${
                  isActive
                    ? 'bg-macos-bg text-macos-text-main border-t-2 border-t-macos-accent'
                    : 'bg-macos-tab-inactive text-macos-text-sub hover:bg-macos-bg border-t-2 border-t-transparent'
                }
              `}
            >
              <span className="text-xs truncate flex-1">{tab.name}</span>

              {/* Dirty indicator or close button */}
              <div className="w-4 h-4 flex items-center justify-center">
                {isDirty ? (
                  <div className="w-2 h-2 bg-macos-text-main rounded-full" />
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      closeTab(tab.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:bg-macos-item-hover rounded"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-[1000] min-w-[160px] bg-macos-explorer border border-macos-border rounded-md shadow-lg py-1 backdrop-blur-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.items.map((item, index) => {
            if (item.separator) {
              return <div key={`sep-${index}`} className="h-px bg-macos-border my-1" />
            }

            return (
              <button
                key={index}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick()
                    setContextMenu(null)
                  }
                }}
                disabled={item.disabled}
                className={`w-full text-left px-4 py-1.5 text-sm transition-colors
                  ${
                    item.disabled
                      ? 'text-macos-text-sub opacity-50 cursor-not-allowed'
                      : 'text-macos-text-main hover:bg-macos-accent hover:text-white'
                  }
                `}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}

export default TabBar
