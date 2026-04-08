import { useState, useEffect, useCallback } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
// NUEVO: Importación para la foto
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

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
const storage = getStorage(fbApp); // Inicialización de fotos

const C = {
  white:"#FFFFFF", cream:"#FDFAF4", creamDeep:"#EDE0C4",
  gold:"#C9A84D", goldDark:"#A6893D", grayDark:"#222222",
  grayLight:"#777777", red:"#C0392B", green:"#27AE60"
};

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("agenda");
  const [config, setConfig] = useState({ nombre: "", logo: "", servicios: [], profesionales: [], politicas: "" });
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  // ... resto de tus estados de clientas y citas se mantienen igual ...

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, "configuraciones", user.uid), (snap) => {
      if (snap.exists()) setConfig(snap.data());
    });
  }, [user]);

  // NUEVA FUNCIÓN: Subir Logo
  const handleSubirLogo = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo || !user) return;
    setSubiendoLogo(true);
    try {
      const storageRef = ref(storage, `logos/${user.uid}`);
      await uploadBytes(storageRef, archivo);
      const url = await getDownloadURL(storageRef);
      await setDoc(doc(db, "configuraciones", user.uid), { ...config, logo: url });
      alert("Logo actualizado correctamente");
    } catch (err) { alert("Error al subir imagen"); }
    finally { setSubiendoLogo(false); }
  };

  // Aquí irían todas tus funciones originales de clientas, citas, etc.
  // (Las he omitido en este bloque para que el código sea legible, pero en tu archivo final se mantienen)

  if (!user) return <Login auth={auth} />;

  return (
    <div style={{ minHeight: "100vh", background: C.cream, paddingBottom: 80 }}>
      {/* Cabecera dinámica con el nombre que elijas */}
      <header style={{ background: C.white, padding: 20, textAlign: 'center', borderBottom: `1px solid ${C.creamDeep}` }}>
        <h1 style={{ margin:0, color: C.goldDark, fontSize: 18, letterSpacing: 2 }}>
          {config.nombre?.toUpperCase() || "ADMINISTRACIÓN"}
        </h1>
      </header>

      <main style={{ padding: 15, maxWidth: 600, margin: '0 auto' }}>
        {tab === "config" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* SECCIÓN DE LOGO Y NOMBRE */}
            <section style={{ background: C.white, padding: 20, borderRadius: 15, border: `1px solid ${C.creamDeep}` }}>
              <h3 style={{ marginTop: 0 }}>📸 Identidad de Marca</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 15, marginBottom: 15 }}>
                <div style={{ 
                  width: 70, height: 70, borderRadius: "50%", background: C.cream, 
                  overflow: "hidden", border: `2px solid ${C.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {config.logo ? <img src={config.logo} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "LOGO"}
                </div>
                <label style={{ background: C.goldDark, color: "white", padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
                  {subiendoLogo ? "Cargando..." : "Cambiar Foto"}
                  <input type="file" accept="image/*" onChange={handleSubirLogo} style={{ display: "none" }} />
                </label>
              </div>
              <input 
                value={config.nombre} 
                placeholder="Nombre del Salón"
                onChange={e => setDoc(doc(db, "configuraciones", user.uid), { ...config, nombre: e.target.value })}
                style={{ width: "100%", padding: 12, borderRadius: 10, border: `1px solid ${C.creamDeep}`, boxSizing: 'border-box' }} 
              />
            </section>

            {/* Aquí sigue tu sección de Servicios, Profesionales y Políticas original */}
          </div>
        )}
        
        {/* Resto de tus pestañas (Agenda, Clientas) se mantienen intactas */}
      </main>

      {/* Tu navegación original con los iconos y etiquetas */}
    </div>
  );
}

// ... Mantener todos tus componentes Modal (ModalNuevaClienta, etc.) al final ...
