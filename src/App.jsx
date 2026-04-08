import { useState, useEffect } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
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
const storage = getStorage(fbApp);

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

  const login = () => signInWithEmailAndPassword(auth, email, pass).catch(() => alert("Error de acceso"));

  const handleSubirLogo = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    setCargandoImagen(true);
    try {
      const storageRef = ref(storage, `logos/${user.uid}`);
      await uploadBytes(storageRef, archivo);
      const urlDescarga = await getDownloadURL(storageRef);
      const nuevaConfig = { ...salonConfig, logo: urlDescarga };
      await setDoc(doc(db, "configuraciones", user.uid), nuevaConfig);
      alert("Logo actualizado");
    } catch (error) { alert("Error al subir"); }
    finally { setCargandoImagen(false); }
  };

  const guardarCambiosGenerales = async () => {
    await setDoc(doc(db, "configuraciones", user.uid), salonConfig);
    alert("¡Configuración guardada!");
  };

  const agregarItem = (tipo) => {
    const nombre = prompt(`Nombre del ${tipo}:`);
    const detalle = prompt(tipo === 'profesional' ? 'Cargo/Especialidad:' : 'Precio:');
    if (nombre && detalle) {
      const nuevaConfig = { ...salonConfig };
      if (tipo === 'profesional') {
        nuevaConfig.profesionales = [...(salonConfig.profesionales || []), { nombre, cargo: detalle, id: Date.now() }];
      } else {
        nuevaConfig.servicios = [...(salonConfig.servicios || []), { nombre, precio: detalle, id: Date.now() }];
      }
      setSalonConfig(nuevaConfig);
      setDoc(doc(db, "configuraciones", user.uid), nuevaConfig);
    }
  };

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.cream }}>
        <div style={{ background: C.white, padding: 30, borderRadius: 15, width: "100%", maxWidth: 350 }}>
          <h2 style={{ textAlign: "center", color: C.goldDark }}>ADMINISTRACIÓN</h2>
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
          <>
            {/* IDENTIDAD */}
            <section style={{ background: C.white, padding: 20, borderRadius: 15, border: `1px solid ${C.creamDeep}` }}>
              <h3 style={{ marginTop: 0 }}>📸 Identidad de Marca</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 15, marginBottom: 15 }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: C.cream, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: `1px solid ${C.gold}` }}>
                  {salonConfig.logo ? <img src={salonConfig.logo} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "LOGO"}
                </div>
                <label style={{ background: C.goldDark, color: "white", padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
                  {cargandoImagen ? "Subiendo..." : "Cambiar Foto"}
                  <input type="file" accept="image/*" onChange={handleSubirLogo} style={{ display: "none" }} />
                </label>
              </div>
              <input value={salonConfig.nombre} onChange={e => setSalonConfig({...salonConfig, nombre: e.target.value})} style={{ width: "100%", padding: 12, borderRadius: 10, border: `1px solid ${C.creamDeep}`, marginBottom: 10, boxSizing: "border-box" }} />
              <button onClick={guardarCambiosGenerales} style={{ width: "100%", background: C.green, color: "white", padding: 12, borderRadius: 10, border: "none", fontWeight: "bold" }}>Guardar Nombre</button>
            </section>

            {/* EQUIPO */}
            <section style={{ background: C.white, padding: 20, borderRadius: 15, border: `1px solid ${C.creamDeep}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
                <h3 style={{ margin: 0 }}>👩‍🎨 Equipo de Trabajo</h3>
                <button onClick={() => agregarItem('profesional')} style={{ background: C.grayDark, color: "white", padding: "5px 12px", borderRadius: 8, border: "none", fontSize: 12 }}>+ Añadir</button>
              </div>
              {salonConfig.profesionales?.map(p => (
                <div key={p.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.cream}`, fontSize: 14 }}><strong>{p.nombre}</strong> - {p.cargo}</div>
              ))}
            </section>

            {/* SERVICIOS */}
            <section style={{ background: C.white, padding: 20, borderRadius: 15, border: `1px solid ${C.creamDeep}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
                <h3 style={{ margin: 0 }}>✨ Servicios</h3>
                <button onClick={() => agregarItem('servicio')} style={{ background: C.goldDark, color: "white", padding: "5px 12px", borderRadius: 8, border: "none", fontSize: 12 }}>+ Nuevo</button>
              </div>
              {salonConfig.servicios?.map(s => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.cream}`, fontSize: 14 }}>
                  <span>{s.nombre}</span>
                  <strong>${s.precio}</strong>
                </div>
              ))}
            </section>
          </>
        )}

        {tab === "agenda" && (
          <div style={{ textAlign: "center", padding: 40, color: C.grayLight }}>
            <p>Aquí verás las solicitudes de tus clientas.</p>
          </div>
        )}
      </main>

      <nav style={{ position: "fixed", bottom: 0, width: "100%", background: C.white, display: "flex", justifyContent: "space-around", padding: "15px 0", borderTop: `1px solid ${C.creamDeep}` }}>
        <button onClick={() => setTab("agenda")} style={{ background: "none", border: "none", color: tab === "agenda" ? C.goldDark : C.grayLight }}>Agenda</button>
        <button onClick={() => setTab("perfil")} style={{ background: "none", border: "none", color: tab === "perfil" ? C.goldDark : C.grayLight }}>Mi Salón</button>
        <button onClick={() => signOut(auth)} style={{ background: "none", border: "none", color: C.red }}>Salir</button>
      </nav>
    </div>
  );
}
