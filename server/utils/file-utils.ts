import fs from 'fs';
import path from 'path';

/**
 * Ensure a directory exists, creating it recursively if needed
 */
export function ensureDir(dirPath: string): void {
  const resolved = path.resolve(process.cwd(), dirPath);
  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true });
  }
}

/**
 * Check if a file is a supported image format
 */
export function isSupportedImage(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif'].includes(ext);
}

/**
 * Generate a unique filename to avoid conflicts
 */
export function generateUniqueFilename(
  dir: string,
  baseName: string,
  ext: string
): string {
  let filename = `${baseName}${ext}`;
  let filePath = path.join(dir, filename);
  let counter = 1;

  while (fs.existsSync(filePath)) {
    filename = `${baseName}_${counter}${ext}`;
    filePath = path.join(dir, filename);
    counter++;
  }

  return filePath;
}

/**
 * Move a file from source to destination
 */
export async function moveFile(src: string, dest: string): Promise<void> {
  const destDir = path.dirname(dest);
  ensureDir(destDir);

  try {
    // Try rename first (faster, same filesystem)
    fs.renameSync(src, dest);
  } catch {
    // Fall back to copy + delete (cross-filesystem)
    fs.copyFileSync(src, dest);
    fs.unlinkSync(src);
  }
}

/**
 * Copy a file from source to destination
 */
export async function copyFile(src: string, dest: string): Promise<void> {
  const destDir = path.dirname(dest);
  ensureDir(destDir);
  fs.copyFileSync(src, dest);
}

/**
 * Get file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * List all image files in a directory
 */
export function listImageFiles(dir: string): string[] {
  const resolved = path.resolve(process.cwd(), dir);
  if (!fs.existsSync(resolved)) return [];

  return fs
    .readdirSync(resolved)
    .filter((file) => isSupportedImage(file))
    .map((file) => path.join(resolved, file));
}

/**
 * Resolve a path that could be relative or absolute
 */
export function resolvePath(inputPath: string): string {
  if (path.isAbsolute(inputPath)) return inputPath;
  return path.resolve(process.cwd(), inputPath);
}
