export function createDragbar(
  element: HTMLElement | null,
  editorsContainer: HTMLElement,
  hykeContainer: HTMLElement,
  tsContainer: HTMLElement
) {
  if (!element) return;

  element.onmousedown = () => {
    element.classList.add("active");
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
      element.classList.remove("active");
      document.body.style.userSelect = "auto";
      document.body.style.cursor = "default";
      document.removeEventListener("mousemove", mouseMoveListener);
      document.removeEventListener("mouseup", mouseUpListener);
    };

    document.addEventListener("mousemove", mouseMoveListener);
    document.addEventListener("mouseup", mouseUpListener);
  };
}
