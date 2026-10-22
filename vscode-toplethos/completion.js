"use strict";

const TYPES = ["i32", "f32", "bool", "string", "int", "float"];
const ATTRS = ["memory_hard", "parallel", "latex_internal", "sig_gen_graph_preview"];

const SNIPPETS = [
  ["fn", "fn ${1:name} in[${2:a}] out[${3}] {\n\treturn ${4:0};\n}", "function"],
  ["if", "if[${1:cond}] {\n\t${2}\n}", "if"],
  ["ifelse", "if[${1:cond}] {\n\t${2}\n} else {\n\t${3}\n}", "if / else"],
  ["do", "do n[${1:n}] {\n\t${2}\n}", "counted loop"],
  ["struct", "struct ${1:Name} {\n\ti32 ${2:field};\n}", "struct"],
  ["include", "include \"${1:file.vul}\";", "include"],
  ["import", "import \"${1:file.vul}\";", "import"],
  ["print", "print(${1});", "print"],
  ["native", "native(\"${1:name}\"${2})", "native call"],
  ["native_seq", "native_seq(\n\tnative(\"${1:wave}\", ${2:1})\n)", "packed native burst"],
  ["py", "py(\"${1:math.sqrt}\", ${2})", "python call"],
  ["ccall", "ccall(\"${1:name}\", ${2})", "c call"],
  ["arr_new", "arr_new(${1:n}) = ${2:name};", "new array"],
  ["i32", "i32 ${1:name} = ${2:0};", "i32 binding"],
  ["f32", "f32 ${1:name} = ${2:0};", "f32 binding"],
  ["bool", "bool ${1:name} = ${2:false};", "bool binding"],
  ["return", "return ${1:0};", "return"],
  ["sin", "sin(${1:90})", "degrees, LUT"],
  ["cos", "cos(${1:0})", "degrees, LUT"],
  ["tan", "tan(${1:0})", "degrees, LUT"],
  ["sin_amp", "sin_amp(${1:90})", "scaled sine"],
];

function wordAt(prefix) {
  const m = /(@?[A-Za-z_][A-Za-z0-9_]*)?$/.exec(prefix);
  return m && m[1] ? m[1] : "";
}

function braceEnd(text, openAt) {
  let depth = 0;
  for (let i = openAt; i < text.length; i++) {
    const c = text[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return text.length;
}

function scan(text) {
  const fns = [];
  const vars = [];
  const structs = [];
  const fnRe = /fn\s+([A-Za-z_]\w*)([^{]*)\{/g;
  let m;
  while ((m = fnRe.exec(text))) {
    const open = m.index + m[0].length - 1;
    const end = braceEnd(text, open);
    const params = [];
    const pin = /in\s*\[([^\]]*)\]/.exec(m[2] || "");
    if (pin) {
      for (const p of pin[1].split(",")) {
        const name = p.trim();
        if (name) params.push(name);
      }
    }
    fns.push({ name: m[1], start: m.index, end, params });
    fnRe.lastIndex = end + 1;
  }
  const varRe = /(?:^|[;\n])\s*(?:i32|f32|bool|string|int|float)\s+([A-Za-z_]\w*)/g;
  while ((m = varRe.exec(text))) vars.push(m[1]);
  const stRe = /struct\s+([A-Za-z_]\w*)/g;
  while ((m = stRe.exec(text))) structs.push(m[1]);
  return { fns, vars, structs };
}

function enclosing(scanned, offset) {
  let best = null;
  for (const fn of scanned.fns) {
    if (offset >= fn.start && offset <= fn.end && (!best || fn.start > best.start)) best = fn;
  }
  return best;
}

function suggest(text, offset, linePrefix) {
  const typed = wordAt(linePrefix);
  const out = [];
  const seen = new Set();
  function add(label, insert, detail, kind, sort) {
    const key = kind + ":" + label;
    if (seen.has(key)) return;
    if (typed && !label.toLowerCase().startsWith(typed.replace(/^@/, "").toLowerCase()) && !label.startsWith(typed)) {
      if (!(typed.startsWith("@") && ("@" + label).startsWith(typed))) return;
    }
    seen.add(key);
    out.push({ label, insert: insert || label, detail, kind, sort });
  }

  if (typed.startsWith("@")) {
    for (const a of ATTRS) add("@" + a, "@" + a, "attribute", "property", "0");
    return out;
  }

  const scanned = scan(text);
  const here = enclosing(scanned, offset);
  if (here) {
    for (const p of here.params) add(p, p, "param of " + here.name, "variable", "0");
  }
  for (const name of scanned.vars) add(name, name, "variable", "variable", "1");
  for (const fn of scanned.fns) add(fn.name, fn.name + " in[${1}]", "function in this file", "function", "1");
  for (const name of scanned.structs) add(name, name, "struct", "struct", "1");
  for (const row of SNIPPETS) add(row[0], row[1], row[2], "snippet", "2");
  for (const t of TYPES) add(t, t + " ${1:name}", "type", "keyword", "3");
  return out;
}

module.exports = { scan, suggest, wordAt };
