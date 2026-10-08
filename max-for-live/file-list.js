// Read-only Max jsui list. Keeps the cellblock message protocol used by the client.
autowatch = 1;
inlets = 1;
outlets = 0;
mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;
var cells = [], offsetX = 0, offsetY = 0, hover = "", drag = null;
var rowHeight = 14, padding = 6, stateWidth = 39;
var measuredWidth = 0, widthDirty = true;
function clear() { cells = []; widthDirty = true; mgraphics.redraw(); }
function rows() { mgraphics.redraw(); }
function col() { /* Column sizing is measured from actual text, avoiding empty scrollbars. */ }
function bgcolor() {}
function fgcolor() {}
function textcolor() {}
function set(column, row) {
    if (row < 0 || column < 0 || column > 1) return;
    if (!cells[row]) cells[row] = ["", ""];
    cells[row][column] = Array.prototype.slice.call(arguments, 2).join(" ");
    if (column === 1) widthDirty = true;
    mgraphics.redraw();
}
function metrics(measure) {
    var w = box.rect[2] - box.rect[0], h = box.rect[3] - box.rect[1];
    var count = cells.length;
    // Measure only in the drawing context and cache it during mouse interaction.
    if (measure && widthDirty) {
        measuredWidth = 0;
        for (var i = 0; i < count; i++) if (cells[i])
            measuredWidth = Math.max(measuredWidth, padding * 2 + stateWidth + mgraphics.text_measure(cells[i][1])[0]);
        widthDirty = false;
    }
    var contentW = measuredWidth;
    var contentH = count ? padding * 2 + count * rowHeight : 0;
    var vertical = contentH > h, horizontal = contentW > w - (vertical ? 12 : 0);
    vertical = contentH > h - (horizontal ? 12 : 0);
    horizontal = contentW > w - (vertical ? 12 : 0);
    var viewW = w - (vertical ? 12 : 0), viewH = h - (horizontal ? 12 : 0);
    var maxX = Math.max(0, contentW - viewW), maxY = Math.max(0, contentH - viewH);
    offsetX = Math.max(0, Math.min(maxX, offsetX));
    offsetY = Math.max(0, Math.min(maxY, offsetY));
    var vLength = Math.max(22, (viewH - 8) * viewH / Math.max(viewH, contentH));
    var hLength = Math.max(22, (viewW - 8) * viewW / Math.max(viewW, contentW));
    vLength = Math.min(viewH - 8, vLength); hLength = Math.min(viewW - 8, hLength);
    return { w: w, h: h, viewW: viewW, viewH: viewH, maxX: maxX, maxY: maxY,
        vertical: vertical, horizontal: horizontal,
        vLength: vLength, hLength: hLength,
        vTravel: viewH - 8 - vLength, hTravel: viewW - 8 - hLength,
        vStart: 4 + (maxY ? offsetY / maxY * (viewH - 8 - vLength) : 0),
        hStart: 4 + (maxX ? offsetX / maxX * (viewW - 8 - hLength) : 0) };
}
function rounded(x, y, w, h, color) {
    mgraphics.set_source_rgba(color[0], color[1], color[2], color[3]);
    mgraphics.rectangle_rounded(x, y, w, h, 6, 6); mgraphics.fill();
}
function paint() {
    mgraphics.select_font_face("Arial"); mgraphics.set_font_size(11);
    var m = metrics(true);
    rounded(0, 0, m.w, m.h, [0.12, 0.12, 0.12, 1]);
    var first = Math.max(0, Math.floor((offsetY - padding) / rowHeight));
    var last = Math.min(cells.length, Math.ceil((offsetY + m.viewH) / rowHeight));
    for (var i = first; i < last; i++) {
        if (!cells[i]) continue;
        var y = padding + i * rowHeight + 11 - offsetY;
        mgraphics.set_source_rgba(0.63, 0.7, 0.72, 1);
        mgraphics.move_to(padding - offsetX, y); mgraphics.show_text(cells[i][0]);
        mgraphics.set_source_rgba(0.94, 0.94, 0.94, 1);
        mgraphics.move_to(padding + stateWidth - offsetX, y); mgraphics.show_text(cells[i][1]);
    }
    // Max clips drawing to the object. Mask the scrollbar lanes after drawing text;
    // the legacy jsui MGraphics API has no documented clip() method.
    mgraphics.set_source_rgba(0.12, 0.12, 0.12, 1);
    if (m.vertical) { mgraphics.rectangle(m.viewW, 0, 12, m.h); mgraphics.fill(); }
    if (m.horizontal) { mgraphics.rectangle(0, m.viewH, m.w, 12); mgraphics.fill(); }
    var normal = [0.39, 0.43, 0.45, 1], active = [0.53, 0.73, 0.76, 1];
    if (m.vertical) rounded(m.w - 9, m.vStart, 6, m.vLength, hover === "v" || drag && drag.axis === "v" ? active : normal);
    if (m.horizontal) rounded(m.hStart, m.h - 9, m.hLength, 6, hover === "h" || drag && drag.axis === "h" ? active : normal);
}
function axisAt(x, y, m) {
    if (m.vertical && x >= m.viewW && y < m.viewH) return "v";
    if (m.horizontal && y >= m.viewH && x < m.viewW) return "h";
    return "";
}
function onclick(x, y) {
    var m = metrics(), axis = axisAt(x, y, m);
    if (axis === "v") {
        if (y < m.vStart || y > m.vStart + m.vLength)
            offsetY = m.vTravel ? (y - 4 - m.vLength / 2) / m.vTravel * m.maxY : 0;
    } else if (axis === "h") {
        if (x < m.hStart || x > m.hStart + m.hLength)
            offsetX = m.hTravel ? (x - 4 - m.hLength / 2) / m.hTravel * m.maxX : 0;
    }
    metrics(); drag = { axis: axis || "content", x: x, y: y, offsetX: offsetX, offsetY: offsetY };
    mgraphics.redraw();
}
function ondrag(x, y, button) {
    if (!drag) return;
    if (!button) { drag = null; mgraphics.redraw(); return; }
    var m = metrics();
    if (drag.axis === "v") offsetY = drag.offsetY + (y - drag.y) * m.maxY / Math.max(1, m.vTravel);
    else if (drag.axis === "h") offsetX = drag.offsetX + (x - drag.x) * m.maxX / Math.max(1, m.hTravel);
    else { offsetX = drag.offsetX - (x - drag.x); offsetY = drag.offsetY - (y - drag.y); }
    metrics(); mgraphics.redraw();
}
function onidle(x, y) { var next = axisAt(x, y, metrics()); if (hover !== next) { hover = next; mgraphics.redraw(); } }
function onidleout() { hover = ""; mgraphics.redraw(); }
function onresize() { metrics(); mgraphics.redraw(); }
