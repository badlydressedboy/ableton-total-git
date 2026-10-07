"use strict";
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const table = Array.from({ length: 256 }, (_, index) => {
    let crc = index;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    return crc >>> 0;
});
function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = (crc >>> 8) ^ table[(crc ^ byte) & 255];
    return (crc ^ 0xffffffff) >>> 0;
}

// ZIP Unix modes preserve the macOS apphost executable bit even when built on Windows.
function archive(directory, filename) {
    const local = [], central = [];
    let offset = 0, count = 0;
    function visit(relative) {
        for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
            const name = relative ? relative + "/" + entry.name : entry.name;
            if (entry.isDirectory()) { visit(name); continue; }
            if (!entry.isFile()) throw new Error("Unsupported archive entry: " + name);
            const bytes = fs.readFileSync(path.join(directory, name)), compressed = zlib.deflateRawSync(bytes);
            const encoded = Buffer.from(name, "utf8"), crc = crc32(bytes);
            const header = Buffer.alloc(30);
            header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x800, 6);
            header.writeUInt16LE(8, 8); header.writeUInt16LE(0x21, 12); header.writeUInt32LE(crc, 14);
            header.writeUInt32LE(compressed.length, 18); header.writeUInt32LE(bytes.length, 22); header.writeUInt16LE(encoded.length, 26);
            const record = Buffer.alloc(46);
            record.writeUInt32LE(0x02014b50); record.writeUInt16LE(0x314, 4); header.copy(record, 6, 4, 30);
            const mode = name === "companion/AbletonGit.Api" ? 0o100755 : 0o100644;
            record.writeUInt32LE((mode * 65536) >>> 0, 38); record.writeUInt32LE(offset, 42);
            local.push(header, encoded, compressed); central.push(record, encoded);
            offset += header.length + encoded.length + compressed.length; count++;
        }
    }
    visit("");
    const directorySize = central.reduce((sum, block) => sum + block.length, 0);
    if (count > 65535 || offset + directorySize > 0xffffffff) throw new Error("Package exceeds ZIP32 limits.");
    const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50);
    end.writeUInt16LE(count, 8); end.writeUInt16LE(count, 10);
    end.writeUInt32LE(directorySize, 12); end.writeUInt32LE(offset, 16);
    fs.writeFileSync(filename, Buffer.concat([...local, ...central, end]));
}
module.exports = { archive };
