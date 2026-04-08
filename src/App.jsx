import { useState, useEffect } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc, collection, query, where } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

// ── Firebase config (Manteniendo tus credenciales) ──
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
  red: "#C0392B", green: "#27AE60", amber: "#FFFBEB", amberDark: "#92400E", blue: "#3498DB"
};

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [tab, setTab] = useState("perfil"); 
  const [solicitudes, setSolicitudes] = useState([]); // Para las notificaciones de citas
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
    // Escuchar configuración del salón
    const unsubConfig = onSnapshot(doc(db, "configuraciones", user.uid), (snap) => {
      if (snap.exists()) setSalonConfig(snap.data());
    });
    // Escuchar solicitudes de citas nuevas
    const q = query(collection(db, "citas"), where("adminId", "==", user.uid), where("estado", "==", "pendiente"));
    const unsubCitas = onSnapshot(q, (snap) => {
      const docs = [];
      snap.forEach(d => docs.push({ ...d.data(), id: d.id }));
      setSolicitudes(docs);
    });

    return () => { unsubConfig(); unsubCitas(); };
  }, [user]);

  const login = () => signInWithEmailAndPassword(auth, email, pass).catch(() => alert("Credenciales incorrectas"));

  const guardarCambios = async (nuevaConfig) => {
    await setDoc(doc(db, "configuraciones", user.uid), nuevaConfig);
    alert("¡Datos del salón actualizados!");
  };

  const agregarProfesional = () => {
    const nombre = prompt("Nombre del profesional:");
    const cargo = prompt("Especialidad:");
    if (nombre && cargo) {
      const n = { ...salonConfig, profesionales: [...(salonConfig.profesionales || []), { nombre, cargo, id: Date.now() }] };
      setSalonConfig(n); guardarCambios(n);
    }
  };

  const agregarServicio = () => {
    const nombre = prompt("Nombre del servicio:");
    const precio = prompt("Precio aproximado:");
    if (nombre && precio) {
      const n = { ...salonConfig, servicios: [...(salonConfig.servicios || []), { nombre, precio, id: Date.now() }] };
      setSalonConfig(n); guardarCambios(n);
    }
  };

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.cream, padding: 20 }}>
        <div style={{ background: C.white, padding: 40, borderRadius: 15, boxShadow: "0 10px 30px rgba(0,0,0,0.1)", width: "100%", maxWidth: 400 }}>
          <h2 style={{ textAlign: "center", fontFamily: "serif", color: C.goldDark, marginBottom: 30 }}>ADMINISTRACIÓN</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
            <input type="email" placeholder="Email" style={{ padding: 14, borderRadius: 10, border: `1px solid ${C.creamDeep}` }} onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Contraseña" style={{ padding: 14, borderRadius: 10, border: `1px solid ${C.creamDeep}` }} onChange={e => setPass(e.target.value)} />
            <button onClick={login} style={{ background: C.goldDark, color: C.white, padding: 14, borderRadius: 10, border: "none", fontWeight: "bold" }}>ENTRAR</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.cream, paddingBottom: 100 }}>
      <header style={{ background: C.white, padding: "20px", textAlign: "center", borderBottom: `1px solid ${C.creamDeep}` }}>
        {salonConfig.logo && <img src={salonConfig.logo} alt="Logo" style={{ height: 50, marginBottom: 10, borderRadius: "50%" }} />}
        <h1 style={{ fontFamily: "serif", fontSize: 22, color: C.goldDark, margin: 0 }}>{salonConfig.nombre}</h1>
      </header>

      <main style={{ padding: 20, maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        
        {tab === "agenda" && (
          <section>
            <h3 style={{ color: C.grayDark }}>📥 Solicitudes de Citas ({solicitudes.length})</h3>
            {solicitudes.length === 0 ? (
              <p style={{ color: C.grayLight, textAlign: "center", marginTop: 20 }}>No tienes solicitudes pendientes.</p>
            ) : (
              solicitudes.map(cita => (
                <div key={cita.id} style={{ background: C.white, p: 15, borderRadius: 15, border: `1px solid ${C.creamDeep}`, marginBottom: 10, padding: 15 }}>
                  <p><strong>Cliente:</strong> {cita.clienteNombre}</p>
                  <p><strong>Servicio:</strong> {cita.servicio}</p>
                  <p><strong>Propuesta:</strong> {cita.fecha} a las {cita.hora}</p>
                  <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                    <button style={{ flex: 1, background: C.green, color: "white", padding: 8, borderRadius: 8, border: "none" }}>Aceptar</button>
                    <button style={{ flex: 1, background: C.blue, color: "white", padding: 8, borderRadius: 8, border: "none" }}>Contraoferta</button>
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        {tab === "perfil" && (
          <>
            <section style={{ background: C.white, padding: 20, borderRadius: 15, border: `1px solid ${C.creamDeep}` }}>
              <h3 style={{ margin: "0 0 15px 0" }}>📸 Identidad del Local</h3>
              <input 
                placeholder="Nombre del Salón" 
                value={salonConfig.nombre} 
                onChange={e => setSalonConfig({...salonConfig, nombre: e.target.value})}
                style={{ width: "100%", padding: 12, borderRadius: 8, border: `1px solid ${C.creamDeep}`, marginBottom: 10 }} 
              />
              <input 
                placeholder="URL del Logo (ej: https://...)" 
                value={salonConfig.logo} 
                onChange={e => setSalonConfig({...salonConfig, logo: e.target.value})}
                style={{ width: "100%", padding: 12, borderRadius: 8, border: `1px solid ${C.creamDeep}`, marginBottom: 10 }} 
              />
              <button onClick={() => guardarCambios(salonConfig)} style={{ width: "100%", background: C.green, color: "white", padding: 12, borderRadius: 8, border: "none", fontWeight: "bold" }}>Guardar Identidad</button>
            </section>

            <section style={{ background: C.white, padding: 20, borderRadius: 15, border: `1px solid ${C.creamDeep}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
                <h3 style={{ margin: 0 }}>👩‍🎨 Equipo</h3>
                <button onClick={agregarProfesional} style={{ background: C.grayDark, color: "white", padding: "5px 15px", borderRadius: 8, border: "none" }}>+ Añadir</button>
              </div>
              {salonConfig.profesionales?.map(p => (
                <div key={p.id} style={{ padding: 10, borderBottom: `1px solid ${C.cream}`, fontSize: 14 }}>{p.nombre} - {p.cargo}</div>
              ))}
            </section>
          </>
        )}
      </main>

      <nav style={{ position: "fixed", bottom: 0, width: "100%", background: C.white, display: "flex", justifyContent: "space-around", padding: "15px 0", borderTop: `1px solid ${C.creamDeep}` }}>
        <button onClick={() => setTab("agenda")} style={{ background: "none", border: "none", color: tab === "agenda" ? C.goldDark : C.grayLight }}>
          Agenda {solicitudes.length > 0 && <span style={{ background: C.red, color: "white", borderRadius: "50%", padding: "2px 6px", fontSize: 10 }}>{solicitudes.length}</span>}
        </button>
        <button onClick={() => setTab("perfil")} style={{ background: "none", border: "none", color: tab === "perfil" ? C.goldDark : C.grayLight }}>Mi Salón</button>
        <button onClick={() => signOut(auth)} style={{ background: "none", border: "none", color: C.red }}>Salir</button>
      </nav>
    </div>
  );
}
    </div>
  );
}
