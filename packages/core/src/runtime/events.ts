export class EventDelegationSystem {
  private containers = new Map<HTMLElement, Map<string, (e: Event) => void>>();
  // Cache event IDs to avoid repeated getAttribute calls
  private eventIdCache = new WeakMap<HTMLElement, string | null>();

  attachContainer(
    container: HTMLElement,
    eventMap: Record<string, (e: any) => void>,
  ) {
    if (this.containers.has(container)) return;

    const listeners = new Map<string, (e: Event) => void>();
    this.containers.set(container, listeners);

    // Attach common event listeners
    const commonEvents = [
      "click",
      "input",
      "change",
      "submit",
      "keydown",
      "keyup",
      "mouseover",
      "mouseout",
    ];

    commonEvents.forEach((type) => {
      const listener = (nativeEvent: Event) => {
        this.handleEvent(nativeEvent, type, eventMap);
      };
      // Use capture phase for better performance with delegation
      container.addEventListener(type, listener, false);
      listeners.set(type, listener);
    });
  }

  private handleEvent(
    nativeEvent: Event,
    _eventType: string,
    eventMap: Record<string, (e: any) => void>,
  ) {
    let target = nativeEvent.target as HTMLElement | null;
    const container = nativeEvent.currentTarget as HTMLElement;

    // Fast path: check if target has event handler
    while (target && target !== container) {
      // Use cached event ID if available
      let eventId = this.eventIdCache.get(target);
      if (eventId === undefined) {
        eventId = target.getAttribute("data-event");
        this.eventIdCache.set(target, eventId);
      }

      if (eventId) {
        const handler = eventMap[eventId];
        if (handler) {
          const syntheticEvent = this.createSyntheticEvent(nativeEvent);
          handler(syntheticEvent);

          if (syntheticEvent.isPropagationStopped()) {
            break;
          }
        }
      }
      target = target.parentElement;
    }
  }

  // Event pooling for better performance
  private eventPool: any[] = [];
  private readonly MAX_POOL_SIZE = 10;

  private createSyntheticEvent(nativeEvent: Event) {
    let isPropagationStopped = false;
    let isDefaultPrevented = nativeEvent.defaultPrevented;

    // Try to reuse pooled event object
    let synthetic = this.eventPool.pop();

    if (!synthetic) {
      // Create new event object with methods
      synthetic = {
        preventDefault: function (this: any) {
          this.nativeEvent.preventDefault();
          this._isDefaultPrevented = true;
          this.defaultPrevented = true;
        },
        stopPropagation: function (this: any) {
          this.nativeEvent.stopPropagation();
          this._isPropagationStopped = true;
        },
        isDefaultPrevented: function (this: any) {
          return this._isDefaultPrevented;
        },
        isPropagationStopped: function (this: any) {
          return this._isPropagationStopped;
        },
        persist: () => {}, // No-op for compatibility
      };
    }

    // Update properties for reuse
    synthetic.nativeEvent = nativeEvent;
    synthetic.target = nativeEvent.target;
    synthetic.currentTarget = nativeEvent.currentTarget;
    synthetic.type = nativeEvent.type;
    synthetic.bubbles = nativeEvent.bubbles;
    synthetic.cancelable = nativeEvent.cancelable;
    synthetic.timeStamp = nativeEvent.timeStamp;
    synthetic.defaultPrevented = nativeEvent.defaultPrevented;
    synthetic.eventPhase = nativeEvent.eventPhase;
    synthetic.isTrusted = nativeEvent.isTrusted;
    synthetic._isDefaultPrevented = isDefaultPrevented;
    synthetic._isPropagationStopped = isPropagationStopped;

    // Return to pool after microtask
    queueMicrotask(() => {
      if (this.eventPool.length < this.MAX_POOL_SIZE) {
        // Clear references
        synthetic.nativeEvent = null;
        synthetic.target = null;
        synthetic.currentTarget = null;
        this.eventPool.push(synthetic);
      }
    });

    return synthetic;
  }

  detachContainer(container: HTMLElement) {
    const listeners = this.containers.get(container);
    if (listeners) {
      listeners.forEach((listener, type) => {
        container.removeEventListener(type, listener);
      });
      this.containers.delete(container);
    }
  }
}

export const globalEventDelegator = new EventDelegationSystem();
