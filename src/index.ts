import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
// Import the resume text directly
import resumeContent from './resume.txt';

// Define the Env interface for environment bindings (like static assets)
interface Env {
	ASSETS?: { fetch: (request: Request | string) => Promise<Response> };
	// Add other bindings if needed (KV, R2, Secrets, etc.)
}

// Define our simple MCP agent
export class ResumeReaderAgent extends McpAgent {
	server = new McpServer({
		name: "Resume Reader", // Simplified name
		version: "1.0.0",
	});

	// Initialize tools - no env needed here directly
	async init() {
		// Tool to read the resume
		this.server.tool(
			"read_resume",
			{}, // No input schema needed
			async () => { // Removed unused parameters
				// Directly return the imported content
				return {
					content: [
						{
							type: "text",
							// Use the imported variable
							text: resumeContent,
						},
					],
				};
			}
		);
		// Tool to return name
		this.server.tool(
			"get_name",
			{},
			async () => {
				return { content: [{ type: "text", text: "Juan Martinez" }] };
			}
		);
		// Tool to return email
		this.server.tool(
			"get_email",
			{},
			async () => {
				return { content: [{ type: "text", text: "jhonra121@gmail.com" }] };
			}
		);
		// Tool to return user links
		this.server.tool(
			"get_user_links", 
			{},
			async () => {
				return { content: [{ type: "text", text: "https://www.linkedin.com/in/juan-martinez-933a33208/" },
								   { type: "text", text: "https://github.com/jhomra21" },
								   { type: "text", text: "https://juanrmb.pages.dev" },
				] };
			}
		);	
	
		// Tool to return education
		this.server.tool(
			"get_education",
			{},
			async () => {
				return { content: [{ type: "text", text: "Masters Degree in Computer Science | University of Texas Rio Grande Valley 2021 – 2023" }] };
			}
		)
		// Tool to return languages and tools
		this.server.tool(
			"get_languages_and_tools",
			{},
			async () => {
				return { content: [{ type: "text", text: "Website Development: Ruby on Rails | Node.js | Bun | Hono.js | Express | React | SolidJS | Flask | nginx | Cloud Flare | Heroku | Vercel | Docker | Ubuntu | Supabase " },
								   { type: "text", text: "Programming Languages: C++ | Python | Java | Ruby | Dart/Flutter | C | Assembly | HTML | CSS | Type/JavaScript | jQuery | SQL | MySQL | Postgres | SQLite | MongoDB | Linux/unix servers" },
								   { type: "text", text: "Collaboration Tools: GitHub | JIRA Boards (Agile Methodology)" }
				] };
			}
		)
	}
}

export default {
	// The fetch handler processes incoming requests
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Route MCP SSE requests
		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			// Pass only necessary options, removed {env, request}
			return ResumeReaderAgent.serveSSE("/sse").fetch(request, env as any, ctx); // Cast env to any to bypass stricter base type if needed
		}

		// Route MCP standard requests (optional)
		if (url.pathname === "/mcp") {
			// Pass only necessary options, removed {env, request}
			return ResumeReaderAgent.serve("/mcp").fetch(request, env as any, ctx); // Cast env to any
		}

		// Try to serve static assets from the 'public' directory using env.ASSETS
		// This handles requests for files like /resume.txt directly
		try {
			// env.ASSETS is automatically provided by Wrangler for the 'public' directory
			if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
				// Let the ASSETS binding handle the request for static files
				return env.ASSETS.fetch(request);
			}
		} catch (e) {
			console.error("Failed to use env.ASSETS.fetch:", e);
			// Fall through to 404 if ASSETS fetch fails
		}

		// Default fallback for unmatched routes
		return new Response("Not found", { status: 404 });
	},
};
