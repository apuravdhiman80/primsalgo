import React, { useState, useEffect, useRef } from 'react';

/* ==================================================
   3D Isometric Projection Helper
   ================================================== */
const isoProject = (x, y, z, scale = 50) => {
  const angle = Math.PI / 6;
  const sx = (x - y) * Math.cos(angle) * scale;
  const sy = -(x + y) * Math.sin(angle) * scale - z * scale;
  return { sx, sy };
};

/* ==================================================
   3D Arrow Component (Isometric)
   ================================================== */
const Arrow3D = ({ from, to, color, label, scale = 50 }) => {
  const p1 = isoProject(from.x, from.y, from.z, scale);
  const p2 = isoProject(to.x, to.y, to.z, scale);
  const dx = p2.sx - p1.sx;
  const dy = p2.sy - p1.sy;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const headLen = 8;
  return (
    <g>
      <line x1={p1.sx} y1={p1.sy} x2={p2.sx} y2={p2.sy} stroke={color} strokeWidth="2.5" />
      <polygon
        points={`0,-4 ${headLen},0 0,4`}
        fill={color}
        transform={`translate(${p2.sx},${p2.sy}) rotate(${angle})`}
      />
      {label && (
        <text x={p2.sx + 6} y={p2.sy - 6} fill={color} fontSize="12" fontWeight="bold">
          {label}
        </text>
      )}
    </g>
  );
};

/* ==================================================
   Expandable explanation box
   ================================================== */
const Expandable = ({ title, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: '1rem' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'linear-gradient(135deg, #6a11cb, #2575fc)',
          color: 'white',
          border: 'none',
          borderRadius: '25px',
          padding: '0.6rem 1.5rem',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.9rem',
        }}
      >
        {open ? '🔽 Hide' : '▶️'} {title}
      </button>
      {open && (
        <div
          style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '1rem',
            borderRadius: '12px',
            marginTop: '0.5rem',
            lineHeight: 1.8,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

/* ==================================================
   MAIN APP
   ================================================== */
function App() {
  // Coplanarity: c = x·a + y·b, with a=(1,0,0), b=(0,1,0) (XY plane)
  const [cx, setCx] = useState(2.0);
  const [cy, setCy] = useState(1.5);
  const [cz, setCz] = useState(0);  // z=0 → coplanar, else not
  const [autoPlay, setAutoPlay] = useState(false);
  const intervalRef = useRef(null);

  // Auto‑play: cycle c_z between 0 and 1.5 to show leaving/entering the plane
  useEffect(() => {
    if (autoPlay) {
      intervalRef.current = setInterval(() => {
        setCz(prev => (prev === 0 ? 1.5 : 0));
      }, 2000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoPlay]);

  const isCoplanar = Math.abs(cz) < 0.001;

  // Points coplanarity example: A(0,0,0), B(1,0,0), C(0,1,0), D(2,3,0) vs D(2,3,1)
  const [dZ, setDZ] = useState(0);
  const pointA = { x: 0, y: 0, z: 0 };
  const pointB = { x: 2, y: 0, z: 0 };
  const pointC = { x: 0, y: 2, z: 0 };
  const pointD = { x: 1.5, y: 1, z: dZ };
  const AB = { x: pointB.x - pointA.x, y: pointB.y - pointA.y, z: pointB.z - pointA.z };
  const AC = { x: pointC.x - pointA.x, y: pointC.y - pointA.y, z: pointC.z - pointA.z };
  const AD = { x: pointD.x - pointA.x, y: pointD.y - pointA.y, z: pointD.z - pointA.z };
  // Points coplanarity: if AD can be expressed as x·AB + y·AC. Since AB=(1,0,0), AC=(0,1,0), we need AD_z=0
  const pointsCoplanar = Math.abs(AD.z) < 0.001;

  return (
    <div style={styles.appContainer}>
      {/* Global styles */}
      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #0f0c29; color: #e0e0e0; }
        .card {
          background: rgba(255,255,255,0.06);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          padding: 1.5rem;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          margin-bottom: 1.5rem;
          transition: transform 0.3s;
        }
        .card:hover { transform: translateY(-3px); }
        h1, h2, h3, .gradient-text {
          background: linear-gradient(90deg, #c471f5, #fa71cd);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .slider {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: #444;
          -webkit-appearance: none;
          outline: none;
          margin: 10px 0;
        }
        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #6a11cb;
          cursor: pointer;
          border: 2px solid white;
        }
        .btn {
          padding: 10px 24px;
          border: none;
          border-radius: 30px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          font-size: 0.95rem;
        }
        .btn-primary {
          background: linear-gradient(45deg, #6a11cb, #2575fc);
          color: white;
          box-shadow: 0 4px 15px rgba(106,17,203,0.4);
        }
        .btn-primary:hover { transform: translateY(-2px); }
        @keyframes fadeSlide {
          from { opacity:0; transform: translateY(20px); }
          to { opacity:1; transform: translateY(0); }
        }
        .animate-section { animation: fadeSlide 0.8s ease-out; }
        @media (max-width: 768px) {
          .card { padding: 1rem; }
          h1 { font-size: 2rem !important; }
          h2 { font-size: 1.5rem !important; }
          .flex-row { flex-direction: column !important; }
        }
      `}</style>

      {/* Header */}
      <header style={{ textAlign: 'center', padding: '2rem 1rem 1rem' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: '0.3rem' }}>
          📐 Coplanarity of Vectors
        </h1>
        <p style={{ color: '#aaa', fontSize: '1.1rem' }}>
          When three vectors lie in the same plane — the essence of linear dependence
        </p>
        <p style={{ color: '#888', marginTop: '0.5rem', fontSize: '0.9rem' }}>
          Created by <span style={{ color: '#fa71cd', fontWeight: 600 }}>Apurav</span>
        </p>
      </header>

      {/* ---- What is Coplanarity? ---- */}
      <div className="card animate-section" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h2>🔸 What is Coplanarity?</h2>
        <p style={{ marginTop: '0.5rem', lineHeight: 1.8 }}>
          Three vectors <b>a</b>, <b>b</b>, <b>c</b> are <b>coplanar</b> if they all lie in the same plane.
          This happens when one of them can be written as a <b>linear combination</b> of the other two
          (provided those two are not collinear).
        </p>
        <div style={{ background: '#1e1e2f', padding: '1rem', borderRadius: '12px', margin: '1rem 0' }}>
          <strong>🔑 The Magic Formula:</strong>
          <div style={{ fontSize: '2rem', fontFamily: 'monospace', margin: '0.5rem 0' }}>
            <span style={{ color: '#ff6b6b' }}>c</span> = x <span style={{ color: '#6a11cb' }}>a</span> + y <span style={{ color: '#2575fc' }}>b</span>
          </div>
          <p>where <b>x, y</b> are scalars, and <b>a</b> and <b>b</b> are not parallel (non‑collinear).</p>
          <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
            This means <b>c</b> can be “built” by stretching/adding <b>a</b> and <b>b</b> — it never leaves their plane.
          </p>
        </div>
        <Expandable title="Why must a and b be non‑collinear?">
          <p>
            If <b>a</b> and <b>b</b> are collinear, they only span a <b>line</b>, not a plane.
            Then a third vector <b>c</b> could easily lie outside that line, and the condition `c = x a + y b` would only produce vectors on that same line.
            So for a true plane, we need two <b>independent</b> directions.
          </p>
        </Expandable>
      </div>

      {/* ---- Interactive Demo 1: Vector c = x a + y b ---- */}
      <div className="card animate-section" style={{ maxWidth: '900px', margin: '1.5rem auto' }}>
        <h2>🎮 Live 3D Explorer: c = x·a + y·b</h2>
        <p style={{ marginTop: '0.5rem', lineHeight: 1.8 }}>
          In this demo, <b>a = (1,0,0)</b> (purple) and <b>b = (0,1,0)</b> (blue) span the <b>XY plane</b>.
          You can change the components of <b>c</b>. If <b>c_z = 0</b>, then <b>c</b> lies in the plane → coplanar.
        </p>

        <div className="flex-row" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          {/* 3D SVG */}
          <div style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg viewBox="-200 -250 400 350" width="100%" style={{ maxWidth: '400px' }}>
              {/* Coordinate axes */}
              <Arrow3D from={{x:0,y:0,z:0}} to={{x:3.5,y:0,z:0}} color="#aaa" scale={55} label="x" />
              <Arrow3D from={{x:0,y:0,z:0}} to={{x:0,y:3.5,z:0}} color="#aaa" scale={55} label="y" />
              <Arrow3D from={{x:0,y:0,z:0}} to={{x:0,y:0,z:3.5}} color="#aaa" scale={55} label="z" />

              {/* Basis vectors a and b */}
              <Arrow3D from={{x:0,y:0,z:0}} to={{x:2.5,y:0,z:0}} color="#6a11cb" scale={55} label="a" />
              <Arrow3D from={{x:0,y:0,z:0}} to={{x:0,y:2.5,z:0}} color="#2575fc" scale={55} label="b" />

              {/* Plane span (XY plane) – translucent polygon */}
              <polygon
                points={`${isoProject(2.5,0,0,55).sx},${isoProject(2.5,0,0,55).sy}
                         ${isoProject(0,2.5,0,55).sx},${isoProject(0,2.5,0,55).sy}
                         ${isoProject(2.5,2.5,0,55).sx},${isoProject(2.5,2.5,0,55).sy}`}
                fill="rgba(106,17,203,0.15)" stroke="#6a11cb" strokeWidth="1" strokeDasharray="4"
              />

              {/* Vector c */}
              <Arrow3D from={{x:0,y:0,z:0}} to={{x:cx, y:cy, z:cz}} color="#ff6b6b" scale={55} label="c" />

              {/* Projection of c onto the plane when z != 0 */}
              {cz !== 0 && (
                <>
                  <Arrow3D from={{x:0,y:0,z:0}} to={{x:cx, y:cy, z:0}} color="#ffaa00" scale={55} label="proj" />
                  <line
                    x1={isoProject(cx,cy,0,55).sx} y1={isoProject(cx,cy,0,55).sy}
                    x2={isoProject(cx,cy,cz,55).sx} y2={isoProject(cx,cy,cz,55).sy}
                    stroke="#ffaa00" strokeWidth="1.5" strokeDasharray="5"
                  />
                </>
              )}
            </svg>

            <div style={{ width: '100%', marginTop: '0.5rem' }}>
              <div><label>c_x = {cx.toFixed(1)}</label>
                <input type="range" className="slider" min="0" max="3" step="0.1" value={cx}
                  onChange={e => setCx(parseFloat(e.target.value))} />
              </div>
              <div><label>c_y = {cy.toFixed(1)}</label>
                <input type="range" className="slider" min="0" max="3" step="0.1" value={cy}
                  onChange={e => setCy(parseFloat(e.target.value))} />
              </div>
              <div><label>c_z = {cz.toFixed(1)}</label>
                <input type="range" className="slider" min="-2" max="2" step="0.1" value={cz}
                  onChange={e => setCz(parseFloat(e.target.value))} />
              </div>
            </div>

            <button className="btn btn-primary" onClick={() => setAutoPlay(!autoPlay)} style={{ marginTop: '0.8rem' }}>
              {autoPlay ? '⏸️ Stop Auto‑play' : '▶️ Auto‑play (z cycles 0 ↔ 1.5)'}
            </button>

            <div style={{ marginTop: '0.8rem', fontWeight: 'bold', fontSize: '1.1rem',
                          color: isCoplanar ? '#4caf50' : '#ff6b6b' }}>
              {isCoplanar
                ? '✅ Coplanar! c = x·a + y·b (z = 0)'
                : '❌ Not Coplanar – c has a z‑component → cannot be built from a and b alone'}
            </div>
            <p style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>
              c = {cx.toFixed(1)}·a + {cy.toFixed(1)}·b + {cz.toFixed(1)}·k
            </p>
          </div>

          {/* Explanation */}
          <div style={{ flex: '1 1 300px' }}>
            <h3>🧠 How to feel it</h3>
            <ul style={{ lineHeight: 1.8 }}>
              <li>Move <b>c_x</b> and <b>c_y</b>: c slides within the XY plane — always coplanar.</li>
              <li>Move <b>c_z</b> away from zero: c <b>pops out</b> of the plane.</li>
              <li>The <b>orange projection</b> shows the part of c that lives in the plane; the dashed line is the “outside” component.</li>
              <li>Auto‑play makes c jump in and out of the plane, so you can see the condition visually.</li>
            </ul>
            <Expandable title="Why does c_z = 0 guarantee coplanarity?">
              <p>
                Since <b>a</b> and <b>b</b> lie entirely in the XY plane, any linear combination x·a + y·b will also have z = 0.
                So if <b>c</b> has z = 0, it can be expressed as x·a + y·b (we just set x = c_x, y = c_y).
                If c_z ≠ 0, no matter what x and y we choose, the z‑coordinate of x·a + y·b will always be 0, so c cannot be built.
                Therefore, <b>c_z = 0</b> is the exact coplanarity condition for these basis vectors.
              </p>
            </Expandable>
          </div>
        </div>
      </div>

      {/* ---- Coplanarity of Points ---- */}
      <div className="card animate-section" style={{ maxWidth: '900px', margin: '1.5rem auto' }}>
        <h2>📍 Coplanarity of Four Points (A, B, C, D)</h2>
        <p style={{ marginTop: '0.5rem', lineHeight: 1.8 }}>
          Four points are coplanar if the vectors <b>AB</b>, <b>AC</b>, <b>AD</b> are coplanar.
          Use the same condition: <b>AD = x·AB + y·AC</b>.
        </p>
        <div style={{ background: '#1e1e2f', padding: '1rem', borderRadius: '12px', margin: '1rem 0' }}>
          <strong>Formula for Points:</strong>
          <div style={{ fontSize: '1.5rem', fontFamily: 'monospace', margin: '0.5rem 0' }}>
            AD = x·AB + y·AC
          </div>
        </div>

        <div className="flex-row" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          {/* Points 3D demo */}
          <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg viewBox="-200 -250 400 350" width="100%" style={{ maxWidth: '400px' }}>
              <Arrow3D from={{x:0,y:0,z:0}} to={{x:3,y:0,z:0}} color="#aaa" scale={55} label="x" />
              <Arrow3D from={{x:0,y:0,z:0}} to={{x:0,y:3,z:0}} color="#aaa" scale={55} label="y" />
              <Arrow3D from={{x:0,y:0,z:0}} to={{x:0,y:0,z:3}} color="#aaa" scale={55} label="z" />

              {/* Points as spheres */}
              {[{pt: pointA, lbl: 'A', col: '#6a11cb'},
                {pt: pointB, lbl: 'B', col: '#2575fc'},
                {pt: pointC, lbl: 'C', col: '#2575fc'},
                {pt: pointD, lbl: 'D', col: '#ff6b6b'}].map(({pt, lbl, col}) => {
                const proj = isoProject(pt.x, pt.y, pt.z, 55);
                return (
                  <g key={lbl}>
                    <circle cx={proj.sx} cy={proj.sy} r="5" fill={col} />
                    <text x={proj.sx+6} y={proj.sy-6} fill={col} fontSize="12" fontWeight="bold">{lbl}</text>
                  </g>
                );
              })}
            </svg>
            <div style={{ width: '100%', marginTop: '0.5rem' }}>
              <label style={{ fontWeight: 600 }}>D z‑coordinate = {dZ.toFixed(1)}</label>
              <input type="range" className="slider" min="-1.5" max="1.5" step="0.1" value={dZ}
                onChange={e => setDZ(parseFloat(e.target.value))} />
            </div>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
              A(0,0,0), B(2,0,0), C(0,2,0), D(1.5, 1, {dZ.toFixed(1)})
            </p>
            <p style={{ fontWeight: 'bold', color: pointsCoplanar ? '#4caf50' : '#ff6b6b' }}>
              {pointsCoplanar
                ? '✅ Points are coplanar (D lies in the plane ABC)'
                : '❌ Not coplanar – D has a z‑component → cannot be expressed as x·AB + y·AC'}
            </p>
          </div>

          <div style={{ flex: '1 1 300px' }}>
            <h3>📖 Step‑by‑step</h3>
            <ol style={{ lineHeight: 1.8 }}>
              <li>Pick one point, say A, as the reference.</li>
              <li>Compute AB = B − A, AC = C − A, AD = D − A.</li>
              <li>Check if AD can be written as x·AB + y·AC.</li>
              <li>Here AB = (1,0,0), AC = (0,1,0). So AD = (x, y, 0).</li>
              <li>Thus AD_z must be 0 for coplanarity.</li>
            </ol>
            <Expandable title="Why this works – the geometry">
              <p>
                AB and AC span a plane (the XY plane in this case). If D lies in that plane, then the vector AD must also lie in that plane.
                Since any vector in the XY plane has zero z‑component, AD_z = 0 is the condition.
                The moment AD_z ≠ 0, D lifts off the plane.
              </p>
            </Expandable>
          </div>
        </div>
      </div>

      {/* ---- Worked Example ---- */}
      <div className="card animate-section" style={{ maxWidth: '900px', margin: '1.5rem auto' }}>
        <h2>📚 CBSE Board Example</h2>
        <p>
          <b>Q:</b> Show that the points A(1,0,2), B(3,1,4), C(2,2,6), D(1,5,7) are coplanar.
        </p>
        <div style={{ background: '#1e1e2f', padding: '1rem', borderRadius: '12px', marginTop: '1rem' }}>
          <p>AB = (2, 1, 2)</p>
          <p>AC = (1, 2, 4)</p>
          <p>AD = (0, 5, 5)</p>
          <p>We need to find x, y such that AD = x·AB + y·AC.</p>
          <p>From the x‑coordinate: 0 = 2x + y → y = -2x</p>
          <p>From the y‑coordinate: 5 = x + 2y → 5 = x - 4x → -3x = 5 → x = -5/3, then y = 10/3</p>
          <p>Check z‑coordinate: x·AB_z + y·AC_z = (-5/3)*2 + (10/3)*4 = (-10/3 + 40/3) = 30/3 = 10 ≠ 5</p>
          <p style={{ color: '#ff6b6b', fontWeight: 600 }}>✘ Since the z‑coordinate doesn’t match, AD cannot be expressed as a linear combination — the points are <b>not coplanar</b>.</p>
        </div>
        <Expandable title="What if the example was designed to work?">
          <p>
            If the numbers had satisfied the third equation, we would have found scalars x and y. That would prove coplanarity.
            But here the inconsistency shows the points are <b>non‑coplanar</b>, meaning they form a tetrahedron in space.
          </p>
        </Expandable>
      </div>

      {/* ---- Key Formula Recap ---- */}
      <div className="card animate-section" style={{ maxWidth: '900px', margin: '1.5rem auto', textAlign: 'center' }}>
        <h2>🧠 The One Formula to Remember</h2>
        <div
          style={{
            background: '#1e1e2f',
            padding: '2rem',
            borderRadius: '20px',
            display: 'inline-block',
            marginTop: '1rem',
          }}
        >
          <span style={{ fontSize: '2.5rem', fontFamily: 'monospace' }}>
            c = x a + y b
          </span>
          <p style={{ marginTop: '0.5rem', fontSize: '1.1rem' }}>
            (a, b non‑collinear; x, y ∈ ℝ)
          </p>
        </div>
        <p style={{ marginTop: '1.5rem', color: '#aaa', fontStyle: 'italic' }}>
          “Coplanarity means one vector is a combination of the other two — no escape from their plane.”
        </p>
      </div>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '2rem 1rem', color: '#666', fontSize: '0.9rem' }}>
        <p>Made with ❤️ for Class 12 CBSE Students</p>
        <p style={{ marginTop: '0.3rem' }}>
          Created by <span style={{ color: '#fa71cd', fontWeight: 600 }}>Apurav</span>
        </p>
      </footer>
    </div>
  );
}

/* ==================================================
   Inline Styles
   ================================================== */
const styles = {
  appContainer: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '0 1rem 2rem',
    color: '#e0e0e0',
  },
};

export default App;
