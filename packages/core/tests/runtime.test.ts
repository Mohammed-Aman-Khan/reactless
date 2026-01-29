/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mountStaticTemplate,
  updateStaticTemplate,
  unmountStaticTemplate,
} from "../src/runtime/dom";

describe("Runtime: mountStaticTemplate", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  it("should mount static HTML", () => {
    const template = {
      html: '<div class="static">Hello</div>',
      dynamic: { bindings: [], events: [] },
    };
    const data = {};
    const events = {};

    mountStaticTemplate({ container, template, data, events });

    expect(container.innerHTML).toContain('<div class="static">Hello</div>');
  });

  it("should apply dynamic bindings", () => {
    const template = {
      html: '<div class="dynamic"></div>',
      dynamic: {
        bindings: [{ selector: ".dynamic", props: ["textContent"] }],
        events: [],
      },
    };
    const data = { ".dynamic": "Dynamic Content" };
    const events = {};

    mountStaticTemplate({ container, template, data, events });

    expect(container.querySelector(".dynamic")?.textContent).toBe(
      "Dynamic Content",
    );
  });
});

describe("Runtime: Events", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  it("should delegate click events", () => {
    const template = {
      html: '<button data-event="btn-1">Click Me</button>',
      dynamic: {
        bindings: [],
        events: [{ selector: "button", type: "click", id: "btn-1" }],
      },
    };
    const data = {};
    const handler = vi.fn();
    const events = { "btn-1": handler };

    mountStaticTemplate({ container, template, data, events });

    const button = container.querySelector("button");
    button?.click();

    expect(handler).toHaveBeenCalled();
  });
});

describe("Runtime: Cleanup", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  it("should cleanup DOM and events on unmount", () => {
    const template = {
      html: '<button data-event="btn-1">Click Me</button>',
      dynamic: {
        bindings: [],
        events: [{ selector: "button", type: "click", id: "btn-1" }],
      },
    };
    const handler = vi.fn();
    const instance = mountStaticTemplate({
      container,
      template,
      data: {},
      events: { "btn-1": handler },
    });

    expect(container.innerHTML).not.toBe("");

    unmountStaticTemplate(instance);

    expect(container.innerHTML).toBe("");

    // After unmount, even if we manually put a button back, the delegator should be detached
    container.innerHTML = '<button data-event="btn-1">Click Me</button>';
    const button = container.querySelector("button");
    button?.click();

    expect(handler).not.toHaveBeenCalled();
  });
});
