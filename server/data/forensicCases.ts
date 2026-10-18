// server/data/forensicCases.ts

export interface ForensicCase {
  id: string;
  ticker: string;
  pattern: string;
  trigger_condition: string;
  forensic_lesson: string;
  veto_applied: boolean;
  confidence_score: number;
}

export const FORENSIC_CASES: ForensicCase[] = [
  {
    id: 'FC-SASA-2022',
    ticker: 'SASA.IS',
    pattern: 'Aşırı F/K Balonu & Sosyal Medya Hype Doyumu',
    trigger_condition: 'F/K > 45 ve 10 günlük RSI > 88 iken tepe seviyede patron açıklaması ile başlayan panik satışı',
    forensic_lesson: 'Adil değerinin %150 üzerinde işlem gören ve likidite anomalisi barındıran hisselerde teknik sinyaller ne kadar pozitif olursa olsun jüri vetosu devreye girmeli.',
    veto_applied: true,
    confidence_score: 96
  },
  {
    id: 'FC-HEKTS-2022',
    ticker: 'HEKTS.IS',
    pattern: 'Borçluluk Artışı & Çarpan Kopması',
    trigger_condition: 'Net Borç/FAVÖK > 7x seviyesinde hisse fiyatının son 12 ayda 8 kat prim yapması',
    forensic_lesson: 'Temel rasyoları borç ve faiz ortamını taşımayan sanayi şirketlerinde agresif bilanço fiyatlamaları taban serilerine dönüşebilir.',
    veto_applied: true,
    confidence_score: 94
  },
  {
    id: 'FC-GUBRF-2023',
    ticker: 'GUBRF.IS',
    pattern: 'Bedelsiz Sermaye Artırımı İptali & Taban Serisi',
    trigger_condition: 'SPK bedelsiz ret kararı sonrası taban kilitleyen tahta ve BofA/Kurum çıkışı',
    forensic_lesson: 'Hisse geri alım veya sermaye artırımı beklentisiyle yapay fiyatlanan şirketlerde regülasyon şokları derin likidite krizine yol açar.',
    veto_applied: true,
    confidence_score: 98
  },
  {
    id: 'FC-CANTE-2023',
    ticker: 'CANTE.IS',
    pattern: 'Halka Arz Sonrası Dağıtım & Destek Kırılması',
    trigger_condition: 'Takasta yabancı ve ana ortak satışı ile 50 günlük hareketli ortalamanın altında hacimli kırılım',
    forensic_lesson: 'Ortak satışı eşliğinde kırılan majör destekler, algoritmaların otomatik satış baskısını tetikler.',
    veto_applied: true,
    confidence_score: 89
  },
  {
    id: 'FC-EREGL-2023',
    ticker: 'EREGL.IS',
    pattern: 'Emtia Döngüsü Dip Oluşumu & BofA Maliyet Duvarı',
    trigger_condition: 'Çelik fiyatlarındaki küresel baskı ve temettü kesintisi sonrası güçlü taban konsolidasyonu',
    forensic_lesson: 'Majör döngüsel şirketlerde BofA maliyet duvarı ve kurumsal takas alımları dip seviyelerde güçlü savunma kurgusu oluşturur.',
    veto_applied: false,
    confidence_score: 85
  },
  {
    id: 'FC-THYAO-2023',
    ticker: 'THYAO.IS',
    pattern: 'Güçlü Nakit Akışı & Düşük F/K Rallisi',
    trigger_condition: 'Yolcu doluluk rekorları ve F/K < 6 çarpanıyla yabancı girişinin ivmelenmesi',
    forensic_lesson: 'Temel verileri çarpan iskontosu sunan ve döviz geliri olan şirketlerde teknik düzeltmeler alım fırsatına dönüşür.',
    veto_applied: false,
    confidence_score: 92
  }
];

export function getForensicCases(): ForensicCase[] {
  return FORENSIC_CASES;
}

export function getForensicCaseByTicker(ticker: string): ForensicCase | undefined {
  if (!ticker) return undefined;
  const clean = ticker.replace(/\.IS$/i, '').toUpperCase().trim();
  return FORENSIC_CASES.find(c => {
    const caseClean = c.ticker.replace(/\.IS$/i, '').toUpperCase().trim();
    return caseClean === clean;
  });
}
