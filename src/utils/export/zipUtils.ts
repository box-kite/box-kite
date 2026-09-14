/**
 * The half of the ZIP format a spreadsheet needs. An `.xlsx` is a ZIP of XML parts, and the format allows
 * an entry to be *stored* rather than deflated — so a workbook can be written with no compressor and no
 * dependency at all. Excel reads a stored archive exactly as it reads a compressed one; the file is
 * larger, and it is XML, so a gzipped download is the same size either way.
 *
 * Every entry carries the same DOS timestamp (1980-01-01, the epoch the format starts at), which is what
 * makes the same table export byte-for-byte the same file twice.
 */
namespace ZipUtils {
  /** One file in the archive: the path it is stored under, and its bytes. */
  export interface Entry {
    name: string;
    data: Uint8Array;
  }

  const LOCAL_HEADER = 0x04034b50;
  const CENTRAL_HEADER = 0x02014b50;
  const END_OF_CENTRAL = 0x06054b50;
  // 2.0 is the version that defines everything used here; nothing needs a later one, since nothing deflates.
  const VERSION = 20;
  const DOS_DATE = 0x0021; // 1980-01-01
  const DOS_TIME = 0;

  let table: Uint32Array | undefined;

  /** The standard CRC-32 table, built on the first export rather than shipped as 1 KB of literals. */
  function crcTable(): Uint32Array {
    if (table) return table;

    table = new Uint32Array(256);

    for (let i = 0; i < 256; i++) {
      let value = i;
      for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      table[i] = value >>> 0;
    }

    return table;
  }

  /** The checksum every ZIP entry carries, in both of its headers. */
  export function crc32(data: Uint8Array): number {
    const lookup = crcTable();
    let crc = 0xffffffff;

    for (let i = 0; i < data.length; i++) crc = lookup[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);

    return (crc ^ 0xffffffff) >>> 0;
  }

  /** A part's text as the bytes it is stored as. Every part of a workbook is UTF-8 XML. */
  export function utf8(text: string): Uint8Array {
    return new TextEncoder().encode(text);
  }

  /** A little-endian writer over one buffer — the byte order every field in the format is written in. */
  class Writer {
    private readonly view: DataView;
    public offset = 0;

    constructor(public readonly bytes: Uint8Array<ArrayBuffer>) {
      this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    }

    public u16(value: number): void {
      this.view.setUint16(this.offset, value, true);
      this.offset += 2;
    }

    public u32(value: number): void {
      this.view.setUint32(this.offset, value >>> 0, true);
      this.offset += 4;
    }

    public raw(data: Uint8Array): void {
      this.bytes.set(data, this.offset);
      this.offset += data.length;
    }
  }

  /**
   * The archive, as one buffer: every entry's local header and bytes, then a central directory repeating
   * those headers with each entry's offset, then the record saying where the directory starts.
   */
  export function zip(entries: Entry[]): Uint8Array<ArrayBuffer> {
    const parts = entries.map((entry) => ({ name: utf8(entry.name), data: entry.data, crc: crc32(entry.data), offset: 0 }));

    const localSize = parts.reduce((size, part) => size + 30 + part.name.length + part.data.length, 0);
    const centralSize = parts.reduce((size, part) => size + 46 + part.name.length, 0);

    const writer = new Writer(new Uint8Array(localSize + centralSize + 22));

    for (const part of parts) {
      part.offset = writer.offset;

      writer.u32(LOCAL_HEADER);
      writer.u16(VERSION);
      writer.u16(0); // no flags: the names here are ASCII, so the UTF-8 bit says nothing
      writer.u16(0); // stored
      writer.u16(DOS_TIME);
      writer.u16(DOS_DATE);
      writer.u32(part.crc);
      writer.u32(part.data.length);
      writer.u32(part.data.length);
      writer.u16(part.name.length);
      writer.u16(0); // no extra field
      writer.raw(part.name);
      writer.raw(part.data);
    }

    const centralOffset = writer.offset;

    for (const part of parts) {
      writer.u32(CENTRAL_HEADER);
      writer.u16(VERSION);
      writer.u16(VERSION);
      writer.u16(0);
      writer.u16(0);
      writer.u16(DOS_TIME);
      writer.u16(DOS_DATE);
      writer.u32(part.crc);
      writer.u32(part.data.length);
      writer.u32(part.data.length);
      writer.u16(part.name.length);
      writer.u16(0); // extra
      writer.u16(0); // comment
      writer.u16(0); // disk
      writer.u16(0); // internal attributes
      writer.u32(0); // external attributes
      writer.u32(part.offset);
      writer.raw(part.name);
    }

    writer.u32(END_OF_CENTRAL);
    writer.u16(0); // this disk
    writer.u16(0); // the disk the directory starts on
    writer.u16(parts.length);
    writer.u16(parts.length);
    writer.u32(centralSize);
    writer.u32(centralOffset);
    writer.u16(0); // no archive comment

    return writer.bytes;
  }
}

export default ZipUtils;
