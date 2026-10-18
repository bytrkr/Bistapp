import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

export const errorLogger = (err: any, req: Request, res: Response, next: NextFunction) => {
  // TEST_1: Trigger simulation if header present
  const isSimulation = req.headers['x-test-simulation'] === 'true';
  const errorContext = {
    timestamp: new Date().toISOString(),
    message: isSimulation ? 'TEST_SIMULATED_ERROR' : err.message,
    stack: err.stack,
    status: 'REQUIRES_REPAIR',
    path: req.path
  };

  console.error('💥 [Unhandled Error]', errorContext);
  
  try {
    const logPath = path.join(process.cwd(), 'data/forensicToon.json');
    let logs = [];
    if (fs.existsSync(logPath)) {
      logs = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    }
    logs.push(errorContext);
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
  } catch (e) {
    console.error('Failed to log to forensicToon.json', e);
  }

  res.status(500).json({ 
    success: false, 
    error: isSimulation ? 'TEST_SIMULATED_ERROR' : 'Internal Server Error' 
  });
};
