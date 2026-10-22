# Graph editor

The file on disk stays normal Toplethos. The graph is a view of whole-line marker comments wrapped around real code. A human or an LLM can ignore the markers and still read the function. The compiler ignores them because they are comments.

Do not put the only copy of a function inside a comment. Markers surround code. They are not the code.

## Markers

Every marker is one line. It starts with `//<<<` and ends with `>>>`.

```
//<<<node id=3453 name="foo" pos=120,40>>>
fn foo in [a, b] out [c] {
    // body
}
//<<<end id=3453>>>

//<<<link from=3453.out0 to=549.in0>>>
```

| marker | fields | meaning |
|---|---|---|
| `node` | `id` `name` `pos` | one box. `pos` is `x,y` in the graph view only |
| `end` | `id` | closes the node opened above. Body is the lines between |
| `link` | `from` `to` | `nodeId.port` to `nodeId.port`. Ports are `in0`, `in1`, `out0` … in source order |

Rules:

- `id` is a stable integer. Never reuse a deleted id in the same file.
- `name` is a label. Links use ids, not names.
- `pos` is editor metadata. The compiler must not read it. Missing `pos` means "place automatically".
- The body between `node` and `end` is ordinary source, indented however the function wants.
- A node body may contain normal `//` comments. It must not contain a line that starts with `//<<<`.
- One node, one function. Control-flow edges are `link` lines, not hidden in the body.

## What the view shows

Boxes with the node name, input ports on the left, output ports on the right, and the `link` edges between them. Nothing else. No body text on the canvas.

Click a box: open the source range in a text editor (GTK SourceView tile, or a VS Code tab via `showTextDocument` on that line range). Edits go to the file. The canvas re-reads markers on save.

## Where it lives

Prefer a VS Code extension over growing `toplethos_ide.py` into a second editor.

- Text, git, search, and LLM edits already work in VS Code.
- The extension adds one custom editor: parse markers, draw boxes, write `link` / `pos` lines back.
- The existing GTK IDE can stay a runner (`python3 toplethos_ide.py`) until the extension can launch `rsvm`.

GTK-only fallback, if VS Code is refused: `gtksourceview5` tile beside a `Gtk.DrawingArea`. Same markers. Do not invent a second syntax for that path.
