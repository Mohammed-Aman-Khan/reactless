import { analyze } from "./analyzer";
import { generate } from "./generator";

export * from "./analyzer";
export * from "./generator";
export * from "./generatorAST";

export function transform(code: string) {
  const analysis = analyze(code);
  return generate(code, analysis);
}
