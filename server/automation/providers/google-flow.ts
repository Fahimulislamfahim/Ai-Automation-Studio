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
    await page.goto(FLOW_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle').catch(() => {
      // networkidle can timeout on dynamic pages, continue anyway
    });

    logger.info('Google Flow loaded', { action: 'open_image_generator' });
  }

  async uploadImage(page: Page, imagePath: string): Promise<void> {
    logger.info(`Uploading image: ${path.basename(imagePath)}`, { action: 'upload_image' });

    // Look for file input or upload button
    // Google Flow typically has an upload area or file input
    const fileInput = await page.locator('input[type="file"]').first();

    if (await fileInput.isVisible().catch(() => false)) {
      await fileInput.setInputFiles(imagePath);
    } else {
      // Try to find a hidden file input and set files directly
      const inputs = page.locator('input[type="file"]');
      const count = await inputs.count();

      if (count > 0) {
        await inputs.first().setInputFiles(imagePath);
      } else {
        throw new Error('Could not find file upload input on the page');
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
      // Check for download button or generated content
      const downloadBtn = page.locator(
        'button:has-text("Download"), button[aria-label*="download" i], a[download]'
      );
      const generatedImage = page.locator('img[src*="generated"], img[src*="blob:"]');

      if (
        (await downloadBtn.count()) > 0 ||
        (await generatedImage.count()) > 0
      ) {
        logger.info('Image generation complete', { action: 'wait_generation' });
        return;
      }

      // Check for errors
      const errorElement = page.locator('[class*="error" i], [role="alert"]');
      if ((await errorElement.count()) > 0) {
        const errorText = await errorElement.first().textContent();
        throw new Error(`Generation failed: ${errorText}`);
      }

      await page.waitForTimeout(3000);
    }

    throw new Error('Image generation timed out');
  }

  async downloadGeneratedImage(page: Page, outputDir: string): Promise<string> {
    logger.info('Downloading generated image...', { action: 'download_image' });

    // Set up download listener
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      // Click download button
      page
        .locator(
          'button:has-text("Download"), button[aria-label*="download" i], a[download]'
        )
        .first()
        .click(),
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
        'button:has-text("Download"), button[aria-label*="download" i], a[download]'
      );

      if (
        (await videoElement.count()) > 0 ||
        (await downloadBtn.count()) > 0
      ) {
        logger.info('Video generation complete', { action: 'wait_video_generation' });
        return;
      }

      // Check for errors
      const errorElement = page.locator('[class*="error" i], [role="alert"]');
      if ((await errorElement.count()) > 0) {
        const errorText = await errorElement.first().textContent();
        throw new Error(`Video generation failed: ${errorText}`);
      }

      await page.waitForTimeout(5000);
    }

    throw new Error('Video generation timed out');
  }

  async downloadGeneratedVideo(page: Page, outputDir: string): Promise<string> {
    logger.info('Downloading generated video...', { action: 'download_video' });

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60000 }),
      page
        .locator(
          'button:has-text("Download"), button[aria-label*="download" i], a[download]'
        )
        .first()
        .click(),
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
