// src/data/hisseler.js

const baseHisseler = {
  'EREGL': {
    kod: 'EREGL',
    ad: 'Ereğli Demir ve Çelik',
    fiyat: 37.94,
    destek: 36.80,
    direnc: 39.40,
    duvarFiyat: 39.20,
    duvar: 1450,
    maliyet: 37.20,
    bofa: 850
  },
  'ASELS': {
    kod: 'ASELS',
    ad: 'Aselsan Elektronik',
    fiyat: 372.80,
    destek: 362.00,
    direnc: 388.50,
    duvarFiyat: 385.00,
    duvar: 920,
    maliyet: 366.50,
    bofa: 620
  },
  'THYAO': {
    kod: 'THYAO',
    ad: 'Türk Hava Yolları',
    fiyat: 282.50,
    destek: 274.00,
    direnc: 295.00,
    duvarFiyat: 292.00,
    duvar: 2100,
    maliyet: 278.40,
    bofa: 1450
  },
  'GARAN': {
    kod: 'GARAN',
    ad: 'Garanti BBVA',
    fiyat: 112.30,
    destek: 108.50,
    direnc: 118.00,
    duvarFiyat: 116.50,
    duvar: 3200,
    maliyet: 110.20,
    bofa: 2100
  },
  'AKBNK': {
    kod: 'AKBNK',
    ad: 'Akbank',
    fiyat: 56.40,
    destek: 54.20,
    direnc: 59.50,
    duvarFiyat: 58.80,
    duvar: 2800,
    maliyet: 55.10,
    bofa: 1800
  },
  'KCHOL': {
    kod: 'KCHOL',
    ad: 'Koç Holding',
    fiyat: 224.50,
    destek: 218.00,
    direnc: 236.00,
    duvarFiyat: 232.00,
    duvar: 1100,
    maliyet: 221.00,
    bofa: 780
  },
  'SAHOL': {
    kod: 'SAHOL',
    ad: 'Sabancı Holding',
    fiyat: 89.20,
    destek: 86.50,
    direnc: 94.00,
    duvarFiyat: 92.50,
    duvar: 1600,
    maliyet: 87.80,
    bofa: 950
  },
  'SISE': {
    kod: 'SISE',
    ad: 'Şişecam',
    fiyat: 44.90,
    destek: 43.20,
    direnc: 47.80,
    duvarFiyat: 46.50,
    duvar: 1800,
    maliyet: 44.10,
    bofa: 1100
  },
  'TUPRS': {
    kod: 'TUPRS',
    ad: 'Tüpraş',
    fiyat: 164.80,
    destek: 159.50,
    direnc: 172.00,
    duvarFiyat: 170.00,
    duvar: 1350,
    maliyet: 162.20,
    bofa: 890
  },
  'BIMAS': {
    kod: 'BIMAS',
    ad: 'BİM Mağazalar',
    fiyat: 485.00,
    destek: 470.00,
    direnc: 510.00,
    duvarFiyat: 505.00,
    duvar: 750,
    maliyet: 478.00,
    bofa: 490
  },
  'SASA': {
    kod: 'SASA',
    ad: 'Sasa Polyester',
    fiyat: 4.25,
    destek: 4.02,
    direnc: 4.65,
    duvarFiyat: 4.55,
    duvar: 8500,
    maliyet: 4.18,
    bofa: 3400
  },
  'HEKTS': {
    kod: 'HEKTS',
    ad: 'Hektaş Ticaret',
    fiyat: 4.10,
    destek: 3.88,
    direnc: 4.45,
    duvarFiyat: 4.38,
    duvar: 6200,
    maliyet: 4.02,
    bofa: 2200
  },
  'GUBRF': {
    kod: 'GUBRF',
    ad: 'Gübre Fabrikaları',
    fiyat: 156.20,
    destek: 148.00,
    direnc: 168.00,
    duvarFiyat: 165.00,
    duvar: 950,
    maliyet: 152.00,
    bofa: 630
  },
  'OYAKC': {
    kod: 'OYAKC',
    ad: 'Oyak Çimento',
    fiyat: 68.30,
    destek: 65.50,
    direnc: 73.00,
    duvarFiyat: 71.80,
    duvar: 1200,
    maliyet: 67.10,
    bofa: 740
  },
  'PETKM': {
    kod: 'PETKM',
    ad: 'Petkim Petrokimya',
    fiyat: 16.50,
    destek: 15.80,
    direnc: 17.60,
    duvarFiyat: 17.30,
    duvar: 4100,
    maliyet: 16.10,
    bofa: 2300
  },
  'KRDMD': {
    kod: 'KRDMD',
    ad: 'Kardemir (D)',
    fiyat: 21.40,
    destek: 20.60,
    direnc: 22.80,
    duvarFiyat: 22.40,
    duvar: 3300,
    maliyet: 21.00,
    bofa: 1750
  },
  'ISDMR': {
    kod: 'ISDMR',
    ad: 'İskenderun Demir Çelik',
    fiyat: 42.10,
    destek: 40.50,
    direnc: 44.80,
    duvarFiyat: 44.00,
    duvar: 1400,
    maliyet: 41.30,
    bofa: 810
  },
  'AKCNS': {
    kod: 'AKCNS',
    ad: 'Akçansa Çimento',
    fiyat: 168.50,
    destek: 162.00,
    direnc: 178.00,
    duvarFiyat: 175.00,
    duvar: 680,
    maliyet: 165.00,
    bofa: 420
  },
  'CIMSA': {
    kod: 'CIMSA',
    ad: 'Çimsa Çimento',
    fiyat: 39.50,
    destek: 38.00,
    direnc: 42.00,
    duvarFiyat: 41.20,
    duvar: 1550,
    maliyet: 38.80,
    bofa: 890
  }
};

export const HISSELER = {};

for (const [code, val] of Object.entries(baseHisseler)) {
  HISSELER[code] = val;
  HISSELER[`${code}.IS`] = val;
}

export default HISSELER;
