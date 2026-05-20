import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Coffee, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

type LoginStep = 'email' | 'password' | 'setup';

export const Login: React.FC = () => {
  const { checkEmail, login, setupPassword } = useAuth();
  
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nomeUtente, setNomeUtente] = useState<string>('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const triggerError = (msg: string) => {
    setError(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    setError(null);
    
    const { exists, needsSetup, nome } = await checkEmail(email);
    
    if (!exists) {
      triggerError('Email non autorizzata o errata.');
    } else {
      setNomeUtente(nome || '');
      setStep(needsSetup ? 'setup' : 'password');
    }
    setLoading(false);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError(null);

    const { success, error: loginError } = await login(email, password);

    if (!success) {
      triggerError(loginError || 'Password errata.');
    }
    setLoading(false);
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) return;

    if (password !== confirmPassword) {
      triggerError('Le password non coincidono.');
      return;
    }

    if (password.length < 6) {
      triggerError('La password deve avere almeno 6 caratteri.');
      return;
    }

    setLoading(true);
    setError(null);

    const { success, error: setupError } = await setupPassword(email, password);

    if (!success) {
      triggerError(setupError || 'Errore durante la creazione.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden">

      <style>
        {`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-8px); }
            40% { transform: translateX(8px); }
            60% { transform: translateX(-8px); }
            80% { transform: translateX(8px); }
          }
          .animate-shake {
            animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
          }
        `}
      </style>

      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-amber-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-50 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-50 pointer-events-none"></div>

      <div className={`w-full max-w-sm z-10 ${isShaking ? 'animate-shake' : ''}`}>
        <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-2xl">
          
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="bg-amber-500/10 p-3 rounded-2xl mb-4 border border-amber-500/20">
              <Coffee className="h-8 w-8 text-amber-500" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Bar Manager</h1>

            {step === 'email' && <p className="text-sm text-slate-400 mt-2 text-center">Accedi al gestionale turni.</p>}
            {step === 'password' && <p className="text-sm text-emerald-400 mt-2 font-medium flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Bentornato, {nomeUtente}</p>}
            {step === 'setup' && <p className="text-sm text-amber-400 mt-2 font-medium text-center">Benvenuto {nomeUtente}!<br/>Imposta la tua password.</p>}
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Indirizzo Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-10 pr-3 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                    placeholder="titolare@barmanager.it"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full flex items-center justify-center gap-2 bg-amber-500 text-slate-950 font-bold rounded-xl py-3.5 hover:bg-amber-400 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Verifica...' : 'Continua'} <ArrowRight className="h-5 w-5" />
              </button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-10 pr-10 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={() => { setStep('email'); setPassword(''); setError(null); }} className="text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer">
                  Cambia Account
                </button>
                <button
                  type="submit"
                  disabled={loading || !password}
                  className="flex items-center justify-center gap-2 bg-amber-500 text-slate-950 font-bold rounded-xl px-6 py-2.5 hover:bg-amber-400 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Accesso...' : 'Entra'}
                </button>
              </div>
            </form>
          )}

          {step === 'setup' && (
            <form onSubmit={handleSetupSubmit} className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Nuova Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-amber-500/50" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full bg-slate-950/50 border border-amber-500/30 rounded-xl py-3 pl-10 pr-10 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                    placeholder="Scegli password (min 6 car.)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Conferma Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-amber-500/50" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full bg-slate-950/50 border border-amber-500/30 rounded-xl py-3 pl-10 pr-3 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                    placeholder="Ripeti la password"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={() => { setStep('email'); setPassword(''); setConfirmPassword(''); setError(null); }} className="text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer">
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={loading || !password || !confirmPassword}
                  className="flex items-center justify-center gap-2 bg-amber-500 text-slate-950 font-bold rounded-xl px-6 py-2.5 hover:bg-amber-400 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Salvataggio...' : 'Attiva Account'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};