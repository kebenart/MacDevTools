/**
 * Register custom JSON language for Monaco Editor
 * Provides syntax highlighting with single quote support
 * @param {Object} monaco - The monaco instance from the editor
 */
export function registerJSONLanguage(monaco) {
  // 验证 monaco 对象是否存在
  if (!monaco || !monaco.languages) {
    console.warn('Monaco instance is not available yet')
    return
  }
  
  // 检查是否已经注册过，防止重复注册报错
  const languages = monaco.languages.getLanguages();
  const isRegistered = languages.some(lang => lang.id === 'json-custom');

  if (!isRegistered) {
    // Register custom JSON language
    monaco.languages.register({ id: 'json-custom' })

    // Define syntax highlighting with single quote support
    monaco.languages.setMonarchTokensProvider('json-custom', {
      tokenizer: {
        root: [
          // Strings - support both single and double quotes
          [/'/, { token: 'string.quote', next: '@stringSingle' }],
          [/"/, { token: 'string.quote', next: '@stringDouble' }],
          
          // Numbers
          [/\d+\.\d+([eE][+-]?\d+)?/, 'number.float'],
          [/\d+/, 'number'],
          
          // Keywords
          [/\b(true|false|null)\b/, 'keyword'],
          
          // Brackets
          [/[{}]/, 'delimiter.bracket'],
          [/[[\]]/, 'delimiter.array'],
          
          // Operators
          [/[,:]/, 'delimiter'],
          
          // Whitespace
          [/\s+/, 'white'],
        ],

        stringSingle: [
          [/[^'\\]+/, 'string'],
          [/\\./, 'string.escape'],
          [/'/, { token: 'string.quote', next: '@pop' }],
        ],

        stringDouble: [
          [/[^"\\]+/, 'string'],
          [/\\./, 'string.escape'],
          [/"/, { token: 'string.quote', next: '@pop' }],
        ],
      },
    })

    // Define theme colors for JSON (inherit from default JSON theme)
    // The default JSON theme already handles string, number, keyword, etc.
    // We just need to ensure single quotes are highlighted as strings
  }
}

