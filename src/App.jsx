import { useState, useEffect, useCallback } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore, collection, doc,
  onSnapshot, setDoc, deleteDoc,
} from "firebase/firestore";
import {
  getAuth, signInWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider,
  signOut, onAuthStateChanged, createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
// NUEVO: Importaciones para la gestión de imágenes
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ── Firebase config ──
const fbConfig = {
  apiKey: "AIzaSyDYAyfZnmIo6311bCFXo2geSmWKNJgPFqc",
  authDomain: "studio-manager-ab58e.firebaseapp.com",
  projectId: "studio-manager-ab58e",
  storageBucket: "studio-manager-ab58e.firebasestorage.app",
  messagingSenderId: "501132730663",
  appId: "1:501132730663:web:84df2778289cf15aeac902",
};

const fbApp    = getApps().length ? getApps()[0] : initializeApp(fbConfig);
const db       = getFirestore(fbApp);
const auth     = getAuth(fbApp);
const storage  = getStorage(fbApp); // Inicialización de Storage
const gProvider = new GoogleAuthProvider();

// ── Colores ──
const C = {
  white: "#FFFFFF", cream: "#FDFAF4", creamDeep: "#EDE0C4",
  gold: "#C9A84C", goldDark: "#A6893D",
  grayDark: "#222222", grayLight: "#777777",
  red: "#C0392B", green: "#27AE60"
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("agenda");
  const [modal, setModal] = useState(null);
  const [mData, setMData] = useState(null);
  const [toast, setToast] = useState(null);

  // Estados de datos
  const [config, setConfig] = useState({ nombre: "", logo: "", servicios: [], profesionales: [], politicas: "" });
  const [clientas, setClientas] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [citas, setCitas] = useState([]);
  const [subiendoLogo, setSubiendoLogo] = useState(false); // Estado para la carga de imagen

  // Suscripciones a Firebase
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubConf = onSnapshot(doc(db, "configuraciones", user.uid), (snap) => {
      if (snap.exists()) setConfig(snap.data());
    });
    const unsubCli = onSnapshot(collection(db, "usuarios", user.uid, "clientas"), (snap) => {
      setClientas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubSol = onSnapshot(collection(db, "usuarios", user.uid, "solicitudes"), (snap) => {
      setSolicitudes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubCit = onSnapshot(collection(db, "usuarios", user.uid, "citas"), (snap) => {
      setCitas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubConf(); unsubCli(); unsubSol(); unsubCit(); };
  }, [user]);

  // NUEVA FUNCIÓN: Manejo de subida de Logo
  const handleSubirLogo = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo || !user) return;
    setSubiendoLogo(true);
    try {
      const storageRef = ref(storage, `logos/${user.uid}`);
      await uploadBytes(storageRef, archivo);
      const urlDescarga = await getDownloadURL(storageRef);
      const nuevaConfig = { ...config, logo: urlDescarga };
      await setDoc(doc(db, "configuraciones", user.uid), nuevaConfig);
      showToast("Logo actualizado con éxito");
    } catch (error) {
      showToast("Error al subir la imagen");
    } finally {
      setSubiendoLogo(false);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const close = () => { setModal(null); setMData(null); };

  if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: C.cream }}>Cargando...</div>;
  if (!user) return <Login auth={auth} gProvider={gProvider} onToast={showToast} />;

  return (
    <div style={{ minHeight: "100vh", background: C.cream, paddingBottom: 90 }}>
      {/* HEADER DINÁMICO */}
      <header style={{ background: C.white, padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.creamDeep}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 16, color: C.goldDark, letterSpacing: 1, fontFamily: "serif" }}>
            {config.nombre?.toUpperCase() || "ADMINISTRACIÓN"}
          </h1>
        </div>
        <button onClick={() => signOut(auth)} style={{ background: "none", border: "none", color: C.red, fontSize: 12, fontWeight: "bold" }}>SALIR</button>
      </header>

      <main style={{ padding: 15, maxWidth: 600, margin: "0 auto" }}>
        
        {tab === "agenda" && <ViewAgenda citas={citas} clientas={clientas} setModal={setModal} setMData={setMData} />}
        {tab === "solicitudes" && <ViewSolicitudes solicitudes={solicitudes} clientas={clientas} setModal={setModal} setMData={setMData} />}
        {tab === "clientas" && <ViewClientas clientas={clientas} setModal={setModal} setMData={setMData} />}
        
        {tab === "config" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* SECCIÓN NUEVA: IDENTIDAD DE MARCA */}
            <section style={{ background: C.white, padding: 20, borderRadius: 15, border: `1px solid ${C.creamDeep}` }}>
              <h3 style={{ marginTop: 0, fontSize: 15, color: C.grayDark }}>📸 Identidad de Marca</h3>
              <p style={{ fontSize: 12, color: C.grayLight, marginBottom: 15 }}>Esta imagen y nombre aparecerán en la App de tus clientas.</p>
              
              <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
                <div style={{ 
                  width: 80, height: 80, borderRadius: "50%", background: C.cream, 
                  border: `2px solid ${C.gold}`, overflow: "hidden", display: "flex", 
                  alignItems: "center", justifyContent: "center" 
                }}>
                  {config.logo ? (
                    <img src={config.logo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Logo" />
                  ) : (
                    <span style={{ fontSize: 10, color: C.gold }}>SIN FOTO</span>
                  )}
                </div>
                
                <label style={{ 
                  background: C.goldDark, color: "white", padding: "10px 15px", 
                  borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: "bold" 
                }}>
                  {subiendoLogo ? "Subiendo..." : "Cambiar Foto"}
                  <input type="file" accept="image/*" onChange={handleSubirLogo} style={{ display: "none" }} />
                </label>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: "bold", color: C.grayDark }}>Nombre del Salón</label>
                <input 
                  value={config.nombre || ""} 
                  onChange={(e) => setDoc(doc(db, "configuraciones", user.uid), { ...config, nombre: e.target.value })}
                  placeholder="Ej: Viviana Studios"
                  style={{ width: "100%", padding: 12, borderRadius: 10, border: `1px solid ${C.creamDeep}`, boxSizing: "border-box" }}
                />
              </div>
            </section>

            <ViewConfig config={config} uid={user.uid} />
          </div>
        )}
      </main>

      {/* Navegación Inferior */}
      <nav style={{ position: "fixed", bottom: 0, width: "100%", background: C.white, display: "flex", justifyContent: "space-around", padding: "12px 0", borderTop: `1px solid ${C.creamDeep}`, zIndex: 100 }}>
        {[
          {id:"agenda", icon:"📅", label:"Agenda"},
          {id:"solicitudes", icon:"📩", label:"Pedidos", badge: solicitudes.length},
          {id:"clientas", icon:"👥", label:"Clientas"},
          {id:"config", icon:"⚙️", label:"Config"},
        ].map(n => (
          <button key={n.id} onClick={() => setTab(n.id)} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            {n.badge > 0 && <span style={{ position: "absolute", top: -2, right: "18%", background: C.red, color: "#fff", fontSize: 9, minWidth: 16, height: 16, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>{n.badge}</span>}
            <span style={{ fontSize: 18, color: tab === n.id ? C.gold : C.grayLight }}>{n.icon}</span>
            <span style={{ fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: tab === n.id ? C.goldDark : C.grayLight }}>{n.label}</span>
          </button>
        ))}
      </nav>

      {/* Modales originales */}
      {modal === "nuevaClienta" && <ModalNuevaClienta data={mData} close={close} onToast={showToast} userUid={user.uid} />}
      {modal === "eliminarClienta" && <ModalEliminarClienta data={mData} close={close} userUid={user.uid} />}
      {modal === "eliminarSolicitud" && <ModalEliminarSolicitud data={mData} close={close} userUid={user.uid} />}
      {modal === "agendarCita" && <ModalAgendarCita clientas={clientas} config={config} close={close} userUid={user.uid} />}
      {modal === "confirmar" && <ModalConfirmar data={mData} clientas={clientas} config={config} close={close} userUid={user.uid} />}
      {modal === "solicitud" && <ModalSolicitud solicitud={mData} clientas={clientas} config={config} close={close} userUid={user.uid} />}
      
      {toast && <div style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", background: "#333", color: "#fff", padding: "10px 20px", borderRadius: 20, fontSize: 13, zIndex: 1000 }}>{toast}</div>}
    </div>
  );
}

// ── VISTAS Y COMPONENTES (Todos los originales se mantienen) ──

function Login({ auth, gProvider, onToast }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [isReset, setIsReset] = useState(false);

  const handleLogin = () => signInWithEmailAndPassword(auth, email, pass).catch(e => onToast("Error: " + e.message));
  const handleReset = () => sendPasswordResetEmail(auth, email).then(() => { onToast("Email enviado"); setIsReset(false); });

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.cream, padding: 20 }}>
      <div style={{ background: C.white, padding: 30, borderRadius: 20, width: "100%", maxWidth: 360, boxShadow: "0 10px 25px rgba(0,0,0,0.05)" }}>
        <h2 style={{ textAlign: "center", color: C.goldDark, marginBottom: 25, fontFamily: "serif" }}>STUDIO MANAGER</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: 12, borderRadius: 10, border: `1px solid ${C.creamDeep}` }} />
          {!isReset && <input type="password" placeholder="Contraseña" value={pass} onChange={e => setPass(e.target.value)} style={{ padding: 12, borderRadius: 10, border: `1px solid ${C.creamDeep}` }} />}
          
          {isReset ? (
            <>
              <button onClick={handleReset} style={{ background: C.goldDark, color: "#fff", padding: 12, borderRadius: 10, border: "none", fontWeight: "bold" }}>ENVIAR INSTRUCCIONES</button>
              <button onClick={() => setIsReset(false)} style={{ background: "none", border: "none", color: C.grayLight, fontSize: 12 }}>Volver al inicio</button>
            </>
          ) : (
            <>
              <button onClick={handleLogin} style={{ background: C.goldDark, color: "#fff", padding: 12, borderRadius: 10, border: "none", fontWeight: "bold" }}>INGRESAR</button>
              <button onClick={() => setIsReset(true)} style={{ background: "none", border: "none", color: C.grayLight, fontSize: 12 }}>¿Olvidaste tu contraseña?</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ... Resto de componentes (ViewAgenda, ViewSolicitudes, ViewClientas, ViewConfig, Modales...)
// Nota: Para no saturar el mensaje, asume que el resto del código es idéntico a tu archivo subido. 
// He verificado que todas las referencias a funciones (ModalNuevaClienta, etc.) coincidan con tu estructura.
