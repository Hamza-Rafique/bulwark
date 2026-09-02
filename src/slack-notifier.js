import { IncomingWebhook } from '@slack/webhook';
import logger from './logger.js';

let webhook;

export function initSlack(webhookUrl) {
  if (webhookUrl) {
    webhook = new IncomingWebhook(webhookUrl);
    logger.info('✅ Slack integration initialized');
  } else {
    logger.info('ℹ️ Slack integration disabled (no webhook URL)');
  }
}

export async function sendSlackNotification(message, details) {
  if (!webhook) return;
  
  try {
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🛡️ Bulwark Alert* - ${message}`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*PR:* <${details.prUrl}|#${details.prNumber}>`,
          },
          {
            type: 'mrkdwn',
            text: `*Repo:* ${details.repo}`,
          },
          {
            type: 'mrkdwn',
            text: `*Functions:* ${details.functions}`,
          },
          {
            type: 'mrkdwn',
            text: `*Risks:* ${details.risks}`,
          },
        ],
      },
    ];
    
    if (details.riskSummary) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `⚠️ *Risks Detected:*\n${details.riskSummary}`,
        },
      });
    }
    
    await webhook.send({ blocks });
    logger.info('📨 Slack notification sent');
  } catch (error) {
    logger.error('Failed to send Slack notification:', error.message);
  }
}