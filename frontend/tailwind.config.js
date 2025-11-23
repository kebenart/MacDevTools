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
        // Dark mode colors (default)
        'macos-bg': '#1e1e1e',
        'macos-sidebar': 'rgba(51, 51, 51, 0.8)',
        'macos-explorer': '#252526',
        'macos-border': '#333333',
        'macos-accent': '#0e639c',
        'macos-tab-active': '#1e1e1e',
        'macos-tab-inactive': '#2d2d2d',
        'macos-item-hover': '#2a2d2e',
        'macos-item-active': '#37373d',
        'macos-text-main': '#cccccc',
        'macos-text-sub': '#858585',
        'macos-input': '#3c3c3c',
        'macos-error': '#f14c4c',
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
