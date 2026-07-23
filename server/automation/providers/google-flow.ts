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
          await newPage.waitForLoadState('domcontentloaded').catch(() => {});
          const projectUrl = newPage.url();
          
          logger.info(`Closing spawned tab and redirecting primary tab to: ${projectUrl}`, { action: 'navigation' });
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
    logger.info(`Uploading image: ${path.basename(imagePath)}`, { action: 'upload_image' });

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

    // Wait for upload to complete
    await page.waitForTimeout(3000);
    logger.info('Image uploaded', { action: 'upload_image' });
  }

  async submitImagePrompt(page: Page, prompt: string): Promise<void> {
    logger.info('Submitting image prompt...', { action: 'submit_prompt' });

    // Look for text input / textarea for the prompt
    const promptInput = page.locator('textarea, input[type="text"]').first();

    if (await promptInput.isVisible().catch(() => false)) {
      await promptInput.click();
      await promptInput.fill(prompt);
    } else {
      // Try contenteditable div
      const editableDiv = page.locator('[contenteditable="true"]').first();
      if (await editableDiv.isVisible().catch(() => false)) {
        await editableDiv.click();
        await editableDiv.fill(prompt);
      }
    }

    await page.waitForTimeout(1000);

    // Look for generate/submit button
    const generateBtn = page.locator(
      'button:has-text("Generate"), button:has-text("Create"), button:has-text("Submit"), button[aria-label*="generate" i], button[aria-label*="submit" i]'
    ).first();

    if (await generateBtn.isVisible().catch(() => false)) {
      await generateBtn.click();
    } else {
      // Try pressing Enter
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
}

export const googleFlowProvider = new GoogleFlowProvider();
export default googleFlowProvider;
