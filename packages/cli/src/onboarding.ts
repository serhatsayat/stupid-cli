/**
 * First-run onboarding wizard for the stupid CLI.
 *
 * Guides users through provider selection and authentication:
 * - OAuth browser login (Anthropic, GitHub Copilot, Google, etc.)
 * - API key paste (manual entry for any provider)
 *
 * Uses @clack/prompts for the interactive TUI.
 *
 * Observability:
 * - Prints intro/outro via @clack/prompts for user-visible progress.
 * - OAuth flow logs step-by-step progress via `onProgress` callback.
 * - Errors are caught and displayed via `p.log.error()` — never swallowed.
 * - API keys and OAuth tokens are NEVER logged — only provider names.
 * - After successful onboarding, credentials are persisted to `~/.stupid/auth.json`.
 *
 * @module
 */

import * as p from "@clack/prompts";
import { exec } from "node:child_process";
import { getAuthStorage } from "./auth.js";

import type { OAuthLoginCallbacks } from "@mariozechner/pi-ai";

/**
 * Open a URL in the user's default browser.
 *
 * Uses `child_process.exec` with platform-appropriate commands.
 * Falls back to printing the URL if exec fails.
 */
function openBrowser(url: string): void {
  const command =
    process.platform === "darwin"
      ? `open "${url}"`
      : process.platform === "win32"
        ? `start "" "${url}"`
        : `xdg-open "${url}"`;

  exec(command, (err) => {
    if (err) {
      // If browser open fails, the URL was already printed — user can copy it
      p.log.warn(`Could not open browser automatically. Please visit:\n${url}`);
    }
  });
}

/**
 * Runs the interactive first-run onboarding wizard.
 *
 * Flow:
 * 1. Intro message
 * 2. Provider selection (OAuth providers + API key paste)
 * 3. If OAuth: browser login via `authStorage.login()`
 * 4. If API key: provider select → key paste → `authStorage.set()`
 * 5. Outro message
 *
 * Only call this when `shouldRunOnboarding()` returns true AND `process.stdin.isTTY`.
 * The caller in cli.ts enforces both guards.
 */
export async function runOnboardingWizard(): Promise<void> {
  const authStorage = getAuthStorage();

  p.intro("Welcome to stupid — let's set up authentication");

  try {
    // Build provider options: OAuth providers + manual API key
    const oauthProviders = authStorage.getOAuthProviders();
    const options = [
      ...oauthProviders.map((provider) => ({
        value: provider.id,
        label: provider.name,
      })),
      { value: "api_key", label: "Paste an API key" },
    ];

    const selectedProvider = await p.select({
      message: "Choose an auth method",
      options,
    });

    if (p.isCancel(selectedProvider)) {
      p.cancel("Setup cancelled");
      return;
    }

    if (selectedProvider === "api_key") {
      // API key paste flow
      await handleApiKeyFlow(authStorage);
    } else {
      // OAuth browser login flow
      await handleOAuthFlow(authStorage, selectedProvider as string);
    }

    p.outro("Authentication configured! Run stupid \"your task\" to get started.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "cancelled") {
      p.cancel("Setup cancelled");
    } else {
      p.log.error(`Onboarding failed: ${message}`);
    }
  }
}

/**
 * Handle the API key paste flow.
 *
 * Prompts for:
 * 1. Provider name (anthropic, openai, google)
 * 2. API key value (never echoed or logged)
 *
 * Persists credential via `authStorage.set()`.
 */
async function handleApiKeyFlow(
  authStorage: ReturnType<typeof getAuthStorage>,
): Promise<void> {
  const providerName = await p.select({
    message: "Select the provider for your API key",
    options: [
      { value: "anthropic", label: "Anthropic (Claude)" },
      { value: "openai", label: "OpenAI (GPT)" },
      { value: "google", label: "Google (Gemini)" },
    ],
  });

  if (p.isCancel(providerName)) {
    throw new Error("cancelled");
  }

  const apiKey = await p.text({
    message: "Paste your API key",
    placeholder: "sk-...",
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return "API key cannot be empty";
      }
    },
  });

  if (p.isCancel(apiKey)) {
    throw new Error("cancelled");
  }

  authStorage.set(providerName as string, { type: "api_key", key: apiKey.trim() });
  // Only log provider name — never the key value
  p.log.success(`API key saved for ${providerName}`);
}

/**
 * Handle the OAuth browser login flow.
 *
 * Calls `authStorage.login()` with callbacks that:
 * - Open the browser for auth URL
 * - Prompt user for input when needed
 * - Log progress steps
 */
async function handleOAuthFlow(
  authStorage: ReturnType<typeof getAuthStorage>,
  providerId: string,
): Promise<void> {
  p.log.step(`Starting OAuth login for ${providerId}...`);

  const callbacks: OAuthLoginCallbacks = {
    onAuth: ({ url, instructions }) => {
      if (instructions) {
        p.log.info(instructions);
      }
      p.log.info(`Opening browser for authentication...\n${url}`);
      openBrowser(url);
    },

    onPrompt: async ({ message, placeholder }) => {
      const value = await p.text({
        message,
        placeholder: placeholder ?? "",
      });

      if (p.isCancel(value)) {
        throw new Error("cancelled");
      }

      return value;
    },

    onProgress: (message) => {
      p.log.step(message);
    },

    onManualCodeInput: async () => {
      const code = await p.text({
        message: "Paste the authorization code from your browser",
        placeholder: "auth-code-...",
      });

      if (p.isCancel(code)) {
        throw new Error("cancelled");
      }

      return code;
    },
  };

  await authStorage.login(providerId, callbacks);
  p.log.success(`OAuth login successful for ${providerId}`);
}
