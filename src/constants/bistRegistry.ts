export interface BISTIndexCategory {
  code: string;
  name: string;
  type: 'MARKET' | 'SECTOR' | 'CAP';
}

export interface BISTStockItem {
  symbol: string;
  name: string;
  sector: string;
  market?: string;
  code?: string;
  ticker?: string;
  marketCap?: number; // Piyasa Değeri (Milyar TL)
  pe?: number; // F/K
  peg?: number; // PEG
  price?: number; // Fiyat (TL)
  rate?: number; // Değişim %
  fairValue?: number; // Adil Değer
  fairValuePotentialPct?: number; // Adil Değer Potansiyeli %
  analystTarget?: number; // Analist Fiyat Hedefi
  targetPotentialPct?: number; // Hedef Potansiyeli %
  healthScore?: number; // Genel Sağlık Skoru (0-100)
}

export const BIST_INDEXES: BISTIndexCategory[] = [
  { code: 'XUTUM', name: 'BIST Tüm Paylar', type: 'CAP' },
  { code: 'XU100', name: 'BIST 100', type: 'CAP' },
  { code: 'XU050', name: 'BIST 50', type: 'CAP' },
  { code: 'XU030', name: 'BIST 30', type: 'CAP' },
  { code: 'XYILD', name: 'Yıldız Pazar', type: 'MARKET' },
  { code: 'XANAP', name: 'Ana Pazar', type: 'MARKET' },
  { code: 'XALTP', name: 'Alt Pazar', type: 'MARKET' },
  { code: 'XBANK', name: 'BIST Banka', type: 'SECTOR' },
  { code: 'XUSIN', name: 'BIST Sınai', type: 'SECTOR' },
  { code: 'XUHIZ', name: 'BIST Hizmetler', type: 'SECTOR' },
  { code: 'XTKNS', name: 'BIST Teknoloji', type: 'SECTOR' },
  { code: 'XGMYO', name: 'BIST GYO', type: 'SECTOR' }
];

export const BIST_FULL_REGISTRY: BISTStockItem[] = [
  { symbol: "EREGL.IS", code: "EREGL", ticker: "EREGL.IS", name: "Ereğli Demir ve Çelik", sector: "Metal / Maden", market: "Yıldız", marketCap: 132.5, pe: 11.4, peg: 1.25, price: 37.94, rate: 2.10, fairValue: 48.50, fairValuePotentialPct: 27.8, analystTarget: 52.00, targetPotentialPct: 37.0, healthScore: 78 },
  { symbol: "ISDMR.IS", code: "ISDMR", ticker: "ISDMR.IS", name: "İskenderun Demir Çelik", sector: "Metal / Maden", market: "Yıldız", marketCap: 98.2, pe: 12.8, peg: 1.35, price: 42.10, rate: 1.45, fairValue: 52.00, fairValuePotentialPct: 23.5, analystTarget: 55.00, targetPotentialPct: 30.6, healthScore: 75 },
  { symbol: "KRDMD.IS", code: "KRDMD", ticker: "KRDMD.IS", name: "Kardemir (D)", sector: "Metal / Maden", market: "Yıldız", marketCap: 24.6, pe: 9.2, peg: 0.95, price: 21.40, rate: -0.80, fairValue: 28.00, fairValuePotentialPct: 30.8, analystTarget: 30.50, targetPotentialPct: 42.5, healthScore: 72 },
  { symbol: "GUBRF.IS", code: "GUBRF", ticker: "GUBRF.IS", name: "Gübre Fabrikaları", sector: "Kimya / Hammadde", market: "Yıldız", marketCap: 52.4, pe: 24.5, peg: 2.10, price: 156.20, rate: 3.40, fairValue: 140.00, fairValuePotentialPct: -10.4, analystTarget: 175.00, targetPotentialPct: 12.0, healthScore: 68 },
  { symbol: "OYAKC.IS", code: "OYAKC", ticker: "OYAKC.IS", name: "Oyak Çimento", sector: "Çimento / İnşaat", market: "Yıldız", marketCap: 38.9, pe: 8.5, peg: 0.82, price: 68.30, rate: 0.95, fairValue: 85.00, fairValuePotentialPct: 24.4, analystTarget: 90.00, targetPotentialPct: 31.8, healthScore: 84 },
  { symbol: "SASA.IS", code: "SASA", ticker: "SASA.IS", name: "Sasa Polyester", sector: "Kimya / Hammadde", market: "Yıldız", marketCap: 110.0, pe: 31.2, peg: 2.80, price: 4.25, rate: 1.10, fairValue: 5.10, fairValuePotentialPct: 20.0, analystTarget: 5.50, targetPotentialPct: 29.4, healthScore: 65 },
  { symbol: "PETKM.IS", code: "PETKM", ticker: "PETKM.IS", name: "Petkim Petrokimya", sector: "Kimya / Hammadde", market: "Yıldız", marketCap: 45.3, pe: 14.1, peg: 1.40, price: 16.50, rate: -1.20, fairValue: 21.00, fairValuePotentialPct: 27.3, analystTarget: 23.00, targetPotentialPct: 39.4, healthScore: 74 },
  { symbol: "AKCNS.IS", code: "AKCNS", ticker: "AKCNS.IS", name: "Akçansa Çimento", sector: "Çimento / İnşaat", market: "Yıldız", marketCap: 32.1, pe: 9.8, peg: 0.90, price: 168.50, rate: 1.80, fairValue: 210.00, fairValuePotentialPct: 24.6, analystTarget: 225.00, targetPotentialPct: 33.5, healthScore: 82 },
  { symbol: "CIMSA.IS", code: "CIMSA", ticker: "CIMSA.IS", name: "Çimsa Çimento", sector: "Çimento / İnşaat", market: "Yıldız", marketCap: 28.4, pe: 10.2, peg: 0.98, price: 39.50, rate: 0.50, fairValue: 50.00, fairValuePotentialPct: 26.6, analystTarget: 54.00, targetPotentialPct: 36.7, healthScore: 80 },
  { symbol: "HEKTS.IS", code: "HEKTS", ticker: "HEKTS.IS", name: "Hektaş Ticaret", sector: "Kimya / Tarım", market: "Yıldız", marketCap: 18.5, pe: 38.4, peg: 3.10, price: 4.10, rate: -2.30, fairValue: 3.80, fairValuePotentialPct: -7.3, analystTarget: 4.80, targetPotentialPct: 17.1, healthScore: 58 },
  { symbol: "ASELS.IS", code: "ASELS", ticker: "ASELS.IS", name: "Aselsan Elektronik", sector: "Savunma / Teknoloji", market: "Yıldız", marketCap: 168.0, pe: 16.5, peg: 1.15, price: 372.80, rate: 2.40, fairValue: 420.00, fairValuePotentialPct: 12.7, analystTarget: 460.00, targetPotentialPct: 23.4, healthScore: 89 },
  { symbol: "THYAO.IS", code: "THYAO", ticker: "THYAO.IS", name: "Türk Hava Yolları", sector: "Havacılık", market: "Yıldız", marketCap: 390.0, pe: 5.4, peg: 0.45, price: 282.50, rate: 1.85, fairValue: 380.00, fairValuePotentialPct: 34.5, analystTarget: 420.00, targetPotentialPct: 48.7, healthScore: 91 },
  { symbol: "GARAN.IS", code: "GARAN", ticker: "GARAN.IS", name: "Garanti BBVA", sector: "Bankacılık", market: "Yıldız", marketCap: 470.0, pe: 4.8, peg: 0.38, price: 112.30, rate: 3.10, fairValue: 150.00, fairValuePotentialPct: 33.6, analystTarget: 165.00, targetPotentialPct: 47.0, healthScore: 94 },
  { symbol: "TUPRS.IS", code: "TUPRS", ticker: "TUPRS.IS", name: "Tüpraş", sector: "Enerji / Rafineri", market: "Yıldız", marketCap: 310.0, pe: 7.2, peg: 0.70, price: 164.80, rate: 0.40, fairValue: 210.00, fairValuePotentialPct: 27.4, analystTarget: 235.00, targetPotentialPct: 42.6, healthScore: 88 },
  { symbol: "KCHOL.IS", code: "KCHOL", ticker: "KCHOL.IS", name: "Koç Holding", sector: "Holding", market: "Yıldız", marketCap: 570.0, pe: 6.9, peg: 0.65, price: 224.50, rate: 1.20, fairValue: 300.00, fairValuePotentialPct: 33.6, analystTarget: 330.00, targetPotentialPct: 47.0, healthScore: 92 },
  { symbol: "BIMAS.IS", code: "BIMAS", ticker: "BIMAS.IS", name: "BİM Mağazalar", sector: "Perakende", market: "Yıldız", marketCap: 295.0, pe: 14.8, peg: 1.10, price: 485.00, rate: 1.50, fairValue: 580.00, fairValuePotentialPct: 19.6, analystTarget: 620.00, targetPotentialPct: 27.8, healthScore: 87 },
  { symbol: "AKBNK.IS", code: "AKBNK", ticker: "AKBNK.IS", name: "Akbank", sector: "Bankacılık", market: "Yıldız", marketCap: 292.0, pe: 4.5, peg: 0.35, price: 56.40, rate: 2.30, fairValue: 75.00, fairValuePotentialPct: 33.0, analystTarget: 82.00, targetPotentialPct: 45.4, healthScore: 93 },
  { symbol: "SISE.IS", code: "SISE", ticker: "SISE.IS", name: "Şişecam", sector: "Cam / Kimya", market: "Yıldız", marketCap: 135.0, pe: 11.2, peg: 1.05, price: 44.90, rate: 0.80, fairValue: 60.00, fairValuePotentialPct: 33.6, analystTarget: 65.00, targetPotentialPct: 44.8, healthScore: 85 },
  { symbol: "SAHOL.IS", code: "SAHOL", ticker: "SAHOL.IS", name: "Sabancı Holding", sector: "Holding", market: "Yıldız", marketCap: 182.0, pe: 5.1, peg: 0.48, price: 89.20, rate: 1.10, fairValue: 120.00, fairValuePotentialPct: 34.5, analystTarget: 135.00, targetPotentialPct: 51.3, healthScore: 90 },
  { symbol: "ENKAI.IS", code: "ENKAI", ticker: "ENKAI.IS", name: "Enka İnşaat", sector: "İnşaat / Enerji", market: "Yıldız", marketCap: 288.0, pe: 12.5, peg: 1.20, price: 48.20, rate: 0.60, fairValue: 62.00, fairValuePotentialPct: 28.6, analystTarget: 68.00, targetPotentialPct: 41.1, healthScore: 86 },
  { symbol: "FROTO.IS", code: "FROTO", ticker: "FROTO.IS", name: "Ford Otosan", sector: "Otomotiv", market: "Yıldız", marketCap: 385.0, pe: 10.8, peg: 0.95, price: 1095.00, rate: 1.40, fairValue: 1350.00, fairValuePotentialPct: 23.3, analystTarget: 1480.00, targetPotentialPct: 35.2, healthScore: 92 },
  { symbol: "TOASO.IS", code: "TOASO", ticker: "TOASO.IS", name: "Tofaş Oto", sector: "Otomotiv", market: "Yıldız", marketCap: 145.0, pe: 9.4, peg: 0.88, price: 290.00, rate: -0.50, fairValue: 360.00, fairValuePotentialPct: 24.1, analystTarget: 400.00, targetPotentialPct: 37.9, healthScore: 85 },
  { symbol: "ARCLK.IS", code: "ARCLK", ticker: "ARCLK.IS", name: "Arçelik", sector: "Dayanıklı Tüketim", market: "Yıldız", marketCap: 95.0, pe: 15.2, peg: 1.40, price: 140.00, rate: 0.75, fairValue: 175.00, fairValuePotentialPct: 25.0, analystTarget: 190.00, targetPotentialPct: 35.7, healthScore: 79 },
  { symbol: "PGSUS.IS", code: "PGSUS", ticker: "PGSUS.IS", name: "Pegasus Hava Taşımacılığı", sector: "Havacılık", market: "Yıldız", marketCap: 92.0, pe: 7.8, peg: 0.62, price: 215.00, rate: 2.80, fairValue: 290.00, fairValuePotentialPct: 34.9, analystTarget: 325.00, targetPotentialPct: 51.2, healthScore: 88 },
  { symbol: "MGROS.IS", code: "MGROS", ticker: "MGROS.IS", name: "Migros Ticaret", sector: "Perakende", market: "Yıldız", marketCap: 88.0, pe: 11.5, peg: 1.02, price: 490.00, rate: 1.90, fairValue: 620.00, fairValuePotentialPct: 26.5, analystTarget: 680.00, targetPotentialPct: 38.8, healthScore: 89 },
  { symbol: "YKBNK.IS", code: "YKBNK", ticker: "YKBNK.IS", name: "Yapı Kredi", sector: "Bankacılık", market: "Yıldız", marketCap: 255.0, pe: 4.2, peg: 0.32, price: 30.50, rate: 1.70, fairValue: 42.00, fairValuePotentialPct: 37.7, analystTarget: 46.00, targetPotentialPct: 50.8, healthScore: 92 },
  { symbol: "ISCTR.IS", code: "ISCTR", ticker: "ISCTR.IS", name: "Türkiye İş Bankası (C)", sector: "Bankacılık", market: "Yıldız", marketCap: 305.0, pe: 4.6, peg: 0.36, price: 14.15, rate: 2.05, fairValue: 19.50, fairValuePotentialPct: 37.8, analystTarget: 22.00, targetPotentialPct: 55.5, healthScore: 93 },
  { symbol: "ALARK.IS", code: "ALARK", ticker: "ALARK.IS", name: "Alarko Holding", sector: "Holding", market: "Yıldız", marketCap: 78.0, pe: 6.5, peg: 0.58, price: 115.00, rate: -0.90, fairValue: 155.00, fairValuePotentialPct: 34.8, analystTarget: 175.00, targetPotentialPct: 52.2, healthScore: 84 },
  { symbol: "ASTOR.IS", code: "ASTOR", ticker: "ASTOR.IS", name: "Astor Enerji", sector: "Elektrik", market: "Yıldız", marketCap: 112.0, pe: 22.4, peg: 1.85, price: 112.00, rate: 3.20, fairValue: 135.00, fairValuePotentialPct: 20.5, analystTarget: 150.00, targetPotentialPct: 33.9, healthScore: 81 },
  { symbol: "KONTR.IS", code: "KONTR", ticker: "KONTR.IS", name: "Kontrolmatik Teknoloji", sector: "Teknoloji", market: "Yıldız", marketCap: 35.0, pe: 28.5, peg: 2.10, price: 42.50, rate: 4.10, fairValue: 52.00, fairValuePotentialPct: 22.4, analystTarget: 60.00, targetPotentialPct: 41.2, healthScore: 76 }
];
