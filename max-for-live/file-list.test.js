"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
function renderer() {
    const draws = [];
    const context = vm.createContext({
        box: { rect: [0, 0, 365, 140] },
        mgraphics: {
            init() {}, redraw() {}, select_font_face() {}, set_font_size() {},
            text_measure: text => [text.length * 6, 11],
            set_source_rgba() {}, rectangle() {}, fill() {}, move_to() {},
            show_text: text => draws.push(["text", text]),
            rectangle_rounded: (...args) => draws.push(["rounded", ...args])
        }
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, "file-list.js"), "utf8"), context);
    return { context, draws };
}
test("file-list hides scrollbars for empty and short lists and uses six-pixel thumbs for overflow", () => {
    const { context: r, draws } = renderer();
    r.paint(); assert.equal(draws.length, 1, "empty panel has no scrollbars");
    r.set(0, 0, "New"); r.set(1, 0, "Dub Project/Set.als");
    assert(!r.metrics().vertical && !r.metrics().horizontal);
    for (let row = 1; row < 25; row++) {
        r.set(0, row, "M"); r.set(1, row, "Long library project/".repeat(8) + row + ".als");
    }
    draws.length = 0; r.paint();
    const m = r.metrics(); assert(m.vertical && m.horizontal);
    const bars = draws.filter(d => d[0] === "rounded").slice(1);
    assert.equal(bars.length, 2);
    assert.equal(bars[0][3], 6); assert.equal(bars[1][4], 6);
    assert(draws.filter(d => d[0] === "text").length < 25 * 2, "only visible rows are drawn");
});
test("file-list drag reaches long paths and all rows, clamps offsets, and preserves position on refresh", () => {
    const { context: r } = renderer();
    for (let row = 0; row < 50; row++) r.set(1, row, "Long folder/".repeat(10) + row + ".als");
    r.paint();
    r.onclick(360, 5); r.ondrag(360, 5000, 1); r.ondrag(360, 5000, 0);
    assert.equal(r.offsetY, r.metrics().maxY);
    r.onclick(5, 137); r.ondrag(5000, 137, 1); r.ondrag(5000, 137, 0);
    assert.equal(r.offsetX, r.metrics().maxX);
    const before = [r.offsetX, r.offsetY];
    r.clear(); for (let row = 0; row < 50; row++) r.set(1, row, "Long folder/".repeat(10) + row + ".als");
    r.paint(); assert.deepEqual([r.offsetX, r.offsetY], before);
    r.onclick(100, 60); r.ondrag(5000, 5000, 1); r.ondrag(5000, 5000, 0);
    assert.equal(r.offsetX, 0); assert.equal(r.offsetY, 0);
    r.clear(); r.paint(); assert(!r.metrics().vertical && !r.metrics().horizontal);
});
