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
import { NameError, TypeError } from "./error";
import { AbstractVisitor } from "./visitor";

interface Context {
  insidePattern: boolean;
  funcDef: FuncDef | null;
}

export class IdentificationVisitor extends AbstractVisitor<Context, void> {
  private funcs: Map<string, FuncDef> = new Map();

  visitProgram(program: Program, ctx: Context): void {
    program.funcDefs.forEach((funcDef) => funcDef.accept(this, ctx));
    program.funcBodies.forEach((funcBody) => funcBody.accept(this, ctx));

    program.funcDefs.forEach((funcDef) => {
      funcDef.body.forEach((funcBody) => {
        funcBody.repeatedSymbols.forEach((idxs, name) => {
          const param = funcBody.params[idxs[0]];

          if (!funcDef.paramNames.includes(name)) {
            throw new NameError(
              `Parameter ${name} not declared`,
              param.line,
              param.column
            );
          }

          if (!idxs.includes(funcDef.paramNames.indexOf(name))) {
            throw new NameError(
              `Name ${name} doesn't match a parameter in positions ${idxs.join(
                ", "
              )}`,
              param.line,
              param.column
            );
          }
        });
      });
    });
  }

  visitFuncDef(funcDef: FuncDef, ctx: Context): void {
    this.funcs.set(funcDef.name, funcDef);
  }

  visitFuncBody(funcBody: FuncBody, ctx: Context): void {
    const funcDef = this.funcs.get(funcBody.name);
    if (!funcDef)
      throw new NameError(
        `Function ${funcBody.name} not declared`,
        funcBody.line,
        funcBody.column
      );

    funcBody.def = funcDef;

    const paramNames: Map<string, number[]> = new Map();
    funcBody.params.forEach((param, i) => {
      if ("name" in param) {
        const stored = paramNames.get(param.name);
        if (stored) stored.push(i);
        else paramNames.set(param.name, [i]);
        return;
      }
    });

    paramNames.forEach((idxs, name) => {
      if (idxs.length > 1) {
        funcBody.repeatedSymbols.set(name, idxs);
        return;
      }

      const idx = idxs[0];
      const param = funcBody.params[idx];

      if (
        funcDef.userDefinedParamNames.has(idx) &&
        funcDef.userDefinedParamNames.get(idx) !== name
      ) {
        const current = funcDef.userDefinedParamNames.get(idx);
        throw new NameError(
          `Renaming of parameter ${current}`,
          param.line,
          param.column
        );
      }

      funcDef.userDefinedParamNames.forEach((other, otherIdx) => {
        if (other === name && otherIdx !== idx) {
          throw new NameError(
            `Parameter name ${name} already in use`,
            param.line,
            param.column
          );
        }
      });

      funcDef.userDefinedParamNames.set(idx, name);
      funcDef.paramNames[idx] = name;
    });

    if (paramNames.size === funcDef.paramNames.length)
      funcDef.default = funcBody;
    else funcDef.body.push(funcBody);

    const funcCtx = { ...ctx, funcDef };
    funcBody.params.forEach((param) => param.accept(this, funcCtx));
    funcBody.body.accept(this, funcCtx);
  }

  visitPattern(pattern: Pattern, ctx: Context): void {
    pattern.content.accept(this, { ...ctx, insidePattern: true });
  }

  visitBinOp(binOp: BinOp, ctx: Context): void {
    binOp.left.accept(this, ctx);
    binOp.right.accept(this, ctx);
  }

  visitNatLit(natLit: NatLit, ctx: Context): void {}

  visitBoolLit(boolLit: BoolLit, ctx: Context): void {}

  visitListLit(listLit: ListLit, ctx: Context): void {
    listLit.values.forEach((value) => value.accept(this, ctx));
  }

  visitTupleLit(tupleLit: TupleLit, ctx: Context): void {
    tupleLit.values.forEach((value) => value.accept(this, ctx));
  }

  visitFuncCall(funcCall: FuncCall, ctx: Context): void {
    const def = this.funcs.get(funcCall.name);
    if (!def)
      throw new NameError(
        `Function ${funcCall.name} not declared`,
        funcCall.line,
        funcCall.column
      );

    funcCall.def = def;
    funcCall.args.forEach((arg) => arg.accept(this, ctx));
  }

  visitSymbol(symbol: Symbol, ctx: Context): void {
    symbol.scope = ctx.funcDef;
    if (!symbol.scope || !symbol.scope.paramNames.includes(symbol.name))
      symbol.insidePattern = ctx.insidePattern;
  }
}

export class TypeCheckingVisitor extends AbstractVisitor<Type | null, void> {
  private symbolTypes: Map<string, Type> = new Map();

  visitProgram(program: Program, inferredType: Type | null): void {
    program.funcDefs.forEach((funcDef) => funcDef.accept(this, inferredType));
    program.funcBodies.forEach((funcBody) =>
      funcBody.accept(this, inferredType)
    );
  }

  visitFuncDef(funcDef: FuncDef, inferredType: Type | null): void {
    funcDef.paramTypes.forEach((paramType, i) =>
      paramType.defaultVal?.accept(this, paramType.type)
    );
  }

  visitFuncBody(funcBody: FuncBody, inferredType: Type | null): void {
    funcBody.params.forEach((param, i) =>
      param.accept(this, funcBody.def?.paramTypes[i].type ?? null)
    );
    funcBody.body.accept(this, funcBody.def?.returnType ?? null);
  }

  visitPattern(pattern: Pattern, inferredType: Type | null): void {
    pattern.content.accept(this, inferredType);
  }

  visitBinOp(binOp: BinOp, inferredType: Type | null): void {
    if (!inferredType) throw new Error();

    binOp.type = inferredType;

    switch (binOp.op) {
      case ":":
        if (inferredType.name !== "List")
          throw new TypeError(
            "Invalid type for list push, should be list",
            binOp.line,
            binOp.column
          );
        binOp.left.accept(this, inferredType.params[0]);
        binOp.right.accept(this, inferredType);
        break;
      case "!!":
        binOp.left.accept(this, new Type("List", [inferredType]));
        binOp.right.accept(this, new Type("Nat", []));
        break;
      case "+":
      case "-":
      case "*":
      case "/":
        if (!this.typesEqual(inferredType, new Type("Nat", []))) {
          throw new TypeError(
            `Expected ${inferredType}, found binary operation returning Nat`,
            binOp.line,
            binOp.column
          );
        }
        binOp.left.accept(this, inferredType);
        binOp.right.accept(this, inferredType);
        break;
      case "<":
      case "<=":
      case "==":
        if (!this.typesEqual(inferredType, new Type("Bool", []))) {
          throw new TypeError(
            `Expected ${inferredType}, found binary operation returning Bool`,
            binOp.line,
            binOp.column
          );
        }
        binOp.left.accept(this, new Type("Nat", []));
        binOp.right.accept(this, new Type("Nat", []));
        break;
    }
  }

  visitNatLit(natLit: NatLit, inferredType: Type | null): void {
    if (!inferredType) throw new Error();

    if (!this.typesEqual(inferredType, new Type("Nat", [])))
      throw new TypeError(
        `Expected ${inferredType}, found natural literal`,
        natLit.line,
        natLit.column
      );
  }

  visitBoolLit(boolLit: BoolLit, inferredType: Type | null): void {
    if (!inferredType) throw new Error();

    if (!this.typesEqual(inferredType, new Type("Bool", [])))
      throw new TypeError(
        `Expected ${inferredType}, found boolean literal`,
        boolLit.line,
        boolLit.column
      );
  }

  visitListLit(listLit: ListLit, inferredType: Type | null): void {
    if (!inferredType) throw new Error();

    if (inferredType.name !== "List")
      throw new TypeError(
        `Expected ${inferredType}, found list literal`,
        listLit.line,
        listLit.column
      );

    listLit.type = inferredType;
    listLit.values.forEach((value) =>
      value.accept(this, inferredType.params[0])
    );
  }

  visitTupleLit(tupleLit: TupleLit, inferredType: Type | null): void {
    if (!inferredType) throw new Error();

    if (inferredType.name !== "Tuple")
      throw new TypeError(
        `Expected ${inferredType}, found tuple literal`,
        tupleLit.line,
        tupleLit.column
      );

    if (inferredType.params.length !== tupleLit.values.length)
      throw new TypeError(
        `Expected ${inferredType}, found ${tupleLit.values.length}-tuple literal`,
        tupleLit.line,
        tupleLit.column
      );

    tupleLit.type = inferredType;
    tupleLit.values.forEach((value, i) =>
      value.accept(this, inferredType.params[i])
    );
  }

  visitFuncCall(funcCall: FuncCall, inferredType: Type | null): void {
    const def = funcCall.def;
    if (!def || !inferredType) throw new Error();

    if (!this.typesEqual(inferredType, def.returnType))
      throw new TypeError(
        `Expected ${inferredType}, found function call returning ${def.returnType}`,
        funcCall.line,
        funcCall.column
      );

    funcCall.type = inferredType;
    funcCall.args.forEach((arg, i) => arg.accept(this, def.paramTypes[i].type));
  }

  visitSymbol(symbol: Symbol, inferredType: Type | null): void {
    if (!inferredType) throw new Error();
    symbol.type = inferredType;

    const symbolType = this.symbolTypes.get(symbol.getScopedName());
    if (!symbolType) {
      this.symbolTypes.set(symbol.getScopedName(), inferredType);
      return;
    }

    if (!this.typesEqual(inferredType, symbolType))
      throw new TypeError(
        `Expected ${inferredType}, but symbol ${symbol.name} has type ${symbolType}`,
        symbol.line,
        symbol.column
      );
  }

  typesEqual(first: Type | null, second: Type | null): boolean {
    return (
      first !== null &&
      second !== null &&
      first.name === second.name &&
      first.params.length === second.params.length &&
      first.params.reduce(
        (prev, param, i) => prev && this.typesEqual(param, second.params[i]),
        true
      )
    );
  }
}
