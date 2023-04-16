import ts from "typescript";
import path from "path";

export default function run(fileName: string) {
  console.log(getOutputType(fileName));
}

function getOutputType(fileName: string): string {
  const fileNameRegex = new RegExp(path.basename(fileName));
  const program = ts.createProgram([fileName], {});
  const checker = program.getTypeChecker();

  let outputType: string = "";

  program.getSourceFiles().forEach((sourceFile) => {
    if (fileNameRegex.test(sourceFile.fileName))
      ts.forEachChild(sourceFile, visit);
  });

  return outputType;

  function visit(node: ts.Node) {
    if (ts.isTypeAliasDeclaration(node) && node.name.text === "main") {
      const symbol = checker.getSymbolAtLocation(node.name);

      if (symbol) {
        const type = checker.getDeclaredTypeOfSymbol(symbol);
        outputType = typeToString(type, checker)[0];
      }
    }
  }
}

function typeToString(
  type: ts.Type,
  checker: ts.TypeChecker
): [string, string] {
  if (isLiteralType(type)) {
    const str = checker.typeToString(type);
    switch (str) {
      case "never":
        return ["Never", "never"];
      case "0":
        return [str, "Nat"];
      case "true":
      case "false":
        return [capitalize(str), "Bool"];
      default:
        return [capitalize(str), capitalize(str)];
    }
  }

  if (isTypeReference(type)) {
    const symbol = type.getSymbol();
    if (symbol && symbol.name == "S") {
      let args = checker.getTypeArguments(type);
      let i = 0;
      while (args && args.length > 0 && isTypeReference(args[0])) {
        i++;
        args = checker.getTypeArguments(args[0]);
      }
      return [String(i), "Nat"];
    }

    let args = checker.getTypeArguments(type);
    if (args && args.length === 2 && isTypeReference(args[1])) {
      const array: string[] = [];
      let arrayArgs = args;
      let lastType: string | null = null;
      let isArray = true;
      while (
        arrayArgs &&
        arrayArgs.length === 2 &&
        isTypeReference(arrayArgs[1])
      ) {
        const res = typeToString(arrayArgs[0], checker);
        if (lastType !== null && lastType !== res[1]) {
          isArray = false;
          break;
        }

        array.push(res[0]);
        lastType = res[1];
        const next = arrayArgs[1];
        arrayArgs = checker.getTypeArguments(next);
        if (
          !arrayArgs ||
          (arrayArgs.length !== 2 && arrayArgs.length !== 0) ||
          (arrayArgs.length === 2 && !isTypeReference(arrayArgs[1])) ||
          (arrayArgs.length === 0 && isLiteralType(next))
        ) {
          isArray = false;
          break;
        }
      }

      if (isArray) return [`[${array.join(", ")}]`, `[${lastType}]`];
    }

    if (args && args.length > 0) {
      const tuple = args.map((arg) => typeToString(arg, checker));
      if (tuple.length === 1) {
        tuple[0][0] += ",";
        tuple[0][1] += ",";
      }

      return [
        `(${tuple.map((pair) => pair[0]).join(", ")})`,
        `(${tuple.map((pair) => pair[1]).join(", ")})`,
      ];
    }
  }

  const str = checker.typeToString(type);
  return [capitalize(str), str];
}

function isTypeReference(type: ts.Type): type is ts.TypeReference {
  return "typeArguments" in type;
}

function isLiteralType(type: ts.Type): type is ts.LiteralType {
  return "freshType" in type;
}

function capitalize(str: string): string {
  return str.slice(0, 1).toUpperCase() + str.slice(1);
}
