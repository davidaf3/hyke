# hyke
A programming language that runs on the TypeScript type system.

## Installation
Make sure you have Node.js and NPM installed. Then, clone this repo and run the following commands:

```bash
cd transpiler
npm i
npm run build
npm i . -g
```

To check the installation was successful, run `hyke`. You should get the following output:

```
Usage: hyke command filename
```

## Running
To compile a source file run the following command:

```bash
hyke c <filepath>
```

If the compiler didn't find any errors, a file called `out.ts` will have been generated in the current folder.
To run this file, use the follwing command:

```bash
hyke r out.ts
```

The output of the program will be written to the terminal.