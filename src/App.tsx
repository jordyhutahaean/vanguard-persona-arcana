"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, Reorder, motion } from "motion/react"
import "./App.css"

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
  { id: "faith", numeral: "", name: "Faith", series: ["p5"] },
]

// Put images in /public/arcana/  ->  fool-p4.png, fool-p5.png, magician-p4.png ...
const artUrl = (id: string, series: Series) => `/arcana/${id}-${series}.png`

/* ------------------------------------------------------------------ */
/* Types for the Order Zone                                            */
/* ------------------------------------------------------------------ */

type ZoneCard = {
  uid: number
  arcanaId: string
  series: Series
  rested: boolean
}

type DragState = { arcana: Arcana; x: number; y: number; overZone: boolean }

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

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

function App() {
  const [cards, setCards] = useState<ZoneCard[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [query, setQuery] = useState("")
  const [drag, setDrag] = useState<DragState | null>(null)

  const zoneRef = useRef<HTMLDivElement>(null)
  const trayRef = useRef<HTMLDivElement>(null)
  const uidRef = useRef(0)

  // pending pointer gesture started on a tray card
  const gesture = useRef<{
    arcana: Arcana
    startX: number
    startY: number
    type: string
    active: boolean
  } | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ARCANA
    return ARCANA.filter((a) => `${a.numeral} ${a.name}`.toLowerCase().includes(q))
  }, [query])

  const isOverZone = (x: number, y: number) => {
    const r = zoneRef.current?.getBoundingClientRect()
    return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
  }

  const addCard = (arcana: Arcana) => {
    const uid = ++uidRef.current
    setCards((c) => [...c, { uid, arcanaId: arcana.id, series: arcana.series[0], rested: false }])
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
        setSelected(null)
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

  return (
    <main
      className="app"
      onPointerDown={(e) => {
        // clicking anywhere that isn't a zone card deselects
        if (!(e.target as HTMLElement).closest("[data-zone-card]")) setSelected(null)
      }}
    >
      {/* ------------------------- ORDER ZONE ------------------------- */}
      <section className="zone-wrap">
        <h1 className="title">Order Zone</h1>
        <div ref={zoneRef} className={`zone ${drag?.overZone ? "zone-over" : ""}`}>
          {cards.length === 0 && <p className="zone-empty">Drag an arcana here</p>}

          <Reorder.Group
            as="div"
            axis="x"
            values={cards}
            onReorder={setCards}
            className="zone-row"
          >
            <AnimatePresence initial={false}>
              {cards.map((card) => {
                const arcana = ARCANA.find((a) => a.id === card.arcanaId)!
                const isSel = selected === card.uid
                return (
                  <Reorder.Item
                    as="div"
                    key={card.uid}
                    value={card}
                    data-zone-card
                    className={`slot ${card.rested ? "slot-rested" : ""} ${isSel ? "slot-selected" : ""}`}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.18 } }}
                    whileDrag={{ scale: 1.08, zIndex: 5 }}
                    dragListener={!isSel} // lets the action buttons receive clicks
                    onTap={(e) => {
                      if ((e.target as HTMLElement).closest("button")) return
                      setSelected(card.uid)
                    }}
                  >
                    <motion.div
                      className="card"
                      animate={{ rotate: card.rested ? 90 : 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    >
                      <CardFace arcana={arcana} series={card.series} />
                    </motion.div>

                    <AnimatePresence>
                      {isSel && (
                        <motion.div
                          className="actions"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <button aria-label="Delete card" onClick={() => remove(card.uid)}>
                            <Icon d={ICON_TRASH} />
                          </button>
                          <button
                            aria-label={card.rested ? "Stand card" : "Rest card"}
                            onClick={() => patch(card.uid, { rested: !card.rested })}
                          >
                            <Icon d={ICON_REST} />
                          </button>
                          {arcana.series.length > 1 && (
                            <button aria-label="Change art" onClick={() => swapArt(card)}>
                              <Icon d={ICON_ART} />
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Reorder.Item>
                )
              })}
            </AnimatePresence>
          </Reorder.Group>
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
          {filtered.map((arcana) => (
            <motion.div
              key={arcana.id}
              className="tray-card"
              whileHover={{ y: -6 }}
              onPointerDown={(e) => {
                if (e.pointerType === "mouse" && e.button !== 0) return
                gesture.current = {
                  arcana,
                  startX: e.clientX,
                  startY: e.clientY,
                  type: e.pointerType,
                  active: false,
                }
              }}
            >
              <div className="card">
                <CardFace arcana={arcana} series={arcana.series[0]} />
              </div>
              <span className="tray-name">
                {arcana.numeral && <b>{arcana.numeral}</b>} {arcana.name}
              </span>
            </motion.div>
          ))}
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
