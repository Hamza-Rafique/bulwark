import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RULES_FILE = path.join(__dirname, '..', 'data', 'custom-rules.json');

// Initialize custom rules file
async function initRules() {
    try {
        await fs.access(RULES_FILE);
    } catch {
        await fs.writeFile(RULES_FILE, JSON.stringify({ rules: [] }));
    }
}

// Create custom rule
export async function createRule(rule) {
    await initRules();
    const data = JSON.parse(await fs.readFile(RULES_FILE, 'utf8'));
    
    const newRule = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        name: rule.name,
        description: rule.description,
        regex: rule.regex,
        severity: rule.severity || 'medium',
        fix: rule.fix || 'No fix available',
        category: rule.category || 'custom',
        createdBy: rule.createdBy || 'system',
        createdAt: new Date().toISOString(),
        active: true,
        organizationId: rule.organizationId || null,
    };
    
    data.rules.push(newRule);
    await fs.writeFile(RULES_FILE, JSON.stringify(data, null, 2));
    
    logger.info(`📋 Custom rule created: ${newRule.name}`);
    return newRule;
}

// Get rules for organization
export async function getRules(organizationId = null) {
    await initRules();
    const data = JSON.parse(await fs.readFile(RULES_FILE, 'utf8'));
    
    if (organizationId) {
        return data.rules.filter(r => 
            r.organizationId === organizationId || r.organizationId === null
        );
    }
    
    return data.rules;
}

// Update rule
export async function updateRule(ruleId, updates) {
    await initRules();
    const data = JSON.parse(await fs.readFile(RULES_FILE, 'utf8'));
    const rule = data.rules.find(r => r.id === ruleId);
    
    if (!rule) throw new Error('Rule not found');
    
    Object.assign(rule, updates);
    rule.updatedAt = new Date().toISOString();
    
    await fs.writeFile(RULES_FILE, JSON.stringify(data, null, 2));
    logger.info(`📋 Rule updated: ${rule.name}`);
    
    return rule;
}

// Delete rule
export async function deleteRule(ruleId) {
    await initRules();
    const data = JSON.parse(await fs.readFile(RULES_FILE, 'utf8'));
    
    const index = data.rules.findIndex(r => r.id === ruleId);
    if (index === -1) throw new Error('Rule not found');
    
    const deleted = data.rules.splice(index, 1)[0];
    await fs.writeFile(RULES_FILE, JSON.stringify(data, null, 2));
    
    logger.info(`📋 Rule deleted: ${deleted.name}`);
    return deleted;
}