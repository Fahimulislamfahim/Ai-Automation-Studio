// Settings types

export interface AppSettings {
  // General
  inputFolder: string;
  outputFolder: string;
  videoFolder: string;
  downloadFolder: string;
  completedFolder: string;
  failedFolder: string;

  // Browser
  browserType: 'chromium' | 'firefox' | 'webkit';
  headless: boolean;
  slowMotion: number;
  autoRestartBrowser: boolean;

  // Prompts
  imagePrompt: string;
  videoPrompt: string;

  // Queue
  maxConcurrentJobs: number;
  retryAttempts: number;
  retryDelay: number; // ms
  jobTimeout: number; // ms

  // Downloads
  autoRename: boolean;
  overwriteExisting: boolean;
  keepOriginalFile: boolean;
  deleteTemporaryFiles: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  inputFolder: './data/input',
  outputFolder: './data/generated-images',
  videoFolder: './data/generated-videos',
  downloadFolder: './data/downloads',
  completedFolder: './data/completed',
  failedFolder: './data/failed',

  browserType: 'chromium',
  headless: false,
  slowMotion: 0,
  autoRestartBrowser: true,

  imagePrompt:
    'Transform this image into a cinematic ultra-realistic version while preserving the original composition, subject identity, lighting direction, and overall mood. Enhance details, textures, depth, and professional color grading.',
  videoPrompt:
    'Create a smooth cinematic animation based on the generated image. Add realistic camera movement, subtle environmental motion, dynamic lighting, and natural depth while preserving the original composition.',

  maxConcurrentJobs: 1,
  retryAttempts: 3,
  retryDelay: 5000,
  jobTimeout: 300000, // 5 minutes

  autoRename: true,
  overwriteExisting: false,
  keepOriginalFile: true,
  deleteTemporaryFiles: true,
};
