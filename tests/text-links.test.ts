import test from "node:test";
import assert from "node:assert/strict";
import { externalTextLink, textLinks } from "../src/lib/text-links";

test("bare domains become secure external links without linking email addresses", () => {
  assert.deepEqual(
    textLinks(
      "Hi, I'm Akinkunmi. I'm working on outray.dev and email me at hi@outray.dev.",
    ),
    [
      {
        kind: "text",
        text: "Hi, I'm Akinkunmi. I'm working on ",
      },
      { kind: "link", text: "outray.dev", href: "https://outray.dev" },
      { kind: "text", text: " and email me at hi@outray.dev." },
    ],
  );
});

test("explicit links and sentence punctuation remain intact", () => {
  assert.deepEqual(externalTextLink("https://drocsid.app/invite/Good123."), {
    text: "https://drocsid.app/invite/Good123",
    href: "https://drocsid.app/invite/Good123",
    trailing: ".",
  });
});

test("made-up suffixes remain plain text unless the link is explicit", () => {
  assert.deepEqual(textLinks("Try bull.wieerl then outray.dev"), [
    { kind: "text", text: "Try bull.wieerl then " },
    { kind: "link", text: "outray.dev", href: "https://outray.dev" },
  ]);
  assert.deepEqual(externalTextLink("https://bull.wieerl"), {
    text: "https://bull.wieerl",
    href: "https://bull.wieerl",
    trailing: "",
  });
});
