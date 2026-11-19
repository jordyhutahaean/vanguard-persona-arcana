"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { AnimatePresence, motion } from "motion/react"
import "./App.css"

/* ------------------------------------------------------------------ */
/* Rules / constants                                                   */
/* ------------------------------------------------------------------ */

const MAX_PER_ARCANA = 3 // same NAME (Judgment and Aeon count separately)
const LIFT = 18 // how far a selected card rises (px)
const ZONE_PAD_X = 14 // must match .zone horizontal padding in App.css
const MIN_STRIP = 6 // narrowest visible slice of an overlapped card (px)
const GAP = 8 // gap between cards when there is room (px)

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

type Series = "p4" | "p5" // p4 = Persona 3/4 art, p5 = Persona 5 art

type Arcana = {
  id: string // used for the image file name
  numeral: string
  name: string
  series: Series[] // which artworks exist for this arcana
}

const BOTH: Series[] = ["p4", "p5"]

const ARCANA: Arcana[] = [
  { id: "fool", numeral: "0", name: "Fool", series: BOTH },
  { id: "jester", numeral: "0", name: "Jester", series: ["p4"] },
  { id: "magician", numeral: "I", name: "Magician", series: BOTH },
  { id: "councillor", numeral: "I", name: "Councillor", series: ["p5"] },
  { id: "priestess", numeral: "II", name: "Priestess", series: BOTH },
  { id: "empress", numeral: "III", name: "Empress", series: BOTH },
  { id: "emperor", numeral: "IV", name: "Emperor", series: BOTH },
  { id: "hierophant", numeral: "V", name: "Hierophant", series: BOTH },
  { id: "lovers", numeral: "VI", name: "Lovers", series: BOTH },
  { id: "chariot", numeral: "VII", name: "Chariot", series: BOTH },
  { id: "justice", numeral: "VIII", name: "Justice", series: BOTH },
  { id: "hermit", numeral: "IX", name: "Hermit", series: BOTH },
  { id: "fortune", numeral: "X", name: "Fortune", series: BOTH },
  { id: "strength", numeral: "XI", name: "Strength", series: BOTH },
  { id: "hangedman", numeral: "XII", name: "Hanged Man", series: BOTH },
  { id: "death", numeral: "XIII", name: "Death", series: BOTH },
  { id: "temperance", numeral: "XIV", name: "Temperance", series: BOTH },
  { id: "devil", numeral: "XV", name: "Devil", series: BOTH },
  { id: "tower", numeral: "XVI", name: "Tower", series: BOTH },
  { id: "star", numeral: "XVII", name: "Star", series: BOTH },
  { id: "moon", numeral: "XVIII", name: "Moon", series: BOTH },
  { id: "sun", numeral: "XIX", name: "Sun", series: BOTH },
  { id: "judgment", numeral: "XX", name: "Judgment", series: BOTH },
  { id: "aeon", numeral: "XX", name: "Aeon", series: BOTH },
  { id: "faith", numeral: "", name: "Faith", series: BOTH },
]

// Put images in /public/arcana/  ->  fool-p4.webp, fool-p5.webp, magician-p4.webp ...
const artUrl = (id: string, series: Series) => `/arcana/${id}-${series}.webp`

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type ZoneCard = {
  uid: number
  arcanaId: string
  series: Series
  rested: boolean
}

type DragState = { arcana: Arcana; x: number; y: number; overZone: boolean }

/* ------------------------------------------------------------------ */
/* Hand layout: cards overlap just enough to fit the zone width        */
/* ------------------------------------------------------------------ */

function computeLayout(cards: ZoneCard[], width: number, cw: number, ch: number) {
  const n = cards.length
  const vw = cards.map((c) => (c.rested ? ch : cw)) // visual width of each card

  // visible slice of each card for a given step size (last card is fully visible)
  const strips = (s: number) => vw.map((w, i) => (i === n - 1 ? w : Math.min(s, w + GAP)))
  const total = (s: number) => strips(s).reduce((a, b) => a + b, 0)

  let step = ch + GAP
  if (width > 0 && total(step) > width) {
    let lo = MIN_STRIP
    let hi = step
    for (let k = 0; k < 24; k++) {
      const mid = (lo + hi) / 2
      if (total(mid) <= width) lo = mid
      else hi = mid
    }
    step = lo
  }

  const st = strips(step)
  const sum = st.reduce((a, b) => a + b, 0)
  const offset = Math.max(0, (width - sum) / 2) // centre the hand when there's room
  const xs: number[] = []
  let acc = offset
  st.forEach((w) => {
    xs.push(acc)
    acc += w
  })
  return { vw, strips: st, xs, total: sum + offset * 2 }
}

/* ------------------------------------------------------------------ */
/* Card face (image with themed placeholder fallback)                  */
/* ------------------------------------------------------------------ */

function CardFace({ arcana, series }: { arcana: Arcana; series: Series }) {
  const [failed, setFailed] = useState(false)
  const src = artUrl(arcana.id, series)

  useEffect(() => setFailed(false), [src])

  return (
    <div className={`face face-${series}`}>
      {!failed && (
        <img
          src={src}
          alt={`${arcana.name} (${series === "p5" ? "Persona 5" : "Persona 3/4"} art)`}
          draggable={false}
          onError={() => setFailed(true)}
        />
      )}
      {failed && (
        <div className="placeholder">
          <span className="numeral">{arcana.numeral || "•"}</span>
          <span className="label">{arcana.name}</span>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)
const ICON_TRASH = "M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"
const ICON_REST = "M21 12a9 9 0 1 1-3-6.7M21 4v5h-5"
const ICON_ART = "M4 4h16v16H4zM4 15l5-5 5 5 3-3 3 3"
const ICON_ADD = "M12 5v14M5 12h14"
const ICON_CANCEL = "M6 6l12 12M18 6L6 18"

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

function App() {
  const [cards, setCards] = useState<ZoneCard[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [query, setQuery] = useState("")
  const [drag, setDrag] = useState<DragState | null>(null)
  const [notice, setNotice] = useState("")
  const [trayPick, setTrayPick] = useState<string | null>(null) // arcana id picked in the carousel
  const [cw, setCw] = useState(100) // card width in px (responsive)
  const [zoneW, setZoneW] = useState(0) // usable width inside the zone

  const ch = Math.round(cw * 1.4)

  const zoneRef = useRef<HTMLDivElement>(null)
  const trayRef = useRef<HTMLDivElement>(null)
  const uidRef = useRef(0)
  const cardsRef = useRef(cards) // lets window listeners see current cards
  cardsRef.current = cards
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const dragged = useRef(false) // true when a tray gesture became a drag (so the click is ignored)

  const gesture = useRef<{
    arcana: Arcana
    startX: number
    startY: number
    type: string
    active: boolean
  } | null>(null)

  /* ---- counters ---- */
  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    cards.forEach((c) => (m[c.arcanaId] = (m[c.arcanaId] ?? 0) + 1))
    return m
  }, [cards])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ARCANA
    return ARCANA.filter((a) => `${a.numeral} ${a.name}`.toLowerCase().includes(q))
  }, [query])

  /* ---- responsive sizes ---- */
  useEffect(() => {
    const onResize = () => setCw(Math.round(Math.min(110, Math.max(72, window.innerWidth * 0.2))))
    onResize()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  useEffect(() => {
    const el = zoneRef.current
    if (!el) return
    const measure = () => setZoneW(Math.max(0, el.clientWidth - ZONE_PAD_X * 2))
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [])

  const layout = useMemo(() => computeLayout(cards, zoneW, cw, ch), [cards, zoneW, cw, ch])

  /* ---- notices ---- */
  const flash = (msg: string) => {
    setNotice(msg)
    clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(""), 2500)
  }

  const isOverZone = (x: number, y: number) => {
    const r = zoneRef.current?.getBoundingClientRect()
    return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
  }

  const addCard = (arcana: Arcana) => {
    const have = cardsRef.current.filter((c) => c.arcanaId === arcana.id).length
    if (have >= MAX_PER_ARCANA) {
      flash(`${arcana.name} is already at ${MAX_PER_ARCANA}/${MAX_PER_ARCANA}.`)
      return
    }
    const uid = ++uidRef.current
    setCards((c) => [...c, { uid, arcanaId: arcana.id, series: arcana.series[0], rested: false }])
    if (have + 1 >= MAX_PER_ARCANA) setTrayPick(null) // nothing more to add, close the menu
  }

  /* ---- tray -> zone dragging (ghost card follows the pointer) ---- */
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const g = gesture.current
      if (!g) return
      const dx = e.clientX - g.startX
      const dy = e.clientY - g.startY

      if (!g.active) {
        // mouse: start after a few px. touch: only when the swipe is vertical,
        // so horizontal swipes still scroll the carousel.
        const shouldStart =
          g.type === "mouse"
            ? Math.hypot(dx, dy) > 6
            : Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)
        if (!shouldStart) return
        g.active = true
        dragged.current = true
        setSelected(null)
        setTrayPick(null)
      }
      setDrag({ arcana: g.arcana, x: e.clientX, y: e.clientY, overZone: isOverZone(e.clientX, e.clientY) })
    }

    const onUp = (e: PointerEvent) => {
      const g = gesture.current
      gesture.current = null
      if (g?.active && isOverZone(e.clientX, e.clientY)) addCard(g.arcana)
      setDrag(null)
    }

    const onCancel = () => {
      gesture.current = null
      setDrag(null)
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onCancel)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onCancel)
    }
  }, [])

  const scrollTray = (dir: 1 | -1) =>
    trayRef.current?.scrollBy({ left: dir * trayRef.current.clientWidth * 0.8, behavior: "smooth" })

  /* ---- card actions ---- */
  const patch = (uid: number, p: Partial<ZoneCard>) =>
    setCards((cs) => cs.map((c) => (c.uid === uid ? { ...c, ...p } : c)))

  const remove = (uid: number) => {
    setCards((cs) => cs.filter((c) => c.uid !== uid))
    setSelected(null)
  }

  const swapArt = (card: ZoneCard) => {
    const arcana = ARCANA.find((a) => a.id === card.arcanaId)!
    const i = arcana.series.indexOf(card.series)
    patch(card.uid, { series: arcana.series[(i + 1) % arcana.series.length] })
  }

  /* ---- selected card + toolbar position ---- */
  const selIndex = cards.findIndex((c) => c.uid === selected)
  const selCard = selIndex >= 0 ? cards[selIndex] : null
  const selArcana = selCard ? ARCANA.find((a) => a.id === selCard.arcanaId)! : null
  const stackW = Math.max(zoneW, layout.total)
  const TOOLBAR_HALF = 66
  const toolbarX = selCard
    ? Math.min(Math.max(layout.xs[selIndex] + layout.vw[selIndex] / 2, TOOLBAR_HALF), stackW - TOOLBAR_HALF)
    : 0

  const appStyle = { "--cw": `${cw}px`, "--ch": `${ch}px` } as CSSProperties

  return (
    <main
      className="app"
      style={appStyle}
      onPointerDown={(e) => {
        // clicking anywhere that isn't a zone card / its toolbar deselects
        const t = e.target as HTMLElement
        if (!t.closest("[data-zone-card]")) setSelected(null)
        if (!t.closest("[data-tray-card]")) setTrayPick(null)
      }}
    >
      {/* ------------------------- ORDER ZONE ------------------------- */}
      <section className="zone-wrap">
        <div className="zone-head">
          <h1 className="title">
            Order Zone <span className="total">{cards.length} {cards.length === 1 ? "card" : "cards"}</span>
          </h1>
          <p className="notice" role="status" aria-live="polite">{notice}</p>
        </div>

        <div ref={zoneRef} className={`zone ${drag?.overZone ? "zone-over" : ""}`}>
          {cards.length === 0 && <p className="zone-empty">Drag an arcana here</p>}

          <div className="stack" style={{ width: stackW, height: ch + LIFT }}>
            <AnimatePresence initial={false}>
              {cards.map((card, i) => {
                const arcana = ARCANA.find((a) => a.id === card.arcanaId)!
                const isSel = selected === card.uid
                const vw = layout.vw[i]
                const x = layout.xs[i]
                const strip = layout.strips[i]
                const visH = card.rested ? cw : ch
                // show a corner index on overlapped cards so the arcana stays readable
                const showIndex = i < cards.length - 1 && strip < vw - 4

                return (
                  <motion.div
                    key={card.uid}
                    data-zone-card
                    role="button"
                    tabIndex={0}
                    aria-label={`${arcana.name}${card.rested ? ", rested" : ""}. Select for actions.`}
                    className={`hand-card ${isSel ? "is-selected" : ""}`}
                    style={{ zIndex: i }}
                    initial={{ opacity: 0, scale: 0.6, x, y: LIFT, width: vw }}
                    animate={{ opacity: 1, scale: 1, x, y: isSel ? 0 : LIFT, width: vw }}
                    exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.18 } }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    onClick={() => setSelected(card.uid)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        setSelected(card.uid)
                      }
                    }}
                  >
                    <motion.div
                      className="card"
                      animate={{ rotate: card.rested ? 90 : 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    >
                      <CardFace arcana={arcana} series={card.series} />
                    </motion.div>

                    {showIndex && (
                      <div
                        className={`index index-${card.series}`}
                        style={{
                          width: strip,
                          height: visH,
                          fontSize: Math.min(13, Math.max(9, strip * 0.5)),
                        }}
                      >
                        <span>{arcana.numeral ? `${arcana.numeral} ` : ""}{arcana.name}</span>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {/* action menu floats above the selected card */}
            {selCard && selArcana && (
              <motion.div
                key={selCard.uid}
                data-zone-card
                className="actions"
                style={{ left: toolbarX, x: "-50%" }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <button aria-label="Delete card" onClick={() => remove(selCard.uid)}>
                  <Icon d={ICON_TRASH} />
                </button>
                <button
                  aria-label={selCard.rested ? "Stand card" : "Rest card"}
                  onClick={() => patch(selCard.uid, { rested: !selCard.rested })}
                >
                  <Icon d={ICON_REST} />
                </button>
                {selArcana.series.length > 1 && (
                  <button aria-label="Change art" onClick={() => swapArt(selCard)}>
                    <Icon d={ICON_ART} />
                  </button>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* arcana counter */}
        <div className="counter" aria-label="Arcana count">
          {cards.length === 0 ? (
            <span className="counter-empty">No arcana yet. Max {MAX_PER_ARCANA} of each.</span>
          ) : (
            ARCANA.filter((a) => counts[a.id]).map((a) => (
              <span key={a.id} className={`chip ${counts[a.id] >= MAX_PER_ARCANA ? "chip-max" : ""}`}>
                {a.numeral && <b>{a.numeral}</b>} {a.name} {counts[a.id]}/{MAX_PER_ARCANA}
              </span>
            ))
          )}
        </div>
      </section>

      {/* ----------------------- ARCANA CAROUSEL ---------------------- */}
      <section className="tray-wrap">
        <div className="tray-head">
          <input
            className="search"
            type="search"
            placeholder="Search arcana (name or numeral)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="nav" aria-label="Scroll left" onClick={() => scrollTray(-1)}>‹</button>
          <button className="nav" aria-label="Scroll right" onClick={() => scrollTray(1)}>›</button>
        </div>

        <div ref={trayRef} className="tray">
          {filtered.length === 0 && <p className="tray-empty">No arcana match “{query}”.</p>}
          {filtered.map((arcana) => {
            const n = counts[arcana.id] ?? 0
            const maxed = n >= MAX_PER_ARCANA
            const picked = trayPick === arcana.id && !maxed
            const togglePick = () => setTrayPick((p) => (p === arcana.id ? null : arcana.id))
            return (
              <motion.div
                key={arcana.id}
                data-tray-card
                role="button"
                tabIndex={0}
                aria-label={`${arcana.name}. Select to add to the Order Zone.`}
                className={`tray-card ${maxed ? "tray-maxed" : ""} ${picked ? "tray-picked" : ""}`}
                whileHover={maxed ? undefined : { y: -6 }}
                onClick={() => {
                  if (dragged.current) {
                    dragged.current = false // this click is the end of a drag
                    return
                  }
                  if (!maxed) togglePick()
                }}
                onKeyDown={(e) => {
                  if (!maxed && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault()
                    togglePick()
                  }
                }}
                onPointerDown={(e) => {
                  dragged.current = false
                  if (e.pointerType === "mouse" && e.button !== 0) return
                  if (maxed) {
                    flash(`${arcana.name} is already at ${MAX_PER_ARCANA}/${MAX_PER_ARCANA}.`)
                    return
                  }
                  gesture.current = {
                    arcana,
                    startX: e.clientX,
                    startY: e.clientY,
                    type: e.pointerType,
                    active: false,
                  }
                }}
              >
                <div className="thumb">
                  <div className="card">
                    <CardFace arcana={arcana} series={arcana.series[0]} />
                  </div>
                  {n > 0 && (
                    <span className={`count ${maxed ? "count-max" : ""}`}>
                      {n}/{MAX_PER_ARCANA}
                    </span>
                  )}
                </div>
                <span className="tray-name">
                  {arcana.numeral && <b>{arcana.numeral}</b>} {arcana.name}
                </span>

                {/* space is always reserved so the carousel doesn't jump */}
                <div className="tray-actions">
                  {picked && (
                    <motion.div
                      className="tray-actions-row"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      onPointerDown={(e) => e.stopPropagation()} // don't start a drag from the buttons
                    >
                      <button
                        className="btn-add"
                        aria-label={`Add ${arcana.name} to the Order Zone`}
                        title="Send to Order Zone"
                        onClick={(e) => {
                          e.stopPropagation()
                          addCard(arcana) // menu stays open for extra copies until the max is reached
                        }}
                      >
                        <Icon d={ICON_ADD} />
                      </button>
                      <button
                        aria-label="Cancel selection"
                        title="Cancel"
                        onClick={(e) => {
                          e.stopPropagation()
                          setTrayPick(null)
                        }}
                      >
                        <Icon d={ICON_CANCEL} />
                      </button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* -------------------------- DRAG GHOST ------------------------ */}
      {drag && (
        <motion.div
          className="ghost"
          style={{ left: drag.x, top: drag.y }}
          initial={{ scale: 1 }}
          animate={{ scale: drag.overZone ? 1.15 : 1.05, rotate: drag.overZone ? 0 : -4 }}
        >
          <div className="card">
            <CardFace arcana={drag.arcana} series={drag.arcana.series[0]} />
          </div>
        </motion.div>
      )}
    </main>
  )
}

export default App