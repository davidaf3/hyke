import { compile as doCompile, run } from "hyke";
import { createDragbar } from "./src/dragbar";
import {
  clearTranspilerErrors,
  createEditor,
  getLineHeight,
  setUpMonaco,
  showTranspilerError,
} from "./src/editor";
import { fetchExample } from "./src/example";

(function () {
  function compile() {
    clearTranspilerErrors();
    outputTextArea.value = "";
    const compiled = doCompile(hykeEditor.getValue(), (e) =>
      showTranspilerError(e, hykeEditor)
    );

    if (compiled != "") {
      tsEditor.setValue(compiled);
      // Skip prelude (52 lines)
      tsEditor.setScrollTop(getLineHeight(tsEditor) * 52);
    }
  }

  async function selectExample(filename: string) {
    const source = await fetchExample(filename);
    hykeEditor.setValue(source);
    compile();
  }

  const editorsContainer = document.getElementById(
    "editorsContainer"
  ) as HTMLElement;
  const hykeContainer = document.getElementById("hykeContainer") as HTMLElement;
  const tsContainer = document.getElementById("tsContainer") as HTMLElement;
  const runButton = document.getElementById("runButton") as HTMLButtonElement;
  const exampleSelect = document.getElementById(
    "exampleSelect"
  ) as HTMLSelectElement;
  const outputTextArea = document.getElementById(
    "output"
  ) as HTMLTextAreaElement;

  setUpMonaco();
  const hykeEditor = createEditor(
    document.getElementById("hykeEditor")!,
    "hyke"
  );
  const tsEditor = createEditor(
    document.getElementById("tsEditor")!,
    "typescript"
  );
  hykeEditor.onDidChangeModelContent(compile);

  runButton.onclick = () => {
    outputTextArea.value = run(tsEditor.getValue());
  };

  exampleSelect.onchange = () => {
    selectExample(exampleSelect.value);
  };
  selectExample(exampleSelect.value);

  createDragbar(
    document.getElementById("dragBar"),
    editorsContainer,
    hykeContainer,
    tsContainer
  );
})();
