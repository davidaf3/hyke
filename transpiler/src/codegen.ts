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
import { AbstractVisitor } from "./visitor";
import { readFileSync } from "fs";
import path from "path";

export class CodeGenVisitor extends AbstractVisitor<null, string> {
  visitProgram(program: Program): string {
    const preludePath = path.join(__dirname, "..", "resources", "prelude.ts");
    const prelude = readFileSync(preludePath, {
      encoding: "utf-8",
    });

    return (
      prelude +
      program.funcDefs.map((funcDef) => funcDef.accept(this, null)).join("")
    );
  }

  visitFuncDef(funcDef: FuncDef): string {
    let code = "type " + funcDef.name;

    if (funcDef.paramNames.length > 0) {
      code += `<${funcDef.paramNames
        .map(
          (name, i) =>
            `${name} extends ${funcDef.paramTypes[i].accept(this, null)}`
        )
        .join(", ")}>`;
    }

    code += " =\n";
    code += funcDef.body
      .map((funcBody) => `\t${funcBody.accept(this, null)}\n`)
      .join("");
    code +=
      "\t" + (funcDef.default ? funcDef.default.accept(this, null) : "never");
    return code + ";\n\n";
  }

  visitFuncBody(funcBody: FuncBody): string {
    const patL: string[] = [];
    const patR: string[] = [];

    funcBody.repeatedSymbols.forEach((idxs) => {
      idxs.slice(1).forEach((idx) => {
        if (funcBody.def) {
          patL.push(funcBody.def.paramNames[idx]);
          patR.push(funcBody.def.paramNames[idxs[0]]);
        }
      });
    });

    funcBody.params.forEach((param, i) => {
      if ("content" in param && funcBody.def) {
        patL.push(funcBody.def.paramNames[i]);
        patR.push(param.accept(this, null));
      }
    });

    const body = funcBody.body.accept(this, null);

    if (patL.length > 0)
      return `[${patL.join(", ")}] extends [${patR.join(", ")}] ? ${body} :`;
    return body;
  }

  visitFuncType(funcType: FuncType): string {
    let code = funcType.type.accept(this, null);
    if (funcType.defaultVal)
      code += ` = ${funcType.defaultVal.accept(this, null)}`;
    return code;
  }

  visitType(type: Type): string {
    if (type.name === "Tuple")
      return `[${this.typeParamsToString(type.params)}]`;

    let code = type.name;
    if (type.params.length > 0)
      code += `<${this.typeParamsToString(type.params)}>`;
    return code;
  }

  typeParamsToString(params: Type[]): string {
    return params.map((type) => type.accept(this, null)).join(", ");
  }

  visitPattern(pattern: Pattern): string {
    return pattern.content.accept(this, null);
  }

  visitSymbol(symbol: Symbol): string {
    if (symbol.insidePattern)
      return `infer ${symbol.name} extends ${symbol.type?.accept(this, null)}`;
    return symbol.name;
  }

  visitFuncCall(funcCall: FuncCall): string {
    return `${funcCall.name}<${funcCall.args
      .map((arg) => arg.accept(this, null))
      .join(", ")}>`;
  }

  visitBinOp(binOp: BinOp): string {
    const leftCode = binOp.left.accept(this, null);
    const rightCode = binOp.right.accept(this, null);

    if (binOp.op === ":") return `[${leftCode}, ${rightCode}]`;

    let opName;
    switch (binOp.op) {
      case "!!":
        opName = "ListGet";
        break;
      case "+":
        opName = "Addition";
        break;
      case "*":
        opName = "Multiplication";
        break;
      case "-":
        opName = "Substraction";
        break;
      case "<":
        opName = "LT";
        break;
      case "<=":
        opName = "LTE";
        break;
      case "==":
        opName = "Eq";
        break;
      default:
        throw new Error();
    }

    return `${opName}<${leftCode}, ${rightCode}>`;
  }

  visitListLit(listLit: ListLit): string {
    return this.makeList(listLit.values);
  }

  visitTupleLit(tupleLit: TupleLit, param: null): string {
    return `[${tupleLit.values
      .map((value) => value.accept(this, null))
      .join(", ")}]`;
  }

  visitNatLit(natLit: NatLit): string {
    return this.makeNumber(natLit.value);
  }

  visitBoolLit(boolLit: BoolLit): string {
    return boolLit.value ? "true" : "false";
  }

  makeList(items: Expr[], i: number = 0): string {
    if (i === items.length) return "[]";

    const itemCode = items[i].accept(this, null);
    return `[${itemCode}, ${this.makeList(items, i + 1)}]`;
  }

  makeNumber(n: number): string {
    if (n === 0) return "0";

    return `S<${this.makeNumber(n - 1)}>`;
  }
}
