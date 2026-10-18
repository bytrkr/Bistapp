// src/data/hisseler.d.ts

export interface HisseVerisi {
  kod: string;
  ad: string;
  fiyat: number;
  destek: number;
  direnc: number;
  duvarFiyat: number;
  duvar: number;
  maliyet: number;
  bofa: number;
}

export declare const HISSELER: Record<string, HisseVerisi>;
export default HISSELER;
