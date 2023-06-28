import { TranspilerError } from "hyke";
import * as monaco from "monaco-editor";

export function setUpMonaco() {
  window.MonacoEnvironment = {
    getWorker: function (_, label: string) {
      if (label === "typescript") {
        return new Worker(
          new URL(
            "../node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js",
            import.meta.url
          ),
          {
            name: label,
            type: "module",
          }
        );
      }

      return new Worker(
        new URL(
          "../node_modules/monaco-editor/esm/vs/editor/editor.worker.js",
          import.meta.url
        ),
        {
          name: label,
          type: "module",
        }
      );
    },
    createTrustedTypesPolicy: undefined!,
  };

  monaco.languages.register({ id: "hyke" });
  monaco.languages.setMonarchTokensProvider("hyke", {
    tokenizer: {
      root: [
        [/::|->|True|False/, "keyword"],
        [/Nat|Bool/, "type"],
        [/(\+|:|-|\*|<|<=|==|!!)/, "operator"],
        [/[0-9]+/, "number"],
        [/\(|\)/, "delimiter.parenthesis"],
        [/\[\]/, "delimiter.array"],
        [/\[\]/, "delimiter.array"],
      ],
    },
  });
}

export function createEditor(
  element: HTMLElement,
  language: string
): monaco.editor.ICodeEditor {
  return monaco.editor.create(element, {
    language,
    automaticLayout: true,
    minimap: {
      enabled: false,
    },
  });
}

export function showTranspilerError(
  error: TranspilerError,
  editor: monaco.editor.ICodeEditor
) {
  monaco.editor.setModelMarkers(editor.getModel()!, "hyke", [
    {
      startLineNumber: error.line,
      startColumn: error.column,
      endLineNumber: error.endLine,
      endColumn: error.endColumn + 1,
      message: error.message.replace(/^.*?: /, ""),
      severity: monaco.MarkerSeverity.Error,
    },
  ]);
}

export function clearTranspilerErrors() {
  monaco.editor.removeAllMarkers("hyke");
}

export function getLineHeight(editor: monaco.editor.ICodeEditor): number {
  return editor.getOption(monaco.editor.EditorOption.lineHeight);
}
