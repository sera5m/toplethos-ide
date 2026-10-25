"use strict";

const ATOMS = [
  "i4", "i8", "i16", "i32", "i64",
  "ui4", "ui8", "ui16", "ui32", "ui64", "size",
  "f8e4m3", "f8e5m2", "f16", "f32", "f64", "bf16",
  "uf8e4m3", "uf8e5m2", "uf32", "uf64",
  "t1", "t8", "t16", "t32", "t64",
  "bool", "char", "string", "fnid", "rng",
];

const ATTRS = new Set([
  "private", "protected", "public", "ephemeral", "static", "config",
  "val", "xor", "mut", "mutex", "accum", "require", "ensure", "retry",
  "structuredConcurrency", "comptime", "compeval", "stream", "dataparallel",
  "checkpoint", "name", "total", "childof", "ismutationof", "ring",
  "process", "device", "buffer", "direct", "fan", "clone", "merge",
  "cfan", "cmerge", "read", "write", "exclusive",
  "ignore_if_structure_matches", "divzero", "parallel", "gpuparallel",
  "npuparallel", "paged", "memory_hard", "geometry", "body", "scope", "time",
  "functor", "method",
]);

const TYPE_WORD = ATOMS.join("|");
const SKIP_SEMI = /^(fn|object|enum|namespace|flow|macro|row|match|if|else|do|loop|onfail|onwarn|onFinished|hold)\b/;

function strip(line) {
  let out = "";
  let str = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    const n = line[i + 1];
    if (!str && c === "/" && n === "/") break;
    if (c === '"' && line[i - 1] !== "\\") {
      str = !str;
      out += " ";
      continue;
    }
    out += str ? " " : c;
  }
  return out;
}

function diagnose(text) {
  const raw = text.split(/\r?\n/);
  const lines = raw.map(strip);
  const errors = [];
  const seen = new Set();
  function err(line, start, end, message) {
    const key = line + ":" + start + ":" + message;
    if (seen.has(key)) return;
    seen.add(key);
    errors.push({ line, start, end: Math.max(end, start + 1), message });
  }

  const stack = [];
  const ns = [];
  const fnNames = new Set();
  let fn = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNo = i + 1;
    if (!trimmed) continue;

    const badType = /\b(int|long|float)\b/.exec(trimmed);
    if (badType) {
      const which = badType[1] === "float" ? "f32" : badType[1] === "long" ? "i64" : "i32";
      err(lineNo, badType.index, badType.index + badType[1].length, badType[1] + " is not a type. Use " + which + ".");
    }

    if (/\bstruct\b/.test(trimmed)) {
      const at = trimmed.indexOf("struct");
      err(lineNo, line.indexOf("struct"), line.indexOf("struct") + 6, "struct is not a type. Use object.");
      void at;
    }

    const cfn = new RegExp("\\b(" + TYPE_WORD + ")\\s+[A-Za-z_]\\w*\\s*\\(").exec(line);
    if (cfn) {
      err(lineNo, cfn.index, cfn.index + cfn[0].length, cfn[1] + " name() is not a function. Use fn name in[] out[].");
    }

    const call = /(?:^|[^A-Za-z0-9_])([A-Za-z_]\w*)\(/g;
    let cm;
    while ((cm = call.exec(line))) {
      if (cm[1] === "fn") continue;
      const start = cm.index + cm[0].length - cm[1].length - 1;
      err(lineNo, start, start + cm[1].length + 1, cm[1] + "() is not a call. Use " + cm[1] + " in[].");
    }

    const attr = /@([A-Za-z_][A-Za-z0-9_]*)/g;
    let am;
    while ((am = attr.exec(line))) {
      if (am[1] === "NoFailTolerance") {
        err(lineNo, am.index, am.index + am[0].length, "@NoFailTolerance is not a mode.");
      } else if (!ATTRS.has(am[1])) {
        err(lineNo, am.index, am.index + am[0].length, "unknown attribute @" + am[1] + ".");
      }
    }

    const zero = new RegExp("\\b(" + TYPE_WORD + ")(?:\\s+[A-Za-z_]\\w*)?\\s*\\[\\s*0\\s*\\]").exec(line);
    if (zero) {
      err(lineNo, zero.index, zero.index + zero[0].length, zero[1] + "[0] is a compile error. An array size is a constant greater than 0.");
    }

    if (/(^|[^<>=!])![0-9]/.test(line)) {
      const bang = line.search(/(^|[^<>=!])![0-9]/);
      err(lineNo, bang, bang + 2, "! takes bool. An integer is not a bool.");
    }
    if (/(&&|\|\|)/.test(line) && /\d/.test(line)) {
      const sides = line.split(/&&|\|\|/);
      if (sides.length > 1 && sides.every((s) => /[0-9]/.test(s) || /true|false/.test(s)) && sides.some((s) => /[0-9]/.test(s))) {
        const at = line.search(/&&|\|\|/);
        err(lineNo, at, at + 2, "&& and || take bool. An integer is not a bool.");
      }
    }

    const header = /\bfn\s+([A-Za-z_]\w*)([\s\S]*)$/.exec(trimmed);
    if (header && trimmed.indexOf("{") !== -1) {
      const name = header[1];
      const key = ns.join("::") + "::" + name;
      if (fnNames.has(key)) {
        const at = line.indexOf(name);
        err(lineNo, at, at + name.length, "a second function with the same short name in the same namespace.");
      }
      fnNames.add(key);
      const rest = header[2];
      const out = /out\s*\[([^\]]*)\]/.exec(rest);
      const designated = out && out[1].trim().length > 0;
      const gpu = /@(?:gpuparallel|npuparallel)\b/.test(rest);
      if (gpu) {
        const inn = /in\s*\[([^\]]*)\]/.exec(rest);
        const params = inn ? inn[1] : "";
        if (/[*]|string|\brng\b|\bfn\b|\bfnid\b|\bpool\b|\bpipe\b/.test(params) || /out\s*\[[^\]]*(?:[*]|string|\brng\b|\bfn\b|\bfnid\b|\bpool\b|\bpipe\b)/.test(rest)) {
          const mark = rest.indexOf("@gpuparallel") >= 0 ? "@gpuparallel" : "@npuparallel";
          const at = line.indexOf(mark);
          err(lineNo, at < 0 ? 0 : at, at < 0 ? mark.length : at + mark.length, mark + " cannot take a pointer, string, rng, fn, fnid, pool, or pipe. The host only copies atoms, enums, and objects or arrays of those.");
        }
      }
      fn = { name, line: lineNo, designated, depth: stack.length };
    }

    if (trimmed.endsWith("{") || /\{/.test(trimmed)) {
      let kind = "block";
      if (/\benum\b/.test(trimmed)) kind = "enum";
      else if (/\bnamespace\b/.test(trimmed)) {
        kind = "namespace";
        const nm = /\bnamespace\s+([A-Za-z_]\w*)/.exec(trimmed);
        if (nm) ns.push(nm[1]);
      } else if (/\bobject\b/.test(trimmed)) kind = "object";
      else if (/\bfn\b/.test(trimmed)) kind = "fn";
      else if (/\bmatch\b/.test(trimmed)) kind = "match";
      const opens = (trimmed.match(/\{/g) || []).length;
      const closes = (trimmed.match(/\}/g) || []).length;
      for (let k = 0; k < opens; k++) stack.push(kind);
      for (let k = 0; k < closes; k++) {
        const popped = stack.pop();
        if (popped === "namespace") ns.pop();
        if (fn && stack.length <= fn.depth) fn = null;
      }
    } else if (/\}/.test(trimmed)) {
      const closes = (trimmed.match(/\}/g) || []).length;
      for (let k = 0; k < closes; k++) {
        const popped = stack.pop();
        if (popped === "namespace") ns.pop();
      }
      if (fn && stack.length <= fn.depth) fn = null;
    }

    if (fn && !fn.designated && /^\s*return\b/.test(line) && !/^\s*return\s*;\s*$/.test(line)) {
      const hasValue = /^\s*return\s+\S/.test(line);
      if (hasValue) {
        err(fn.line, 0, 2, 'function "' + fn.name + '" on line ' + fn.line + " has no designated type out[] in function definition and cannot return this statement");
      }
    }

    const inEnum = stack[stack.length - 1] === "enum";
    const code = trimmed.replace(/\s+$/, "");
    const needsSemi = !inEnum && !code.endsWith("{") && !code.endsWith("}") && !code.endsWith(",") && !SKIP_SEMI.test(code) && !code.startsWith("}");
    const looks = new RegExp("^(?:" + TYPE_WORD + ")\\b").test(code)
      || /^(return|leave|continue|fatal|include|push|pop|flush|swap|lock|unlock)\b/.test(code)
      || /^[A-Za-z_][\w:]*\s+in\[/.test(code)
      || /(^|[^<>=!])=(?!=)/.test(code);
    if (needsSemi && looks && !code.endsWith(";")) {
      err(lineNo, Math.max(0, line.length - 1), line.length, "a statement ends with ;.");
    }
  }

  return errors;
}

module.exports = { diagnose, ATOMS, ATTRS };
