import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  // Verify the server is accessible
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(baseURL || 'http://localhost:5173', { timeout: 30000 });
    console.log('Server is running and accessible');
  } catch (error) {
    console.error('Failed to connect to server. Make sure it is running.');
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
