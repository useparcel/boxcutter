import { supportsPassiveEvents } from "detect-passive-events";
import lodashThrottle from "lodash.throttle";
import { serializeError } from "serialize-error";
import { DiffDOM } from "diff-dom";

function min(...values) {
  let current = values[0];

  for (let v of values) {
    if (v < current) {
      current = v;
    }
  }

  return current;
}

const objToJson = (obj) => {
  if (
    typeof obj === "object" &&
    obj.constructor &&
    obj.constructor.name.includes("Error")
  ) {
    return serializeError(obj);
  }

  if (typeof obj === "undefined") {
    return;
  }

  return JSON.parse(JSON.stringify(obj, null));
};
const dd = new DiffDOM();
const FRAMES_PER_SECOND = 1000 / 30;
const EVENT_LISTENER_OPTIONS = supportsPassiveEvents
  ? { passive: true }
  : false;

/**
 * Set up stored globals
 */
window.boxcutter = {
  meta: { frameId: INITIAL_FRAME_ID },
  functions: {},
  listeners: {},
};

/**
 * Send a message to the parent window
 */
function emitBoxcutterEvent(name, data, runId) {
  let message = {
    frameId: window.boxcutter.meta.frameId,
    name: name,
    data: data,
  };

  if (runId) {
    message.runId = runId;
  }

  window.parent.postMessage(message, "*");
}

/**
 * Define a function that can be called by the parent
 *
 * Usage:
 * defineBoxcutterFunction('myFunc', (resolve, reject, data) => {
 *   resolve('myFuncResult')
 * })
 */
function defineBoxcutterFunction(name, callback) {
  const fnName = `fn:${name}`;

  if (window.boxcutter.functions.hasOwnProperty(fnName)) {
    throw new Error(
      new Error('boxcutter function "' + fnName + '" already exists.')
    );
  }

  window.boxcutter.functions[fnName] = callback;
}

/**
 * Listen to messages from the parent and run
 * the corresponding boxcutter function
 */
async function onMessageCallBoxcutterFunction(event) {
  const { name, data, runId } = event.data;

  /**
   * Run the function
   */
  if (window.boxcutter.functions.hasOwnProperty(name)) {
    try {
      const result = await window.boxcutter.functions[name](data);

      /**
       * Send the result back to the parent
       */
      emitBoxcutterEvent("resolve", objToJson(result), runId);
    } catch (error) {
      /**
       * Send the error back to the parent
       */
      emitBoxcutterEvent("reject", objToJson(error), runId);
    }
  }

  /**
   * reject non-existent functions
   */
  if (
    !window.boxcutter.functions.hasOwnProperty(name) &&
    name.startsWith("fn:")
  ) {
    emitBoxcutterEvent(
      "reject",
      objToJson(new Error(`Boxcutter function "${name}" is not defined.`)),
      runId
    );
  }
}

/**
 * Add an event listener for boxcutter events
 */
function addBoxcutterEventListener(name, callback) {
  window.boxcutter.listeners[name] = window.boxcutter.listeners[name] || [];
  window.boxcutter.listeners[name].push(callback);
}

function onMessageCallBoxcutterEventListeners(event) {
  const { name, data } = event.data;

  if (window.boxcutter.listeners.hasOwnProperty(name)) {
    window.boxcutter.listeners[name].forEach((callback) => {
      callback(data);
    });
  }
}

/**
 * Loading
 */
function onDOMContentLoaded() {
  emitBoxcutterEvent("DOMContentLoaded");
}

function onLoad() {
  emitBoxcutterEvent("load");

  window.dispatchEvent(new Event("load"));
}

/**
 * Scroll
 */
const onScroll = lodashThrottle((event) => {
  emitBoxcutterEvent("scroll", {
    scrollTop: document.scrollingElement.scrollTop,
    scrollLeft: document.scrollingElement.scrollLeft,
  });
}, FRAMES_PER_SECOND);

/**
 * Mouse
 *
 * We are simulating mouseenter / mouseleave by using mouseover and mouseout.
 * This is nessessary because firefox does not fire mouseenter / leave when
 * the user enters and leaves an iframe.
 *
 *
 */
window.boxcutter.isMouseIn = false;

/**
 * on mouseover we clear the mouseleave timer since we didn't actually
 * leave the frame we just moved elements.
 *
 * If we are just entering the frame then we fire the mouseenter event.
 */
let mouseLeaveTimeout;
function onMouseOver() {
  clearTimeout(mouseLeaveTimeout);

  if (!window.boxcutter.isMouseIn) {
    window.boxcutter.isMouseIn = true;
    emitBoxcutterEvent("mouseenter", {
      target: getUniqueSelector(event.target),
      event: "hover",
      x: event.pageX,
      y: event.pageY,
    });
  }
}

/**
 * on mouseout we set a timer for 10 miliseconds that will be cleared by
 * a mouseover event. If it isn't cleared then the mouse has left the frame
 *  and we are good to fire the mouseleave event.
 */
function onMouseOut() {
  mouseLeaveTimeout = setTimeout(() => {
    window.boxcutter.isMouseIn = false;
    emitBoxcutterEvent("mouseleave", {
      target: null,
      event: null,
      x: null,
      y: null,
    });
  }, 10);
}

/**
 * Because of the throttling the onMouseMove function could be
 * called after the mouse leaves the frame.
 *
 * To prevent this we check that boxcutter.isMouseIn is true to
 * ensure the mouse is still over the frame.
 */
const onMouseMove = lodashThrottle((event) => {
  if (!window.boxcutter.isMouseIn) {
    return;
  }

  emitBoxcutterEvent("mousemove", {
    target: getUniqueSelector(event.target),
    event: "hover",
    x: event.pageX,
    y: event.pageY,
  });
}, FRAMES_PER_SECOND);

function onClick(event) {
  emitBoxcutterEvent("click", {
    target: getUniqueSelector(event.target),
    event: "click",
    x: event.pageX,
    y: event.pageY,
  });
}

/**
 * Resize handler
 */
let resizeTimer;
const onResize = lodashThrottle(function () {
  clearTimeout(resizeTimer);

  emitBoxcutterEvent("resize", {
    ...getDocumentSize(),
    isResizing: true,
  });

  resizeTimer = setTimeout(() => {
    emitBoxcutterEvent("resize", {
      ...getDocumentSize(),
      isResizing: false,
    });
  }, 250);
}, FRAMES_PER_SECOND);

function getDocumentSize() {
  return {
    height: window.innerHeight,
    width: window.innerWidth,
    scrollHeight: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth,
  };
}

/**
 * Message handler
 */
function onMessageInternal(event) {
  const { name, data } = event.data;

  switch (name) {
    case "update":
      const diff = data;
      try {
        dd.apply(document.documentElement, diff);
      } catch (e) {}
      break;

    case "write":
      const html = data;
      removeListeners();
      window.boxcutter.functions = {};
      window.boxcutter.listeners = {};
      document.open();
      document.write("");
      document.write(html);
      document.close();
      addListeners();
      break;

    case "scroll":
      const scroll = data;
      window.scrollTo(scroll.scrollLeft, scroll.scrollTop);
      onScroll();
      break;

    case "setFrameId":
      const newFrameId = data;
      window.boxcutter.meta.frameId = newFrameId;

      break;

    default:
      // do nothing
      break;
  }
}

const resizeObserver = new ResizeObserver(onResize);

function addListeners() {
  window.boxcutter.define = defineBoxcutterFunction;
  window.boxcutter.emit = emitBoxcutterEvent;
  window.boxcutter.addEventListener = addBoxcutterEventListener;
  window.addEventListener("message", onMessageInternal);
  window.addEventListener("message", onMessageCallBoxcutterFunction);
  window.addEventListener("message", onMessageCallBoxcutterEventListeners);
  window.addEventListener("click", onClick);
  document.addEventListener("DOMContentLoaded", onDOMContentLoaded);
  document.addEventListener("scroll", onScroll, EVENT_LISTENER_OPTIONS);
  document.addEventListener("mouseover", onMouseOver, EVENT_LISTENER_OPTIONS);
  document.addEventListener("mousemove", onMouseMove, EVENT_LISTENER_OPTIONS);
  document.addEventListener("mouseout", onMouseOut, EVENT_LISTENER_OPTIONS);
  window.addEventListener("resize", onResize);

  // https://stackoverflow.com/questions/20572734/load-event-not-firing-when-iframe-is-loaded-in-chrome
  let timer = setInterval(function () {
    // Check if loading is complete
    if (
      document.readyState === "complete" ||
      document.readyState === "interactive"
    ) {
      onLoad();
      clearInterval(timer);
      return;
    }
  }, 50);

  resizeObserver.observe(document.documentElement);
  emitBoxcutterEvent("resize", {
    ...getDocumentSize(),
    isResizing: false,
  });
}

function removeListeners() {
  window.removeEventListener("message", onMessageInternal);
  window.removeEventListener("message", onMessageCallBoxcutterFunction);
  window.removeEventListener("message", onMessageCallBoxcutterEventListeners);
  window.removeEventListener("click", onClick);
  document.removeEventListener("DOMContentLoaded", onDOMContentLoaded);
  document.removeEventListener("scroll", onScroll);
  document.removeEventListener("mouseover", onMouseOver);
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseout", onMouseOut);
  window.removeEventListener("resize", onResize);
  resizeObserver.unobserve(document.documentElement);
}

addListeners();

/**
 * Given a DOM element, return a unique selector
 */
function getUniqueSelector(element) {
  if (element.id) {
    return "#" + element.id;
  }

  let parts = [];
  while (element.tagName !== "HTML") {
    let count = 1;
    let prev = element;
    while (prev.previousElementSibling != null) {
      count++;
      prev = prev.previousElementSibling;
    }

    parts.unshift(element.tagName + ":nth-child(" + count + ")");
    element = element.parentNode;
  }

  parts.unshift("HTML");

  return parts.join(">");
}
