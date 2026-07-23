// Provider interface for AI generation services

import type { Page } from 'playwright';

/**
 * Abstract interface that all AI providers must implement.
 * This ensures the automation engine is provider-agnostic.
 */
export interface AIProvider {
  /** Unique provider identifier */
  name: string;

  /** Human-readable provider label */
  displayName: string;

  /** Base URL for the provider */
  baseUrl: string;

  // --- Image Generation ---

  /** Navigate to the image generation page */
  openImageGenerator(page: Page): Promise<void>;

  /** Upload a source image to the provider */
  uploadImage(page: Page, imagePath: string): Promise<void>;

  /** Enter and submit the image generation prompt */
  submitImagePrompt(page: Page, prompt: string): Promise<void>;

  /** Wait until image generation is complete */
  waitForImageGeneration(page: Page, timeout: number): Promise<void>;

  /** Download the generated image */
  downloadGeneratedImage(page: Page, outputDir: string): Promise<string>;

  // --- Video Generation ---

  /** Navigate to the video generation page */
  openVideoGenerator(page: Page): Promise<void>;

  /** Upload the generated image for video creation */
  uploadImageForVideo(page: Page, imagePath: string): Promise<void>;

  /** Enter and submit the video generation prompt */
  submitVideoPrompt(page: Page, prompt: string): Promise<void>;

  /** Wait until video generation is complete */
  waitForVideoGeneration(page: Page, timeout: number): Promise<void>;

  /** Download the generated video */
  downloadGeneratedVideo(page: Page, outputDir: string): Promise<string>;
}
