"use strict";
const fs = require("fs");
const path = require("path");

// Retain the Audio Effect container and project metadata saved by Max.
// Frozen devices have a different payload and are deliberately rejected.
function buildDevice(template, source, destination) {
    const container = fs.readFileSync(template);
    if (container.subarray(0, 4).toString() !== "ampf" || container.readUInt32LE(4) !== 4 || container.subarray(8, 12).toString() !== "aaaa")
        throw new Error("Expected a Max-saved Audio Effect device template.");
    const chunks = [];
    let offset = 0, found = false;
    while (offset < container.length) {
        if (offset + 8 > container.length) throw new Error("Truncated device chunk.");
        const size = container.readUInt32LE(offset + 4), end = offset + 8 + size;
        if (end > container.length) throw new Error("Invalid device chunk length.");
        if (container.subarray(offset, offset + 4).toString() === "ptch") {
            if (found) throw new Error("Multiple device patches are unsupported.");
            const payload = container.subarray(offset + 8, end);
            const saved = JSON.parse(payload.toString("utf8").replace(/\0$/, ""));
            const updated = JSON.parse(fs.readFileSync(source, "utf8"));
            updated.patcher = { ...saved.patcher, ...updated.patcher, openrect: [0, 0, updated.patcher.devicewidth, 169] };
            const json = Buffer.from(JSON.stringify(updated, null, 2) + "\n\0", "utf8");
            const header = Buffer.from(container.subarray(offset, offset + 8)); header.writeUInt32LE(json.length, 4);
            chunks.push(header, json); found = true;
        } else chunks.push(container.subarray(offset, end));
        offset = end;
    }
    if (!found) throw new Error("No editable patch in device template.");
    fs.writeFileSync(destination, Buffer.concat(chunks));
}

if (require.main === module) {
    require("./build-patch");
    buildDevice(path.join(__dirname, "device-template.amxd"), path.join(__dirname, "Ableton Total Git.maxpat"), path.join(__dirname, "Ableton Total Git.amxd"));
}
module.exports = { buildDevice };
