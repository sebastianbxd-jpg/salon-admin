import { useState, useEffect } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc, collection, query, where } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

// Configuración de Firebase
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
  const [solicitudes, setSolicitudes] = useState([]);
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
    
    const unsubConfig = onSnapshot(doc(db, "configuraciones", user.uid), (snap) => {
      if (snap.exists()) setSalonConfig(snap.data());
    });

    const q = query(collection(db, "citas"), where("adminId", "==", user.uid));
    const unsubCitas = onSnapshot(q, (snap) => {
      const docs = [];
      snap.forEach(d => docs.push({ ...d.data(), id: d.id }));
      setSolicitudes(docs.filter(c => c.estado === "pendiente"));
    });

    return () => { unsubConfig(); unsubCitas(); };
  }, [user]);

  const login = () => signInWithEmailAndPassword(auth, email, pass).catch(() => alert("Credenciales incorrectas"));

  const guardarCambios = async (nuevaConfig) => {
    try {
      await setDoc(doc(db, "configuraciones", user.uid), nuevaConfig);
      alert("¡Cambios guardados con éxito!");
    } catch (e) {
      alert("Error al guardar");
    }
  };

  const agregarProfesional = () => {
    const nombre = prompt("Nombre del profesional:");
    const cargo = prompt("Especialidad:");
    if (nombre && cargo) {
      const n = { ...salonConfig, profesionales: [...(salonConfig.profesionales || []), { nombre, cargo, id: Date.now() }] };
      setSalonConfig(n); 
      guardarCambios(n);
    }
  };

  const agregarServicio = () => {
    const nombre = prompt("Nombre del servicio:");
    const precio = prompt("Precio aproximado:");
    if (nombre && precio) {
      const n = { ...salonConfig, servicios: [...(salonConfig.servicios || []), { nombre, precio, id: Date.now() }] };
      setSalonConfig(n); 
      guardarCambios(n);
    }
  };

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.cream, padding: 20 }}>
        <div style={{ background: C.white, padding: 30, borderRadius: 15, boxShadow: "0 10px 30px rgba(0,0,0,0.1)", width: "100%", maxWidth: 400 }}>
          <h2 style={{ textAlign: "center", fontFamily: "serif", color: C.goldDark, marginBottom: 20 }}>ADMINISTRACIÓN</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
            <input type="email" placeholder="Email" style={{ padding: 12, borderRadius: 8, border: `1px solid ${C.creamDeep}` }} onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Contraseña" style={{ padding: 12, borderRadius: 8, border: `1px solid ${C.creamDeep}` }} onChange={e => setPass(e.target.value)} />
            <button onClick={login} style={{ background: C.goldDark, color: C.white, padding: 12, borderRadius: 8, border: "none", fontWeight: "bold", cursor: "pointer" }}>ENTRAR</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.cream, paddingBottom: 100 }}>
      <header style={{ background: C.white, padding: "20px", textAlign: "center", borderBottom: `1px solid ${C.creamDeep}` }}>
        {salonConfig.logo && <img src={salonConfig.logo} alt="Logo" style={{ height: 50, marginBottom: 10, borderRadius: "50%" }} />}
        <h1 style={{ fontFamily: "serif", fontSize: 20, color: C.goldDark, margin: 0, letterSpacing: 2 }}>{salonConfig.nombre.toUpperCase()}</h1>
      </header>

      <main style={{ padding: 20, maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        
        {tab === "agenda" && (
          <section>
            <h3 style={{ color: C.grayDark }}>📥 Solicitudes Pendientes</h3>
            {solicitudes.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: C.grayLight }}>No hay citas por ahora.</div>
            ) : (
              solicitudes.map(cita => (
                <div key={cita.id} style={{ background: C.white, padding: 15, borderRadius: 12, border: `1px solid ${C.creamDeep}`, marginBottom: 10 }}>
                  <p style={{ margin: "0 0 5px 0" }}><strong>{cita.clienteNombre}</strong> solicita:</p>
                  <p style={{ margin: 0, fontSize: 14 }}>{cita.servicio} - {cita.fecha} {cita.hora}</p>
                  <div style={{ display: "flex", gap: 10, marginTop: 15 }}>
                    <button style={{ flex: 1, background: C.green, color: "white", padding: 8, borderRadius: 8, border: "none", fontSize: 12 }}>Aceptar</button>
                    <button style={{ flex: 1, background: C.blue, color: "white", padding: 8, borderRadius: 8, border: "none", fontSize: 12 }}>Contraoferta</button>
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        {tab === "perfil" && (
          <>
            <section style={{ background: C.white, padding: 20, borderRadius: 15, border: `1px solid ${C.creamDeep}` }}>
              <h3 style={{ marginTop: 0 }}>📸 Identidad del Salón</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input placeholder="Nombre" value={salonConfig.nombre} onChange={e => setSalonConfig({...salonConfig, nombre: e.target.value})} style={{ padding: 12, borderRadius: 8, border: `1px solid ${C.creamDeep}` }} />
                <input placeholder="URL del Logo" value={salonConfig.logo} onChange={e => setSalonConfig({...salonConfig, logo: e.target.value})} style={{ padding: 12, borderRadius: 8, border: `1px solid ${C.creamDeep}` }} />
                <button onClick={() => guardarCambios(salonConfig)} style={{ background: C.green, color: "white", padding: 12, borderRadius: 8, border: "none", fontWeight: "bold", cursor: "pointer" }}>Guardar Perfil</button>
              </div>
            </section>

            <section style={{ background: C.white, padding: 20, borderRadius: 15, border: `1px solid ${C.creamDeep}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 15 }}>
                <h3 style={{ margin: 0 }}>👩‍🎨 Equipo</h3>
                <button onClick={agregarProfesional} style={{ background: C.grayDark, color: "white", padding: "5px 12px", borderRadius: 8, border: "none", fontSize: 12 }}>+ Añadir</button>
              </div>
              {salonConfig.profesionales?.map(p => (
                <div key={p.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.cream}`, fontSize: 14 }}>{p.nombre} • {p.cargo}</div>
              ))}
            </section>

            <section style={{ background: C.white, padding: 20, borderRadius: 15, border: `1px solid ${C.creamDeep}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 15 }}>
                <h3 style={{ margin: 0 }}>✨ Servicios</h3>
                <button onClick={agregarServicio} style={{ background: C.goldDark, color: "white", padding: "5px 12px", borderRadius: 8, border: "none", fontSize: 12 }}>+ Nuevo</button>
              </div>
              {salonConfig.servicios?.map(s => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.cream}`, fontSize: 14 }}>
                  <span>{s.nombre}</span>
                  <span style={{ fontWeight: "bold" }}>${s.precio}</span>
                </div>
              ))}
            </section>
          </>
        )}
      </main>

      <nav style={{ position: "fixed", bottom: 0, width: "100%", background: C.white, display: "flex", justifyContent: "space-around", padding: "15px 0", borderTop: `1px solid ${C.creamDeep}` }}>
        <button onClick={() => setTab("agenda")} style={{ background: "none", border: "none", color: tab === "agenda" ? C.goldDark : C.grayLight, fontWeight: tab === "agenda" ? "bold" : "normal" }}>
          Agenda {solicitudes.length > 0 && <span style={{ background: C.red, color: "white", borderRadius: "50%", padding: "2px 6px", fontSize: 10 }}>{solicitudes.length}</span>}
        </button>
        <button onClick={() => setTab("perfil")} style={{ background: "none", border: "none", color: tab === "perfil" ? C.goldDark : C.grayLight, fontWeight: tab === "perfil" ? "bold" : "normal" }}>Mi Salón</button>
        <button onClick={() => signOut(auth)} style={{ background: "none", border: "none", color: C.red }}>Salir</button>
      </nav>
    </div>
  );
}
