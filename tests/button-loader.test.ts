import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ButtonLoader } from "../src/components/button-loader";

test("button loading states render the react-spinners BeatLoader", () => {
  const markup = renderToStaticMarkup(
    createElement(ButtonLoader, { label: "Saving changes" }),
  );

  assert.match(markup, /Saving changes/);
  assert.match(markup, /react-spinners-BeatLoader-beat/);
});
