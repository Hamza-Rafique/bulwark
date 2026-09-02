import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ANALYTICS_FILE = path.join(__dirname, '..', 'data', 'analytics.json');

// Initialize analytics file
async function initAnalytics() {
    try {
        await fs.access(ANALYTICS_FILE);
    } catch {
        await fs.writeFile(ANALYTICS_FILE, JSON.stringify({
            prs: [],
            tests: [],
            risks: [],
            feedback: [],
            daily: {}
        }));
    }
}

// Log PR analysis
export async function logPRAnalysis(data) {
    await initAnalytics();
    const analytics = JSON.parse(await fs.readFile(ANALYTICS_FILE, 'utf8'));
    
    const entry = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        prNumber: data.prNumber,
        repo: data.repo,
        functionsFound: data.functionsFound || 0,
        testsGenerated: data.testsGenerated || 0,
        risksFound: data.risksFound || 0,
        analysisTimeMs: data.analysisTimeMs || 0,
        timestamp: new Date().toISOString(),
        status: data.status || 'success',
        error: data.error || null,
    };
    
    analytics.prs.push(entry);
    
    // Update daily stats
    const date = new Date().toISOString().split('T')[0];
    if (!analytics.daily[date]) {
        analytics.daily[date] = { prs: 0, tests: 0, risks: 0, feedback: 0 };
    }
    analytics.daily[date].prs += 1;
    analytics.daily[date].tests += data.testsGenerated || 0;
    analytics.daily[date].risks += data.risksFound || 0;
    
    // Keep only last 10,000 entries
    if (analytics.prs.length > 10000) {
        analytics.prs = analytics.prs.slice(-10000);
    }
    
    await fs.writeFile(ANALYTICS_FILE, JSON.stringify(analytics, null, 2));
    return entry;
}

// Log test generation
export async function logTestGeneration(data) {
    await initAnalytics();
    const analytics = JSON.parse(await fs.readFile(ANALYTICS_FILE, 'utf8'));
    
    const entry = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        prId: data.prId,
        repo: data.repo,
        functionName: data.functionName,
        language: data.language || 'javascript',
        testLength: data.testLength || 0,
        isValid: data.isValid || false,
        validationErrors: data.validationErrors || [],
        timestamp: new Date().toISOString(),
    };
    
    analytics.tests.push(entry);
    
    // Update daily stats
    const date = new Date().toISOString().split('T')[0];
    if (!analytics.daily[date]) {
        analytics.daily[date] = { prs: 0, tests: 0, risks: 0, feedback: 0 };
    }
    analytics.daily[date].tests += 1;
    
    await fs.writeFile(ANALYTICS_FILE, JSON.stringify(analytics, null, 2));
    return entry;
}

// Get analytics summary
export async function getAnalyticsSummary() {
    await initAnalytics();
    const analytics = JSON.parse(await fs.readFile(ANALYTICS_FILE, 'utf8'));
    
    const totalPRs = analytics.prs.length;
    const totalTests = analytics.tests.length;
    const totalRisks = analytics.prs.reduce((sum, p) => sum + (p.risksFound || 0), 0);
    const totalFeedback = analytics.feedback.length;
    
    // Calculate averages
    const avgAnalysisTime = analytics.prs.reduce((sum, p) => sum + (p.analysisTimeMs || 0), 0) / (totalPRs || 1);
    const avgFunctionsPerPR = analytics.prs.reduce((sum, p) => sum + (p.functionsFound || 0), 0) / (totalPRs || 1);
    const avgTestsPerPR = analytics.prs.reduce((sum, p) => sum + (p.testsGenerated || 0), 0) / (totalPRs || 1);
    
    // Get last 7 days
    const days = Object.keys(analytics.daily).sort().slice(-7);
    const dailyStats = days.map(date => ({
        date,
        ...analytics.daily[date]
    }));
    
    return {
        total: {
            prs: totalPRs,
            tests: totalTests,
            risks: totalRisks,
            feedback: totalFeedback,
        },
        averages: {
            analysisTimeMs: Math.round(avgAnalysisTime),
            functionsPerPR: Math.round(avgFunctionsPerPR * 10) / 10,
            testsPerPR: Math.round(avgTestsPerPR * 10) / 10,
        },
        daily: dailyStats,
        recentPRs: analytics.prs.slice(-10).reverse(),
    };
}

// Get analytics by time range
export async function getAnalyticsByTimeRange(startDate, endDate) {
    await initAnalytics();
    const analytics = JSON.parse(await fs.readFile(ANALYTICS_FILE, 'utf8'));
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const filteredPRs = analytics.prs.filter(p => {
        const date = new Date(p.timestamp);
        return date >= start && date <= end;
    });
    
    const filteredTests = analytics.tests.filter(t => {
        const date = new Date(t.timestamp);
        return date >= start && date <= end;
    });
    
    return {
        prs: filteredPRs,
        tests: filteredTests,
        totalPRs: filteredPRs.length,
        totalTests: filteredTests.length,
        totalRisks: filteredPRs.reduce((sum, p) => sum + (p.risksFound || 0), 0),
    };
}