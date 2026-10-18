import React, { useState } from 'react';
import { Shield, Mail, Lock, UserPlus, LogIn, Loader2, AlertCircle, TrendingUp } from 'lucide-react';
import { BISTAPP_TOKEN_KEY, apiFetch } from '../utils/api';

interface AuthCardProps {
  onLoginSuccess: (token: string) => void;
}

export const AuthCard: React.FC<AuthCardProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const data = await apiFetch(`http://127.0.0.1:8001${endpoint}`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      const token = data.access_token;
      localStorage.setItem(BISTAPP_TOKEN_KEY, token);
      onLoginSuccess(token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] p-4 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo Section */}
        <div className="text-center mb-8 space-y-3">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 shadow-xl shadow-emerald-500/10">
            <Shield className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter">
            BISTAPP <span className="text-emerald-400">MT16</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            Yeni Nesil Çoklu Ajan Borsa Analiz Terminali
          </p>
        </div>

        {/* Auth Form Card */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-black/50">
          <div className="flex p-1 bg-slate-950/50 rounded-xl mb-8 border border-slate-800">
            <button
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                isLogin ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Giriş Yap
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                !isLogin ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Kayıt Ol
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">E-posta Adresi</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-emerald-400 text-slate-500">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="isim@sirket.com"
                  className="w-full bg-slate-950/50 border border-slate-800 text-white pl-12 pr-4 py-3.5 rounded-xl focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Parola</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-emerald-400 text-slate-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/50 border border-slate-800 text-white pl-12 pr-4 py-3.5 rounded-xl focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 animate-shake">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-xs font-bold leading-tight">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full relative group overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-700 disabled:to-slate-800 text-white py-4 rounded-xl font-black text-sm uppercase tracking-wider shadow-xl shadow-emerald-900/20 active:scale-[0.98] transition-all disabled:scale-100 disabled:opacity-70"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  İşleniyor...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  {isLogin ? 'Terminali Başlat' : 'Hesabımı Oluştur'}
                  <TrendingUp className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </div>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-slate-500 text-[11px] font-medium leading-relaxed">
            Giriş yaparak kullanım şartlarını ve veri işleme politikasını kabul etmiş sayılırsınız. 
            <br />BIST verileri gecikmeli olarak sunulmaktadır.
          </p>
        </div>

        {/* Footer info */}
        <div className="mt-8 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Sistem Aktif
          </div>
          <div className="w-px h-3 bg-slate-800" />
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            v4.0.0 Production
          </div>
        </div>
      </div>
    </div>
  );
};
