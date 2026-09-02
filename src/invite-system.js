import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INVITES_FILE = path.join(__dirname, '..', 'data', 'invites.json');


async function initInvites() {
  try {
    await fs.access(INVITES_FILE);
  } catch {
    await fs.writeFile(INVITES_FILE, JSON.stringify({ invites: [] }));
  }
}


export function generateInviteCode() {
  return crypto.randomBytes(16).toString('hex').substring(0, 12);
}


export async function createInvite(email, createdBy) {
  await initInvites();
  
  const data = JSON.parse(await fs.readFile(INVITES_FILE, 'utf8'));
  const invite = {
    code: generateInviteCode(),
    email,
    createdBy,
    createdAt: new Date().toISOString(),
    used: false,
    usedAt: null,
    usedBy: null,
  };
  
  data.invites.push(invite);
  await fs.writeFile(INVITES_FILE, JSON.stringify(data, null, 2));
  
  logger.info(`📧 Created invite for ${email} (${invite.code})`);
  return invite;
}


export async function useInvite(code, email) {
  await initInvites();
  
  const data = JSON.parse(await fs.readFile(INVITES_FILE, 'utf8'));
  const invite = data.invites.find(i => i.code === code && !i.used);
  
  if (!invite) {
    throw new Error('Invalid or expired invite code');
  }
  
  if (invite.email && invite.email !== email) {
    throw new Error('This invite is for a different email address');
  }
  
  invite.used = true;
  invite.usedAt = new Date().toISOString();
  invite.usedBy = email;
  
  await fs.writeFile(INVITES_FILE, JSON.stringify(data, null, 2));
  logger.info(`✅ Invite ${code} used by ${email}`);
  
  return invite;
}


export async function getInviteStats() {
  await initInvites();
  
  const data = JSON.parse(await fs.readFile(INVITES_FILE, 'utf8'));
  const total = data.invites.length;
  const used = data.invites.filter(i => i.used).length;
  const pending = total - used;
  
  return { total, used, pending };
}