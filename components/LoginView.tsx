
import React, { useState, useEffect } from 'react';
import { User as UserType } from '../types';
import { Lock, Delete, CalendarPlus2 } from 'lucide-react';
import { authService } from '../services/auth.service';
import { useNotification } from './NotificationContext';

interface LoginViewProps {
  onLogin: (user: UserType) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const { notify } = useNotification();
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(false);

  const handleKeyPress = (num: string) => {
    if (pin.length < 4 && !isSubmitting) {
      setPin(prev => prev + num);
      setError(false);
    }
  };

  const handleDelete = () => {
    if (!isSubmitting) {
      setPin(prev => prev.slice(0, -1));
      setError(false);
    }
  };

  useEffect(() => {
    const performLogin = async () => {
      if (pin.length === 4) {
        setIsSubmitting(true);
        try {
          const data = await authService.login(pin);
          if (data.success) {
            console.log('LoginView: ',data);
            onLogin(data.user);
            notify(`Bienvenido, ${data.user.name}`, 'success');
          }
        } catch (e: any) {
          setError(true);
          setPin('');
          notify(e.response?.data?.error || "PIN inválido", 'error');
        } finally {
          setIsSubmitting(false);
        }
      }
    };
    performLogin();
  }, [pin, onLogin, notify]);

  const numpad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'];

  return (
    <div className="fixed inset-0 bg-slate-950 flex justify-end z-[9999] overflow-hidden">
  
  <video 
    autoPlay 
    muted 
    loop 
    playsInline 
    className="absolute inset-0 w-full h-full object-cover scale-105 pointer-events-none"
  >
    <source 
      src="https://apgesoftware.com/posodontos/assets/video/background.mp4" 
      type="video/mp4" 
    />
  </video>

  {/* Login Card */}
  <div className="w-full max-w-md bg-white/10 backdrop-blur-2xl p-8 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] border border-white/10 relative z-10 animate-in fade-in zoom-in duration-500">
    
    <div className="text-center mb-8">
      <div className="bg-brand-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-brand-900/40 border-2 border-white/20">
        {isSubmitting ? (
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
        ) : (
          <CalendarPlus2 size={40} className="text-white" />
        )}
      </div>
      <h1 className="text-3xl font-black text-white tracking-tighter mb-2">APGE OdontOS</h1>
      <p className="text-slate-300 text-xs font-bold tracking-[0.2em] opacity-80">Ingrese su PIN de Acceso</p>
    </div>

    <div className="flex justify-center gap-4 mb-10">
      {[0, 1, 2, 3].map((i) => (
        <div 
          key={i} 
          className={`w-5 h-5 rounded-full border-2 transition-all duration-300 ${
            pin.length > i 
              ? 'bg-brand-500 border-brand-500 scale-125 shadow-[0_0_15px_rgba(230,115,0,0.8)]' 
              : error 
                ? 'border-red-500 bg-red-500/20 animate-shake' 
                : 'border-white/20 bg-white/5'
          }`}
        />
      ))}
    </div>

    <div className="grid grid-cols-3 gap-4">
      {numpad.map((btn, idx) => {
        if (btn === '') return <div key={idx} />;
        if (btn === 'delete') {
          return (
            <button 
              key={idx}
              onClick={handleDelete}
              disabled={isSubmitting}
              className="h-20 rounded-2xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 active:scale-90 transition-all disabled:opacity-50"
            >
              <Delete size={28} />
            </button>
          );
        }
        return (
          <button
            key={idx}
            onClick={() => handleKeyPress(btn)}
            disabled={isSubmitting}
            className="h-20 rounded-[1.5rem] bg-white/5 border border-white/10 hover:bg-brand-600 hover:border-brand-500 active:scale-95 transition-all text-2xl font-black text-white shadow-lg disabled:opacity-50"
          >
            {btn}
          </button>
        );
      })}
    </div>

  </div>
</div>

  );
};
