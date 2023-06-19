import { readFileSync } from "fs";
import { compile, run } from ".";

const exampleOutputs = new Map([
  ["bool.hyke", "True"],
  ["fib.hyke", "8"],
  ["fib2.hyke", "8"],
  ["fiblist.hyke", "[8, 5, 3, 2, 1, 1, 0]"],
  ["matrix.hyke", "4"],
  [
    "nqueens.hyke",
    "[(4, 7), (6, 6), (1, 5), (5, 4), (2, 3), (0, 2), (3, 1), (7, 0)]",
  ],
  ["prev.hyke", "22"],
  ["quicksort.hyke", "[1, 2, 5, 5, 8, 9]"],
  ["stackmachine.hyke", "15"],
  ["sum.hyke", "10"],
  ["tuple.hyke", "(True, 4, [((False,), 3, 2), ((False,), 4, 2)])"],
  ["turingmachine.hyke", "[0, 1, 1, 1, 1, 1, 0, 0, 0]"],
]);

exampleOutputs.forEach((expected, file) => {
  test(file, () => {
    const source = readFileSync(`../examples/${file}`, {
      encoding: "utf-8",
    });
    const outCode = compile(source, (e: Error) => {
      throw e;
    });
    expect(run(outCode)).toBe(expected);
  });
});
