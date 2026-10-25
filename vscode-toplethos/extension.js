const vscode = require("vscode");
const { suggest } = require("./completion");
const { diagnose } = require("./diagnostics");

const NODE_RE = /^\/\/<<<node\s+id=(\d+)\s+name="([^"]+)"/;
const FN_RE = /^fn\s+([A-Za-z_]\w*)/;
const OBJECT_RE = /^(object|enum|namespace)\s+([A-Za-z_]\w*)/;

const KIND = {
  snippet: vscode.CompletionItemKind.Snippet,
  function: vscode.CompletionItemKind.Function,
  variable: vscode.CompletionItemKind.Variable,
  struct: vscode.CompletionItemKind.Struct,
  keyword: vscode.CompletionItemKind.Keyword,
  property: vscode.CompletionItemKind.Property,
};

function refresh(collection, doc) {
  if (doc.languageId !== "toplethos") return;
  const found = diagnose(doc.getText());
  collection.set(doc.uri, found.map((e) => {
    const line = Math.min(e.line - 1, doc.lineCount - 1);
    const text = doc.lineAt(line).text;
    const start = Math.min(e.start, text.length);
    const end = Math.min(Math.max(e.end, start + 1), text.length);
    return new vscode.Diagnostic(
      new vscode.Range(line, start, line, end),
      e.message,
      vscode.DiagnosticSeverity.Error
    );
  }));
}

function activate(context) {
  const sel = { language: "toplethos" };
  const collection = vscode.languages.createDiagnosticCollection("toplethos");
  context.subscriptions.push(collection);

  function open(doc) { refresh(collection, doc); }
  if (vscode.window.activeTextEditor) open(vscode.window.activeTextEditor.document);
  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(open));
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((event) => refresh(collection, event.document)));
  context.subscriptions.push(vscode.workspace.onDidCloseTextDocument((doc) => collection.delete(doc.uri)));

  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(sel, {
      provideDocumentSymbols(doc) {
        const out = [];
        for (let i = 0; i < doc.lineCount; i++) {
          const line = doc.lineAt(i).text.trim();
          const node = NODE_RE.exec(line);
          if (node) {
            const endRe = new RegExp("^//<<<end\\s+id=" + node[1] + ">>>");
            let end = i;
            for (let j = i + 1; j < doc.lineCount; j++) {
              if (endRe.test(doc.lineAt(j).text.trim())) { end = j; break; }
            }
            const range = new vscode.Range(i, 0, end, doc.lineAt(end).text.length);
            out.push(new vscode.DocumentSymbol(node[2], "node " + node[1], vscode.SymbolKind.Function, range, range));
            continue;
          }
          const obj = OBJECT_RE.exec(line);
          if (obj) {
            const range = new vscode.Range(i, 0, i, line.length);
            out.push(new vscode.DocumentSymbol(obj[2], obj[1], vscode.SymbolKind.Struct, range, range));
            continue;
          }
          const fn = FN_RE.exec(line);
          if (fn) {
            const range = new vscode.Range(i, 0, i, line.length);
            out.push(new vscode.DocumentSymbol(fn[1], "fn", vscode.SymbolKind.Function, range, range));
          }
        }
        return out;
      },
    })
  );

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(sel, {
      provideCompletionItems(doc, pos) {
        const line = doc.lineAt(pos).text.slice(0, pos.character);
        const found = suggest(doc.getText(), doc.offsetAt(pos), line);
        return found.map((it) => {
          const item = new vscode.CompletionItem(it.label, KIND[it.kind] || vscode.CompletionItemKind.Text);
          item.insertText = it.insert.includes("${") ? new vscode.SnippetString(it.insert) : it.insert;
          item.detail = it.detail;
          item.sortText = it.sort + it.label;
          if (it.kind === "snippet") item.filterText = it.label;
          return item;
        });
      },
    }, "@")
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
