# MT16 Bistapp Kuant Terminali — Sistem Anayasası (CLAUDE.md)

- **Sürüm (Version)**: `v1.2-kemal`
- **Hedef Dosya (Target Path)**: `./CLAUDE.md`
- **Proje (Project)**: `MT16 Bistapp Kuant Terminali`

---

## Temel Direktifler (Core Directives)

1. **GEREKSİZ MÜHENDİSLİK (OVER-ENGINEERING) YASAK**: Mevcut kural tabanlı yapıyı (Z-Score Sanitization, L2 Order Book Imbalance - OBI, OCO Braketi, %85 Pearson Korelasyon Kalkanı) bozma.
2. **EMİN DEĞİLSEN VARSAYIMLA İLERLEME, SORU SOR**: Eksik gereksinimlerde kendi kafana göre kod üretme.
3. **İSTENMEYEN YERLERDE RASTGELE DEĞİŞİKLİK YASAK**: Çalışan risk şalterlerine (Volatilite Devre Kesici, Dead Man's Switch %5s kopma emniyeti, Korelasyon Kalkanı) ve OCO yürütme motoruna dokunma.
4. **KONTROL ZORUNLU**: "İşlem bitti" demeden önce `npx tsc --noEmit` ve `npm run build` kontrollerini koştur ve sıfır hatayla doğrula.

---

## Mimari & Üretim Katmanları Özeti (v1.2-kemal)

- **Faz 1 — Canlı Track Record & Şeffaf Performans Katmanı**: `server/services/trackRecordService.ts`, `/api/performance/track-record`, `src/components/TrackRecordPanel.tsx`
- **Faz 2 — SaaS Abonelik & VIP Sinyal Botu Gateway**: `server/services/saasGatewayService.ts`, `server/services/signalBotGateway.ts`, `src/components/SaasSubscriptionModal.tsx`, `src/components/SignalBotCard.tsx`
- **Faz 3 — Prop Trading & B2B MAM/PAMM / Kurumsal Risk Katmanı**: `server/services/mamPropEngine.ts`, `server/services/institutionalRiskEngine.ts`, `src/components/MamPropDashboardCard.tsx`
- **Faz 4 — White-Label OEM Lisanslama & Enterprise IP Değerleme ($1.25M+)**: `server/services/whiteLabelService.ts`, `server/services/enterpriseAuditEngine.ts`, `src/components/EnterpriseValuationModal.tsx`
- **Strict Type & Audit Trail**: `src/types/quantEngine.ts`, `src/types/enterprise.ts`, `/api/system/audit-trail`
