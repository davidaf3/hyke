import { Visitor } from "./visitor";

abstract class ASTNode {
  constructor(public line: number, public column: number) {}

  abstract accept<P, R>(visitor: Visitor<P, R>, param: P): R;
}

export class Program extends ASTNode {
  constructor(
    public funcDefs: FuncDef[],
    public funcBodies: FuncBody[],
    line: number,
    column: number
  ) {
    super(line, column);
  }

  accept<P, R>(visitor: Visitor<P, R>, param: P): R {
    return visitor.visitProgram(this, param);
  }
}

export class FuncDef extends ASTNode {
  public body: FuncBody[] = [];
  public default: FuncBody | null = null;
  public userDefinedParamNames = new Map<number, string>();

  constructor(
    public name: string,
    public paramTypes: FuncType[],
    public returnType: Type,
    public paramNames: string[],
    public value: Expr | null,
    line: number,
    column: number
  ) {
    super(line, column);
  }

  accept<P, R>(visitor: Visitor<P, R>, param: P): R {
    return visitor.visitFuncDef(this, param);
  }

  toJSON() {
    return {
      name: this.name,
      paramTypes: this.paramTypes,
      returnType: this.returnType,
      paramNames: this.paramNames,
    };
  }
}

export class FuncType extends ASTNode {
  constructor(
    public type: Type,
    public defaultVal: Expr | null,
    line: number,
    column: number
  ) {
    super(line, column);
  }

  accept<P, R>(visitor: Visitor<P, R>, param: P): R {
    return visitor.visitFuncType(this, param);
  }
}

export class Type extends ASTNode {
  constructor(
    public name: string,
    public params: Type[],
    line: number = 0,
    column: number = 0
  ) {
    super(line, column);
  }

  accept<P, R>(visitor: Visitor<P, R>, param: P): R {
    return visitor.visitType(this, param);
  }

  toString(): string {
    if (this.name === "List") return `[${this.params[0].toString()}]`;
    if (this.name === "Tuple") {
      const elements = this.params.map((param) => param.toString());
      if (elements.length === 1) elements[0] += ",";
      return `(${elements.join(", ")})`;
    }

    let str = this.name;
    if (this.params.length > 0) {
      str +=
        " " +
        this.params
          .map((param) =>
            param.params.length > 0 ? `(${param.toString()})` : param.toString()
          )
          .join(" ");
    }
    return str;
  }
}

export class FuncBody extends ASTNode {
  public def: FuncDef | null = null;
  public repeatedSymbols: Map<string, number[]> = new Map();

  constructor(
    public name: string,
    public params: (Pattern | Symbol)[],
    public body: Expr,
    line: number,
    column: number
  ) {
    super(line, column);
  }

  accept<P, R>(visitor: Visitor<P, R>, param: P): R {
    return visitor.visitFuncBody(this, param);
  }
}

export class Pattern extends ASTNode {
  constructor(
    public content: NatLit | ListLit | BoolLit | Expr,
    line: number,
    column: number
  ) {
    super(line, column);
  }

  accept<P, R>(visitor: Visitor<P, R>, param: P): R {
    return visitor.visitPattern(this, param);
  }
}

export type Expr = NatLit | ListLit | BoolLit | FuncCall | BinOp | Symbol;

export class Symbol extends ASTNode {
  public type: Type | null = null;
  public scope: FuncDef | null = null;
  public insidePattern = false;

  constructor(public name: string, line: number, column: number) {
    super(line, column);
  }

  accept<P, R>(visitor: Visitor<P, R>, param: P): R {
    return visitor.visitSymbol(this, param);
  }

  getScopedName(): string {
    return `${this.scope?.name ?? "global"}_${this.name}`;
  }

  isConstant(): boolean {
    return false;
  }
}

export class BinOp extends ASTNode {
  public type: Type | null = null;

  constructor(
    public op: string,
    public left: Expr,
    public right: Expr,
    line: number,
    column: number
  ) {
    super(line, column);
  }

  accept<P, R>(visitor: Visitor<P, R>, param: P): R {
    return visitor.visitBinOp(this, param);
  }

  isConstant(): boolean {
    return this.left.isConstant() && this.right.isConstant();
  }
}

export class FuncCall extends ASTNode {
  public type: Type | null = null;
  public def: FuncDef | null = null;

  constructor(
    public name: string,
    public args: Expr[],
    line: number,
    column: number
  ) {
    super(line, column);
  }

  accept<P, R>(visitor: Visitor<P, R>, param: P): R {
    return visitor.visitFuncCall(this, param);
  }

  isConstant(): boolean {
    return false;
  }
}

export class ListLit extends ASTNode {
  public type: Type | null = null;

  constructor(public values: Expr[], line: number, column: number) {
    super(line, column);
  }

  accept<P, R>(visitor: Visitor<P, R>, param: P): R {
    return visitor.visitListLit(this, param);
  }

  isConstant(): boolean {
    return this.values.every((value) => value.isConstant());
  }
}

export class TupleLit extends ASTNode {
  public type: Type | null = null;

  constructor(public values: Expr[], line: number, column: number) {
    super(line, column);
  }

  accept<P, R>(visitor: Visitor<P, R>, param: P): R {
    return visitor.visitTupleLit(this, param);
  }

  isConstant(): boolean {
    return this.values.every((value) => value.isConstant());
  }
}

export class NatLit extends ASTNode {
  public type = new Type("Nat", [], this.line, this.column);

  constructor(public value: number, line: number, column: number) {
    super(line, column);
  }

  accept<P, R>(visitor: Visitor<P, R>, param: P): R {
    return visitor.visitNatLit(this, param);
  }

  isConstant(): boolean {
    return true;
  }
}

export class BoolLit extends ASTNode {
  public type = new Type("Bool", [], this.line, this.column);

  constructor(public value: boolean, line: number, column: number) {
    super(line, column);
  }

  accept<P, R>(visitor: Visitor<P, R>, param: P): R {
    return visitor.visitBoolLit(this, param);
  }

  isConstant(): boolean {
    return true;
  }
}
