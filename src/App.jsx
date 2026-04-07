import { useState, useEffect, useCallback } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore, doc, onSnapshot, setDoc
} from "firebase/firestore";
import {
  getAuth, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, sendPasswordResetEmail
} from "firebase/auth";

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

// ── Colores Corporativos ──
const C = {
  white: "#FFFFFF", cream: "#FDFAF4", creamDeep: "#EDE0C4",
  gold: "#C9A84D", goldDark: "#A6893D",
  grayDark: "#222222", grayLight: "#777777",
  red: "#C0392B", green: "#27AE60"
};

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [tab, setTab] = useState("agenda"); // agenda, clientas, servicios, perfil
  const [salonConfig, setSalonConfig] = useState({
    nombre: "Mi Salón",
    logo: "",
    profesionales: []
  });

  // Suscripción al estado de autenticación
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  // Suscripción a la configuración del salón
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "configuraciones", user.uid), (snap) => {
      if (snap.exists()) setSalonConfig(snap.data());
    });
    return unsub;
  }, [user]);

  const login = () => {
    signInWithEmailAndPassword(auth, email, pass).catch(err => alert("Error: Credenciales incorrectas"));
  };

  const resetPassword = () => {
    if (!email) return alert("Escribe tu correo primero");
    sendPasswordResetEmail(auth, email)
      .then(() => alert("Correo de recuperación enviado. Revisa tu bandeja."))
      .catch(() => alert("Error al enviar correo"));
  };

  const guardarPerfil = async () => {
    await setDoc(doc(db, "configuraciones", user.uid), salonConfig);
    alert("Perfil actualizado correctamente");
  };

  // --- VISTA LOGIN ---
  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.cream, padding: 20 }}>
        <div style={{ background: C.white, padding: 40, borderRadius: 12, boxShadow: "0 10px 25px rgba(0,0,0,0.05)", width: "100%", maxWidth: 400 }}>
          <h2 style={{ textAlign: "center", fontFamily: "serif", color: C.goldDark, marginBottom: 20 }}>ADMINISTRACIÓN</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
            <input type="email" placeholder="Email" style={{ padding: 12, borderRadius: 8, border: `1px solid ${C.creamDeep}` }} onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Contraseña" style={{ padding: 12, borderRadius: 8, border: `1px solid ${C.creamDeep}` }} onChange={e => setPass(e.target.value)} />
            <button onClick={login} style={{ background: C.goldDark, color: C.white, padding: 12, borderRadius: 8, border: "none", cursor: "pointer", fontWeight: "bold" }}>ENTRAR</button>
            <button onClick={resetPassword} style={{ background: "none", border: "none", color: C.grayLight, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Olvidé mi contraseña</button>
          </div>
        </div>
      </div>
    );
  }

  // --- VISTA PANEL ---
  return (
    <div style={{ minHeight: "100vh", background: C.cream, paddingBottom: 80 }}>
      {/* Header Dinámico */}
      <header style={{ background: C.white, padding: "20px", textAlign: "center", borderBottom: `1px solid ${C.creamDeep}` }}>
        <h1 style={{ fontFamily: "serif", fontSize: 24, color: C.goldDark, textTransform: "uppercase" }}>{salonConfig.nombre}</h1>
      </header>

      <main style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
        {tab === "perfil" && (
          <div style={{ background: C.white, padding: 20, borderRadius: 8, border: `1px solid ${C.creamDeep}` }}>
            <h3>Configuración del Salón</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 15 }}>
              <label style={{ fontSize: 12, color: C.grayLight }}>Nombre del Local</label>
              <input 
                value={salonConfig.nombre} 
                onChange={e => setSalonConfig({ ...salonConfig, nombre: e.target.value })}
                style={{ padding: 10, borderRadius: 5, border: `1px solid ${C.creamDeep}` }}
              />
              <label style={{ fontSize: 12, color: C.grayLight }}>URL Logo (opcional)</label>
              <input 
                value={salonConfig.logo} 
                onChange={e => setSalonConfig({ ...salonConfig, logo: e.target.value })}
                style={{ padding: 10, borderRadius: 5, border: `1px solid ${C.creamDeep}` }}
              />
              <button onClick={guardarPerfil} style={{ background: C.green, color: "white", padding: 10, borderRadius: 5, border: "none", marginTop: 10 }}>Guardar Cambios</button>
            </div>
          </div>
        )}

        {tab === "agenda" && <p style={{ textAlign: "center", color: C.grayLight }}>Aquí irá tu agenda pronto...</p>}
      </main>

      {/* Menú Inferior Navegación */}
      <nav style={{ position: "fixed", bottom: 0, width: "100%", background: C.white, display: "flex", justifyContent: "space-around", padding: 15, borderTop: `1px solid ${C.creamDeep}` }}>
        <button onClick={() => setTab("agenda")} style={{ background: "none", border: "none", color: tab === "agenda" ? C.goldDark : C.grayLight }}>Agenda</button>
        <button onClick={() => setTab("perfil")} style={{ background: "none", border: "none", color: tab === "perfil" ? C.goldDark : C.grayLight }}>Mi Salón</button>
        <button onClick={() => signOut(auth)} style={{ background: "none", border: "none", color: C.red }}>Salir</button>
      </nav>
    </div>
  );
}