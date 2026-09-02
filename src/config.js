import dotenv from 'dotenv';
import logger from './logger.js';

dotenv.config();

const requiredEnvVars = [
  'APP_ID',
  'WEBHOOK_SECRET',
  'PRIVATE_KEY_PATH',
  'OPENAI_API_KEY',
];

const optionalEnvVars = [
  'OPENAI_MODEL',
  'OPENAI_BASE_URL',
  'PORT',
  'NODE_ENV',
  'LOG_LEVEL',
];

export function validateEnv() {
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    logger.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    logger.error('Please check your .env file');
    process.exit(1);
  }
  
  // Check if private key file exists
  try {
    const fs = await import('fs');
    if (!fs.existsSync(process.env.PRIVATE_KEY_PATH)) {
      logger.error(`❌ Private key file not found: ${process.env.PRIVATE_KEY_PATH}`);
      process.exit(1);
    }
  } catch (error) {
    logger.error(`❌ Error checking private key: ${error.message}`);
    process.exit(1);
  }
  
  logger.info('✅ Environment validation passed');
}

export const config = {
  appId: process.env.APP_ID,
  webhookSecret: process.env.WEBHOOK_SECRET,
  privateKeyPath: process.env.PRIVATE_KEY_PATH,
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'google/gemini-2.0-flash-exp:free',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  },
  port: parseInt(process.env.PORT) || 3000,
  env: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
};