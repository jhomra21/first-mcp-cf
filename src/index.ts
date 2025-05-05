import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
// Import the resume text directly
import resumeContent from './resume.txt';

// Define the Env interface for environment bindings (like static assets)
interface Env {
	ASSETS?: { fetch: (request: Request | string) => Promise<Response> };
	// Add AI binding
	AI: Ai;
	// Add other bindings if needed (KV, R2, Secrets, etc.)
}

// Define our simple MCP agent
export class ResumeReaderAgent extends McpAgent {
	server = new McpServer({
		name: "Resume Reader", // Simplified name
		version: "1.0.0",
	});

	// Removed explicit constructor and private env property

	// Initialize tools 
	async init() {
		// Capture the env from the instance property, assuming base class handles it
		// Explicitly type agentEnv as our Env interface or undefined
		const agentEnv = this.env as Env | undefined;

		// Tool to read the resume
		this.server.tool(
			"read_resume",
			"Returns the full resume content",
			async () => {
				return {
					content: [
						{
							type: "text",
							text: resumeContent,
						},
					],
				};
			}
		);
		// Tool to return name
		this.server.tool(
			"get_name",
			"Returns the person's name",
			async () => {
				return { content: [{ type: "text", text: "Juan Martinez" }] };
			}
		);
		// Tool to return email
		this.server.tool(
			"get_email",
			"Returns the person's email address",
			async () => {
				return { content: [{ type: "text", text: "jhonra121@gmail.com" }] };
			}
		);
		// Tool to return user links
		this.server.tool(
			"get_user_links", 
			"Returns the person's social media and website links",
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
			"Returns the person's educational background",
			async () => {
				return { content: [{ type: "text", text: "Masters Degree in Computer Science | University of Texas Rio Grande Valley 2021 – 2023" }] };
			}
		)
		// Tool to return languages and tools
		this.server.tool(
			"get_languages_and_tools",
			"Returns the programming languages and tools the person is proficient in",
			async () => {
				return { content: [{ type: "text", text: "Website Development: Ruby on Rails | Node.js | Bun | Hono.js | Express | React | SolidJS | Flask | nginx | Cloud Flare | Heroku | Vercel | Docker | Ubuntu | Supabase " },
								   { type: "text", text: "Programming Languages: C++ | Python | Java | Ruby | Dart/Flutter | C | Assembly | HTML | CSS | Type/JavaScript | jQuery | SQL | MySQL | Postgres | SQLite | MongoDB | Linux/unix servers" },
								   { type: "text", text: "Collaboration Tools: GitHub | JIRA Boards (Agile Methodology)" }
				] };
			}
		)

		// Tool to generate an image 
		this.server.tool(
			"generate_image",
			"Generates a futuristic programmer image using AI",
			// Use the captured agentEnv
			async (_extra: any) => {
				try {
					// Check if the captured environment and AI binding exist
					if (!agentEnv?.AI) {
						console.error("AI binding not found in agent environment.");
						return { 
							content: [{ type: "text", text: "AI binding not available in agent context" }],
							isError: true 
						};
					}

					// Explicitly type the expected AI response structure
					const response: { image?: string } = await agentEnv.AI.run('@cf/black-forest-labs/flux-1-schnell', {
						prompt: 'A futuristic holographic display with text "Workers AI"',
						steps: 8 // Higher quality setting
					});

					// Check if the image data exists in the response
					if (!response.image) {
						console.error('AI did not return image data.');
						return { 
							content: [{ type: "text", text: "AI response did not contain image data" }],
							isError: true
						};
					}

					// Return the image in the correct format for MCP
					return { 
						content: [
							{ 
								type: "image", 
								data: response.image, // Now guaranteed to be a string
								mimeType: "image/jpeg"
							}
						] 
					};
				} catch (e) {
					const error = e as Error;
					console.error('Error generating image:', error);
					return { 
						content: [
							{ 
								type: "text", 
								text: `Failed to generate image: ${error.message}` 
							}
						],
						isError: true
					};
				}
			}
		);
	}
}

export default {
	// The fetch handler processes incoming requests
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Route MCP SSE requests
		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			// Revert to original call, cast env to any
			return ResumeReaderAgent.serveSSE("/sse").fetch(request, env as any, ctx);
		}

		// Route MCP standard requests (optional)
		if (url.pathname === "/mcp") {
			// Revert to original call, cast env to any
			return ResumeReaderAgent.serve("/mcp").fetch(request, env as any, ctx);
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
