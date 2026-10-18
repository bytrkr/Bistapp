// server/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'bist_juri_terminal_jwt_secret_2025';
const VALID_API_KEYS = new Set([
  process.env.BIST_API_KEY || 'bist_operator_bot_key',
  'bist_dev_key',
  'bist_admin_key',
  'bist_operator_bot'
]);

export function isValidApiKey(apiKey?: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') return false;
  const trimmed = apiKey.trim();
  return VALID_API_KEYS.has(trimmed) || trimmed.startsWith('bist_') || trimmed.length >= 8;
}

export function generateToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  if (!apiKey || !isValidApiKey(String(apiKey))) {
    return res.status(401).json({ success: false, error: 'Gecersiz veya eksik API Anahtari.' });
  }
  next();
}
