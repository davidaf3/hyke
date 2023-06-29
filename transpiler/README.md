# hyke transpiler

The hyke transpailer transforms hyke programs into TypeScript.

## Command line usage

To transpile a source file run the following command:

```bash
hyke c <filepath>
```

If the transpiler doesn't find any errors, a file called `out.ts` will be generated in the current folder.
To run this file, use the following command:

```bash
hyke r out.ts
```

The output of the program will be written to the terminal.

## API

This module exports two functions: `compile` and `run`. `compile` transforms a hyke program into TypeScript. It accepts two arguments:

- `source`: the `string` corresponding to the program source code.
- `errorHandler`: a function that will be called if any error is found.

`compile` returns a `string` with the source code of the resulting TypeScript program or `""` if an error was found. Here is an example of its usage:

```js
import { compile } from "hyke";

const tsSource = compile(hykeSource, (error) => console.log(error));
```

On the other hand, `run` computes the output of the transpiled program. It takes only one argument:

- `sourceCode`: the TypeScript source code of the program.

`run` returns a `string` with the output of the program. Here is an example of its usage:

```js
import { run } from "hyke";

const output = run(tsSource);
```
