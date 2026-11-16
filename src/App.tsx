"use client"

import { motion } from "motion/react";
import "./App.css";
import { useRef } from "react"


function App() {
  const constraintsRef = useRef<HTMLDivElement>(null)
  return (
    <main className="app">
      <motion.div ref={constraintsRef} style={constraints}
      >
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 1.5 }}
        drag
        dragConstraints={constraintsRef}
        dragElastic={0.2}
        dragMomentum={false}
        style={box}
 
      />
      </motion.div>
    </main>
  );
}

export default App;

const constraints = {
    width: 800,
    height: 300,
    backgroundColor: "#2e2d2d",
    borderRadius: 10,
}

const box = {
    width: 100,
    height: 100,
    backgroundColor: "hsl(0, 69%, 61%)",
    borderRadius: 10,
}