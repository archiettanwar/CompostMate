import React, { createContext, useContext, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  }, []);

  const showModal = useCallback(({ title, message, defaultValue, confirmLabel, cancelLabel, onConfirm, onCancel }) => {
    return new Promise((resolve) => {
      setModal({
        title,
        message,
        defaultValue: defaultValue || '',
        confirmLabel: confirmLabel || 'Confirm',
        cancelLabel: cancelLabel || 'Cancel',
        onConfirm: (value) => {
          setModal(null);
          if (onConfirm) onConfirm(value);
          resolve(value);
        },
        onCancel: () => {
          setModal(null);
          if (onCancel) onCancel();
          resolve(null);
        }
      });
    });
  }, []);

  return (
    <NotificationContext.Provider value={{ showToast, showModal }}>
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
      <div className={`px-8 py-4 rounded-2xl shadow-2xl border flex items-center gap-4 ${
        toast.type === 'error' 
          ? 'bg-red-50 border-red-100 text-red-600' 
          : 'bg-white border-gray-100 text-[#1A5C38]'
      }`}>
        <span className="text-xl">{toast.type === 'error' ? '❌' : '✨'}</span>
        <p className="font-black text-xs uppercase tracking-widest">{toast.message}</p>
        <button onClick={onClose} className="ml-4 opacity-40 hover:opacity-100 transition-opacity">✕</button>
      </div>
    </div>
  );
};

const ModalUI = ({ modal }) => {
  const [inputValue, setInputValue] = useState(modal.defaultValue);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl border border-gray-100 p-10 animate-in zoom-in-95 duration-300">
        <h3 className="text-2xl font-black text-gray-900 tracking-tighter uppercase mb-2">{modal.title}</h3>
        <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-8">{modal.message}</p>
        
        {modal.defaultValue !== undefined && (
          <input
            type="text"
            autoFocus
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full px-6 py-4 bg-gray-50 border border-transparent focus:border-[#1A5C38] focus:bg-white rounded-2xl font-bold text-gray-900 outline-none transition-all mb-8"
          />
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => modal.onConfirm(inputValue)}
            className="w-full py-5 bg-[#1A5C38] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-green-900/10 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            {modal.confirmLabel}
          </button>
          <button
            onClick={modal.onCancel}
            className="w-full py-5 text-gray-400 font-black text-xs uppercase tracking-widest hover:text-gray-600 transition-all cursor-pointer"
          >
            {modal.cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
