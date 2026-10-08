// Max jsui: paint is the visibility heartbeat, independent of focus or Device On.
// Request redraws cheaply; hidden/offscreen views stop painting. Output on a Task,
// never from the drawing callback, to keep Node messages off the painting stack.
autowatch = 1;
inlets = 1;
outlets = 1;
mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;
var painted = false;
var task = new Task(tick, this);
function paint() { painted = true; }
function tick() {
    outlet(0, "visible", painted ? 1 : 0);
    painted = false;
    mgraphics.redraw();
}
function start() {
    painted = false;
    task.cancel();
    task.interval = 500;
    task.repeat();
    mgraphics.redraw();
}
function notifydeleted() { task.cancel(); }
