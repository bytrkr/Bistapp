// src/types/enterprise.ts

export type SaasPlanId = 'FREE' | 'PRO_TRADER' | 'INSTITUTIONAL';
export type PropAccountType = 'PROP_FIRM' | 'PAMM' | 'VIP_MASTER' | 'SUB_QUANT';
export type PropAccountStatus = 'ACTIVE' | 'RISK_LOCKED' | 'PAUSED';
export type WhiteLabelLicenseTier = 'ENTERPRISE_OEM' | 'BROKERAGE_WHITE_LABEL' | 'PROP_FIRM';

export interface SaasPlan {
  id: SaasPlanId;
  name: string;
  priceUsd: number;
  billingPeriod: string;
  features: string[];
  apiRateLimitPerMin: number;
  maxDailyScans: number;
  allowsLiveExecution: boolean;
  allowsWebhookAlerts?: boolean;
  badgeColor: string;
}

export interface TenantUserStatus {
  userId: string;
  email: string;
  planId: SaasPlanId;
  apiKey: string;
  telegramChatId?: string;
  discordWebhook?: string;
  createdAt?: string;
  expiresAt?: string;
  activeStatus: string;
  currentPlanDetails: SaasPlan;
}

export interface PropSubAccount {
  accountId: string;
  accountName: string;
  accountType: PropAccountType | string;
  allocatedCapitalUsd: number;
  currentEquityUsd: number;
  leverage: number;
  activeTradesCount: number;
  status: PropAccountStatus | string;
  profitSharePct: number;
}

export interface SubAccountExecutionItem {
  accountId: string;
  accountName: string;
  allocatedNotionalUsd: number;
  executedQty: number;
  entryPrice: number;
  status: 'FILLED' | 'REJECTED';
}

export interface MasterOcoExecutionResult {
  masterExecutionId: string;
  symbol: string;
  market: string;
  side: string;
  totalNotionalUsd: number;
  timestamp: string;
  subAccountExecutions: SubAccountExecutionItem[];
}

export interface WhiteLabelConfig {
  institutionName: string;
  brandTagline: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  customDomain: string;
  apiEndpoint: string;
  isWhiteLabelActive: boolean;
  licenseTier: WhiteLabelLicenseTier | string;
  supportEmail: string;
}

export interface EnterpriseIpAsset {
  name: string;
  patentStatus: string;
  description: string;
  valuationContributionUsd: number;
}

export interface EnterpriseArchitectureSpec {
  title: string;
  techStack: string;
  reliability: string;
}

export interface InvestorPitchDeckSummary {
  targetMarket: string;
  tamSomSam: string;
  revenueModel: string;
  projectedArrUsd: number;
  teamBackground: string;
}

export interface InvestorReport {
  valuationUsd: number;
  valuationTier: string;
  ipAssets: EnterpriseIpAsset[];
  coreArchitectures: EnterpriseArchitectureSpec[];
  investorPitchDeck: InvestorPitchDeckSummary;
  auditTimestamp: string;
  auditor: string;
}
