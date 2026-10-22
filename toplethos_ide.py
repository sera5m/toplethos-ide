#!/usr/bin/env python3
"""Toplethos graph IDE. Nodes open in VS Code; this window only draws the graph."""
from __future__ import annotations

import os
import sys
import glob
import shutil
import threading
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
try:
    from bootstrap import ensure_lang
    ensure_lang()
except Exception:
    pass

from graph_markers import parse, Node, Link

if sys.platform.startswith("linux") and "GDK_BACKEND" not in os.environ:
    os.environ["GDK_BACKEND"] = "wayland"

try:
    import gi
    gi.require_version("Gtk", "4.0")
    from gi.repository import Gtk, GLib, Gio
except Exception as e:
    sys.stderr.write(
        "Need GTK4 + PyGObject.\n"
        "  sudo pacman -S python-gobject gtk4\n"
        "%s\n" % e
    )
    sys.exit(1)

try:
    import serial
    from serial.tools import list_ports
except Exception:
    serial = None
    list_ports = None

SOURCE_EXTS = {".tpth_s", ".vul"}
IMAGE_EXTS = {".tpth_aot", ".tpth_bc", ".cvul", ".bvul"}
NODE_W = 168
NODE_H = 76


def ports():
    found = []
    if list_ports:
        found = [p.device for p in list_ports.comports()]
    if not found:
        found = sorted(glob.glob("/dev/ttyACM*") + glob.glob("/dev/ttyUSB*"))
    return found or ["/dev/ttyACM0"]


def find_code() -> str | None:
    for name in ("code", "codium", "code-oss"):
        hit = shutil.which(name)
        if hit:
            return hit
    return None


class App(Gtk.Application):
    def __init__(self):
        super().__init__(application_id="dev.oiria.ToplethosIde",
                         flags=Gio.ApplicationFlags.HANDLES_OPEN)
        self.win = None
        self.log = None
        self.status = None
        self.target = None
        self.port = None
        self.ser = None
        self.file_list = None
        self.dir_label = None
        self.path: str | None = None
        self.canvas = None
        self.nodes: list[Node] = []
        self.links: list[Link] = []
        self.workdir = HERE / "examples" if (HERE / "examples").is_dir() else Path.cwd()

    def do_activate(self):
        if self.win:
            self.win.present()
            return
        self.win = Gtk.ApplicationWindow(application=self, title="Toplethos graph")
        self.win.set_default_size(1100, 720)
        root = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=0)

        rail = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
        rail.set_margin_start(8)
        rail.set_margin_end(6)
        rail.set_margin_top(8)
        rail.set_size_request(200, -1)
        run = Gtk.Button(label="Run")
        run.add_css_class("suggested-action")
        run.connect("clicked", self._run)
        reload_b = Gtk.Button(label="Reload graph")
        reload_b.connect("clicked", lambda *_: self._load_path(self.path) if self.path else None)
        self.target = Gtk.DropDown.new_from_strings(["This PC", "Watch"])
        self.port = Gtk.DropDown.new_from_strings(ports())
        conn = Gtk.Button(label="Connect")
        conn.connect("clicked", self._connect)
        self.status = Gtk.Label(label="click a node to open it in VS Code", xalign=0, wrap=True)
        for w in (run, reload_b, Gtk.Label(label="Target", xalign=0),
                  self.target, Gtk.Label(label="Port", xalign=0), self.port, conn, self.status):
            rail.append(w)
        self.dir_label = Gtk.Label(xalign=0, wrap=True)
        self.dir_label.add_css_class("dim-label")
        folder = Gtk.Button(label="Folder")
        folder.connect("clicked", self._pick_folder)
        rail.append(folder)
        rail.append(self.dir_label)
        self.file_list = Gtk.ListBox()
        self.file_list.connect("row-activated", self._on_file)
        scf = Gtk.ScrolledWindow()
        scf.set_vexpand(True)
        scf.set_child(self.file_list)
        rail.append(scf)
        root.append(rail)

        col = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        col.set_hexpand(True)
        self.canvas = Gtk.DrawingArea()
        self.canvas.set_hexpand(True)
        self.canvas.set_vexpand(True)
        self.canvas.set_draw_func(self._draw)
        click = Gtk.GestureClick()
        click.connect("pressed", self._on_click)
        self.canvas.add_controller(click)
        sc = Gtk.ScrolledWindow()
        sc.set_vexpand(True)
        sc.set_hexpand(True)
        sc.set_child(self.canvas)
        col.append(sc)
        self.log = Gtk.TextView(editable=False, monospace=True)
        lg = Gtk.ScrolledWindow()
        lg.set_min_content_height(140)
        lg.set_child(self.log)
        col.append(lg)
        root.append(col)

        self.win.set_child(root)
        self.win.present()
        self._refresh_files()
        code = find_code()
        self._say("Graph reads //<<<node>>> markers. Click a box to open that range in VS Code.\n")
        if code:
            self._say("editor: %s\n" % code)
        else:
            self._say("VS Code CLI not on PATH. Install visual-studio-code-bin and run 'Shell Command: Install code command in PATH'.\n")

    def _say(self, s):
        self.log.get_buffer().insert(self.log.get_buffer().get_end_iter(), s)

    def _by_id(self, nid: int) -> Node | None:
        for n in self.nodes:
            if n.id == nid:
                return n
        return None

    def _layout(self):
        max_x, max_y = 800, 500
        for i, n in enumerate(self.nodes):
            if n.pos:
                n.x, n.y = n.pos
            else:
                n.x = 28 + (i % 4) * 210
                n.y = 28 + (i // 4) * 130
            max_x = max(max_x, n.x + NODE_W + 40)
            max_y = max(max_y, n.y + NODE_H + 40)
        self.canvas.set_content_width(int(max_x))
        self.canvas.set_content_height(int(max_y))
        self.canvas.queue_draw()

    def _port_xy(self, n: Node, side: str, idx: int) -> tuple[float, float]:
        names = n.outputs if side == "out" else n.inputs
        count = max(1, len(names))
        idx = min(idx, count - 1)
        step = NODE_H / (count + 1)
        y = n.y + step * (idx + 1)
        x = n.x + NODE_W if side == "out" else n.x
        return x, y

    def _draw(self, _area, cr, w, h):
        cr.set_source_rgb(0.11, 0.12, 0.14)
        cr.rectangle(0, 0, w, h)
        cr.fill()
        cr.set_source_rgb(0.55, 0.62, 0.72)
        cr.set_line_width(1.5)
        for lk in self.links:
            a = self._by_id(lk.src)
            b = self._by_id(lk.dst)
            if not a or not b:
                continue
            x0, y0 = self._port_xy(a, lk.src_side, lk.src_idx)
            x1, y1 = self._port_xy(b, lk.dst_side, lk.dst_idx)
            cr.move_to(x0, y0)
            cr.curve_to((x0 + x1) / 2, y0, (x0 + x1) / 2, y1, x1, y1)
            cr.stroke()
        cr.select_font_face("monospace")
        for n in self.nodes:
            cr.set_source_rgb(0.18, 0.20, 0.24)
            cr.rectangle(n.x, n.y, NODE_W, NODE_H)
            cr.fill()
            cr.set_source_rgb(0.48, 0.65, 0.95)
            cr.rectangle(n.x, n.y, NODE_W, NODE_H)
            cr.stroke()
            cr.set_source_rgb(0.93, 0.94, 0.96)
            cr.set_font_size(13)
            cr.move_to(n.x + 10, n.y + 20)
            cr.show_text(n.name[:18])
            cr.set_font_size(10)
            cr.set_source_rgb(0.62, 0.66, 0.72)
            cr.move_to(n.x + 10, n.y + 36)
            cr.show_text("#%d" % n.id)
            cr.set_source_rgb(0.45, 0.85, 0.55)
            for i in range(len(n.inputs)):
                x, y = self._port_xy(n, "in", i)
                cr.arc(x, y, 4, 0, 6.3)
                cr.fill()
            cr.set_source_rgb(0.95, 0.62, 0.35)
            for i in range(len(n.outputs)):
                x, y = self._port_xy(n, "out", i)
                cr.arc(x, y, 4, 0, 6.3)
                cr.fill()

    def _on_click(self, _gesture, _n, x, y):
        for n in reversed(self.nodes):
            if n.x <= x <= n.x + NODE_W and n.y <= y <= n.y + NODE_H:
                self._open_vscode(n)
                return

    def _open_vscode(self, n: Node):
        if not self.path:
            self._say("no file\n")
            return
        code = find_code()
        if not code:
            self._say("code CLI missing. Install visual-studio-code-bin, then 'Shell Command: Install code command in PATH'.\n")
            return
        target = "%s:%d:1" % (self.path, n.start)
        subprocess.Popen([code, "-g", target, self.path],
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        self._say("opened %s at line %d (%s)\n" % (Path(self.path).name, n.start, n.name))

    def _load_path(self, path: str | None):
        if not path:
            return
        text = Path(path).read_text(encoding="utf-8")
        self.path = path
        self.nodes, self.links = parse(text)
        self._layout()
        self.status.set_text("%d nodes, %d links" % (len(self.nodes), len(self.links)))
        if not self.nodes:
            self._say("%s has no //<<<node>>> markers\n" % path)
        else:
            self._say("loaded %s\n" % path)

    def _refresh_files(self):
        while True:
            row = self.file_list.get_row_at_index(0)
            if not row:
                break
            self.file_list.remove(row)
        self.dir_label.set_text(str(self.workdir))
        if not self.workdir.is_dir():
            return
        for p in sorted(self.workdir.iterdir()):
            if p.suffix.lower() in SOURCE_EXTS or p.suffix.lower() in IMAGE_EXTS or p.suffix.lower() in {".md", ".txt"}:
                lab = Gtk.Label(label=p.name, xalign=0)
                lab.path = str(p)
                self.file_list.append(lab)

    def _on_file(self, _lb, row):
        child = row.get_child()
        path = getattr(child, "path", None)
        if path and Path(path).suffix.lower() in IMAGE_EXTS:
            self._say("%s is an image, not source\n" % path)
            return
        if path and Path(path).suffix.lower() in SOURCE_EXTS:
            self._load_path(path)

    def _pick_folder(self, *_):
        dlg = Gtk.FileDialog(title="Project folder")

        def done(d, res):
            try:
                f = d.select_folder_finish(res)
                self.workdir = Path(f.get_path())
                self._refresh_files()
            except Exception:
                pass
        dlg.select_folder(self.win, None, done)

    def _run(self, *_):
        if not self.path:
            self._say("open a .tpth_s first\n")
            return
        src = Path(self.path).read_text(encoding="utf-8")
        if self.target.get_selected() == 1:
            self._watch(src)
            return

        def work():
            rsvm = shutil.which("rsvm")
            if rsvm:
                import tempfile
                f = tempfile.NamedTemporaryFile("w", suffix=".tpth_s", delete=False)
                f.write(src)
                f.close()
                pr = subprocess.run([rsvm, f.name], capture_output=True, text=True)
                out = (pr.stdout or "") + (pr.stderr or "")
                tag = "[rsvm]" if pr.returncode == 0 else "[rsvm failed]"
                GLib.idle_add(self._say, tag + "\n" + out + "\n")
                if pr.returncode == 0:
                    return
            try:
                from toplethos_run import run_source
                out = run_source(src, self.path)
                GLib.idle_add(self._say, "[run]\n" + out + "\n")
            except Exception as e:
                GLib.idle_add(self._say, "[err] %s\n" % e)

        threading.Thread(target=work, daemon=True).start()

    def _connect(self, *_):
        if serial is None:
            self._say("install python-pyserial\n")
            return
        name = self.port.get_selected_item()
        dev = name.get_string() if name else "/dev/ttyACM0"
        try:
            if self.ser:
                self.ser.close()
            self.ser = serial.Serial(dev, 115200, timeout=0.05)
            self.status.set_text("connected " + dev)
            self._say("connected %s\n" % dev)
        except Exception as e:
            self._say(str(e) + "\n")

    def _watch(self, src):
        if not self.ser:
            self._say("Connect first\n")
            return
        self.ser.write(("clear\n<<VUL\n" + src.strip() + "\nVUL>>\n").encode())
        self._say("sent to watch\n")


if __name__ == "__main__":
    App().run(sys.argv)
