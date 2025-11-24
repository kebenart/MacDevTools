import { useState, useEffect } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useTranslation } from '../../constants/translations'
import { ChevronRight, Folder, File } from 'lucide-react'
import ContextMenu from './ContextMenu'

const getToolsConfig = (t) => ({
  json: { ext: '.json', title: t('explorer.jsonFiles') },
  xml: { ext: '.xml', title: t('explorer.xmlFiles') },
  base64: { ext: '.base', title: t('explorer.base64Files') },
  http: { ext: '.http', title: t('explorer.httpRequests') },
})

/**
 * FileExplorer Component
 *
 * Displays file tree with:
 * - Folder expand/collapse
 * - Right-click context menus
 * - Active file highlighting
 * - Copy/Cut/Paste support
 * - Inline rename
 * - Keyboard shortcuts support
 */
function FileExplorer() {
  const {
    currentTool,
    fileSystem,
    activeFileId,
    isExplorerVisible,
    openFile,
    toggleFolder,
    createFile,
    createFolder,
    deleteItem,
    renameItem,
    openInFinder,
    isFileDirty,
    copyItem,
    cutItem,
    pasteItem,
    duplicateItem,
    clipboard,
    storagePath,
    // 选中和重命名状态
    selectedItem,
    setSelectedItem,
    renamingItemId,
    clearRenaming,
  } = useAppStore()
  const { t } = useTranslation()

  const [contextMenu, setContextMenu] = useState(null)
  const [renamingItem, setRenamingItem] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [lastClickTime, setLastClickTime] = useState(0)

  const currentFiles = fileSystem[currentTool] || []
  const toolsConfig = getToolsConfig(t)

  // 监听从 store 触发的重命名请求（来自快捷键）
  useEffect(() => {
    if (renamingItemId) {
      // 在当前文件系统中查找对应的项目
      const findItem = (items, id) => {
        for (const item of items) {
          if (item.id === id) return item
          if (item.children) {
            const found = findItem(item.children, id)
            if (found) return found
          }
        }
        return null
      }

      const item = findItem(currentFiles, renamingItemId)
      if (item) {
        setRenamingItem(item.id)
        // 文件只编辑不带后缀的名字，文件夹编辑完整名字
        const { baseName } = getNameParts(item.name, item.type === 'folder')
        setRenameValue(baseName)
      }
      clearRenaming()
    }
  }, [renamingItemId, clearRenaming, currentFiles])

  if (!isExplorerVisible) return null

  const hideContextMenu = () => setContextMenu(null)

  // 获取文件名和扩展名
  const getNameParts = (name, isFolder) => {
    if (isFolder) return { baseName: name, ext: '' }
    const lastDot = name.lastIndexOf('.')
    if (lastDot <= 0) return { baseName: name, ext: '' }
    return {
      baseName: name.substring(0, lastDot),
      ext: name.substring(lastDot),
    }
  }

  // Start renaming
  const startRename = (item) => {
    setRenamingItem(item.id)
    // 文件只编辑不带后缀的名字，文件夹编辑完整名字
    const { baseName } = getNameParts(item.name, item.type === 'folder')
    setRenameValue(baseName)
    hideContextMenu()
  }

  // Handle file selection
  const handleItemClick = (e, item) => {
    e.stopPropagation()
    
    const currentTime = Date.now()
    const timeDiff = currentTime - lastClickTime
    
    if (timeDiff < 300) { // Double click detected
      // Open file on double click
      if (item.type === 'file') {
        openFile(item.id, currentTool)
      } else {
        toggleFolder(item.id)
      }
    } else { // Single click
      // Select item on single click
      if (e.metaKey || e.shiftKey) {
        // Multi-select support
        setSelectedItems(prev => {
          if (e.shiftKey && prev.length > 0) {
            // Range selection (simplified - just add current item)
            return [...prev, item]
          } else {
            // Toggle selection with Cmd key
            const isSelected = prev.some(selected => selected.id === item.id)
            return isSelected ? prev.filter(selected => selected.id !== item.id) : [...prev, item]
          }
        })
      } else {
        // Single selection
        setSelectedItems([item])
      }
      setSelectedItem(item)
    }
    
    setLastClickTime(currentTime)
  }

  // Clear selection when clicking on empty area
  const handleBackgroundClick = (e) => {
    if (e.target === e.currentTarget) {
      setSelectedItems([])
      setSelectedItem(null)
    }
  }

  // Confirm rename
  const confirmRename = async (item) => {
    const { ext } = getNameParts(item.name, item.type === 'folder')
    const newName = item.type === 'folder' ? renameValue : renameValue + ext

    if (newName && newName !== item.name) {
      await renameItem(item, newName)
    }
    setRenamingItem(null)
    setRenameValue('')
  }

  // Cancel rename
  const cancelRename = () => {
    setRenamingItem(null)
    setRenameValue('')
  }

  // Background right-click (create new file/folder)
  const handleBackgroundContext = (e) => {
    e.preventDefault()
    const items = [
      {
        label: t('explorer.newFile') || '新建文件',
        onClick: () => {
          createFile('', currentTool)
          hideContextMenu()
        },
      },
      {
        label: t('explorer.newFolder') || '新建文件夹',
        onClick: () => {
          createFolder('', 'NewFolder')
          hideContextMenu()
        },
      },
    ]

    // Add paste option if clipboard has content
    if (clipboard) {
      items.push({ separator: true })
      items.push({
        label: t('explorer.paste') || '粘贴',
        onClick: () => {
          const toolPath = `${storagePath}/${currentTool}`
          pasteItem(toolPath)
          hideContextMenu()
        },
      })
    }

    setContextMenu({ x: e.clientX, y: e.clientY, items })
  }

  // Folder right-click
  const handleFolderContext = (e, folder) => {
    e.preventDefault()
    e.stopPropagation()

    const items = [
      {
        label: t('explorer.newFileInFolder') || '在此新建文件',
        onClick: () => {
          createFile(folder.path, currentTool)
          hideContextMenu()
        },
      },
      {
        label: t('explorer.newFolderInFolder') || '在此新建文件夹',
        onClick: () => {
          createFolder(folder.path, 'NewFolder')
          hideContextMenu()
        },
      },
      { separator: true },
      {
        label: t('explorer.copy') || '复制',
        shortcut: '⌘C',
        onClick: () => {
          copyItem(folder)
          hideContextMenu()
        },
      },
      {
        label: t('explorer.cut') || '剪切',
        shortcut: '⌘X',
        onClick: () => {
          cutItem(folder)
          hideContextMenu()
        },
      },
    ]

    // Add paste option if clipboard has content
    if (clipboard) {
      items.push({
        label: t('explorer.paste') || '粘贴',
        shortcut: '⌘V',
        onClick: () => {
          pasteItem(folder.path)
          hideContextMenu()
        },
      })
    }

    items.push(
      {
        label: t('explorer.duplicate') || '创建副本',
        shortcut: '⌘D',
        onClick: () => {
          duplicateItem(folder)
          hideContextMenu()
        },
      },
      { separator: true },
      {
        label: t('explorer.rename') || '重命名',
        onClick: () => startRename(folder),
      },
      {
        label: t('explorer.showInFinder') || '在 Finder 中显示',
        onClick: () => {
          openInFinder(folder)
          hideContextMenu()
        },
      },
      { separator: true },
      {
        label: t('explorer.delete') || '删除',
        onClick: () => {
          const itemsToDelete = selectedItems.length > 0 ? selectedItems : [folder]
          const itemNames = itemsToDelete.map(item => item.name).join(', ')
          const confirmMessage = itemsToDelete.length === 1 
            ? `确定要删除文件夹 "${folder.name}" 及其所有内容吗？`
            : `确定要删除以下 ${itemsToDelete.length} 个项目吗？\n${itemNames}`
          
          if (confirm(confirmMessage)) {
            itemsToDelete.forEach(item => deleteItem(item))
          }
          hideContextMenu()
        },
        danger: true,
      }
    )

    setContextMenu({ x: e.clientX, y: e.clientY, items })
  }

  // File right-click
  const handleFileContext = (e, file) => {
    e.preventDefault()
    e.stopPropagation()

    const items = [
      {
        label: t('explorer.copy') || '复制',
        shortcut: '⌘C',
        onClick: () => {
          copyItem(file)
          hideContextMenu()
        },
      },
      {
        label: t('explorer.cut') || '剪切',
        shortcut: '⌘X',
        onClick: () => {
          cutItem(file)
          hideContextMenu()
        },
      },
      {
        label: t('explorer.duplicate') || '创建副本',
        shortcut: '⌘D',
        onClick: () => {
          duplicateItem(file)
          hideContextMenu()
        },
      },
      { separator: true },
      {
        label: t('explorer.rename') || '重命名',
        onClick: () => startRename(file),
      },
      {
        label: t('explorer.showInFinder') || '在 Finder 中显示',
        onClick: () => {
          openInFinder(file)
          hideContextMenu()
        },
      },
      { separator: true },
      {
        label: t('explorer.delete') || '删除',
        onClick: () => {
          const itemsToDelete = selectedItems.length > 0 ? selectedItems : [file]
          const itemNames = itemsToDelete.map(item => item.name).join(', ')
          const confirmMessage = itemsToDelete.length === 1 
            ? `确定要删除文件 "${file.name}" 吗？`
            : `确定要删除以下 ${itemsToDelete.length} 个文件吗？\n${itemNames}`
          
          if (confirm(confirmMessage)) {
            itemsToDelete.forEach(item => deleteItem(item))
          }
          hideContextMenu()
        },
        danger: true,
      },
    ]

    setContextMenu({ x: e.clientX, y: e.clientY, items })
  }

  // Render file tree recursively
  const renderItems = (items, level = 0) => {
    return items.map((item) => {
      const isRenaming = renamingItem === item.id
      const isSelected = selectedItem?.id === item.id

      if (item.type === 'folder') {
        return (
          <div key={item.id}>
            <div
              className={`flex items-center gap-2 py-1 px-2 cursor-pointer transition-colors`}
              style={{
                paddingLeft: `${level * 12 + 8}px`,
                backgroundColor: selectedItems.some(selected => selected.id === item.id) ? 'var(--macos-item-hover)' : 'transparent',
              }}
              onClick={(e) => handleItemClick(e, item)}
              onContextMenu={(e) => {
                e.stopPropagation()
                setSelectedItem(item)
                setSelectedItems([item])
                handleFolderContext(e, item)
              }}
              onMouseEnter={(e) => {
                if (!isRenaming && !isSelected) e.currentTarget.style.backgroundColor = 'var(--macos-item-hover)'
              }}
              onMouseLeave={(e) => {
                if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <ChevronRight
                size={12}
                style={{ color: 'var(--macos-text-sub)' }}
                className={`transition-transform flex-shrink-0 ${item.expanded ? 'rotate-90' : ''}`}
              />
              <Folder size={14} style={{ color: 'var(--macos-text-sub)' }} className="flex-shrink-0" />
              {isRenaming ? (
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => confirmRename(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmRename(item)
                    if (e.key === 'Escape') cancelRename()
                  }}
                  className="flex-1 text-sm bg-macos-input border border-macos-accent rounded px-1 outline-none"
                  style={{ color: 'var(--macos-text-main)' }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="text-sm truncate" style={{ color: 'var(--macos-text-main)' }}>
                  {item.name}
                </span>
              )}
            </div>
            {item.expanded && item.children && renderItems(item.children, level + 1)}
          </div>
        )
      } else {
        const isActive = activeFileId === item.id
        const isDirty = isFileDirty(item.id)

        return (
          <div
            key={item.id}
            className={`flex items-center gap-2 py-1 px-2 cursor-pointer transition-colors`}
            style={{
              paddingLeft: `${level * 12 + 20}px`,
              backgroundColor: isActive ? 'var(--macos-item-active)' : selectedItems.some(selected => selected.id === item.id) ? 'var(--macos-item-hover)' : 'transparent',
              color: isActive ? '#ffffff' : 'var(--macos-text-main)',
            }}
            onClick={(e) => handleItemClick(e, item)}
            onContextMenu={(e) => {
              e.stopPropagation()
              setSelectedItem(item)
              setSelectedItems([item])
              handleFileContext(e, item)
            }}
            onMouseEnter={(e) => {
              if (!isActive && !isRenaming && !isSelected) {
                e.currentTarget.style.backgroundColor = 'var(--macos-item-hover)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive && !isSelected) {
                e.currentTarget.style.backgroundColor = 'transparent'
              }
            }}
          >
            <File size={14} style={{ color: 'var(--macos-text-sub)' }} className="flex-shrink-0" />
            {isRenaming ? (
              <div className="flex items-center flex-1 min-w-0">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => confirmRename(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmRename(item)
                    if (e.key === 'Escape') cancelRename()
                  }}
                  className="flex-1 min-w-0 text-sm bg-macos-input border border-macos-accent rounded px-1 outline-none"
                  style={{ color: 'var(--macos-text-main)' }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-sm flex-shrink-0" style={{ color: 'var(--macos-text-sub)' }}>
                  {getNameParts(item.name, false).ext}
                </span>
              </div>
            ) : (
              <>
                <span className="text-sm truncate">{getNameParts(item.name, false).baseName}</span>
                {isDirty && <span className="ml-auto text-xs flex-shrink-0">●</span>}
              </>
            )}
          </div>
        )
      }
    })
  }

  return (
    <>
      <div
        className="w-[220px] flex-shrink-0 flex flex-col"
        style={{
          backgroundColor: 'var(--macos-explorer)',
          borderRight: '1px solid var(--macos-border)',
        }}
        onClick={hideContextMenu}
      >
        {/* Header */}
        <div className="h-9 flex items-center px-5 mt-10">
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: 'var(--macos-text-sub)' }}
          >
            {toolsConfig[currentTool].title}
          </span>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto pt-1" onContextMenu={handleBackgroundContext} onClick={handleBackgroundClick}>
          {currentFiles.length === 0 ? (
            <div className="px-5 py-4 text-sm text-center" style={{ color: 'var(--macos-text-sub)' }}>
              {t('explorer.empty') || '右键创建文件'}
            </div>
          ) : (
            renderItems(currentFiles)
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={hideContextMenu}
        />
      )}
    </>
  )
}

export default FileExplorer
