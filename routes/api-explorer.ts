import express from "express";

const router = express.Router();

// SECURITY: Block API Explorer in production
if (process.env.NODE_ENV === 'production') {
  router.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
} else {

  // API Routes data - Updated with actual endpoints and auth requirements
  const apiRoutes = [
    {
      resource: "Auth",
      basePath: "/api/auth",
      routes: [
        { method: "POST", path: "/api/auth/register", description: "Register a new user", auth: "Public (rate limited: 3/hour)" },
        { method: "POST", path: "/api/auth/login", description: "Login and get JWT token", auth: "Public (rate limited: 5/15min)" },
        { method: "GET", path: "/api/auth/me", description: "Get current user info", auth: "🔒 JWT Required" },
        { method: "POST", path: "/api/auth/change-password", description: "Change password", auth: "🔒 JWT Required" },
      ],
    },
    {
      resource: "Users",
      basePath: "/api/users",
      routes: [
        { method: "GET", path: "/api/users", description: "Get all users with pagination", auth: "🔒 ADMIN only", params: "page, limit, role" },
        { method: "GET", path: "/api/users/:id", description: "Get user by ID", auth: "🔒 Self or ADMIN" },
        { method: "POST", path: "/api/users", description: "Create new user", auth: "🔒 ADMIN only" },
        { method: "PUT", path: "/api/users/:id", description: "Update user", auth: "🔒 Self or ADMIN" },
        { method: "DELETE", path: "/api/users/:id", description: "Delete user and all data", auth: "🔒 Self or ADMIN" },
        { method: "GET", path: "/api/users/stats/overview", description: "Get users statistics", auth: "🔒 ADMIN only" },
        { method: "GET", path: "/api/users/:id/export", description: "RGPD data export", auth: "🔒 Self or ADMIN" },
      ],
    },
    {
      resource: "Courses",
      basePath: "/api/courses",
      routes: [
        { method: "GET", path: "/api/courses", description: "List all courses", auth: "🔒 Active subscription required" },
        { method: "GET", path: "/api/courses/:id", description: "Get course details", auth: "🔒 Active subscription required" },
        { method: "POST", path: "/api/courses", description: "Create new course", auth: "🔒 COACH/ADMIN only" },
        { method: "PUT", path: "/api/courses/:id", description: "Update course", auth: "🔒 COACH/ADMIN only" },
        { method: "DELETE", path: "/api/courses/:id", description: "Delete course", auth: "🔒 COACH/ADMIN only" },
        { method: "POST", path: "/api/courses/:id/modules", description: "Add module to course", auth: "🔒 COACH/ADMIN only" },
        { method: "POST", path: "/api/courses/:id/lessons/:lessonId/complete", description: "Mark lesson complete", auth: "🔒 Active subscription" },
        { method: "POST", path: "/api/courses/:id/lessons/:lessonId/quiz/submit", description: "Submit quiz answers", auth: "🔒 Active subscription" },
        { method: "GET", path: "/api/courses/:id/certificate", description: "Get completion certificate", auth: "🔒 Active subscription" },
      ],
    },
    {
      resource: "Sessions",
      basePath: "/api/sessions",
      routes: [
        { method: "GET", path: "/api/sessions", description: "Get all sessions", auth: "🔒 Active subscription", params: "page, limit, capsuleId, coachId, status" },
        { method: "GET", path: "/api/sessions/:id", description: "Get session by ID", auth: "🔒 Active subscription" },
        { method: "POST", path: "/api/sessions", description: "Create new session", auth: "🔒 COACH/ADMIN only" },
        { method: "PUT", path: "/api/sessions/:id", description: "Update session", auth: "🔒 Session owner or ADMIN" },
        { method: "DELETE", path: "/api/sessions/:id", description: "Delete session", auth: "🔒 Session owner or ADMIN" },
        { method: "POST", path: "/api/sessions/:id/assessments", description: "Add assessment", auth: "🔒 Participant or ADMIN" },
        { method: "GET", path: "/api/sessions/stats/overview", description: "Get session statistics", auth: "🔒 MANAGER/COACH/ADMIN" },
      ],
    },
    {
      resource: "Notifications",
      basePath: "/api/notifications",
      routes: [
        { method: "GET", path: "/api/notifications", description: "Get user notifications", auth: "🔒 JWT Required" },
        { method: "PATCH", path: "/api/notifications/:id/read", description: "Mark as read", auth: "🔒 Owner or ADMIN" },
        { method: "PATCH", path: "/api/notifications/mark-all-read", description: "Mark all as read", auth: "🔒 JWT Required" },
        { method: "POST", path: "/api/notifications", description: "Create notification", auth: "🔒 COACH/MANAGER/ADMIN" },
        { method: "DELETE", path: "/api/notifications/:id", description: "Delete notification", auth: "🔒 Owner or ADMIN (global)" },
      ],
    },
    {
      resource: "Feedback",
      basePath: "/api/feedback",
      routes: [
        { method: "POST", path: "/api/feedback", description: "Submit course feedback", auth: "🔒 JWT Required" },
        { method: "GET", path: "/api/feedback/stats", description: "Get feedback statistics", auth: "🔒 ADMIN/COACH only" },
        { method: "GET", path: "/api/feedback/course/:courseId", description: "Get course feedback", auth: "🔒 ADMIN/COACH only" },
      ],
    },
    {
      resource: "Statistics",
      basePath: "/api/statistics",
      routes: [
        { method: "GET", path: "/api/statistics", description: "Get user learning stats", auth: "🔒 Active subscription" },
        { method: "GET", path: "/api/statistics/team", description: "Get team statistics", auth: "🔒 MANAGER/COACH/ADMIN" },
      ],
    },
    {
      resource: "Energy Logs",
      basePath: "/api/energy-logs",
      routes: [
        { method: "POST", path: "/api/energy-logs", description: "Submit daily mood", auth: "🔒 Active subscription" },
        { method: "GET", path: "/api/energy-logs", description: "Get mood history", auth: "🔒 Active subscription", params: "days (default: 7)" },
        { method: "GET", path: "/api/energy-logs/today", description: "Check today's mood", auth: "🔒 Active subscription" },
      ],
    },
    {
      resource: "Quotes",
      basePath: "/api/quotes",
      routes: [
        { method: "GET", path: "/api/quotes", description: "Get all quotes", auth: "🔒 Active subscription" },
        { method: "GET", path: "/api/quotes/random", description: "Get random quote", auth: "🔒 Active subscription" },
        { method: "POST", path: "/api/quotes", description: "Create quote", auth: "🔒 ADMIN only" },
        { method: "PUT", path: "/api/quotes/:id", description: "Update quote", auth: "🔒 ADMIN only" },
        { method: "DELETE", path: "/api/quotes/:id", description: "Delete quote", auth: "🔒 ADMIN only" },
      ],
    },
    {
      resource: "Upload",
      basePath: "/api/upload",
      routes: [
        { method: "POST", path: "/api/upload/video", description: "Upload video (max 100MB)", auth: "🔒 COACH/ADMIN only" },
        { method: "POST", path: "/api/upload/avatar", description: "Upload avatar (max 5MB)", auth: "🔒 JWT Required" },
        { method: "POST", path: "/api/upload/document", description: "Upload document (max 50MB)", auth: "🔒 COACH/ADMIN only" },
      ],
    },
    {
      resource: "Admin",
      basePath: "/api/admin",
      routes: [
        { method: "GET", path: "/api/admin/users", description: "Get all users with stats", auth: "🔒 ADMIN only" },
      ],
    },
  ];


  // GET /api-explorer - API Explorer interface
  router.get("/", (req, res) => {
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <title>API Explorer - Coach y Média</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .method-get { background-color: #10b981; }
        .method-post { background-color: #3b82f6; }
        .method-put { background-color: #f59e0b; }
        .method-delete { background-color: #ef4444; }
        .method-patch { background-color: #8b5cf6; }
    </style>
</head>
<body class="bg-zinc-50 min-h-screen">
    <div class="container mx-auto px-4 py-8">
        <div class="mb-8">
            <h1 class="text-4xl font-bold text-zinc-900 mb-2">API Explorer</h1>
            <p class="text-lg text-zinc-600">Coach y Média REST API Documentation</p>
            <div class="mt-4 text-sm text-zinc-500">
                <strong>Base URL:</strong> <code class="bg-zinc-100 px-2 py-1 rounded">http://localhost:3001</code>
            </div>
        </div>

        <div class="grid gap-8">
            ${apiRoutes
        .map(
          (resource) => `
                <div class="bg-white rounded-lg shadow-md overflow-hidden">
                    <div class="bg-zinc-800 text-white px-6 py-4">
                        <h2 class="text-xl font-semibold">${resource.resource
            }</h2>
                        <p class="text-zinc-300 text-sm">Base path: <code>${resource.basePath
            }</code></p>
                    </div>
                    <div class="p-6">
                        <div class="space-y-4">
                            ${resource.routes
              .map(
                (route: any) => `
                                <div class="border border-zinc-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                    <div class="flex items-start gap-4">
                                        <span class="method-${route.method.toLowerCase()} text-white px-3 py-1 rounded text-sm font-mono font-bold text-xs uppercase min-w-[60px] text-center">
                                            ${route.method}
                                        </span>
                                        <div class="flex-1">
                                            <div class="flex items-center gap-2 mb-2">
                                                <code class="bg-zinc-100 px-2 py-1 rounded text-sm font-mono">${route.path
                  }</code>
                                                <button onclick="copyToClipboard('${route.path
                  }')" class="text-zinc-400 hover:text-zinc-600 text-sm">
                                                    📋
                                                </button>
                                            </div>
                                            <p class="text-zinc-700 mb-2">${route.description
                  }</p>
                                            ${route.auth
                    ? `
                                                <div class="text-sm mb-1">
                                                    <span class="${route.auth.includes('Public') ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'} px-2 py-0.5 rounded text-xs font-medium">${route.auth}</span>
                                                </div>
                                            `
                    : ""
                  }
                                            ${route.params
                    ? `
                                                <div class="text-sm text-zinc-600">
                                                    <strong>Query params:</strong> <code class="bg-zinc-100 px-1 rounded">${route.params}</code>
                                                </div>
                                            `
                    : ""
                  }
                                        </div>
                                    </div>
                                </div>
                            `
              )
              .join("")}
                        </div>
                    </div>
                </div>
            `
        )
        .join("")}
        </div>

        <div class="mt-12 bg-white rounded-lg shadow-md p-6">
            <h3 class="text-xl font-semibold mb-4">Test the API</h3>
            <div class="grid md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-zinc-700 mb-2">Endpoint</label>
                    <input type="text" id="endpoint" placeholder="/api/users" class="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-zinc-700 mb-2">Method</label>
                    <select id="method" class="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                    </select>
                </div>
            </div>
            <div class="mt-4">
                <label class="block text-sm font-medium text-zinc-700 mb-2">Request Body (JSON)</label>
                <textarea id="requestBody" placeholder='{"name": "Test"}' class="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 font-mono text-sm"></textarea>
            </div>
            <div class="mt-4 flex gap-2">
                <button onclick="testEndpoint()" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium">
                    Test Endpoint
                </button>
                <button onclick="clearResponse()" class="bg-zinc-500 hover:bg-zinc-600 text-white px-4 py-2 rounded-md font-medium">
                    Clear
                </button>
            </div>
            <div class="mt-4">
                <label class="block text-sm font-medium text-zinc-700 mb-2">Response</label>
                <pre id="response" class="bg-zinc-100 p-4 rounded-md text-sm font-mono overflow-x-auto max-h-96"></pre>
            </div>
        </div>
    </div>

    <script>
        async function testEndpoint() {
            const endpoint = document.getElementById('endpoint').value;
            const method = document.getElementById('method').value;
            const requestBody = document.getElementById('requestBody').value;
            const responseDiv = document.getElementById('response');

            if (!endpoint) {
                responseDiv.textContent = 'Please enter an endpoint';
                return;
            }

            try {
                const options = {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                    }
                };

                if (requestBody && (method === 'POST' || method === 'PUT')) {
                    options.body = requestBody;
                }

                const response = await fetch('http://localhost:3001' + endpoint, options);
                const data = await response.text();

                let formattedData;
                try {
                    formattedData = JSON.stringify(JSON.parse(data), null, 2);
                } catch {
                    formattedData = data;
                }

                responseDiv.innerHTML = \`<strong>\${response.status} \${response.statusText}</strong>\\n\\n\${formattedData}\`;
                responseDiv.className = 'bg-zinc-100 p-4 rounded-md text-sm font-mono overflow-x-auto max-h-96';
            } catch (error) {
                responseDiv.textContent = 'Error: ' + error.message;
                responseDiv.className = 'bg-red-100 p-4 rounded-md text-sm font-mono overflow-x-auto max-h-96 text-red-800';
            }
        }

        function clearResponse() {
            document.getElementById('response').textContent = '';
            document.getElementById('endpoint').value = '';
            document.getElementById('requestBody').value = '';
        }

        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                // Could add a toast notification here
                console.log('Copied to clipboard:', text);
            });
        }

        // Auto-fill some examples
        document.getElementById('endpoint').value = '/api/users';
    </script>
</body>
</html>
  `;

    res.send(html);
  });

} // End of else block for development mode

export default router;
