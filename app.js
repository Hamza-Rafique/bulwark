import 'dotenv/config';
import { App } from '@octokit/app';
import { createNodeMiddleware } from '@octokit/webhooks';
import fs from 'fs';
import http from 'http';
import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import { generateTests } from './src/test-generator.js';
import { extractFunctionsFromCode } from './src/function-extractor.js';
import { validateTestCode } from './src/test-validator.js';
import { scanForPatterns } from './src/pattern-scanner.js';
import { logFeedback, getFeedbackStats, initDB } from './src/feedback-logger.js';

import dashboardRouter from './src/dashboard.js';
import { initSlack, sendSlackNotification } from './src/slack-notifier.js';
import { addBetaUser, getBetaUsers, updateBetaUser } from './src/beta-signup.js';
import {
    createOrganization,
    getOrganization,
    getOrganizationsByMember,
    addMember,
    updateOrgSettings,
    addRepoToOrg
} from './src/team-management.js';

import {
    logAudit,
    getAuditLogs,
    getAuditSummary
} from './src/audit-logger.js';

import {
    createRule,
    getRules,
    updateRule,
    deleteRule
} from './src/rule-engine.js';

import {
    logPRAnalysis,
    logTestGeneration,
    getAnalyticsSummary,
    getAnalyticsByTimeRange
} from './src/analytics.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// CREATE EXPRESS APP FIRST - BEFORE ANYTHING ELSE!
// ============================================================
const expressApp = express();
expressApp.use(express.json());

// ============================================================
// LOG ALL REQUESTS (DEBUG)
// ============================================================
expressApp.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.url}`);
    next();
});

// ============================================================
// STATIC FILES
// ============================================================
const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(publicPath)) {
    expressApp.use(express.static(publicPath));
    console.log('✅ Static files served from:', publicPath);
} else {
    console.warn('⚠️ Public directory not found at:', publicPath);
}

// ============================================================
// ROUTES - ALL DEFINED BEFORE SERVER STARTS
// ============================================================

// Health check
expressApp.get('/health', (req, res) => {
    console.log('❤️ Health check called');
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Test route
expressApp.get('/test', (req, res) => {
    console.log('🧪 Test called');
    res.status(200).json({
        status: 'ok',
        message: 'Express is working!',
        timestamp: new Date().toISOString()
    });
});

// Landing page
expressApp.get('/', (req, res) => {
    console.log('📄 Landing page requested');
    const indexPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send(`
            <h1>🛡️ Bulwark</h1>
            <p>AI-powered code review that catches bugs before they reach production.</p>
            <p>Visit <a href="/dashboard">Dashboard</a></p>
            <p><a href="/api/stats">Stats API</a></p>
            <p><a href="/health">Health</a></p>
            <p><a href="/test">Test</a></p>
        `);
    }
});

// Dashboard
expressApp.use('/dashboard', dashboardRouter);
console.log('✅ Dashboard router mounted at /dashboard');

// Stats API
expressApp.get('/api/stats', async (req, res) => {
    console.log('📊 Stats called');
    try {
        const stats = await getFeedbackStats();
        res.status(200).json(stats);
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Feedback endpoint
expressApp.post('/api/feedback', async (req, res) => {
    const { prId, repo, functionName, testCode, action } = req.body;

    if (!prId || !action) {
        return res.status(400).json({ error: 'prId and action are required' });
    }

    try {
        await logFeedback(prId, repo, functionName, testCode, action);
        res.json({ success: true });
    } catch (error) {
        console.error('Feedback logging error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Beta signup endpoint
expressApp.post('/api/beta/signup', async (req, res) => {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email is required' });
    }

    try {
        const user = await addBetaUser(email);
        res.json({
            success: true,
            message: 'You are on the beta list!',
            user
        });
    } catch (error) {
        if (error.message === 'Email already registered') {
            return res.status(409).json({ error: 'Email already registered' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Get beta users (protected)
expressApp.get('/api/beta/users', async (req, res) => {
    const secret = req.headers['x-admin-secret'];
    if (secret !== process.env.ADMIN_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const users = await getBetaUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ============================================================
// ORGANIZATION MANAGEMENT
// ============================================================

// Create organization
expressApp.post('/api/enterprise/organizations', async (req, res) => {
    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
    }

    try {
        const org = await createOrganization(name, email);
        await logAudit({
            user: email,
            action: 'create_organization',
            details: { organizationId: org.id, name: org.name }
        });
        res.json({ success: true, organization: org });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get organizations for user
expressApp.get('/api/enterprise/organizations', async (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        const orgs = await getOrganizationsByMember(email);
        res.json(orgs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add member to organization
expressApp.post('/api/enterprise/organizations/:orgId/members', async (req, res) => {
    const { orgId } = req.params;
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        const org = await addMember(orgId, email);
        await logAudit({
            user: req.headers['x-user-email'] || 'system',
            action: 'add_member',
            details: { organizationId: orgId, email }
        });
        res.json({ success: true, organization: org });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// AUDIT LOGS
// ============================================================

// Get audit logs
expressApp.get('/api/enterprise/audit', async (req, res) => {
    const { user, action, fromDate, toDate, limit } = req.query;

    try {
        const logs = await getAuditLogs({ user, action, fromDate, toDate, limit: parseInt(limit) || 100 });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get audit summary
expressApp.get('/api/enterprise/audit/summary', async (req, res) => {
    try {
        const summary = await getAuditSummary();
        res.json(summary);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// CUSTOM RULES
// ============================================================

// Create custom rule
expressApp.post('/api/enterprise/rules', async (req, res) => {
    const { name, description, regex, severity, fix, category, organizationId } = req.body;

    if (!name || !description || !regex) {
        return res.status(400).json({ error: 'Name, description, and regex are required' });
    }

    try {
        const rule = await createRule({
            name,
            description,
            regex,
            severity,
            fix,
            category,
            organizationId,
            createdBy: req.headers['x-user-email'] || 'system',
        });

        await logAudit({
            user: req.headers['x-user-email'] || 'system',
            action: 'create_rule',
            details: { ruleId: rule.id, name: rule.name }
        });

        res.json({ success: true, rule });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get rules
expressApp.get('/api/enterprise/rules', async (req, res) => {
    const { organizationId } = req.query;

    try {
        const rules = await getRules(organizationId);
        res.json(rules);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update rule
expressApp.put('/api/enterprise/rules/:ruleId', async (req, res) => {
    const { ruleId } = req.params;
    const updates = req.body;

    try {
        const rule = await updateRule(ruleId, updates);
        await logAudit({
            user: req.headers['x-user-email'] || 'system',
            action: 'update_rule',
            details: { ruleId, name: rule.name }
        });
        res.json({ success: true, rule });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete rule
expressApp.delete('/api/enterprise/rules/:ruleId', async (req, res) => {
    const { ruleId } = req.params;

    try {
        const rule = await deleteRule(ruleId);
        await logAudit({
            user: req.headers['x-user-email'] || 'system',
            action: 'delete_rule',
            details: { ruleId, name: rule.name }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get analytics summary
expressApp.get('/api/analytics/summary', async (req, res) => {
    try {
        const summary = await getAnalyticsSummary();
        res.json(summary);
    } catch (error) {
        console.error('Analytics summary error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get analytics by date range
expressApp.get('/api/analytics/range', async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    try {
        const data = await getAnalyticsByTimeRange(startDate, endDate);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Log PR analysis (internal use)
expressApp.post('/api/analytics/pr', async (req, res) => {
    const { prNumber, repo, functionsFound, testsGenerated, risksFound, analysisTimeMs, status } = req.body;

    try {
        const entry = await logPRAnalysis({
            prNumber,
            repo,
            functionsFound,
            testsGenerated,
            risksFound,
            analysisTimeMs,
            status,
        });
        res.json({ success: true, entry });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 404 handler - MUST BE LAST
expressApp.use((req, res) => {
    console.log(`❌ 404: ${req.method} ${req.url}`);
    res.status(404).json({
        error: 'Not Found',
        path: req.url,
        method: req.method
    });
});

// ============================================================
// GITHUB APP SETUP
// ============================================================

// Constants
const CODE_EXTENSIONS = ['.js', '.ts', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.jsx', '.tsx'];
const MAX_FUNCTIONS_TO_TEST = 3;

// Initialize database
await initDB();

// GitHub App configuration
const appId = process.env.APP_ID;
const webhookSecret = process.env.WEBHOOK_SECRET;
const privateKey = fs.readFileSync(process.env.PRIVATE_KEY_PATH, 'utf8');

const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
initSlack(slackWebhookUrl);

// Create the GitHub App instance
const app = new App({
    appId: appId,
    privateKey: privateKey,
    webhooks: {
        secret: webhookSecret,
    },
});

// Helper function to get file content from a PR
async function getFileContent(octokit, owner, repo, path, ref) {
    try {
        const response = await octokit.request(
            'GET /repos/{owner}/{repo}/contents/{path}',
            {
                owner,
                repo,
                path,
                ref,
                headers: { 'x-github-api-version': '2026-03-10' }
            }
        );
        return Buffer.from(response.data.content, 'base64').toString('utf-8');
    } catch (error) {
        console.warn(`Failed to get content for ${path}:`, error.message);
        return null;
    }
}

// Helper function to determine if a file is a code file
function isCodeFile(filename) {
    const extension = filename.substring(filename.lastIndexOf('.'));
    return CODE_EXTENSIONS.includes(extension);
}

// Helper function to generate a formatted comment body
function generateCommentBody(functionsToTest, testResults, riskFindings) {
    let body = '';

    // Header
    body += '## 🛡️ Bulwark AI Analysis\n\n';

    // Summary
    body += `**Analyzed:** ${functionsToTest.length} functions | `;
    body += `**Tests Generated:** ${testResults.filter(r => r.isValid).length} | `;
    body += `**Risks Found:** ${riskFindings.length}\n\n`;
    body += '---\n\n';

    // Risk findings section (prioritized)
    if (riskFindings.length > 0) {
        body += '### ⚠️ High-Risk Patterns Detected\n\n';

        const critical = riskFindings.filter(r => r.severity === 'critical');
        const high = riskFindings.filter(r => r.severity === 'high');
        const medium = riskFindings.filter(r => r.severity === 'medium');

        const allRisks = [...critical, ...high, ...medium];

        for (const risk of allRisks) {
            const emoji = risk.severity === 'critical' ? '🔴' :
                risk.severity === 'high' ? '🟠' : '🟡';
            body += `#### ${emoji} ${risk.title} (${risk.severity})\n\n`;
            body += `**File:** \`${risk.file}\`\n\n`;
            body += `**Issue:** ${risk.description}\n\n`;
            body += `**Fix:** ${risk.fix}\n\n`;
            body += `---\n\n`;
        }
    }

    // Generated tests section
    if (testResults.length > 0) {
        body += '### ✅ Generated Tests\n\n';

        const validTests = testResults.filter(r => r.isValid);
        const invalidTests = testResults.filter(r => !r.isValid);

        if (validTests.length > 0) {
            body += `**${validTests.length} tests generated successfully:**\n\n`;

            for (const result of validTests) {
                body += `#### \`${result.function}\` (${result.file})\n\n`;
                body += '```javascript\n';
                const testCode = result.testCode && result.testCode.length > 800 ?
                    result.testCode.substring(0, 800) + '\n... (truncated - full test available in console)' :
                    result.testCode || '// No test code generated';
                body += testCode;
                body += '\n```\n\n';
            }
        }

        if (invalidTests.length > 0) {
            body += `**${invalidTests.length} tests need review:**\n\n`;
            for (const result of invalidTests) {
                body += `- ⚠️ \`${result.function}\` (${result.file})\n`;
                if (result.validationErrors && result.validationErrors.length > 0) {
                    const errors = result.validationErrors.map(e => `  - ${e.type}: ${e.message}`).join('\n');
                    body += `\`\`\`\n${errors}\n\`\`\`\n\n`;
                }
            }
        }
    }

    // Instructions
    body += '### 📋 Next Steps\n\n';
    body += '1. **Review the tests** above and copy them into your test suite\n';
    body += '2. **Run your test suite** to verify the changes\n';
    body += '3. **Address any risks** flagged in the critical/high sections\n\n';

    // Feedback section
    body += '### 💬 Feedback\n\n';
    body += 'Did these tests catch any bugs? Was this analysis helpful?\n\n';
    body += '| Helpful? | [Accept](https://github.com) | [Reject](https://github.com) |\n';
    body += '|----------|-------------------------------|-------------------------------|\n';
    body += '| 👍 | ✅ Accept | ❌ Reject |\n\n';
    body += '_Your feedback helps us improve the quality of generated tests._';

    return body;
}

// Main PR handler
async function handlePullRequestOpened({ octokit, payload }) {
    const prNumber = payload.pull_request.number;
    const repoName = payload.repository.name;
    const owner = payload.repository.owner.login;

    console.log(`🚀 PR #${prNumber} opened in ${repoName}`);

    try {
        console.time('Total PR Processing');

        // Phase 1: Detection (0-5 seconds)
        console.time('Phase 1: Detection');

        const detectionComment = await octokit.request(
            'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
            {
                owner,
                repo: repoName,
                issue_number: prNumber,
                body: `🔍 **Bulwark Analysis in Progress**\n\n` +
                    `Analyzing your changes for risks and generating tests... (ETA 10-15s)`,
                headers: { 'x-github-api-version': '2026-03-10' }
            }
        );

        const commentId = detectionComment.data.id;
        console.timeEnd('Phase 1: Detection');

        // Get PR details
        const compareResponse = await octokit.request(
            'GET /repos/{owner}/{repo}/compare/{base}...{head}',
            {
                owner,
                repo: repoName,
                base: payload.pull_request.base.ref,
                head: payload.pull_request.head.ref,
                headers: { 'x-github-api-version': '2026-03-10' }
            }
        );

        const diffData = compareResponse.data;
        console.log(`📝 ${diffData.files.length} files changed`);

        // Filter to code files only
        const codeFiles = diffData.files.filter(file => isCodeFile(file.filename));
        console.log(`💻 ${codeFiles.length} code files detected`);

        if (codeFiles.length === 0) {
            await octokit.request(
                'PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}',
                {
                    owner,
                    repo: repoName,
                    comment_id: commentId,
                    body: `ℹ️ **No code files detected.**\n\n` +
                        `Bulwark only analyzes code files (${CODE_EXTENSIONS.join(', ')}).`,
                    headers: { 'x-github-api-version': '2026-03-10' }
                }
            );
            return;
        }

        // Phase 2: Analysis & Generation (5-15 seconds)
        console.time('Phase 2: Generation & Validation');

        const functionsToTest = [];
        const riskFindings = [];
        const testResults = [];

        for (const file of codeFiles) {
            const fileContent = await getFileContent(
                octokit,
                owner,
                repoName,
                file.filename,
                payload.pull_request.head.sha
            );

            if (!fileContent) continue;

            const findings = scanForPatterns(fileContent, file.filename);
            riskFindings.push(...findings);

            const functions = extractFunctionsFromCode(fileContent);
            functions.forEach(fn => {
                functionsToTest.push({
                    file: file.filename,
                    ...fn
                });
            });
        }

        console.log(`🔍 Found ${functionsToTest.length} functions, ${riskFindings.length} risks`);

        // Send Slack notification

        if (riskFindings.length > 0 || functionsToTest.length > 0) {
            // ✅ Get proper risk titles
            const riskSummary = riskFindings.slice(0, 5).map(r => {
                // Use title or name field
                const title = r.title || r.name || 'Unknown Risk';
                return `• ${title} (${r.severity || 'unknown'})`;
            }).join('\n');
            console.log('🔍 Raw risk findings:', JSON.stringify(riskFindings, null, 2));
            if (riskFindings.length > 0) {
                console.log('📋 First risk structure:', Object.keys(riskFindings[0]));
                console.log('📋 First risk data:', riskFindings[0]);
            }
            await sendSlackNotification(
                `PR #${prNumber} analyzed`,
                {
                    prNumber,
                    prUrl: payload.pull_request.html_url,
                    repo: repoName,
                    functions: functionsToTest.length,
                    risks: riskFindings.length,
                    riskSummary: riskSummary || 'No high-risk issues found',
                }
            );
        }

        const functionsToProcess = functionsToTest.slice(0, MAX_FUNCTIONS_TO_TEST);

        for (const fn of functionsToProcess) {
            try {
                const testCode = await generateTests(fn.body, fn.name);
                const validation = validateTestCode(testCode, fn.name);

                testResults.push({
                    function: fn.name,
                    file: fn.file,
                    testCode,
                    isValid: validation.isValid,
                    validationErrors: validation.errors,
                });
            } catch (error) {
                console.error(`Failed to generate tests for ${fn.name}:`, error.message);
                testResults.push({
                    function: fn.name,
                    file: fn.file,
                    testCode: null,
                    isValid: false,
                    validationErrors: [{ type: 'error', message: 'Generation failed' }],
                });
            }
        }

        console.timeEnd('Phase 2: Generation & Validation');

        // Phase 3: Output (15 seconds)
        console.time('Phase 3: Output');

        const body = generateCommentBody(functionsToTest, testResults, riskFindings);

        await octokit.request(
            'PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}',
            {
                owner,
                repo: repoName,
                comment_id: commentId,
                body,
                headers: { 'x-github-api-version': '2026-03-10' }
            }
        );

        console.timeEnd('Phase 3: Output');
        console.timeEnd('Total PR Processing');
        console.log(`✅ Analysis complete for PR #${prNumber}`);
        await logPRAnalysis({
            prNumber,
            repo: repoName,
            functionsFound: functionsToTest.length,
            testsGenerated: testResults.filter(r => r.isValid).length,
            risksFound: riskFindings.length,
            analysisTimeMs: performance.now(), // You'll need to track this
            status: 'success',
        });
        // Also log test generation
        for (const result of testResults) {
            await logTestGeneration({
                prId: prNumber,
                repo: repoName,
                functionName: result.function,
                testLength: result.testCode?.length || 0,
                isValid: result.isValid,
                validationErrors: result.validationErrors || [],
            });
        }
    } catch (error) {
        console.error(`❌ Failed to process PR #${prNumber}:`, error);

        try {
            await octokit.request(
                'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
                {
                    owner,
                    repo: repoName,
                    issue_number: prNumber,
                    body: `❌ **Bulwark encountered an error**\n\n` +
                        `Failed to analyze this PR: ${error.message}\n\n` +
                        `Please try again or contact support if this persists.`,
                    headers: { 'x-github-api-version': '2026-03-10' }
                }
            );
        } catch (commentError) {
            console.error('Failed to post error comment:', commentError);
        }
    }
}

// ============================================================
// WEBHOOK EVENT LISTENERS
// ============================================================
app.webhooks.on("pull_request.opened", handlePullRequestOpened);
app.webhooks.on("pull_request.synchronize", handlePullRequestOpened);

app.webhooks.onError((error) => {
    console.error('Webhook processing error:', error);
});

// ============================================================
// CREATE WEBHOOK MIDDLEWARE
// ============================================================
const webhookPath = '/api/webhook';
const middleware = createNodeMiddleware(app.webhooks, { path: webhookPath });

// ============================================================
// CREATE AND START SERVER
// ============================================================
const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    const url = req.url || '';

    // Log every request (except favicon)
    if (!url.includes('favicon')) {
        console.log(`🌐 ${req.method} ${url}`);
    }

    // Route webhooks to the middleware
    if (url.startsWith(webhookPath)) {
        middleware(req, res);
        return;
    }

    // Route everything else to Express
    expressApp(req, res);
});

// START THE SERVER
server.listen(port, '0.0.0.0', () => {
    console.log('');
    console.log('🛡️ ========================================');
    console.log('🛡️  BULWARK SERVER RUNNING');
    console.log('🛡️ ========================================');
    console.log(`🛡️  Port:        ${port}`);
    console.log(`🛡️  Health:      http://localhost:${port}/health`);
    console.log(`🛡️  Stats:       http://localhost:${port}/api/stats`);
    console.log(`🛡️  Dashboard:   http://localhost:${port}/dashboard`);
    console.log(`🛡️  Webhook:     http://localhost:${port}${webhookPath}`);
    console.log(`🛡️  Test:        http://localhost:${port}/test`);
    console.log(`🛡️  Landing:     http://localhost:${port}/`);
    console.log('🛡️ ========================================');
    console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📴 SIGTERM received, shutting down...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('📴 SIGINT received, shutting down...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

export { app };