import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, Loader2, X } from "lucide-react";
import { cn } from "@/utils/cn";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  error?: string | null;
  icon?: ReactNode;
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modale de confirmation « danger » avec un design premium :
 * backdrop flouté, carte animée en ressort, icône pulsante,
 * focus Annuler par défaut, Échap fermer, verrouillage du scroll.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Supprimer définitivement",
  cancelLabel = "Garder",
  loading = false,
  error = null,
  icon,
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => cancelRef.current?.focus(), 120);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, loading, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="absolute inset-0 bg-surface-900/70 backdrop-blur-[3px]"
            onClick={() => !loading && onCancel()}
          />
          {/* Halo dégradé rouge */}
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.35 }}
            className="absolute w-[560px] h-[560px] rounded-full bg-[radial-gradient(circle,rgba(244,63,94,0.22)_0%,transparent_65%)] pointer-events-none"
          />

          {/* Carte */}
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.8, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 380, damping: 26, mass: 0.9 }}
            className="relative bg-white w-full max-w-md rounded-2xl shadow-[0_30px_80px_-20px_rgba(190,18,60,0.45)] overflow-hidden"
          >
            {/* Barre supérieure rouge */}
            <div className="h-1.5 w-full bg-gradient-to-r from-rose-600 via-red-500 to-rose-600" />

            {/* Bouton fermer */}
            <button
              onClick={() => !loading && onCancel()}
              className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full text-surface-400 hover:text-surface-700 hover:bg-surface-100 flex items-center justify-center transition-colors z-10"
              aria-label="Fermer"
            >
              <X size={17} />
            </button>

            <div className="p-7">
              {/* Icône pulsante */}
              <div className="relative mx-auto w-20 h-20 mb-5">
                <motion.span
                  className="absolute inset-0 rounded-2xl border-2 border-dashed border-rose-300"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
                />
                <motion.span
                  className="absolute inset-1 rounded-2xl bg-rose-100"
                  animate={{ scale: [1, 1.12, 1], opacity: [0.9, 0.4, 0.9] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                />
                <div className="absolute inset-2 rounded-2xl bg-gradient-to-br from-rose-500 via-red-600 to-rose-700 flex items-center justify-center text-white shadow-lg shadow-rose-600/40">
                  {icon ?? <AlertTriangle size={30} strokeWidth={2.2} />}
                </div>
              </div>

              <h3 className="text-center text-lg font-black text-surface-900 tracking-tight">{title}</h3>
              {description && (
                <p className="text-center text-[13px] text-surface-500 mt-1.5 leading-relaxed">{description}</p>
              )}

              {children && <div className="mt-4">{children}</div>}

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 text-center text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2"
                >
                  {error}
                </motion.p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 mt-6">
                <button
                  ref={cancelRef}
                  onClick={onCancel}
                  disabled={loading}
                  className="flex-1 px-4 py-3 rounded border border-surface-300 text-sm font-semibold text-surface-600 hover:bg-surface-50 hover:text-surface-800 transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary-600/30"
                >
                  {cancelLabel}
                </button>
                <motion.button
                  whileHover={loading ? undefined : { scale: 1.03, y: -1 }}
                  whileTap={loading ? undefined : { scale: 0.97 }}
                  onClick={onConfirm}
                  disabled={loading}
                  className={cn(
                    "flex-1 px-4 py-3 rounded text-sm font-black text-white transition-shadow flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-rose-500/40",
                    "bg-gradient-to-r from-rose-600 via-red-600 to-rose-600 bg-[length:200%_100%] bg-left hover:bg-right duration-500",
                    "shadow-lg shadow-rose-600/35 hover:shadow-xl hover:shadow-rose-600/45 disabled:opacity-70 disabled:cursor-not-allowed"
                  )}
                >
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> Suppression…</>
                  ) : (
                    <><Trash2 size={16} /> {confirmLabel}</>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
