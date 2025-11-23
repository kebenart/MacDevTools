import { useAppStore } from '../../store/useAppStore'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

function Toast() {
  const { toast, hideToast } = useAppStore()

  if (!toast) return null

  const icons = {
    success: <CheckCircle size={16} className="text-green-400" />,
    error: <AlertCircle size={16} className="text-red-400" />,
    info: <Info size={16} className="text-blue-400" />,
  }

  const bgColors = {
    success: 'bg-green-900/90 border-green-700',
    error: 'bg-red-900/90 border-red-700',
    info: 'bg-macos-sidebar border-macos-border',
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div
        className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg max-w-md ${bgColors[toast.type]}`}
      >
        <span className="mt-0.5">{icons[toast.type]}</span>
        <p className="text-sm text-macos-text-main flex-1 whitespace-pre-wrap break-words">
          {toast.message}
        </p>
          <button
            onClick={hideToast}
            className="text-macos-text-sub hover:text-macos-text-main"
          >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

export default Toast
