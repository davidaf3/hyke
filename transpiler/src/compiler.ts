import { readFileSync, writeFileSync } from "fs";
import { CodeGenVisitor } from "./codegen";
import Lexer from "./lexer";
import Parser from "./parser";
import { IdentificationVisitor, TypeCheckingVisitor } from "./semantic";

export default function compile(
  fileName: string,
  errorHandler: (error: Error) => void
) {
  const source = readFileSync(fileName, { encoding: "utf-8" });
  const lexer = new Lexer(source);
  const parser = new Parser(lexer);
  const identificationVisitor = new IdentificationVisitor();
  const typeCheckingVisitor = new TypeCheckingVisitor();
  const codeGenVisitor = new CodeGenVisitor();

  try {
    const program = parser.program();
    identificationVisitor.visitProgram(program, {
      insidePattern: false,
      funcDef: null,
    });
    typeCheckingVisitor.visitProgram(program, null);
    const code = codeGenVisitor.visitProgram(program);
    writeFileSync("out.ts", code, { encoding: "utf-8" });
  } catch (e) {
    errorHandler(e as Error);
  }
}
