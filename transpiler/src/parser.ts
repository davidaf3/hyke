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
        if (nextTok.kind === "QUADDOTS") funcDefs.push(this.funcDef(nameTok));
        else funcBodies.push(this.funcBody(nameTok));
      }

      nextTok = this.lexer.nextToken();
    }

    return new Program(funcDefs, funcBodies, 0, 0);
  }

  funcDef(nameTok: Token): FuncDef {
    const types: FuncType[] = [];

    let nextTok = this.lexer.nextToken();
    while (nextTok.kind !== "EOL" && nextTok.kind !== "EOF") {
      types.push(this.funcType());
      nextTok = this.lexer.nextToken();
    }

    const params = types.slice(0, -1);
    const returnType = types[types.length - 1];
    if (returnType.defaultVal)
      throw new ParseError(
        "Return type can't have a default value",
        returnType.defaultVal.line,
        returnType.defaultVal.column
      );

    return new FuncDef(
      nameTok.value,
      params,
      returnType.type,
      params.map((fType, i) => `${fType.type.name.toLowerCase()}${i}`),
      nameTok.line,
      nameTok.column
    );
  }

  funcType(): FuncType {
    const type = this.type();
    let defaultVal = null;

    let nextTok = this.lexer.peek();
    if (nextTok.kind === "EQ") {
      this.lexer.nextToken();
      defaultVal = this.expr();
    }

    return new FuncType(type, defaultVal, type.line, type.column);
  }

  type(): Type {
    let nextTok = this.lexer.nextToken();

    if (nextTok.kind === "LBRACKET") {
      const { line, column } = nextTok;
      const contained = this.type();
      this.mustMatch(this.lexer.nextToken(), "RBRACKET");
      return new Type("List", [contained], line, column);
    }

    if (nextTok.kind === "LPAR") {
      const { line, column } = nextTok;
      let type = this.type();

      nextTok = this.lexer.nextToken();
      if (nextTok.kind === "COMMA") {
        const tupleTypes = [type];

        if (this.lexer.peek().kind === "RPAR") nextTok = this.lexer.nextToken();
        else {
          while (nextTok.kind === "COMMA") {
            tupleTypes.push(this.type());
            nextTok = this.lexer.nextToken();
          }
        }

        type = new Type("Tuple", tupleTypes, line, column);
      }

      this.mustMatch(nextTok, "RPAR");
      return type;
    }

    const { value, line, column } = nextTok;
    const params: Type[] = [];
    nextTok = this.lexer.peek();
    while (
      nextTok.kind !== "RBRACKET" &&
      nextTok.kind !== "RPAR" &&
      nextTok.kind !== "COMMA" &&
      nextTok.kind !== "EQ" &&
      nextTok.kind !== "ARROW" &&
      nextTok.kind !== "EOL" &&
      nextTok.kind !== "EOF"
    ) {
      params.push(this.typeParam());
      nextTok = this.lexer.peek();
    }

    return new Type(value, params, line, column);
  }

  typeParam(): Type {
    let nextTok = this.lexer.nextToken();

    if (nextTok.kind === "LBRACKET") {
      const { line, column } = nextTok;
      const contained = this.type();
      this.mustMatch(this.lexer.nextToken(), "RBRACKET");
      return new Type("List", [contained], line, column);
    }

    if (nextTok.kind === "LPAR") {
      const { line, column } = nextTok;
      let type = this.type();

      nextTok = this.lexer.nextToken();
      if (nextTok.kind === "COMMA") {
        const tupleTypes = [type];
        while (nextTok.kind === "COMMA") {
          tupleTypes.push(this.type());
          nextTok = this.lexer.nextToken();
        }

        type = new Type("Tuple", tupleTypes, line, column);
      }

      this.mustMatch(nextTok, "RPAR");
      return type;
    }

    return new Type(nextTok.value, [], nextTok.line, nextTok.column);
  }

  funcBody(nameTok: Token): FuncBody {
    const params: (Pattern | Symbol)[] = [];

    let nextTok = this.lexer.nextToken();
    while (nextTok.kind !== "EQ") {
      switch (nextTok.kind) {
        case "SYMBOL":
          params.push(new Symbol(nextTok.value, nextTok.line, nextTok.column));
          break;
        case "NATLIT":
          const natLit = new NatLit(
            Number.parseInt(nextTok.value),
            nextTok.line,
            nextTok.column
          );
          params.push(new Pattern(natLit, natLit.line, natLit.column));
          break;
        case "BOOLLIT":
          const boolLit = new BoolLit(
            nextTok.value === "True",
            nextTok.line,
            nextTok.column
          );
          params.push(new Pattern(boolLit, boolLit.line, boolLit.column));
          break;
        case "LBRACKET":
          const listLit = this.listLit(nextTok);
          params.push(new Pattern(listLit, nextTok.line, nextTok.column));
          break;
        case "LPAR":
          const openingTok = nextTok;
          let expr = this.expr();

          nextTok = this.lexer.nextToken();
          if (nextTok.kind === "COMMA") expr = this.tupleLit(openingTok, expr);
          else this.mustMatch(nextTok, "RPAR");

          params.push(new Pattern(expr, openingTok.line, openingTok.column));
          break;
        default:
          throw this.unexpected(nextTok);
      }
      nextTok = this.lexer.nextToken();
    }

    const funcBody = new FuncBody(
      nameTok.value,
      params,
      this.expr(),
      nameTok.line,
      nameTok.column
    );
    this.lexer.nextToken();
    return funcBody;
  }

  expr(): Expr {
    let expr: Expr;

    let nextTok = this.lexer.nextToken();
    switch (nextTok.kind) {
      case "NATLIT":
        expr = new NatLit(
          Number.parseInt(nextTok.value),
          nextTok.line,
          nextTok.column
        );
        break;
      case "BOOLLIT":
        expr = new BoolLit(
          nextTok.value === "True",
          nextTok.line,
          nextTok.column
        );
        break;
      case "LBRACKET":
        expr = this.listLit(nextTok);
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
            : new Symbol(nextTok.value, nextTok.line, nextTok.column);
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
      return new BinOp(
        nextTok.value,
        expr,
        this.expr(),
        expr.line,
        expr.column
      );
    }

    return expr;
  }

  listLit(openingTok: Token): ListLit {
    let nextTok = this.lexer.peek();
    if (nextTok.kind === "RBRACKET") {
      this.lexer.nextToken();
      return new ListLit([], openingTok.line, openingTok.column);
    }

    const items: Expr[] = [];

    while (nextTok.kind !== "RBRACKET") {
      items.push(this.expr());
      nextTok = this.lexer.nextToken();
    }

    return new ListLit(items, openingTok.line, openingTok.column);
  }

  tupleLit(openingTok: Token, first: Expr) {
    if (this.lexer.peek().kind === "RPAR") {
      this.lexer.nextToken();
      return new TupleLit([first], openingTok.line, openingTok.column);
    }

    const items = [first, this.expr()];
    let nextTok = this.lexer.nextToken();
    while (nextTok.kind === "COMMA") {
      items.push(this.expr());
      nextTok = this.lexer.nextToken();
    }

    this.mustMatch(nextTok, "RPAR");
    return new TupleLit(items, openingTok.line, openingTok.column);
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
      nextTok.kind !== "RBRACKET"
    ) {
      args.push(this.arg());
      nextTok = this.lexer.peek();
    }

    return new FuncCall(nameTok.value, args, nameTok.line, nameTok.column);
  }

  arg(): Expr {
    let expr: Expr;

    let nextTok = this.lexer.nextToken();
    switch (nextTok.kind) {
      case "NATLIT":
        expr = new NatLit(
          Number.parseInt(nextTok.value),
          nextTok.line,
          nextTok.column
        );
        break;
      case "BOOLLIT":
        expr = new BoolLit(
          nextTok.value === "True",
          nextTok.line,
          nextTok.column
        );
        break;
      case "LBRACKET":
        expr = this.listLit(nextTok);
        break;
      case "SYMBOL":
        expr = new Symbol(nextTok.value, nextTok.line, nextTok.column);
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

  unexpected(tok: Token): Error {
    return new ParseError(
      `Unexpected token: ${tok.kind}`,
      tok.line,
      tok.column
    );
  }

  mustMatch(tok: Token, kind: TokenKind) {
    if (tok.kind !== kind)
      throw new ParseError(
        `Expected ${kind}, found ${tok.kind}`,
        tok.line,
        tok.column
      );
  }
}
