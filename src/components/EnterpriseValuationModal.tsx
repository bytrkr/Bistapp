// src/components/EnterpriseValuationModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Building2,
  ShieldCheck,
  Award,
  Sparkles,
  DollarSign,
  FileText,
  Check,
  X,
  RefreshCw,
  Globe,
  Sliders
} from 'lucide-react';
import { WhiteLabelConfig, InvestorReport } from '../types/enterprise';

export type { WhiteLabelConfig, InvestorReport };

export interface EnterpriseValuationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EnterpriseValuationModal: React.FC<EnterpriseValuationModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<WhiteLabelConfig | null>(null);
  const [report, setReport] = useState<InvestorReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'valuation' | 'whitelabel'>('valuation');

  useEffect(() => {
    if (isOpen) {
      fetchEnterpriseData();
    }
  }, [isOpen]);

  const fetchEnterpriseData = async () => {
    setIsLoading(true);
    try {
      const [resConfig, resReport] = await Promise.all([
        fetch('/api/enterprise/white-label-config').then(r => r.json()),
        fetch('/api/enterprise/investor-whitepaper').then(r => r.json()),
      ]);

      if (resConfig.success) setConfig(resConfig.config);
      if (resReport.success) setReport(resReport.report);
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setIsSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/enterprise/white-label-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setMessage(data.message || 'White-Label ayarları kaydedildi.');
      }
    } catch {
      setMessage('Kayıt sırasında hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-blue-500/25 text-emerald-400 border border-emerald-500/30">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Enterprise & Investor Valuation Center ($1M+ IP Deck)</h2>
              <p className="text-xs text-slate-400">
                Kurumsal White-Label lisanslama, patent denetim raporu ve yatırımcı sunumu (Pitch Deck).
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

        {/* TAB SWITCHER */}
        <div className="flex gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('valuation')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'valuation'
                ? 'bg-emerald-500 text-slate-950 font-black'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            📊 Yatırımcı Değerleme & IP Raporu ($1.25M)
          </button>
          <button
            onClick={() => setActiveTab('whitelabel')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'whitelabel'
                ? 'bg-blue-600 text-white font-black'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            🏢 White-Label & Aracı Kurum OEM Yapılandırması
          </button>
        </div>

        {/* TAB 1: VALUATION & IP DECK */}
        {activeTab === 'valuation' && report && (
          <div className="space-y-6 animate-fadeIn">
            {/* VALUATION BANNER */}
            <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-blue-950/40 border border-emerald-500/30 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-6">
              <div>
                <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">Değerleme Sınıfı</span>
                <div className="text-3xl font-mono font-black text-white mt-1">
                  ${report.valuationUsd.toLocaleString('en-US')} USD
                </div>
                <div className="text-xs text-slate-400 mt-1">{report.valuationTier}</div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Denetim Tarihi: {new Date(report.auditTimestamp).toLocaleDateString('tr-TR')}</span>
                <span className="text-xs font-bold text-slate-300 block mt-1">{report.auditor}</span>
              </div>
            </div>

            {/* IP ASSETS */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" />
                Fikrî Mülkiyet (IP) & Patent Varlıkları
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {report.ipAssets.map((ip, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-purple-300 font-mono bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                        {ip.patentStatus}
                      </span>
                      <span className="font-mono font-bold text-emerald-400 text-xs">
                        +${(ip.valuationContributionUsd / 1000).toFixed(0)}k
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{ip.name}</h4>
                    <p className="text-xs text-slate-400 leading-normal">{ip.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* INVESTOR PITCH DECK */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                Yatırımcı Sunumu (Pitch Deck) & Pazar Özeti
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="text-slate-400 uppercase text-[10px] font-semibold">Hedef Pazar & TAM</div>
                  <div className="font-bold text-white">{report.investorPitchDeck.targetMarket}</div>
                  <div className="text-emerald-400 font-mono font-bold">{report.investorPitchDeck.tamSomSam}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="text-slate-400 uppercase text-[10px] font-semibold">Gelir Modeli & Projeksiyon</div>
                  <div className="font-bold text-white">{report.investorPitchDeck.revenueModel}</div>
                  <div className="text-blue-400 font-mono font-bold">Projelendirilen ARR: ${(report.investorPitchDeck.projectedArrUsd / 1000000).toFixed(2)}M</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: WHITE-LABEL CONFIG */}
        {activeTab === 'whitelabel' && config && (
          <form onSubmit={handleSaveConfig} className="space-y-6 animate-fadeIn">
            {message && <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold text-center">{message}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Kurum / Aracı Kurum Adı</label>
                <input
                  type="text"
                  value={config.institutionName}
                  onChange={e => setConfig({ ...config, institutionName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Slogan / Tagline</label>
                <input
                  type="text"
                  value={config.brandTagline}
                  onChange={e => setConfig({ ...config, brandTagline: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Özel Alan Adı (Custom Domain)</label>
                <input
                  type="text"
                  value={config.customDomain}
                  onChange={e => setConfig({ ...config, customDomain: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Destek E-Posta</label>
                <input
                  type="email"
                  value={config.supportEmail}
                  onChange={e => setConfig({ ...config, supportEmail: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                disabled={isSaving}
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/20 cursor-pointer"
              >
                {isSaving ? 'Kaydediliyor...' : 'White-Label Ayarlarını Kaydet'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
