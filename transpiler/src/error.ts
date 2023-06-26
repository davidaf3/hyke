export class TranspilerError extends Error {
  constructor(
    message: string,
    public line: number,
    public column: number,
    public endLine: number,
    public endColumn: number
  ) {
    super(`Error at line ${line}, column ${column}: ${message}`);
  }
}

export class LexerError extends TranspilerError {}

export class ParseError extends TranspilerError {}

export class NameError extends TranspilerError {}

export class TypeError extends TranspilerError {}
