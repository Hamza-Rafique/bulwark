import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function getSystemHealth() {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    // Check database
    const dbPath = path.join(__dirname, '..', 'data', 'db.json');
    let dbSize = 0;
    try {
        const stats = await fs.stat(dbPath);
        dbSize = stats.size;
    } catch (error) {
        // DB doesn't exist yet
    }
    
    return {
        status: 'healthy',
        uptime: {
            seconds: Math.floor(uptime),
            hours: Math.floor(uptime / 3600),
            days: Math.floor(uptime / 86400),
        },
        memory: {
            used: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
            total: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
            external: Math.round(memUsage.external / 1024 / 1024) + 'MB',
        },
        system: {
            platform: os.platform(),
            cpus: os.cpus().length,
            totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB',
            freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024) + 'GB',
        },
        database: {
            size: dbSize > 0 ? Math.round(dbSize / 1024) + 'KB' : '0KB',
            exists: dbSize > 0,
        },
        timestamp: new Date().toISOString(),
    };
}

// API endpoint for health monitoring
export function setupHealthRoutes(expressApp) {
    expressApp.get('/api/health/detailed', async (req, res) => {
        try {
            const health = await getSystemHealth();
            res.json(health);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}