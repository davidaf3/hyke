class TranspilerError extends Error {
  constructor(message: string, line: number, column: number) {
    super(`Error at line ${line}, column ${column}: ${message}`);
  }
}

export class LexerError extends TranspilerError {}

export class ParseError extends TranspilerError {}

export class NameError extends TranspilerError {}

export class TypeError extends TranspilerError {}
