const vscode = require("vscode");

const NODE_RE = /^\/\/<<<node\s+id=(\d+)\s+name="([^"]+)"/;

function activate(context) {
  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      { language: "toplethos" },
      {
        provideDocumentSymbols(doc) {
          const out = [];
          for (let i = 0; i < doc.lineCount; i++) {
            const m = NODE_RE.exec(doc.lineAt(i).text.trim());
            if (!m) continue;
            const endRe = new RegExp("^//<<<end\\s+id=" + m[1] + ">>>");
            let end = i;
            for (let j = i + 1; j < doc.lineCount; j++) {
              if (endRe.test(doc.lineAt(j).text.trim())) {
                end = j;
                break;
              }
            }
            const range = new vscode.Range(i, 0, end, doc.lineAt(end).text.length);
            out.push(new vscode.DocumentSymbol(
              m[2],
              "node " + m[1],
              vscode.SymbolKind.Function,
              range,
              range
            ));
          }
          return out;
        },
      }
    )
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
