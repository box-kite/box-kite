import { describe, expect, it } from 'vitest';
import ZipUtils from './zipUtils';

const entry = (name: string, text: string): ZipUtils.Entry => ({ name, data: ZipUtils.utf8(text) });

/** One little-endian field out of the archive, so a header can be read back the way a reader reads it. */
const u32 = (bytes: Uint8Array, offset: number) => new DataView(bytes.buffer).getUint32(offset, true);
const u16 = (bytes: Uint8Array, offset: number) => new DataView(bytes.buffer).getUint16(offset, true);

describe('ZipUtils', () => {
  describe('the checksum', () => {
    // The published CRC-32 check values: the algorithm is only right if it agrees with everybody else's.
    it('agrees with the standard vectors', () => {
      expect(ZipUtils.crc32(ZipUtils.utf8(''))).toBe(0);
      expect(ZipUtils.crc32(ZipUtils.utf8('a'))).toBe(0xe8b7be43);
      expect(ZipUtils.crc32(ZipUtils.utf8('123456789'))).toBe(0xcbf43926);
    });
  });

  describe('the archive', () => {
    const archive = () => ZipUtils.zip([entry('a.txt', 'hello'), entry('dir/b.txt', 'world')]);

    it('starts with a local header and ends with the record naming the directory', () => {
      const bytes = archive();

      expect(u32(bytes, 0)).toBe(0x04034b50);
      expect(u32(bytes, bytes.length - 22)).toBe(0x06054b50);
      expect(u16(bytes, bytes.length - 12)).toBe(2);
    });

    it('points the end record at a central directory that is really there', () => {
      const bytes = archive();
      const offset = u32(bytes, bytes.length - 6);
      const size = u32(bytes, bytes.length - 10);

      expect(u32(bytes, offset)).toBe(0x02014b50);
      expect(offset + size).toBe(bytes.length - 22);
    });

    it('stores its entries, so the bytes are readable in the archive as it stands', () => {
      expect(new TextDecoder().decode(archive())).toContain('hello');
    });

    it('is byte-for-byte the same twice — nothing in it is stamped with the time', () => {
      expect(archive()).toEqual(archive());
    });

    it('is a valid empty archive when there is nothing in it', () => {
      const bytes = ZipUtils.zip([]);

      expect(bytes).toHaveLength(22);
      expect(u32(bytes, 0)).toBe(0x06054b50);
    });
  });
});
