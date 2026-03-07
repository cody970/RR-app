/**
 * CWR File Compression
 * 
 * Provides compression utilities for CWR files to reduce file size
 * for large exports and improve transfer speeds.
 */

import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export interface CompressionOptions {
  level?: number; // 1-9 (default: 6)
  threshold?: number; // Minimum file size to compress in bytes (default: 10KB)
}

/**
 * Compress CWR file content using gzip
 */
export async function compressCwr(content: string, options: CompressionOptions = {}): Promise<Buffer> {
  const { level = 6, threshold = 10240 } = options;
  
  // Don't compress small files
  if (content.length < threshold) {
    return Buffer.from(content, 'utf-8');
  }
  
  try {
    const compressed = await gzip(content, { level });
    const ratio = ((1 - compressed.length / content.length) * 100).toFixed(1);
    console.log(`[CWR Compression] ${content.length} -> ${compressed.length} bytes (${ratio}% reduction)`);
    
    return compressed;
  } catch (error) {
    console.error('[CWR Compression] Error:', error);
    // Return original content if compression fails
    return Buffer.from(content, 'utf-8');
  }
}

/**
 * Decompress CWR file content
 */
export async function decompressCwr(content: Buffer): Promise<string> {
  try {
    // Check if content is gzip compressed
    const isGzip = content[0] === 0x1f && content[1] === 0x8b;
    
    if (!isGzip) {
      // Not compressed, return as-is
      return content.toString('utf-8');
    }
    
    const decompressed = await gunzip(content);
    return decompressed.toString('utf-8');
  } catch (error) {
    console.error('[CWR Decompression] Error:', error);
    // Try to return as string if decompression fails
    return content.toString('utf-8');
  }
}

/**
 * Detect if content is gzip compressed
 */
export function isCompressed(content: Buffer): boolean {
  return content[0] === 0x1f && content[1] === 0x8b;
}

/**
 * Compress a CWR file and save it
 */
export async function compressCwrFile(
  inputPath: string,
  outputPath: string,
  options: CompressionOptions = {}
): Promise<void> {
  const fs = await import('fs/promises');
  const content = await fs.readFile(inputPath, 'utf-8');
  const compressed = await compressCwr(content, options);
  await fs.writeFile(outputPath, compressed);
}

/**
 * Decompress a CWR file and save it
 */
export async function decompressCwrFile(
  inputPath: string,
  outputPath: string
): Promise<void> {
  const fs = await import('fs/promises');
  const compressed = await fs.readFile(inputPath);
  const decompressed = await decompressCwr(compressed);
  await fs.writeFile(outputPath, decompressed, 'utf-8');
}

/**
 * Get compression statistics
 */
export async function getCompressionStats(
  originalContent: string
): Promise<{ original: number; compressed: number; ratio: string }> {
  const original = originalContent.length;
  const compressed = await compressCwr(originalContent);
  const ratio = ((1 - compressed.length / original) * 100).toFixed(1);
  
  return {
    original,
    compressed: compressed.length,
    ratio: `${ratio}% reduction`,
  };
}

export interface CompressionStats {
  original: number;
  compressed: number;
  ratio: string;
}