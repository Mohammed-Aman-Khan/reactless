import React, { useLayoutEffect, useRef } from "react";
import {
  mountStaticTemplate,
  updateStaticTemplate,
  unmountStaticTemplate,
  StaticInstance,
} from "./dom";

export interface TemplateDefinition {
  html: string;
  dynamic: {
    bindings: Array<{ selector: string; props: string[] }>;
    events: Array<{ selector: string; type: string; id: string }>;
  };
}

export interface ReactlessNodeProps {
  template: TemplateDefinition;
  data: Record<string, any>;
  events: Record<string, (e: any) => void>;
}

export const ReactlessNode: React.FC<ReactlessNodeProps> = ({
  template,
  data,
  events,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<StaticInstance | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Always (re-)mount if instanceRef is null (happens on StrictMode remount)
    if (!instanceRef.current) {
      instanceRef.current = mountStaticTemplate({
        container,
        template,
        data,
        events,
      });
    } else {
      updateStaticTemplate(instanceRef.current, data);
    }

    // Cleanup: unmount and RESET instanceRef so next mount works correctly
    return () => {
      if (instanceRef.current) {
        unmountStaticTemplate(instanceRef.current);
        instanceRef.current = null; // CRITICAL: Reset for StrictMode
      }
    };
  }, [template, data, events]);

  return React.createElement("div", {
    ref: containerRef,
    style: { display: "contents" },
  });
};
