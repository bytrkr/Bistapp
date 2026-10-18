// server/middleware/rateLimit.middleware.ts
import rateLimit from 'express-rate-limit';

export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 2000, // IP basina istek limiti
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Cok fazla istek gonderildi, lutfen daha sonra tekrar deneyiniz.'
  }
});

export const exportLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Disa aktarim istek limiti asildi, lutfen bekleyiniz.'
  }
});
