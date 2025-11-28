import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useTranslation } from '../../constants/translations'
import { ChevronRight, Folder, File, ChevronsDownUp } from 'lucide-react'
import ContextMenu from './ContextMenu'
import { ShowDeleteConfirmDialog } from '../../wailsjs/go/main/App'

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
    toggleAllFolders,
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
  const [allFoldersExpanded, setAllFoldersExpanded] = useState(false)
  const [justRenamed, setJustRenamed] = useState(false)
  const fileListRef = useRef(null)

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

  // Handle file selection - 第一次单击仅聚焦，第二次单击才操作
  const handleItemClick = (e, item) => {
    e.stopPropagation()
    
    // 如果点击的是文件夹左侧的图标，只切换文件夹状态
    if (e.target.closest('.folder-chevron')) {
      if (item.type === 'folder') {
        toggleFolder(item.id)
      }
      return
    }
    
    // 如果正在重命名，不处理点击
    if (renamingItem === item.id) {
      return
    }
    
    const currentTime = Date.now()
    const timeDiff = currentTime - lastClickTime
    const isSameItem = selectedItem?.id === item.id
    const isAlreadySelected = isSameItem
    
    // 如果已经选中了这个项目，再次单击应该直接执行操作
    if (isAlreadySelected && timeDiff > 300) {
      // 已经选中，且不是快速双击，直接执行操作
      if (item.type === 'file') {
        // 文件：打开文件并聚焦编辑器
        openFile(item.id, currentTool).then(() => {
          // 聚焦编辑器
          setTimeout(() => {
            const { editorRef } = useAppStore.getState()
            if (editorRef) {
              editorRef.focus()
            }
          }, 100)
        }).catch(() => {
          // 忽略错误
        })
      } else {
        // 文件夹：展开/收起
        toggleFolder(item.id)
      }
      setLastClickTime(currentTime)
      return
    }
    
    // 更新选中状态（总是执行）
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
    
    // 判断是否为双击（300ms内且是同一个项目）
    if (timeDiff < 300 && isSameItem) {
      // 双击：执行操作
      if (item.type === 'file') {
        // 文件：打开文件并聚焦编辑器
        openFile(item.id, currentTool).then(() => {
          // 聚焦编辑器
          setTimeout(() => {
            const { editorRef } = useAppStore.getState()
            if (editorRef) {
              editorRef.focus()
            }
          }, 100)
        }).catch(() => {
          // 忽略错误
        })
      } else {
        // 文件夹：展开/收起
        toggleFolder(item.id)
      }
    }
    // 第一次单击：只选中，不执行操作
    
    setLastClickTime(currentTime)
  }
  
  // Handle Enter key
  const handleKeyDown = (e) => {
    // 如果正在重命名，不处理回车键（让输入框自己处理）
    if (renamingItem) {
      return
    }

    // 如果刚完成重命名，不处理回车键（防止触发文件夹折叠）
    if (justRenamed) {
      return
    }

    // 如果焦点在输入框内，不处理
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return
    }

    if (e.key === 'Enter' && selectedItem) {
      e.preventDefault()
      e.stopPropagation()

      if (selectedItem.type === 'folder') {
        // 文件夹：折叠/展开
        toggleFolder(selectedItem.id)
      } else {
        // 文件：打开文件并聚焦编辑器
        openFile(selectedItem.id, currentTool).then(() => {
          // 聚焦编辑器
          setTimeout(() => {
            const { editorRef } = useAppStore.getState()
            if (editorRef) {
              editorRef.focus()
            }
          }, 100)
        }).catch(() => {
          // 忽略错误
        })
      }
    }
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

    // 设置标志表示刚完成重命名，防止Enter事件触发文件夹折叠
    setJustRenamed(true)
    setTimeout(() => {
      setJustRenamed(false)
    }, 100)
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
        onClick: async () => {
          hideContextMenu()
          const itemsToDelete = selectedItems.length > 0 ? selectedItems : [folder]
          const itemNames = itemsToDelete.map(item => item.name).join(', ')
          const confirmMessage = itemsToDelete.length === 1 
            ? `确定要删除文件夹 "${folder.name}" 及其所有内容吗？`
            : `确定要删除以下 ${itemsToDelete.length} 个项目吗？\n${itemNames}`
          
          try {
            const result = await ShowDeleteConfirmDialog(confirmMessage)
            if (result === '删除') {
              await Promise.all(itemsToDelete.map(item => deleteItem(item)))
            }
          } catch (error) {
            console.error('Delete confirmation error:', error)
          }
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
        onClick: async () => {
          hideContextMenu()
          const itemsToDelete = selectedItems.length > 0 ? selectedItems : [file]
          const itemNames = itemsToDelete.map(item => item.name).join(', ')
          const confirmMessage = itemsToDelete.length === 1 
            ? `确定要删除文件 "${file.name}" 吗？`
            : `确定要删除以下 ${itemsToDelete.length} 个文件吗？\n${itemNames}`
          
          try {
            const result = await ShowDeleteConfirmDialog(confirmMessage)
            if (result === '删除') {
              await Promise.all(itemsToDelete.map(item => deleteItem(item)))
            }
          } catch (error) {
            console.error('Delete confirmation error:', error)
          }
        },
        danger: true,
      },
    ]

    setContextMenu({ x: e.clientX, y: e.clientY, items })
  }

  // 切换所有文件夹展开/收起状态
  const handleToggleAllFolders = () => {
    const newState = !allFoldersExpanded
    setAllFoldersExpanded(newState)
    toggleAllFolders(newState)
  }
  
  // 检查所有文件夹是否都展开
  useEffect(() => {
    const checkAllExpanded = (items) => {
      for (const item of items) {
        if (item.type === 'folder') {
          if (!item.expanded) return false
          if (item.children && !checkAllExpanded(item.children)) return false
        }
      }
      return true
    }
    
    const allExpanded = currentFiles.length > 0 && checkAllExpanded(currentFiles)
    setAllFoldersExpanded(allExpanded)
  }, [fileSystem, currentTool, currentFiles])

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
                className={`transition-transform flex-shrink-0 folder-chevron cursor-pointer ${item.expanded ? 'rotate-90' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleFolder(item.id)
                }}
              />
              <Folder size={14} style={{ color: 'var(--macos-text-sub)' }} className="flex-shrink-0" />
              {isRenaming ? (
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => confirmRename(item)}
                onKeyDown={(e) => {
                  // [修改] 添加 e.stopPropagation() 阻止事件冒泡
                  if (e.key === 'Enter') {
                    e.stopPropagation() // 防止冒泡触发全局快捷键或其他父级点击事件
                    confirmRename(item)
                  }
                  if (e.key === 'Escape') {
                    e.stopPropagation()
                    cancelRename()
                  }
                }}
                // [修改] 点击输入框时也阻止冒泡，防止触发选中切换逻辑
                onClick={(e) => e.stopPropagation()} 
                className="flex-1 text-sm bg-macos-input border border-macos-accent rounded px-1 outline-none"
                style={{ color: 'var(--macos-text-main)' }}
                autoFocus
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
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => confirmRename(item)}
                  onKeyDown={(e) => {
                    // [修复] 阻止冒泡，防止触发其他组件的事件
                    if (e.key === 'Enter') {
                      e.stopPropagation()
                      confirmRename(item)
                    }
                    if (e.key === 'Escape') {
                      e.stopPropagation()
                      cancelRename()
                    }
                  }}
                  className="flex-1 text-sm bg-macos-input border border-macos-accent rounded px-1 outline-none"
                  style={{ color: 'var(--macos-text-main)' }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
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
        <div className="h-9 flex items-center justify-between px-5 mt-10">
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: 'var(--macos-text-sub)' }}
          >
            {toolsConfig[currentTool].title}
          </span>
          <button
            onClick={handleToggleAllFolders}
            className="p-1 rounded hover:bg-macos-item-hover transition-colors"
            style={{ color: 'var(--macos-text-sub)' }}
            title={allFoldersExpanded ? '收起所有文件夹' : '展开所有文件夹'}
          >
            <ChevronsDownUp size={14} />
          </button>
        </div>

        {/* File List */}
        <div
          ref={fileListRef}
          className="flex-1 overflow-y-auto pt-1"
          onContextMenu={handleBackgroundContext}
          onClick={handleBackgroundClick}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
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
