import { useState, useEffect } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc, collection, query, where } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"; // <-- Nuevo para fotos

const fbConfig = {
  apiKey: "AIzaSyDYAyfZnmIo6311bCFXo2geSmWKNJgPFqc",
  authDomain: "studio-manager-ab58e.firebaseapp.com",
  projectId: "studio-manager-ab58e",
  storageBucket: "studio-manager-ab58e.firebasestorage.app", // Aquí se guardarán las fotos
  messagingSenderId: "501132730663",
  appId: "1:501132730663:web:84df2778289cf15aeac902",
};

const fbApp = getApps().length ? getApps()[0] : initializeApp(fbConfig);
const db = getFirestore(fbApp);
const auth = getAuth(fbApp);
const storage = getStorage(fbApp); // Inicializamos el almacén de fotos

const C = {
  white: "#FFFFFF", cream: "#FDFAF4", creamDeep: "#EDE0C4",
  gold: "#C9A84D", goldDark: "#A6893D",
  grayDark: "#222222", grayLight: "#777777",
  red: "#C0392B", green: "#27AE60", blue: "#3498DB"
};

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [tab, setTab] = useState("perfil"); 
  const [cargandoImagen, setCargandoImagen] = useState(false);
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
    return unsubConfig;
  }, [user]);

  const login = () => signInWithEmailAndPassword(auth, email, pass).catch(() => alert("Error en el acceso"));

  // --- FUNCIÓN PARA SUBIR LA FOTO ---
  const handleSubirLogo = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    setCargandoImagen(true);
    try {
      const storageRef = ref(storage, `logos/${user.uid}`);
      await uploadBytes(storageRef, archivo);
      const urlDescarga = await getDownloadURL(storageRef);
      
      const nuevaConfig = { ...salonConfig, logo: urlDescarga };
      setSalonConfig(nuevaConfig);
      await setDoc(doc(db, "configuraciones", user.uid), nuevaConfig);
      alert("¡Logo actualizado con éxito!");
    } catch (error) {
      alert("Error al subir la imagen");
    } finally {
      setCargandoImagen(false);
    }
  };

  const guardarNombre = async () => {
    await setDoc(doc(db, "configuraciones", user.uid), salonConfig);
    alert("Nombre actualizado");
  };

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.cream, padding: 20 }}>
        <div style={{ background: C.white, padding: 30, borderRadius: 15, boxShadow: "0 10px 30px rgba(0,0,0,0.1)", width: "100%", maxWidth: 400 }}>
          <h2 style={{ textAlign: "center", fontFamily: "serif", color: C.goldDark, marginBottom: 20 }}>ADMINISTRACIÓN</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
            <input type="email" placeholder="Email" style={{ padding: 12, borderRadius: 8, border: `1px solid ${C.creamDeep}` }} onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Contraseña" style={{ padding: 12, borderRadius: 8, border: `1px solid ${C.creamDeep}` }} onChange={e => setPass(e.target.value)} />
            <button onClick={login} style={{ background: C.goldDark, color: C.white, padding: 12, borderRadius: 8, border: "none", fontWeight: "bold" }}>ENTRAR</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.cream, paddingBottom: 100 }}>
      <header style={{ background: C.white, padding: "20px", textAlign: "center", borderBottom: `1px solid ${C.creamDeep}` }}>
        <h1 style={{ fontFamily: "serif", fontSize: 20, color: C.goldDark, margin: 0 }}>{salonConfig.nombre.toUpperCase()}</h1>
      </header>

      <main style={{ padding: 20, maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        
        {tab === "perfil" && (
          <section style={{ background: C.white, padding: 25, borderRadius: 20, border: `1px solid ${C.creamDeep}`, boxShadow: "0 4px 15px rgba(0,0,0,0.02)" }}>
            <h3 style={{ marginTop: 0, color: C.grayDark }}>📸 Identidad de Marca</h3>
            
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: C.cream, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: `2px solid ${C.gold}` }}>
                {salonConfig.logo ? <img src={salonConfig.logo} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "LOGO"}
              </div>
              <label style={{ background: C.goldDark, color: "white", padding: "10px 15px", borderRadius: 10, cursor: "pointer", fontSize: 14 }}>
                {cargandoImagen ? "Subiendo..." : "Cambiar Foto"}
                <input type="file" accept="image/*" onChange={handleSubirLogo} style={{ display: "none" }} />
              </label>
            </div>

            <input 
              placeholder="Nombre del Salón" 
              value={salonConfig.nombre} 
              onChange={e => setSalonConfig({...salonConfig, nombre: e.target.value})}
              style={{ width: "100%", padding: 12, borderRadius: 10, border: `1px solid ${C.creamDeep}`, marginBottom: 15, boxSizing: "border-box" }} 
            />
            <button onClick={guardarNombre} style={{ width: "100%", background: C.green, color: "white", padding: 12, borderRadius: 10, border: "none", fontWeight: "bold" }}>Guardar Cambios</button>
          </section>
        )}

        {/* Las otras secciones (Equipo/Servicios) se mantienen igual que las tenías */}
      </main>

      <nav style={{ position: "fixed", bottom: 0, width: "100%", background: C.white, display: "flex", justifyContent: "space-around", padding: "15px 0", borderTop: `1px solid ${C.creamDeep}` }}>
        <button onClick={() => setTab("agenda")} style={{ background: "none", border: "none", color: tab === "agenda" ? C.goldDark : C.grayLight }}>Agenda</button>
        <button onClick={() => setTab("perfil")} style={{ background: "none", border: "none", color: tab === "perfil" ? C.goldDark : C.grayLight }}>Configuración</button>
        <button onClick={() => signOut(auth)} style={{ background: "none", border: "none", color: C.red }}>Salir</button>
      </nav>
    </div>
  );
}
