import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useTranslation } from '../../constants/translations'
import { X, Search, Loader2 } from 'lucide-react'
// 引入后端方法
import { GlobalSearch, ReadFileContent, SaveFileContent, ShowConfirmDialog, ShowMessageDialog } from '../../wailsjs/go/main/App'

// 正则转义辅助函数
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * GlobalSearchModal Component
 * * 全局搜索与替换
 * - 搜索：使用 Go 后端遍历
 * - 替换：智能判断文件状态（已打开/未打开）进行处理
 */
function GlobalSearchModal() {
  const {
    isGlobalSearchOpen,
    closeGlobalSearch,
    fileSystem,
    fileContents, // 获取文件内容缓存
    findItemById,
    openFile,
    updateFileContent,
    setCurrentTool,
    currentTool,
  } = useAppStore()
  const { t } = useTranslation()

  const [searchQuery, setSearchQuery] = useState('')
  const [replaceQuery, setReplaceQuery] = useState('')
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isReplacing, setIsReplacing] = useState(false)

  if (!isGlobalSearchOpen) return null

  // 执行后端搜索
  const performSearch = async () => {
    if (!searchQuery) {
      setResults([])
      return
    }

    setIsSearching(true)
    try {
      // 调用 Go 后端进行搜索
      const matches = await GlobalSearch(searchQuery)
      setResults(matches || [])
    } catch (error) {
      console.error("Search failed:", error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // 执行智能替换
  const performReplace = async () => {
    if (!searchQuery) {
      await ShowMessageDialog('提示', '请输入要搜索的内容')
      return
    }
    
    const confirmMessage = t('globalSearch.confirmReplace', { 
      search: searchQuery, 
      replace: replaceQuery, 
      count: results.length 
    }) || `确定要将 "${searchQuery}" 替换为 "${replaceQuery}" 吗？\n这将影响 ${results.length} 个文件。`
    
    const userChoice = await ShowConfirmDialog('确认替换', confirmMessage)
    if (userChoice !== '确定') {
      return
    }

    setIsReplacing(true)
    let totalReplacements = 0
    let processedFiles = 0
    let failedFiles = 0
    
    // 创建不区分大小写的正则（为了匹配搜索结果）
    const searchRegex = new RegExp(escapeRegExp(searchQuery), 'gi')

    try {
      // 遍历所有搜索结果
      for (const result of results) {
        try {
          const item = findItemById(fileSystem[result.toolName], result.fileId)
          if (!item || !item.path) {
            console.warn(`File not found: ${result.fileId}`)
            failedFiles++
            continue
          }

          let content = ''
          let isFileOpen = false

          // 1. 检查文件是否已在编辑器中打开（有缓存）
          const cachedFile = fileContents[result.fileId]
          if (cachedFile && cachedFile.content) {
            content = cachedFile.content
            isFileOpen = true
          } else {
            // 2. 未打开的文件，从磁盘读取
            const resp = await ReadFileContent(item.path)
            if (resp && resp.success && resp.data) {
              content = resp.data
            } else {
              console.warn(`Failed to read file: ${item.path}`, resp)
              failedFiles++
              continue
            }
          }

          if (!content) {
            console.warn(`Empty content for file: ${item.path}`)
            failedFiles++
            continue
          }

          // 3. 执行替换
          // 检查是否真的包含内容（不区分大小写）
          const matches = content.match(searchRegex)
          if (!matches || matches.length === 0) {
            console.warn(`No matches found in file: ${item.path} (may be case mismatch)`)
            continue
          }

          const count = matches.length
          const newContent = content.replace(searchRegex, replaceQuery)
          
          if (newContent === content) {
            console.warn(`No changes after replace in file: ${item.path}`)
            continue
          }

          totalReplacements += count

          // 4. 保存更改
          if (isFileOpen) {
            // 如果文件已打开，更新 Store（这会触发自动保存逻辑，并更新 UI）
            updateFileContent(result.fileId, newContent)
            processedFiles++
          } else {
            // 如果文件未打开，直接写入磁盘
            const saveResp = await SaveFileContent(item.path, newContent)
            if (saveResp && saveResp.success) {
              processedFiles++
            } else {
              console.error(`Failed to save file ${item.path}:`, saveResp)
              failedFiles++
            }
          }
        } catch (err) {
          console.error(`Error processing file ${result.fileId}:`, err)
          failedFiles++
        }
      }

      // 显示结果
      let message = `已替换 ${totalReplacements} 处，处理了 ${processedFiles} 个文件`
      if (failedFiles > 0) {
        message += `，${failedFiles} 个文件处理失败`
      }
      await ShowMessageDialog('替换完成', message)
      
      // 替换完成后重新搜索以刷新列表
      await performSearch()

    } catch (error) {
      console.error("Replace failed:", error)
      await ShowMessageDialog('替换失败', "替换失败: " + (error.message || error))
    } finally {
      setIsReplacing(false)
    }
  }

  const handleResultClick = (result) => {
    if (currentTool !== result.toolName) {
      setCurrentTool(result.toolName)
    }
    openFile(result.fileId, result.toolName)
    closeGlobalSearch()
  }

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={closeGlobalSearch}
    >
      <div
        className="bg-macos-explorer border border-macos-border rounded-lg shadow-2xl
          w-[600px] h-[500px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-12 border-b border-macos-border flex items-center justify-between px-5">
          <span className="font-bold text-macos-text-main">{t('globalSearch.title')}</span>
          <button
            onClick={closeGlobalSearch}
            className="text-macos-text-sub hover:text-macos-text-main"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Inputs */}
        <div className="p-5 border-b border-macos-border space-y-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && performSearch()}
            placeholder={t('globalSearch.searchPlaceholder')}
            className="w-full px-3 py-2 bg-macos-input border border-macos-border
              rounded text-sm text-macos-text-main placeholder-macos-text-sub
              focus:outline-none focus:border-macos-accent"
            autoFocus
          />

          <input
            type="text"
            value={replaceQuery}
            onChange={(e) => setReplaceQuery(e.target.value)}
            placeholder={t('globalSearch.replacePlaceholder')}
            className="w-full px-3 py-2 bg-macos-input border border-macos-border
              rounded text-sm text-macos-text-main placeholder-macos-text-sub
              focus:outline-none focus:border-macos-accent"
          />

          <div className="flex gap-3 justify-end">
            <button
              onClick={performSearch}
              disabled={isSearching || isReplacing}
              className="px-4 py-2 bg-macos-accent text-white rounded text-sm
                hover:brightness-110 flex items-center gap-2 disabled:opacity-50"
            >
              {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              {isSearching ? '搜索中...' : t('globalSearch.search')}
            </button>
            <button
              onClick={performReplace}
              disabled={results.length === 0 || isReplacing}
              className="px-4 py-2 bg-macos-error text-white rounded text-sm
                hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isReplacing && <Loader2 size={14} className="animate-spin" />}
              {t('globalSearch.replaceAll')}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-5">
          {results.length === 0 ? (
            <div className="text-center text-macos-text-sub text-sm mt-10">
              {searchQuery ? (isSearching ? '搜索中...' : t('globalSearch.noMatches')) : t('globalSearch.enterQuery')}
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={`${result.fileId}-${index}`}
                  onClick={() => handleResultClick(result)}
                  className="p-3 bg-macos-input hover:bg-macos-item-hover
                    rounded cursor-pointer border border-transparent
                    hover:border-macos-accent transition-all"
                >
                  <div className="text-xs text-macos-text-sub mb-1">
                    {result.toolName.toUpperCase()} / {result.fileName}
                  </div>
                  <div className="text-sm text-macos-text-main font-medium">
                    {result.count} {result.count === 1 ? t('globalSearch.match') : t('globalSearch.matches')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GlobalSearchModal