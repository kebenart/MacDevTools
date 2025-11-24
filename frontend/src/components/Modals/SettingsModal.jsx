import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useTranslation } from '../../constants/translations'
import { X, RotateCcw, Edit2, Save, Folder, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { OpenFileDialog, SaveFileDialog } from '../../wailsjs/go/main/App'
import { shortcutActions, formatShortcut, getShortcutText } from '../../constants/translations'

/**
 * SettingsModal Component
 *
 * Includes:
 * - Theme toggle (Light/Dark)
 * - Auto-save toggle
 * - Storage path selection
 * - Backup/Restore with native macOS file dialogs
 * - About info
 */
function SettingsModal() {
  const {
    isSettingsOpen,
    closeSettings,
    theme,
    language,
    setLanguage,
    toggleTheme,
    autoSave,
    toggleAutoSave,
    shortcuts,
    updateShortcut,
    resetShortcuts,
    exportBackup,
    importBackup,
    storagePath,
    selectStorageDirectory,
    openStorageInFinder,
  } = useAppStore()
  const { t } = useTranslation()

  const [editingShortcut, setEditingShortcut] = useState(null)
  const [tempShortcut, setTempShortcut] = useState({})
  const [shortcutsExpanded, setShortcutsExpanded] = useState(false) // 默认折叠

  // 处理快捷键编辑
  const startEditShortcut = (action) => {
    setEditingShortcut(action)
    setTempShortcut({})
  }

  const cancelEditShortcut = () => {
    setEditingShortcut(null)
    setTempShortcut({})
  }

  const handleKeyDown = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Skip modifier keys only (don't set key if only modifiers are pressed)
    if (['Control', 'Meta', 'Alt', 'Shift', 'Command', 'Cmd'].includes(e.key)) {
      return
    }
    
    // Normalize key name
    let keyName = e.key
    if (keyName === ' ') {
      keyName = 'Space'
    } else if (keyName.length > 1) {
      // Handle special keys like 'Enter', 'Backspace', etc.
      keyName = keyName
    }
    
    // Build modifiers array
    const modifiers = []
    if (e.metaKey) modifiers.push('meta')
    if (e.ctrlKey) modifiers.push('ctrl')
    if (e.altKey) modifiers.push('alt')
    if (e.shiftKey) modifiers.push('shift')
    
    // Convert to old format (key + modifiers array)
    const newShortcut = {
      key: keyName,
      modifiers: modifiers,
    }
    
    setTempShortcut(newShortcut)
  }

  const saveShortcut = () => {
    if (editingShortcut && tempShortcut.key) {
      // Convert to old format if needed
      const shortcutToSave = tempShortcut.modifiers 
        ? { key: tempShortcut.key, modifiers: tempShortcut.modifiers }
        : tempShortcut
      updateShortcut(editingShortcut, shortcutToSave)
      setEditingShortcut(null)
      setTempShortcut({})
    }
  }

  if (!isSettingsOpen) return null

  // 渲染快捷键列表
  const renderShortcuts = () => {
    return Object.keys(shortcutActions).map((action) => {
      const shortcutInfo = getShortcutText(action, shortcuts, t)
      const isEditing = editingShortcut === action

      return (
        <div key={action} className="flex items-center justify-between py-2 px-3 bg-macos-input rounded">
          <div className="flex-1">
            <div className="text-sm font-medium text-macos-text-main">
              {shortcutInfo.name}
            </div>
            <div className="text-xs text-macos-text-sub">
              {shortcutInfo.description}
            </div>
          </div>
          
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formatShortcut(tempShortcut)}
                onKeyDown={handleKeyDown}
                placeholder="按下新的快捷键..."
                className="px-3 py-1 bg-macos-bg border border-macos-border rounded text-macos-text-main text-sm w-32 focus:outline-none focus:border-macos-accent"
                autoFocus
              />
              <button
                onClick={saveShortcut}
                className="p-1 text-macos-accent hover:bg-macos-item-hover rounded"
                title={t('toolbar.save')}
              >
                <Save size={16} />
              </button>
              <button
                onClick={cancelEditShortcut}
                className="p-1 text-macos-error hover:bg-macos-item-hover rounded"
                title="取消"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-macos-bg border border-macos-border rounded text-macos-text-main text-sm font-mono">
                {shortcutInfo.keys}
              </span>
              <button
                onClick={() => startEditShortcut(action)}
                className="p-1 text-macos-text-sub hover:text-macos-text-main"
                title={t('toolbar.format')}
              >
                <Edit2 size={14} />
              </button>
            </div>
          )}
        </div>
      )
    })
  }

  const handleImport = async () => {
    try {
      const data = await OpenFileDialog()
      if (!data) return // User cancelled

      if (
        confirm(
          t('confirm.importOverwrite')
        )
      ) {
        const success = importBackup(data)
        if (success) {
          alert(t('messages.success.backupRestored'))
          closeSettings()
        } else {
          alert(t('messages.errors.importFailed'))
        }
      }
    } catch (err) {
      alert(`${t('messages.errors.importFailed')}: ${err}`)
    }
  }

  const handleExport = async () => {
    try {
      const data = exportBackup()
      await SaveFileDialog(data)
      alert(t('messages.success.backupExported'))
    } catch (err) {
      alert(`${t('messages.errors.exportFailed')}: ${err}`)
    }
  }



  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={closeSettings}
    >
      <div
        className="bg-macos-explorer border border-macos-border rounded-lg shadow-2xl
          w-[450px] max-h-[600px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-12 border-b border-macos-border flex items-center justify-between px-5">
          <span className="font-bold text-macos-text-main">{t('settings.title')}</span>
          <button
            onClick={closeSettings}
            className="text-macos-text-sub hover:text-macos-text-main"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-hide">
          {/* Language */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-macos-text-main">
                语言
              </div>
              <div className="text-xs text-macos-text-sub">
                选择应用界面语言
              </div>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="px-3 py-1 bg-macos-input border border-macos-border rounded text-macos-text-main text-sm focus:outline-none focus:border-macos-accent"
            >
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>
          </div>

          {/* Appearance */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-macos-text-main">
                {t('settings.theme')}
              </div>
              <div className="text-xs text-macos-text-sub">
                {theme === 'dark' ? t('settings.darkMode') : t('settings.lightMode')}
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                theme === 'light' ? 'bg-macos-accent' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  theme === 'light' ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Auto Save */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-macos-text-main">
                {t('settings.autoSave')}
              </div>
              <div className="text-xs text-macos-text-sub">
                {t('settings.autoSaveDescription')}
              </div>
            </div>
            <button
              onClick={toggleAutoSave}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                autoSave ? 'bg-macos-accent' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  autoSave ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Storage Path */}
          <div className="border-t border-macos-border pt-5">
            <div className="text-xs font-bold text-macos-text-sub uppercase tracking-wider mb-3">
              {t('settings.storagePath') || '存储位置'}
            </div>
            <div className="flex items-center gap-2 p-3 bg-macos-input rounded border border-macos-border">
              <Folder size={16} className="text-macos-text-sub flex-shrink-0" />
              <span className="text-sm text-macos-text-main truncate flex-1" title={storagePath}>
                {storagePath || '未设置'}
              </span>
              <button
                onClick={openStorageInFinder}
                className="p-1 text-macos-text-sub hover:text-macos-text-main"
                title={t('explorer.showInFinder') || '在 Finder 中显示'}
              >
                <ExternalLink size={14} />
              </button>
            </div>
            <button
              onClick={selectStorageDirectory}
              className="mt-2 w-full px-4 py-2 bg-macos-item-hover text-macos-text-main rounded text-sm hover:bg-macos-item-active"
            >
              {t('settings.changeStoragePath') || '更改存储位置'}
            </button>
            <div className="text-xs text-macos-text-sub mt-2">
              {t('settings.storagePathDescription') || '文件将存储在此目录下的 json、xml、base64、http 子文件夹中'}
            </div>
          </div>

          {/* Shortcuts */}
          <div className="border-t border-macos-border pt-5">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setShortcutsExpanded(!shortcutsExpanded)}
                className="flex items-center gap-2 text-xs font-bold text-macos-text-sub uppercase tracking-wider hover:text-macos-text-main transition-colors"
              >
                {shortcutsExpanded ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
                {t('settings.shortcuts')}
              </button>
              {shortcutsExpanded && (
                <button
                  onClick={resetShortcuts}
                  className="flex items-center gap-1 px-3 py-1 bg-macos-item-hover text-macos-text-sub rounded text-xs hover:bg-macos-item-active hover:text-macos-text-main"
                >
                  <RotateCcw size={12} />
                  重置全部
                </button>
              )}
            </div>
            {shortcutsExpanded && (
              <div className="space-y-2">
                {renderShortcuts()}
              </div>
            )}
          </div>

          {/* Data Management */}
          <div className="border-t border-macos-border pt-5">
            <div className="text-xs font-bold text-macos-text-sub uppercase tracking-wider mb-3">
              {t('settings.dataManagement')}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleExport}
                className="flex-1 px-4 py-2 bg-macos-accent text-white rounded text-sm
                  hover:brightness-110"
              >
                {t('settings.exportBackup')}
              </button>
              <button
                onClick={handleImport}
                className="flex-1 px-4 py-2 bg-macos-item-hover text-macos-text-main rounded text-sm
                  hover:bg-macos-item-active"
              >
                {t('settings.importBackup')}
              </button>
            </div>
            <div className="text-xs text-macos-text-sub mt-2">
              {t('settings.backupWarning')}
            </div>
          </div>

          {/* About */}
          <div className="border-t border-macos-border pt-5">
            <div className="text-xs font-bold text-macos-text-sub uppercase tracking-wider mb-3">
              {t('settings.about')}
            </div>
            <div className="text-sm text-macos-text-main space-y-1">
              <div className="font-bold">{t('settings.appName')}</div>
              <div className="text-xs text-macos-text-sub">{t('settings.version')}: 1.0.0 (Beta)</div>
              <div className="text-xs text-macos-text-sub">{t('settings.author')}: Keben</div>
              <div className="text-xs text-macos-text-sub">{t('settings.license')}: MIT</div>
              <div className="text-xs text-macos-text-sub mt-2 leading-relaxed">
                {t('settings.description')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal
