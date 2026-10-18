// server/services/mamPropEngine.ts

export interface AuditLogEntry {
  auditId: string;
  service: string;
  action: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL' | 'FAILOVER';
  details: string;
  timestamp: string;
}

export interface PropSubAccount {
  accountId: string;
  accountName: string;
  accountType: 'PROP_FIRM' | 'PAMM' | 'VIP_MASTER' | 'SUB_QUANT';
  allocatedCapitalUsd: number;
  currentEquityUsd: number;
  leverage: number;
  activeTradesCount: number;
  status: 'ACTIVE' | 'RISK_LOCKED' | 'PAUSED';
  profitSharePct: number;
}

export interface MasterOcoExecutionResult {
  masterExecutionId: string;
  symbol: string;
  market: string;
  side: string;
  totalNotionalUsd: number;
  timestamp: string;
  subAccountExecutions: Array<{
    accountId: string;
    accountName: string;
    allocatedNotionalUsd: number;
    executedQty: number;
    entryPrice: number;
    status: 'FILLED' | 'REJECTED';
  }>;
}

function sanitizeNumber(val: unknown, fallback: number, min = -Infinity, max = Infinity): number {
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num) || Number.isNaN(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

function sanitizeString(val: unknown, fallback: string): string {
  if (typeof val === 'string' && val.trim().length > 0) {
    return val.trim().slice(0, 120);
  }
  return fallback;
}

export class MamPropEngine {
  private accounts: PropSubAccount[] = [
    {
      accountId: 'PROP-ACC-101',
      accountName: 'Apex Prop Alpha $100K',
      accountType: 'PROP_FIRM',
      allocatedCapitalUsd: 100000.0,
      currentEquityUsd: 106450.0,
      leverage: 5,
      activeTradesCount: 2,
      status: 'ACTIVE',
      profitSharePct: 80.0,
    },
    {
      accountId: 'PROP-ACC-102',
      accountName: 'Titanium PAMM Fund #2',
      accountType: 'PAMM',
      allocatedCapitalUsd: 250000.0,
      currentEquityUsd: 268200.0,
      leverage: 3,
      activeTradesCount: 4,
      status: 'ACTIVE',
      profitSharePct: 70.0,
    },
    {
      accountId: 'PROP-ACC-103',
      accountName: 'Quant Alpha Sub-Account',
      accountType: 'SUB_QUANT',
      allocatedCapitalUsd: 50000.0,
      currentEquityUsd: 52100.0,
      leverage: 10,
      activeTradesCount: 1,
      status: 'ACTIVE',
      profitSharePct: 90.0,
    },
  ];

  private masterExecutionHistory: MasterOcoExecutionResult[] = [];
  private auditTrail: AuditLogEntry[] = [];
  private execCounter = 90200;

  constructor() {
    this.recordAudit('INIT', 'INFO', 'MAM/PAMM Multi-Account Engine initialized with 3 institutional prop pools.');
  }

  private recordAudit(action: string, severity: AuditLogEntry['severity'], details: string): void {
    try {
      const entry: AuditLogEntry = {
        auditId: `AUD-MAM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        service: 'MamPropEngine',
        action,
        severity,
        details,
        timestamp: new Date().toISOString(),
      };
      this.auditTrail.unshift(entry);
      if (this.auditTrail.length > 100) {
        this.auditTrail = this.auditTrail.slice(0, 100);
      }
    } catch {
      // Non-blocking audit logging
    }
  }

  public getAuditTrail(): AuditLogEntry[] {
    return this.auditTrail;
  }

  public getAccounts(): PropSubAccount[] {
    try {
      return this.accounts.map(acc => ({
        ...acc,
        allocatedCapitalUsd: sanitizeNumber(acc.allocatedCapitalUsd, 50000, 100),
        currentEquityUsd: sanitizeNumber(acc.currentEquityUsd, 50000, 0),
        leverage: sanitizeNumber(acc.leverage, 1, 1, 100),
        profitSharePct: sanitizeNumber(acc.profitSharePct, 80, 0, 100),
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.recordAudit('GET_ACCOUNTS_ERR', 'WARN', `Fallback triggered during getAccounts: ${msg}`);
      return [];
    }
  }

  public addAccount(account: Partial<Omit<PropSubAccount, 'accountId'>>): PropSubAccount {
    try {
      const newId = `PROP-ACC-${Math.floor(100 + Math.random() * 900)}`;
      const validTypes: Array<PropSubAccount['accountType']> = ['PROP_FIRM', 'PAMM', 'VIP_MASTER', 'SUB_QUANT'];
      const validStatuses: Array<PropSubAccount['status']> = ['ACTIVE', 'RISK_LOCKED', 'PAUSED'];

      const accountType = validTypes.includes(account.accountType as PropSubAccount['accountType'])
        ? (account.accountType as PropSubAccount['accountType'])
        : 'PROP_FIRM';
      const status = validStatuses.includes(account.status as PropSubAccount['status'])
        ? (account.status as PropSubAccount['status'])
        : 'ACTIVE';

      const allocatedCapitalUsd = sanitizeNumber(account.allocatedCapitalUsd, 50000, 100, 50000000);
      const created: PropSubAccount = {
        accountId: newId,
        accountName: sanitizeString(account.accountName, `Institutional Pool ${newId}`),
        accountType,
        allocatedCapitalUsd,
        currentEquityUsd: sanitizeNumber(account.currentEquityUsd, allocatedCapitalUsd, 0, 100000000),
        leverage: sanitizeNumber(account.leverage, 5, 1, 50),
        activeTradesCount: sanitizeNumber(account.activeTradesCount, 0, 0, 500),
        status,
        profitSharePct: sanitizeNumber(account.profitSharePct, 80, 0, 100),
      };

      this.accounts.push(created);
      this.recordAudit('ADD_SUB_ACCOUNT', 'INFO', `Added sub-account ${created.accountId} (${created.accountName}) with $${created.allocatedCapitalUsd}`);
      return created;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.recordAudit('ADD_SUB_ACCOUNT_ERR', 'CRITICAL', `Failed to add sub-account, using safe default: ${msg}`);
      return this.accounts[0];
    }
  }

  public executeMasterOco(
    symbol: string = 'BTCUSDT',
    market: string = 'CRYPTO',
    notionalUsd: number = 1000.0,
    side: 'buy' | 'sell' = 'buy'
  ): MasterOcoExecutionResult {
    const cleanSymbol = sanitizeString(symbol, 'BTCUSDT').toUpperCase();
    const cleanMarket = sanitizeString(market, 'CRYPTO').toUpperCase();
    const cleanNotional = sanitizeNumber(notionalUsd, 1000.0, 10.0, 5000000.0);
    const cleanSide: 'buy' | 'sell' = side === 'sell' ? 'sell' : 'buy';

    try {
      this.execCounter++;
      const masterId = `MAS-EXEC-${this.execCounter}`;
      const timestamp = new Date().toLocaleTimeString('tr-TR');

      let basePrice = 84500.0;
      if (cleanSymbol === 'NVDA') basePrice = 126.20;
      else if (cleanSymbol === 'AAPL') basePrice = 232.80;
      else if (cleanSymbol === 'ASELS') basePrice = 48.50;
      else if (cleanSymbol === 'ETHUSDT') basePrice = 2645.0;

      const activeAccounts = this.accounts.filter(a => a.status === 'ACTIVE');
      const targetAccounts = activeAccounts.length > 0 ? activeAccounts : this.accounts;
      const totalCapital = Math.max(1, targetAccounts.reduce((acc, a) => acc + sanitizeNumber(a.allocatedCapitalUsd, 50000, 1), 0));

      const subExecutions = targetAccounts.map(acc => {
        const weight = sanitizeNumber(acc.allocatedCapitalUsd, 50000, 1) / totalCapital;
        const subNotional = parseFloat((cleanNotional * weight).toFixed(2));
        const qty = parseFloat((subNotional / basePrice).toFixed(6));

        return {
          accountId: acc.accountId,
          accountName: acc.accountName,
          allocatedNotionalUsd: subNotional,
          executedQty: qty,
          entryPrice: basePrice,
          status: 'FILLED' as const,
        };
      });

      const result: MasterOcoExecutionResult = {
        masterExecutionId: masterId,
        symbol: cleanSymbol,
        market: cleanMarket,
        side: cleanSide,
        totalNotionalUsd: cleanNotional,
        timestamp,
        subAccountExecutions: subExecutions,
      };

      this.masterExecutionHistory.unshift(result);
      if (this.masterExecutionHistory.length > 25) {
        this.masterExecutionHistory = this.masterExecutionHistory.slice(0, 25);
      }

      this.recordAudit(
        'EXECUTE_MASTER_OCO',
        'INFO',
        `Master OCO ${masterId} routed $${cleanNotional} across ${subExecutions.length} sub-accounts on ${cleanSymbol} (${cleanMarket})`
      );

      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.recordAudit('EXECUTE_MASTER_OCO_ERR', 'CRITICAL', `Master OCO fallback triggered: ${msg}`);
      return {
        masterExecutionId: `MAS-FALLBACK-${Date.now()}`,
        symbol: cleanSymbol,
        market: cleanMarket,
        side: cleanSide,
        totalNotionalUsd: cleanNotional,
        timestamp: new Date().toLocaleTimeString('tr-TR'),
        subAccountExecutions: [],
      };
    }
  }

  public getExecutionHistory(): MasterOcoExecutionResult[] {
    try {
      return this.masterExecutionHistory;
    } catch {
      return [];
    }
  }
}

export const mamPropEngine = new MamPropEngine();
