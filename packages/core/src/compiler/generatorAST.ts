import * as t from "@babel/types";
import { StaticSubtree } from "./analyzer";

export function generateAST(subtree: StaticSubtree): t.JSXElement {
  // Build the data prop as an object expression
  const dataProperties = subtree.dynamicBindings.map((binding) => {
    return t.objectProperty(
      t.stringLiteral(binding.selector),
      binding.expression,
    );
  });

  const eventProperties = subtree.eventBindings.map((binding) => {
    return t.objectProperty(t.stringLiteral(binding.id), binding.handler);
  });

  const bindingsJsonNode = t.arrayExpression(
    subtree.dynamicBindings.map((b) =>
      t.objectExpression([
        t.objectProperty(t.identifier("selector"), t.stringLiteral(b.selector)),
        t.objectProperty(
          t.identifier("props"),
          t.arrayExpression([t.stringLiteral(b.prop)]),
        ),
      ]),
    ),
  );

  const eventsJsonNode = t.arrayExpression(
    subtree.eventBindings.map((e) =>
      t.objectExpression([
        t.objectProperty(t.identifier("selector"), t.stringLiteral(e.selector)),
        t.objectProperty(t.identifier("type"), t.stringLiteral(e.type)),
        t.objectProperty(t.identifier("id"), t.stringLiteral(e.id)),
      ]),
    ),
  );

  // Build the template prop
  const templateProp = t.objectExpression([
    t.objectProperty(t.identifier("html"), t.stringLiteral(subtree.html)),
    t.objectProperty(
      t.identifier("dynamic"),
      t.objectExpression([
        t.objectProperty(t.identifier("bindings"), bindingsJsonNode),
        t.objectProperty(t.identifier("events"), eventsJsonNode),
      ]),
    ),
  ]);

  // Build the data prop
  const dataProp = t.objectExpression(dataProperties);

  // Build the events prop
  const eventsProp = t.objectExpression(eventProperties);

  // Create JSX attributes
  const jsxAttributes: t.JSXAttribute[] = [
    t.jsxAttribute(
      t.jsxIdentifier("template"),
      t.jsxExpressionContainer(templateProp),
    ),
    t.jsxAttribute(t.jsxIdentifier("data"), t.jsxExpressionContainer(dataProp)),
    t.jsxAttribute(
      t.jsxIdentifier("events"),
      t.jsxExpressionContainer(eventsProp),
    ),
  ];

  // Create the JSX element: <ReactlessNode template={...} data={...} events={...} />
  const jsxElement = t.jsxElement(
    t.jsxOpeningElement(
      t.jsxIdentifier("ReactlessNode"),
      jsxAttributes,
      true, // self-closing
    ),
    null, // no closing element (self-closing)
    [], // no children
    true, // self-closing
  );

  return jsxElement;
}
