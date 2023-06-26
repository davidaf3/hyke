import { LexerError } from "./error";

export type TokenKind =
  | "NATLIT"
  | "BINOP"
  | "BOOLLIT"
  | "SYMBOL"
  | "EOL"
  | "QUADDOTS"
  | "LPAR"
  | "RPAR"
  | "EQ"
  | "ARROW"
  | "LBRACKET"
  | "RBRACKET"
  | "COMMA"
  | "EOF";

export interface Token {
  kind: TokenKind;
  value: string;
  line: number;
  column: number;
}

export default class Lexer {
  private static whiteSpaces = new Set([" ", "\t"]);

  private pos: number;
  private peeked: Token | null = null;
  private line = 1;
  private column = 1;

  constructor(private program: string) {
    this.pos = 0;
  }

  peek(): Token {
    if (this.peeked) return this.peeked;

    this.peeked = this.nextToken();
    return this.peeked;
  }

  nextToken(): Token {
    if (this.peeked) {
      const old = this.peeked;
      this.peeked = null;
      return old;
    }

    this.skipWhiteSpaces();

    const line = this.line;
    const column = this.column;
    const [kind, value] = this.matchToken();
    return {
      kind,
      value,
      line,
      column,
    };
  }

  skipWhiteSpaces() {
    while (
      Lexer.whiteSpaces.has(this.program[this.pos]) &&
      this.pos < this.program.length
    ) {
      this.incrementPos(1);
    }
  }

  matchToken(): [TokenKind, string] {
    let value: string = "";

    if (this.pos >= this.program.length) return ["EOF", value];

    if (this.program[this.pos] === "\r" || this.program[this.pos] === "\n") {
      while (
        this.program[this.pos] === "\r" ||
        this.program[this.pos] === "\n"
      ) {
        value += this.program[this.pos];
        if (this.program[this.pos] === "\n") {
          this.column = 1;
          this.line++;
          this.pos++;
        } else {
          this.incrementPos(1);
        }

        if (this.pos >= this.program.length) return ["EOL", value];
      }

      return ["EOL", value];
    }

    switch (this.program[this.pos]) {
      case "(":
        this.incrementPos(1);
        return ["LPAR", "("];
      case ")":
        this.incrementPos(1);
        return ["RPAR", ")"];
      case "[":
        this.incrementPos(1);
        return ["LBRACKET", "["];
      case "]":
        this.incrementPos(1);
        return ["RBRACKET", "]"];
      case "+":
        this.incrementPos(1);
        return ["BINOP", "+"];
      case "*":
        this.incrementPos(1);
        return ["BINOP", "*"];
      case ",":
        this.incrementPos(1);
        return ["COMMA", ","];
      case "!":
        if (
          this.pos + 1 < this.program.length &&
          this.program[this.pos + 1] === "!"
        ) {
          this.incrementPos(2);
          return ["BINOP", "!!"];
        }
    }

    if (this.program[this.pos] === "<") {
      if (
        this.pos + 1 < this.program.length &&
        this.program[this.pos + 1] === "="
      ) {
        this.incrementPos(2);
        return ["BINOP", "<="];
      } else {
        this.incrementPos(1);
        return ["BINOP", "<"];
      }
    }

    if (this.program[this.pos] === "=") {
      if (
        this.pos + 1 < this.program.length &&
        this.program[this.pos + 1] === "="
      ) {
        this.incrementPos(2);
        return ["BINOP", "=="];
      } else {
        this.incrementPos(1);
        return ["EQ", "="];
      }
    }

    if (this.program[this.pos] === ":") {
      if (
        this.pos + 1 < this.program.length &&
        this.program[this.pos + 1] === ":"
      ) {
        this.incrementPos(2);
        return ["QUADDOTS", "::"];
      } else {
        this.incrementPos(1);
        return ["BINOP", ":"];
      }
    }

    if (this.program[this.pos] === "-") {
      if (
        this.pos + 1 < this.program.length &&
        this.program[this.pos + 1] === ">"
      ) {
        this.incrementPos(2);
        return ["ARROW", "->"];
      } else {
        this.incrementPos(1);
        return ["BINOP", "-"];
      }
    }

    if (this.matchWord("True")) {
      this.incrementPos("True".length);
      return ["BOOLLIT", "True"];
    }

    if (this.matchWord("False")) {
      this.incrementPos("False".length);
      return ["BOOLLIT", "False"];
    }

    if (/[0-9]/.test(this.program[this.pos])) {
      while (/[0-9]/.test(this.program[this.pos])) {
        value += this.program[this.pos];
        this.incrementPos(1);
        if (this.pos >= this.program.length) return ["NATLIT", value];
      }

      return ["NATLIT", value];
    }

    if (/[a-zA-Z0-9]/.test(this.program[this.pos])) {
      while (/[a-zA-Z0-9]/.test(this.program[this.pos])) {
        value += this.program[this.pos];
        this.incrementPos(1);
        if (this.pos >= this.program.length) return ["SYMBOL", value];
      }

      return ["SYMBOL", value];
    }

    throw new LexerError(
      "No matching token",
      this.line,
      this.column,
      this.line,
      this.column
    );
  }

  private matchWord(word: string): boolean {
    let i = 0;
    while (i < word.length && this.program[this.pos + i] === word[i]) {
      i++;
      if (this.pos >= this.program.length) return false;
    }

    return i === word.length;
  }

  private incrementPos(n: number) {
    this.pos += n;
    this.column += n;
  }
}
