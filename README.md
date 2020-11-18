# Boxcutter

React component for displaying sandboxed HTML.

It "cuts" open the "box" of HTML to see what's inside. 📦

## The problem

Boxcutter was made for Parcel, the code editor built for email development. It's goal is to display an email's content as a user codes it. The preview should update as fast as possible while not sacrificing the normal browser events that user's code expects. While the HTML/CSS/JS needs to be sandboxed, it needs to have "escape hatches" so that developer tools can be built on top of it. For example, Boxcutter needs to support a faux Inspect Element feature, which overlays the user's content to show the box model.

Are you building a browser-based code editor a la codepen / jsbin? This is a great way to show the preview of the user's code in a safe way.

## Installation

This module is distributed via npm. To install it run the following from your project directory.

```sh
npm i @useparcel/boxcutter
```

## Usage

```js
import React from "react";
import { render } from "react-dom";
import { Boxcutter, Preview, Overlay } from "@useparcel/boxcutter";

render(
  <Boxcutter
    title="My preview"
    source={{
      id: "index.html",
      html: `
        <html>
          <body>
            hello world
          </body>
        </html>
      `,
    }}
  >
    <Preview>
      <Overlay background="rebeccapurple" top={50} left={100}>
        I am on top of the content
      </Overlay>
    </Preview>
  </Boxcutter>,
  document.getElementById("root")
);
```

## Communicating to and from the preview

Moving beyond displaying sandboxed HTML requires that the preview and React app communicate. For example, let's say you want to show the user the list of the CSS classes applied to the HTML element they are hovering over. You need to request that information from the preview from the React app. Boxcutter comes with tools to help you do that.

There are two ways to communicate between the app and the preview: events and functions.

### Events

Events can flow both directions: from the app to the preview and from the preview to the app.

#### App to preview

To send an event from the app to the preview we use the `emit` function from `useBoxcutter` and add a boxcutter event listener in the preview using the `<Script />` component.

The following is an example where when the preview finishes loading the app emits an event to the preview named `log` with the data `"hello world"`. The listener defined in the `<Script />` catches the event and logs it out in the preview.

```js
import { useBoxcutter, Script } from "@useparcel/boxcutter";

function LogHelloWorldInThePreview() {
  const { isLoading, emit } = useBoxcutter();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    emit("log", "hello wolrd");
  }, [isLoading]);

  return (
    <Script>{`
      boxcutter.addEventListener('log', (data) => {
        console.log(data)
      })
    `}</Script>
  );
}
```

#### Preview to app

To send an event from the preview up to the app we follow a very similar pattern. Now, in the `<Script />` we use `boxcutter.emit` to send the event to the app and we use the `useBoxcutterEvent` hook to listener for the event.

In this example the app will log the value the user copied inside the preview.

```js
import { useBoxcutterEvent, Script } from "@useparcel/boxcutter";

function CaptureCopyEvents() {
  useBoxcutterEvent("copy", (selection) => {
    console.log(`${selection} was copied in the preview`);
  });

  /**
   * This script sends the copied text from the preview to the React app
   */
  return (
    <Script>{`
      document.addEventListener(('copy'), (event) => {
        boxcutter.emit('copy', document.getSelection())
      })
    `}</Script>
  );
}
```

### Functions

Sometimes you might want more direct communication between the app and the preview. When you are trying to get a specific value based on the user's input, it can be a hassle emit one event and then listen for another. Boxcutter functions allow you to define a function inside the preview and call them from inside your app.

In this example the app will log the class names that are applied to the body when the preview finishes loading.

```js
import { useBoxcutter, Script } from '@useparcel/boxcutter'

function GetClassName() {
  const { isLoading, call } = useBoxcutter()

  useEffect(() => {
    if (isLoading) {
      return;
    }

    console.log(await call('getClassName', 'body'))
  }, [isLoading])

  return (
    <Script>{`
      boxcutter.define('getClassName', (selector) => {
        return document.querySelector(selector).className
      })
    `}</Script>
    )
}
```

## Components

### `<Boxcutter />`

The following is a list of props that the component accepts.

#### `source`

> `object` | required

The `source` prop requires an object with two properties: `html` and `id`.

##### `source.html`

> `string` | required

The HTML to be displayed.

##### `source.id`

> `string` | required

This essentially represents a URL. It should be changed when ever the document you are previewing changes. When it changes, the entire preview is refreshed and scrolled back to the top.

For example, if you have two files named `index.html` and `about.html` you could use the file name as the source ID. When you switch from displaying the HTML in `index.html` to `about.html` you should also switch the source ID at the same time.

#### `title`

> `string` | required

This is the title given to the iframe which contains the preview. [Learn why](https://web.dev/frame-title/) this is required.

#### `mode`

> `enum(["auto", "instant", "refresh"])` | defaults to `auto`

The mode configures how the preview is updated when the HTML changes.

##### instant

Instant mode updates the preview by getting a diff of the changes and applying them to the HTML. This leads to a near real-time update of the HTML. The limitation is that any JavaScript won't be rerun when the preview is updated, which is usually not the expected result.

##### refresh

Refresh mode debounces the update of the preview based on the `options.debounce` option which defaults to 250ms. Each time the preview is updated it completely reloads the page which means tha the JavaScript is entirely rerun.

##### auto

When mode is set to `auto`, if the HTML contains `<script>` tags the preview is run in `refresh` mode, otherwise it is run in `instant`.

#### `children`

> `node|[node]`

React components to be rendered with access to the boxcutter context.

#### `options`

> `object` | defaults to `{ debounce: 250 }`

Additional options for configuring the preview.

It accepts the following properties:

- `debounce` - The amount of milliseconds to wait for no changes to `source.html` before updating the preview when in refresh mode. Defaults to `250`.

#### sandbox

> `string` | defaults to `allow-scripts allow-forms allow-popups allow-modals`

This applies extra restrictions to the iframe. Since the frame is laoded directly in the users browser it is recommended that you DO NOT use `allow-same-origin` to prevent the frame from accessing cookies and local storage. Visit MDN for [all options](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-sandbox).

#### allow

> `string` | defaults to `"accelerometer 'none';autoplay 'none';camera 'none';document-domain 'none';encrypted-media 'none';fullscreen 'none';geolocation 'none';gyroscope 'none';magnetometer 'none';microphone 'none';midi 'none';payment 'none';picture-in-picture 'none';sync-xhr 'none';usb 'none';xr-spatial-tracking 'none';"`

Specifies which features the frame is allowed to request access to. Visit MDN to learn more about [defining a feature policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Feature_Policy/Using_Feature_Policy#The_iframe_allow_attribute).

### `<Preview />`

Displays the boxcutter preview. Must be within the `<Boxcutter/>` component. There should always be exactly **one** `<Preview/>` inside of the `<Boxcutter/>`.

#### `children`

> `node|[node]`

React components to be overlayed on top of the preview. While there are no restrictions on what you can render, it's recommended that you use the components documented below.

#### className

> `string`

Class name for the wrapper div.

#### style

> `object`

Styles for the wrapper div.

---

The following components are made to be passed as children to the `<Preview/>` component.

### `<Overlay />`

Displays content on top of the preview.

**Usage:**

```js
import { Overlay } from "@useparcel/boxcutter";

<Overlay top={10} left={10}>
  Hello world
</Overlay>;
```

The following is a list of props that the component accepts.

#### top

> `number` | optional

Sets the top offset.

#### left

> `number`

Sets the left offset.

#### bottom

> `number`

Sets the bottom offset.

#### right

> `number`

Sets the right offset.

#### size

> `number`

Sets both the width and height. If `height` or `width` is set, they take preference.

#### height

> `number`

Set the height of the overlay.

#### width

> `number`

Set the width of the overlay.

#### background

> `string`

Sets the CSS background value.

#### interactive

> `boolean` | defaults to `false`

Whether or not the user can interact with the overlay. If `false`, the overlay will not accept any pointer events.

#### zIndex | defaults to `1`

> `number`

Sets the z-index of the overlay.

#### onClick

> `function`

The function to be run when the user clicks the overlay. This sets `interactive` to `true`.

#### styles

> `object`

Styles for the overlay.

#### className

> `string`

Class name for the overlay.

### `<ToolTip />`

A pre-built tooltip overlay. It automatically places itself around the target so it is visible.

**Usage:**

```js
import { ToolTip } from "@useparcel/boxcutter";

<ToolTip
  target={{
    top: 10,
    left: 10,
    width: 100,
    height: 50,
  }}
  options={{
    mirrorTargetVisibility: true
  }}
  style={{
    background: "#000",
    color: "#FFF",
    padding: "10px",
    borderRadius: "3px",
  }}
  arrow={
    <div
      style={{
        width: 0,
        height: 0,
        borderLeft: "10px solid transparent",
        borderRight: "10px solid transparent",
        borderTop: "10px solid #000",
        margin: "0 5px",
      }}
    />
  }
>
  Hello world
</ToolTip>;
```

The following is a list of props that the component accepts.

#### target

> `object` | required

The target object must have 4 properties: `top`, `left`, `width`, `height`. These values define the area that the tooltip is describing. The tooltip will always be placed visibility around this area.

#### children

> `node|[node]` | required

Content for the tooltip

#### arrow

> `node`

If you'd like the tooltip to have an arrow pointing to the target area, provide it here. The arrow should point downwards.

#### `options`

> `object` | defaults to `{ mirrorTargetVisibility: true }`

Additional options for configuring the tooltip.

It accepts the following properties:

- `mirrorTargetVisibility` - When `true`, the tooltip with disappear when the target area is offscreen. When `false`, the tooltip will always be visible, placed in the closest spot on screen to the target area is.

#### className

> `string`

Class name for the wrapper div.

#### style

> `object`

Styles for the wrapper div.

### `<Style />`

Injects the given CSS into the preview.

**Usage**

```js
import { Style } from "@useparcel/boxcutter";

<Style>{`
  body {
    margin: 0;
  }
`}</Style>;
```

### `<Script />`

Injects the given JavaScript into the preview.

**Usage**

```js
import { Script } from "@useparcel/boxcutter";

<Script>{`
  document.addEventListener('click', (event) => {
    console.log('clicked inside of preview')
  })
`}</Script>;
```

There are three global methods accessible to your injected JavaScript where are useful for communicating to and from the frame. Learn more about how to use them to [communicate to and from the preview](#communicating-to-and-from-the-preview).

#### `boxcutter.emit(name, data)`

Emits an event from the preview to the React app. Use the `useBoxcutterEvent` to listener for the emitted events.

#### `boxcutter.addEventListener(name, (data) => {})`

Adds an event listener for boxcutter events emitted by the React app using the [`emit`](#emit) function exported by `useBoxcutter`.

#### `boxcutter.define(name, (data) => {})`

Create a function with the specified name which is callable from the React app using the [`call`](#call) function exported by `useBoxcutter`.

## Hooks

### `useBoxcutter()`

React hook that provides the boxcutter context.

**Usage**

```js
import { useBoxcutter } from '@useparcel/boxcutter'

function RenderMeInsideBoxcutter() {
  const context = useBoxcutter()

  ...
}

```

The context given by this hook contains the following properties.

#### id

> `string`

The current source ID.

#### isLoading

> `boolean`

Whether the preview is currently loading. When it is loading you should avoid all interactions with boxcutter.

#### mouse

> `object`

Describes the mouse's current position, target, and event. When the mouse is not over the preview all the values will be null.

The mouse object contains the following properties:

- target (`string`|`null`) - A unique CSS selector for the current mouse target.
- event (`string`|`null`) - The event that set the current mouse position. Will equal either `null`, `"hover"`, or `"click"`.
- x (`number`|`null`) - The x coordinate of the mouse position within the preview content.
- y (`number`|`null`) - The y coordinate of the mouse position within the preview content.

#### window

> `object`

Describes the preview window. It contains the following properties:

- isResizing (`boolean`) - Whether or not the window size is currently changing
- height (`number`) - Height of the preview window.
- width (`number`) - Width of the preview window.
- scrollHeight (`number`) - Total height of the preview content.
- scrollWidth (`number`) - Total width of the preview content.
- scrollTop (`number`) - Top scroll offset within the preview content.
- scrollLeft (`number`) - Left scroll offset within the preview content.

#### call(name, data) => Promise

> `function`

Calls a boxcutter function defined inside the preview. See [`boxcutter.define`](#user-content-boxcutterdefinename-data--) to learn how define a boxcutter function.

#### emit(name, data)

> `function`

Emits a boxcutter event into the the preview. See [`boxcutter.addEventListener`](user-content-boxcutteraddeventlistenername-data--) to learn how to add a boxcutter event listener.

### `useBoxcutterEvent(name, data)`

React hook to listen for boxcutter events emitted from the preview. See [`boxcutter.emit`](#user-content-boxcutteremitname-data) to learn how to emit boxcutter events from the preview.

**Usage:**

```js
import { useBoxcutterEvent } from '@useparcel/boxcutter'

function RenderMeInsideBoxcutter() {
  useBoxcutterEvent('load', () => {
    // the preview loaded
  })

  useBoxcutterEvent('my-event', () => {
    // the custom boxcutter event fired
  })
}
```
