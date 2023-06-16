# 🗻 hyke
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

The output of the program will be printed to standard output.

## Language specification
A hyke program consists of one or more function definitions. Every program must define a `main` function with no parameters,
which is the entrypoint to the program and its return value will be printed to standard output. A function definition takes
the following form:

```
sum :: [Nat] -> Nat
sum [] = 0
sum (x:xs) = x + sum xs
```

The first line defines the function signature (the name, parameter types and return type) and the rest defines the function body (a list of equations).
These lines can appear in any order and in any part of the program.

### Function signatures
A function signature is defined by an identifier, the `::` token, optionally a list of types followed by an arrow `->` and a single type. 
The identifier specifies the name of the function, while the list of types defines the parameter types and the last type defines the return type.
Parameters can have default values, and those values are defined by appending to the parameter type a `=` token followed by a constant literal or
any other constant expression wrapped in parentheses. For instance, take the previously shown function signature:

```
sum :: [Nat] Nat = 0 -> Nat
```

Here we define a function called `sum` which returns a natural number and has two parameters, a list of natural numbers and a natural number with
a default value of `0`.

Return types can also have default values. Those values will be used as return values if there are no equations associated to the function. In this
case, the default value can be any expression, not just a constant. Still, it must be a literal or any other expression wrapped in parentheses.

#### Types
Currently hyke supports the following types:

- `Nat`: natural numbers, including zero.
- `Bool`: boolean values, either `True` or `False`.
- Lists: defined by wrapping the contained type in brackets, i. e. `[[Nat]]`, a list of lists of natural numbers.
- Tuples: defined by the list of contained values separated by commas and wrapped in parentheses, i. e. `(Nat, Bool, (Nat, [Nat]))`,
a tuple which contains a natural number, a boolean value and another tuple.

### Equations
The body of a function is specified by a list of equations. An equation looks like this:

```
sum (x:xs) acc = sum xs (acc + x)
```

The left-hand side of the equal symbol contains the identifier of the function followed by a list of expressions, while the
right-hand side contains a expression.

#### Left-hand side
The expressions on the left-hand side follow some special rules. First, they can only be identifiers or  patterns. If they are identifiers, they will serve as parameter
names and will hold the values of the parameters in those positions to be used in patterns and in the right-hand side expression. For instance, if we define the 
function `f` as `f a b = a + b` and call it with `f 1 2`, `a` will hold `1` and `b` will hold `2`, so the return value will be `3`. Parameter names are shared between 
equations and are unique, so two equations can't declare different names for the same parameter. If there are two or more identifiers with the same name in the left-hand
side of an equation, they will act as patterns to test for equality instead of parameter names. For instance, we can define the following function:

```
f :: Nat -> Nat -> Nat
f a a = a
f a b = b
```

If we call it with `f 1 1` the return value will be `1`, but if we call it with `f 1 2`, then it will return `2`. The identifiers
in these patterns must be equal to the name of one of the parameters in those positions.

On the other hand, patterns are literals or parentheses-enclosed expressions that decide which equation will be used to compute the
return value when a function is called. Equations are evaluated from top to bottom, so the first one whose patterns match the function
call arguments will determine the return value of the function, that value beign the value of the right-hand side expression. For
instance, if we define the following function:

```
f :: Nat -> Bool -> Nat
f a True = 1
f a (a == 2) = 2
f a b = 3
```

If we call `f` with `f 5 True` it will match the first equation and return `1`. If we call it with `f 5 False` it will return `2`
because `a` is not equal to `2`, so the pattern `(a == 2)` matches `False`. And if we call it with `f 2 False` it will return `3`
because it only matches the last equations, which doesn't have any patterns so it matches everything.

Identifiers inside patterns serve a special purpoes. If they are equal to the name of a paremeter they will hold the value of that
parameter. But if they don't, they will serve as variable declarations, setting their value to the one that makes the pattern
match the parameter in its positions.

Patterns can be complex expressions, but are limited by TypeScript's inference capabilites and the fact that inferring the value of
some variables would be impossible. For instance, if we have a function `fib :: Nat -> Nat` that returns the n-th Fibonacci number
and we define another function `inversefib` like this:

```
inversefib :: Nat -> Nat
inversefib (fib n) = n
```

Calling `inversefib 8` won't return 6, it will return `Never`. Note that the syntax of the left-hand side of an equation is the same
as a function call, but the semantics change.

#### Right-hand side
The right-hand side of an equation must be a expression. That expression will be the return value of the funcion when it is called with
a list of parameters that matches the left-hand side.

### Expressions
An expression can be a literal, an identifier, a binary operation or a function call.

#### Literals
There are four kinds of literals:
- Boolean literals: `True` and `False`. They represent the true and false boolean values.
- Natural number literals: any string of digits with at least length one.
- Tuple literals: a list of expressions separated by commas (`,`) and inside parentheses. If a tuple has only one element, it must be
followed by a comma before the closing parenthesis. Empty tuples are not allowed.
- List literals: a list of expressions separated by commas (`,`) and inside square brackets. The empty list literal is `[]`.

#### Identifiers
Identifiers start with a letter followedand can contain any alphanumeric character in the following positions.

#### Binary operations
Binary operations are made up of two expressions separated by an operator (infix notation). The following operators are supported:
- `+ :: Nat Nat -> Nat`: natural number addition.
- `- :: Nat Nat -> Nat`: natural number substraction.
- `* :: Nat Nat -> Nat`: natural number product.
- `< :: Nat Nat -> Bool`: less than.
- `<= :: Nat Nat -> Bool`: less or equal than.
- `== :: Nat Nat -> Bool`: equal.
- `: :: a [a] -> [a]`: addition of an element to the start of a list.
- `!! :: [a] Nat -> a`: list indexing.

All operators have the same precedence and are evaluated from left to right. Operations inside parentheses are avaluated first.

#### Function calls
Function calls are defined by an identifier (the function name) and a list of identifiers, literals or parentheses-enclosed expressions
(the call arguments). Function calls take precedence before binary operations. For instance, given the expression `f a 1 + 2`, the
function call (`f a 1`) will be evaluated before the addition.