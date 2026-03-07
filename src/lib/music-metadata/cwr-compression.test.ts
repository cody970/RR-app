import { describe, it, expect } from 'vitest';
import {
  compressCwr,
  decompressCwr,
  isCompressed,
  getCompressionStats,
} from './cwr-compression';

describe('CWR Compression', () => {
  const testContent = `HDRPB123456789ROYALTY RADAR                                  02.202026030712031220260307120312000000000000

GRHNWR0000000102.100000000000  

NWRAA0000000100000000Test Work Title                                    TEST-WORK-12345            T-000000000-0000000000            UNC000000N000000000000000000000000000000000000000000000000000000000000000000000000000000000N

GRHA0000000001  2.10 0000000000  

TRLRA00000001
`.repeat(100);

  describe('compressCwr', () => {
    it('should compress CWR content', async () => {
      const compressed = await compressCwr(testContent);
      expect(compressed).toBeInstanceOf(Buffer);
      expect(compressed.length).toBeLessThan(testContent.length);
    });

    it('should not compress small files', async () => {
      const smallContent = 'HDR...';
      const compressed = await compressCwr(smallContent);
      
      expect(compressed.toString()).toBe(smallContent);
      expect(isCompressed(compressed)).toBe(false);
    });

    it('should respect custom compression level', async () => {
      const compressed1 = await compressCwr(testContent, { level: 1 });
      const compressed2 = await compressCwr(testContent, { level: 9 });
      
      expect(compressed2.length).toBeLessThanOrEqual(compressed1.length);
    });
  });

  describe('decompressCwr', () => {
    it('should decompress CWR content', async () => {
      const compressed = await compressCwr(testContent);
      const decompressed = await decompressCwr(compressed);
      
      expect(decompressed).toBe(testContent);
    });

    it('should handle uncompressed content', async () => {
      const decompressed = await decompressCwr(Buffer.from(testContent));
      
      expect(decompressed).toBe(testContent);
    });
  });

  describe('isCompressed', () => {
    it('should detect compressed content', async () => {
      const compressed = await compressCwr(testContent);
      expect(isCompressed(compressed)).toBe(true);
    });

    it('should detect uncompressed content', () => {
      const buffer = Buffer.from(testContent);
      expect(isCompressed(buffer)).toBe(false);
    });
  });

  describe('getCompressionStats', () => {
    it('should calculate compression statistics', async () => {
      const stats = await getCompressionStats(testContent);
      
      expect(stats.original).toBe(testContent.length);
      expect(stats.compressed).toBeGreaterThanOrEqual(0);
      expect(stats.ratio).toMatch(/.*% reduction/);
    });

    it('should handle zero original size', async () => {
      const stats = await getCompressionStats('');
      
      expect(stats.original).toBe(0);
      expect(stats.compressed).toBe(0);
      expect(stats.ratio).toMatch(/.*% reduction/);
    });
  });
});