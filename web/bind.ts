import {
 applySelect,
 canonicalColumnType,
 conflictView,
 datasetColumnTypes,
 integerBase,
 readBaseline,
 readPinned,
 selectColumnChecked,
 selectColumnNames,
 selectFilterOf,
 selectOpLabel,
 shiftConflictCursor,
 stampBaseline,
 writeSelectColumn,
 writeSelectFilter,
 type ColumnDraft,
} from "./dataset.ts"
export { applyDatasetColumns } from "./dataset.ts"
import {
 columnSummary,
 summaryOptions,
 tableSummaries,
 writeColumnSummary,
} from "./summary.ts"
import { startAuthentication, startRegistration } from "@simplewebauthn/browser"
import { button } from "../starryui/packages/button/index.ts"
import { checkbox, codefield, field, input } from "../starryui/packages/field/index.ts"
import { paintExamples, paintHome } from "./examples.ts"
import { frame } from "../starryui/packages/frame/index.ts"
import { column, row } from "../starryui/packages/layout/index.ts"
import { loading } from "../starryui/packages/loading/index.ts"
import { markdown } from "../starryui/packages/markdown/index.ts"
import { attachMenu, menu } from "../starryui/packages/menu/index.ts"
import { notice } from "../starryui/packages/notice/index.ts"
import { split } from "../starryui/packages/split/index.ts"
import { table } from "../starryui/packages/table/index.ts"
import { tabs } from "../starryui/packages/tabs/index.ts"
import {
 applyTheme,
 applyThemeDensity,
 attachStyle,
 attachThemeFacetStyle,
 type StarryUITheme,
 type StarryUIThemeFacet,
 type ThemeDensity,
} from "../starryui/packages/theme/index.ts"
import { themeBrilliance } from "../starryui/packages/theme-brilliance/index.ts"
import { themeMidnight } from "../starryui/packages/theme-midnight/index.ts"
import { themeSandstone } from "../starryui/packages/theme-sandstone/index.ts"
import { dialog } from "../starryui/packages/dialog/index.ts"
import { tree } from "../starryui/packages/tree/index.ts"
import { tray, traySpacer } from "../starryui/packages/tray/index.ts"
import {
 type StarryUIComponent,
 type StarryUITraitConfig,
 withClick,
 withOnInput,
 withTextContent,
 withValue,
} from "../starryui/packages/traits/index.ts"

export { themeMidnight }
export {
 applySelect,
 conflictView,
 selectColumnChecked,
 selectColumnNames,
 selectFilterOf,
 selectOpLabel,
 shiftConflictCursor,
 writeSelectColumn,
 writeSelectFilter,
}

let reportError = (error: unknown) => {
 console.error(error)
}

export function setOnError(handler: (message: string) => void) {
 reportError = (error) => {
  const message = error instanceof Error ? error.message : String(error)
  handler(message)
 }
}

export function toggleFullscreen() {
 const result = document.fullscreenElement
  ? document.exitFullscreen()
  : document.documentElement.requestFullscreen()
 return result.catch((error) => {
  reportError(error)
 })
}

async function callCrown(fn: unknown, ...args: unknown[]) {
 if (typeof fn !== "function") {
  return undefined
 }
 const result = await fn(...args)
 if (result && typeof result._check_error === "function") {
  const error = result._check_error()
  if (error) {
   throw new Error(error)
  }
  return result.current()
 }
 return result
}

function guard(fn: unknown) {
 return async (...args: unknown[]) => {
  try {
   return await callCrown(fn, ...args)
  } catch (error) {
   reportError(error)
   return undefined
  }
 }
}

const allThemes = [themeBrilliance, themeMidnight, themeSandstone]
const themeNameStorageKey = "theme"
const densityStorageKey = "density"
let activeTheme = themeMidnight
let activeDensity: ThemeDensity = "comfortable"

function preferredDensity(): ThemeDensity {
 try {
  const stored = localStorage.getItem(densityStorageKey)
  if (stored === "compact" || stored === "comfortable") {
   return stored
  }
 } catch (error) {
  console.error(error)
 }
 return "comfortable"
}

export function density() {
 return activeDensity
}

export function setDensity(value: unknown) {
 const next: ThemeDensity = value === "compact" || value === "comfortable" ? value : activeDensity
 activeDensity = next
 try {
  localStorage.setItem(densityStorageKey, next)
 } catch (error) {
  console.error(error)
 }
 applyThemeDensity(next)
 return next
}
let bodyVariableStyle: HTMLStyleElement | undefined
let bodyFacetStyle: HTMLStyleElement | undefined

function preferredTheme() {
 if (typeof localStorage === "undefined") {
  return themeMidnight
 }
 const stored = localStorage.getItem(themeNameStorageKey)
 return allThemes.find((item) => item.name === stored) ?? themeMidnight
}

function resolveTheme(theme: StarryUITheme) {
 return allThemes.find((item) => item.name === theme.name) ?? theme
}

function liveTheme<T, C extends StarryUITraitConfig>(
 component: StarryUIComponent<T, C>,
): StarryUIComponent<T, C> {
 return new Proxy(component, {
  apply(_target, _thisArg, argArray) {
   return Reflect.apply(applyTheme(activeTheme, component), undefined, argArray)
  },
  get(_target, property) {
   const current = applyTheme(activeTheme, component)
   const value = Reflect.get(current, property)
   if (typeof value === "function") {
    return value.bind(current)
   }
   return value
  },
 })
}

function paintBody(theme: StarryUITheme) {
 const variables = theme.variables ?? {}
 const variableText = `body {\n${Object.entries(variables)
  .map(([name, value]) => ` --${name}: ${value};`)
  .join("\n")}\n}`
 if (!bodyVariableStyle) {
  bodyVariableStyle = document.createElement("style")
  document.head.appendChild(bodyVariableStyle)
 }
 bodyVariableStyle.textContent = variableText
 bodyFacetStyle?.remove()
 bodyFacetStyle = attachStyle(theme, "body", theme.facets.body)
}

function ensureThemeStyles(theme: StarryUITheme) {
 for (const facet of Object.keys(theme.facets)) {
  attachThemeFacetStyle(theme, facet as StarryUIThemeFacet)
 }
}

function retargetThemeClasses(from: string, to: string, extras: readonly HTMLElement[] = []) {
 if (from === to) {
  return
 }
 const prefix = `theme-${from}-`
 const visit = (element: Element) => {
  for (const name of [...element.classList]) {
   if (!name.startsWith(prefix)) {
    continue
   }
   const facet = name.slice(prefix.length)
   element.classList.remove(name)
   element.classList.add(`theme-${to}-${facet}`)
  }
 }
 for (const root of [document.body, ...extras]) {
  visit(root)
  root.querySelectorAll("[class*='theme-']").forEach(visit)
 }
}

function applyAppTheme(theme: StarryUITheme, extras: readonly HTMLElement[] = []) {
 const previousName = activeTheme.name
 if (previousName === theme.name) {
  return
 }
 activeTheme = theme
 try {
  localStorage.setItem(themeNameStorageKey, theme.name)
 } catch (error) {
  console.error(error)
 }
 paintBody(theme)
 ensureThemeStyles(theme)
 retargetThemeClasses(previousName, theme.name, extras)
}

export function shell(theme = preferredTheme()) {
 activeTheme = resolveTheme(theme)
 activeDensity = preferredDensity()
 paintBody(activeTheme)
 applyThemeDensity(activeDensity)
 const ui = createUi(activeTheme)
 const trayElement = ui.tray()
 const status = document.createElement("div")
 const main = ui.column()
 main.style.minHeight = "0"
 document.body.append(trayElement, status, main)
 return {
  main,
  tray: trayElement,
  setStatus(message: string, tone = "error") {
   status.replaceChildren()
   if (message) {
    status.append(ui.notice(tone, message))
   }
  },
 }
}

export function createUi(theme = activeTheme) {
 activeTheme = resolveTheme(theme)
 const themedButton = liveTheme(button)
 const themedCheck = liveTheme(checkbox)
 const themedColumn = liveTheme(column)
 const themedRow = liveTheme(row)
 const themedFrame = liveTheme(frame)
 const themedSplit = liveTheme(split)
 const themedTabs = liveTheme(tabs)
 const themedTree = liveTheme(tree)
 const themedTable = liveTheme(table)
 const themedNotice = liveTheme(notice)
 const themedDialog = liveTheme(dialog)
 const themedField = liveTheme(field)
 const themedInput = liveTheme(input)
 const themedCode = liveTheme(codefield)
 const themedMarkdown = liveTheme(markdown)
 const themedMenu = liveTheme(menu)
 const themedLoading = liveTheme(loading)
 const themedTray = liveTheme(tray)
 const liveMenus: { anchor: HTMLElement; instance: { element: HTMLElement; isOpen: boolean; close(): void } }[] = []
 let menuListening = false

 function pruneMenus() {
  for (let index = liveMenus.length - 1; index >= 0; index -= 1) {
   const entry = liveMenus[index]
   if (!entry.anchor.isConnected) {
    if (entry.instance.isOpen) {
     entry.instance.close()
    }
    liveMenus.splice(index, 1)
   }
  }
 }

 function closeOpenMenus(except?: { close(): void }) {
  for (const entry of liveMenus) {
   if (entry.instance !== except && entry.instance.isOpen) {
    entry.instance.close()
   }
  }
 }

 function ensureMenuListeners() {
  if (menuListening) {
   return
  }
  menuListening = true
  document.addEventListener("click", (event) => {
   const target = event.target
   if (!(target instanceof Node)) {
    return
   }
   for (const entry of liveMenus) {
    if (!entry.instance.isOpen) {
     continue
    }
    if (entry.instance.element.contains(target) || entry.anchor.contains(target)) {
     continue
    }
    entry.instance.close()
   }
  }, true)
  document.addEventListener("keydown", (event) => {
   if (event.key !== "Escape") {
    return
   }
   if (!liveMenus.some((entry) => entry.instance.isOpen)) {
    return
   }
   event.stopPropagation()
   closeOpenMenus()
  })
 }

 return {
  append(parent: HTMLElement, child: HTMLElement) {
   parent.append(child)
   return child
  },
  button(label: string, onClick?: unknown) {
   const traits = [withTextContent(label)]
   if (onClick) {
    traits.push(withClick(() => void guard(onClick)()))
   }
   return themedButton.add(...traits)()
  },
  choice(value: string, options: { value?: string; label?: string }[], onChange?: unknown) {
   const element = document.createElement("select")
   element.style.backgroundColor = "var(--theme0)"
   element.style.border = "1px solid var(--theme8)"
   element.style.boxSizing = "border-box"
   element.style.color = "var(--themef)"
   element.style.font = "inherit"
   element.style.height = "var(--dimension4)"
   element.style.padding = "0 var(--dimension2)"
   const current = String(value ?? "")
   for (const option of options ?? []) {
    const item = document.createElement("option")
    item.value = String(option?.value ?? "")
    item.textContent = String(option?.label ?? option?.value ?? "")
    if (item.value === current) {
     item.selected = true
    }
    element.append(item)
   }
   element.addEventListener("change", () => {
    void guard(onChange)(element.value)
   })
   return element
  },
  check(checked: boolean, onChange?: unknown) {
   return themedCheck.add(
    withValue(checked ? "true" : "false"),
    withOnInput((next) => void guard(onChange)(next)),
   )()
  },
  clear(parent: HTMLElement) {
   parent.replaceChildren()
  },
  code(value: string, onInput?: unknown, onSubmit?: unknown) {
   const box = themedCode.add(
    withValue(value ?? ""),
    withOnInput((next) => void guard(onInput)(next)),
   )()
   box.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
     event.preventDefault()
     void guard(onSubmit)()
    }
   })
   return box
  },
  column() {
   return themedColumn({ themeFacets: ["document"] })
  },
  dialog(title: string) {
   return themedDialog({ title })
  },
  field(label: string, value: string, onInput?: unknown) {
   const control = themedInput.add(
    withValue(value ?? ""),
    withOnInput((next) => void guard(onInput)(next)),
   )()
   return themedField({
    label,
    content(container) {
     container.append(control)
    },
   })
  },
  secret(label: string, value: string, onInput?: unknown) {
   const control = themedInput.add(
    withValue(value ?? ""),
    withOnInput((next) => void guard(onInput)(next)),
   )()
   if (control instanceof HTMLInputElement) {
    control.type = "password"
    control.autocomplete = "current-password"
   }
   return themedField({
    label,
    content(container) {
     container.append(control)
    },
   })
  },
  columnField(label: string, type: string, value: string, onInput?: unknown) {
   const kind = columnInputKind(type)
   const declared = String(type ?? "").trim()
   function caption() {
    const span = document.createElement("span")
    span.textContent = String(label ?? "")
    if (declared) {
     const hint = document.createElement("small")
     hint.textContent = declared
     hint.style.marginLeft = "0.4rem"
     hint.style.opacity = "0.65"
     span.append(hint)
    }
    return span
   }
   if (kind === "boolean") {
    const checked = value === "true" || value === "1" || value === "on"
    const control = themedCheck.add(
     withValue(checked ? "true" : "false"),
     withOnInput((next) => void guard(onInput)(next)),
    )()
    return themedField({
     content(container) {
      container.append(caption(), control)
     },
    })
   }
   const control = themedInput.add(
    withValue(value ?? ""),
    withOnInput((next) => void guard(onInput)(next)),
   )()
   if (control instanceof HTMLInputElement) {
    if (kind === "integer") {
     control.inputMode = "numeric"
     control.type = "number"
     control.step = "1"
    } else if (kind === "real") {
     control.inputMode = "decimal"
     control.type = "number"
     control.step = "any"
    } else if (kind === "date") {
     control.type = "date"
    } else if (kind === "datetime") {
     control.type = "datetime-local"
    } else if (kind === "time") {
     control.type = "time"
    }
   }
   return themedField({
    content(container) {
     container.append(caption(), control)
    },
   })
  },
  frame() {
   const element = themedFrame()
   element.style.height = "auto"
   element.style.marginBottom = "var(--dimension3)"
   element.style.overflow = "visible"
   return element
  },
  heading(text: string) {
   const element = document.createElement("h2")
   element.textContent = text
   return element
  },
  input(value: string, onInput?: unknown) {
   return themedInput.add(
    withValue(value ?? ""),
    withOnInput((next) => void guard(onInput)(next)),
   )()
  },
  nameInput(value: string, onInput?: unknown) {
   const element = themedInput.add(
    withValue(value ?? ""),
    withOnInput((next) => void guard(onInput)(next)),
   )()
   element.style.flex = "1 1 10rem"
   element.style.maxWidth = "16rem"
   element.style.minWidth = "8rem"
   element.style.width = "auto"
   return element
  },
  loading(text: string) {
   return themedLoading.add(withTextContent(text))()
  },
  menu(anchor: HTMLElement, entries: unknown) {
   pruneMenus()
   const items = Array.isArray(entries) ? entries as { id?: string; label?: string; action?: unknown }[] : []
   const instance = themedMenu({
    content(container) {
     container.setAttribute("role", "menu")
     for (const item of items) {
      const row = document.createElement("div")
      row.setAttribute("role", "menuitem")
      row.textContent = item.id === "fullscreen"
       ? (document.fullscreenElement ? "Exit fullscreen" : "Fullscreen")
       : String(item.label ?? "")
      row.addEventListener("click", () => {
       if (item.id === "fullscreen") {
        void toggleFullscreen()
       }
       instance.close()
       if (item.id !== "fullscreen") {
        void guard(item.action)()
       }
      })
      container.append(row)
     }
    },
   })
   const open = instance.open.bind(instance)
   const close = instance.close.bind(instance)
   instance.open = () => {
    closeOpenMenus(instance)
    open()
    anchor.setAttribute("aria-expanded", "true")
   }
   instance.close = () => {
    if (!instance.isOpen) {
     return
    }
    close()
    anchor.setAttribute("aria-expanded", "false")
   }
   anchor.setAttribute("aria-haspopup", "menu")
   anchor.setAttribute("aria-expanded", "false")
   attachMenu(anchor, instance)
   ensureMenuListeners()
   liveMenus.push({ anchor, instance })
   return anchor
  },
  markdown(source: string) {
   return themedMarkdown({ source: source ?? "" })
  },
  notice(tone: string, text: string) {
   const allowed = tone === "error" || tone === "empty" ? tone : "info"
   return themedNotice({ tone: allowed, text })
  },
  pillar() {
   const element = document.createElement("span")
   element.setAttribute("aria-hidden", "true")
   element.style.alignSelf = "stretch"
   element.style.backgroundColor = "var(--theme0)"
   element.style.borderTop = "1px solid var(--theme4)"
   element.style.borderRight = "1px solid var(--theme4)"
   element.style.borderBottom = "1px solid var(--theme4)"
   element.style.borderLeft = "none"
   element.style.boxSizing = "border-box"
   element.style.flex = "0 0 var(--dimension3)"
   element.style.marginLeft = "-1px"
   element.style.width = "var(--dimension3)"
   return element
  },
  row() {
   const element = themedRow()
   element.style.flexGrow = "0"
   element.style.gap = "var(--dimension2)"
   element.style.alignItems = "center"
   element.style.padding = "var(--dimension2)"
   return element
  },
  line() {
   const element = themedRow()
   element.style.flexGrow = "0"
   element.style.gap = "var(--dimension2)"
   element.style.alignItems = "center"
   element.style.padding = "0"
   return element
  },
  grow(element: HTMLElement) {
   element.style.flex = "1 1 auto"
   element.style.justifyContent = "flex-start"
   element.style.minWidth = "0"
   return element
  },
  spacer() {
   return traySpacer(activeTheme)
  },
  themeSwitcher(onChange?: unknown) {
   pruneMenus()
   const anchor = themedButton.add(withTextContent(activeTheme.name))()
   if (anchor instanceof HTMLButtonElement) {
    anchor.type = "button"
   }
   const instance = themedMenu.add({
    type: "onSelect",
    onSelect(selectedThemeName) {
     const selected = allThemes.find((item) => item.name === selectedThemeName)
     if (!selected || selected.name === activeTheme.name) {
      return
     }
     applyAppTheme(selected, liveMenus.map((entry) => entry.instance.element).concat(instance.element, anchor))
     anchor.textContent = selected.name
     void guard(onChange)()
    },
   })({
    content(container) {
     container.setAttribute("role", "menu")
     for (const item of allThemes) {
      const pickTheme = document.createElement("div")
      pickTheme.setAttribute("role", "menuitem")
      pickTheme.textContent = item.name
      pickTheme.setAttribute("data-value", item.name)
      container.appendChild(pickTheme)
     }
    },
   })
   const open = instance.open.bind(instance)
   const close = instance.close.bind(instance)
   instance.open = () => {
    closeOpenMenus(instance)
    open()
    anchor.setAttribute("aria-expanded", "true")
   }
   instance.close = () => {
    if (!instance.isOpen) {
     return
    }
    close()
    anchor.setAttribute("aria-expanded", "false")
   }
   anchor.setAttribute("aria-haspopup", "menu")
   anchor.setAttribute("aria-expanded", "false")
   attachMenu(anchor, instance)
   ensureMenuListeners()
   liveMenus.push({ anchor, instance })
   return anchor
  },
  stepBar() {
   const element = themedRow()
   element.style.flexGrow = "0"
   element.style.flexWrap = "nowrap"
   element.style.alignItems = "stretch"
   element.style.gap = "0"
   element.style.overflow = "visible"
   element.style.padding = "0"
   return element
  },
  stepTools() {
   const element = themedRow()
   element.style.flex = "1 1 auto"
   element.style.minWidth = "0"
   element.style.gap = "var(--dimension2)"
   element.style.alignItems = "center"
   element.style.padding = "var(--dimension2)"
   return element
  },
  stepError(id: string, message: string) {
   const element = themedNotice({ tone: "error", text: message })
   element.setAttribute("data-step-error", String(id))
   element.style.margin = "0 var(--dimension2) var(--dimension2)"
   return element
  },
  split(direction: "row" | "column", ratio: number) {
   const instance = themedSplit({ direction, ratio })
   instance.element.style.flex = "1"
   instance.element.style.minHeight = "0"
   return instance
  },
  table(config: Record<string, unknown>) {
   return themedTable({
    columns: config.columns as [],
    rows: config.rows as [],
    sort: config.sort as [],
    filters: config.filters as [],
    page: config.page as number,
    pageSize: config.pageSize as number,
    total: config.total as number,
    editable: Boolean(config.editable),
    archived: Array.isArray(config.archived) ? (config.archived as boolean[]) : undefined,
    onSort: (sort) => void guard(config.onSort)(sort),
    onFilter: (filters) => void guard(config.onFilter)(filters),
    onPage: typeof config.onPage === "function" ? (page: number) => void guard(config.onPage)(page) : undefined,
    selectedIndex: typeof config.selectedIndex === "number" ? config.selectedIndex : undefined,
    onSelectRow: (index) => void guard(config.onSelectRow)(index),
    onCellEdit: (row, columnName, value) => void guard(config.onCellEdit)(row, columnName, value),
    summary: config.summary as Record<string, string> | undefined,
   })
  },
  tabs(items: { id: string; title: string }[], active: string, onSelect?: unknown) {
   return themedTabs({
    active,
    items,
    onSelect: (id) => void guard(onSelect)(id),
   })
  },
  text(value: string) {
   const element = document.createElement("span")
   element.textContent = value
   return element
  },
  tray() {
   return themedTray()
  },
  tree(nodes: unknown[], selectedId: string, onSelect?: unknown) {
   return themedTree({
    nodes: nodes as [],
    selectedId,
    onSelect: (id) => void guard(onSelect)(id),
   })
  },
 }
}

export async function api(path: string, body?: unknown) {
 const response = await fetch(`/api/${path}`, {
  method: body === undefined ? "GET" : "POST",
  credentials: "same-origin",
  headers: body === undefined ? undefined : { "content-type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
 })
 const text = await response.text()
 let data: { error?: string } | null = null
 try {
  data = text ? JSON.parse(text) : null
 } catch {
  data = { error: text }
 }
 if (!response.ok) {
  throw new Error(data?.error || text || response.statusText)
 }
 return data
}

export function id() {
 return crypto.randomUUID()
}

export async function copyText(value: string) {
 await navigator.clipboard.writeText(String(value ?? ""))
}

export function canCreateNote(user: { limited?: number | boolean } | null, notes: { owned?: number | boolean }[] | null) {
 if (!user || (user.limited !== 1 && user.limited !== true)) {
  return true
 }
 return !(notes ?? []).some((note) => note.owned === 1 || note.owned === true)
}

export function giveableInvites(invites: { status?: string }[] | null) {
 return (invites ?? []).filter((item) => item.status !== "used")
}

export function noteMenu(
 note: { archived?: number | boolean; owned?: number | boolean } | null,
 onArchive: unknown,
 onDelete: unknown,
 onInvite: unknown,
) {
 const archived = note?.archived === 1 || note?.archived === true
 const owned = note?.owned === 1 || note?.owned === true
 const items: { label: string; action: unknown }[] = [
  { label: archived ? "Unarchive" : "Archive", action: onArchive },
 ]
 if (owned) {
  items.push({ label: "Invite collaborator", action: onInvite })
  items.push({ label: "Delete", action: onDelete })
 }
 return items
}

export async function registerWebAuthn(options: unknown) {
 return startRegistration({ optionsJSON: options as Parameters<typeof startRegistration>[0]["optionsJSON"] })
}

export async function authenticateWebAuthn(options: unknown) {
 return startAuthentication({ optionsJSON: options as Parameters<typeof startAuthentication>[0]["optionsJSON"] })
}

const connectionStorageKey = "civil-grone.connectionId"

function normalizePath(pathname: string) {
 const trimmed = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname
 try {
  return decodeURIComponent(trimmed)
 } catch {
  return trimmed
 }
}

export function readRoute() {
 if (typeof location === "undefined") {
  return { section: "", noteId: "", example: "" }
 }
 const path = normalizePath(location.pathname)
 const notes = path.match(/^\/notes(?:\/([^/]+))?$/)
 if (notes) {
  return { section: "notes", noteId: notes[1] ?? "", example: "" }
 }
 const examples = path.match(/^\/examples(?:\/([^/]+))?$/)
 if (examples) {
  return { section: "examples", noteId: "", example: examples[1] ?? "" }
 }
 return { section: "", noteId: "", example: "" }
}

export function writeRoute(section: string, noteId: string, example: string, mode: string) {
 if (typeof location === "undefined" || typeof history === "undefined") {
  return
 }
 const safeSection = section || "databases"
 const id = safeSection === "notes" ? String(noteId ?? "") : ""
 const demo = safeSection === "examples" ? String(example ?? "") : ""
 const next = safeSection === "notes"
  ? (id ? `/notes/${encodeURIComponent(id)}` : "/notes")
  : safeSection === "examples"
   ? (demo ? `/examples/${encodeURIComponent(demo)}` : "/examples")
   : "/"
 const data = { section: safeSection, noteId: id, example: demo }
 const samePath = normalizePath(location.pathname) === normalizePath(next)
 const prev = history.state && typeof history.state === "object"
  ? history.state as { section?: string; noteId?: string; example?: string }
  : null
 const sameState = prev?.section === data.section && (prev?.noteId ?? "") === data.noteId && (prev?.example ?? "") === data.example
 if (samePath && sameState) {
  return
 }
 if (mode === "replace") {
  history.replaceState(data, "", next)
  return
 }
 history.pushState(data, "", next)
}

export function onRoute(handler: unknown) {
 if (typeof window === "undefined") {
  return
 }
 window.addEventListener("popstate", () => {
  const route = readRoute()
  const stored = history.state && typeof history.state === "object"
   ? history.state as { section?: string; example?: string }
   : {}
  if (route.section === "notes") {
   void guard(handler)("notes", route.noteId, "")
   return
  }
  if (route.section === "examples") {
   void guard(handler)("examples", "", route.example)
   return
  }
  void guard(handler)(String(stored.section || "databases"), "", "")
 })
}

export function readConnectionId() {
 try {
  if (typeof localStorage === "undefined") {
   return ""
  }
  return localStorage.getItem(connectionStorageKey) ?? ""
 } catch {
  return ""
 }
}

export function writeConnectionId(id: string) {
 try {
  if (typeof localStorage === "undefined") {
   return
  }
  const text = String(id ?? "")
  if (text) {
   localStorage.setItem(connectionStorageKey, text)
  } else {
   localStorage.removeItem(connectionStorageKey)
  }
 } catch {
  // Selection still works for this session when storage is blocked.
 }
}

export function schemaNodes(
 schema: { tables?: { name: string; columns: { name: string; type: string }[] }[] },
 tableName?: string,
) {
 const wanted = String(tableName ?? "")
 const tables = schema?.tables ?? []
 const shown = wanted ? tables.filter((table) => table.name === wanted) : tables
 return shown.map((table) => ({
  id: table.name,
  label: table.name,
  expanded: true,
  children: table.columns.map((column) => ({
   id: `${table.name}.${column.name}`,
   label: column.type ? `${column.name} ${column.type}` : column.name,
  })),
 }))
}

export function databaseNodes(
 connections: { id?: string; name?: string }[] | undefined,
 tables: { name?: string }[] | undefined,
 activeId: string,
) {
 const id = String(activeId ?? "")
 const active = id !== "" && (connections ?? []).some((connection) => String(connection?.id ?? "") === id)
 if (!active) {
  return []
 }
 return (tables ?? []).map((table) => {
  const name = String(table?.name ?? "")
  return {
   id: `table:${id}:${name}`,
   label: name,
   expanded: true,
   children: [
    {
     id: `data:${id}:${name}`,
     label: "Data",
    },
    {
     id: `schema:${id}:${name}`,
     label: "Schema",
    },
   ],
  }
 })
}

export function databaseSelection(view: string, connectionId: string, table: string) {
 const id = String(connectionId ?? "")
 const name = String(table ?? "")
 if (!id || !name) {
  return ""
 }
 if (view === "schema") {
  return `schema:${id}:${name}`
 }
 return `data:${id}:${name}`
}

export function summaryChoice(
 ui: { choice(value: string, options: { value?: string; label?: string }[], onChange?: unknown): HTMLElement },
 type: string,
 value: string,
 onChange: unknown,
) {
 const options = summaryOptions(type)
 if (options.length === 0) {
  return null
 }
 return ui.choice(value, options, onChange)
}

const columnTypeNames = ["TEXT", "INTEGER", "REAL", "BOOLEAN", "NUMERIC", "BLOB"]

export function columnTypeChoice(
 ui: { choice(value: string, options: { value?: string; label?: string }[], onChange?: unknown): HTMLElement },
 value: string,
 onChange: unknown,
) {
 const current = columnTypeNames.includes(String(value)) ? String(value) : "TEXT"
 return ui.choice(current, columnTypeNames.map((type) => ({ value: type, label: type })), onChange)
}

export { columnSummary, summaryOptions, tableSummaries, writeColumnSummary }

export function readDatabaseNode(value: string) {
 const text = String(value ?? "")
 const sep = text.indexOf(":")
 if (sep < 0) {
  return { view: "data", connectionId: "", table: "" }
 }
 const kind = text.slice(0, sep)
 const rest = text.slice(sep + 1)
 if (kind === "table" || kind === "data" || kind === "schema") {
  const split = rest.indexOf(":")
  return {
   view: kind === "schema" ? "schema" : "data",
   connectionId: split < 0 ? rest : rest.slice(0, split),
   table: split < 0 ? "" : rest.slice(split + 1),
  }
 }
 return { view: "data", connectionId: rest, table: "" }
}

export function tableId(value: string) {
 const text = String(value ?? "")
 const dot = text.indexOf(".")
 return dot === -1 ? text : text.slice(0, dot)
}

export function noteNodes(
 notes: { id: string; title: string; archived?: number | boolean; owned?: number | boolean }[],
 mode?: string,
) {
 return (notes ?? []).filter((note) => {
  const archived = note.archived === true || note.archived === 1
  if (mode === "only") {
   return archived
  }
  if (mode === "show") {
   return true
  }
  return !archived
 }).map((note) => {
  const title = note.title || "Untitled"
  const archived = note.archived === true || note.archived === 1
  const shared = note.owned === 0 || note.owned === false
  const suffix = archived && shared ? " (shared, archived)" : archived ? " (archived)" : shared ? " (shared)" : ""
  return {
   id: note.id,
   label: `${title}${suffix}`,
  }
 })
}

type ArchiveView = "hide" | "show" | "only"

function archiveViewOf(value: unknown): ArchiveView {
 if (value === "show" || value === "only") {
  return value
 }
 return "hide"
}

function archiveFlags(rows: unknown[], archived: unknown) {
 const flags = Array.isArray(archived) ? archived : []
 return rows.map((_, index) => flags[index] === true || flags[index] === 1)
}

function emptyDataset() {
 return {
  columns: [] as { name: string; type?: string }[],
  rows: [] as unknown[][],
  sort: [] as { column: string; direction: string }[],
  filters: [] as { column: string; op: string; value?: string; join?: string }[],
  sourceSql: "",
  archived: [] as boolean[],
  archiveView: "hide" as ArchiveView,
 }
}

export function parseDataset(body: string) {
 try {
  const parsed = JSON.parse(body || "{}")
  const rows = Array.isArray(parsed.rows) ? parsed.rows : []
  return {
   columns: Array.isArray(parsed.columns) ? parsed.columns : [],
   rows,
   sort: Array.isArray(parsed.sort) ? parsed.sort : [],
   filters: Array.isArray(parsed.filters) ? parsed.filters : [],
   sourceSql: typeof parsed.sourceSql === "string" ? parsed.sourceSql : "",
   archived: archiveFlags(rows, parsed.archived),
   archiveView: archiveViewOf(parsed.archiveView),
   baseline: readBaseline(parsed.baseline),
   pinned: readPinned(parsed.pinned),
  }
 } catch {
  return emptyDataset()
 }
}

export function stringifyDataset(dataset: unknown) {
 return JSON.stringify(dataset)
}

export function asDataset(value: unknown) {
 if (!value || typeof value !== "object") {
  return null
 }
 if (Array.isArray((value as { columns?: unknown }).columns) && Array.isArray((value as { rows?: unknown }).rows)) {
  return value
 }
 if (Array.isArray(value) && value.every((row) => row && typeof row === "object" && !Array.isArray(row))) {
  const names = [...new Set(value.flatMap((row) => Object.keys(row as object)))]
  return {
   columns: names.map((name) => ({ name, type: "" })),
   rows: value.map((row) => names.map((name) => (row as Record<string, unknown>)[name])),
   sort: [],
   filters: [],
  }
 }
 return null
}

export function visibleRows(dataset: {
 columns?: { name: string }[]
 rows?: unknown[][]
 sort?: { column: string; direction: string }[]
 filters?: { column: string; op: string; value?: string; join?: string }[]
 archived?: unknown[]
 archiveView?: unknown
}) {
 const columns = dataset?.columns ?? []
 const source = dataset?.rows ?? []
 const flags = archiveFlags(source, dataset?.archived)
 const view = archiveViewOf(dataset?.archiveView)
 let rows = source.filter((_, index) => {
  if (view === "only") {
   return flags[index]
  }
  if (view === "show") {
   return true
  }
  return !flags[index]
 })
 const groups = new Map<string, { op: string; value?: string; join?: string }[]>()
 for (const filter of dataset?.filters ?? []) {
  const list = groups.get(filter.column) ?? []
  list.push(filter)
  groups.set(filter.column, list)
 }
 for (const [column, filters] of groups) {
  const index = columns.findIndex((item) => item.name === column)
  if (index < 0) {
   continue
  }
  rows = rows.filter((row) => matchColumn(row[index], filters))
 }
 const sort = dataset?.sort ?? []
 if (sort.length > 0) {
  rows.sort((left, right) => {
   for (const item of sort) {
    const index = columns.findIndex((column) => column.name === item.column)
    if (index < 0) {
     continue
    }
    const compared = compareCells(left[index], right[index])
    if (compared !== 0) {
     return item.direction === "desc" ? -compared : compared
    }
   }
   return 0
  })
 }
 return rows
}

export function editorRows(dataset: Parameters<typeof visibleRows>[0]) {
 const source = dataset?.rows ?? []
 const flags = archiveFlags(source, dataset?.archived)
 const rows = visibleRows(dataset)
 return {
  rows,
  archived: rows.map((row) => {
   const index = source.indexOf(row)
   return index >= 0 && Boolean(flags[index])
  }),
 }
}

export function archiveViewLabel(view: unknown) {
 const normalized = archiveViewOf(view)
 if (normalized === "show") {
  return "Show archived"
 }
 if (normalized === "only") {
  return "Only archived"
 }
 return "Hide archived"
}

export function datasetSourceIndex(rows: unknown[] | undefined, row: unknown) {
 if (!Array.isArray(rows) || !Array.isArray(row)) {
  return -1
 }
 return rows.indexOf(row)
}

export function shownRowIndex(shown: unknown[] | undefined, source: unknown[] | undefined, sourceIndex: unknown) {
 if (typeof sourceIndex !== "number" || !Array.isArray(shown) || !Array.isArray(source)) {
  return -1
 }
 const row = source[sourceIndex]
 if (!Array.isArray(row)) {
  return -1
 }
 return shown.indexOf(row)
}

export function datasetRowPicked(dataset: { rows?: unknown[] } | null, sourceIndex: unknown) {
 const rows = dataset?.rows ?? []
 return typeof sourceIndex === "number" && sourceIndex >= 0 && sourceIndex < rows.length
}

export function rowArchived(dataset: { rows?: unknown[]; archived?: unknown[] } | null, sourceIndex: unknown) {
 const rows = dataset?.rows ?? []
 if (typeof sourceIndex !== "number" || sourceIndex < 0 || sourceIndex >= rows.length) {
  return false
 }
 return archiveFlags(rows, dataset?.archived)[sourceIndex]
}

export function editDatasetCell(
 dataset: { columns?: { name: string }[]; rows?: unknown[][] },
 sourceIndex: number,
 columnName: string,
 value: string,
) {
 const row = dataset?.rows?.[sourceIndex]
 if (!Array.isArray(row)) {
  return dataset
 }
 const columnIndex = (dataset.columns ?? []).findIndex((column) => column.name === columnName)
 if (columnIndex < 0) {
  return dataset
 }
 row[columnIndex] = value
 return dataset
}

function columnDraftError(drafts: ColumnDraft[], inserting: boolean) {
 if (inserting && drafts.length === 0) {
  return "Add a column before adding a row."
 }
 const seen: string[] = []
 for (const draft of drafts) {
  const name = draft.name.trim()
  if (!name) {
   return "Every column needs a name."
  }
  if (seen.includes(name)) {
   return `Column ${name} is already used.`
  }
  seen.push(name)
 }
 return ""
}

function pushColumnDraft(drafts: ColumnDraft[]) {
 const used = new Set(drafts.map((draft) => draft.name.trim()))
 let index = drafts.length + 1
 let name = `column${index}`
 while (used.has(name)) {
  index += 1
  name = `column${index}`
 }
 drafts.push({ name, type: "text", from: -1 })
 return drafts
}

type SchemaUi = {
 dialog(title: string): { panel: HTMLElement; open(): void; close(): void }
 column(): HTMLElement
 row(): HTMLElement
 field(label: string, value: string, onInput?: unknown): HTMLElement
 choice(value: string, options: { value?: string; label?: string }[], onChange?: unknown): HTMLElement
 button(label: string, onClick?: unknown): HTMLElement
 notice(tone: string, text: string): HTMLElement
 text(value: string): HTMLElement
 append(parent: HTMLElement, child: HTMLElement): unknown
 clear(parent: HTMLElement): void
}

function originalColumnType(dataset: { columns?: { type?: string }[] }, draft: ColumnDraft) {
 if (draft.from < 0) {
  return ""
 }
 return String(dataset.columns?.[draft.from]?.type ?? "")
}

function columnTypeChanged(dataset: { columns?: { type?: string }[] }, draft: ColumnDraft) {
 if (draft.from < 0) {
  return false
 }
 return canonicalColumnType(originalColumnType(dataset, draft)) !== canonicalColumnType(draft.type)
}

function typeOptions(type: string) {
 const options = datasetColumnTypes.map((name) => ({ value: name, label: name }))
 const canonical = canonicalColumnType(type)
 if (canonical && !datasetColumnTypes.includes(canonical)) {
  options.unshift({ value: type, label: type })
 }
 return options
}

function shownColumnType(type: string) {
 const canonical = canonicalColumnType(type)
 return datasetColumnTypes.includes(canonical) ? canonical : type
}

export function openDatasetColumns(
 ui: SchemaUi,
 dataset: { columns?: { name?: string; type?: string }[] },
 addRow: unknown,
 onSave: unknown,
 onError: unknown,
) {
 const inserting = addRow === true || addRow === 1
 const drafts: ColumnDraft[] = (dataset?.columns ?? []).map((column, index) => ({
  name: String(column?.name ?? ""),
  type: String(column?.type ?? ""),
  from: index,
 }))
 if (inserting && drafts.length === 0) {
  pushColumnDraft(drafts)
 }
 let migrationOffered = false
 const editor = ui.dialog("Columns")
 const list = ui.column()
 list.style.flexGrow = "0"
 list.style.gap = "var(--dimension2)"
 list.style.maxHeight = "50vh"
 list.style.overflow = "auto"
 ui.append(editor.panel, list)
 const actions = ui.row()
 actions.style.flexGrow = "0"
 actions.style.padding = "0"
 ui.append(actions, ui.button("Add column", () => {
  pushColumnDraft(drafts)
  paint()
 }))
 ui.append(actions, ui.button("Save changes", () => {
  void commit(false)
 }))
 ui.append(editor.panel, actions)
 const offer = ui.column()
 offer.style.flexGrow = "0"
 offer.style.gap = "var(--dimension2)"
 offer.hidden = true
 offer.setAttribute("data-column-migration", "1")
 ui.append(editor.panel, offer)
 function changedDrafts() {
  return drafts.filter((draft) => columnTypeChanged(dataset, draft))
 }
 function paintMigration() {
  ui.clear(offer)
  const changed = changedDrafts()
  if (!migrationOffered || changed.length === 0) {
   offer.hidden = true
   if (changed.length === 0) {
    migrationOffered = false
   }
   return
  }
  offer.hidden = false
  ui.append(offer, ui.notice(
   "info",
   "Column types changed. Migrate rewrites existing values. Integer text is parsed in the base you set, and 10 is decimal. Save changes again to keep the current values.",
  ))
  for (const draft of changed) {
   const line = ui.row()
   line.style.flexGrow = "0"
   line.style.flexWrap = "wrap"
   line.style.padding = "0"
   const prior = canonicalColumnType(originalColumnType(dataset, draft)) || "TEXT"
   const next = canonicalColumnType(draft.type) || draft.type
   ui.append(line, ui.text(`${draft.name.trim() || "Column"}: ${prior} → ${next}`))
   if (next === "INTEGER") {
    if (!draft.base) {
     draft.base = "10"
    }
    const base = ui.field("Base", String(draft.base), (value: string) => {
     draft.base = value
    })
    base.style.flex = "0 1 6rem"
    base.style.minWidth = "0"
    base.setAttribute("data-integer-base", draft.name.trim())
    ui.append(line, base)
   }
   ui.append(offer, line)
  }
  const migrate = ui.button("Migrate", () => {
   void commit(true)
  })
  migrate.setAttribute("data-migrate", "1")
  ui.append(offer, migrate)
 }
 function paint() {
  ui.clear(list)
  if (drafts.length === 0) {
   ui.append(list, ui.notice("info", "Add a column. Each row stores one value per column."))
  }
  drafts.forEach((draft, index) => {
   const line = ui.row()
   line.style.flexGrow = "0"
   line.style.flexWrap = "wrap"
   line.style.padding = "0"
   const name = ui.field("Name", draft.name, (value: string) => {
    draft.name = value
   })
   name.style.flex = "1 1 8rem"
   name.style.minWidth = "0"
   name.style.width = "auto"
   const type = ui.choice(shownColumnType(draft.type), typeOptions(draft.type), (value: string) => {
    draft.type = value
    paintMigration()
   })
   type.setAttribute("aria-label", "Type")
   type.setAttribute("data-column-type", String(index))
   type.style.flex = "0 1 9rem"
   ui.append(line, name)
   ui.append(line, type)
   ui.append(line, ui.button("Remove", () => {
    drafts.splice(index, 1)
    paint()
    paintMigration()
   }))
   ui.append(list, line)
  })
 }
 async function commit(migrate: boolean) {
  const message = columnDraftError(drafts, inserting)
  if (message) {
   await guard(onError)(message)
   return
  }
  const changed = changedDrafts()
  if (changed.length > 0 && !migrate && !migrationOffered) {
   migrationOffered = true
   paintMigration()
   return
  }
  if (migrate) {
   for (const draft of changed) {
    if (canonicalColumnType(draft.type) !== "INTEGER") {
     continue
    }
    if (integerBase(draft.base) == null) {
     await guard(onError)(`Base for ${draft.name.trim()} must be an integer from 2 to 36.`)
     return
    }
   }
  }
  const saved = drafts.map((draft) => ({
   name: draft.name.trim(),
   type: draft.type.trim(),
   from: draft.from,
   migrate: migrate && columnTypeChanged(dataset, draft),
   base: draft.base,
  }))
  editor.close()
  await guard(onSave)(saved)
 }
 paint()
 editor.open()
}

export function addDatasetRow(dataset: {
 columns?: { name?: string }[]
 rows?: unknown[][]
 archived?: boolean[]
 archiveView?: ArchiveView
}) {
 const columns = dataset?.columns ?? []
 if (columns.length === 0) {
  return -1
 }
 const rows = dataset.rows ?? []
 const flags = archiveFlags(rows, dataset.archived)
 rows.push(columns.map(() => ""))
 flags.push(false)
 dataset.rows = rows
 dataset.archived = flags
 const tracked = dataset as { baseline?: (unknown[] | null)[]; pinned?: string[][] }
 if (Array.isArray(tracked.baseline)) {
  tracked.baseline.push(null)
 }
 if (Array.isArray(tracked.pinned)) {
  tracked.pinned.push([])
 }
 if (archiveViewOf(dataset.archiveView) === "only") {
  dataset.archiveView = "show"
 }
 return rows.length - 1
}

export function toggleDatasetArchive(dataset: { rows?: unknown[][]; archived?: boolean[] }, sourceIndex: number) {
 const rows = dataset?.rows ?? []
 if (sourceIndex < 0 || sourceIndex >= rows.length) {
  return false
 }
 const flags = archiveFlags(rows, dataset.archived)
 flags[sourceIndex] = !flags[sourceIndex]
 dataset.archived = flags
 return flags[sourceIndex]
}

export function setArchiveView(dataset: { archiveView?: ArchiveView }, view: unknown) {
 dataset.archiveView = archiveViewOf(view)
 return dataset.archiveView
}

function matchColumn(cell: unknown, filters: { op: string; value?: string; join?: string }[]) {
 let matched: boolean | null = null
 for (const filter of filters) {
  if (filter.op !== "empty" && (filter.value ?? "") === "") {
   continue
  }
  const next = matchFilter(cell, filter.op, filter.value ?? "")
  if (matched == null) {
   matched = next
  } else if (filter.join === "or") {
   matched = matched || next
  } else {
   matched = matched && next
  }
 }
 return matched ?? true
}

function matchFilter(cell: unknown, op: string, value: string) {
 const text = cell == null ? "" : String(cell)
 if (op === "empty") {
  return text === ""
 }
 if (op === "contains") {
  return text.toLowerCase().includes(value.toLowerCase())
 }
 if (op === "eq") {
  return text === value
 }
 if (op === "neq") {
  return text !== value
 }
 if (op === "gt") {
  return Number(cell) > Number(value)
 }
 if (op === "lt") {
  return Number(cell) < Number(value)
 }
 return true
}

function compareCells(left: unknown, right: unknown) {
 if (typeof left === "number" && typeof right === "number") {
  return left - right
 }
 return String(left ?? "").localeCompare(String(right ?? ""), undefined, { numeric: true })
}

const customersOrdersSql = `CREATE TABLE IF NOT EXISTS customers (
 id INTEGER PRIMARY KEY,
 name TEXT,
 active INTEGER
);
CREATE TABLE IF NOT EXISTS orders (
 id INTEGER PRIMARY KEY,
 customer_id INTEGER,
 total REAL
);
INSERT OR IGNORE INTO customers (id, name, active) VALUES
 (1, 'Ada', 1),
 (2, 'Grace', 1),
 (3, 'Lin', 0);
INSERT OR IGNORE INTO orders (id, customer_id, total) VALUES
 (10, 1, 12.5),
 (11, 1, 4),
 (12, 2, 9);
`

const customersOrdersMatch = "SELECT id, name FROM customers WHERE active = 1"

export function pipelineTemplates() {
 return [
  {
   id: "blank",
   title: "Blank",
   detail: "Start with one empty markdown block.",
   sampleSql: "",
   tables: [] as string[],
   match: "",
   blocks() {
    return [blankBlock("markdown")]
   },
  },
  {
   id: "customers-orders",
   title: "Customers, then orders",
   detail: "A Crown block reads the customers dataset and builds the next orders query. A select block keeps the larger orders.",
   sampleSql: customersOrdersSql,
   tables: ["customers", "orders"],
   match: customersOrdersMatch,
   blocks: pipelineBlocks,
  },
 ]
}

export function sampleForNote(note: { blocks?: { body?: string }[] } | null) {
 const bodies = (note?.blocks ?? []).map((block) => block.body ?? "").join("\n")
 return pipelineTemplates().find((template) => template.match && bodies.includes(template.match)) ?? null
}

export function sampleReady(tables: { name?: string }[] | null, template: { tables?: string[] }) {
 const names = new Set((tables ?? []).map((table) => table.name))
 return (template?.tables ?? []).every((name) => names.has(name))
}

export function pipelineBlocks() {
 return [
  {
   id: id(),
   kind: "markdown",
   name: "",
   body: "# Customers, then orders\n\nThe Crown block reads the customers dataset and builds the next query. The select block keeps orders whose total is greater than 8.",
  },
  {
   id: id(),
   kind: "sql",
   name: "customers",
   body: "SELECT id, name FROM customers WHERE active = 1",
  },
  {
   id: id(),
   kind: "crown",
   name: "orderSql",
   body: "get datasets\nat customers\nat rows\nto rows\nget inList\ncall [ get rows ] 0\nto ids\ntemplate 'SELECT id, customer_id, total FROM orders WHERE customer_id IN (%0)' [ get ids ]\n",
  },
  {
   id: id(),
   kind: "sql",
   name: "orders",
   body: "",
  },
  {
   id: id(),
   kind: "dataset",
   name: "orderRows",
   body: '{"columns":[],"rows":[],"sort":[],"filters":[]}',
  },
  {
   id: id(),
   kind: "select",
   name: "largeOrders",
   body: '{"columns":["id","customer_id","total"],"filters":[{"column":"total","op":"gt","value":"8"}]}',
  },
 ]
}

export function blankBlock(kind: string) {
 const bodies: Record<string, string> = {
  markdown: "",
  crown: "get datasets\n",
  javascript: "return previous\n",
  sql: "SELECT 1\n",
  select: '{"columns":[],"filters":[]}',
  dataset: stringifyDataset({ columns: [], rows: [], sort: [], filters: [] }),
 }
 return { id: id(), kind, name: "", body: bodies[kind] ?? "", output: null }
}

export function insertBlock(blocks: unknown[], index: number, block: unknown) {
 const next = blocks.slice()
 next.splice(index, 0, block)
 return next
}

export function moveBlock(blocks: unknown[], index: number, delta: number) {
 const next = blocks.slice()
 const target = index + delta
 if (target < 0 || target >= next.length) {
  return next
 }
 const [item] = next.splice(index, 1)
 next.splice(target, 0, item)
 return next
}

export function removeBlock(blocks: unknown[], index: number) {
 return blocks.filter((_, itemIndex) => itemIndex !== index)
}

export function makeSql(connectionId: string) {
 return async (statement: string, args: unknown[] = []) => {
  const data = await api("databases/query", { connectionId, sql: statement, args }) as {
   results?: { columns: unknown[]; rows: unknown[][] }[]
  }
  const first = data.results?.find((result) => result.columns?.length) ?? data.results?.[data.results.length - 1]
  return {
   columns: first?.columns ?? [],
   rows: first?.rows ?? [],
   sort: [],
   filters: [],
   sourceSql: statement,
  }
 }
}

export function bindingsBefore(blocks: { name?: string; kind?: string; body?: string; output?: unknown }[], index: number, sql: unknown, helpers: unknown) {
 const datasets: Record<string, unknown> = {}
 let previous: unknown = null
 for (let cursor = 0; cursor < index; cursor += 1) {
  const block = blocks[cursor]
  const published = block.kind === "dataset" ? parseDataset(block.body ?? "") : block.output ?? null
  if (block.name) {
   datasets[block.name] = published
  }
  previous = published
 }
 return { datasets, inList, previous, sql, ...(helpers as object) }
}

export function inList(rows: unknown[], columnIndex = 0) {
 const ids = (rows ?? []).map((row) => {
  const value = Array.isArray(row) ? row[columnIndex] : row
  if (typeof value === "number") {
   return String(value)
  }
  return `'${String(value ?? "").replaceAll("'", "''")}'`
 })
 return ids.length ? ids.join(", ") : "NULL"
}

export async function runUserCrown(source: string, bindings: Record<string, unknown>) {
 const mod = await import("/crown.mjs") as { crown: (context?: unknown, names?: Map<unknown, unknown>, basePath?: string) => CrownScope }
 const scope = mod.crown()
 for (const [key, value] of Object.entries(bindings)) {
  scope.set(key, mod.crown().value(value))
 }
 const program = source.endsWith("\n") ? source : `${source}\n`
 await scope.run(program)
 const error = scope._check_error()
 if (error) {
  throw new Error(error)
 }
 return scope.current()
}

interface CrownScope {
 current(): unknown
 run(source: string): Promise<unknown>
 set(name: string, value: unknown): unknown
 value(value: unknown): unknown
 _check_error(): string | undefined
}

export async function runUserJavaScript(source: string, bindings: Record<string, unknown>) {
 const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
  ...args: string[]
 ) => (...values: unknown[]) => Promise<unknown>
 const runner = new AsyncFunction(
  "sql",
  "datasets",
  "previous",
  "inList",
  "ui",
  "writeDataset",
  "refresh",
  "starry",
  source,
 )
 return runner(
  bindings.sql,
  bindings.datasets,
  bindings.previous,
  bindings.inList,
  bindings.ui,
  bindings.writeDataset,
  bindings.refresh,
  bindings.starry,
 )
}

export function primaryKey(grid: { rows?: unknown[][]; columns?: { name: string }[]; primaryKey?: string[] }, rowIndex: number) {
 const row = grid?.rows?.[rowIndex] ?? []
 const key: Record<string, unknown> = {}
 for (const name of grid?.primaryKey ?? []) {
  const index = (grid.columns ?? []).findIndex((column) => column.name === name)
  key[name] = index >= 0 ? row[index] : null
 }
 return key
}

export function nextSql(blocks: { kind?: string; body?: string }[], index: number, sql: string) {
 const next = blocks.map((block) => ({ ...block }))
 const following = next[index + 1]
 if (following && following.kind === "sql") {
  following.body = sql
  return next
 }
 next.splice(index + 1, 0, { id: id(), kind: "sql", name: "", body: sql, output: null })
 return next
}

export function saveDatasetBlock(blocks: unknown[], index: number, value: unknown) {
 const data = asDataset(value)
 if (!data) {
  return blocks
 }
 const next = blocks.slice()
 next.splice(index + 1, 0, {
  id: id(),
  kind: "dataset",
  name: "",
  body: stringifyDataset(stampBaseline(data as { rows?: unknown[][] })),
  output: null,
 })
 return next
}

export function previousColumns(blocks: { kind?: string; body?: string; output?: unknown }[] | undefined, index: number) {
 const block = blocks?.[index - 1]
 if (!block) {
  return []
 }
 const published = block.kind === "dataset" ? parseDataset(block.body ?? "") : block.output
 const data = asDataset(published)
 if (!data) {
  return []
 }
 const columns = (data as { columns?: { name?: string }[] }).columns ?? []
 return columns.map((column) => String(column?.name ?? "")).filter((name) => name.length > 0)
}

export function mark(element: HTMLElement, name: string, value: string) {
 element?.setAttribute(String(name), value == null ? "" : String(value))
 return element
}

export function press(element: HTMLElement, current: unknown, name: unknown) {
 const on = String(current ?? "") === String(name ?? "")
 element?.setAttribute("data-pressed", on ? "1" : "0")
 element?.setAttribute("aria-pressed", on ? "true" : "false")
 return element
}

export function columnInputKind(type: unknown) {
 const text = String(type ?? "").toUpperCase()
 if (text.includes("BOOL")) {
  return "boolean"
 }
 if (text.includes("DATETIME") || text.includes("TIMESTAMP")) {
  return "datetime"
 }
 if (/(^|[^A-Z])DATE([^A-Z]|$)/.test(text)) {
  return "date"
 }
 if (/(^|[^A-Z])TIME([^A-Z]|$)/.test(text)) {
  return "time"
 }
 if (text.includes("INT")) {
  return "integer"
 }
 if (/REAL|FLOA|DOUB|DEC|NUM/.test(text)) {
  return "real"
 }
 return "text"
}

export function rowFromDrafts(columns: { name: string; type?: string; draft?: unknown }[]) {
 const row: Record<string, unknown> = {}
 for (const column of columns ?? []) {
  if (columnInputKind(column.type) === "boolean") {
   const draft = column.draft
   row[column.name] = draft === true || draft === "true" || draft === 1 || draft === "1" ? 1 : 0
   continue
  }
  if (column.draft != null && column.draft !== "") {
   row[column.name] = column.draft
  }
 }
 return row
}

export function outputText(value: unknown) {
 if (typeof value === "string") {
  return value
 }
 if (value == null) {
  return ""
 }
 try {
  return JSON.stringify(value, null, 2)
 } catch {
  return String(value)
 }
}

export function hideStepError(blockId: string) {
 const id = String(blockId ?? "")
 if (!id) {
  return
 }
 const escaped = typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(id) : id
 document.querySelector(`[data-step-error="${escaped}"]`)?.remove()
}

export function retainStepErrors(
 errors: Record<string, string> | null,
 note: { blocks?: { id?: string }[] } | null,
 bannerId: string,
) {
 const ids = new Set((note?.blocks ?? []).map((block) => String(block?.id ?? "")))
 const next: Record<string, string> = {}
 for (const [id, message] of Object.entries(errors ?? {})) {
  if (ids.has(id) && message) {
   next[id] = message
  }
 }
 const banner = String(bannerId ?? "")
 return {
  errors: next,
  bannerId: banner && next[banner] ? banner : "",
 }
}

export function isElement(value: unknown) {
 return typeof HTMLElement !== "undefined" && value instanceof HTMLElement
}

export function trackUi<T extends { dialog(title: string): { element: HTMLElement } }>(ui: T): T {
 const tracked = {
  ...ui,
  dialog(title: string) {
   const instance = ui.dialog(title)
   instance.element.setAttribute("data-example-dialog", "1")
   return instance
  },
 }
 return tracked as T
}

export function clearScreen(container: HTMLElement) {
 container.removeAttribute("data-screen")
 container.removeAttribute("data-demo")
 document.querySelectorAll("[data-example-dialog]").forEach((node) => node.remove())
}

export function renderExamples(
 container: HTMLElement,
 ui: Parameters<typeof paintExamples>[1],
 onHome: unknown,
 onList: unknown,
 onOpen: unknown,
 onImport: unknown,
 activeId: unknown,
) {
 paintExamples(container, ui, {
  home() {
   void guard(onHome)()
  },
  list() {
   void guard(onList)()
  },
  open(id) {
   void guard(onOpen)(id)
  },
 }, typeof activeId === "string" ? activeId : "", {
  importExample(title, blocks) {
   void guard(onImport)(title, blocks)
  },
  run(source, datasets, writeDataset, refresh, kind) {
   const bindings = {
    datasets,
    previous: null,
    inList,
    sql: async () => ({ columns: [], rows: [], sort: [], filters: [], sourceSql: "" }),
    ui: trackUi(ui),
    starry: { asDataset, id, isElement, parseDataset, stringifyDataset, visibleRows },
    writeDataset,
    refresh,
   }
   if (kind === "javascript") {
    return runUserJavaScript(source, bindings)
   }
   return runUserCrown(source, bindings)
  },
 })
}

export function renderHome(
 container: HTMLElement,
 ui: Parameters<typeof paintHome>[1],
 onDatabases: unknown,
 onNotes: unknown,
 onExamples: unknown,
) {
 paintHome(container, ui, {
  databases() {
   void guard(onDatabases)()
  },
  notes() {
   void guard(onNotes)()
  },
  examples() {
   void guard(onExamples)()
  },
 })
}
