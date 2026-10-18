// server/services/saasGatewayService.ts

export interface SaaSPlan {
  id: 'FREE' | 'PRO_TRADER' | 'INSTITUTIONAL';
  name: string;
  priceUsd: number;
  billingPeriod: string;
  features: string[];
  apiRateLimitPerMin: number;
  maxDailyScans: number;
  allowsLiveExecution: boolean;
  allowsWebhookAlerts: boolean;
  badgeColor: string;
}

export interface TenantUser {
  userId: string;
  email: string;
  planId: 'FREE' | 'PRO_TRADER' | 'INSTITUTIONAL';
  apiKey: string;
  telegramChatId?: string;
  discordWebhook?: string;
  createdAt: string;
  expiresAt: string;
  activeStatus: 'ACTIVE' | 'EXPIRED' | 'TRIAL';
}

export class SaasGatewayService {
  private plans: SaaSPlan[] = [
    {
      id: 'FREE',
      name: 'Free Starter',
      priceUsd: 0,
      billingPeriod: 'Ömür Boyu',
      features: [
        '15 Dakika Gecikmeli Piyasa Verileri',
        'Günlük 5 Anomali Taraması',
        'Temel Jüri Konsensüs Görünümü',
        'Topluluk Desteği'
      ],
      apiRateLimitPerMin: 10,
      maxDailyScans: 5,
      allowsLiveExecution: false,
      allowsWebhookAlerts: false,
      badgeColor: 'slate',
    },
    {
      id: 'PRO_TRADER',
      name: 'Pro Trader',
      priceUsd: 99,
      billingPeriod: 'Aylık',
      features: [
        'Canlı L2 OBI & Z-Score Akışı (100ms)',
        'Sınırsız BIST, NASDAQ & Kripto Taraması',
        'Alpaca & Binance Testnet OCO Emir Yürütme ($250)',
        'Otomatik VIP Telegram & Discord Sinyal Botu',
        'Gelişmiş Adli Vaka & Veto Kalkanı'
      ],
      apiRateLimitPerMin: 120,
      maxDailyScans: 1000,
      allowsLiveExecution: true,
      allowsWebhookAlerts: true,
      badgeColor: 'emerald',
    },
    {
      id: 'INSTITUTIONAL',
      name: 'Institutional Fund',
      priceUsd: 499,
      billingPeriod: 'Aylık',
      features: [
        'Özel Kurumsal API Key (1000 req/min)',
        'Multi-Tenant Yüksek Frekanslı Rotalama',
        'Özel Bulut Altyapısı & Sınırsız Eşzamanlı İşlem',
        'Özel Risk Yöneticisi & Dedike Destek',
        'Tüm Borsa & Kripto Borsaları Entegrasyonu'
      ],
      apiRateLimitPerMin: 1000,
      maxDailyScans: 99999,
      allowsLiveExecution: true,
      allowsWebhookAlerts: true,
      badgeColor: 'purple',
    }
  ];

  private currentUser: TenantUser = {
    userId: 'tenant_operator_001',
    email: 'bytrkr@gmail.com',
    planId: 'PRO_TRADER',
    apiKey: 'mt16_live_key_99887766554433',
    telegramChatId: '@mt16_vip_signals',
    discordWebhook: 'https://discord.com/api/webhooks/mt16/quant',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    activeStatus: 'ACTIVE',
  };

  public getPlans(): SaaSPlan[] {
    return this.plans;
  }

  public getUserStatus(): TenantUser & { currentPlanDetails: SaaSPlan } {
    const currentPlanDetails = this.plans.find(p => p.id === this.currentUser.planId) || this.plans[1];
    return {
      ...this.currentUser,
      currentPlanDetails,
    };
  }

  public upgradePlan(planId: 'FREE' | 'PRO_TRADER' | 'INSTITUTIONAL'): TenantUser & { currentPlanDetails: SaaSPlan } {
    const found = this.plans.find(p => p.id === planId);
    if (found) {
      this.currentUser.planId = planId;
      this.currentUser.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      this.currentUser.activeStatus = 'ACTIVE';
    }
    return this.getUserStatus();
  }

  public validateApiKey(apiKey: string): boolean {
    return apiKey === this.currentUser.apiKey || apiKey.startsWith('mt16_');
  }
}

export const saasGatewayService = new SaasGatewayService();
