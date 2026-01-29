import { parseSync } from "oxc-parser";

// Oxc AST types (compatible with ESTree/Babel)
type Node = any;
type Expression = any;
type JSXElement = any;
type JSXFragment = any;

// Type checking helper functions for Oxc AST
const isJSXElement = (node: Node): node is JSXElement =>
  node?.type === "JSXElement";
const isJSXFragment = (node: Node): node is JSXFragment =>
  node?.type === "JSXFragment";
const isJSXText = (node: Node): boolean => node?.type === "JSXText";
const isJSXExpressionContainer = (node: Node): boolean =>
  node?.type === "JSXExpressionContainer";
const isJSXSpreadAttribute = (node: Node): boolean =>
  node?.type === "JSXSpreadAttribute";
const isJSXIdentifier = (node: Node): boolean => node?.type === "JSXIdentifier";
const isJSXMemberExpression = (node: Node): boolean =>
  node?.type === "JSXMemberExpression";
const isJSXNamespacedName = (node: Node): boolean =>
  node?.type === "JSXNamespacedName";
const isStringLiteral = (node: Node): boolean => node?.type === "StringLiteral";
const isNumericLiteral = (node: Node): boolean =>
  node?.type === "NumericLiteral" || node?.type === "NumberLiteral";
const isBooleanLiteral = (node: Node): boolean =>
  node?.type === "BooleanLiteral";
const isNullLiteral = (node: Node): boolean => node?.type === "NullLiteral";
const isBinaryExpression = (node: Node): boolean =>
  node?.type === "BinaryExpression";
const isUnaryExpression = (node: Node): boolean =>
  node?.type === "UnaryExpression";
const isTemplateLiteral = (node: Node): boolean =>
  node?.type === "TemplateLiteral";
const isCallExpression = (node: Node): boolean =>
  node?.type === "CallExpression";
const isConditionalExpression = (node: Node): boolean =>
  node?.type === "ConditionalExpression";
const isLogicalExpression = (node: Node): boolean =>
  node?.type === "LogicalExpression";
const isExpression = (node: Node): boolean => {
  if (!node) return false;
  const exprTypes = [
    "Identifier",
    "StringLiteral",
    "NumericLiteral",
    "NumberLiteral",
    "BooleanLiteral",
    "NullLiteral",
    "BinaryExpression",
    "UnaryExpression",
    "TemplateLiteral",
    "MemberExpression",
    "CallExpression",
    "ArrowFunctionExpression",
    "FunctionExpression",
    "ObjectExpression",
    "ArrayExpression",
    "ConditionalExpression",
    "LogicalExpression",
    "JSXElement",
    "JSXFragment",
  ];
  return exprTypes.includes(node.type);
};

export interface AnalysisResult {
  staticSubtrees: Map<Node, StaticSubtree>;
}

export interface StaticSubtree {
  root: JSXElement;
  html: string;
  dynamicBindings: Binding[];
  eventBindings: EventBinding[];
}

export interface Binding {
  selector: string;
  prop: string;
  expression: Expression; // The expression from the AST to put in 'data'
}

export interface EventBinding {
  selector: string;
  type: string; // e.g., 'click'
  handler: Expression; // The handler expression
  id: string; // unique event id
}

let bindingIdCounter = 0;

const ESC_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (m) => ESC_MAP[m] || m);
}

// Check if an expression is a compile-time constant
function isConstantExpression(expr: Expression): boolean {
  if (
    isStringLiteral(expr) ||
    isNumericLiteral(expr) ||
    isBooleanLiteral(expr) ||
    isNullLiteral(expr)
  ) {
    return true;
  }

  // Simple binary expressions with constants (e.g., 1 + 2)
  if (isBinaryExpression(expr)) {
    return (
      isConstantExpression(expr.left as Expression) &&
      isConstantExpression(expr.right as Expression)
    );
  }

  // Unary expressions (e.g., -5, !true)
  if (isUnaryExpression(expr)) {
    return isConstantExpression(expr.argument as Expression);
  }

  // Template literals with no expressions
  if (isTemplateLiteral(expr)) {
    return expr.expressions.length === 0;
  }

  return false;
}

// Evaluate a constant expression at compile time
function evaluateConstant(expr: Expression): string | number | boolean | null {
  if (isStringLiteral(expr)) return expr.value;
  if (isNumericLiteral(expr)) return expr.value;
  if (isBooleanLiteral(expr)) return expr.value;
  if (isNullLiteral(expr)) return null;

  if (isBinaryExpression(expr)) {
    const left = evaluateConstant(expr.left as Expression);
    const right = evaluateConstant(expr.right as Expression);
    if (left === null || right === null) return null;

    switch (expr.operator) {
      case "+":
        return (left as any) + (right as any);
      case "-":
        return (left as any) - (right as any);
      case "*":
        return (left as any) * (right as any);
      case "/":
        return (left as any) / (right as any);
      case "%":
        return (left as any) % (right as any);
      default:
        return null;
    }
  }

  if (isUnaryExpression(expr)) {
    const arg = evaluateConstant(expr.argument as Expression);
    if (arg === null) return null;

    switch (expr.operator) {
      case "-":
        return -(arg as number);
      case "+":
        return +(arg as number);
      case "!":
        return !arg;
      default:
        return null;
    }
  }

  if (isTemplateLiteral(expr) && expr.expressions.length === 0) {
    return expr.quasis.map((q: any) => q.value.cooked).join("");
  }

  return null;
}

// Custom AST traversal function for Oxc
function traverseAST(
  node: Node,
  visitor: (node: Node) => boolean | void,
  visited: Set<Node> = new Set(),
): void {
  if (!node || visited.has(node)) return;

  // Call visitor, if it returns false, skip this subtree
  const shouldContinue = visitor(node);
  if (shouldContinue === false) return;

  visited.add(node);

  // Traverse children based on node type
  if (Array.isArray(node)) {
    node.forEach((child) => traverseAST(child, visitor, visited));
  } else if (typeof node === "object") {
    for (const key in node) {
      if (key === "start" || key === "end" || key === "loc" || key === "range")
        continue;
      const value = node[key];
      if (value && typeof value === "object") {
        traverseAST(value, visitor, visited);
      }
    }
  }
}

export function analyze(code: string): AnalysisResult {
  const parseResult = parseSync("source.tsx", code);
  const ast = parseResult.program;

  const staticSubtrees = new Map<Node, StaticSubtree>();
  const visitedNodes = new Set<Node>();

  traverseAST(ast, (node) => {
    if (isJSXElement(node)) {
      if (visitedNodes.has(node)) return false;
      const result = processNode(node, visitedNodes);
      if (result && result.isOptimizable) {
        staticSubtrees.set(node, {
          root: node,
          html: result.html,
          dynamicBindings: result.bindings,
          eventBindings: result.events,
        });
        return false; // Skip children
      }
    } else if (isJSXFragment(node)) {
      if (visitedNodes.has(node)) return false;
      const result = processNode(node, visitedNodes);
      if (result && result.isOptimizable) {
        staticSubtrees.set(node, {
          root: node as any,
          html: result.html,
          dynamicBindings: result.bindings,
          eventBindings: result.events,
        });
        return false; // Skip children
      }
    }
  });

  return { staticSubtrees };
}

interface ProcessResult {
  isOptimizable: boolean;
  html: string;
  bindings: Binding[];
  events: EventBinding[];
}

export function processNode(
  node: Node,
  visited: Set<Node>,
): ProcessResult | null {
  if (isJSXElement(node)) {
    return processJSXElement(node, visited);
  } else if (isJSXFragment(node)) {
    return processJSXFragment(node, visited);
  } else if (isJSXText(node)) {
    return {
      isOptimizable: true,
      html: escapeHtml((node as any).value),
      bindings: [],
      events: [],
    };
  } else if (isJSXExpressionContainer(node)) {
    const expr = (node as any).expression;

    // Bail out on non-expressions (like JSXEmptyExpression)
    if (!isExpression(expr)) {
      return { isOptimizable: false, html: "", bindings: [], events: [] };
    }

    // Check if expression is a constant that can be inlined
    if (isConstantExpression(expr)) {
      const value = evaluateConstant(expr);
      if (value !== null) {
        return {
          isOptimizable: true,
          html: escapeHtml(String(value)),
          bindings: [],
          events: [],
        };
      }
    }

    // Bail out on CallExpressions (like .map(), .filter(), etc.) as they produce dynamic React elements
    if (isCallExpression(expr)) {
      return { isOptimizable: false, html: "", bindings: [], events: [] };
    }

    // Bail out on JSX elements inside expressions (conditional rendering, etc.)
    if (isJSXElement(expr) || isJSXFragment(expr)) {
      return { isOptimizable: false, html: "", bindings: [], events: [] };
    }

    // Bail out on conditional/logical expressions that might contain JSX
    if (isConditionalExpression(expr) || isLogicalExpression(expr)) {
      return { isOptimizable: false, html: "", bindings: [], events: [] };
    }

    // Only simple expressions (identifiers, member expressions, literals, template literals) are optimizable
    const textBindingId = `rl-txt-${bindingIdCounter++}`;
    return {
      isOptimizable: true,
      html: `<span data-rl="${textBindingId}"></span>`,
      bindings: [
        {
          selector: `[data-rl="${textBindingId}"]`,
          prop: "textContent",
          expression: expr,
        },
      ],
      events: [],
    };
  }
  return { isOptimizable: false, html: "", bindings: [], events: [] };
}

function processJSXFragment(
  node: JSXFragment,
  visited: Set<Node>,
): ProcessResult {
  let html = "";
  const bindings: Binding[] = [];
  const events: EventBinding[] = [];
  let isOptimizable = true;

  for (const child of node.children) {
    visited.add(child);
    const childResult = processNode(child, visited);
    if (!childResult || !childResult.isOptimizable) {
      isOptimizable = false;
      break;
    }
    html += childResult.html;
    bindings.push(...childResult.bindings);
    events.push(...childResult.events);
  }

  return { isOptimizable, html, bindings, events };
}

function processJSXElement(
  node: JSXElement,
  visited: Set<Node>,
): ProcessResult | null {
  const tagName = getTagName(node.openingElement.name);
  if (!tagName || /^[A-Z]/.test(tagName))
    return { isOptimizable: false, html: "", bindings: [], events: [] };

  let html = `<${tagName}`;
  const bindings: Binding[] = [];
  const events: EventBinding[] = [];
  let isOptimizable = true;

  const staticAttrs: string[] = [];
  let elementBindingId: string | null = null;

  for (const attr of node.openingElement.attributes) {
    if (isJSXSpreadAttribute(attr)) {
      return { isOptimizable: false, html: "", bindings: [], events: [] };
    }

    const nameNode = attr.name;
    const name = isJSXIdentifier(nameNode)
      ? nameNode.name
      : isJSXNamespacedName(nameNode)
        ? `${nameNode.namespace.name}:${nameNode.name.name}`
        : "";
    if (!name) continue;

    // BAIL OUT CASES
    if (
      name === "ref" ||
      name === "key" ||
      name === "dangerouslySetInnerHTML"
    ) {
      return { isOptimizable: false, html: "", bindings: [], events: [] };
    }

    if (/^on[A-Z]/.test(name)) {
      if (
        attr.value &&
        isJSXExpressionContainer(attr.value) &&
        isExpression(attr.value.expression)
      ) {
        const eventType = name.toLowerCase().substring(2);
        const eventId = `ev-${bindingIdCounter++}`;
        staticAttrs.push(`data-event="${eventId}"`);
        events.push({
          selector: `[data-event="${eventId}"]`,
          type: eventType,
          handler: attr.value.expression,
          id: eventId,
        });
      } else {
        return { isOptimizable: false, html: "", bindings: [], events: [] };
      }
      continue;
    }

    const attrName = name === "className" ? "class" : name;

    if (!attr.value) {
      staticAttrs.push(attrName);
    } else if (isStringLiteral(attr.value)) {
      staticAttrs.push(`${attrName}="${escapeHtml(attr.value.value)}"`);
    } else if (
      isJSXExpressionContainer(attr.value) &&
      isExpression(attr.value.expression)
    ) {
      if (!elementBindingId) {
        elementBindingId = `rl-${bindingIdCounter++}`;
        staticAttrs.push(`data-rl="${elementBindingId}"`);
      }
      bindings.push({
        selector: `[data-rl="${elementBindingId}"]`,
        prop: attrName,
        expression: attr.value.expression,
      });
    }
  }

  if (staticAttrs.length > 0) html += " " + staticAttrs.join(" ");

  if (node.selfClosing) {
    html += " />";
  } else {
    html += ">";
    // Text Normalization: Merge adjacent JSXText nodes? Babel usually does this, but let's be safe.
    for (const child of node.children) {
      visited.add(child);
      const childResult = processNode(child, visited);
      if (!childResult || !childResult.isOptimizable) {
        isOptimizable = false;
        break;
      }
      html += childResult.html;
      bindings.push(...childResult.bindings);
      events.push(...childResult.events);
    }
    html += `</${tagName}>`;
  }

  return { isOptimizable, html, bindings, events };
}

function getTagName(name: Node): string | null {
  if (isJSXIdentifier(name)) return name.name;
  if (isJSXMemberExpression(name)) {
    const object = isJSXIdentifier(name.object) ? name.object.name : "";
    const property = name.property.name;
    return object && property ? `${object}.${property}` : null;
  }
  return null;
}
