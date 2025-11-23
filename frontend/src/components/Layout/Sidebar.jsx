import { useAppStore } from '../../store/useAppStore'
import { useTranslation } from '../../constants/translations'
import { Braces, Code, Binary, Globe, Settings } from 'lucide-react'

const getToolsConfig = (t) => [
  { id: 'json', icon: Braces, title: t('tools.json') },
  { id: 'xml', icon: Code, title: t('tools.xml') },
  { id: 'base64', icon: Binary, title: t('tools.base64') },
  { id: 'http', icon: Globe, title: t('tools.http') },
]

/**
 * Sidebar Component
 *
 * Left-side tool selector with macOS backdrop blur effect
 * IMPORTANT: Uses semi-transparent background with backdrop-filter
 * to achieve native macOS sidebar appearance.
 */
function Sidebar() {
  const { currentTool, setCurrentTool, openSettings } = useAppStore()
  const { t } = useTranslation()

  const toolsConfig = getToolsConfig(t)

  return (
    <div
      className="w-[60px] flex-shrink-0 flex flex-col items-center pt-12 backdrop-macos"
      style={{
        background: 'var(--macos-sidebar)',
        borderRight: '1px solid var(--macos-border)',
      }}
    >
      {/* Tool Icons */}
      <div className="flex flex-col items-center gap-2">
        {toolsConfig.map((tool) => {
          const Icon = tool.icon
          const isActive = currentTool === tool.id

          return (
            <button
              key={tool.id}
              onClick={() => setCurrentTool(tool.id)}
              title={tool.title}
              className="w-12 h-12 flex items-center justify-center rounded-lg transition-all duration-200"
              style={{
                backgroundColor: isActive ? 'var(--macos-accent)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--macos-text-sub)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--macos-text-main)'
                  e.currentTarget.style.backgroundColor = 'var(--macos-item-hover)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--macos-text-sub)'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              <Icon size={20} />
            </button>
          )
        })}
      </div>

      {/* Bottom: Settings */}
      <div className="mt-auto mb-5">
        <button
          onClick={openSettings}
          title={t('sidebar.settingsTooltip')}
          className="w-12 h-12 flex items-center justify-center rounded-lg transition-all duration-200"
          style={{
            color: 'var(--macos-text-sub)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--macos-text-main)'
            e.currentTarget.style.backgroundColor = 'var(--macos-item-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--macos-text-sub)'
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <Settings size={20} />
        </button>
      </div>
    </div>
  )
}

export default Sidebar
