import { CodeGenVisitor } from "./codegen";
import { TranspilerError } from "./error";
import Lexer from "./lexer";
import Parser from "./parser";
import { IdentificationVisitor, TypeCheckingVisitor } from "./semantic";

export function compile(
  source: string,
  errorHandler: (error: TranspilerError) => void
): string {
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
    return codeGenVisitor.visitProgram(program);
  } catch (e) {
    if (e instanceof TranspilerError) {
      errorHandler(e);
      return "";
    }

    throw e;
  }
}
