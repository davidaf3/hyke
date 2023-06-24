export default `export type List<T> = [T, List<T>] | [];

export type Bool = true | false;

export type Nat = 0 | S<Nat>;

export interface S<T extends Nat> { _: T };

export type Eq<A extends Nat, B extends Nat> = 
  [A, B] extends [0, 0] ? true :
  [A, B] extends [0, S<infer _>] ? false :
  [A, B] extends [S<infer _>, 0] ? false :
  [A, B] extends [S<infer PA>, S<infer PB>] ? Eq<PA, PB> : 
  never;

export type LTE<A extends Nat, B extends Nat> = 
  A extends 0 ? true : 
  B extends 0 ? false : 
  [A, B] extends [S<infer PA>, S<infer PB>] ? LTE<PA, PB> : 
  never;

export type LT<A extends Nat, B extends Nat> = 
  [A, B] extends [0, 0] ? false :
  [A, B] extends [0, S<infer _>] ? true :
  [A, B] extends [S<infer _>, 0] ? false :
  [A, B] extends [S<infer PA>, S<infer PB>] ? LT<PA, PB> : 
  never;

export type Addition<A extends Nat, B extends Nat> = 
  B extends 0 ? A : 
  B extends S<infer PB> ? S<Addition<A, PB>> : 
  never;

export type Substraction<A extends Nat, B extends Nat> = 
  B extends 0 ? A : 
  A extends 0 ? 0 : 
  [A, B] extends [S<infer PA>, S<infer PB>] ? Substraction<PA, PB> : 
  never;

export type Multiplication<A extends Nat, B extends Nat> = 
  B extends 0 ? 0 : 
  B extends S<infer PB> ? 
    Multiplication<A, PB> extends infer Prod extends Nat ? 
      Addition<A, Prod> :
    never : 
  never;

export type ListGet<L extends List<any>, I extends Nat, C extends Nat = 0> = 
  [I, L] extends [C, [infer H, infer Rest extends List<any>]] ? H :
  L extends [infer H, infer Rest extends List<any>] ? ListGet<Rest, I, S<C>> :
  never

//-------------------------- End of prelude --------------------------


`;