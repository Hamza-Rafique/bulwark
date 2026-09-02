import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BETA_FILE = path.join(__dirname, '..', 'data', 'beta-users.json');

// Initialize beta users file
async function initBetaFile() {
    try {
        await fs.access(BETA_FILE);
    } catch {
        await fs.writeFile(BETA_FILE, JSON.stringify({ users: [] }));
    }
}

// Add beta user
export async function addBetaUser(email) {
    await initBetaFile();
    
    const data = JSON.parse(await fs.readFile(BETA_FILE, 'utf8'));
    
    // Check if already exists
    if (data.users.find(u => u.email === email)) {
        throw new Error('Email already registered');
    }
    
    const user = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        email,
        createdAt: new Date().toISOString(),
        status: 'pending', // pending, invited, active
        inviteCode: null,
    };
    
    data.users.push(user);
    await fs.writeFile(BETA_FILE, JSON.stringify(data, null, 2));
    
    logger.info(`📧 New beta signup: ${email}`);
    return user;
}

// Get beta users
export async function getBetaUsers() {
    await initBetaFile();
    const data = JSON.parse(await fs.readFile(BETA_FILE, 'utf8'));
    return data.users;
}

// Update user status
export async function updateBetaUser(email, updates) {
    await initBetaFile();
    const data = JSON.parse(await fs.readFile(BETA_FILE, 'utf8'));
    const user = data.users.find(u => u.email === email);
    
    if (!user) throw new Error('User not found');
    
    Object.assign(user, updates);
    await fs.writeFile(BETA_FILE, JSON.stringify(data, null, 2));
    
    return user;
}