import { compile, run } from "hyke";
import * as monaco from "monaco-editor";

(function () {
  function clearOutput() {
    monaco.editor.removeAllMarkers("hyke");
    outputTextArea.value = "";
  }

  async function fecthExample(filename) {
    const response = await fetch(
      `https://raw.githubusercontent.com/davidaf3/hyke/master/examples/${filename}`
    );
    const source = await response.text();
    hykeEditor.setValue(source);
    tsEditor.setValue("");
    clearOutput();
  }

  function compilationErrorHandler(error: Error) {
    const matches = error.message.match(
      /Error at line (\d+), column (\d+): (.*)/
    )!;
    const line = Number(matches[1]);
    const column = Number(matches[2]);
    monaco.editor.setModelMarkers(hykeEditor.getModel()!, "hyke", [
      {
        startLineNumber: line,
        startColumn: column,
        endLineNumber: line,
        endColumn: column + 1,
        message: matches[3],
        severity: monaco.MarkerSeverity.Error,
      },
    ]);
  }

  const runButton = document.getElementById("runButton") as HTMLButtonElement;
  const compileButton = document.getElementById(
    "compileButton"
  ) as HTMLButtonElement;
  const exampleSelect = document.getElementById(
    "exampleSelect"
  ) as HTMLSelectElement;
  const outputTextArea = document.getElementById(
    "output"
  ) as HTMLTextAreaElement;

  this.MonacoEnvironment = {
    getWorker: function (_, label: string) {
      if (label === "typescript") {
        return new Worker(
          new URL(
            "./node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js",
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
          "./node_modules/monaco-editor/esm/vs/editor/editor.worker.js",
          import.meta.url
        ),
        {
          name: label,
          type: "module",
        }
      );
    },
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

  const hykeEditor = monaco.editor.create(
    document.getElementById("hykeEditor") as HTMLElement,
    {
      language: "hyke",
      minimap: {
        enabled: false,
      },
    }
  );
  const tsEditor = monaco.editor.create(
    document.getElementById("tsEditor") as HTMLElement,
    {
      language: "typescript",
      minimap: {
        enabled: false,
      },
    }
  );

  compileButton.onclick = () => {
    clearOutput();
    const compiled = compile(hykeEditor.getValue(), compilationErrorHandler);
    tsEditor.setValue(compiled);
    // Skip prelude (52 lines)
    tsEditor.setScrollTop(
      tsEditor.getOption(monaco.editor.EditorOption.lineHeight) * 52
    );
  };

  runButton.onclick = () => {
    clearOutput();
    outputTextArea.value = run(tsEditor.getValue());
  };

  exampleSelect.onchange = () => {
    fecthExample(exampleSelect.value);
  };
  fecthExample(exampleSelect.value);
})();
