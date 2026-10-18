// src/utils/copyForLLM.ts
/**
 * MT16 BISTAPP — HARİCİ LLM PROMPT, .TOON VE 1 SAYFALIK HTML5 RAPOR ÜRETİCİ (copyForLLM.ts)
 *
 * Mimari Prensip:
 * - Arayüze 9 satırlık kanıt zinciri basmaz; yalnızca saf metin/veri döndürür.
 * - Başka LLM'lere (ChatGPT, Claude, Gemini, DeepSeek) verilecek hazır Kuant Prompt'u,
 *   .TOON (Token-Oriented Object Notation) veri paketini ve 1 sayfalık HTML5 Raporunu üretir.
 */

import { UnifiedVerdict } from './tacticalCollector';
import { LiveKapDisclosure } from '../services/kapDaemon';

/**
 * Başka LLM'lere (ChatGPT, Claude, DeepSeek, Gemini) yapıştırılacak hazır analiz promptu üretir.
 */
export function buildExternalLLMPrompt(
  verdict: UnifiedVerdict,
  disclosures: LiveKapDisclosure[] = []
): string {
  const cur = verdict.currencySymbol;
  const topNews = disclosures.slice(0, 4);
  const newsLines =
    topNews.length > 0
      ? topNews
          .map(
            (n, i) =>
              `${i + 1}. [${n.publish_time || 'Canlı'}] (${n.ticker}) ${n.title} — Etki: ${
                n.analysis?.impact_score >= 0 ? '+' : ''
              }${n.analysis?.impact_score ?? 0}/100`
          )
          .join('\n')
      : '1. Son seansta olağandışı negatif bildirim yok; rutin akış devam ediyor.';

  const cubeSummary = verdict.engines.storyCubes.cubes
    .map((c) => `${c.label}: ${c.valueText} (${c.signal})`)
    .join(' | ');

  return `Sen kıdemli bir Kurumsal Kuant Stratejisti ve Portföy Yöneticisisin. Aşağıda #${verdict.symbol} (${verdict.companyName} - ${verdict.marketType} Pazarı) için MT16 Kuant Terminali'nin 5 motorundan (Anomaly, L2 Bookmap, Forensic, 9-Küp, Composite V2) elde edilen CANLI VERİ PAKETİ yer almaktadır.

[1. ÖZET KARAR & FİYAT BAĞLAMI]
- Sembol / Pazar: #${verdict.symbol} (${verdict.marketType})
- Anlık Fiyat: ${cur}${verdict.price.toFixed(2)} (Günlük Değişim: %${verdict.changePct >= 0 ? '+' : ''}${verdict.changePct.toFixed(2)})
- Birleşik Kollektör Skoru: ${verdict.finalScore}/100 -> Karar: ${verdict.action} (Alarm Seviyesi: ${verdict.alarm})
- Tek Cümlelik Teşhis: ${verdict.reason}

[2. 5 MOTOR HAM KUANT METRİKLERİ]
- Anomali Motoru: Z-Skor = ${verdict.zScore >= 0 ? '+' : ''}${verdict.zScore.toFixed(2)}σ (Pazar Eşiği: ±${verdict.zThreshold.toFixed(1)}σ), HHI Yoğunlaşma = ${verdict.engines.anomaly.hhi}/100, Isolation Forest = ${verdict.engines.anomaly.isolationForestScore}, Tree Olasılık = %${verdict.engines.anomaly.treeProb}
- L2 Bookmap & Tahta Motoru: OBI = ${verdict.obi >= 0 ? '+' : ''}${verdict.obi.toFixed(3)}, Kütle Direnci = %${verdict.engines.board.massResistance}, Kademe Duvarı = ${verdict.wallLot.toLocaleString('tr-TR')} lot @ ${cur}${verdict.wallPrice.toFixed(2)}, Tahmini Erime = ${verdict.breakoutMinutes} dk, Sahte Duvar (Spoofing) = ${verdict.isFakeWall ? 'EVET' : 'HAYIR'}
- Adli (Forensic) Motor: Adli Risk = ${verdict.riskScore}/100, Wash Trade = %${verdict.engines.forensic.washTradeRatio}, Beneish M-Skor = ${verdict.engines.forensic.beneishMScore}, SPK Bayrakları = ${verdict.engines.forensic.spkFlags.join(', ') || 'TEMİZ'}
- 9 Küp Uyum Motoru: Uyum (Coherence) = %${verdict.coherence}, Çatışma = ${verdict.engines.storyCubes.conflictCount}/9, Zehirlenme = ${verdict.engines.storyCubes.is_poisoned ? 'AKTİF' : 'YOK'}
  Küp Detayı: ${cubeSummary}
- Composite V2 & Risk: Üstel Risk (EXPO_V2) = ${verdict.expoScore}/100, Non-Linear Çarpan = ${verdict.amplifier}x, Jüri Konsensüsü = %${verdict.juryScore}, VaR (95%) = -%${verdict.varPct}, Kelly Oranı = %${verdict.kellyPct}
- OCO Emir Seviyeleri: Stop-Loss (SL) = ${cur}${verdict.stopPrice.toFixed(2)} (-%1.0) | Take-Profit (TP) = ${cur}${verdict.tpPrice.toFixed(2)} (+%2.0)

[3. EN SON DÜŞEN CANLI RSS / KAP HABER AKIŞI (EN YENİDEN ESKİYE)]
${newsLines}

GÖREVİN:
Yukarıdaki verileri kullanarak klişe ifadelerden uzak, doğrudan doğal dilde, akıcı ve net bir analiz yap:
1. Tahtadaki mevcut alıcı/satıcı dengesini (L2 OBI, duvar erime süresi ve Z-Skor) yorumla.
2. Son haber/KAP akışının fiyatlama üzerindeki etkisini değerlendir.
3. Önümüzdeki seans için net bir oyun planı (Giriş koşulu, ${cur}${verdict.stopPrice.toFixed(2)} Stop-Loss ve ${cur}${verdict.tpPrice.toFixed(2)} Take-Profit seviyelerinin geçerliliği) sun.`;
}

/**
 * .TOON (Token-Oriented Object Notation) formatında sıkıştırılmış, düşük token maliyetli veri çıktısı üretir.
 */
export function buildToonPayload(
  verdict: UnifiedVerdict,
  disclosures: LiveKapDisclosure[] = []
): string {
  const cubesCompact = verdict.engines.storyCubes.cubes
    .map((c) => `${c.id}:${c.signal}(${c.score})`)
    .join(',');

  const newsCompact = disclosures
    .slice(0, 3)
    .map((d) => `"${d.ticker}|${d.publish_time}|${d.title.replace(/"/g, "'").slice(0, 60)}|imp:${d.analysis?.impact_score ?? 0}"`)
    .join('; ');

  return `#TOON/v3.5 schema=MT16_UNIFIED_VERDICT
@asset{sym:${verdict.symbol};mkt:${verdict.marketType};px:${verdict.price.toFixed(2)};chg:${verdict.changePct.toFixed(2)}%;ts:${verdict.timestamp}}
@verdict{score:${verdict.finalScore}/100;act:${verdict.action};alarm:${verdict.alarm};joker_override:${verdict.engines.composite.superCriticalFlag}}
@reason{"${verdict.reason}"}
@engines{z:${verdict.zScore.toFixed(2)}s;z_thr:${verdict.zThreshold.toFixed(1)}s;obi:${verdict.obi.toFixed(3)};jury:${verdict.juryScore}%;risk:${verdict.riskScore};coh:${verdict.coherence}%;expo:${verdict.expoScore};amp:${verdict.amplifier}x}
@board{wall_lot:${verdict.wallLot};wall_px:${verdict.wallPrice.toFixed(2)};melt_min:${verdict.breakoutMinutes};fake_wall:${verdict.isFakeWall};mass_res:${verdict.engines.board.massResistance}%}
@oco{stop:${verdict.stopPrice.toFixed(2)};tp:${verdict.tpPrice.toFixed(2)};var:-${verdict.varPct}%;kelly:${verdict.kellyPct}%}
@cubes[9]{${cubesCompact}}
@rss_latest[${Math.min(3, disclosures.length)}]{${newsCompact || 'NONE'}}`;
}

/**
 * DynamicHtml5Container içinde görüntülenecek ve tek sayfada (1-Page PDF) çıktı alınabilecek HTML5 Raporu üretir.
 */
export function buildSinglePageHtml5Report(
  verdict: UnifiedVerdict,
  disclosures: LiveKapDisclosure[] = []
): string {
  const cur = verdict.currencySymbol;
  const actionColor =
    verdict.action === 'AL' ? '#10b981' : verdict.action === 'SAT' ? '#f43f5e' : '#f59e0b';

  const cubesHtml = verdict.engines.storyCubes.cubes
    .map((c) => {
      const col = c.signal === 'AL' ? '#10b981' : c.signal === 'SAT' ? '#f43f5e' : '#94a3b8';
      return `<div style="background:#0f172a;border:1px solid #1e293b;border-radius:8px;padding:8px 10px;">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;font-weight:700;">
          <span>${c.label}</span>
          <span style="color:${col};">${c.signal} (${c.score})</span>
        </div>
        <div style="font-size:13px;font-weight:800;color:#f8fafc;margin-top:3px;font-family:monospace;">${c.valueText}</div>
      </div>`;
    })
    .join('');

  const rssHtml = disclosures
    .slice(0, 3)
    .map(
      (d) => `<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid #1e293b;font-size:11px;">
        <span style="color:#e2e8f0;"><strong>[${d.ticker}]</strong> ${d.title}</span>
        <span style="color:#38bdf8;white-space:nowrap;font-family:monospace;">${d.publish_time} · Etki ${d.analysis?.impact_score ?? 0}</span>
      </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <title>#${verdict.symbol} — MT16 Tek Sayfa Kuant Raporu</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #020617;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 20px;
      line-height: 1.45;
    }
    .card {
      max-width: 920px;
      margin: 0 auto;
      background: #090f1f;
      border: 1px solid #1e293b;
      border-radius: 14px;
      padding: 20px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 14px;
      margin-bottom: 14px;
    }
    .badge {
      background: ${actionColor}22;
      color: ${actionColor};
      border: 1px solid ${actionColor};
      padding: 6px 14px;
      border-radius: 8px;
      font-weight: 900;
      font-family: monospace;
      font-size: 15px;
    }
    .metrics-bar {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }
    .metric-box {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 8px 10px;
      text-align: center;
    }
    .metric-box .lbl { font-size: 10px; color: #64748b; text-transform: uppercase; }
    .metric-box .val { font-size: 14px; font-weight: 800; font-family: monospace; color: #f8fafc; margin-top: 2px; }
    .nl-box {
      background: #0f172a;
      border-left: 3px solid ${actionColor};
      padding: 12px 14px;
      border-radius: 8px;
      font-size: 12.5px;
      color: #cbd5e1;
      margin-bottom: 14px;
    }
    .cubes-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }
    @media print {
      body { background: #020617; padding: 0; }
      .card { border: none; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <div style="font-size:20px;font-weight:900;font-family:monospace;">
          #${verdict.symbol} <span style="color:#94a3b8;font-size:14px;font-weight:500;">${verdict.companyName} (${verdict.marketType})</span>
        </div>
        <div style="font-size:12px;color:#38bdf8;margin-top:3px;">${verdict.reason}</div>
      </div>
      <div class="badge">${verdict.finalScore}/100 · ${verdict.action} (${verdict.alarm})</div>
    </div>

    <div class="metrics-bar">
      <div class="metric-box"><div class="lbl">Fiyat</div><div class="val">${cur}${verdict.price.toFixed(2)} (${verdict.changePct >= 0 ? '+' : ''}${verdict.changePct.toFixed(2)}%)</div></div>
      <div class="metric-box"><div class="lbl">Z-Skor (Eşik ±${verdict.zThreshold}σ)</div><div class="val">${verdict.zScore >= 0 ? '+' : ''}${verdict.zScore.toFixed(2)}σ</div></div>
      <div class="metric-box"><div class="lbl">L2 OBI</div><div class="val">${verdict.obi >= 0 ? '+' : ''}${verdict.obi.toFixed(2)}</div></div>
      <div class="metric-box"><div class="lbl">Duvar Erime</div><div class="val">${verdict.breakoutMinutes} dk (${verdict.wallLot.toLocaleString('tr-TR')} lot)</div></div>
      <div class="metric-box"><div class="lbl">VaR / EXPO_V2</div><div class="val">-%${verdict.varPct} / ${verdict.expoScore}</div></div>
      <div class="metric-box"><div class="lbl">Stop / TP</div><div class="val">${cur}${verdict.stopPrice.toFixed(2)} / ${cur}${verdict.tpPrice.toFixed(2)}</div></div>
    </div>

    <div class="nl-box">
      <strong style="color:#f8fafc;display:block;margin-bottom:4px;">Doğal Dil Kuant Analizi:</strong>
      ${verdict.naturalLanguageAnalysis}
    </div>

    <div style="font-size:11px;font-weight:800;color:#94a3b8;margin-bottom:6px;text-transform:uppercase;">9 Küp Sentez Matrisi (Uyum: %${verdict.coherence})</div>
    <div class="cubes-grid">${cubesHtml}</div>

    <div style="font-size:11px;font-weight:800;color:#94a3b8;margin-bottom:4px;text-transform:uppercase;">Son Canlı RSS / KAP Bildirimleri (En Yeniden Eskiye)</div>
    <div>${rssHtml || '<div style="font-size:11px;color:#64748b;">Canlı bildirim akışı normal seyrediyor.</div>'}</div>
  </div>
</body>
</html>`;
}
