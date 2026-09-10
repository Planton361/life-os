// Bounded ZIP32 STORE writer: no dependencies, compression workers, filesystem or
// arbitrary paths. Fixed DOS epoch makes the package deterministic apart from manifest.
export function zipPackage(
  files: { path: string; content: string }[],
): Uint8Array<ArrayBuffer> {
  if (files.length > 10000) throw new Error("Zu viele Exportdateien.");
  const chunks: Buffer[] = [],
    central: Buffer[] = [];
  const paths = new Set<string>();
  let offset = 0;
  for (const file of files) {
    if (
      /[\p{Cc}<>:"\\|?*]/u.test(file.path) ||
      file.path.startsWith("/") ||
      file.path.split("/").some((p) => p === ".." || !p) ||
      paths.has(file.path)
    )
      throw new Error("Ungültiger Exportpfad.");
    paths.add(file.path);
    const name = Buffer.from(file.path),
      data = Buffer.from(file.content);
    if (offset + data.length > 16 * 1024 * 1024 || name.length > 65535)
      throw new Error("Exportpaket ist zu groß.");
    let crc = 0xffffffff;
    for (const byte of data) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x800, 6);
    local.writeUInt16LE(33, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0x800, 8);
    entry.writeUInt16LE(33, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(data.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt32LE(offset, 42);
    chunks.push(local, name, data);
    central.push(entry, name);
    offset += local.length + name.length + data.length;
  }
  const directory = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...chunks, directory, end]));
}
