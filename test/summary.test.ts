import assert from "node:assert/strict"
import test from "node:test"
import { columnSummaryKind, summaryOptions } from "../web/summary.ts"

test("numeric columns offer sum and average", () => {
 assert.equal(columnSummaryKind("REAL"), "numeric")
 assert.deepEqual(summaryOptions("REAL").map((option) => option.label), ["None", "Sum", "Average"])
})

test("integer columns also offer a true/false count", () => {
 assert.equal(columnSummaryKind("INTEGER"), "integer")
 assert.deepEqual(summaryOptions("INTEGER").map((option) => option.value), ["", "sum", "avg", "count"])
})

test("boolean columns offer count", () => {
 assert.equal(columnSummaryKind("BOOLEAN"), "boolean")
 assert.deepEqual(summaryOptions("BOOLEAN").map((option) => option.label), ["None", "Count"])
 assert.deepEqual(summaryOptions("TEXT"), [])
})
