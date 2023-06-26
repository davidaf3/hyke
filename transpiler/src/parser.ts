import {
  BinOp,
  BoolLit,
  Expr,
  FuncBody,
  FuncCall,
  FuncDef,
  FuncType,
  ListLit,
  NatLit,
  Pattern,
  Program,
  Symbol,
  TupleLit,
  Type,
} from "./ast";
import { ParseError } from "./error";
import Lexer, { Token, TokenKind } from "./lexer";

export default class Parser {
  constructor(private lexer: Lexer) {}

  program(): Program {
    const funcDefs: FuncDef[] = [];
    const funcBodies: FuncBody[] = [];

    let nextTok = this.lexer.nextToken();
    while (nextTok.kind !== "EOF") {
      if (nextTok.kind !== "EOL") {
        const nameTok = nextTok;
        nextTok = this.lexer.peek();
        if (nextTok.kind === "QUADDOTS") {
          this.lexer.nextToken();
          funcDefs.push(this.funcSig(nameTok));
        } else funcBodies.push(this.funcBody(nameTok));
      }

      nextTok = this.lexer.nextToken();
    }

    const endLine = Math.max(
      funcDefs[funcDefs.length - 1].endLine,
      funcBodies[funcBodies.length - 1].endLine
    );
    const endColumn = Math.max(
      funcDefs[funcDefs.length - 1].endColumn,
      funcBodies[funcBodies.length - 1].endColumn
    );

    return new Program(funcDefs, funcBodies, 0, 0, endLine, endColumn);
  }

  funcSig(nameTok: Token): FuncDef {
    const types = [this.funcType()];

    let nextTok = this.lexer.peek();
    if (nextTok.kind !== "EOL" && nextTok.kind !== "EOF") {
      while (nextTok.kind !== "ARROW") {
        types.push(this.funcType());
        nextTok = this.lexer.peek();
      }

      this.lexer.nextToken();
      types.push(this.funcType());
    }

    const params = types.slice(0, -1);
    const returnType = types[types.length - 1];
    const defaultVal = returnType.defaultVal;
    returnType.defaultVal = null;

    return new FuncDef(
      nameTok.value,
      params,
      returnType.type,
      params.map((fType, i) => `${fType.type.name.toLowerCase()}${i}`),
      defaultVal,
      nameTok.line,
      nameTok.column,
      defaultVal?.endLine ?? returnType.endLine,
      defaultVal?.endColumn ?? returnType.endColumn
    );
  }

  funcType(): FuncType {
    const type = this.type();
    let defaultVal = null;

    let nextTok = this.lexer.peek();
    if (nextTok.kind === "EQ") {
      this.lexer.nextToken();
      defaultVal = this.arg();
    }

    return new FuncType(
      type,
      defaultVal,
      type.line,
      type.column,
      defaultVal?.endLine ?? type.endLine,
      defaultVal?.endColumn ?? type.endColumn
    );
  }

  type(): Type {
    let nextTok = this.lexer.nextToken();

    if (nextTok.kind === "LBRACKET") {
      const { line, column } = nextTok;
      const contained = this.type();
      nextTok = this.lexer.nextToken();
      this.mustMatch(nextTok, "RBRACKET");
      return new Type(
        "List",
        [contained],
        line,
        column,
        nextTok.line,
        nextTok.column
      );
    }

    if (nextTok.kind === "LPAR") {
      const { line, column } = nextTok;
      const tupleTypes = [this.type()];
      nextTok = this.lexer.nextToken();
      const secondTok = this.lexer.peek();
      if (secondTok.kind === "RPAR" && nextTok.kind === "COMMA") {
        nextTok = this.lexer.nextToken();
      } else {
        while (nextTok.kind === "COMMA") {
          tupleTypes.push(this.type());
          nextTok = this.lexer.nextToken();
        }
      }
      this.mustMatch(nextTok, "RPAR");
      return new Type(
        "Tuple",
        tupleTypes,
        line,
        column,
        nextTok.line,
        nextTok.column
      );
    }

    this.mustMatch(nextTok, "SYMBOL");
    return new Type(
      nextTok.value,
      [],
      nextTok.line,
      nextTok.column,
      nextTok.line,
      nextTok.column + nextTok.value.length - 1
    );
  }

  funcBody(nameTok: Token): FuncBody {
    const params: (Pattern | Symbol)[] = [];

    let nextTok = this.lexer.nextToken();
    while (nextTok.kind !== "EQ") {
      switch (nextTok.kind) {
        case "SYMBOL":
          params.push(
            new Symbol(
              nextTok.value,
              nextTok.line,
              nextTok.column,
              nextTok.line,
              nextTok.column + nextTok.value.length - 1
            )
          );
          break;
        case "NATLIT":
        case "BOOLLIT":
        case "LBRACKET":
          const lit = this.literal(nextTok);
          params.push(
            new Pattern(lit, lit.line, lit.column, lit.endLine, lit.endColumn)
          );
          break;
        case "LPAR":
          const openingTok = nextTok;
          let expr = this.expr();

          let endLine, endColumn;
          nextTok = this.lexer.nextToken();
          if (nextTok.kind === "COMMA") {
            expr = this.tupleLit(openingTok, expr);
            endLine = expr.endLine;
            endColumn = expr.endColumn;
          } else {
            this.mustMatch(nextTok, "RPAR");
            endLine = nextTok.line;
            endColumn = nextTok.column;
          }

          params.push(
            new Pattern(
              expr,
              openingTok.line,
              openingTok.column,
              endLine,
              endColumn
            )
          );
          break;
        default:
          throw this.unexpected(nextTok);
      }
      nextTok = this.lexer.nextToken();
    }

    const returnExpr = this.expr();
    const funcBody = new FuncBody(
      nameTok.value,
      params,
      returnExpr,
      nameTok.line,
      nameTok.column,
      returnExpr.endLine,
      returnExpr.endColumn
    );
    this.lexer.nextToken();
    return funcBody;
  }

  expr(): Expr {
    let expr: Expr;

    let nextTok = this.lexer.nextToken();
    switch (nextTok.kind) {
      case "NATLIT":
      case "BOOLLIT":
      case "LBRACKET":
        expr = this.literal(nextTok);
        break;
      case "SYMBOL":
        const secondTok = this.lexer.peek();
        expr =
          secondTok.kind !== "BINOP" &&
          secondTok.kind !== "COMMA" &&
          secondTok.kind !== "EOL" &&
          secondTok.kind !== "EOF" &&
          secondTok.kind !== "RPAR" &&
          secondTok.kind !== "RBRACKET"
            ? this.funcCall(nextTok)
            : new Symbol(
                nextTok.value,
                nextTok.line,
                nextTok.column,
                nextTok.line,
                nextTok.column + nextTok.value.length - 1
              );
        break;
      case "LPAR":
        const openingTok = nextTok;
        expr = this.expr();

        nextTok = this.lexer.nextToken();
        if (nextTok.kind === "COMMA") expr = this.tupleLit(openingTok, expr);
        else this.mustMatch(nextTok, "RPAR");

        break;
      default:
        throw this.unexpected(nextTok);
    }

    nextTok = this.lexer.peek();
    if (nextTok.kind === "BINOP") {
      this.lexer.nextToken();
      const rightExpr = this.expr();
      return new BinOp(
        nextTok.value,
        expr,
        rightExpr,
        expr.line,
        expr.column,
        rightExpr.endLine,
        rightExpr.endColumn
      );
    }

    return expr;
  }

  listLit(openingTok: Token): ListLit {
    let nextTok = this.lexer.peek();
    if (nextTok.kind === "RBRACKET") {
      this.lexer.nextToken();
      return new ListLit(
        [],
        openingTok.line,
        openingTok.column,
        nextTok.line,
        nextTok.column
      );
    }

    const items: Expr[] = [];

    while (nextTok.kind !== "RBRACKET") {
      items.push(this.expr());
      nextTok = this.lexer.nextToken();
    }

    return new ListLit(
      items,
      openingTok.line,
      openingTok.column,
      nextTok.line,
      nextTok.column
    );
  }

  tupleLit(openingTok: Token, first: Expr) {
    if (this.lexer.peek().kind === "RPAR") {
      const nextTok = this.lexer.nextToken();
      return new TupleLit(
        [first],
        openingTok.line,
        openingTok.column,
        nextTok.line,
        nextTok.column
      );
    }

    const items = [first, this.expr()];
    let nextTok = this.lexer.nextToken();
    while (nextTok.kind === "COMMA") {
      items.push(this.expr());
      nextTok = this.lexer.nextToken();
    }

    this.mustMatch(nextTok, "RPAR");
    return new TupleLit(
      items,
      openingTok.line,
      openingTok.column,
      nextTok.line,
      nextTok.column
    );
  }

  funcCall(nameTok: Token): FuncCall {
    const args: Expr[] = [];

    let nextTok = this.lexer.peek();
    while (
      nextTok.kind !== "BINOP" &&
      nextTok.kind !== "COMMA" &&
      nextTok.kind !== "EOL" &&
      nextTok.kind !== "EOF" &&
      nextTok.kind !== "RPAR" &&
      nextTok.kind !== "RBRACKET" &&
      nextTok.kind !== "ARROW"
    ) {
      args.push(this.arg());
      nextTok = this.lexer.peek();
    }

    const lastArg = args[args.length - 1];
    return new FuncCall(
      nameTok.value,
      args,
      nameTok.line,
      nameTok.column,
      lastArg.endLine,
      lastArg.endColumn
    );
  }

  arg(): Expr {
    let expr: Expr;

    let nextTok = this.lexer.nextToken();
    switch (nextTok.kind) {
      case "NATLIT":
      case "BOOLLIT":
      case "LBRACKET":
        expr = this.literal(nextTok);
        break;
      case "SYMBOL":
        expr = new Symbol(
          nextTok.value,
          nextTok.line,
          nextTok.column,
          nextTok.line,
          nextTok.column + nextTok.value.length - 1
        );
        break;
      case "LPAR":
        const openingTok = nextTok;
        expr = this.expr();

        nextTok = this.lexer.nextToken();
        if (nextTok.kind === "COMMA") expr = this.tupleLit(openingTok, expr);
        else this.mustMatch(nextTok, "RPAR");

        break;
      default:
        throw this.unexpected(nextTok);
    }

    return expr;
  }

  literal(nextTok: Token): NatLit | BoolLit | ListLit | TupleLit {
    switch (nextTok.kind) {
      case "NATLIT":
        return new NatLit(
          Number.parseInt(nextTok.value),
          nextTok.line,
          nextTok.column,
          nextTok.line,
          nextTok.column + nextTok.value.length - 1
        );
      case "BOOLLIT":
        return new BoolLit(
          nextTok.value === "True",
          nextTok.line,
          nextTok.column,
          nextTok.line,
          nextTok.column + nextTok.value.length - 1
        );
      case "LBRACKET":
        return this.listLit(nextTok);
      case "LPAR":
        const openingTok = nextTok;
        const expr = this.expr();
        this.mustMatch(this.lexer.nextToken(), "COMMA");
        return this.tupleLit(openingTok, expr);
    }

    throw this.unexpected(nextTok);
  }

  unexpected(tok: Token): Error {
    return new ParseError(
      `Unexpected token: ${tok.kind}`,
      tok.line,
      tok.column,
      tok.line,
      tok.column + tok.value.length - 1
    );
  }

  mustMatch(tok: Token, kind: TokenKind) {
    if (tok.kind !== kind)
      throw new ParseError(
        `Expected ${kind}, found ${tok.kind}`,
        tok.line,
        tok.column,
        tok.line,
        tok.column + tok.value.length - 1
      );
  }
}
