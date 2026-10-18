// src/components/LayerVisibilityPanel.tsx
import React from 'react';
import {
  Eye,
  EyeOff,
  Layers,
  Radar,
  Shield,
  Cpu,
  Activity,
  Building2,
  CheckCircle2,
  Sliders
} from 'lucide-react';

export interface HudLayerVisibilityState {
  radarHud: boolean;
  juryMatrix: boolean;
  safetyShields: boolean;
  ocoExecution: boolean;
  institutionalMam: boolean;
  enterpriseDeck: boolean;
}

export interface LayerVisibilityPanelProps {
  visibility: HudLayerVisibilityState;
  onToggleLayer: (layer: keyof HudLayerVisibilityState) => void;
  onResetAll: () => void;
  activeTicker: string;
  zScore: number;
  obi: number;
}

const LAYER_CONFIG: {
  key: keyof HudLayerVisibilityState;
  label: string;
  shortDesc: string;
  accent: 'emerald' | 'cyan' | 'amber' | 'blue';
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    key: 'radarHud',
    label: 'Z-Skor & OBI Radar HUD',
    shortDesc: 'Dairesel telemetri & OCO Zırhı',
    accent: 'emerald',
    icon: Radar,
  },
  {
    key: 'juryMatrix',
    label: '6 Kuant Jüri Matrisi',
    shortDesc: 'TCMB EVDS & Finnhub Veto Ajanları',
    accent: 'cyan',
    icon: Cpu,
  },
  {
    key: 'safetyShields',
    label: 'Risk & Güvenlik Şalterleri',
    shortDesc: 'Devre Kesici, Latency & Korelasyon',
    accent: 'emerald',
    icon: Shield,
  },
  {
    key: 'ocoExecution',
    label: 'Alpaca Otonom OCO',
    shortDesc: 'Canlı Bracket Emir Terminali',
    accent: 'cyan',
    icon: Activity,
  },
  {
    key: 'institutionalMam',
    label: 'MAM/PAMM & Sinyal Botu',
    shortDesc: 'Track Record, VaR %95 & Kelly',
    accent: 'amber',
    icon: Layers,
  },
  {
    key: 'enterpriseDeck',
    label: 'Enterprise IP & Loglar',
    shortDesc: '$1.25M Değerleme & İşlem Geçmişi',
    accent: 'blue',
    icon: Building2,
  },
];

export const LayerVisibilityPanel: React.FC<LayerVisibilityPanelProps> = ({
  visibility,
  onToggleLayer,
  onResetAll,
  activeTicker,
  zScore,
  obi,
}) => {
  const activeCount = Object.values(visibility).filter(Boolean).length;
  const totalCount = LAYER_CONFIG.length;

  return (
    <div className="relative rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-cyan-500/25 p-4 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                Taktiksel Savaş Odası Katman Kontrolü (HUD Matrix)
              </h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {activeCount}/{totalCount} KATMAN AKTİF
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              #{activeTicker} için gerçek zamanlı telemetri katmanlarını filtreleyin veya tam görünürlükte inceleyin
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono">
            <span className="text-slate-400">RADAR:</span>
            <span className="text-emerald-400 font-bold">
              Z {zScore >= 0 ? '+' : ''}{zScore}σ
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-cyan-400 font-bold">
              OBI {obi >= 0 ? '+' : ''}{obi.toFixed(3)}
            </span>
          </div>

          {activeCount < totalCount && (
            <button
              type="button"
              onClick={onResetAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 text-xs font-bold transition-all cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.25)]"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Tüm Katmanları Aç</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3">
        {LAYER_CONFIG.map((item) => {
          const Icon = item.icon;
          const isVisible = visibility[item.key];

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onToggleLayer(item.key)}
              className={`group flex flex-col justify-between p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer select-none ${
                isVisible
                  ? 'bg-slate-950/85 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.12)] hover:border-emerald-400'
                  : 'bg-slate-950/40 border-slate-800/70 opacity-60 hover:opacity-90 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <div
                  className={`p-1.5 rounded-lg border ${
                    isVisible
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    isVisible
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}
                >
                  {isVisible ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                  {isVisible ? 'AÇIK' : 'GİZLİ'}
                </span>
              </div>

              <div>
                <div
                  className={`text-[11px] font-bold truncate ${
                    isVisible ? 'text-slate-100' : 'text-slate-400'
                  }`}
                >
                  {item.label}
                </div>
                <div className="text-[9px] text-slate-500 truncate mt-0.5">{item.shortDesc}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
