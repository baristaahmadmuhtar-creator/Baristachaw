import { useState, useEffect } from 'react';
import { Share, PlusSquare, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { motionDefaultTransition } from '../../utils/motionPresets';

export function GuidedInstallOverlay() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if we are running in standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as any).standalone === true);
    
    if (isStandalone) {
      // If already installed, ensure flag is cleared and do not show
      sessionStorage.removeItem('guided_install_ios');
      return;
    }

    // Check URL parameters for guided install trigger
    const urlParams = new URLSearchParams(window.location.search);
    const guidedInstallParam = urlParams.get('guided_install');

    if (guidedInstallParam === 'ios') {
      // Triggered from landing page
      sessionStorage.setItem('guided_install_ios', 'true');
      
      // Clean up the URL to prevent sharing the link with the parameter
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', newUrl);
      
      setIsVisible(true);
    } else if (sessionStorage.getItem('guided_install_ios') === 'true') {
      // Was previously triggered in this session but not yet dismissed
      setIsVisible(true);
    }
  }, []);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={motionDefaultTransition}
        className="fixed inset-0 z-[9999] flex flex-col justify-end bg-black/80 p-6 pb-8 backdrop-blur-md text-white"
      >
        <button
          onClick={() => {
            setIsVisible(false);
            sessionStorage.removeItem('guided_install_ios');
          }}
          className="absolute top-8 right-6 p-2 text-white/70 hover:text-white"
          aria-label="Tutup panduan install"
        >
          <X size={28} />
        </button>

        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
          <div className="mb-8 p-4 bg-white/10 rounded-3xl backdrop-blur-xl border border-white/20">
            <h2 className="text-2xl font-bold mb-3 tracking-tight">Install Baristachaw</h2>
            <p className="text-white/80 leading-relaxed mb-6">
              Install aplikasi ini di iPhone Anda untuk pengalaman penuh tanpa batas browser.
            </p>
            
            <div className="space-y-4 text-left bg-black/40 p-5 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                  <Share size={20} strokeWidth={2.5} />
                </div>
                <p className="text-sm font-medium">1. Tap icon <strong>Share</strong> di navigasi bawah Safari</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                  <PlusSquare size={20} strokeWidth={2.5} />
                </div>
                <p className="text-sm font-medium">2. Pilih <strong>Add to Home Screen</strong></p>
              </div>
            </div>
          </div>
        </div>

        {/* Bouncing Arrow Pointing Down */}
        <motion.div 
          className="flex justify-center mb-2 text-blue-400"
          animate={{ y: [0, 15, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M19 12l-7 7-7-7"/>
          </svg>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
