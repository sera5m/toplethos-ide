"use strict";

const { ATOMS, ATTRS } = require("./diagnostics");

const SNIPPETS = [
  ["fn", "fn ${1:name} in[${2:i32 a}] out[${3:i32}] {\n\treturn ${4:0};\n}", "function"],
  ["main", "fn main in[] out[i32] {\n\treturn 0;\n}", "program entry"],
  ["if", "if[${1:cond}] {\n\t${2}\n}", "if"],
  ["ifelse", "if[${1:cond}] {\n\t${2}\n} else {\n\t${3}\n}", "if / else"],
  ["do", "do n[${1:n}] {\n\t${2}\n}", "counted loop"],
  ["object", "object ${1:Name} {\n\ti32 ${2:field};\n}", "object"],
  ["enum", "enum ${1:Name} {\n\t${2:red},\n\t${3:green}\n}", "enum"],
  ["namespace", "namespace ${1:Name} {\n\t${2}\n}", "namespace"],
  ["match", "match[${1:value}] {\n\t${2:Name::red} { }\n}", "match"],
  ["include", "include \"${1:file.tpth_s}\";", "include"],
  ["include lib", "include lib \"${1:m}\" {\n\tfn ${2:sin} in[f64 x] out[f64] foreign;\n}", "C library"],
  ["rng", "rng ${1:engine} = rng[${2:1}];\ni32 ${3:roll} = rand in[${1:engine}, ${4:0}, ${5:10}];", "mt19937_64"],
  ["i32", "i32 ${1:name} = ${2:0};", "i32 binding"],
  ["f32", "f32 ${1:name} = ${2:0};", "f32 binding"],
  ["bool", "bool ${1:name} = ${2:false};", "bool binding"],
  ["return", "return ${1:0};", "return"],
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
  const types = [];
  const typeWord = ATOMS.join("|");
  const fnRe = /fn\s+([A-Za-z_]\w*)([^{]*)\{/g;
  let m;
  while ((m = fnRe.exec(text))) {
    const open = m.index + m[0].length - 1;
    const end = braceEnd(text, open);
    const params = [];
    const pin = /in\s*\[([^\]]*)\]/.exec(m[2] || "");
    if (pin) {
      for (const p of pin[1].split(",")) {
        const name = p.trim().split(/\s+/).pop();
        if (name && /^[A-Za-z_]/.test(name)) params.push(name.replace(/[*&]/g, ""));
      }
    }
    fns.push({ name: m[1], start: m.index, end, params });
    fnRe.lastIndex = end + 1;
  }
  const varRe = new RegExp("(?:^|[;\\n])\\s*(?:" + typeWord + ")\\s+([A-Za-z_]\\w*)", "g");
  while ((m = varRe.exec(text))) vars.push(m[1]);
  const stRe = /(?:object|enum|namespace)\s+([A-Za-z_]\w*)/g;
  while ((m = stRe.exec(text))) types.push(m[1]);
  return { fns, vars, types };
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
    const bare = typed.replace(/^@/, "");
    if (typed && !label.toLowerCase().startsWith(bare.toLowerCase()) && !label.startsWith(typed)) {
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
  for (const name of scanned.types) add(name, name, "object, enum, or namespace", "struct", "1");
  for (const row of SNIPPETS) add(row[0], row[1], row[2], "snippet", "2");
  for (const t of ATOMS) add(t, t + " ${1:name}", "type", "keyword", "3");
  return out;
}

module.exports = { scan, suggest, wordAt };
