import React, { useState, useEffect, useRef } from 'react';
import { User as UserType } from '../types';
import { Delete, CalendarPlus2, Building2, ArrowLeft } from 'lucide-react';
import { authService } from '../services/auth.service';
import { useNotification } from './NotificationContext';

interface LoginViewProps {
  onLogin: (user: UserType) => void;
}

type Step = 'nit' | 'pin';

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  
  const { notify } = useNotification();

  const [step, setStep] = useState<Step>('nit');

  // NIT state
  const [nit, setNit] = useState('');
  const [isVerifyingNit, setIsVerifyingNit] = useState(false);
  const [nitError, setNitError] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const nitInputRef = useRef<HTMLInputElement>(null);

  // PIN state
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    if (step === 'nit') {
      nitInputRef.current?.focus();
    }
  }, [step]);

  // --- NIT handlers ---
  const handleNitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.\-a-zA-Z]/g, '');
    setNit(value);
    setNitError(false);
  };

  const handleNitSubmit = async () => {
    if (!nit.trim() || isVerifyingNit) return;
    setIsVerifyingNit(true);
    try {
      const data = await authService.verifyNit(nit);
      if (data.exists) {
        setCompanyName(data.companyName || '');
        setStep('pin');
      } else {
        setNitError(true);
        notify('NIT no encontrado', 'error');
      }
    } catch (e: any) {
      setNitError(true);
      notify(e.response?.data?.error || 'NIT no encontrado', 'error');
    } finally {
      setIsVerifyingNit(false);
    }
  };

  const handleNitKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleNitSubmit();
  };

  // --- PIN handlers ---
  const handleKeyPress = (num: string) => {
    if (pin.length < 4 && !isSubmitting) {
      setPin(prev => prev + num);
      setPinError(false);
    }
  };

  const handleDelete = () => {
    if (!isSubmitting) {
      setPin(prev => prev.slice(0, -1));
      setPinError(false);
    }
  };

  const handleBack = () => {
    setStep('nit');
    setPin('');
    setPinError(false);
  };

  useEffect(() => {
    const performLogin = async () => {
      if (pin.length === 4) {
        setIsSubmitting(true);
        try {
          const data = await authService.login(pin, nit);
          if (data.success) {
            onLogin(data.user);
            notify(`Bienvenido, ${data.user.name}`, 'success');
          }
        } catch (e: any) {
          setPinError(true);
          setPin('');
          notify(e.response?.data?.error || 'PIN inválido', 'error');
        } finally {
          setIsSubmitting(false);
        }
      }
    };
    performLogin();
  }, [pin, nit, onLogin, notify]);

  const numpad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'];

  return (
    <div className="fixed inset-0 bg-slate-950 flex justify-end z-[9999] overflow-hidden">

      {/* Video Background */}
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
      <div className="w-full max-w-md bg-white/10 backdrop-blur-2xl p-8 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] border border-white/10 relative z-10 animate-in fade-in zoom-in duration-500 flex flex-col justify-center">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-brand-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-brand-900/40 border-2 border-white/20">
            {(isVerifyingNit || isSubmitting) ? (
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white" />
            ) : step === 'nit' ? (
              <Building2 size={40} className="text-white" />
            ) : (
              <CalendarPlus2 size={40} className="text-white" />
            )}
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter mb-2">APGE OdontOS</h1>
          <p className="text-slate-300 text-xs font-bold tracking-[0.2em] opacity-80">
            {step === 'nit' ? 'Ingrese su NIT de empresa' : 'Ingrese su PIN de Acceso'}
          </p>
        </div>

        {/* Step: NIT */}
        {step === 'nit' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-6">
              <input
                ref={nitInputRef}
                type="text"
                value={nit}
                onChange={handleNitChange}
                onKeyDown={handleNitKeyDown}
                placeholder="Ej: 900123456-7"
                disabled={isVerifyingNit}
                className={`w-full bg-white/5 border rounded-2xl px-5 py-4 text-white text-xl font-bold tracking-widest placeholder:text-white/20 placeholder:font-normal placeholder:tracking-normal outline-none transition-all duration-300 focus:bg-white/10 disabled:opacity-50 ${
                  nitError
                    ? 'border-red-500 focus:border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                    : 'border-white/10 focus:border-brand-500 focus:shadow-[0_0_15px_rgba(230,115,0,0.3)]'
                }`}
              />
            </div>

            <button
              onClick={handleNitSubmit}
              disabled={!nit.trim() || isVerifyingNit}
              className="w-full h-16 rounded-2xl bg-brand-600 hover:bg-brand-500 active:scale-95 transition-all text-white font-black text-lg tracking-wider shadow-lg disabled:opacity-40 disabled:cursor-not-allowed border border-brand-500/50"
            >
              {isVerifyingNit ? (
                <span className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" />
                  Verificando...
                </span>
              ) : (
                'Continuar'
              )}
            </button>
          </div>
        )}

        {/* Step: PIN */}
        {step === 'pin' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">

            {/* Company name badge */}
            {companyName && (
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="flex items-center gap-2 bg-brand-600/20 border border-brand-500/30 rounded-full px-4 py-1.5">
                  <Building2 size={14} className="text-brand-400" />
                  <span className="text-brand-300 text-sm font-bold truncate max-w-[200px]">{companyName}</span>
                </div>
              </div>
            )}

            {/* PIN dots */}
            <div className="flex justify-center gap-4 mb-8">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-5 h-5 rounded-full border-2 transition-all duration-300 ${
                    pin.length > i
                      ? 'bg-brand-500 border-brand-500 scale-125 shadow-[0_0_15px_rgba(230,115,0,0.8)]'
                      : pinError
                        ? 'border-red-500 bg-red-500/20 animate-shake'
                        : 'border-white/20 bg-white/5'
                  }`}
                />
              ))}
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-4 mb-6">
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

            {/* Back button */}
            <button
              onClick={handleBack}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 text-white/40 hover:text-white/70 text-sm font-semibold transition-all disabled:opacity-30 py-2"
            >
              <ArrowLeft size={16} />
              Cambiar NIT
            </button>
          </div>
        )}

      </div>
    </div>
  );
};