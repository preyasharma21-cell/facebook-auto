import { exec, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { ProcessingPreset } from '@/types';
import { logEvent } from '@/lib/logger';

const execAsync = promisify(exec);

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  resolution: string;
  aspectRatio: string;
  sizeBytes: number;
}

export class MediaProcessor {
  private ffmpegPath: string = 'ffmpeg';

  constructor() {
    // Default to system PATH ffmpeg
  }

  async isAvailable(): Promise<boolean> {
    try {
      await execAsync(`${this.ffmpegPath} -version`);
      return true;
    } catch {
      return false;
    }
  }

  async generateThumbnail(videoPath: string, outputPath: string, atSecond: number = 1): Promise<string> {
    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const cmd = `"${this.ffmpegPath}" -y -ss ${atSecond} -i "${videoPath}" -vframes 1 -q:v 2 "${outputPath}"`;
    try {
      await execAsync(cmd);
      return outputPath;
    } catch (err: any) {
      logEvent('WARNING', 'FFMPEG', `Thumbnail extraction failed for ${path.basename(videoPath)}: ${err.message}`);
      return '';
    }
  }

  async processPreset(
    inputPath: string,
    outputPath: string,
    preset: ProcessingPreset,
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; outputPath: string; error?: string }> {
    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    logEvent('INFO', 'FFMPEG', `Starting video processing with preset "${preset.name}" (${preset.resolution}, ${preset.aspectRatio})`);

    // Parse target resolution: e.g., '1080x1920' -> width 1080, height 1920
    const [w, h] = preset.resolution.split('x');
    const scaleFilter = `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`;

    const args = [
      '-y',
      '-i', inputPath,
      '-vf', scaleFilter,
      '-r', String(preset.fps || 30),
      '-b:v', preset.videoBitrate || '4500k',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-b:a', preset.audioBitrate || '192k',
      '-c:a', 'aac',
      '-movflags', '+faststart',
      outputPath
    ];

    return new Promise((resolve) => {
      const proc = spawn(this.ffmpegPath, args);

      proc.on('close', (code) => {
        if (code === 0) {
          logEvent('SUCCESS', 'FFMPEG', `Video processed successfully: ${path.basename(outputPath)}`);
          resolve({ success: true, outputPath });
        } else {
          const err = `FFmpeg process exited with code ${code}`;
          logEvent('ERROR', 'FFMPEG', err);
          resolve({ success: false, outputPath, error: err });
        }
      });

      proc.on('error', (err) => {
        logEvent('ERROR', 'FFMPEG', `FFmpeg execution error: ${err.message}`);
        resolve({ success: false, outputPath, error: err.message });
      });
    });
  }
}

export const mediaProcessor = new MediaProcessor();
