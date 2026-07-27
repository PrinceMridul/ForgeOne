import { crc32 } from 'zlib';

export interface ZipEntry {
  path: string;
  content: string | Buffer;
}

/**
 * Creates a valid PKZip archive Buffer from an array of file entries.
 * Uses STORE (uncompressed) format for high performance and zero external dependencies.
 */
export function createZipArchive(entries: ZipEntry[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];

  let offset = 0;

  for (const entry of entries) {
    // Sanitize path (strip leading slash)
    const sanitizedPath = entry.path.replace(/^\/+/, '');
    const filenameBuf = Buffer.from(sanitizedPath, 'utf-8');
    const contentBuf = Buffer.isBuffer(entry.content)
      ? entry.content
      : Buffer.from(entry.content, 'utf-8');

    const crc = crc32(contentBuf);
    const size = contentBuf.length;
    const dosTime = 0x0000;
    const dosDate = 0x0021; // Jan 1, 1980 (minimum valid DOS date)

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30 + filenameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local header signature
    localHeader.writeUInt16LE(20, 4); // Version needed (2.0)
    localHeader.writeUInt16LE(0, 6); // General purpose flags
    localHeader.writeUInt16LE(0, 8); // Compression: STORE (0)
    localHeader.writeUInt16LE(dosTime, 10); // Mod time
    localHeader.writeUInt16LE(dosDate, 12); // Mod date
    localHeader.writeUInt32LE(crc, 14); // CRC32
    localHeader.writeUInt32LE(size, 18); // Compressed size
    localHeader.writeUInt32LE(size, 22); // Uncompressed size
    localHeader.writeUInt16LE(filenameBuf.length, 26); // Filename length
    localHeader.writeUInt16LE(0, 28); // Extra field length
    filenameBuf.copy(localHeader, 30);

    localHeaders.push(localHeader, contentBuf);

    // Central directory header (46 bytes + filename)
    const cdHeader = Buffer.alloc(46 + filenameBuf.length);
    cdHeader.writeUInt32LE(0x02014b50, 0); // Central directory signature
    cdHeader.writeUInt16LE(20, 4); // Version made by (2.0)
    cdHeader.writeUInt16LE(20, 6); // Version needed (2.0)
    cdHeader.writeUInt16LE(0, 8); // Flags
    cdHeader.writeUInt16LE(0, 10); // Compression: STORE
    cdHeader.writeUInt16LE(dosTime, 12); // Mod time
    cdHeader.writeUInt16LE(dosDate, 14); // Mod date
    cdHeader.writeUInt32LE(crc, 16); // CRC32
    cdHeader.writeUInt32LE(size, 20); // Compressed size
    cdHeader.writeUInt32LE(size, 24); // Uncompressed size
    cdHeader.writeUInt16LE(filenameBuf.length, 28); // Filename length
    cdHeader.writeUInt16LE(0, 30); // Extra field length
    cdHeader.writeUInt16LE(0, 32); // Comment length
    cdHeader.writeUInt16LE(0, 34); // Disk number start
    cdHeader.writeUInt16LE(0, 36); // Internal attributes
    cdHeader.writeUInt32LE(0, 38); // External attributes
    cdHeader.writeUInt32LE(offset, 42); // Local header relative offset
    filenameBuf.copy(cdHeader, 46);

    centralHeaders.push(cdHeader);

    offset += localHeader.length + contentBuf.length;
  }

  const centralDirOffset = offset;
  const centralDirSize = centralHeaders.reduce((acc, h) => acc + h.length, 0);

  // End of Central Directory Record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(0, 4); // Disk number
  eocd.writeUInt16LE(0, 6); // Start disk
  eocd.writeUInt16LE(entries.length, 8); // Entries on this disk
  eocd.writeUInt16LE(entries.length, 10); // Total entries
  eocd.writeUInt32LE(centralDirSize, 12); // Central dir size
  eocd.writeUInt32LE(centralDirOffset, 16); // Central dir offset
  eocd.writeUInt16LE(0, 20); // Comment length

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}
