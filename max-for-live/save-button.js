// Restore Max's arrow when an operation ends without waiting for mouse movement.
// https://docs.cycling74.com/apiref/js/jsthis/#setcursor
autowatch = 1;
inlets = 1;
outlets = 2;
mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;
var idle = true, changed = false, available = false, pressed = false, hover = false;
function modified(value) {
    changed = Number(value) !== 0;
    available = idle && changed;
    pressed = false;
    mgraphics.redraw();
}
function resetcursor() {
    // Max caches the previous cursor: repeating arrow alone can do nothing
    // after Live changes the system cursor while handling Save.
    // https://sdk.cdn.cycling74.com/max-sdk-8.2.0/group__misc.html
    setcursor(0);
    setcursor(1);
    mgraphics.redraw();
}
function inside(x, y) { return x >= 0 && y >= 0 && x < box.rect[2] - box.rect[0] && y < box.rect[3] - box.rect[1]; }
function active(value) {
    idle = Number(value) !== 0;
    available = idle && changed;
    pressed = false;
    setcursor(1);
    mgraphics.redraw();
}
function paint() {
    var width = box.rect[2] - box.rect[0], height = box.rect[3] - box.rect[1];
    var shade = pressed ? 0.27 : hover && available ? 0.37 : 0.32;
    mgraphics.set_source_rgba(shade, shade, shade, 1);
    mgraphics.rectangle(0, 0, width, height); mgraphics.fill();
    mgraphics.select_font_face("Arial", "normal", "normal"); mgraphics.set_font_size(12);
    var foreground = available ? 0.9 : 0.55;
    mgraphics.set_source_rgba(foreground, foreground, foreground, 1);
    mgraphics.move_to((width - mgraphics.text_measure("Save Live Set")[0]) / 2, height / 2 + 4);
    mgraphics.show_text("Save Live Set");
}
function onidle(x, y) { hover = inside(x, y); setcursor(1); mgraphics.redraw(); }
function onidleout() { hover = false; setcursor(1); mgraphics.redraw(); }
function onclick(x, y) { pressed = available && inside(x, y); onidle(x, y); }
function ondrag(x, y, button) {
    onidle(x, y);
    if (!button) {
        var activate = pressed && available && inside(x, y);
        pressed = false; mgraphics.redraw();
        if (activate) outlet(1, "bang");
    }
}
