import { ClassShape, ClassType } from './class';
import { ShapeGuards } from './guards';
import { Annotation, decorate, Decorated } from './metadata';
import { Visitor } from './visitor';

// Track this issue for the emitting of generic metadata by the TS compiler.
// https://github.com/Microsoft/TypeScript/issues/7169

/**
 * Root of the Shape type-system.
 */
export abstract class Shape {
  public static of<T extends Shape | ClassType>(items: T): Shape.Of<T> {
    return (ShapeGuards.isShape(items) ? items : ClassShape.ofType(items as ClassType)) as Shape.Of<T>;
  }

  public readonly NodeType: 'shape' = 'shape';

  public abstract readonly Kind: keyof Visitor;

  public visit<V extends Visitor>(visitor: V): ReturnType<V[this['Kind']]> {
    return visitor[this.Kind](this as any) as ReturnType<V[this['Kind']]>;
  }

  public meta<M extends Annotation<this, A>, A>(metadata: M): this extends Decorated<this, infer M2> ? Decorated<this, M & M2> : Decorated<this, M> {
    return decorate(this, metadata) as any;
  }
}
export namespace Shape {
  export type Of<T extends Shape | ClassType> = T extends ClassType<any> ? ClassShape<T> : T;
}