import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  }, []);

  const showConfirm = useCallback(({ title, message, confirmLabel, cancelLabel, type = 'default' }) => {
    return new Promise((resolve) => {
      setModal({
        title,
        message,
        confirmLabel: confirmLabel || 'Confirm',
        cancelLabel: cancelLabel || 'Cancel',
        type,
        onConfirm: () => {
          setModal(null);
          resolve(true);
        },
        onCancel: () => {
          setModal(null);
          resolve(false);
        }
      });
    });
  }, []);

  const showAlert = useCallback(({ title, message, buttonLabel, type = 'default' }) => {
    return new Promise((resolve) => {
      setModal({
        title,
        message,
        confirmLabel: buttonLabel || 'OK',
        cancelLabel: null,
        type,
        onConfirm: () => {
          setModal(null);
          resolve(true);
        },
        onCancel: null
      });
    });
  }, []);

  return (
    <NotificationContext.Provider value={{ showToast, showConfirm, showAlert }}>
      {children}
      {toast && <ToastUI toast={toast} onClose={() => setToast(null)} />}
      {modal && <ModalUI modal={modal} />}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
};

const ToastUI = ({ toast, onClose }) => {
  return (
    <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-top-10 duration-500">
      <div className={`px-8 py-4 rounded-2xl shadow-2xl backdrop-blur-md border flex items-center gap-4 ${
        toast.type === 'error' 
          ? 'bg-red-500/10 border-red-500/20 text-red-500' 
          : 'bg-white/10 border-white/10 text-teal-400'
      }`} style={{ backgroundColor: 'rgba(15,15,15,0.85)' }}>
        <span className="text-xl">{toast.type === 'error' ? '🚫' : '✨'}</span>
        <p className="font-bold text-[10px] uppercase tracking-[0.2em]">{toast.message}</p>
        <button onClick={onClose} className="ml-4 opacity-40 hover:opacity-100 transition-opacity text-white">✕</button>
      </div>
    </div>
  );
};

const ModalUI = ({ modal }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#111] w-full max-w-sm rounded-[32px] shadow-2xl border border-white/5 p-8 animate-in zoom-in-95 duration-300 text-center">
        <div className="mb-6">
           <span className="text-4xl">
             {modal.type === 'danger' ? '🚨' : modal.type === 'warning' ? '⚠️' : '🔔'}
           </span>
        </div>
        <h3 className="text-xl font-bold text-white tracking-tight uppercase mb-2">{modal.title}</h3>
        <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest leading-relaxed mb-10">{modal.message}</p>
        
        <div className="flex flex-col gap-3">
          <button
            onClick={modal.onConfirm}
            className={`w-full py-4 rounded-2xl font-bold text-[11px] uppercase tracking-widest shadow-xl transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
              modal.type === 'danger' 
                ? 'bg-red-500 text-white shadow-red-900/20' 
                : 'bg-teal-500 text-white shadow-teal-900/20'
            }`}
            style={modal.type !== 'danger' ? { background: 'linear-gradient(to right, #14b8a6, #0d9488)' } : {}}
          >
            {modal.confirmLabel}
          </button>
          
          {modal.onCancel && (
            <button
              onClick={modal.onCancel}
              className="w-full py-4 text-gray-500 font-bold text-[11px] uppercase tracking-widest hover:text-white transition-all cursor-pointer"
            >
              {modal.cancelLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
