import express from 'express';
import { getFeedbackStats } from './feedback-logger.js';

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

// Add new API endpoint
router.get('/api/analytics', async (req, res) => {
  try {
    const stats = await getFeedbackStats();
    const invites = await getInviteStats();
    
    res.json({
      feedback: stats,
      invites: invites,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;