import type { Page } from 'playwright';
import type { AIProvider } from '../../../src/types/provider';
import { logger } from '../../logger/logger';
import path from 'path';
import fs from 'fs';

const FLOW_URL = 'https://labs.google/fx/tools/flow';

/**
 * Google Flow provider implementation.
 *
 * Google Flow (labs.google/fx/tools/flow) is an AI creative studio
 * that supports image and video generation.
 *
 * NOTE: The selectors below are based on the current Flow UI structure.
 * If the UI changes, these selectors will need to be updated.
 * The provider pattern means only this file needs changing.
 */
export class GoogleFlowProvider implements AIProvider {
  name = 'google-flow';
  displayName = 'Google Flow';
  baseUrl = FLOW_URL;

  // --- Image Generation ---

  async openImageGenerator(page: Page): Promise<void> {
    logger.info('Opening Google Flow...', { action: 'open_image_generator' });
    await page.goto(FLOW_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(4000);

    // 1. Dismiss "Cookie banner" or other initial overlay popups if they exist
    const cookieConsentBtn = page.locator('button:has-text("Accept all"), button:has-text("I agree"), button:has-text("Agree"), button:has-text("Accept")').first();
    if (await cookieConsentBtn.isVisible().catch(() => false)) {
      logger.info('Clicking cookie/agreement consent...', { action: 'navigation' });
      await cookieConsentBtn.click();
      await page.waitForTimeout(2000);
    }

    // 2. Check for "Create with Google Flow" / "Try Flow" / "Get started" button
    const getStartedBtn = page.locator('a, button, [role="button"]').filter({ 
      hasText: /Create with Google Flow|Try Flow|Get Started|Launch Flow/i 
    }).first();

    if (await getStartedBtn.isVisible().catch(() => false)) {
      logger.info('Clicking "Create with Google Flow" button...', { action: 'navigation' });
      await getStartedBtn.click();
      await page.waitForTimeout(4000);
    }

    // 3. Dismiss onboarding/welcome popups if visible
    // They can sometimes be dismissed by clicking "Got it", "Get started", or clicking outside
    const gotItBtn = page.locator('button, [role="button"]').filter({ 
      hasText: /Got it|Get started|Dismiss|Close|Next|Skip/i 
    }).first();

    if (await gotItBtn.isVisible().catch(() => false)) {
      logger.info('Dismissing onboarding pop-up dialog...', { action: 'navigation' });
      await gotItBtn.click();
      await page.waitForTimeout(2000);
    } else {
      // Tap outside (10, 10) to dismiss backdrop modal if it is locking the screen
      const overlay = page.locator('.modal-backdrop, .overlay, [class*="overlay" i], [class*="backdrop" i]').first();
      if (await overlay.isVisible().catch(() => false)) {
        logger.info('Clicking backdrop to close overlay dialog...', { action: 'navigation' });
        await page.mouse.click(10, 10);
        await page.waitForTimeout(2000);
      }
    }

    // 4. Click "Create new project" or "New project"
    const newProjectBtn = page.locator('button, [role="button"]').filter({ 
      hasText: /Create new project|New project|New Project|Create project/i 
    }).first();

    if (await newProjectBtn.isVisible().catch(() => false)) {
      logger.info('Clicking "Create new project" button...', { action: 'navigation' });
      
      try {
        // Intercept new page event if button opens a new tab
        const [newPage] = await Promise.all([
          page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null),
          newProjectBtn.click()
        ]);

        if (newPage) {
          logger.info('Detected new tab opened for project workspace', { action: 'navigation' });
          
          // Wait for the new tab to navigate to the project page (URL contains /project/)
          await newPage.waitForURL(/.*\/project\/.*/, { timeout: 12000 }).catch(() => {
            logger.warn('New tab URL did not redirect to project URL within timeout', { action: 'navigation' });
          });
          
          const projectUrl = newPage.url();
          logger.info(`Project URL resolved: ${projectUrl}`, { action: 'navigation' });
          
          logger.info('Closing spawned tab and redirecting primary tab to project URL...', { action: 'navigation' });
          await newPage.close().catch(() => {});
          
          if (projectUrl && projectUrl !== 'about:blank') {
            await page.goto(projectUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          }
        } else {
          // If no new tab opened, it redirected the same tab
          await page.waitForTimeout(4000);
        }
      } catch (err) {
        logger.warn('Project creation tab intercept timed out, checking current URL', { action: 'navigation' });
        await page.waitForTimeout(4000);
      }
    }

    logger.info('Google Flow workspace ready', { action: 'open_image_generator' });
  }

  async uploadImage(page: Page, imagePath: string): Promise<void> {
    const fileName = path.basename(imagePath);
    logger.info(`Uploading image: ${fileName}`, { action: 'upload_image' });

    try {
      // Wait for file input to be attached to the DOM (up to 15 seconds)
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.waitFor({ state: 'attached', timeout: 15000 });
      await fileInput.setInputFiles(imagePath);
    } catch (error) {
      // Fallback: try setting it directly if it exists, otherwise throw descriptive error
      const fileInput = page.locator('input[type="file"]').first();
      if ((await fileInput.count()) > 0) {
        await fileInput.setInputFiles(imagePath);
      } else {
        throw new Error('Could not find file upload input on the page. Please check if you are inside the editor.');
      }
    }

    // Wait for the uploaded image card with the filename to appear in the workspace
    logger.info(`Waiting for uploaded image card to appear in workspace: ${fileName}`, { action: 'upload_image' });
    const imageCardText = page.getByText(fileName, { exact: false }).first();
    await imageCardText.waitFor({ state: 'visible', timeout: 45000 });

    // Click the uploaded image card to open the editor edit screen
    logger.info(`Clicking uploaded image card: ${fileName}`, { action: 'upload_image' });
    await imageCardText.click();

    // Wait for the URL redirection to /edit/
    logger.info('Waiting for redirect to edit workspace...', { action: 'upload_image' });
    await page.waitForURL(/.*\/edit\/.*/, { timeout: 15000 }).catch(() => {
      logger.warn('URL redirect to edit page did not complete, continuing anyway', { action: 'upload_image' });
    });

    await page.waitForTimeout(2000);
    logger.info('Image uploaded and editor workspace opened', { action: 'upload_image' });
  }

  async submitImagePrompt(page: Page, prompt: string): Promise<void> {
    logger.info('Submitting image prompt...', { action: 'submit_prompt' });

    // Look for text input / textarea for the change prompt (second screenshot: 'What do you want to change?')
    const promptInput = page.locator('textarea[placeholder*="want to change" i], [placeholder*="want to change" i], textarea, input[type="text"]').first();

    if (await promptInput.isVisible().catch(() => false)) {
      await promptInput.click();
      await promptInput.fill(prompt);
    } else {
      // Try contenteditable div
      const editableDiv = page.locator('[contenteditable="true"]').first();
      if (await editableDiv.isVisible().catch(() => false)) {
        await editableDiv.click();
        await editableDiv.fill(prompt);
      } else {
        throw new Error('Could not find prompt input field "What do you want to change?" on the edit page');
      }
    }

    await page.waitForTimeout(1000);

    // Look for generate/submit button next to the textarea or the arrow submit button
    const submitBtn = page.locator('textarea[placeholder*="want to change" i] ~ button, [placeholder*="want to change" i] + button, button:has(svg)').first();

    if (await submitBtn.isVisible().catch(() => false)) {
      logger.info('Clicking prompt submit arrow button...', { action: 'submit_prompt' });
      await submitBtn.click();
    } else {
      // Try pressing Enter
      logger.info('Submit button not found, pressing Enter to submit...', { action: 'submit_prompt' });
      await page.keyboard.press('Enter');
    }

    logger.info('Image prompt submitted', { action: 'submit_prompt' });
  }

  async waitForImageGeneration(page: Page, timeout: number): Promise<void> {
    logger.info('Waiting for image generation...', { action: 'wait_generation' });

    const startTime = Date.now();

    // Wait for a download button, generated image, or other indicator of completion
    while (Date.now() - startTime < timeout) {
      // Check for download button or generated content in workspace/editor
      const downloadBtn = page.locator(
        'main button:has-text("Download"), [class*="editor" i] button:has-text("Download"), [class*="workspace" i] button:has-text("Download"), button[aria-label*="download" i]'
      ).last();
      const generatedImage = page.locator('img[src*="generated"], img[src*="blob:"]');

      if (
        (await downloadBtn.count()) > 0 ||
        (await generatedImage.count()) > 0
      ) {
        logger.info('Image generation complete', { action: 'wait_generation' });
        return;
      }

      // Check for real errors, ignoring toast alerts or status messages
      const errorElement = page.locator('[class*="error-message" i], [class*="error_message" i], .error-text, .error, [role="alert"]').first();
      if (await errorElement.isVisible().catch(() => false)) {
        const errorText = await errorElement.textContent();
        if (errorText && /fail|error|unable|could not|blocked|denied|invalid/i.test(errorText)) {
          throw new Error(`Generation failed: ${errorText}`);
        }
      }

      await page.waitForTimeout(3000);
    }

    throw new Error('Image generation timed out');
  }

  async downloadGeneratedImage(page: Page, outputDir: string): Promise<string> {
    logger.info('Downloading generated image...', { action: 'download_image' });

    // Target the download button specifically inside the workspace/editor (excluding header/nav candidate buttons)
    let downloadBtn = page.locator(
      'main button:has-text("Download"), [class*="editor" i] button:has-text("Download"), [class*="workspace" i] button:has-text("Download")'
    ).last();

    if ((await downloadBtn.count()) === 0) {
      // Fallback to last download button on page
      downloadBtn = page.locator('button:has-text("Download"), button[aria-label*="download" i], a[download]').last();
    }

    // Set up download listener
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 35000 }),
      downloadBtn.click(),
    ]);

    // Save the downloaded file
    const suggestedName = download.suggestedFilename() || `generated_${Date.now()}.png`;
    const outputPath = path.join(outputDir, suggestedName);
    await download.saveAs(outputPath);

    logger.info(`Image downloaded: ${suggestedName}`, { action: 'download_image' });
    return outputPath;
  }

  // --- Video Generation ---

  async openVideoGenerator(page: Page): Promise<void> {
    // Video generation may be on the same page or a different tool in Flow
    // For now, we stay on the same page or navigate to video section
    logger.info('Opening video generator...', { action: 'open_video_generator' });

    // Check if we need to switch to video mode/tab
    const videoTab = page.locator(
      'button:has-text("Video"), [role="tab"]:has-text("Video"), a:has-text("Video")'
    ).first();

    if (await videoTab.isVisible().catch(() => false)) {
      await videoTab.click();
      await page.waitForTimeout(2000);
    }

    logger.info('Video generator ready', { action: 'open_video_generator' });
  }

  async uploadImageForVideo(page: Page, imagePath: string): Promise<void> {
    // Same upload mechanism as image generation
    await this.uploadImage(page, imagePath);
  }

  async submitVideoPrompt(page: Page, prompt: string): Promise<void> {
    // Same prompt submission mechanism
    await this.submitImagePrompt(page, prompt);
  }

  async waitForVideoGeneration(page: Page, timeout: number): Promise<void> {
    logger.info('Waiting for video generation...', { action: 'wait_video_generation' });

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      // Check for video element or download button
      const videoElement = page.locator('video[src], video source[src]');
      const downloadBtn = page.locator(
        'main button:has-text("Download"), [class*="editor" i] button:has-text("Download"), [class*="workspace" i] button:has-text("Download"), button[aria-label*="download" i]'
      ).last();

      if (
        (await videoElement.count()) > 0 ||
        (await downloadBtn.count()) > 0
      ) {
        logger.info('Video generation complete', { action: 'wait_video_generation' });
        return;
      }

      // Check for real errors, ignoring status alerts/messages
      const errorElement = page.locator('[class*="error-message" i], [class*="error_message" i], .error-text, .error, [role="alert"]').first();
      if (await errorElement.isVisible().catch(() => false)) {
        const errorText = await errorElement.textContent();
        if (errorText && /fail|error|unable|could not|blocked|denied|invalid/i.test(errorText)) {
          throw new Error(`Video generation failed: ${errorText}`);
        }
      }

      await page.waitForTimeout(5000);
    }

    throw new Error('Video generation timed out');
  }

  async downloadGeneratedVideo(page: Page, outputDir: string): Promise<string> {
    logger.info('Downloading generated video...', { action: 'download_video' });

    // Target the download button specifically inside the workspace/editor
    let downloadBtn = page.locator(
      'main button:has-text("Download"), [class*="editor" i] button:has-text("Download"), [class*="workspace" i] button:has-text("Download")'
    ).last();

    if ((await downloadBtn.count()) === 0) {
      downloadBtn = page.locator('button:has-text("Download"), button[aria-label*="download" i], a[download]').last();
    }

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 65000 }),
      downloadBtn.click(),
    ]);

    const suggestedName = download.suggestedFilename() || `generated_${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, suggestedName);
    await download.saveAs(outputPath);

    logger.info(`Video downloaded: ${suggestedName}`, { action: 'download_video' });
    return outputPath;
  }

  async addGeneratedImageToPrompt(page: Page): Promise<void> {
    logger.info('Starting "Add to Prompt" workflow...', { action: 'add_to_prompt' });

    // 1. Click back button to return to project dashboard (first screenshot)
    const backBtn = page.locator('button:has(svg), [aria-label*="back" i], button[class*="back" i], .back-button').first();
    logger.info('Clicking back button to return to project media dashboard...', { action: 'add_to_prompt' });
    await backBtn.click();
    
    // Wait for the URL to change back to project root dashboard (which doesn't contain /edit/)
    await page.waitForURL(url => !url.href.includes('/edit/'), { timeout: 15000 }).catch(() => {
      logger.warn('URL redirect back to project root did not complete, proceeding...', { action: 'add_to_prompt' });
    });
    await page.waitForTimeout(3000);

    // 2. Right click on the newly generated image (second screenshot)
    // The newly generated image will be the first item in the grid container
    const firstImage = page.locator('[class*="grid" i] img, [class*="card" i] img, [class*="media" i] img, img').first();
    logger.info('Right-clicking on the generated image card...', { action: 'add_to_prompt' });
    await firstImage.click({ button: 'right' });
    await page.waitForTimeout(2000);

    // 3. Select "Add to prompt" from the context menu (third screenshot)
    const addToPromptBtn = page.locator('text="Add to prompt", [role="menuitem"]:has-text("Add to prompt"), button:has-text("Add to prompt")').first();
    await addToPromptBtn.waitFor({ state: 'visible', timeout: 8000 });
    logger.info('Clicking "Add to prompt" in the context menu...', { action: 'add_to_prompt' });
    await addToPromptBtn.click();
    await page.waitForTimeout(3000);

    logger.info('"Add to Prompt" workflow completed successfully', { action: 'add_to_prompt' });
  }
}

export const googleFlowProvider = new GoogleFlowProvider();
export default googleFlowProvider;
