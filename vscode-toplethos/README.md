# Toplethos VS Code extension

`.tpth_s` opens as Toplethos 1.0 source (`.vul` still does too). Highlighting, brackets, completions, and the 1.0 error checks. `.tpth_aot` and `.tpth_bc` are images, not source, and are not Rust.

No build step. No npm install.

## Install

```bash
mkdir -p ~/.vscode/extensions
ln -sfn "$(pwd)/vscode-toplethos" ~/.vscode/extensions/sera5m.toplethos-1.0.0
```

Command Palette → `Developer: Reload Window`.

## Completions

Suggestions come from names in the file, parameters of the function under the cursor, the 1.0 types (`i32`, `bf16`, `t8`, `rng`, and the rest), and snippets for `fn`, `main`, `object`, `enum`, `namespace`, `match`, and `rng`.

`@` lists the 1.0 attributes. `struct`, `print()`, and `sin()` are not suggested. Those are the old runner.

## Errors

The editor underlines what spec 1.0 already calls a compile error:

- `return` when `out[]` has no type
- `name()` used as a call
- `struct`, `int`, `long`, and `float`
- a statement with no `;`
- an unknown `@`, and `@NoFailTolerance`
- a second function with the same short name in one namespace
- `i32[0]`
- `!` or `&&` on an integer literal
- `@gpuparallel` or `@npuparallel` taking a pointer, string, rng, fn, pool, or pipe

It is not the compiler. It does not check precedence or run `rng`.
