/** Render the intro email with the default member list to .samples/intro.html */
import { mkdirSync, writeFileSync } from "fs";
import * as React from "react";
import { render } from "@react-email/render";
import IntroEmail from "../src/emails/IntroEmail";

async function main() {
const html = await render(
  React.createElement(IntroEmail, {
    baseUrl: "http://localhost:3000",
  }),
);
mkdirSync(".samples", { recursive: true });
writeFileSync(".samples/intro.html", html);
console.log("Rendered .samples/intro.html");
}
main();
