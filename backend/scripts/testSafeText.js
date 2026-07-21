import assert from "assert";
import { safeText } from "../../frontend/src/utils/safeData.js";

const evidence = {
  type: "biography",
  label: "Official Biography",
  detail: "Represented / associated state: Assam",
  source: "Official Biography",
};

const text = safeText(evidence);
assert.ok(typeof text === "string" && text.length > 0, "safeText returns string");
assert.ok(!text.includes("[object Object]"), "safeText does not stringify poorly");
assert.ok(text.includes("Official Biography"), "safeText keeps label");

assert.strictEqual(safeText(null), "");
assert.strictEqual(safeText(undefined), "");
assert.strictEqual(safeText("hello"), "hello");
assert.strictEqual(safeText(42), "42");
assert.ok(safeText([evidence, "News"]).includes("News"));

console.log("safeText evidence coercion OK:", text);
