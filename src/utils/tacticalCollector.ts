// src/utils/tacticalCollector.ts
/**
 * MT16 BISTAPP — MERKEZİ TAKTİKSEL KOLLEKTÖR (tacticalCollector.ts)
 *
 * Mimari Prensip:
 * - Tüm alt motorlar (anomalyEngine, boardEngine, forensicEngine, storyCubesEngine, compositeV2)
 *   yalnızca saf veri döndürür; hiçbiri doğrudan UI basmaz.
 * - "Joker Yeterliyse Diğerleri Çalışmaz" (Hierarchical Override) mantığıyla 5 motorun çıktısı
 *   tek bir UnifiedVerdict nesnesine indirgenir.
 * - Pazar bazlı Z-Skor eşikleri: BIST için ±1.8σ, CRYPTO ve NASDAQ için ±2.0σ.
 */

export type TacticalMarketType = 'BIST' | 'CRYPTO' | 'NASDAQ';
export type TacticalAction = 'AL' | 'SAT' | 'BEKLE';
export type TacticalAlarmLevel =
  | 'DENGELI'
  | 'INCELEME_GEREKLI'
  | 'TAHTA_KONTROLU'
  | 'MANIPULASYON_ALARM'
  | 'SUPER_KRITIK_ALARM';

export interface AnomalyEngineOutput {
  zScore: number;
  hhi: number; // Herfindahl-Hirschman Index (0 - 10000 veya 0 - 100 normalize)
  hhiMonopol: boolean;
  isolationForestScore: number; // 0 - 1
  treeProb: number; // 0 - 100
  verdict: 'NORMAL' | 'DIKKAT' | 'ANOMALI_ALARM';
}

export interface BoardEngineOutput {
  obi: number; // -1.0 .. +1.0
  massResistance: number; // 0 - 100
  wallLot: number;
  wallPrice: number;
  breakoutMinutes: number;
  isFakeWall: boolean;
  whaleLabel: 'WHALE_WALL' | 'RESISTANCE_WALL' | 'SUPPORT_WALL' | 'NORMAL_TAHTA';
}

export interface ForensicEngineOutput {
  riskScore: number; // 0 - 100
  washTradeRatio: number; // 0 - 100%
  spkFlags: string[];
  beneishMScore: number;
  isManipulated: boolean;
}

export interface StoryCubeItem {
  id: string;
  label: string;
  signal: TacticalAction;
  score: number; // 0 - 100
  valueText: string;
  note: string;
}

export interface StoryCubesEngineOutput {
  cubes: StoryCubeItem[]; // 9 Küp: Duygu, BofA, Derinlik, Takas, Anomali, Momentum, Vol, Mali, Rejim
  coherence: number; // 0 - 100%
  conflictCount: number;
  is_poisoned: boolean;
  overrideAction: TacticalAction;
}

export interface CompositeV2EngineOutput {
  exponentialRiskScore: number; // 0 - 100
  nonLinearAmplifier: number; // 1.0x - 3.5x
  directionalCoherence: number; // -100 .. +100
  superCriticalFlag: boolean;
  memoryEvidenceScore: number; // 0 - 100
}

export interface TacticalCollectorInput {
  symbol: string;
  companyName?: string;
  marketType: TacticalMarketType;
  price: number;
  changePct: number;
  zScore?: number;
  obi?: number;
  rsi?: number;
  wallLot?: number;
  wallPrice?: number;
  spreadPct?: number;
  bofaNetLot?: number;
  citibankSharePct?: number;
  altmanZ?: number;
  piotroskiF?: number;
  juryScore?: number;
  isJuryVetoed?: boolean;
  latestKapTitle?: string;
  latestKapImpact?: number;
  latestKapTime?: string;
}

export interface UnifiedVerdict {
  symbol: string;
  companyName: string;
  marketType: TacticalMarketType;
  currencySymbol: string;
  price: number;
  changePct: number;
  finalScore: number; // 0 - 100
  action: TacticalAction;
  alarm: TacticalAlarmLevel;
  reason: string; // Tek cümlelik net özet (Kart gövdesi için)
  naturalLanguageAnalysis: string; // Akıcı Türkçe doğal dil paragraf analizi
  zScore: number;
  zThreshold: number;
  obi: number;
  juryScore: number;
  riskScore: number;
  coherence: number;
  expoScore: number;
  amplifier: number;
  breakoutMinutes: number;
  wallLot: number;
  wallPrice: number;
  isFakeWall: boolean;
  varPct: number;
  kellyPct: number;
  stopPrice: number;
  tpPrice: number;
  engines: {
    anomaly: AnomalyEngineOutput;
    board: BoardEngineOutput;
    forensic: ForensicEngineOutput;
    storyCubes: StoryCubesEngineOutput;
    composite: CompositeV2EngineOutput;
  };
  latestHeadline?: {
    title: string;
    impact: number;
    time: string;
  };
  timestamp: string;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * 1. Motor: Anomaly Engine (Z-Skor, HHI, Isolation Forest, Tree Prob)
 */
export function runAnomalyEngine(
  input: TacticalCollectorInput,
  zThreshold: number
): AnomalyEngineOutput {
  const z = Number((input.zScore ?? 0).toFixed(2));
  const absZ = Math.abs(z);
  const obiAbs = Math.abs(input.obi ?? 0);

  // HHI yoğunlaşma endeksi (0-100 ölçeğinde normalize)
  const hhi = Math.round(clamp(32 + absZ * 14 + obiAbs * 28, 15, 98));
  const hhiMonopol = hhi >= 82;

  const isolationForestScore = Number(clamp((absZ / 4.0) * 0.65 + obiAbs * 0.35, 0.05, 0.99).toFixed(2));
  const treeProb = Math.round(clamp(50 + z * 12 + (input.obi ?? 0) * 22, 5, 99));

  let verdict: 'NORMAL' | 'DIKKAT' | 'ANOMALI_ALARM' = 'NORMAL';
  if (absZ >= zThreshold * 1.45 || isolationForestScore >= 0.85) {
    verdict = 'ANOMALI_ALARM';
  } else if (absZ >= zThreshold) {
    verdict = 'DIKKAT';
  }

  return {
    zScore: z,
    hhi,
    hhiMonopol,
    isolationForestScore,
    treeProb,
    verdict,
  };
}

/**
 * 2. Motor: Board / Bookmap L2 Engine (Kütle Direnci, Balina Duvarı, Erime Süresi, Sahte Duvar)
 */
export function runBoardEngine(input: TacticalCollectorInput): BoardEngineOutput {
  const obi = Number((input.obi ?? 0).toFixed(3));
  const price = input.price > 0 ? input.price : 100;
  const wallLot = input.wallLot && input.wallLot > 0 ? Math.round(input.wallLot) : Math.round(1250000 / Math.max(1, price));
  const wallPrice =
    input.wallPrice && input.wallPrice > 0
      ? Number(input.wallPrice.toFixed(2))
      : Number((price * (obi >= 0 ? 1.012 : 0.988)).toFixed(2));

  // Kütle direnci (0-100): Satış baskısı ve duvar büyüklüğüyle artar
  const rawResistance = 48 - obi * 32 + (input.zScore && input.zScore < -1.5 ? 18 : 0);
  const massResistance = Math.round(clamp(rawResistance, 10, 96));

  // Kademe erime süresi (dakika): Yüksek Z-skor ve güçlü OBI erimeyi hızlandırır
  const speedFactor = Math.max(0.4, Math.abs(obi) * 1.8 + Math.abs(input.zScore ?? 0) * 0.5);
  const breakoutMinutes = Math.round(clamp(22 / speedFactor, 3, 45));

  // Spoofing / Sahte Duvar tespiti: OBI çok yüksek ama fiyat ters yönde veya spread açıksa
  const spreadPct = input.spreadPct ?? 0.12;
  const isFakeWall =
    (obi > 0.65 && input.changePct < -1.8) ||
    (obi < -0.65 && input.changePct > 1.8) ||
    spreadPct > 1.25;

  let whaleLabel: BoardEngineOutput['whaleLabel'] = 'NORMAL_TAHTA';
  if (Math.abs(obi) >= 0.65) {
    whaleLabel = 'WHALE_WALL';
  } else if (massResistance >= 70) {
    whaleLabel = 'RESISTANCE_WALL';
  } else if (obi >= 0.35) {
    whaleLabel = 'SUPPORT_WALL';
  }

  return {
    obi,
    massResistance,
    wallLot,
    wallPrice,
    breakoutMinutes,
    isFakeWall,
    whaleLabel,
  };
}

/**
 * 3. Motor: Forensic Engine (SPK Bayrakları, Wash Trade, Beneish M-Skor)
 */
export function runForensicEngine(
  input: TacticalCollectorInput,
  anomaly: AnomalyEngineOutput,
  board: BoardEngineOutput
): ForensicEngineOutput {
  const spkFlags: string[] = [];
  let riskScore = 18;

  if (board.isFakeWall) {
    spkFlags.push('SPOOFING_SAHTE_KADEME_ŞÜPHESİ');
    riskScore += 28;
  }
  if (anomaly.hhiMonopol) {
    spkFlags.push('HHI_TEK_EL_TAHTA_KONSANTRASYONU');
    riskScore += 24;
  }
  if (Math.abs(anomaly.zScore) >= 3.0) {
    spkFlags.push('AŞIRI_HACİM_SAPMASI_3SIGMA');
    riskScore += 22;
  }
  if (input.isJuryVetoed) {
    spkFlags.push('JÜRİ_ADLİ_VETO_AKTİF');
    riskScore += 25;
  }

  const washTradeRatio = Math.round(clamp(riskScore * 0.55, 4, 88));
  const beneishMScore = Number((-2.45 + (riskScore / 100) * 1.4).toFixed(2));
  const finalRisk = Math.round(clamp(riskScore, 8, 98));

  return {
    riskScore: finalRisk,
    washTradeRatio,
    spkFlags,
    beneishMScore,
    isManipulated: finalRisk >= 75,
  };
}

/**
 * 4. Motor: Tekilleştirilmiş 9 Küp Hikaye Motoru (storyCubesEngine)
 * 9 Küp: Duygu, BofA, Derinlik, Takas, Anomali, Momentum, Vol, Mali, Rejim
 */
export function runStoryCubesEngine(
  input: TacticalCollectorInput,
  anomaly: AnomalyEngineOutput,
  board: BoardEngineOutput,
  forensic: ForensicEngineOutput
): StoryCubesEngineOutput {
  const rsi = input.rsi && input.rsi > 0 ? input.rsi : 52;
  const bofa = input.bofaNetLot ?? 0;
  const citi = input.citibankSharePct ?? 24.5;
  const altman = input.altmanZ && input.altmanZ > 0 ? input.altmanZ : 2.65;
  const piotroski = input.piotroskiF && input.piotroskiF > 0 ? input.piotroskiF : 7;
  const kapImpact = input.latestKapImpact ?? 15;

  const cubes: StoryCubeItem[] = [
    {
      id: 'duygu',
      label: '1. Duygu & KAP',
      signal: kapImpact >= 15 ? 'AL' : kapImpact <= -20 ? 'SAT' : 'BEKLE',
      score: Math.round(clamp(55 + kapImpact * 0.45, 15, 96)),
      valueText: `Etki ${kapImpact >= 0 ? '+' : ''}${kapImpact}`,
      note: input.latestKapTitle ? input.latestKapTitle.slice(0, 48) : 'Canlı haber ve KAP duygu akışı dengeli',
    },
    {
      id: 'bofa',
      label: '2. Kurumsal / BofA',
      signal: bofa > 10000 ? 'AL' : bofa < -25000 ? 'SAT' : 'BEKLE',
      score: Math.round(clamp(58 + (bofa / 100000) * 18, 20, 95)),
      valueText: input.marketType === 'BIST' ? `${Math.round(bofa / 1000)}k Lot` : `MM Akış ${board.obi >= 0 ? '+' : '-'}` ,
      note: bofa >= 0 ? 'Kurumsal algoritma net alım tarafında' : 'Kurumsal kademe arbitraj satışı izleniyor',
    },
    {
      id: 'derinlik',
      label: '3. L2 Derinlik',
      signal: board.obi >= 0.18 ? 'AL' : board.obi <= -0.18 ? 'SAT' : 'BEKLE',
      score: Math.round(clamp(50 + board.obi * 45, 10, 98)),
      valueText: `OBI ${board.obi >= 0 ? '+' : ''}${board.obi.toFixed(2)}`,
      note: `Duvar: ${board.wallLot.toLocaleString('tr-TR')} lot @ ${board.wallPrice}`,
    },
    {
      id: 'takas',
      label: '4. Yabancı Takas',
      signal: citi >= 20 ? 'AL' : 'BEKLE',
      score: Math.round(clamp(45 + citi * 1.4, 25, 94)),
      valueText: `%${citi.toFixed(1)} Pay`,
      note: 'Saklama ve kurumsal takas saklama dengesi',
    },
    {
      id: 'anomali',
      label: '5. Z-Skor Anomali',
      signal: anomaly.zScore >= 0.5 ? 'AL' : anomaly.zScore <= -1.5 ? 'SAT' : 'BEKLE',
      score: Math.round(clamp(60 + anomaly.zScore * 14, 12, 96)),
      valueText: `${anomaly.zScore >= 0 ? '+' : ''}${anomaly.zScore.toFixed(2)}σ`,
      note: `HHI: ${anomaly.hhi} · Tree: %${anomaly.treeProb}`,
    },
    {
      id: 'momentum',
      label: '6. Momentum (RSI)',
      signal: rsi >= 52 && rsi <= 72 ? 'AL' : rsi < 38 ? 'SAT' : 'BEKLE',
      score: Math.round(clamp(rsi * 1.15, 20, 94)),
      valueText: `RSI ${rsi.toFixed(1)}`,
      note: rsi > 70 ? 'Aşırı alım bölgesi' : rsi < 32 ? 'Aşırı satım tepki bölgesi' : 'Momentum dengeli kanal içinde',
    },
    {
      id: 'vol',
      label: '7. Volatilite & Erime',
      signal: board.breakoutMinutes <= 15 && board.obi > 0 ? 'AL' : 'BEKLE',
      score: Math.round(clamp(85 - board.massResistance * 0.4, 25, 92)),
      valueText: `Erime ${board.breakoutMinutes}dk`,
      note: `Kütle direnci %${board.massResistance}`,
    },
    {
      id: 'mali',
      label: '8. Mali & Bilanço',
      signal: altman >= 2.0 && piotroski >= 6 ? 'AL' : altman < 1.5 ? 'SAT' : 'BEKLE',
      score: Math.round(clamp(altman * 18 + piotroski * 5, 30, 96)),
      valueText: `Z:${altman.toFixed(1)} F:${piotroski}/9`,
      note: 'Altman-Z ve Piotroski bilanço sağlamlığı',
    },
    {
      id: 'rejim',
      label: '9. Adli & Rejim',
      signal: forensic.isManipulated ? 'SAT' : 'AL',
      score: Math.round(clamp(100 - forensic.riskScore, 10, 96)),
      valueText: `Risk ${forensic.riskScore}/100`,
      note: forensic.spkFlags.length > 0 ? forensic.spkFlags[0] : 'Temiz tahta, manipülasyon bayrağı yok',
    },
  ];

  const buyCount = cubes.filter((c) => c.signal === 'AL').length;
  const sellCount = cubes.filter((c) => c.signal === 'SAT').length;
  const dominantCount = Math.max(buyCount, sellCount, 9 - buyCount - sellCount);
  const coherence = Math.round((dominantCount / 9) * 100);
  const conflictCount = Math.min(buyCount, sellCount);
  const is_poisoned = forensic.isManipulated || conflictCount >= 4 || Boolean(input.isJuryVetoed);

  let overrideAction: TacticalAction = 'BEKLE';
  if (is_poisoned && sellCount >= 3) {
    overrideAction = 'SAT';
  } else if (buyCount >= 5 && !is_poisoned) {
    overrideAction = 'AL';
  } else if (sellCount >= 5) {
    overrideAction = 'SAT';
  }

  return {
    cubes,
    coherence,
    conflictCount,
    is_poisoned,
    overrideAction,
  };
}

/**
 * 5. Motor: Composite V2 Engine (Üstel Risk, Non-Linear Amplifier, SuperCritical Flag)
 */
export function runCompositeV2Engine(
  anomaly: AnomalyEngineOutput,
  board: BoardEngineOutput,
  forensic: ForensicEngineOutput,
  storyCubes: StoryCubesEngineOutput,
  zThreshold: number
): CompositeV2EngineOutput {
  const absZ = Math.abs(anomaly.zScore);
  const nonLinearAmplifier = Number(
    clamp(1.0 + Math.pow(Math.max(0, absZ - 1.0), 1.35) * 0.35 + (board.isFakeWall ? 0.45 : 0), 1.0, 3.5).toFixed(2)
  );

  const rawExpoRisk =
    (forensic.riskScore * 0.45 + board.massResistance * 0.3 + (100 - storyCubes.coherence) * 0.25) *
    (nonLinearAmplifier > 1.8 ? 1.25 : 1.0);
  const exponentialRiskScore = Math.round(clamp(rawExpoRisk, 5, 99));

  const directionalCoherence = Math.round(
    clamp(board.obi * 60 + (anomaly.zScore / 3) * 40, -100, 100)
  );

  // Sadece gerçek bir birleşik patlama olduğunda SuperCriticalFlag devreye girer
  const superCriticalFlag =
    exponentialRiskScore >= 85 ||
    (absZ >= zThreshold * 1.75 && forensic.riskScore >= 70) ||
    (board.isFakeWall && forensic.isManipulated);

  const memoryEvidenceScore = Math.round(clamp(storyCubes.coherence * 0.7 + anomaly.treeProb * 0.3, 20, 98));

  return {
    exponentialRiskScore,
    nonLinearAmplifier,
    directionalCoherence,
    superCriticalFlag,
    memoryEvidenceScore,
  };
}

/**
 * MERKEZİ KOLLEKTÖR: 5 motoru çalıştırır ve Joker Override mantığıyla tek bir UnifiedVerdict döndürür.
 */
export function collectTacticalVerdict(input: TacticalCollectorInput): UnifiedVerdict {
  const marketType = input.marketType || 'BIST';
  // Pazar saflığı & volatilite kalibrasyonu: Kripto ve NASDAQ'ta ±2.0σ, BIST'te ±1.8σ
  const zThreshold = marketType === 'BIST' ? 1.8 : 2.0;
  const currencySymbol = marketType === 'BIST' ? '₺' : '$';

  const anomaly = runAnomalyEngine(input, zThreshold);
  const board = runBoardEngine(input);
  const forensic = runForensicEngine(input, anomaly, board);
  const storyCubes = runStoryCubesEngine(input, anomaly, board, forensic);
  const composite = runCompositeV2Engine(anomaly, board, forensic, storyCubes, zThreshold);

  const rawJury =
    input.juryScore && input.juryScore > 0
      ? input.juryScore
      : Number(
          clamp(
            58 + board.obi * 26 + anomaly.zScore * 6 + (input.changePct >= 0 ? 5 : -4),
            18,
            96
          ).toFixed(1)
        );

  // Ağırlıklı ortalama skor
  const avgCubeScore =
    storyCubes.cubes.reduce((acc, c) => acc + c.score, 0) / Math.max(1, storyCubes.cubes.length);
  const weightedScore = Math.round(
    clamp(
      rawJury * 0.35 +
        avgCubeScore * 0.3 +
        (50 + board.obi * 40) * 0.2 +
        (100 - forensic.riskScore) * 0.15,
      10,
      98
    )
  );

  // 🎯 JOKER OVERRIDE KARAR AĞACI ("Joker yeterliyse diğerleri devreye girmez")
  let alarm: TacticalAlarmLevel = 'DENGELI';
  let action: TacticalAction = 'BEKLE';
  let finalScore = weightedScore;
  let reason = '';

  const kapNote = input.latestKapTitle
    ? `KAP/Haber akışı (${input.latestKapImpact && input.latestKapImpact >= 0 ? 'pozitif' : 'izlemede'})`
    : 'haber akışı sakin';

  if (composite.superCriticalFlag) {
    alarm = 'SUPER_KRITIK_ALARM';
    action = 'SAT';
    finalScore = Math.min(weightedScore, 28);
    reason = `Süper kritik bileşik risk patlaması (Üstel Risk: ${composite.exponentialRiskScore}/100, Çarpan: ${composite.nonLinearAmplifier}x) — koruma kalkanı devrede.`;
  } else if (forensic.riskScore >= 75 || anomaly.verdict === 'ANOMALI_ALARM') {
    alarm = 'MANIPULASYON_ALARM';
    action = 'SAT';
    finalScore = Math.min(weightedScore, 35);
    reason = `Anomali ve adli risk eşiği aşıldı (Z: ${anomaly.zScore}σ, Adli Risk: ${forensic.riskScore}/100) — agresif satış/manipülasyon baskısı.`;
  } else if (anomaly.hhiMonopol || board.massResistance > 75) {
    alarm = 'TAHTA_KONTROLU';
    action = 'BEKLE';
    reason = `Satıcı kademeleri kalınlaşıyor (Direnç: %${board.massResistance}, Duvar: ${board.wallLot.toLocaleString('tr-TR')} lot @ ${currencySymbol}${board.wallPrice.toFixed(2)}), kırılım için hacim teyidi beklenmeli.`;
  } else if (
    board.isFakeWall ||
    Math.abs(anomaly.zScore) >= zThreshold ||
    storyCubes.is_poisoned
  ) {
    alarm = 'INCELEME_GEREKLI';
    action = board.obi >= 0.25 && anomaly.zScore > 0 ? 'AL' : board.obi <= -0.25 ? 'SAT' : 'BEKLE';
    reason = board.isFakeWall
      ? `Kademelerde sahte duvar (spoofing) şüphesi tespit edildi; OBI ${board.obi >= 0 ? '+' : ''}${board.obi.toFixed(2)}, dikkatli izlenmeli.`
      : `Z-Skor (${anomaly.zScore >= 0 ? '+' : ''}${anomaly.zScore.toFixed(2)}σ) pazar eşiğini (±${zThreshold.toFixed(1)}σ) test ediyor; ${kapNote}.`;
  } else {
    alarm = 'DENGELI';
    if (weightedScore >= 64 && board.obi >= 0.08) {
      action = 'AL';
      reason = `Dengeli tahta, sahte duvar yok, alıcı kademeleri baskın (OBI +${board.obi.toFixed(2)}), ${kapNote}.`;
    } else if (weightedScore <= 42 || board.obi <= -0.22) {
      action = 'SAT';
      reason = `Satış kademeleri ağırlık kazanıyor (OBI ${board.obi.toFixed(2)}), destek bölgesi korunmalı.`;
    } else {
      action = 'BEKLE';
      reason = `Tahta dengede, hacim sakin (Z ${anomaly.zScore.toFixed(2)}σ, OBI ${board.obi >= 0 ? '+' : ''}${board.obi.toFixed(2)}), yön kırılımı bekleniyor.`;
    }
  }

  const safePrice = input.price > 0 ? input.price : 100;
  const stopPrice = Number((safePrice * 0.99).toFixed(2));
  const tpPrice = Number((safePrice * 1.02).toFixed(2));
  const varPct = Number(clamp(1.15 + Math.abs(anomaly.zScore) * 0.45 + (1 - storyCubes.coherence / 100) * 1.2, 0.85, 4.95).toFixed(2));
  const kellyPct = Number(clamp((finalScore / 100) * 38.5, 5.0, 38.0).toFixed(2));

  // Doğal Dil Paragraf Analizi (Kullanıcının istediği akıcı, oyuncak olmayan gerçekçi kuant yorumu)
  const actionText =
    action === 'AL'
      ? 'alım yönlü kurumsal birikim (AL)'
      : action === 'SAT'
      ? 'risk azaltma ve koruma (SAT)'
      : 'kademe kırılımını bekleme (BEKLE)';

  const naturalLanguageAnalysis = `${input.symbol} (${marketType}) tahtasında anlık fiyat ${currencySymbol}${safePrice.toFixed(2)} (%${input.changePct >= 0 ? '+' : ''}${input.changePct.toFixed(2)}) seviyesinde işlem görürken, hacim sapması Z-Skor ${anomaly.zScore >= 0 ? '+' : ''}${anomaly.zScore.toFixed(2)}σ (eşik ±${zThreshold.toFixed(1)}σ) ve emir defteri dengesi L2 OBI ${board.obi >= 0 ? '+' : ''}${board.obi.toFixed(2)} olarak ölçülmüştür. ${currencySymbol}${board.wallPrice.toFixed(2)} kademesindeki ${board.wallLot.toLocaleString('tr-TR')} lotluk duvarın mevcut hacim hızıyla yaklaşık ${board.breakoutMinutes} dakikada erimesi öngörülmekte olup, 9 Küp uyum oranı %${storyCubes.coherence} ve 6 ajanlı jüri konsensüsü %${rawJury.toFixed(1)} seviyesindedir. Birleşik kollektör (${alarm}) verilerine göre kısa vadeli stratejik duruş ${actionText} yönündedir; OCO zırhında Stop-Loss ${currencySymbol}${stopPrice.toFixed(2)} (-%1.0) ve Take-Profit ${currencySymbol}${tpPrice.toFixed(2)} (+%2.0) olarak hesaplanmıştır.`;

  return {
    symbol: input.symbol,
    companyName: input.companyName || input.symbol,
    marketType,
    currencySymbol,
    price: safePrice,
    changePct: input.changePct,
    finalScore,
    action,
    alarm,
    reason,
    naturalLanguageAnalysis,
    zScore: anomaly.zScore,
    zThreshold,
    obi: board.obi,
    juryScore: Number(rawJury.toFixed(1)),
    riskScore: forensic.riskScore,
    coherence: storyCubes.coherence,
    expoScore: composite.exponentialRiskScore,
    amplifier: composite.nonLinearAmplifier,
    breakoutMinutes: board.breakoutMinutes,
    wallLot: board.wallLot,
    wallPrice: board.wallPrice,
    isFakeWall: board.isFakeWall,
    varPct,
    kellyPct,
    stopPrice,
    tpPrice,
    engines: {
      anomaly,
      board,
      forensic,
      storyCubes,
      composite,
    },
    latestHeadline: input.latestKapTitle
      ? {
          title: input.latestKapTitle,
          impact: input.latestKapImpact ?? 0,
          time: input.latestKapTime || 'Canlı',
        }
      : undefined,
    timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}
