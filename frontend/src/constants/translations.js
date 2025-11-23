// 应用翻译配置
export const translations = {
  zh: {
    // 应用标题
    appTitle: 'MacDevTools',

    // 工具名称
    tools: {
      json: 'JSON',
      xml: 'XML',
      base64: 'Base64',
      http: 'HTTP',
    },

    // 侧边栏
    sidebar: {
      jsonTooltip: 'JSON 工具',
      xmlTooltip: 'XML 工具',
      base64Tooltip: 'Base64 工具',
      httpTooltip: 'HTTP 工具',
      settingsTooltip: '设置',
    },

    // 文件管理器
    explorer: {
      jsonFiles: 'JSON 文件',
      xmlFiles: 'XML 文件',
      base64Files: 'Base64 文件',
      httpRequests: 'HTTP 请求',
      newFile: '新建文件',
      newFolder: '新建文件夹',
      newFileInFolder: '在此处新建文件',
      newFolderInFolder: '在此处新建文件夹',
      rename: '重命名',
      delete: '删除',
      copy: '复制',
      cut: '剪切',
      paste: '粘贴',
      duplicate: '创建副本',
      showInFinder: '在 Finder 中显示',
      noFilesOpen: '没有打开的文件',
      empty: '右键创建文件',
    },

    // 编辑器
    editor: {
      noFileOpen: '没有打开的文件',
      noFileMessage: '创建新文件或从资源管理器中选择',
      untitled: '未命名',
      unsaved: '未保存',
      utf8: 'UTF-8',
    },

    // 工具栏
    toolbar: {
      format: '格式化',
      compress: '压缩',
      toJson: '转JSON',
      encode: '编码',
      decode: '解码',
      send: '发送',
      save: '保存',
      search: '搜索',
      copy: '复制',
      paste: '粘贴',
      preview: '预览',
      globalSearchTooltip: '全局搜索 (Cmd+Shift+F)',
    },

    // 预览
    preview: {
      title: '预览',
      noFileSelected: '没有选择文件',
      invalidJson: '无效的 JSON 格式',
      invalidXml: '无效的 XML 格式',
      invalidBase64: '无效的 Base64 格式',
      binaryContent: '检测到二进制内容',
      decoded: '解码结果：',
      requestPreview: '请求预览：',
    },

    // 标签页
    tabs: {
      close: '关闭',
      closeAll: '关闭所有',
      closeOthers: '关闭其他',
      closeLeft: '关闭左侧',
      closeRight: '关闭右侧',
    },

    // 全局搜索
    globalSearch: {
      title: '全局搜索与替换',
      searchPlaceholder: '在所有文件中搜索...',
      replacePlaceholder: '替换为...',
      search: '搜索',
      replaceAll: '全部替换',
      noMatches: '没有匹配结果',
      enterQuery: '输入关键词开始搜索',
      matches: '个匹配',
      match: '个匹配',
      confirmReplace: `确定要在 {count} 个文件中将 "{search}" 替换为 "{replace}" 吗？`,
      replaceSuccess: '已替换 {count} 处',
    },

    // 设置
    settings: {
      title: '设置',
      appearance: '外观',
      theme: '主题',
      darkMode: '深色模式',
      lightMode: '浅色模式',
      autoSave: '自动保存',
      autoSaveDescription: '自动保存更改',
      storagePath: '存储位置',
      changeStoragePath: '更改存储位置',
      storagePathDescription: '文件将存储在此目录下的 json、xml、base64、http 子文件夹中',
      dataManagement: '数据管理',
      exportBackup: '导出备份',
      importBackup: '导入备份',
      backupWarning: '* 导入将覆盖所有当前数据',
      shortcuts: '快捷键',
      about: '关于',
      appName: 'MacDevTools Pro',
      version: '版本',
      author: '作者',
      license: '许可证',
      description: '使用 Wails 和 React 构建的高性能开发者工具箱，旨在提供类似原生 macOS 应用的极致体验。',
    },

    // 快捷键
    shortcuts: {
      globalSearch: { name: '全局搜索', description: '在所有文件中搜索内容' },
      closeTab: { name: '关闭标签', description: '关闭当前打开的标签页' },
      togglePreview: { name: '切换预览', description: '显示或隐藏预览面板' },
      toggleExplorer: { name: '切换资源管理器', description: '显示或隐藏文件资源管理器' },
      switchToJson: { name: '切换到 JSON 工具', description: '切换到 JSON 工具面板' },
      switchToXml: { name: '切换到 XML 工具', description: '切换到 XML 工具面板' },
      switchToBase64: { name: '切换到 Base64 工具', description: '切换到 Base64 工具面板' },
      switchToHttp: { name: '切换到 HTTP 工具', description: '切换到 HTTP 工具面板' },
      openSettings: { name: '打开设置', description: '打开应用设置面板' },
      newFile: { name: '新建文件', description: '创建新文件' },
      newFolder: { name: '新建文件夹', description: '创建新文件夹' },
      save: { name: '保存', description: '保存当前文件' },
      saveAll: { name: '保存全部', description: '保存所有文件' },
      find: { name: '查找', description: '在当前文件中查找' },
      copy: { name: '复制', description: '复制选中的文件' },
      cut: { name: '剪切', description: '剪切选中的文件' },
      paste: { name: '粘贴', description: '粘贴文件' },
      duplicate: { name: '创建副本', description: '创建文件副本' },
      rename: { name: '重命名', description: '重命名选中的文件' },
      delete: { name: '删除', description: '删除选中的文件' },
    },

    // 消息提示
    messages: {
      success: {
        jsonFormatted: 'JSON 格式化成功',
        jsonCompressed: 'JSON 压缩成功',
        xmlFormatted: 'XML 格式化成功',
        xmlToJson: 'XML 转换为 JSON 成功',
        base64Encoded: 'Base64 编码成功',
        base64Decoded: 'Base64 解码成功',
        httpSent: 'HTTP 请求已发送',
        backupExported: '备份导出成功！',
        backupRestored: '备份恢复成功！',
        copiedToClipboard: '已复制到剪贴板',
        pastedFromClipboard: '已从剪贴板粘贴',
        cutToClipboard: '已剪切到剪贴板',
        copied: '已复制',
        cut: '已剪切',
        pasted: '粘贴成功',
        duplicated: '复制成功',
        renamed: '重命名成功',
        deleted: '删除成功',
        moved: '移动成功',
        fileSaved: '文件已保存',
        filesSaved: '已保存 {count} 个文件',
        storagePathUpdated: '存储路径已更新',
      },
      errors: {
        invalidJson: '无效的 JSON 格式',
        invalidXml: '无效的 XML 格式',
        invalidBase64: '无效的 Base64 格式',
        httpError: 'HTTP 请求失败',
        exportFailed: '导出失败',
        importFailed: '导入失败',
        invalidFileFormat: '文件格式不正确',
        invalidHttpFormat: '无效的 HTTP 请求格式，期望：方法 URL',
        invalidUrl: '无效的 URL：{url}',
        requestTimeout: '请求超时：服务器在 30 秒内未响应',
        connectionRefused: '连接被拒绝：无法连接到 {url}',
        dnsError: 'DNS 错误：找不到 {url} 的主机',
        clipboardEmpty: '剪贴板为空',
        copyFailed: '复制失败',
        pasteFailed: '粘贴失败',
        cutFailed: '剪切失败',
        operationFailed: '操作失败',
        renameFailed: '重命名失败',
        deleteFailed: '删除失败',
        createFileFailed: '创建文件失败',
        createFolderFailed: '创建文件夹失败',
        saveFailed: '保存失败',
        openFinderFailed: '打开 Finder 失败',
        setStoragePathFailed: '设置存储路径失败',
      },
      info: {
        operationSuccess: '操作成功',
        requestCompleted: '请求完成',
        copiedToClipboard: '已复制到剪贴板',
      },
    },

    // 确认对话框
    confirm: {
      deleteFolder: '确定要删除文件夹 "{name}" 及其所有内容吗？',
      deleteFile: '确定要删除文件 "{name}" 吗？',
      importOverwrite: '导入将覆盖当前所有文件，确定继续吗？',
    },
  },

  en: {
    appTitle: 'MacDevTools',
    tools: {
      json: 'JSON',
      xml: 'XML',
      base64: 'Base64',
      http: 'HTTP',
    },
    sidebar: {
      jsonTooltip: 'JSON Tools',
      xmlTooltip: 'XML Tools',
      base64Tooltip: 'Base64 Tools',
      httpTooltip: 'HTTP Tools',
      settingsTooltip: 'Settings',
    },
    explorer: {
      jsonFiles: 'JSON Files',
      xmlFiles: 'XML Files',
      base64Files: 'Base64 Files',
      httpRequests: 'HTTP Requests',
      newFile: 'New File',
      newFolder: 'New Folder',
      newFileInFolder: 'New File Here',
      newFolderInFolder: 'New Folder Here',
      rename: 'Rename',
      delete: 'Delete',
      copy: 'Copy',
      cut: 'Cut',
      paste: 'Paste',
      duplicate: 'Duplicate',
      showInFinder: 'Show in Finder',
      noFilesOpen: 'No files open',
      empty: 'Right-click to create file',
    },
    editor: {
      noFileOpen: 'No file open',
      noFileMessage: 'Create a new file or select from explorer',
      untitled: 'Untitled',
      unsaved: 'Unsaved',
      utf8: 'UTF-8',
    },
    toolbar: {
      format: 'Format',
      compress: 'Compress',
      toJson: 'To JSON',
      encode: 'Encode',
      decode: 'Decode',
      send: 'Send',
      save: 'Save',
      search: 'Search',
      copy: 'Copy',
      preview: 'Preview',
      globalSearchTooltip: 'Global Search (Cmd+Shift+F)',
    },
    preview: {
      title: 'Preview',
      noFileSelected: 'No file selected',
      invalidJson: 'Invalid JSON format',
      invalidXml: 'Invalid XML format',
      invalidBase64: 'Invalid Base64 format',
      binaryContent: 'Binary content detected',
      decoded: 'Decoded:',
      requestPreview: 'Request Preview:',
    },
    tabs: {
      close: 'Close',
      closeAll: 'Close All',
      closeOthers: 'Close Others',
      closeLeft: 'Close to the Left',
      closeRight: 'Close to the Right',
    },
    globalSearch: {
      title: 'Global Search & Replace',
      searchPlaceholder: 'Search in all files...',
      replacePlaceholder: 'Replace with...',
      search: 'Search',
      replaceAll: 'Replace All',
      noMatches: 'No matches found',
      enterQuery: 'Enter keywords to search',
      matches: 'matches',
      match: 'match',
      confirmReplace: 'Replace "{search}" with "{replace}" in {count} files?',
      replaceSuccess: 'Replaced {count} occurrences',
    },
    settings: {
      title: 'Settings',
      appearance: 'Appearance',
      theme: 'Theme',
      darkMode: 'Dark Mode',
      lightMode: 'Light Mode',
      autoSave: 'Auto Save',
      autoSaveDescription: 'Automatically save changes',
      storagePath: 'Storage Location',
      changeStoragePath: 'Change Storage Location',
      storagePathDescription: 'Files are stored in json, xml, base64, http subfolders',
      dataManagement: 'Data Management',
      exportBackup: 'Export Backup',
      importBackup: 'Import Backup',
      backupWarning: '* Import will overwrite all current data',
      shortcuts: 'Shortcuts',
      about: 'About',
      appName: 'MacDevTools Pro',
      version: 'Version',
      author: 'Author',
      license: 'License',
      description: 'A high-performance developer toolbox built with Wails and React, designed to provide a native macOS experience.',
    },
    shortcuts: {
      globalSearch: { name: 'Global Search', description: 'Search in all files' },
      closeTab: { name: 'Close Tab', description: 'Close current tab' },
      togglePreview: { name: 'Toggle Preview', description: 'Show/hide preview panel' },
      toggleExplorer: { name: 'Toggle Explorer', description: 'Show/hide file explorer' },
      switchToJson: { name: 'Switch to JSON', description: 'Switch to JSON tools' },
      switchToXml: { name: 'Switch to XML', description: 'Switch to XML tools' },
      switchToBase64: { name: 'Switch to Base64', description: 'Switch to Base64 tools' },
      switchToHttp: { name: 'Switch to HTTP', description: 'Switch to HTTP tools' },
      openSettings: { name: 'Open Settings', description: 'Open settings panel' },
      newFile: { name: 'New File', description: 'Create new file' },
      newFolder: { name: 'New Folder', description: 'Create new folder' },
      save: { name: 'Save', description: 'Save current file' },
      saveAll: { name: 'Save All', description: 'Save all files' },
      find: { name: 'Find', description: 'Find in current file' },
      copy: { name: 'Copy', description: 'Copy selected file' },
      cut: { name: 'Cut', description: 'Cut selected file' },
      paste: { name: 'Paste', description: 'Paste file' },
      duplicate: { name: 'Duplicate', description: 'Duplicate file' },
      rename: { name: 'Rename', description: 'Rename selected file' },
      delete: { name: 'Delete', description: 'Delete selected file' },
    },
    messages: {
      success: {
        jsonFormatted: 'JSON formatted successfully',
        jsonCompressed: 'JSON compressed successfully',
        xmlFormatted: 'XML formatted successfully',
        xmlToJson: 'XML converted to JSON successfully',
        base64Encoded: 'Base64 encoded successfully',
        base64Decoded: 'Base64 decoded successfully',
        httpSent: 'HTTP request sent',
        backupExported: 'Backup exported successfully!',
        backupRestored: 'Backup restored successfully!',
        copied: 'Copied',
        cut: 'Cut',
        pasted: 'Pasted successfully',
        duplicated: 'Duplicated successfully',
        renamed: 'Renamed successfully',
        deleted: 'Deleted successfully',
        moved: 'Moved successfully',
        fileSaved: 'File saved',
        filesSaved: '{count} files saved',
        storagePathUpdated: 'Storage path updated',
      },
      errors: {
        invalidJson: 'Invalid JSON format',
        invalidXml: 'Invalid XML format',
        invalidBase64: 'Invalid Base64 format',
        httpError: 'HTTP request failed',
        exportFailed: 'Export failed',
        importFailed: 'Import failed',
        invalidFileFormat: 'Invalid file format',
        invalidHttpFormat: 'Invalid HTTP format, expected: METHOD URL',
        invalidUrl: 'Invalid URL: {url}',
        requestTimeout: 'Request timeout: Server did not respond in 30 seconds',
        connectionRefused: 'Connection refused: Unable to connect to {url}',
        dnsError: 'DNS error: Host not found for {url}',
        clipboardEmpty: 'Clipboard is empty',
        operationFailed: 'Operation failed',
        renameFailed: 'Rename failed',
        deleteFailed: 'Delete failed',
        createFileFailed: 'Failed to create file',
        createFolderFailed: 'Failed to create folder',
        saveFailed: 'Save failed',
        openFinderFailed: 'Failed to open Finder',
        setStoragePathFailed: 'Failed to set storage path',
      },
      info: {
        operationSuccess: 'Operation successful',
        requestCompleted: 'Request completed',
        copiedToClipboard: 'Copied to clipboard',
      },
    },
    confirm: {
      deleteFolder: 'Are you sure you want to delete folder "{name}" and all its contents?',
      deleteFile: 'Are you sure you want to delete "{name}"?',
      importOverwrite: 'Import will overwrite all current files. Continue?',
    },
  },
};

// 默认快捷键配置
export const defaultShortcuts = {
  globalSearch: { key: 'f', modifiers: ['meta', 'shift'] },
  closeTab: { key: 'w', modifiers: ['meta'] },
  togglePreview: { key: 'g', modifiers: ['meta'] },
  toggleExplorer: { key: 'b', modifiers: ['meta'] },
  switchToJson: { key: '1', modifiers: ['meta'] },
  switchToXml: { key: '2', modifiers: ['meta'] },
  switchToBase64: { key: '3', modifiers: ['meta'] },
  switchToHttp: { key: '4', modifiers: ['meta'] },
  openSettings: { key: ',', modifiers: ['meta'] },
  newFile: { key: 'n', modifiers: ['meta'] },
  newFolder: { key: 'n', modifiers: ['meta', 'shift'] },
  save: { key: 's', modifiers: ['meta'] },
  saveAll: { key: 's', modifiers: ['meta', 'shift'] },
  find: { key: 'f', modifiers: ['meta'] },
  // 文件操作快捷键
  copy: { key: 'c', modifiers: ['meta'] },
  cut: { key: 'x', modifiers: ['meta'] },
  paste: { key: 'v', modifiers: ['meta'] },
  duplicate: { key: 'd', modifiers: ['meta'] },
  rename: { key: 'Enter', modifiers: [] },
  delete: { key: 'Backspace', modifiers: ['meta'] },
};

// 快捷键映射到功能的配置
export const shortcutActions = {
  globalSearch: 'globalSearch',
  closeTab: 'closeTab',
  togglePreview: 'togglePreview',
  toggleExplorer: 'toggleExplorer',
  switchToJson: 'switchToJson',
  switchToXml: 'switchToXml',
  switchToBase64: 'switchToBase64',
  switchToHttp: 'switchToHttp',
  openSettings: 'openSettings',
  newFile: 'newFile',
  newFolder: 'newFolder',
  save: 'save',
  saveAll: 'saveAll',
  find: 'find',
};

// 格式化快捷键显示
export const formatShortcut = (shortcut) => {
  if (!shortcut) return '';
  
  const { key, modifiers = [] } = shortcut;
  const modifierMap = {
    meta: '⌘',
    ctrl: '⌃',
    alt: '⌥',
    shift: '⇧',
  };
  
  const modifierSymbols = modifiers.map(mod => modifierMap[mod] || mod).join('');
  return `${modifierSymbols}${key.toUpperCase()}`;
};

// 获取快捷键文本描述
export const getShortcutText = (action, shortcuts, t) => {
  const shortcut = shortcuts[action];
  const shortcutInfo = t(`shortcuts.${action}`);
  const formatted = formatShortcut(shortcut);
  
  return {
    name: shortcutInfo.name,
    description: shortcutInfo.description,
    keys: formatted,
  };
};

// React Hook for translations
import { useAppStore } from '../store/useAppStore';

export const useTranslation = () => {
  const language = useAppStore(state => state.language);
  
  const t = (key, params = {}) => {
    const keys = key.split('.');
    let value = translations[language] || translations.zh;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to Chinese if key not found in current language
        value = translations.zh;
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object' && fallbackKey in value) {
            value = value[fallbackKey];
          } else {
            return key; // Return key if not found anywhere
          }
        }
        break;
      }
    }
    
    // Handle function values (for dynamic translations)
    if (typeof value === 'function') {
      return value(params);
    }
    
    // Handle string templates
    if (typeof value === 'string' && params) {
      return value.replace(/\{(\w+)\}/g, (match, param) => {
        return params[param] || match;
      });
    }
    
    return value || key;
  };
  
  return { t, language };
};