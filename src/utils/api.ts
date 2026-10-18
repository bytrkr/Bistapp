/**
 * Bistapp MT16 - Merkezi API Sarmalayıcısı (api.ts)
 * ------------------------------------------------
 * Tüm isteklerde localStorage'dan JWT token okur ve Authorization: Bearer başlığını ekler.
 * 401 hatası (Yetkisiz) durumunda otomatik oturum kapatma işlemi yapar.
 */

export const BISTAPP_TOKEN_KEY = 'bistapp_token';

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

export async function apiFetch<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const token = localStorage.getItem(BISTAPP_TOKEN_KEY);
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Content-Type ayarı (FormData değilse)
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let url = endpoint;
  if (options.params) {
    const searchParams = new URLSearchParams(options.params);
    const separator = url.includes('?') ? '&' : '?';
    url += `${separator}${searchParams.toString()}`;
  }

  const response = await window.fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && !url.includes('/api/auth/')) {
    // Token geçersiz veya süresi dolmuş
    localStorage.removeItem(BISTAPP_TOKEN_KEY);
    window.location.reload(); 
    throw new Error('Oturum süresi doldu, lütfen tekrar giriş yapın.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Sunucu hatası oluştu.' }));
    throw new Error(errorData.detail || `İstek başarısız: ${response.status}`);
  }

  return response.json();
}

export function logout() {
  localStorage.removeItem(BISTAPP_TOKEN_KEY);
  window.location.reload();
}

/**
 * Global fetch sarmalayıcısı: window.fetch'i intercept ederek tüm isteklere
 * Authorization başlığını ekler ve 401 hatalarını merkezi olarak yönetir.
 */
export function setupGlobalAuthFetch() {
  try {
    const originalFetch = window.fetch;
    const newFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const token = localStorage.getItem(BISTAPP_TOKEN_KEY);
      let finalInit = init || {};

      if (token) {
        const headers = new Headers(finalInit.headers || {});
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        
        // Sadece kendi API'lerimize veya localhost'a token gönderelim (güvenlik için)
        if (url.startsWith('/') || url.includes('127.0.0.1') || url.includes('localhost')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        finalInit = { ...finalInit, headers };
      }

      const response = await originalFetch(input, finalInit);

      if (response.status === 401) {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        // Login/Register endpoint'lerinde 401 olması normaldir (yanlış şifre), logout yapma
        if (!url.includes('/api/auth/login') && !url.includes('/api/auth/register')) {
          localStorage.removeItem(BISTAPP_TOKEN_KEY);
          window.location.reload();
        }
      }

      return response;
    };

    // Bazı ortamlarda window.fetch salt okunur olabilir (getter only).
    // Object.defineProperty ile bu engeli aşmaya çalışıyoruz.
    Object.defineProperty(window, 'fetch', {
      value: newFetch,
      configurable: true,
      writable: true,
      enumerable: true
    });
  } catch (err) {
    console.error('[MT16] Global fetch interceptor kurulamadı:', err);
  }
}

/**
 * Aracı Kurum Dağılımı ve Takas Verisini Çeker (/api/akd/analyze)
 */
export async function fetchAkdAnalysis(ticker: string, format: string = 'json') {
  return apiFetch(`/api/akd/analyze?ticker=${encodeURIComponent(ticker)}&format=${format}`);
}

/**
 * Vergi ve Dolar Bazlı Reel Getiri Hesabı Yapar (/api/tax/calculate)
 */
export async function fetchTaxCalculation(payload: {
  ticker: string;
  asset_type?: string;
  buy_date?: string;
  sell_date?: string;
  buy_price_tl?: number;
  sell_price_tl?: number;
  lot_count?: number;
}) {
  return apiFetch('/api/tax/calculate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}


