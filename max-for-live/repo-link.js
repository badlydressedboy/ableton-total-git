// Max jsui hyperlink. Cursor IDs are t_jmouse_cursortype from the Max SDK:
// https://sdk.cdn.cycling74.com/max-sdk-8.2.0/group__jmouse.html
autowatch = 1;
inlets = 1;
outlets = 1;
mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;
var available = false, hover = false, pressed = false;
var arrowCursor = 1, handCursor = 6;
function enabled(value) {
    available = Number(value) !== 0;
    if (!available) { hover = false; pressed = false; setcursor(arrowCursor); }
    mgraphics.redraw();
}
function inside(x, y) {
    return x >= 0 && y >= 0 && x < box.rect[2] - box.rect[0] && y < box.rect[3] - box.rect[1];
}
function paint() {
    mgraphics.select_font_face("Arial", "normal", "normal");
    mgraphics.set_font_size(12);
    var color = hover ? [0.7, 0.93, 1, 1] : [0.4, 0.8, 1, 1];
    mgraphics.set_source_rgba(color[0], color[1], color[2], color[3]);
    var baseline = (box.rect[3] - box.rect[1]) / 2 + 4;
    mgraphics.move_to(6, baseline);
    mgraphics.show_text("Repo");
    mgraphics.set_line_width(1);
    mgraphics.move_to(6, baseline + 2);
    mgraphics.line_to(6 + mgraphics.text_measure("Repo")[0], baseline + 2);
    mgraphics.stroke();
}
function onidle(x, y) {
    hover = available && inside(x, y);
    setcursor(hover ? handCursor : arrowCursor);
    mgraphics.redraw();
}
function onidleout() {
    hover = false;
    setcursor(arrowCursor);
    mgraphics.redraw();
}
function onclick(x, y) { pressed = available && inside(x, y); onidle(x, y); }
function ondrag(x, y, button) {
    onidle(x, y);
    if (!button) {
        var activate = pressed && available && inside(x, y);
        pressed = false;
        if (activate) outlet(0, "bang");
    }
}
function notifydeleted() { setcursor(arrowCursor); }
