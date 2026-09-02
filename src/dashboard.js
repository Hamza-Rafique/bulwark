import express from 'express';
import { getFeedbackStats } from './feedback-logger.js';
import { getAnalyticsSummary} from './analytics.js'

const router = express.Router();

// Serve dashboard HTML with embedded data
router.get('/', async (req, res) => {
  try {
    // Fetch stats on the server side
    const stats = await getFeedbackStats();
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bulwark Dashboard</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          margin: 0; 
          padding: 20px; 
          background: #0d1117; 
          color: #e6edf3;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { 
          background: #161b22; 
          padding: 30px; 
          border-radius: 12px; 
          margin-bottom: 30px;
          border: 1px solid #30363d;
        }
        .header h1 { font-size: 2em; margin-bottom: 10px; }
        .header p { color: #8b949e; }
        .stats { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
          gap: 20px; 
          margin-bottom: 30px; 
        }
        .stat-card { 
          background: #161b22; 
          padding: 25px; 
          border-radius: 12px; 
          border: 1px solid #30363d;
          transition: transform 0.2s;
        }
        .stat-card:hover { transform: translateY(-2px); }
        .stat-number { 
          font-size: 2.5em; 
          font-weight: bold; 
          color: #58a6ff; 
          margin-bottom: 5px;
        }
        .stat-label { color: #8b949e; font-size: 0.9em; }
        .stat-accept .stat-number { color: #3fb950; }
        .stat-reject .stat-number { color: #f85149; }
        .stat-rate .stat-number { color: #d29922; }
        .recent { 
          background: #161b22; 
          padding: 25px; 
          border-radius: 12px; 
          border: 1px solid #30363d;
        }
        .recent h2 { margin-bottom: 20px; color: #e6edf3; }
        .feedback-item {
          padding: 15px;
          border-bottom: 1px solid #30363d;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .feedback-item:last-child { border-bottom: none; }
        .badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.8em;
          font-weight: 600;
        }
        .badge-accept { background: #238636; color: white; }
        .badge-reject { background: #da3633; color: white; }
        .badge-modified { background: #d29922; color: white; }
        .empty-state {
          text-align: center;
          padding: 40px;
          color: #8b949e;
        }
        .empty-state .icon { font-size: 3em; margin-bottom: 15px; }
        .timestamp { color: #8b949e; font-size: 0.8em; }
        .function-name { 
          color: #58a6ff; 
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
        }
        .repo-name { color: #8b949e; font-size: 0.9em; }
        .status-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.7em;
          background: #238636;
          color: white;
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        .loading { animation: pulse 1.5s ease-in-out infinite; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛡️ Bulwark Dashboard</h1>
          <p>Real-time analytics for your AI-powered code review bot</p>
          <div style="margin-top: 10px;">
            <span class="status-badge">🟢 Online</span>
          </div>
        </div>
        
        <div class="stats">
          <div class="stat-card">
            <div class="stat-number">${stats.total || 0}</div>
            <div class="stat-label">Total Feedback</div>
          </div>
          <div class="stat-card stat-accept">
            <div class="stat-number">${stats.accepted || 0}</div>
            <div class="stat-label">✅ Accepted</div>
          </div>
          <div class="stat-card stat-reject">
            <div class="stat-number">${stats.rejected || 0}</div>
            <div class="stat-label">❌ Rejected</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${stats.modified || 0}</div>
            <div class="stat-label">🔄 Modified</div>
          </div>
          <div class="stat-card stat-rate">
            <div class="stat-number">${stats.total > 0 ? Math.round((stats.accepted / stats.total) * 100) : 0}%</div>
            <div class="stat-label">Acceptance Rate</div>
          </div>
        </div>
        
        <div class="recent">
          <h2>📋 Recent Activity</h2>
          <div id="recent-feedback">
            <div class="empty-state">
              <div class="icon">🤖</div>
              <p>${stats.total === 0 ? 'No feedback yet! Create a PR to get started.' : 'Feedback data loaded!'}</p>
              <p style="font-size: 0.8em; margin-top: 10px;">
                ${stats.total === 0 ? 'Once developers interact with the bot, you\'ll see activity here.' : `${stats.total} total feedback entries`}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <script>
        // Refresh stats every 10 seconds
        async function refreshStats() {
          try {
            const response = await fetch('/api/stats');
            if (!response.ok) throw new Error('Failed to fetch stats');
            const data = await response.json();
            
            // Update stats without refreshing the page
            const statNumbers = document.querySelectorAll('.stat-number');
            if (statNumbers.length >= 5) {
              statNumbers[0].textContent = data.total || 0;
              statNumbers[1].textContent = data.accepted || 0;
              statNumbers[2].textContent = data.rejected || 0;
              statNumbers[3].textContent = data.modified || 0;
              const rate = data.total > 0 ? Math.round((data.accepted / data.total) * 100) : 0;
              statNumbers[4].textContent = rate + '%';
            }
            
            // Update empty state message
            const emptyState = document.querySelector('.empty-state p');
            if (emptyState && data.total > 0) {
              emptyState.textContent = \`\${data.total} total feedback entries\`;
            }
          } catch (error) {
            console.error('Error refreshing stats:', error);
          }
        }
        
        // Refresh every 10 seconds
        setInterval(refreshStats, 10000);
      </script>
    </body>
    </html>
    `;
    
    res.send(html);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send(`
      <h1>Dashboard Error</h1>
      <p>${error.message}</p>
      <p>Please check the server logs.</p>
    `);
  }
});

// API endpoint for stats (already exists, but let's add it here too)
router.get('/api/stats', async (req, res) => {
  try {
    const stats = await getFeedbackStats();
    res.json(stats);
  } catch (error) {
    console.error('Stats API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// // Add new API endpoint
// router.get('/api/analytics', async (req, res) => {
//   try {
//     const stats = await getFeedbackStats();
//     const invites = await getInviteStats();
    
//     res.json({
//       feedback: stats,
//       invites: invites,
//       timestamp: new Date().toISOString(),
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });
// Add this to dashboard.js
router.get('/api/risks', async (req, res) => {
    try {
        // Get recent risk findings from database
        // For now, return sample data
        res.json({
            total: 0,
            bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
            byCategory: {}
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Add this to dashboard.js
router.get('/analytics', async (req, res) => {
    try {
        const summary = await getAnalyticsSummary();
        
        res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Bulwark Analytics</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0d1117; color: #e6edf3; padding: 20px; }
                .container { max-width: 1200px; margin: 0 auto; }
                .header { text-align: center; padding: 40px 0; }
                .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
                .card { background: #161b22; padding: 20px; border-radius: 12px; border: 1px solid #30363d; }
                .card h3 { color: #8b949e; font-size: 0.9em; margin-bottom: 10px; }
                .card .value { font-size: 2em; font-weight: bold; }
                .card .sub { color: #8b949e; font-size: 0.8em; margin-top: 5px; }
                .chart-container { background: #161b22; padding: 20px; border-radius: 12px; border: 1px solid #30363d; margin: 20px 0; }
                .chart-container h3 { margin-bottom: 15px; color: #e6edf3; }
                .bar { display: flex; gap: 10px; align-items: flex-end; height: 200px; }
                .bar-item { flex: 1; display: flex; flex-direction: column; align-items: center; }
                .bar-fill { width: 100%; background: linear-gradient(to top, #238636, #2ea043); border-radius: 4px 4px 0 0; transition: height 0.5s; }
                .bar-label { color: #8b949e; font-size: 0.7em; margin-top: 5px; }
                .green { color: #3fb950; }
                .blue { color: #58a6ff; }
                .orange { color: #d29922; }
                .red { color: #f85149; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📊 Bulwark Analytics</h1>
                    <p style="color: #8b949e;">Real-time insights into your code review bot</p>
                </div>
                
                <div class="grid">
                    <div class="card">
                        <h3>📝 PRs Analyzed</h3>
                        <div class="value blue">${summary.total.prs}</div>
                        <div class="sub">${summary.daily.slice(-7).reduce((sum, d) => sum + d.prs, 0)} in last 7 days</div>
                    </div>
                    <div class="card">
                        <h3>🧪 Tests Generated</h3>
                        <div class="value green">${summary.total.tests}</div>
                        <div class="sub">${summary.daily.slice(-7).reduce((sum, d) => sum + d.tests, 0)} in last 7 days</div>
                    </div>
                    <div class="card">
                        <h3>⚠️ Risks Found</h3>
                        <div class="value orange">${summary.total.risks}</div>
                        <div class="sub">${summary.daily.slice(-7).reduce((sum, d) => sum + d.risks, 0)} in last 7 days</div>
                    </div>
                    <div class="card">
                        <h3>💬 Feedback</h3>
                        <div class="value">${summary.total.feedback}</div>
                        <div class="sub">${summary.averages.functionsPerPR} functions per PR avg</div>
                    </div>
                </div>
                
                <div class="chart-container">
                    <h3>📈 Daily Activity (Last 7 Days)</h3>
                    <div class="bar">
                        ${summary.daily.map(d => `
                            <div class="bar-item">
                                <div class="bar-fill" style="height: ${Math.max(10, d.prs * 20)}px;"></div>
                                <div class="bar-label">${d.date.slice(5)}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div style="display: flex; gap: 20px; justify-content: center; margin-top: 15px; color: #8b949e; font-size: 0.8em;">
                        <span>📝 ${summary.daily.reduce((sum, d) => sum + d.prs, 0)} PRs</span>
                        <span>🧪 ${summary.daily.reduce((sum, d) => sum + d.tests, 0)} Tests</span>
                        <span>⚠️ ${summary.daily.reduce((sum, d) => sum + d.risks, 0)} Risks</span>
                    </div>
                </div>
                
                <div class="card" style="margin-top: 20px;">
                    <h3>⚡ Average Performance</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 10px;">
                        <div>
                            <div style="color: #8b949e; font-size: 0.8em;">Analysis Time</div>
                            <div style="font-size: 1.2em; font-weight: bold;">${summary.averages.analysisTimeMs}ms</div>
                        </div>
                        <div>
                            <div style="color: #8b949e; font-size: 0.8em;">Functions per PR</div>
                            <div style="font-size: 1.2em; font-weight: bold;">${summary.averages.functionsPerPR}</div>
                        </div>
                        <div>
                            <div style="color: #8b949e; font-size: 0.8em;">Tests per PR</div>
                            <div style="font-size: 1.2em; font-weight: bold;">${summary.averages.testsPerPR}</div>
                        </div>
                    </div>
                </div>
                
                <div class="card" style="margin-top: 20px;">
                    <h3>📋 Recent PRs</h3>
                    ${summary.recentPRs.map(pr => `
                        <div style="padding: 10px; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>#${pr.prNumber}</strong>
                                <span style="color: #8b949e; margin-left: 10px;">${pr.repo}</span>
                            </div>
                            <div>
                                <span style="color: #58a6ff;">${pr.functionsFound || 0} functions</span>
                                <span style="color: #3fb950; margin-left: 10px;">${pr.testsGenerated || 0} tests</span>
                                <span style="color: #d29922; margin-left: 10px;">${pr.risksFound || 0} risks</span>
                                <span style="color: #8b949e; margin-left: 10px; font-size: 0.8em;">${new Date(pr.timestamp).toLocaleDateString()}</span>
                            </div>
                        </div>
                    `).join('')}
                    ${summary.recentPRs.length === 0 ? '<div style="padding: 20px; text-align: center; color: #8b949e;">No PRs analyzed yet</div>' : ''}
                </div>
            </div>
        </body>
        </html>
        `);
    } catch (error) {
        res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
    }
});

export default router;