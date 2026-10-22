# Toplethos VS Code extension

`.vul` opens as a normal code file. Highlighting, brackets, indent, and completions. The graph window is separate; this is the text editor.

No build step. No npm install.

## Install

```bash
mkdir -p ~/.vscode/extensions
ln -sfn "$(pwd)/vscode-toplethos" ~/.vscode/extensions/sera5m.toplethos-0.1.0
```

Command Palette → `Developer: Reload Window`.

## Completions

As you type, suggestions come from:

- syntax templates: `fn`, `if`, `do n[]`, `struct`, `include`, `native`, `print`, `arr_new`, `sin`
- names already in this file: functions, `i32`/`f32` bindings, struct names
- parameters of the function the cursor is inside
- `@memory_hard`, `@parallel`, `@latex_internal`, `@sig_gen_graph_preview` after `@`

Ctrl+Space opens the list if it did not. Tab fills a snippet.

The graph IDE still opens a node with `code -g file:line`. That lands in this same editor.
