// src/components/SaasSubscriptionModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Shield,
  Check,
  Zap,
  Award,
  Crown,
  X,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { SaasPlan, TenantUserStatus } from '../types/enterprise';

export type { SaasPlan };
export type UserStatus = TenantUserStatus;

export interface SaasSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SaasSubscriptionModal: React.FC<SaasSubscriptionModalProps> = ({ isOpen, onClose }) => {
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resPlans, resUser] = await Promise.all([
        fetch('/api/saas/plans').then(r => r.json()),
        fetch('/api/saas/user-status').then(r => r.json()),
      ]);

      if (resPlans.success) setPlans(resPlans.plans);
      if (resUser.success) setUserStatus(resUser.user);
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async (planId: 'FREE' | 'PRO_TRADER' | 'INSTITUTIONAL') => {
    setIsUpdating(true);
    setMessage('');
    try {
      const res = await fetch('/api/saas/user-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.success) {
        setUserStatus(data.user);
        setMessage(data.message || 'Plan başarıyla güncellendi.');
      }
    } catch {
      setMessage('Plan güncelleme sırasında hata oluştu.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">MT16 SaaS Abonelik & Kurumsal Yetki Merkezi</h2>
              <p className="text-xs text-slate-400">
                Gelişmiş kuant motoru, canlı OBI akışı ve otomatik OCO sinyal botu planınızı seçin.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {userStatus && (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[10px] text-slate-400">Aktif Hesap / Kullanıcı</div>
              <div className="text-sm font-bold text-white font-mono mt-0.5">{userStatus.email}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Mevcut Plan</div>
              <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                {userStatus.currentPlanDetails.name} (${userStatus.currentPlanDetails.priceUsd}/{userStatus.currentPlanDetails.billingPeriod})
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">API Key Yetkisi</div>
              <div className="text-xs font-mono font-bold text-blue-300 mt-0.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                {userStatus.apiKey}
              </div>
            </div>
          </div>
        )}

        {message && (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs text-center font-bold">
            {message}
          </div>
        )}

        {/* PLANS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(plan => {
            const isCurrent = userStatus?.planId === plan.id;
            return (
              <div
                key={plan.id}
                className={`border rounded-2xl p-6 flex flex-col justify-between transition-all relative ${
                  isCurrent
                    ? 'bg-emerald-950/20 border-emerald-500/80 ring-2 ring-emerald-500/30'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 font-bold text-[10px] uppercase px-3 py-1 rounded-full shadow">
                    Aktif Planınız
                  </span>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-3xl font-black font-mono text-white">${plan.priceUsd}</span>
                      <span className="text-xs text-slate-400">/{plan.billingPeriod}</span>
                    </div>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-300">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800">
                  <button
                    disabled={isCurrent || isUpdating}
                    onClick={() => handleUpgrade(plan.id)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      isCurrent
                        ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                    }`}
                  >
                    {isCurrent ? 'Kullanımda' : 'Seç / Yükselt'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
