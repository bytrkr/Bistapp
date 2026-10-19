// src/services/manipulationEngine.ts
import { SocialData, FinalDecision } from '../types/quantEngine';

export type ManipulationRiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ManipulationViewModel {
  ticker: string;
  mentionCount: number;
  sentimentScore: number;
  manipulationRiskScore: number;
  level: ManipulationRiskLevel;
  levelLabel: 'Yüksek Risk' | 'Orta' | 'Düşük';
  badgeClass: string;
  summary: string;
  toon: string;
}

export class ManipulationEngine {
  /**
   * Python backend'den gelen SocialData veya FinalDecision nesnesini (snake_case)
   * TypeScript camelCase SocialData arayüzüne güvenli biçimde eşler.
   */
  public normalizeSocialData(
    ticker: string,
    rawDecision?: Partial<FinalDecision> | Record<string, any> | null,
    fallbackRiskScore: number = 0
  ): SocialData {
    const cleanTicker = (ticker || 'BIST').trim().toUpperCase().replace('.IS', '');

    if (!rawDecision) {
      const safeScore = Math.max(0, Math.min(100, Math.round(fallbackRiskScore)));
      const fallbackData: SocialData = {
        ticker: cleanTicker,
        mentionCount: 0,
        sentimentScore: 0,
        manipulationRiskScore: safeScore,
        summary: safeScore > 0 ? `${cleanTicker} sosyal manipülasyon taraması aktif.` : 'Veri yok',
      };
      fallbackData.toon = this.buildToon(fallbackData);
      return fallbackData;
    }

    const rawSocial =
      rawDecision.socialData ||
      rawDecision.social_data ||
      rawDecision.metadata?.social_data ||
      null;

    const mentionCount = Number(
      rawSocial?.mentionCount ?? rawSocial?.mention_count ?? 0
    );
    const sentimentScore = Number(
      rawSocial?.sentimentScore ?? rawSocial?.sentiment_score ?? 0
    );

    const rawRisk =
      rawSocial?.manipulationRiskScore ??
      rawSocial?.manipulation_risk_score ??
      rawDecision.manipulationRiskScore ??
      rawDecision.manipulation_risk_score ??
      rawDecision.metadata?.manipulation_risk_score ??
      fallbackRiskScore ??
      0;

    const manipulationRiskScore = Math.max(
      0,
      Math.min(100, Math.round(Number(rawRisk) || 0))
    );

    const summary =
      rawSocial?.summary ||
      (manipulationRiskScore > 70
        ? `${cleanTicker} tahtasında yüksek sosyal medya manipülasyon riski (pump & dump) tespit edildi.`
        : manipulationRiskScore >= 40
        ? `${cleanTicker} sosyal medya akışında orta düzey spekülatif hareketlilik izleniyor.`
        : 'Veri yok');

    const normalized: SocialData = {
      ticker: rawSocial?.ticker || cleanTicker,
      mentionCount,
      sentimentScore,
      manipulationRiskScore,
      summary,
      mention_count: mentionCount,
      sentiment_score: sentimentScore,
      manipulation_risk_score: manipulationRiskScore,
    };

    normalized.toon = rawSocial?.toon || this.buildToon(normalized);
    return normalized;
  }

  /**
   * 0-100 arası manipülasyon risk skorunu seviye (High/Medium/Low) ve renge çevirir.
   */
  public evaluateScore(rawScore: number): {
    score: number;
    level: ManipulationRiskLevel;
    levelDisplay: 'High' | 'Medium' | 'Low';
    levelLabel: 'Yüksek Risk' | 'Orta' | 'Düşük';
    color: 'red' | 'yellow' | 'green';
    badgeClass: string;
  } {
    const score = Math.max(0, Math.min(100, Math.round(Number(rawScore) || 0)));

    if (score > 70) {
      return {
        score,
        level: 'HIGH',
        levelDisplay: 'High',
        levelLabel: 'Yüksek Risk',
        color: 'red',
        badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse',
      };
    }

    if (score >= 40) {
      return {
        score,
        level: 'MEDIUM',
        levelDisplay: 'Medium',
        levelLabel: 'Orta',
        color: 'yellow',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
      };
    }

    return {
      score,
      level: 'LOW',
      levelDisplay: 'Low',
      levelLabel: 'Düşük',
      color: 'green',
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    };
  }

  /**
   * Risk skoruna göre arayüz rozet (Badge) görünüm modelini üretir:
   * - > 70: Kırmızı (Yüksek Risk)
   * - 40 - 70: Sarı (Orta)
   * - < 40: Yeşil (Düşük)
   */
  public formatForUI(
    ticker: string,
    rawDecision?: Partial<FinalDecision> | Record<string, any> | null,
    fallbackRiskScore: number = 0
  ): ManipulationViewModel {
    const social = this.normalizeSocialData(ticker, rawDecision, fallbackRiskScore);
    const evaluated = this.evaluateScore(social.manipulationRiskScore);

    return {
      ticker: social.ticker,
      mentionCount: social.mentionCount,
      sentimentScore: social.sentimentScore,
      manipulationRiskScore: evaluated.score,
      level: evaluated.level,
      levelLabel: evaluated.levelLabel,
      badgeClass: evaluated.badgeClass,
      summary: social.summary,
      toon: social.toon || this.buildToon(social),
    };
  }

  /**
   * SocialData nesnesini #TOON/v3.5 schema=BISTAPP_SOCIAL_MANIPULATION formatına dönüştürür.
   */
  public buildToon(data: SocialData): string {
    const score = data.manipulationRiskScore ?? data.manipulation_risk_score ?? 0;
    const mentions = data.mentionCount ?? data.mention_count ?? 0;
    const sentiment = data.sentimentScore ?? data.sentiment_score ?? 0;
    const level = score > 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW';
    const sign = sentiment >= 0 ? '+' : '';

    return [
      '#TOON/v3.5 schema=BISTAPP_SOCIAL_MANIPULATION',
      `@social{sym:${data.ticker};mentions:${mentions};sentiment:${sign}${sentiment.toFixed(2)};risk_score:${Math.round(score)}/100;level:${level}}`,
      `@summary{${data.summary || 'Veri yok'}}`,
    ].join('\n');
  }

  public formatAkdViewModel(rawAkd: any) {
    if (!rawAkd) {
      return {
        ticker: 'ASELS',
        top3NetLot: 0,
        bofaNetLot: 0,
        garantiNetLot: 0,
        isYatirimNetLot: 0,
        hhi: 0.20,
        signalType: 'DENGELI',
        signalLabel: 'Dengeli Kurumsal Akış',
        summary: 'Veri yok',
        toon: '',
      };
    }
    return {
      ticker: rawAkd.ticker || 'ASELS',
      top3NetLot: Number(rawAkd.top3_net_lot ?? rawAkd.top3NetLot ?? 0),
      bofaNetLot: Number(rawAkd.bofa_net_lot ?? rawAkd.bofaNetLot ?? 0),
      garantiNetLot: Number(rawAkd.garanti_net_lot ?? rawAkd.garantiNetLot ?? 0),
      isYatirimNetLot: Number(rawAkd.is_yatirim_net_lot ?? rawAkd.isYatirimNetLot ?? 0),
      hhi: Number(rawAkd.hhi_concentration ?? rawAkd.hhi ?? 0.2),
      signalType: rawAkd.signal_type || rawAkd.signalType || 'DENGELI',
      signalLabel: rawAkd.signal_label || rawAkd.signalLabel || 'Dengeli Kurumsal Akış',
      summary: rawAkd.summary || 'Veri yok',
      toon: rawAkd.toon || '',
    };
  }

  public formatTaxViewModel(rawTax: any) {
    if (!rawTax) {
      return {
        ticker: 'ASELS',
        nominalPnlTl: 0,
        nominalPnlPct: 0,
        realPnlUsd: 0,
        realPnlUsdPct: 0,
        withholdingRate: 0,
        netPnlTl: 0,
        taxStatus: 'EXEMPT_STOPAJ_0',
        summary: 'Veri yok',
        toon: '',
      };
    }
    const nom = rawTax.nominal || {};
    const fx = rawTax.fx_real_return || {};
    const tax = rawTax.taxation || {};

    return {
      ticker: rawTax.ticker || 'ASELS',
      nominalPnlTl: Number(nom.nominal_pnl_tl ?? rawTax.nominalPnlTl ?? 0),
      nominalPnlPct: Number(nom.nominal_pnl_pct ?? rawTax.nominalPnlPct ?? 0),
      realPnlUsd: Number(fx.real_pnl_usd ?? rawTax.realPnlUsd ?? 0),
      realPnlUsdPct: Number(fx.real_pnl_usd_pct ?? rawTax.realPnlUsdPct ?? 0),
      withholdingRate: Number(tax.withholding_tax_rate ?? rawTax.withholdingRate ?? 0),
      netPnlTl: Number(tax.net_pnl_tl ?? rawTax.netPnlTl ?? 0),
      taxStatus: tax.tax_status || rawTax.taxStatus || 'EXEMPT_STOPAJ_0',
      summary: rawTax.summary || 'Veri yok',
      toon: rawTax.toon || '',
    };
  }

  public formatRiskViewModel(rawDecision: any) {
    const pos = rawDecision?.positionSizing || rawDecision?.position_sizing || rawDecision?.metadata?.position_sizing || {};
    const guard = rawDecision?.portfolioGuardStatus || rawDecision?.portfolio_guard_status || { approved: true, max_correlation: 0.12, reason: 'Korelasyon riski bulunmuyor.' };
    const slip = rawDecision?.slippageImpact || rawDecision?.slippage_impact || { executed_price: 100, fee_amount: 15.0, slippage_bps: 5.0 };

    return {
      capital: Number(pos.capital ?? 100000),
      kellyFraction: Number(pos.kelly_fraction ?? pos.kellyFraction ?? 0.15),
      recommendedAllocationUsd: Number(pos.recommended_allocation_usd ?? pos.recommendedAllocationUsd ?? 15000),
      recommendedLots: Number(pos.recommended_lots ?? pos.recommendedLots ?? 100),
      suggestedStopPrice: Number(pos.suggested_stop_price ?? pos.suggestedStopPrice ?? 0),
      atr: Number(pos.atr ?? 2.5),
      guardApproved: Boolean(guard.approved ?? true),
      guardCorrelation: Number(guard.max_correlation ?? guard.maxCorrelation ?? 0.15),
      guardReason: guard.reason || 'Portföy riski dengeli.',
      slippageBps: Number(slip.slippage_bps ?? slip.slippageBps ?? 5.0),
      feeAmount: Number(slip.fee_amount ?? slip.feeAmount ?? 12.5),
    };
  }
}

export const manipulationEngine = new ManipulationEngine();
export default manipulationEngine;
