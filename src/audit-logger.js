import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUDIT_FILE = path.join(__dirname, '..', 'data', 'audit.json');

// Initialize audit file
async function initAudit() {
    try {
        await fs.access(AUDIT_FILE);
    } catch {
        await fs.writeFile(AUDIT_FILE, JSON.stringify({ logs: [] }));
    }
}

// Log audit entry
export async function logAudit(event) {
    await initAudit();
    const data = JSON.parse(await fs.readFile(AUDIT_FILE, 'utf8'));
    
    const entry = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        timestamp: new Date().toISOString(),
        ...event,
    };
    
    data.logs.push(entry);
    
    // Keep only last 10,000 logs
    if (data.logs.length > 10000) {
        data.logs = data.logs.slice(-10000);
    }
    
    await fs.writeFile(AUDIT_FILE, JSON.stringify(data, null, 2));
    logger.info(`📝 Audit: ${event.action} by ${event.user || 'system'}`);
    
    return entry;
}

// Get audit logs with filters
export async function getAuditLogs(filters = {}) {
    await initAudit();
    const data = JSON.parse(await fs.readFile(AUDIT_FILE, 'utf8'));
    let logs = data.logs;
    
    // Apply filters
    if (filters.user) {
        logs = logs.filter(l => l.user === filters.user);
    }
    if (filters.action) {
        logs = logs.filter(l => l.action === filters.action);
    }
    if (filters.fromDate) {
        logs = logs.filter(l => l.timestamp >= filters.fromDate);
    }
    if (filters.toDate) {
        logs = logs.filter(l => l.timestamp <= filters.toDate);
    }
    if (filters.limit) {
        logs = logs.slice(-filters.limit);
    }
    
    return logs;
}

// Get audit summary
export async function getAuditSummary() {
    await initAudit();
    const data = JSON.parse(await fs.readFile(AUDIT_FILE, 'utf8'));
    const logs = data.logs;
    
    const summary = {
        total: logs.length,
        byAction: {},
        byUser: {},
        last24Hours: logs.filter(l => {
            const hours = (Date.now() - new Date(l.timestamp).getTime()) / (1000 * 60 * 60);
            return hours < 24;
        }).length,
        last7Days: logs.filter(l => {
            const days = (Date.now() - new Date(l.timestamp).getTime()) / (1000 * 60 * 60 * 24);
            return days < 7;
        }).length,
    };
    
    logs.forEach(log => {
        summary.byAction[log.action] = (summary.byAction[log.action] || 0) + 1;
        if (log.user) {
            summary.byUser[log.user] = (summary.byUser[log.user] || 0) + 1;
        }
    });
    
    return summary;
}