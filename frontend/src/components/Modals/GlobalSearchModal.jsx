import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useTranslation } from '../../constants/translations'
import { X, Search } from 'lucide-react'

/**
 * GlobalSearchModal Component
 *
 * Search & Replace across all files:
 * - Cmd+Shift+F to open
 * - Search all files in all tools
 * - Replace functionality with confirmation
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
  } = useAppStore()
  const { t } = useTranslation()

  const [searchQuery, setSearchQuery] = useState('')
  const [replaceQuery, setReplaceQuery] = useState('')
  const [results, setResults] = useState([])

  if (!isGlobalSearchOpen) return null

  const performSearch = () => {
    if (!searchQuery) {
      setResults([])
      return
    }

    const matches = []

    const traverse = (items, toolName) => {
      items.forEach((item) => {
        if (item.type === 'folder' && item.children) {
          traverse(item.children, toolName)
        } else if (item.type === 'file') {
          const content = item.content.toLowerCase()
          const query = searchQuery.toLowerCase()

          if (content.includes(query)) {
            const count = content.split(query).length - 1
            matches.push({
              fileId: item.id,
              fileName: item.name,
              toolName,
              count,
            })
          }
        }
      })
    }

    Object.keys(fileSystem).forEach((tool) => {
      traverse(fileSystem[tool], tool)
    })

    setResults(matches)
  }

  const performReplace = () => {
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

    results.forEach((result) => {
      const file = findItemById(fileSystem[result.toolName], result.fileId)
      if (file) {
        const newContent = file.content.replaceAll(searchQuery, replaceQuery)
        if (newContent !== file.content) {
          updateFileContent(result.fileId, newContent)
          const count = file.content.split(searchQuery).length - 1
          totalReplacements += count
        }
      }
    })

    alert(t('globalSearch.replaceSuccess', { count: totalReplacements }))
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
              className="px-4 py-2 bg-macos-accent text-white rounded text-sm
                hover:brightness-110 flex items-center gap-2"
            >
              <Search size={14} />
              {t('globalSearch.search')}
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
              {searchQuery ? t('globalSearch.noMatches') : t('globalSearch.enterQuery')}
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
