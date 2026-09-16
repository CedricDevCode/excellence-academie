import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowBanner(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa_install_dismissed', '1');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#0056B3] flex items-center justify-center shrink-0">
          <Smartphone size={28} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-sm">Installer Excellence Académie</h3>
          <p className="text-xs text-gray-500 mt-0.5">Accédez rapidement depuis votre écran d'accueil et recevez les notifications.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleInstall}
            className="flex items-center gap-1.5 bg-[#0056B3] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#003d80] transition-colors">
            <Download size={14} />
            Installer
          </button>
          <button onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
