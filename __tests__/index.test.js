import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";

import { Boxcutter, Preview } from "../dist/index.js";

const originalConsoleError = global.console.error;

beforeEach(() => {
  global.console.error = (...args) => {
    const propTypeFailures = [/Failed prop type/, /Warning: Received/];

    if (propTypeFailures.some((p) => p.test(args[0]))) {
      throw new Error(args[0]);
    }

    originalConsoleError(...args);
  };
});

/**
 * TODO:
 * - core
 *  - mode: auto
 *    - if has a script, it is refresh
 *    - else it is instant
 *  - mode: refresh
 *    - it renders
 *    - it updates when the source.html updates
 *    - it scrolls to the top when source.id changes
 *  - mode: instant
 *    - it renders
 *    - it updates when the source.html updates
 *    - it scrolls to the top when source.id changes
 *- communication
 *  - preview -> app
 *    emit -> boxcutter.addEventListener
 *  - app -> preview
 *    boxcutter.emit -> useBoxcutterEvent
 *  - functions
 *    - call -> boxcutter.define
 *- isolation
 *  - boxcutter1 updates and boxcutter2 doesn't
 *  - event listeners only listen to their iframe
 */

test("it renders the iframe", async () => {
  render(
    <Boxcutter
      title="my preview"
      source={{
        id: "my-source",
        html: "hello world",
      }}
    >
      <Preview />
    </Boxcutter>
  );

  expect(await screen.findByTitle("my preview")).toBeTruthy();
});
