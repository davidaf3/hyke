import { TranspilerError, compile, run } from "hyke";
import * as monaco from "monaco-editor";

(function () {
  function doCompile() {
    clearOutput();
    const compiled = compile(hykeEditor.getValue(), compilationErrorHandler);
    tsEditor.setValue(compiled);
    // Skip prelude (52 lines)
    tsEditor.setScrollTop(
      tsEditor.getOption(monaco.editor.EditorOption.lineHeight) * 52
    );
  }

  function clearOutput() {
    monaco.editor.removeAllMarkers("hyke");
    outputTextArea.value = "";
  }

  async function fecthExample(filename: string) {
    const response = await fetch(
      `https://raw.githubusercontent.com/davidaf3/hyke/master/examples/${filename}`
    );
    const source = await response.text();
    hykeEditor.setValue(source);
    doCompile();
    clearOutput();
  }

  function compilationErrorHandler(error: TranspilerError) {
    monaco.editor.setModelMarkers(hykeEditor.getModel()!, "hyke", [
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

  const editorsContainer = document.getElementById(
    "editorsContainer"
  ) as HTMLElement;
  const hykeContainer = document.getElementById("hykeContainer") as HTMLElement;
  const tsContainer = document.getElementById("tsContainer") as HTMLElement;
  const dragBar = document.getElementById("dragBar") as HTMLElement;
  const runButton = document.getElementById("runButton") as HTMLButtonElement;
  const exampleSelect = document.getElementById(
    "exampleSelect"
  ) as HTMLSelectElement;
  const outputTextArea = document.getElementById(
    "output"
  ) as HTMLTextAreaElement;

  window.MonacoEnvironment = {
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

  const hykeEditor = monaco.editor.create(
    document.getElementById("hykeEditor")!,
    {
      language: "hyke",
      automaticLayout: true,
      minimap: {
        enabled: false,
      },
    }
  );
  const tsEditor = monaco.editor.create(document.getElementById("tsEditor")!, {
    language: "typescript",
    automaticLayout: true,
    minimap: {
      enabled: false,
    },
  });

  hykeEditor.onDidChangeModelContent(() => {
    doCompile();
  });

  runButton.onclick = () => {
    clearOutput();
    outputTextArea.value = run(tsEditor.getValue());
  };

  exampleSelect.onchange = () => {
    fecthExample(exampleSelect.value);
  };
  fecthExample(exampleSelect.value);

  dragBar.onmousedown = () => {
    dragBar.classList.add("active");
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    const mouseMoveListener = (e: MouseEvent) => {
      const leftWidth =
        e.pageX - editorsContainer.getBoundingClientRect().left - 5;
      const rightWidth =
        editorsContainer.getBoundingClientRect().right - e.pageX - 5;

      if (leftWidth < 360 || rightWidth < 360) return;

      hykeContainer.style.width = `${leftWidth}px`;
      tsContainer.style.width = `${rightWidth}px`;
    };

    const mouseUpListener = () => {
      dragBar.classList.remove("active");
      document.body.style.userSelect = "auto";
      document.body.style.cursor = "default";
      document.removeEventListener("mousemove", mouseMoveListener);
      document.removeEventListener("mouseup", mouseUpListener);
    };

    document.addEventListener("mousemove", mouseMoveListener);
    document.addEventListener("mouseup", mouseUpListener);
  };
})();
