// server/services/whiteLabelService.ts

export interface WhiteLabelConfig {
  institutionName: string;
  brandTagline: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  customDomain: string;
  apiEndpoint: string;
  isWhiteLabelActive: boolean;
  licenseTier: 'ENTERPRISE_OEM' | 'BROKERAGE_WHITE_LABEL' | 'PROP_FIRM';
  supportEmail: string;
}

export class WhiteLabelService {
  private config: WhiteLabelConfig = {
    institutionName: 'Apex Prime Securities & Quant',
    brandTagline: 'Institutional Algorithmic Trading Terminal',
    logoUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=120&auto=format&fit=crop&q=80',
    primaryColor: '#10b981', // emerald
    accentColor: '#3b82f6',  // blue
    customDomain: 'terminal.apexprime.com',
    apiEndpoint: 'https://api.apexprime.com/v1',
    isWhiteLabelActive: true,
    licenseTier: 'BROKERAGE_WHITE_LABEL',
    supportEmail: 'desk@apexprime.com',
  };

  public getConfig(): WhiteLabelConfig {
    return this.config;
  }

  public updateConfig(newConfig: Partial<WhiteLabelConfig>): WhiteLabelConfig {
    this.config = {
      ...this.config,
      ...newConfig,
    };
    return this.config;
  }
}

export const whiteLabelService = new WhiteLabelService();
