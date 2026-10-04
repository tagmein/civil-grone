import assert from "node:assert/strict"
import test from "node:test"
import {
 applyDatasetColumns,
 applySelect,
 conflictView,
 integerBase,
 listDatasetConflicts,
 mergeDatasetRefresh,
 migrateColumnValue,
 stampBaseline,
 writeSelectColumn,
 writeSelectFilter,
} from "../web/dataset.ts"

const columns = [
 { name: "id", type: "" },
 { name: "customer_id", type: "" },
 { name: "total", type: "" },
]

const incoming = {
 columns,
 rows: [
  [10, 1, 12.5],
  [11, 1, 4],
  [12, 2, 9],
 ],
}

test("re-running matches rows by id instead of appending them", () => {
 const current = {
  columns,
  rows: [
   [10, 1, "13.5"],
   [11, 1, 4],
   [12, 2, 9],
  ],
  sourceSql: "SELECT id, customer_id, total FROM orders WHERE customer_id IN (1, 2)",
  sort: [{ column: "id", direction: "asc" }],
  filters: [],
 }
 const conflicts = listDatasetConflicts(current, incoming)
 assert.equal(conflicts.length, 1)
 assert.equal(conflicts[0].label, "id 10")
 assert.match(conflicts[0].summary, /total: mine 13.5, query 12.5/)
 assert.equal(mergeDatasetRefresh(current, incoming, {}), null)
 const kept = mergeDatasetRefresh(current, incoming, { 0: "keep" })
 assert.equal(kept?.rows.length, 3)
 assert.equal(kept?.rows[0][2], "13.5")
 assert.deepEqual(kept?.sort, [{ column: "id", direction: "asc" }])
 const again = mergeDatasetRefresh(kept ?? current, incoming, {})
 assert.equal(again?.rows.length, 3)
 assert.equal(again?.rows[0][2], "13.5")
 const extra = {
  columns,
  rows: [...incoming.rows, [13, 2, 20]],
 }
 const added = mergeDatasetRefresh(again ?? current, extra, {})
 assert.equal(added?.rows.length, 4)
 assert.equal(added?.rows[3][0], 13)
 const addedAgain = mergeDatasetRefresh(added ?? current, extra, {})
 assert.equal(addedAgain?.rows.length, 4)
})

test("taking the query replaces the edited cell and a second run stays quiet", () => {
 const current = stampBaseline({
  columns,
  rows: [
   [10, 1, 12.5],
   [11, 1, 4],
   [12, 2, 9],
  ],
  sourceSql: "SELECT id FROM orders",
 })
 current.rows[0][2] = "13.5"
 const view = conflictView(current, { columns, rows: incoming.rows, cursor: 0, choices: {} })
 assert.equal(view.count, 1)
 assert.equal(view.applied, null)
 assert.equal(view.position, "Conflict 1 of 1 · id 10")
 const taken = mergeDatasetRefresh(current, incoming, { 0: "take" })
 assert.equal(taken?.rows[0][2], 12.5)
 const quiet = mergeDatasetRefresh(taken ?? current, incoming, {})
 assert.equal(quiet?.rows.length, 3)
 assert.equal(listDatasetConflicts(taken ?? current, incoming).length, 0)
})

test("previous and next walk one conflict at a time", () => {
 const current = {
  columns,
  rows: [
   [10, 1, "13.5"],
   [11, 1, 4],
   [12, 3, 9],
  ],
 }
 const first = conflictView(current, { columns, rows: incoming.rows, cursor: 0, choices: {} })
 assert.equal(first.count, 2)
 assert.equal(first.atStart, true)
 assert.equal(first.atEnd, false)
 assert.equal(first.label, "id 10")
 const second = conflictView(current, { columns, rows: incoming.rows, cursor: 1, choices: { 0: "keep" } })
 assert.equal(second.label, "id 12")
 assert.match(second.summary, /customer_id: mine 3, query 2/)
 assert.equal(second.summary.includes("Keeping yours"), false)
 assert.equal(second.applied, null)
 const done = conflictView(current, {
  columns,
  rows: incoming.rows,
  cursor: 1,
  choices: { 0: "keep", 2: "take" },
 })
 assert.equal(done.applied?.rows.length, 3)
 assert.equal(done.applied?.rows[0][2], "13.5")
 assert.equal(done.applied?.rows[2][1], 2)
})

test("a user-added row is kept and a vanished unedited row is dropped", () => {
 const current = stampBaseline({
  columns,
  rows: [
   [10, 1, 12.5],
   [11, 1, 4],
  ],
  sourceSql: "",
 })
 current.rows.push(["", "", "note"])
 current.baseline?.push(null)
 current.pinned?.push([])
 const merged = mergeDatasetRefresh(current, { columns, rows: [[10, 1, 12.5]] }, {})
 assert.deepEqual(merged?.rows, [
  [10, 1, 12.5],
  ["", "", "note"],
 ])
})

test("select keeps rows from the previous dataset", () => {
 const selected = applySelect({
  columns,
  rows: incoming.rows,
 }, JSON.stringify({
  columns: ["id", "total"],
  filters: [{ column: "total", op: "gt", value: "8" }],
 }))
 assert.deepEqual(selected.columns.map((column) => column.name), ["id", "total"])
 assert.deepEqual(selected.rows, [
  [10, 12.5],
  [12, 9],
 ])
 assert.throws(() => applySelect(null, "{}"), /no dataset/)
 const body = writeSelectColumn("{}", "total", "false", ["id", "customer_id", "total"])
 assert.deepEqual(JSON.parse(body).columns, ["id", "customer_id"])
 const filtered = writeSelectFilter(body, { column: "total", op: "gt", value: "8" })
 assert.equal(JSON.parse(filtered).filters[0].value, "8")
})

test("integer migration parses text in the chosen base", () => {
 assert.equal(integerBase("10"), 10)
 assert.equal(integerBase("1"), null)
 assert.equal(integerBase("37"), null)
 assert.equal(migrateColumnValue("42", "text", "INTEGER", 10), 42)
 assert.equal(migrateColumnValue("ff", "TEXT", "integer", 16), 255)
 assert.equal(migrateColumnValue("1010", "text", "INTEGER", 2), 10)
 assert.equal(migrateColumnValue("", "text", "INTEGER", 10), "")
 assert.equal(migrateColumnValue("nope", "text", "INTEGER", 10), "nope")
 const dataset = {
  columns: [{ name: "qty", type: "text" }, { name: "sku", type: "text" }],
  rows: [["24", "A1"], ["ff", "B2"]],
  sort: [{ column: "qty", direction: "asc" }],
  filters: [],
  baseline: [["24", "A1"], ["ff", "B2"]],
 }
 applyDatasetColumns(dataset, [
  { name: "qty", type: "INTEGER", from: 0, migrate: true, base: 16 },
  { name: "sku", type: "text", from: 1 },
 ])
 assert.equal(dataset.columns[0].type, "INTEGER")
 assert.deepEqual(dataset.rows, [[36, "A1"], [255, "B2"]])
 assert.deepEqual(dataset.baseline, [[36, "A1"], [255, "B2"]])
 applyDatasetColumns(dataset, [
  { name: "qty", type: "INTEGER", from: 0 },
  { name: "sku", type: "TEXT", from: 1 },
 ])
 assert.deepEqual(dataset.rows, [[36, "A1"], [255, "B2"]])
})
