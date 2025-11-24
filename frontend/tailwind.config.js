/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 修改：使用 CSS 变量而不是硬编码的颜色值
        // 这样 index.css 中的 .light 类生效时，颜色会自动切换
        'macos-bg': 'var(--macos-bg)',
        'macos-sidebar': 'var(--macos-sidebar)',
        'macos-explorer': 'var(--macos-explorer)',
        'macos-border': 'var(--macos-border)',
        'macos-accent': 'var(--macos-accent)',
        'macos-tab-active': 'var(--macos-tab-active)',
        'macos-tab-inactive': 'var(--macos-tab-inactive)',
        'macos-item-hover': 'var(--macos-item-hover)',
        'macos-item-active': 'var(--macos-item-active)',
        'macos-text-main': 'var(--macos-text-main)',
        'macos-text-sub': 'var(--macos-text-sub)',
        'macos-input': 'var(--macos-input)',
        'macos-error': 'var(--macos-error)',
      },
      fontFamily: {
        'macos': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        'mono': ['Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      backdropBlur: {
        'macos': '20px',
      },
    },
  },
  plugins: [],
}