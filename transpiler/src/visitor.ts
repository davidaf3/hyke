import {
  BinOp,
  BoolLit,
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

export interface Visitor<P, R> {
  visitProgram(program: Program, param: P): R;
  visitFuncDef(funcDef: FuncDef, param: P): R;
  visitFuncBody(funcBody: FuncBody, param: P): R;
  visitFuncType(funcType: FuncType, param: P): R;
  visitType(type: Type, param: P): R;
  visitPattern(pattern: Pattern, param: P): R;
  visitSymbol(symbol: Symbol, param: P): R;
  visitFuncCall(funcCall: FuncCall, param: P): R;
  visitBinOp(binOp: BinOp, param: P): R;
  visitListLit(listLit: ListLit, param: P): R;
  visitTupleLit(tupleLit: TupleLit, param: P): R;
  visitNatLit(natLit: NatLit, param: P): R;
  visitBoolLit(boolLit: BoolLit, param: P): R;
}

export abstract class AbstractVisitor<P, R> implements Visitor<P, R> {
  visitProgram(program: Program, param: P): R {
    throw new Error("Should not reach here");
  }
  visitFuncDef(funcDef: FuncDef, param: P): R {
    throw new Error("Should not reach here");
  }
  visitFuncBody(funcBody: FuncBody, param: P): R {
    throw new Error("Should not reach here");
  }
  visitFuncType(funcType: FuncType, param: P): R {
    throw new Error("Should not reach here");
  }
  visitType(type: Type, param: P): R {
    throw new Error("Should not reach here");
  }
  visitPattern(pattern: Pattern, param: P): R {
    throw new Error("Should not reach here");
  }
  visitSymbol(symbol: Symbol, param: P): R {
    throw new Error("Should not reach here");
  }
  visitFuncCall(funcCall: FuncCall, param: P): R {
    throw new Error("Should not reach here");
  }
  visitBinOp(binOp: BinOp, param: P): R {
    throw new Error("Should not reach here");
  }
  visitListLit(listLit: ListLit, param: P): R {
    throw new Error("Should not reach here");
  }
  visitTupleLit(tupleLit: TupleLit, param: P): R {
    throw new Error("Should not reach here");
  }
  visitNatLit(natLit: NatLit, param: P): R {
    throw new Error("Should not reach here");
  }
  visitBoolLit(boolLit: BoolLit, param: P): R {
    throw new Error("Should not reach here");
  }
}
