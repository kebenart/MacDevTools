import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useTranslation } from '../../constants/translations'
import { X, Search } from 'lucide-react'
// 引入后端搜索方法
import { GlobalSearch, ReadFileContent, SaveFileContent } from '../../wailsjs/go/main/App'

/**
 * GlobalSearchModal Component
 */
function GlobalSearchModal() {
  const {
    isGlobalSearchOpen,
    closeGlobalSearch,
    fileSystem,
    findItemById,
    openFile,
    updateFileContent,
    setCurrentTool,
    currentTool,
    getFileContent,
    storagePath,
  } = useAppStore()
  const { t } = useTranslation()

  const [searchQuery, setSearchQuery] = useState('')
  const [replaceQuery, setReplaceQuery] = useState('')
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false) // 添加搜索状态

  if (!isGlobalSearchOpen) return null

  // [修复] 使用后端搜索
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

  const performReplace = async () => {
    if (!searchQuery || !confirm(
      t('globalSearch.confirmReplace', { 
        search: searchQuery, 
        replace: replaceQuery, 
        count: results.length 
      })
    )) {
      return
    }

    let totalReplacements = 0

    // Process each result file
    for (const result of results) {
      try {
        // Get file path
        const file = findItemById(fileSystem[result.toolName], result.fileId)
        if (!file || !file.path) {
          continue
        }

        // Read file content from disk
        const readResult = await ReadFileContent(file.path)
        if (!readResult.success || !readResult.data) {
          continue
        }

        let content = readResult.data
        const originalContent = content

        // Perform replacement (case-sensitive)
        // Count occurrences before replacement
        const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
        const matches = content.match(regex)
        const matchCount = matches ? matches.length : 0

        if (matchCount > 0) {
          // Replace all occurrences
          content = content.replace(regex, replaceQuery)
          
          // Save the file
          const saveResult = await SaveFileContent(file.path, content)
          if (saveResult.success) {
            totalReplacements += matchCount
            
            // Update in-memory cache if file is open
            const cachedContent = getFileContent(result.fileId)
            if (cachedContent) {
              updateFileContent(result.fileId, content)
            }
          }
        }
      } catch (error) {
        console.error(`Failed to replace in file ${result.fileId}:`, error)
      }
    }

    alert(t('globalSearch.replaceSuccess', { count: totalReplacements }) || `已替换 ${totalReplacements} 处`)
    performSearch() // Refresh results
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
              disabled={isSearching}
              className="px-4 py-2 bg-macos-accent text-white rounded text-sm
                hover:brightness-110 flex items-center gap-2 disabled:opacity-50"
            >
              <Search size={14} />
              {isSearching ? '搜索中...' : t('globalSearch.search')}
            </button>
            <button
              onClick={performReplace}
              disabled={results.length === 0}
              className="px-4 py-2 bg-macos-error text-white rounded text-sm
                hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
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