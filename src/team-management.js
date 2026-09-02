import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEAM_FILE = path.join(__dirname, '..', 'data', 'teams.json');

// Initialize teams file
async function initTeams() {
    try {
        await fs.access(TEAM_FILE);
    } catch {
        await fs.writeFile(TEAM_FILE, JSON.stringify({ teams: [] }));
    }
}

// Create organization
export async function createOrganization(name, ownerEmail) {
    await initTeams();
    const data = JSON.parse(await fs.readFile(TEAM_FILE, 'utf8'));
    
    const org = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        name,
        owner: ownerEmail,
        members: [ownerEmail],
        createdAt: new Date().toISOString(),
        settings: {
            maxFunctionsToTest: 5,
            severityThreshold: 'medium',
            autoFix: false,
            slackWebhook: null,
        },
        repos: [],
    };
    
    data.teams.push(org);
    await fs.writeFile(TEAM_FILE, JSON.stringify(data, null, 2));
    
    logger.info(`🏢 Organization created: ${name} by ${ownerEmail}`);
    return org;
}

// Get organization by ID
export async function getOrganization(orgId) {
    await initTeams();
    const data = JSON.parse(await fs.readFile(TEAM_FILE, 'utf8'));
    return data.teams.find(t => t.id === orgId);
}

// Get organizations by member
export async function getOrganizationsByMember(email) {
    await initTeams();
    const data = JSON.parse(await fs.readFile(TEAM_FILE, 'utf8'));
    return data.teams.filter(t => t.members.includes(email));
}

// Add member to organization
export async function addMember(orgId, email) {
    await initTeams();
    const data = JSON.parse(await fs.readFile(TEAM_FILE, 'utf8'));
    const org = data.teams.find(t => t.id === orgId);
    
    if (!org) throw new Error('Organization not found');
    if (org.members.includes(email)) throw new Error('Member already exists');
    
    org.members.push(email);
    await fs.writeFile(TEAM_FILE, JSON.stringify(data, null, 2));
    
    logger.info(`👤 Member added: ${email} to ${org.name}`);
    return org;
}

// Update organization settings
export async function updateOrgSettings(orgId, settings) {
    await initTeams();
    const data = JSON.parse(await fs.readFile(TEAM_FILE, 'utf8'));
    const org = data.teams.find(t => t.id === orgId);
    
    if (!org) throw new Error('Organization not found');
    
    org.settings = { ...org.settings, ...settings };
    await fs.writeFile(TEAM_FILE, JSON.stringify(data, null, 2));
    
    logger.info(`⚙️ Settings updated for ${org.name}`);
    return org;
}

// Add repository to organization
export async function addRepoToOrg(orgId, repoName) {
    await initTeams();
    const data = JSON.parse(await fs.readFile(TEAM_FILE, 'utf8'));
    const org = data.teams.find(t => t.id === orgId);
    
    if (!org) throw new Error('Organization not found');
    if (org.repos.includes(repoName)) throw new Error('Repository already added');
    
    org.repos.push(repoName);
    await fs.writeFile(TEAM_FILE, JSON.stringify(data, null, 2));
    
    logger.info(`📁 Repository added: ${repoName} to ${org.name}`);
    return org;
}