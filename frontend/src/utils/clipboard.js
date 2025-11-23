import { ClipboardCopy, ClipboardPaste, ClipboardCut } from '../wailsjs/go/main/App'

/**
 * System clipboard operations for Wails app
 * These functions use macOS system clipboard instead of browser clipboard API
 */

/**
 * Copy text to system clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function copyToClipboard(text) {
  try {
    const result = await ClipboardCopy(text)
    return result
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Paste text from system clipboard
 * @returns {Promise<{success: boolean, data?: string, error?: string}>}
 */
export async function pasteFromClipboard() {
  try {
    const result = await ClipboardPaste()
    return result
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Cut text to system clipboard
 * @param {string} text - Text to cut
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function cutToClipboard(text) {
  try {
    const result = await ClipboardCut(text)
    return result
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Check if clipboard has content
 * @returns {Promise<boolean>}
 */
export async function hasClipboardContent() {
  try {
    const result = await pasteFromClipboard()
    return result.success && result.data && result.data.trim().length > 0
  } catch {
    return false
  }
}