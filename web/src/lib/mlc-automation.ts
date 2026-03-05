import { chromium, Browser, BrowserContext, Page } from "playwright";

// Wait between 2-4 seconds to avoid rate-limiting and appear more human
const randomDelay = () => new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));

export interface MLCMatchResultData {
    workTitle: string;
    workId?: string;
    recordingTitle?: string;
    recordingISRC?: string;
    recordingArtist?: string;
    status: "FOUND" | "PROPOSED" | "NO_MATCH" | "ERROR";
    confidence?: number;
    error?: string;
}

export class MLCAutomation {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private page: Page | null = null;

    async initSession(headless = true): Promise<void> {
        this.browser = await chromium.launch({ headless });

        // Use a persistent context if we want to save login state, or standard context for now
        this.context = await this.browser.newContext({
            userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport: { width: 1280, height: 800 }
        });

        this.page = await this.context.newPage();

        // Check if we need to log in or if we are already logged in
        // Real implementation would handle auth using MLC_PORTAL_EMAIL
        await this.page.goto("https://portal.themlc.com/member/17469922/matching-tool", { waitUntil: "networkidle" });
        await randomDelay();

        // If redirected to login, perform login
        if (this.page.url().includes("login") || this.page.url().includes("auth")) {
            await this.performLogin();
        }
    }

    private async performLogin(): Promise<void> {
        const email = process.env.MLC_PORTAL_EMAIL;
        const password = process.env.MLC_PORTAL_PASSWORD;

        if (!email || !password || !this.page) {
            throw new Error("Missing MLC portal credentials or page not initialized");
        }

        console.log("Authenticating with MLC Portal...");
        // This assumes standard Auth0 or AWS Cognito login flow commonly used
        await this.page.fill("input[name='email'], input[type='email']", email);
        await this.page.fill("input[name='password'], input[type='password']", password);
        await this.page.click("button[type='submit'], button:has-text('Log in'), button:has-text('Sign In')");

        await this.page.waitForURL(/matching-tool/, { timeout: 15000 });
        await randomDelay();
    }

    async closeSession(): Promise<void> {
        if (this.context) await this.context.close();
        if (this.browser) await this.browser.close();
    }

    async searchAndMatchRecording(workTitle: string, isrc?: string): Promise<MLCMatchResultData> {
        if (!this.page) throw new Error("Session not initialized");

        try {
            await this.page.goto("https://portal.themlc.com/member/17469922/matching-tool", { waitUntil: "domcontentloaded" });
            await randomDelay();

            // The exact selectors depend on the portal's DOM. 
            // Based on our investigation: 'input.input-no-autocomplete' for fields
            const inputs = await this.page.$$("input.input-no-autocomplete");

            if (inputs.length >= 2) {
                // Clear and fill the search fields
                await inputs[0].fill(workTitle); // Recording Title (using work title as proxy)
                if (isrc) {
                    await inputs[1].fill(isrc);
                } else {
                    await inputs[1].fill("");
                }
            }

            // Click search
            const searchBtn = await this.page.$("button.main-color-set.primary:has-text('Search')");
            if (searchBtn && await searchBtn.isEnabled()) {
                await searchBtn.click();

                // Wait for results table to load
                try {
                    // Wait for either the table or a 'no results' message
                    await Promise.race([
                        this.page.waitForSelector("table tbody tr", { timeout: 10000 }),
                        this.page.waitForSelector("text='No results found'", { timeout: 10000 })
                    ]);
                } catch (e) {
                    // Timeout passed
                }

                await randomDelay();

                // Check for results
                const rows = await this.page.$$("table tbody tr");
                if (rows.length > 0) {
                    // We found potential matches! 
                    // Parse the first result for reporting
                    const firstRowText = await rows[0].innerText();
                    const columns = firstRowText.split('\t').map((c: string) => c.trim());

                    return {
                        workTitle,
                        recordingTitle: columns[0] || "Unknown",
                        recordingArtist: columns[1] || "Unknown",
                        recordingISRC: isrc || "Unknown",
                        status: "FOUND",
                        confidence: 85 // Arbitrary high confidence for a title/ISRC match
                    };
                } else {
                    return { workTitle, status: "NO_MATCH" };
                }
            } else {
                return { workTitle, status: "ERROR", error: "Search button not enabled" };
            }
        } catch (error: any) {
            console.error(`Error matching ${workTitle}:`, error);
            return { workTitle, status: "ERROR", error: error.message };
        }
    }
}
