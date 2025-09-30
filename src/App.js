// FILE: App.js
import React, { useEffect, useRef, useState } from "react";
import "./App.css";

// Advanced Prim's Algorithm Visualizer (single-file App.js) -------------------------------------------------
// Features:
// - Random geometric graph generation (nodes on canvas, weighted by Euclidean distance)
// - Full-graph edges (complete graph) with weights
// - Step-by-step Prim's algorithm with Play/Pause/StepBackward/StepForward
// - Speed control, node-count control, choose start node, reset, regenerate graph
// - Visual legend, MST weight counter, history for stepping back
// - Clean SVG-based rendering so it works responsively

// Utility: distance
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Key for edge map (a < b)
const edgeKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);

// Build complete edge list for nodes
function buildEdges(nodes) {
  const edges = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const w = dist(nodes[i], nodes[j]);
      edges.push({ a: i, b: j, w: Number(w.toFixed(2)) });
    }
  }
  return edges;
}

// Generate random node positions inside width x height with margin
function genNodes(n, width, height, padding = 40) {
  const nodes = [];
  for (let i = 0; i < n; i++) {
    nodes.push({ x: Math.random() * (width - padding * 2) + padding, y: Math.random() * (height - padding * 2) + padding });
  }
  return nodes;
}

// Minimal binary heap by weight for edges (small and simple)
class MinHeap {
  constructor(arr = []) {
    this.a = arr.slice();
    this._heapify();
  }
  _heapify() {
    for (let i = Math.floor(this.a.length / 2); i >= 0; i--) this._siftDown(i);
  }
  _siftUp(i) {
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.a[i].w >= this.a[p].w) break;
      [this.a[i], this.a[p]] = [this.a[p], this.a[i]];
      i = p;
    }
  }
  _siftDown(i) {
    while (true) {
      const l = i * 2 + 1;
      const r = i * 2 + 2;
      let smallest = i;
      if (l < this.a.length && this.a[l].w < this.a[smallest].w) smallest = l;
      if (r < this.a.length && this.a[r].w < this.a[smallest].w) smallest = r;
      if (smallest === i) break;
      [this.a[i], this.a[smallest]] = [this.a[smallest], this.a[i]];
      i = smallest;
    }
  }
  push(x) {
    this.a.push(x);
    this._siftUp(this.a.length - 1);
  }
  pop() {
    if (!this.a.length) return null;
    const top = this.a[0];
    const last = this.a.pop();
    if (this.a.length) {
      this.a[0] = last;
      this._siftDown(0);
    }
    return top;
  }
  peek() {
    return this.a[0] ?? null;
  }
  size() {
    return this.a.length;
  }
  toArray() {
    return this.a.slice();
  }
}

export default function App() {
  const svgRef = useRef(null);
  const [width, setWidth] = useState(960);
  const [height, setHeight] = useState(560);

  // Graph state
  const [nodeCount, setNodeCount] = useState(12);
  const [nodes, setNodes] = useState(() => genNodes(12, width, height));
  const [edges, setEdges] = useState(() => buildEdges(nodes));

  // Algorithm state
  const [inMST, setInMST] = useState([]); // boolean array
  const [mstEdges, setMstEdges] = useState(new Set()); // set of edgeKey
  const [frontier, setFrontier] = useState([]); // array of edges currently in pq (for display only)
  const [history, setHistory] = useState([]); // steps for undo
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(600); // ms per step
  const [startNode, setStartNode] = useState(0);
  const [currentNode, setCurrentNode] = useState(null);
  const [totalWeight, setTotalWeight] = useState(0);
  const [showWeightsRounded, setShowWeightsRounded] = useState(true);

  // Internal runtime refs
  const heapRef = useRef(null);
  const runningRef = useRef(running);
  runningRef.current = running;
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  // Responsive SVG sizing
  useEffect(() => {
    function handleResize() {
      const el = svgRef.current?.parentElement;
      if (!el) return;
      const w = Math.max(640, Math.min(1200, el.clientWidth - 40));
      const h = Math.max(360, Math.min(760, Math.floor((w * 9) / 16)));
      setWidth(w);
      setHeight(h);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // (Re)generate graph whenever nodeCount changes
  useEffect(() => {
    const n = Math.max(3, Math.min(28, nodeCount));
    const newNodes = genNodes(n, width, height);
    const newEdges = buildEdges(newNodes);
    setNodes(newNodes);
    setEdges(newEdges);
    nodesRef.current = newNodes;
    edgesRef.current = newEdges;
    resetAlgorithm(newNodes, newEdges, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeCount]);

  // Resize graph positions when width/height change a lot (keeps layout pleasant)
  useEffect(() => {
    const newNodes = nodes.map((p) => ({ x: Math.max(30, Math.min(width - 30, p.x)), y: Math.max(30, Math.min(height - 30, p.y)) }));
    const newEdges = buildEdges(newNodes);
    setNodes(newNodes);
    setEdges(newEdges);
    nodesRef.current = newNodes;
    edgesRef.current = newEdges;
    resetAlgorithm(newNodes, newEdges, startNode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  // Reset algorithm state
  function resetAlgorithm(initNodes = nodesRef.current, initEdges = edgesRef.current, start = 0) {
    const n = initNodes.length;
    setInMST(Array(n).fill(false));
    setMstEdges(new Set());
    setFrontier([]);
    setHistory([]);
    heapRef.current = new MinHeap();
    setCurrentNode(null);
    setTotalWeight(0);
    setStartNode(Math.max(0, Math.min(start, n - 1)));
    setRunning(false);
  }

  // Initialize algorithm with a start node
  function initPrim(start = startNode) {
    const n = nodesRef.current.length;
    const inM = Array(n).fill(false);
    inM[start] = true;
    const h = new MinHeap();
    // push edges from start
    edgesRef.current.forEach((e) => {
      if (e.a === start || e.b === start) h.push({ ...e, from: start });
    });
    heapRef.current = h;
    setInMST(inM);
    setFrontier(h.toArray());
    setCurrentNode(start);
    setMstEdges(new Set());
    setHistory([]);
    setTotalWeight(0);
    setRunning(false);
  }

  // Helper to snapshot frontier (for history)
  function frontierSnapshot() {
    const arr = heapRef.current ? heapRef.current.toArray().map((x) => ({ a: x.a, b: x.b, w: x.w, from: x.from })) : [];
    return arr;
  }

  // Single algorithmic step (adds one edge to MST)
  function stepOnce() {
    const n = nodesRef.current.length;
    if (!heapRef.current) {
      // not initialized
      initPrim(startNode);
      return;
    }
    if (mstEdges.size >= n - 1) {
      setRunning(false);
      return; // done
    }

    // Pop until we find an edge that connects MST to outside
    let picked = null;
    while (heapRef.current.size()) {
      const e = heapRef.current.pop();
      const aIn = inMST[e.a];
      const bIn = inMST[e.b];
      // we want exactly one in mst and one out
      if (aIn && !bIn) {
        picked = { ...e, to: e.b };
        break;
      }
      if (!aIn && bIn) {
        picked = { ...e, to: e.a };
        break;
      }
      // else ignore edge that connects two in-mst nodes
    }

    if (!picked) {
      // graph isn't connected (shouldn't happen for complete graph)
      setRunning(false);
      return;
    }

    // Add picked edge to MST
    const newMstEdges = new Set(mstEdges);
    newMstEdges.add(edgeKey(picked.a, picked.b));
    setMstEdges(newMstEdges);

    // mark new node
    const newIn = inMST.slice();
    newIn[picked.to] = true;
    setInMST(newIn);
    setCurrentNode(picked.to);

    // add edges from newly added node
    edgesRef.current.forEach((e) => {
      if (e.a === picked.to || e.b === picked.to) {
        // avoid pushing edges to nodes already in MST on both ends
        const other = e.a === picked.to ? e.b : e.a;
        if (!newIn[other]) heapRef.current.push({ ...e, from: picked.to });
      }
    });

    // update frontier and total weight
    setFrontier(heapRef.current.toArray());
    setTotalWeight((w) => Number((w + picked.w).toFixed(2)));

    // push history for undo
    const snap = {
      added: { a: picked.a, b: picked.b, w: picked.w, to: picked.to },
      frontier: frontierSnapshot(),
      inMST: newIn.slice(),
      totalWeight: Number((totalWeight + picked.w).toFixed(2)),
      current: picked.to,
    };
    setHistory((h) => [...h, snap]);
  }

  // Step backward using history
  function stepBackward() {
    if (!history.length) return;
    const last = history[history.length - 1];
    const newHistory = history.slice(0, history.length - 1);
    // remove last added edge
    const newMst = new Set(mstEdges);
    newMst.delete(edgeKey(last.added.a, last.added.b));
    setMstEdges(newMst);
    setInMST(last.inMST.map((x, i) => (i === last.added.to ? false : x)));
    // rebuild heap from snapshot
    heapRef.current = new MinHeap(last.frontier.map((e) => ({ a: e.a, b: e.b, w: e.w, from: e.from })));
    setFrontier(heapRef.current.toArray());
    setTotalWeight(last.totalWeight);
    setHistory(newHistory);
    setCurrentNode(newHistory.length ? newHistory[newHistory.length - 1].current : null);
  }

  // Running loop
  useEffect(() => {
    if (!running) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      stepOnce();
      if (runningRef.current && mstEdges.size < nodesRef.current.length - 1) {
        setTimeout(tick, Math.max(40, speed));
      } else {
        setRunning(false);
      }
    };
    setTimeout(tick, Math.max(40, speed));
    return () => (cancelled = true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, speed]);

  // UI handlers
  function handleRegenerate() {
    const newNodes = genNodes(nodeCount, width, height);
    const newEdges = buildEdges(newNodes);
    setNodes(newNodes);
    setEdges(newEdges);
    resetAlgorithm(newNodes, newEdges, 0);
  }

  function handleStart() {
    if (!heapRef.current || heapRef.current.size() === 0) initPrim(startNode);
    setRunning(true);
  }
  function handlePause() {
    setRunning(false);
  }
  function handleStepForward() {
    if (!heapRef.current || heapRef.current.size() === 0) initPrim(startNode);
    stepOnce();
  }

  // Compute rendering helpers
  const edgeStates = (() => {
    const setM = mstEdges;
    const fset = new Set(frontier.map((e) => edgeKey(e.a, e.b)));
    const obj = {};
    edges.forEach((e) => {
      const k = edgeKey(e.a, e.b);
      obj[k] = {
        type: setM.has(k) ? "mst" : fset.has(k) ? "frontier" : "normal",
        w: e.w,
        a: e.a,
        b: e.b,
      };
    });
    return obj;
  })();

  // Small helper to format weights
  const fmt = (w) => (showWeightsRounded ? w.toFixed(2) : String(w));

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Prim's Algorithm — Visualizer (Advanced)</h1>
        <div className="sub">Step-by-step, animated MST construction on a geometric graph</div>
      </header>

      <div className="main-grid">
        <aside className="controls">
          <div className="control-row">
            <label>Nodes</label>
            <input type="range" min={4} max={28} value={nodeCount} onChange={(e) => setNodeCount(Number(e.target.value))} />
            <div className="val">{nodeCount}</div>
          </div>

          <div className="control-row">
            <label>Start Node</label>
            <select value={startNode} onChange={(e) => setStartNode(Number(e.target.value))}>
              {nodes.map((_, i) => (
                <option key={i} value={i}>{`Node ${i}`}</option>
              ))}
            </select>
          </div>

          <div className="control-row">
            <label>Speed (ms)</label>
            <input type="range" min={40} max={1200} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
            <div className="val">{speed}ms</div>
          </div>

          <div className="buttons">
            <button onClick={handleRegenerate}>Regenerate Graph</button>
            <button onClick={() => { resetAlgorithm(); initPrim(startNode); }}>Init Prim</button>
            {!running ? (
              <button className="primary" onClick={handleStart}>Play</button>
            ) : (
              <button className="danger" onClick={handlePause}>Pause</button>
            )}
            <button onClick={handleStepForward}>Step Forward</button>
            <button onClick={stepBackward} disabled={!history.length}>Step Back</button>
            <button onClick={() => resetAlgorithm()} title="Clear all algorithm progress">Reset</button>
          </div>

          <div className="meta">
            <div><strong>MST Weight</strong>: {totalWeight.toFixed(2)}</div>
            <div><strong>Edges in MST</strong>: {mstEdges.size}/{Math.max(0, nodes.length - 1)}</div>
            <div><strong>Frontier size</strong>: {frontier.length}</div>
          </div>

          <div className="options">
            <label><input type="checkbox" checked={showWeightsRounded} onChange={(e) => setShowWeightsRounded(e.target.checked)} /> Round weights</label>
          </div>

          <div className="legend">
            <div className="legend-item"><span className="sw mst"/> MST Edge</div>
            <div className="legend-item"><span className="sw frontier"/> Frontier (PQ)</div>
            <div className="legend-item"><span className="sw normal"/> Normal Edge</div>
            <div className="legend-item"><span className="sw node"/> Node</div>
          </div>

          <div className="panel">
            <h3>Pseudo / Notes</h3>
            <ol>
              <li>Choose a start node.</li>
              <li>Push its edges into a min-priority queue.</li>
              <li>Pop the smallest edge that connects to an outside node and add it to MST.</li>
              <li>Push edges from the newly added node that lead outside.</li>
              <li>Repeat until MST has n-1 edges.</li>
            </ol>
          </div>

        </aside>

        <section className="canvas-area">
          <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="graph-svg">
            {/* edges first */}
            <g className="edges">
              {edges.map((e, i) => {
                const k = edgeKey(e.a, e.b);
                const st = edgeStates[k];
                const A = nodes[e.a];
                const B = nodes[e.b];
                const lineClass = st.type === "mst" ? "edge mst" : st.type === "frontier" ? "edge frontier" : "edge normal";
                const strokeW = st.type === "mst" ? 3.2 : st.type === "frontier" ? 2 : 1.0;
                return (
                  <g key={k} className={lineClass}>
                    <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} strokeWidth={strokeW} strokeLinecap="round" />
                    {/* weight label */}
                    <text x={(A.x + B.x) / 2} y={(A.y + B.y) / 2} className="weight-label">{fmt(e.w)}</text>
                  </g>
                );
              })}
            </g>

            {/* MST highlight overlay (to make MST pop) */}
            <g className="mst-overlay">
              {Array.from(mstEdges).map((k) => {
                const [a, b] = k.split("-").map(Number);
                const A = nodes[a];
                const B = nodes[b];
                return <line key={`overlay-${k}`} className="edge overlay" x1={A.x} y1={A.y} x2={B.x} y2={B.y} strokeWidth={4} />;
              })}
            </g>

            {/* nodes */}
            <g className="nodes">
              {nodes.map((p, i) => {
                const active = inMST[i];
                return (
                  <g key={`n-${i}`} className="node-group">
                    <circle cx={p.x} cy={p.y} r={active ? 11 : 8} className={"node " + (active ? "node-in" : "node-out")} />
                    <text x={p.x} y={p.y + 4} className="node-label">{i}</text>
                  </g>
                );
              })}
            </g>
          </svg>

          <div className="right-panel">
            <div className="pq-panel">
              <h4>Priority Queue (top 12)</h4>
              <div className="pq-list">
                {frontier.slice(0, 12).sort((a, b) => a.w - b.w).map((e, idx) => (
                  <div key={`${e.a}-${e.b}-${idx}`} className="pq-item">
                    <div className="pq-edge">{e.a} ↔ {e.b}</div>
                    <div className="pq-w">{fmt(e.w)}</div>
                  </div>
                ))}
                {!frontier.length && <div className="hint">priority queue is empty — init Prim or start</div>}
              </div>
            </div>

            <div className="history-panel">
              <h4>History</h4>
              <div className="history-list">
                {history.slice().reverse().map((h, i) => (
                  <div key={i} className="history-item">Added: {h.added.a}↔{h.added.b} ({h.added.w.toFixed(2)})</div>
                ))}
                {!history.length && <div className="hint">no steps yet</div>}
              </div>
            </div>
          </div>

        </section>
      </div>

      <footer className="app-footer">Made with ❤️ — Prim's Visualizer • Drag window to resize • Feel free to ask for extras (drag nodes, persist graphs, export PNG)</footer>
    </div>
  );
}


/*
  End of App.js
*/

/* FILE: App.css */

