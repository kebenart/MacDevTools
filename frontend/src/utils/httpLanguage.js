/**
 * Register HTTP language for Monaco Editor
 * Provides syntax highlighting and autocomplete for HTTP requests
 * @param {Object} monaco - The monaco instance from the editor
 */
export function registerHTTPLanguage(monaco) {
  // 验证 monaco 对象是否存在
  if (!monaco || !monaco.languages) {
    console.warn('Monaco instance is not available yet')
    return
  }
  
  // 检查是否已经注册过，防止重复注册报错
  const languages = monaco.languages.getLanguages();
  const isRegistered = languages.some(lang => lang.id === 'http');

  if (!isRegistered) {
    // Register language
    monaco.languages.register({ id: 'http' })

    // Define syntax highlighting
    monaco.languages.setMonarchTokensProvider('http', {
      tokenizer: {
        root: [
          // HTTP Methods
          [/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|TRACE|CONNECT)\b/, 'keyword.method'],

          // HTTP Version
          [/HTTP\/\d\.\d/, 'keyword.version'],

          // Header names
          [/^[A-Za-z-]+(?=:)/, 'variable.header'],

          // URLs
          [/(https?:\/\/[^\s]+)/, 'string.url'],
          [/\/[^\s]*/, 'string.path'],

          // JSON in body
          [/\{/, { token: 'delimiter.bracket', next: '@json' }],
          [/\[/, { token: 'delimiter.bracket', next: '@json' }],

          // Strings
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/"/, { token: 'string.quote', next: '@string' }],

          // Numbers
          [/\d+/, 'number'],

          // Comments - support #, ##, and /* */
          [/#{1,2}.*$/, 'comment'],
          [/\/\*/, { token: 'comment', next: '@comment' }],
        ],

        json: [
          [/\}/, { token: 'delimiter.bracket', next: '@pop' }],
          [/\]/, { token: 'delimiter.bracket', next: '@pop' }],
          [/"([^"\\]|\\.)*"/, 'string'],
          [/\d+/, 'number'],
          [/(true|false|null)/, 'keyword'],
          [/[,:]/, 'delimiter'],
        ],

        string: [
          [/[^\\"]+/, 'string'],
          [/"/, { token: 'string.quote', next: '@pop' }],
        ],

        comment: [
          [/\*\//, { token: 'comment', next: '@pop' }],
          [/./, 'comment'],
        ],
      },
    })

    // Define autocomplete suggestions
    monaco.languages.registerCompletionItemProvider('http', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        }

        const suggestions = [
          // HTTP Methods
          {
            label: 'GET',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'GET ${1:/path} HTTP/1.1',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'GET request',
            range: range,
          },
          {
            label: 'POST',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'POST ${1:/path} HTTP/1.1\nContent-Type: application/json\n\n{\n\t$0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'POST request with JSON body',
            range: range,
          },
          {
            label: 'PUT',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'PUT ${1:/path} HTTP/1.1\nContent-Type: application/json\n\n{\n\t$0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'PUT request',
            range: range,
          },
          {
            label: 'DELETE',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'DELETE ${1:/path} HTTP/1.1',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'DELETE request',
            range: range,
          },
          {
            label: 'PATCH',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'PATCH ${1:/path} HTTP/1.1\nContent-Type: application/json\n\n{\n\t$0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'PATCH request',
            range: range,
          },

          // Common Headers
          {
            label: 'Content-Type: application/json',
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: 'Content-Type: application/json',
            documentation: 'JSON content type header',
            range: range,
          },
          {
            label: 'Authorization: Bearer',
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: 'Authorization: Bearer ${1:token}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Bearer token authorization',
            range: range,
          },
          {
            label: 'Accept: application/json',
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: 'Accept: application/json',
            documentation: 'Accept JSON response',
            range: range,
          },
          {
            label: 'User-Agent',
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: 'User-Agent: ${1:MyApp/1.0}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'User agent header',
            range: range,
          },
        ]

        return { suggestions: suggestions }
      },
    })
  }

  // Define theme colors for HTTP (Safe to redefine)
  monaco.editor.defineTheme('http-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword.method', foreground: 'D16969', fontStyle: 'bold' },
      { token: 'keyword.version', foreground: '569CD6' },
      { token: 'variable.header', foreground: '9CDCFE' },
      { token: 'string.url', foreground: 'CE9178' },
      { token: 'string.path', foreground: 'CE9178' },
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' }, // Green color for comments
    ],
    colors: {},
  })

  monaco.editor.defineTheme('http-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword.method', foreground: 'D16969', fontStyle: 'bold' },
      { token: 'keyword.version', foreground: '0000FF' },
      { token: 'variable.header', foreground: '0451A5' },
      { token: 'string.url', foreground: 'A31515' },
      { token: 'string.path', foreground: 'A31515' },
      { token: 'comment', foreground: '008000', fontStyle: 'italic' }, // Green color for comments
    ],
    colors: {},
  })
}