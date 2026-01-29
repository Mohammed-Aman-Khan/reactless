import { TemplateDefinition } from "./ReactlessNode";
import { globalEventDelegator } from "./events";

interface MountOptions {
  container: HTMLElement;
  template: TemplateDefinition;
  data: Record<string, any>;
  events: Record<string, (e: any) => void>;
}

export interface StaticInstance {
  container: HTMLElement;
  template: TemplateDefinition;
  events: Record<string, (e: any) => void>;
  nodes: Map<string, HTMLElement>;
}

// Template cache to avoid re-parsing HTML
const templateCache = new Map<string, HTMLTemplateElement>();

function getOrCreateTemplate(html: string): HTMLTemplateElement {
  let template = templateCache.get(html);
  if (!template) {
    template = document.createElement("template");
    template.innerHTML = html;
    templateCache.set(html, template);
  }
  return template;
}

export function mountStaticTemplate({
  container,
  template,
  data,
  events,
}: MountOptions): StaticInstance {
  // 1. Get cached template or create new one
  const temp = getOrCreateTemplate(template.html);

  // 2. Clone content (fast operation)
  const clone = temp.content.cloneNode(true) as DocumentFragment;

  // 3. Index dynamic nodes for O(1) access
  const nodeCache = resolveNodes(clone, template);

  // 4. Hydrate static data (initial render)
  updateDomWithData(nodeCache, template, data);

  // 5. Append to container (single reflow)
  container.appendChild(clone);

  // 6. Attach events
  globalEventDelegator.attachContainer(container, events);

  return {
    container,
    template,
    events,
    nodes: nodeCache,
  };
}

function resolveNodes(
  root: ParentNode,
  template: TemplateDefinition,
): Map<string, HTMLElement> {
  const cache = new Map<string, HTMLElement>();

  // Efficiency: Only search for selectors that are actually dynamic
  const selectors = new Set([
    ...template.dynamic.bindings.map((b) => b.selector),
    ...template.dynamic.events.map((e) => e.selector),
  ]);

  selectors.forEach((selector) => {
    const element = root.querySelector(selector) as HTMLElement;
    if (element) {
      cache.set(selector, element);
    }
  });

  return cache;
}

// Batched update scheduling
let pendingUpdates = new Map<StaticInstance, Record<string, any>>();
let updateScheduled = false;

function flushUpdates() {
  if (pendingUpdates.size === 0) {
    updateScheduled = false;
    return;
  }

  const markName = `reactless-batch-${Math.random().toString(36).slice(2, 9)}`;
  if (typeof performance !== "undefined" && performance.mark) {
    performance.mark(`${markName}-start`);
  }

  // Process all pending updates in a single batch
  pendingUpdates.forEach((data, instance) => {
    updateDomWithData(instance.nodes, instance.template, data);
  });

  if (
    typeof performance !== "undefined" &&
    performance.mark &&
    performance.measure
  ) {
    performance.mark(`${markName}-end`);
    performance.measure(
      `Reactless Batch Update`,
      `${markName}-start`,
      `${markName}-end`,
    );
  }

  pendingUpdates.clear();
  updateScheduled = false;
}

export function updateStaticTemplate(
  instance: StaticInstance,
  data: Record<string, any>,
) {
  // Schedule batched update
  pendingUpdates.set(instance, data);

  if (!updateScheduled) {
    updateScheduled = true;
    // Use microtask for immediate updates (faster than rAF for React sync updates)
    queueMicrotask(flushUpdates);
  }
}

// Cache for previous data to enable efficient diffing
const previousDataCache = new WeakMap<
  Map<string, HTMLElement>,
  Record<string, any>
>();

function updateDomWithData(
  nodeCache: Map<string, HTMLElement>,
  template: TemplateDefinition,
  data: Record<string, any>,
) {
  const previousData = previousDataCache.get(nodeCache);

  // Batch DOM updates to minimize reflows
  const updates: Array<() => void> = [];

  template.dynamic.bindings.forEach((binding) => {
    const { selector, props } = binding;
    const element = nodeCache.get(selector);

    if (!element) return;

    props.forEach((prop) => {
      const elementData = data[selector];
      if (elementData === undefined) return;

      // Skip update if data hasn't changed
      if (previousData && previousData[selector] === elementData) {
        return;
      }

      if (prop === "textContent") {
        const newText = String(elementData);
        if (element.textContent !== newText) {
          updates.push(() => {
            element.textContent = newText;
          });
        }
      } else if (prop === "class" || prop === "className") {
        const newClass = String(elementData);
        if (element.className !== newClass) {
          updates.push(() => {
            element.className = newClass;
          });
        }
      } else if (
        prop === "style" &&
        typeof elementData === "object" &&
        elementData !== null
      ) {
        // Optimize style updates - only update changed properties
        const currentStyle = element.style;
        Object.keys(elementData).forEach((styleKey) => {
          const newValue = elementData[styleKey];
          if (currentStyle[styleKey as any] !== newValue) {
            updates.push(() => {
              currentStyle[styleKey as any] = newValue;
            });
          }
        });
      } else if (
        prop === "value" &&
        (element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement)
      ) {
        const newValue = String(elementData);
        if (element.value !== newValue) {
          updates.push(() => {
            element.value = newValue;
          });
        }
      } else {
        const currentVal = element.getAttribute(prop);
        const newVal = String(elementData);
        if (currentVal !== newVal) {
          updates.push(() => {
            element.setAttribute(prop, newVal);
          });
        }
      }
    });
  });

  // Execute all updates in a single batch
  if (updates.length > 0) {
    updates.forEach((update) => update());
  }

  // Cache current data for next update
  previousDataCache.set(nodeCache, { ...data });
}

export function unmountStaticTemplate(instance: StaticInstance) {
  const { container } = instance;
  globalEventDelegator.detachContainer(container);
  container.innerHTML = "";
}
