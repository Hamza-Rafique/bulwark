import crypto from 'crypto';
import logger from './logger.js';

export function verifyWebhookSignature(payload, signature, secret) {
  if (!signature || !secret) {
    logger.warn('Missing signature or secret for webhook verification');
    return false;
  }
  
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(JSON.stringify(payload)).digest('hex');
  const expectedSignature = `sha256=${digest}`;
  
  // Use constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export function getWebhookEventType(headers) {
  return headers['x-github-event'] || headers['x-event-type'] || 'unknown';
}

export function getWebhookDeliveryId(headers) {
  return headers['x-github-delivery'] || headers['x-delivery-id'] || 'unknown';
}