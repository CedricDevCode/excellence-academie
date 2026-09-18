import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { CheckCircle, AlertCircle, X, XCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
  confirm: (message: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
  confirm: async () => false,
});

export const useToast = () => useContext(ToastContext);

const ICONS = {
  success: <CheckCircle size={18} className="text-green-500" />,
  error: <XCircle size={18} className="text-red-500" />,
  warning: <AlertCircle size={18} className="text-orange-500" />,
  info: <Info size={18} className="text-primary-500" />,
};

const BG_COLORS = {
  success: "bg-green-50 border-green-200",
  error: "bg-red-50 border-red-200",
  warning: "bg-orange-50 border-orange-200",
  info: "bg-primary-50 border-primary-200",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<{ message: string; resolve: (v: boolean) => void } | null>(null);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      timersRef.current.delete(id);
    }, 4000);
    timersRef.current.set(id, timer);
  }, []);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise(resolve => {
      setConfirmState({ message, resolve });
    });
  }, []);

  const handleConfirm = (value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  return (
    <ToastContext.Provider value={{ toast: addToast, confirm }}>
      {children}

      {/* Toast notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
          {toasts.map(t => (
            <div key={t.id} className={`flex items-start gap-3 px-4 py-3 rounded border shadow-lg ${BG_COLORS[t.type]} animate-slide-up`}
              style={{ animation: 'slideUp 0.3s ease-out' }}>
              {ICONS[t.type]}
              <p className="text-sm text-gray-800 flex-1">{t.message}</p>
              <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="text-gray-400 hover:text-gray-600" aria-label="Fermer">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Confirm modal */}
      {confirmState && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle size={22} className="text-orange-500 shrink-0 mt-0.5" />
              <p className="text-gray-900 font-semibold text-sm">{confirmState.message}</p>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => handleConfirm(false)}
                className="px-4 py-2 rounded border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Annuler
              </button>
              <button onClick={() => handleConfirm(true)}
                className="px-4 py-2 rounded bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
