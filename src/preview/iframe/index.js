import runner from "!!raw-loader!./runner";

/**
 * Create an iframe
 */
export function createIframe({ id, ...attrs }) {
  const iframe = document.createElement("iframe");

  attrs.srcdoc = generateDefaultHTML(id);
  attrs.style = attrs.style || defaultIframeStyles;

  for (let name of Object.keys(attrs)) {
    iframe.setAttribute(name, attrs[name]);
  }

  iframe.publishEvent = (name, data, runId) => {
    let message = {
      name,
      data: JSON.parse(JSON.stringify(data)),
    };

    if (runId) {
      message.runId = runId;
    }

    if (!iframe.contentWindow) return;
    return iframe.contentWindow.postMessage(message, "*");
  };

  return iframe;
}

/**
 * Async function to wait for a message to be called
 */
export function waitUntilEvent(frameId, name) {
  return new Promise(function (resolve) {
    function handler(event) {
      if (event.data.name === name && event.data.frameId === frameId) {
        window.removeEventListener("message", handler);
        resolve(event.data.data);
      }
    }
    window.addEventListener("message", handler);
  });
}

export const invisibleIframeStyles = `
  height: 100%;
  width: 100%;
  border: 0;
  opacity: 0;
  pointer-events: none;
  position: absolute;
  top: 0;
  left: 0;
`;

export const defaultIframeStyles = `
  height: 100%;
  width: 100%;
  border: 0;
`;

const MINIFIED_HTML = `
<html>
  <head>
  <script type="module" class="script">    
    (function() {
      CODE
    })();

    /** clean up */
    Array.prototype.slice.call(document.querySelectorAll(".script")).forEach((script) => {
      script.parentNode.removeChild(script);
    });
  </script>
  </head>
  <body>
  </body>
</html>
`
  .split("\n")
  .map((line) => line.trim())
  .join("");

function generateDefaultHTML(frameId) {
  return MINIFIED_HTML.replace(
    "CODE",
    `const INITIAL_FRAME_ID = "${frameId}";${runner}\n`
  );
}
