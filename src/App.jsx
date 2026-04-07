import { useState, useEffect } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "firebase/auth";

// ── Firebase config ──
const fbConfig = {
  apiKey: "AIzaSyDYAyfZnmIo6311bCFXo2geSmWKNJgPFqc",
  authDomain: "studio-manager-ab58e.firebaseapp.com",
  projectId: "studio-manager-ab58e",
  storageBucket: "studio-manager-ab58e.firebasestorage.app",
  messagingSenderId: "501132730663",
  appId: "1:501132730663:web:84df2778289cf15aeac902",
};
const fbApp = getApps().length ? getApps()[0] : initializeApp(fbConfig);
const db = getFirestore(fbApp);
const auth = getAuth(fbApp);

const C = {
  white: "#FFFFFF", cream: "#FDFAF4", creamDeep: "#EDE0C4",
  gold: "#C9A84D", goldDark: "#A6893D",
  grayDark: "#222222", grayLight: "#777777",
  red: "#C0392B", green: "#27AE60", amber: "#FFFBEB", amberDark: "#92400E"
};

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [tab, setTab] = useState("perfil"); 
  const [salonConfig, setSalonConfig] = useState({
    nombre: "Viviana Studios",
    logo: "",
    profesionales: [],
    servicios: []
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "configuraciones", user.uid), (snap) => {
      if (snap.exists()) setSalonConfig(snap.data());
    });
    return unsub;
  }, [user]);

  const login = () => signInWithEmailAndPassword(auth, email, pass).catch(() => alert("Credenciales incorrectas"));

  const guardarCambios = async (nuevaConfig) => {
    await setDoc(doc(db, "configuraciones", user.uid), nuevaConfig);
  };

  const agregarProfesional = () => {
    const nombre = prompt("Nombre del profesional:");
    const cargo = prompt("Especialidad (ej: Manicurista):");
    if (nombre && cargo) {
      const nuevaConfig = { ...salonConfig, profesionales: [...(salonConfig.profesionales || []), { nombre, cargo, id: Date.now() }] };
      setSalonConfig(nuevaConfig);
      guardarCambios(nuevaConfig);
    }
  };

  const agregarServicio = () => {
    const nombre = prompt("Nombre del servicio:");
    const precio = prompt("Precio (solo números):");
    if (nombre && precio) {
      const nuevaConfig = { ...salonConfig, servicios: [...(salonConfig.servicios || []), { nombre, precio, id: Date.now() }] };
      setSalonConfig(nuevaConfig);
      guardarCambios(nuevaConfig);
    }
  };

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.cream, padding: 20 }}>
        <div style={{ background: C.white, padding: 40, borderRadius: 15, boxShadow: "0 10px 30px rgba(0,0,0,0.1)", width: "100%", maxWidth: 400 }}>
          <h2 style={{ textAlign: "center", fontFamily: "serif", color: C.goldDark, marginBottom: 30, letterSpacing: 2 }}>ADMINISTRACIÓN</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
            <input type="email" placeholder="Email" style={{ padding: 14, borderRadius: 10, border: `1px solid ${C.creamDeep}`, outline: "none" }} onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Contraseña" style={{ padding: 14, borderRadius: 10, border: `1px solid ${C.creamDeep}`, outline: "none" }} onChange={e => setPass(e.target.value)} />
            <button onClick={login} style={{ background: C.goldDark, color: C.white, padding: 14, borderRadius: 10, border: "none", cursor: "pointer", fontWeight: "bold", marginTop: 10 }}>ENTRAR</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.cream, paddingBottom: 100 }}>
      <header style={{ background: C.white, padding: "25px", textAlign: "center", borderBottom: `1px solid ${C.creamDeep}`, boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
        <h1 style={{ fontFamily: "serif", fontSize: 26, color: C.goldDark, textTransform: "uppercase", letterSpacing: 3 }}>{salonConfig.nombre}</h1>
      </header>

      <main style={{ padding: 20, maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: 25 }}>
        
        {tab === "perfil" && (
          <>
            {/* Gestión del Salón */}
            <section style={{ background: C.white, padding: 25, borderRadius: 15, boxShadow: "0 4px 6px rgba(0,0,0,0.02)", border: `1px solid ${C.creamDeep}` }}>
              <h3 style={{ marginBottom: 20, color: C.grayDark }}>🏠 Configuración General</h3>
              <input 
                value={salonConfig.nombre} 
                onChange={e => setSalonConfig({ ...salonConfig, nombre: e.target.value })}
                style={{ width: "100%", padding: 12, borderRadius: 8, border: `1px solid ${C.creamDeep}`, marginBottom: 10 }}
                placeholder="Nombre del Salón"
              />
              <button onClick={() => guardarCambios(salonConfig)} style={{ width: "100%", background: C.green, color: "white", padding: 12, borderRadius: 8, border: "none", fontWeight: "bold" }}>Guardar Nombre</button>
            </section>

            {/* Equipo de Trabajo */}
            <section style={{ background: C.white, padding: 25, borderRadius: 15, boxShadow: "0 4px 6px rgba(0,0,0,0.02)", border: `1px solid ${C.creamDeep}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ color: C.grayDark, margin: 0 }}>👩‍🎨 Equipo de Trabajo</h3>
                <button onClick={agregarProfesional} style={{ background: C.grayDark, color: "white", padding: "8px 15px", borderRadius: 8, border: "none", fontSize: 13 }}>+ Añadir</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(salonConfig.profesionales || []).map(p => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: 15, background: C.cream, borderRadius: 10, border: `1px solid ${C.creamDeep}` }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: "bold" }}>{p.nombre}</p>
                      <p style={{ margin: 0, fontSize: 11, color: C.grayLight, textTransform: "uppercase" }}>{p.cargo}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Servicios */}
            <section style={{ background: C.white, padding: 25, borderRadius: 15, boxShadow: "0 4px 6px rgba(0,0,0,0.02)", border: `1px solid ${C.creamDeep}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
                <h3 style={{ color: C.grayDark, margin: 0 }}>✨ Servicios</h3>
                <button onClick={agregarServicio} style={{ background: C.gold, color: "white", padding: "8px 15px", borderRadius: 8, border: "none", fontSize: 13 }}>+ Nuevo</button>
              </div>
              <div style={{ background: C.amber, padding: 10, borderRadius: 8, border: `1px solid ${C.creamDeep}`, marginBottom: 15 }}>
                <p style={{ margin: 0, fontSize: 11, color: C.amberDark }}>⚠️ Los precios se mostrarán como "Valores aproximados sujetos a evaluación".</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {(salonConfig.servicios || []).map(s => (
                  <div key={s.id} style={{ padding: 15, border: `1px solid ${C.creamDeep}`, borderRadius: 10 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: "bold" }}>{s.nombre}</p>
                    <p style={{ margin: 0, color: C.goldDark, fontWeight: "bold" }}>${s.precio}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {tab === "agenda" && <p style={{ textAlign: "center", color: C.grayLight, marginTop: 50 }}>Tu agenda inteligente se está configurando...</p>}
      </main>

      <nav style={{ position: "fixed", bottom: 0, width: "100%", background: C.white, display: "flex", justifyContent: "space-around", padding: "15px 0", borderTop: `1px solid ${C.creamDeep}`, boxShadow: "0 -2px 10px rgba(0,0,0,0.05)" }}>
        <button onClick={() => setTab("agenda")} style={{ background: "none", border: "none", color: tab === "agenda" ? C.goldDark : C.grayLight, fontWeight: tab === "agenda" ? "bold" : "normal" }}>Agenda</button>
        <button onClick={() => setTab("perfil")} style={{ background: "none", border: "none", color: tab === "perfil" ? C.goldDark : C.grayLight, fontWeight: tab === "perfil" ? "bold" : "normal" }}>Mi Salón</button>
        <button onClick={() => signOut(auth)} style={{ background: "none", border: "none", color: C.red }}>Salir</button>
      </nav>
    </div>
  );
}
