
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X, HelpCircle } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'warning' | 'info';
type ConfirmType = 'danger' | 'warning' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  title?: string;
}

interface ConfirmOptions {
  title: string;
  message: string;
  type?: ConfirmType;
  confirmText?: string;
  cancelText?: string;
}

interface NotificationContextType {
  notify: (message: string, type?: NotificationType, title?: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- TOAST STATE ---
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // --- CONFIRM MODAL STATE ---
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  // --- TOAST LOGIC ---
  const notify = useCallback((message: string, type: NotificationType = 'success', title?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, type, message, title }]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // --- CONFIRM LOGIC ---
  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve
      });
    });
  }, []);

  const handleConfirm = () => {
    if (confirmState) {
      confirmState.resolve(true);
      setConfirmState(null);
    }
  };

  const handleCancel = () => {
    if (confirmState) {
      confirmState.resolve(false);
      setConfirmState(null);
    }
  };

  // --- RENDER HELPERS ---
  const getToastIcon = (type: NotificationType) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="text-white" size={24} />;
      case 'error': return <XCircle className="text-white" size={24} />;
      case 'warning': return <AlertTriangle className="text-white" size={24} />;
      case 'info': return <Info className="text-white" size={24} />;
    }
  };

  const getToastStyles = (type: NotificationType) => {
    switch (type) {
      case 'success': return { bg: 'bg-emerald-500', title: 'text-emerald-900', border: 'border-emerald-100' };
      case 'error': return { bg: 'bg-red-500', title: 'text-red-900', border: 'border-red-100' };
      case 'warning': return { bg: 'bg-amber-500', title: 'text-amber-900', border: 'border-amber-100' };
      case 'info': return { bg: 'bg-blue-500', title: 'text-blue-900', border: 'border-blue-100' };
    }
  };

  const getToastDefaultTitle = (type: NotificationType) => {
      switch(type) {
          case 'success': return '¡Operación Exitosa!';
          case 'error': return 'Ocurrió un error';
          case 'warning': return 'Advertencia';
          case 'info': return 'Información';
      }
  };

  const getConfirmIcon = (type: ConfirmType) => {
      switch(type) {
          case 'danger': return <div className="bg-red-100 p-3 rounded-full text-red-600 mb-4"><AlertTriangle size={32}/></div>;
          case 'warning': return <div className="bg-amber-100 p-3 rounded-full text-amber-600 mb-4"><AlertTriangle size={32}/></div>;
          case 'info': return <div className="bg-blue-100 p-3 rounded-full text-blue-600 mb-4"><HelpCircle size={32}/></div>;
      }
  };

  const getConfirmButtonColor = (type: ConfirmType) => {
      switch(type) {
          case 'danger': return 'bg-red-600 hover:bg-red-700 shadow-red-200';
          case 'warning': return 'bg-amber-600 hover:bg-amber-700 shadow-amber-200';
          case 'info': return 'bg-blue-600 hover:bg-blue-700 shadow-blue-200';
      }
  };

  return (
    <NotificationContext.Provider value={{ notify, confirm }}>
      {children}
      
      {/* --- TOASTS CONTAINER --- */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {notifications.map(n => {
          const styles = getToastStyles(n.type);
          return (
            <div
              key={n.id}
              className={`pointer-events-auto w-[360px] bg-white rounded-2xl shadow-xl flex overflow-hidden animate-in slide-in-from-right-full fade-in duration-300 ring-1 ring-black/5 ${styles.border}`}
            >
              <div className={`w-14 flex items-center justify-center shrink-0 ${styles.bg}`}>
                  {getToastIcon(n.type)}
              </div>
              <div className="flex-1 p-4 flex flex-col justify-center">
                  <div className="flex justify-between items-start">
                    <h5 className={`font-bold text-sm mb-1 ${styles.title}`}>
                        {n.title || getToastDefaultTitle(n.type)}
                    </h5>
                    <button 
                        onClick={() => removeNotification(n.id)}
                        className="text-slate-300 hover:text-slate-500 -mt-1 -mr-1 p-1 transition-colors"
                    >
                        <X size={14} />
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">
                    {n.message}
                  </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- CUSTOM CONFIRM MODAL --- */}
      {confirmState && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center transform transition-all scale-100 animate-in zoom-in-95 duration-200 relative">
                <button onClick={handleCancel} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-slate-500 transition-colors"><X size={18} /></button>
                <div className="flex justify-center">
                    {getConfirmIcon(confirmState.options.type || 'info')}
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                    {confirmState.options.title}
                </h3>
                <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                    {confirmState.options.message}
                </p>
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={handleCancel}
                        className="py-3 px-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        {confirmState.options.cancelText || 'Cancelar'}
                    </button>
                    <button 
                        onClick={handleConfirm}
                        className={`py-3 px-4 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 ${getConfirmButtonColor(confirmState.options.type || 'info')}`}
                    >
                        {confirmState.options.confirmText || 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
      )}

    </NotificationContext.Provider>
  );
};
