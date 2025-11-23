import { copyToClipboard, pasteFromClipboard, cutToClipboard } from './clipboard'

/**
 * Minimal system clipboard integration for Monaco Editor
 * Preserves all normal editor functionality while adding system clipboard access
 */

/**
 * Setup minimal system clipboard integration for Monaco Editor
 * This does NOT override any standard keyboard shortcuts - only provides system clipboard access
 * @param {import('@monaco-editor/react').Monaco} monaco - Monaco editor instance
 * @param {import('@monaco-editor/react').monaco.editor.IStandaloneCodeEditor} editor - Editor instance
 * @param {Function} showToast - Toast notification function
 * @param {Function} t - Translation function
 */
export function setupEditorClipboard(monaco, editor, showToast, t) {
  // DO NOT override any keyboard shortcuts - let Monaco handle all normal editing
  // Only expose system clipboard functions for external use (like toolbar buttons)
  
  // Expose system clipboard functions for external use
  editor.systemClipboard = {
    copy: async (text) => {
      const result = await copyToClipboard(text)
      if (result.success) {
        showToast(t('messages.success.copiedToClipboard'), 'success')
      } else {
        showToast(result.error || t('messages.errors.copyFailed'), 'error')
      }
      return result.success
    },
    paste: async () => {
      const result = await pasteFromClipboard()
      if (result.success && result.data) {
        const selection = editor.getSelection()
        editor.executeEdits('system-paste', [{
          range: selection,
          text: result.data
        }])
        showToast(t('messages.success.pastedFromClipboard'), 'success')
      } else if (!result.data) {
        showToast(t('messages.errors.clipboardEmpty'), 'error')
      } else {
        showToast(result.error || t('messages.errors.pasteFailed'), 'error')
      }
      return result
    },
    cut: async (text) => {
      const result = await cutToClipboard(text)
      if (result.success) {
        showToast(t('messages.success.cutToClipboard'), 'success')
      } else {
        showToast(result.error || t('messages.errors.cutFailed'), 'error')
      }
      return result.success
    }
  }
}

/**
 * Setup context menu for editor (keep Monaco defaults)
 * @param {import('@monaco-editor/react').Monaco} monaco - Monaco editor instance
 * @param {import('@monaco-editor/react').monaco.editor.IStandaloneCodeEditor} editor - Editor instance
 */
export function setupEditorContextMenu(monaco, editor) {
  // Enable Monaco's default context menu - don't interfere with it
  editor.updateOptions({
    contextmenu: true
  })
}