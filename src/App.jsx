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

// ── Firebase config ── (mover a .env antes de producción)
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
const gProvider = new GoogleAuthProvider();

// ── Colores ──
const C = {
  white:"#FFFFFF", cream:"#FDFAF4", creamDeep:"#EDE0C4",
  gold:"#C9A84C", goldDark:"#B8960C", goldLight:"#FBF3DC",
  charcoal:"#2C2C2C", grayMed:"#6B6B6B", grayLight:"#AAAAAA",
  green:"#2D6A2D", greenBg:"#EBF5EB",
  red:"#C0392B", redBg:"#FDEDEC", orange:"#D35400", orangeBg:"#FEF0E7",
  blue:"#1A6FB5", blueBg:"#EBF3FC",
};

// ── Constantes ──
const MESES   = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const METODOS = ["Transferencia","Efectivo","Crédito","Débito"];
const DIAS    = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

// ── Utilidades ──
const todayStr    = () => new Date().toISOString().split("T")[0];
const tomorrowStr = () => { const d=new Date(); d.setDate(d.getDate()+1); return d.toISOString().split("T")[0]; };
const mesActual   = () => MESES[new Date().getMonth()];
const fmtCLP      = n => (n!==undefined&&n!==null&&n!=="")?`$${Number(n).toLocaleString("es-CL")}`:"—";
const fmtFecha    = s => { if(!s) return ""; const [y,m,d]=s.split("-"); return `${d}/${m}/${y}`; };
const sortNombre  = (a,b) => a.nombre.localeCompare(b.nombre,"es",{sensitivity:"base"});
const getMes      = fecha => fecha ? MESES[new Date(fecha+"T12:00:00").getMonth()] : mesActual();

// ── Firebase helpers con manejo de error ──
const saveDoc = async (col, id, data) => {
  try { await setDoc(doc(db,col,String(id)), data); return true; }
  catch(e) { console.error("Error guardando:", e); return false; }
};
const delDoc = async (col, id) => {
  try { await deleteDoc(doc(db,col,String(id))); return true; }
  catch(e) { console.error("Error eliminando:", e); return false; }
};

// ── Estados de solicitudes ──
const ESTADO_CONFIG = {
  en_revision:     { label:"En Revisión",     color:C.goldDark, bg:C.goldLight },
  contraoferta:    { label:"Contrapropuesta",  color:C.orange,   bg:C.orangeBg },
  esperando_abono: { label:"Esperando Abono", color:C.orange,   bg:C.orangeBg },
  abono_enviado:   { label:"Abono Enviado",   color:C.green,    bg:C.greenBg  },
  confirmada:      { label:"Confirmada",       color:C.green,    bg:C.greenBg  },
  rechazada:       { label:"Rechazada",        color:C.red,      bg:C.redBg    },
  cancelada:       { label:"Cancelada",        color:C.red,      bg:C.redBg    },
  no_asistio:      { label:"No Asistió",       color:C.red,      bg:C.redBg    },
};

// ── Componentes base ──
const inpSt = {width:"100%",padding:"12px 14px",borderRadius:10,border:`1.5px solid ${C.creamDeep}`,background:C.white,fontFamily:"Georgia,serif",fontSize:14,color:C.charcoal,outline:"none",boxSizing:"border-box"};
const Label = ({t}) => <div style={{fontSize:9,letterSpacing:2.5,color:C.grayLight,textTransform:"uppercase",fontFamily:"sans-serif",marginBottom:5}}>{t}</div>;
const Field = ({label,children}) => <div style={{marginBottom:14}}><Label t={label}/>{children}</div>;
const Empty = ({text}) => <div style={{textAlign:"center",padding:"28px 0",color:C.grayLight,fontStyle:"italic",fontSize:13}}>{text}</div>;
const Badge = ({text,color,bg}) => <span style={{background:bg||C.goldLight,color:color||C.goldDark,fontSize:9,padding:"3px 9px",borderRadius:10,letterSpacing:1,textTransform:"uppercase",fontFamily:"sans-serif",fontWeight:700}}>{text}</span>;

function Logo({lg, nombre}) {
  const n = nombre || "Manager Studios";
  return <div style={{textAlign:"center"}}>
    <div style={{fontFamily:"Georgia,serif",fontSize:lg?30:17,fontWeight:700,color:C.charcoal,letterSpacing:lg?5:3,lineHeight:1}}>{n}</div>
    <div style={{fontFamily:"Georgia,serif",fontSize:lg?11:8,fontStyle:"italic",color:C.goldDark,letterSpacing:lg?5:3,marginTop:3}}>Administración</div>
    <div style={{width:lg?80:44,height:1,background:`linear-gradient(to right,transparent,${C.gold},transparent)`,margin:"6px auto 0"}}/>
  </div>;
}

function Avatar({nombre,size=44}) {
  return <div style={{width:size,height:size,borderRadius:"50%",background:C.goldLight,border:`2px solid ${C.gold}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.38,fontWeight:700,color:C.goldDark,flexShrink:0}}>
    {nombre?nombre[0].toUpperCase():"✦"}
  </div>;
}

function Modal({title,onClose,children,wide}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.cream,borderRadius:"22px 22px 0 0",width:"100%",maxWidth:wide?600:480,maxHeight:"93vh",overflowY:"auto",padding:"10px 20px 40px"}}>
        <div style={{width:38,height:4,background:C.creamDeep,borderRadius:2,margin:"14px auto 18px"}}/>
        <div style={{fontSize:10,letterSpacing:3,color:C.goldDark,textTransform:"uppercase",marginBottom:20}}>{title}</div>
        {children}
      </div>
    </div>
  );
}

function StatBox({label,value,color,bg}) {
  return <div style={{background:bg||C.white,border:`1px solid ${C.creamDeep}`,borderRadius:12,padding:"13px 10px",textAlign:"center"}}>
    <div style={{fontSize:18,fontWeight:700,color:color||C.goldDark,lineHeight:1}}>{value}</div>
    <div style={{fontSize:8,color:C.grayLight,letterSpacing:1,textTransform:"uppercase",marginTop:4,fontFamily:"sans-serif"}}>{label}</div>
  </div>;
}

function Toast({msg,type}) {
  const bg = type==="error"?C.red:type==="ok"?C.green:C.goldDark;
  if(!msg) return null;
  return <div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:bg,color:"#fff",padding:"10px 22px",borderRadius:20,fontSize:13,zIndex:999,boxShadow:"0 4px 20px rgba(0,0,0,0.2)",fontFamily:"Georgia,serif",whiteSpace:"nowrap"}}>
    {msg}
  </div>;
}

// ══════════════════════════════════════════════════════
// PANTALLA LOGIN ADMIN
// ══════════════════════════════════════════════════════
function PantallaLogin({onLogin, salonNombre}) {
  const [modo,setModo]     = useState("login"); // login | registro | reset
  const [email,setEmail]   = useState("");
  const [pass,setPass]     = useState("");
  const [pass2,setPass2]   = useState("");
  const [error,setError]   = useState("");
  const [info,setInfo]     = useState("");
  const [loading,setLoading] = useState(false);

  const loginEmail = async () => {
    if(!email||!pass){ setError("Ingresa tu email y contraseña"); return; }
    setLoading(true); setError("");
    try {
      const cred = await signInWithEmailAndPassword(auth,email,pass);
      onLogin(cred.user);
    } catch(e) { setError("Email o contraseña incorrectos"); setLoading(false); }
  };
  const registrar = async () => {
    if(!email||!pass){ setError("Completa todos los campos"); return; }
    if(pass!==pass2){ setError("Las contraseñas no coinciden"); return; }
    if(pass.length<6){ setError("La contraseña debe tener al menos 6 caracteres"); return; }
    setLoading(true); setError("");
    try {
      const cred = await createUserWithEmailAndPassword(auth,email,pass);
      onLogin(cred.user);
    } catch(e) {
      if(e.code==="auth/email-already-in-use") setError("Ya existe una cuenta con este email");
      else setError("Error al crear cuenta");
      setLoading(false);
    }
  };
  const reset = async () => {
    if(!email){ setError("Ingresa tu email primero"); return; }
    setLoading(true); setError("");
    try {
      await sendPasswordResetEmail(auth,email);
      setInfo("Te enviamos un correo para restablecer tu contraseña");
      setModo("login");
    } catch(e) { setError("No se pudo enviar el correo"); }
    setLoading(false);
  };
  const loginGoogle = async () => {
    setLoading(true); setError("");
    try {
      const cred = await signInWithPopup(auth,gProvider);
      onLogin(cred.user);
    } catch(e) { setError("No se pudo iniciar con Google"); setLoading(false); }
  };

  return <div style={{minHeight:"100vh",background:`linear-gradient(160deg,${C.cream} 0%,#F0E8D5 100%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 28px",maxWidth:480,margin:"0 auto"}}>
    <div style={{marginBottom:40}}><Logo lg nombre={salonNombre}/></div>
    <div style={{width:"100%",background:C.white,borderRadius:22,padding:"30px 24px",border:`1px solid ${C.creamDeep}`,boxShadow:"0 8px 36px rgba(0,0,0,0.07)"}}>
      <div style={{textAlign:"center",marginBottom:22}}>
        <div style={{fontSize:13,color:C.grayMed,fontStyle:"italic"}}>
          {modo==="login"?"Acceso propietario/a":modo==="registro"?"Crear cuenta nueva":"Restablecer contraseña"}
        </div>
      </div>

      {modo==="login"&&<>
        <button onClick={loginGoogle} disabled={loading} style={{width:"100%",padding:"13px",borderRadius:12,border:`1.5px solid ${C.creamDeep}`,background:C.white,color:C.charcoal,fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
          <span style={{fontSize:18,fontWeight:700,color:"#4285F4"}}>G</span> Continuar con Google
        </button>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
          <div style={{flex:1,height:1,background:C.creamDeep}}/><div style={{fontSize:11,color:C.grayLight}}>o con email</div><div style={{flex:1,height:1,background:C.creamDeep}}/>
        </div>
        <Field label="Email"><input style={inpSt} type="email" placeholder="tu@email.com" value={email} onChange={e=>{setEmail(e.target.value);setError("");}}/></Field>
        <Field label="Contraseña"><input style={inpSt} type="password" placeholder="••••••••" value={pass} onChange={e=>{setPass(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&loginEmail()}/></Field>
        {error&&<div style={{background:C.redBg,borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:12,color:C.red,textAlign:"center"}}>{error}</div>}
        {info&&<div style={{background:C.greenBg,borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:12,color:C.green,textAlign:"center"}}>{info}</div>}
        <button onClick={loginEmail} disabled={loading} style={{width:"100%",padding:"16px",borderRadius:12,border:"none",background:loading?"#bbb":C.charcoal,color:C.gold,fontSize:14,cursor:"pointer",fontFamily:"Georgia,serif",letterSpacing:2,marginBottom:12}}>
          {loading?"Ingresando...":"✦ Ingresar"}
        </button>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
          <span style={{color:C.goldDark,cursor:"pointer"}} onClick={()=>{setModo("registro");setError("");}}>Crear cuenta nueva</span>
          <span style={{color:C.grayLight,cursor:"pointer"}} onClick={()=>{setModo("reset");setError("");}}>Olvidé mi contraseña</span>
        </div>
      </>}

      {modo==="registro"&&<>
        <Field label="Email"><input style={inpSt} type="email" placeholder="tu@email.com" value={email} onChange={e=>{setEmail(e.target.value);setError("");}}/></Field>
        <Field label="Contraseña"><input style={inpSt} type="password" placeholder="Mínimo 6 caracteres" value={pass} onChange={e=>{setPass(e.target.value);setError("");}}/></Field>
        <Field label="Confirmar contraseña"><input style={inpSt} type="password" placeholder="Repite la contraseña" value={pass2} onChange={e=>{setPass2(e.target.value);setError("");}}/></Field>
        {error&&<div style={{background:C.redBg,borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:12,color:C.red,textAlign:"center"}}>{error}</div>}
        <button onClick={registrar} disabled={loading} style={{width:"100%",padding:"16px",borderRadius:12,border:"none",background:loading?"#bbb":C.charcoal,color:C.gold,fontSize:14,cursor:"pointer",fontFamily:"Georgia,serif",letterSpacing:2,marginBottom:12}}>
          {loading?"Creando cuenta...":"✦ Crear cuenta"}
        </button>
        <div style={{textAlign:"center",fontSize:11}}>
          <span style={{color:C.goldDark,cursor:"pointer"}} onClick={()=>{setModo("login");setError("");}}>← Volver al login</span>
        </div>
      </>}

      {modo==="reset"&&<>
        <Field label="Tu email"><input style={inpSt} type="email" placeholder="tu@email.com" value={email} onChange={e=>{setEmail(e.target.value);setError("");}}/></Field>
        {error&&<div style={{background:C.redBg,borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:12,color:C.red,textAlign:"center"}}>{error}</div>}
        <button onClick={reset} disabled={loading} style={{width:"100%",padding:"16px",borderRadius:12,border:"none",background:loading?"#bbb":C.charcoal,color:C.gold,fontSize:14,cursor:"pointer",fontFamily:"Georgia,serif",letterSpacing:2,marginBottom:12}}>
          {loading?"Enviando...":"Enviar correo de recuperación"}
        </button>
        <div style={{textAlign:"center",fontSize:11}}>
          <span style={{color:C.goldDark,cursor:"pointer"}} onClick={()=>{setModo("login");setError("");}}>← Volver al login</span>
        </div>
      </>}
    </div>
  </div>;
}

// ══════════════════════════════════════════════════════
// PANTALLA CONFIG INICIAL
// ══════════════════════════════════════════════════════
function PantallaConfigInicial({onGuardar}) {
  const [nombre,setNombre]   = useState("");
  const [abono,setAbono]     = useState("10000");
  const [profesionales,setProfesionales] = useState([""]);
  const [servicios,setServicios]   = useState([{nombre:"",precio:""}]);
  const [banco,setBanco]     = useState({nombre:"",rut:"",banco:"",tipoCuenta:"",numeroCuenta:"",email:""});
  const [saving,setSaving]   = useState(false);
  const fb = (k,v) => setBanco(p=>({...p,[k]:v}));

  const addProf = () => setProfesionales(p=>[...p,""]);
  const setProf = (i,v) => setProfesionales(p=>p.map((x,j)=>j===i?v:x));
  const delProf = (i) => setProfesionales(p=>p.filter((_,j)=>j!==i));
  const addServ = () => setServicios(s=>[...s,{nombre:"",precio:""}]);
  const setServ = (i,k,v) => setServicios(s=>s.map((x,j)=>j===i?{...x,[k]:v}:x));
  const delServ = (i) => setServicios(s=>s.filter((_,j)=>j!==i));

  const guardar = async () => {
    if(!nombre.trim()){ return; }
    setSaving(true);
    const config = {
      nombreSalon: nombre.trim(),
      abono: Number(abono)||10000,
      profesionales: profesionales.filter(p=>p.trim()),
      servicios: servicios.filter(s=>s.nombre.trim()).map(s=>({nombre:s.nombre.trim(),precio:Number(s.precio)||0})),
      datosBanco: banco,
      configurado: true,
      creadoEn: new Date().toISOString(),
    };
    const ok = await saveDoc("config","salon",config);
    if(ok) onGuardar(config);
    setSaving(false);
  };

  return <div style={{minHeight:"100vh",background:`linear-gradient(160deg,${C.cream} 0%,#F0E8D5 100%)`,padding:"40px 24px 80px",maxWidth:480,margin:"0 auto"}}>
    <div style={{textAlign:"center",marginBottom:32}}>
      <div style={{fontSize:40,marginBottom:12}}>✦</div>
      <div style={{fontFamily:"Georgia,serif",fontSize:22,fontWeight:700,color:C.charcoal,letterSpacing:4}}>Bienvenida</div>
      <div style={{fontSize:13,color:C.grayMed,marginTop:8,fontStyle:"italic"}}>Configuremos tu salón para comenzar</div>
    </div>

    <div style={{background:C.white,borderRadius:18,padding:"24px 20px",border:`1px solid ${C.creamDeep}`,marginBottom:16}}>
      <div style={{fontSize:11,color:C.goldDark,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Datos del salón</div>
      <Field label="Nombre de tu salón *">
        <input style={inpSt} placeholder="Ej: Nails & Beauty, Studio Spa..." value={nombre} onChange={e=>setNombre(e.target.value)}/>
      </Field>
      <Field label="Monto del abono para reservar ($)">
        <input style={inpSt} type="number" placeholder="10000" value={abono} onChange={e=>setAbono(e.target.value)}/>
      </Field>
    </div>

    <div style={{background:C.white,borderRadius:18,padding:"24px 20px",border:`1px solid ${C.creamDeep}`,marginBottom:16}}>
      <div style={{fontSize:11,color:C.goldDark,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Profesionales</div>
      {profesionales.map((p,i)=>(
        <div key={i} style={{display:"flex",gap:8,marginBottom:10}}>
          <input style={{...inpSt,flex:1}} placeholder={`Nombre profesional ${i+1}`} value={p} onChange={e=>setProf(i,e.target.value)}/>
          {profesionales.length>1&&<button onClick={()=>delProf(i)} style={{width:40,borderRadius:8,border:`1px solid #F5B7B1`,background:C.redBg,color:C.red,cursor:"pointer",fontSize:16}}>✕</button>}
        </div>
      ))}
      <button onClick={addProf} style={{width:"100%",padding:"10px",borderRadius:8,border:`1.5px dashed ${C.gold}`,background:C.goldLight,color:C.goldDark,fontSize:12,cursor:"pointer",fontFamily:"Georgia,serif"}}>+ Agregar profesional</button>
    </div>

    <div style={{background:C.white,borderRadius:18,padding:"24px 20px",border:`1px solid ${C.creamDeep}`,marginBottom:16}}>
      <div style={{fontSize:11,color:C.goldDark,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Servicios y precios</div>
      <div style={{fontSize:11,color:C.grayMed,marginBottom:14,fontStyle:"italic"}}>El precio es referencial, puedes editarlo al confirmar cada atención.</div>
      {servicios.map((s,i)=>(
        <div key={i} style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
          <input style={{...inpSt,flex:2}} placeholder="Ej: Kapping, Pedicure..." value={s.nombre} onChange={e=>setServ(i,"nombre",e.target.value)}/>
          <input style={{...inpSt,flex:1,textAlign:"right"}} type="number" placeholder="Precio $" value={s.precio||""} onChange={e=>setServ(i,"precio",e.target.value)}/>
          {servicios.length>1&&<button onClick={()=>delServ(i)} style={{width:40,flexShrink:0,borderRadius:8,border:`1px solid #F5B7B1`,background:C.redBg,color:C.red,cursor:"pointer",fontSize:16}}>✕</button>}
        </div>
      ))}
      <button onClick={addServ} style={{width:"100%",padding:"10px",borderRadius:8,border:`1.5px dashed ${C.gold}`,background:C.goldLight,color:C.goldDark,fontSize:12,cursor:"pointer",fontFamily:"Georgia,serif"}}>+ Agregar servicio</button>
    </div>

    <div style={{background:C.white,borderRadius:18,padding:"24px 20px",border:`1px solid ${C.creamDeep}`,marginBottom:24}}>
      <div style={{fontSize:11,color:C.goldDark,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Datos bancarios</div>
      <div style={{fontSize:11,color:C.grayMed,marginBottom:14,fontStyle:"italic"}}>Se mostrarán a tus clientas al momento de pagar el abono.</div>
      <Field label="Nombre titular"><input style={inpSt} placeholder="Nombre completo" value={banco.nombre} onChange={e=>fb("nombre",e.target.value)}/></Field>
      <Field label="RUT"><input style={inpSt} placeholder="12.345.678-9" value={banco.rut} onChange={e=>fb("rut",e.target.value)}/></Field>
      <Field label="Banco"><input style={inpSt} placeholder="Ej: Banco de Chile, BCI, Santander..." value={banco.banco} onChange={e=>fb("banco",e.target.value)}/></Field>
      <Field label="Tipo de cuenta">
        <select style={inpSt} value={banco.tipoCuenta} onChange={e=>fb("tipoCuenta",e.target.value)}>
          <option value="">Seleccionar...</option>
          <option>Cuenta Vista</option>
          <option>Cuenta Corriente</option>
          <option>Cuenta RUT</option>
          <option>Chequera Electrónica</option>
        </select>
      </Field>
      <Field label="Número de cuenta"><input style={inpSt} placeholder="00-000-00000-00" value={banco.numeroCuenta} onChange={e=>fb("numeroCuenta",e.target.value)}/></Field>
      <Field label="Correo de confirmación"><input style={inpSt} type="email" placeholder="tu@correo.com" value={banco.email} onChange={e=>fb("email",e.target.value)}/></Field>
    </div>

    {!nombre.trim()&&<div style={{background:C.redBg,borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:C.red,textAlign:"center"}}>El nombre del salón es obligatorio</div>}
    <button onClick={guardar} disabled={saving||!nombre.trim()} style={{width:"100%",padding:"17px",borderRadius:12,border:"none",background:saving||!nombre.trim()?"#bbb":C.charcoal,color:C.gold,fontSize:14,cursor:"pointer",fontFamily:"Georgia,serif",letterSpacing:2}}>
      {saving?"Guardando...":"✦ Guardar y comenzar"}
    </button>
  </div>;
}

// ══════════════════════════════════════════════════════
// MODAL NUEVA / EDITAR CLIENTA
// ══════════════════════════════════════════════════════
function ModalNuevaClienta({data,close,onToast}) {
  const [form,setForm] = useState({
    nombre: data?.nombre||"",
    telefono: data?.telefono||"",
    email: data?.email||"",
    obs: data?.obs||"",
    atencionesPrevias: data?.atencionesPrevias||0,
  });
  const [saved,setSaved] = useState(false);
  const [saving,setSaving] = useState(false);
  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  const submit = async () => {
    if(!form.nombre.trim()) return;
    setSaving(true);
    const entry = {
      ...form,
      id: data?.id||"c"+Date.now(),
      nombre: form.nombre.trim(),
      atencionesPrevias: Number(form.atencionesPrevias)||0,
      creadaEn: data?.creadaEn||new Date().toISOString(),
    };
    const ok = await saveDoc("clientas",entry.id,entry);
    if(ok){ setSaved(true); setTimeout(close,900); }
    else{ onToast&&onToast("Error al guardar","error"); setSaving(false); }
  };

  return <Modal title={data?"Editar Clienta":"Nueva Clienta"} onClose={close}>
    <Field label="Nombre completo *"><input style={inpSt} placeholder="Nombre de la clienta" value={form.nombre} onChange={e=>f("nombre",e.target.value)}/></Field>
    <Field label="Teléfono"><input style={inpSt} placeholder="+56 9 XXXX XXXX" type="tel" value={form.telefono} onChange={e=>f("telefono",e.target.value)}/></Field>
    <Field label="Email (opcional)"><input style={inpSt} type="email" placeholder="clienta@email.com" value={form.email} onChange={e=>f("email",e.target.value)}/></Field>
    <Field label="Notas"><textarea style={{...inpSt,height:70,resize:"none"}} placeholder="Alergias, preferencias, descuentos especiales..." value={form.obs} onChange={e=>f("obs",e.target.value)}/></Field>
    <Field label="Visitas previas al sistema">
      <input style={inpSt} type="number" min="0" placeholder="0" value={form.atencionesPrevias} onChange={e=>f("atencionesPrevias",e.target.value)}/>
    </Field>
    <button onClick={submit} disabled={saving||!form.nombre.trim()} style={{width:"100%",padding:"14px",borderRadius:10,border:"none",cursor:"pointer",background:saved?C.green:C.charcoal,color:saved?"#fff":C.gold,fontSize:13,fontFamily:"Georgia,serif",letterSpacing:2}}>
      {saved?"✓ Guardada":saving?"Guardando...":"Guardar Clienta"}
    </button>
  </Modal>;
}

// ══════════════════════════════════════════════════════
// MODAL ELIMINAR CLIENTA
// ══════════════════════════════════════════════════════
function ModalEliminarClienta({data,close}) {
  const [done,setDone] = useState(false);
  const eliminar = async () => { const ok=await delDoc("clientas",data.id); if(ok){setDone(true); setTimeout(close,900);} };
  return <Modal title="Eliminar Clienta" onClose={close}>
    <div style={{textAlign:"center",padding:"10px 0 20px"}}>
      <div style={{fontSize:40,marginBottom:12}}>⚠️</div>
      <div style={{fontSize:15,fontWeight:700,color:C.charcoal,marginBottom:8}}>{data.nombre}</div>
      <div style={{fontSize:13,color:C.grayMed,lineHeight:1.7}}>¿Eliminar esta clienta? Esta acción no se puede deshacer.</div>
    </div>
    <button onClick={eliminar} disabled={done} style={{width:"100%",padding:"14px",borderRadius:10,border:"none",cursor:"pointer",background:done?C.green:C.red,color:"#fff",fontSize:13,fontFamily:"Georgia,serif",marginBottom:10}}>
      {done?"✓ Eliminada":"Sí, eliminar clienta"}
    </button>
    <button onClick={close} style={{width:"100%",padding:"12px",borderRadius:10,border:`1px solid ${C.creamDeep}`,background:C.white,color:C.grayMed,fontSize:12,cursor:"pointer",fontFamily:"Georgia,serif"}}>Cancelar</button>
  </Modal>;
}

// ══════════════════════════════════════════════════════
// MODAL ELIMINAR SOLICITUD
// ══════════════════════════════════════════════════════
function ModalEliminarSolicitud({data,close}) {
  const [done,setDone] = useState(false);
  const eliminar = async () => { const ok=await delDoc("solicitudes",data.id); if(ok){setDone(true); setTimeout(close,900);} };
  return <Modal title="Eliminar Solicitud" onClose={close}>
    <div style={{textAlign:"center",padding:"10px 0 20px"}}>
      <div style={{fontSize:40,marginBottom:12}}>🗑️</div>
      <div style={{fontSize:15,fontWeight:700,color:C.charcoal,marginBottom:8}}>{data.clientaNombre}</div>
      <div style={{fontSize:13,color:C.grayMed,lineHeight:1.7}}>Se eliminará la solicitud de <strong>{data.servicio}</strong> del {fmtFecha(data.fecha)}.</div>
    </div>
    <button onClick={eliminar} disabled={done} style={{width:"100%",padding:"14px",borderRadius:10,border:"none",cursor:"pointer",background:done?C.green:C.red,color:"#fff",fontSize:13,fontFamily:"Georgia,serif",marginBottom:10}}>
      {done?"✓ Eliminada":"Sí, eliminar"}
    </button>
    <button onClick={close} style={{width:"100%",padding:"12px",borderRadius:10,border:`1px solid ${C.creamDeep}`,background:C.white,color:C.grayMed,fontSize:12,cursor:"pointer",fontFamily:"Georgia,serif"}}>Cancelar</button>
  </Modal>;
}

// ══════════════════════════════════════════════════════
// MODAL GESTIONAR SOLICITUD
// ══════════════════════════════════════════════════════
function ModalSolicitud({solicitud,clientas,config,close}) {
  const cl = clientas.find(c=>c.id===solicitud.clientaId);
  const [contraFecha,setContraFecha] = useState(solicitud.fecha||"");
  const [contraHora,setContraHora]   = useState(solicitud.hora||"");
  const [modo,setModo]   = useState(null);
  const [done,setDone]   = useState(false);

  const update = async (cambios) => {
    await saveDoc("solicitudes",solicitud.id,{...solicitud,...cambios});
    setDone(true); setTimeout(close,1200);
  };

  const confirmar    = () => update({estado:"esperando_abono",fechaConfirmada:solicitud.fecha,horaConfirmada:solicitud.hora});
  const enviarContra = () => { if(!contraFecha||!contraHora) return; update({estado:"contraoferta",fechaContra:contraFecha,horaContra:contraHora}); };
  const rechazar     = () => update({estado:"rechazada"});
  const cancelar     = () => update({estado:"cancelada"});
  const eliminar     = async () => { await delDoc("solicitudes",solicitud.id); close(); };

  const confirmarAbono = async () => {
    await saveDoc("solicitudes",solicitud.id,{...solicitud,estado:"confirmada"});
    const cita = {
      id: "ci"+Date.now(),
      clientaId: solicitud.clientaId,
      clientaNombre: cl?.nombre||solicitud.clientaNombre,
      telefono: cl?.telefono||"",
      email: cl?.email||"",
      servicio: solicitud.servicio,
      profesional: solicitud.profesional||"",
      fecha: solicitud.fechaConfirmada||solicitud.fecha,
      hora: solicitud.horaConfirmada||solicitud.hora,
      estado: "confirmada",
      solicitudId: solicitud.id,
    };
    await saveDoc("citas",cita.id,cita);
    setDone(true); setTimeout(close,1200);
  };

  const whatsapp = () => {
    const tel = "56"+((cl?.telefono||"").replace(/\D/g,""));
    const montoAbono = config?.abono||10000;
    const db2 = config?.datosBanco||{};
    let msg = `Hola ${cl?.nombre||solicitud.clientaNombre}! 🌸\n\nTu cita de *${solicitud.servicio}* para el *${fmtFecha(solicitud.fechaConfirmada||solicitud.fecha)}* a las *${solicitud.horaConfirmada||solicitud.hora}* está reservada.\n\nPara confirmar tu hora, realiza el abono de *${fmtCLP(montoAbono)}*`;
    if(db2.banco) msg+=`\n\n🏦 *Datos de transferencia:*\nBanco: ${db2.banco}\nNombre: ${db2.nombre||""}\nRUT: ${db2.rut||""}\nTipo: ${db2.tipoCuenta||""}\nN° cuenta: ${db2.numeroCuenta||""}\nCorreo: ${db2.email||""}`;
    msg+=`\n\nUna vez realizada la transferencia, avísanos por aquí o a través de la app. ¡Gracias! 💅`;
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`,"_blank");
  };

  const cfg = ESTADO_CONFIG[solicitud.estado]||{};
  return <Modal title="Gestionar Solicitud" onClose={close}>
    <div style={{background:C.white,borderRadius:12,padding:"14px 16px",marginBottom:18,border:`1px solid ${C.creamDeep}`,display:"flex",gap:12,alignItems:"center"}}>
      <Avatar nombre={cl?.nombre||solicitud.clientaNombre} size={48}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:15,fontWeight:700,color:C.charcoal}}>{cl?.nombre||solicitud.clientaNombre}</div>
        <div style={{fontSize:12,color:C.grayMed,marginTop:1}}>{solicitud.servicio}</div>
        {solicitud.profesional&&<div style={{fontSize:11,color:C.goldDark,marginTop:1}}>👤 {solicitud.profesional}</div>}
        <div style={{fontSize:11,color:C.grayLight,marginTop:2}}>Solicitó: {fmtFecha(solicitud.fecha)} · {solicitud.hora}</div>
        {solicitud.obs&&<div style={{fontSize:11,color:C.goldDark,marginTop:3,fontStyle:"italic"}}>"{solicitud.obs}"</div>}
      </div>
    </div>
    <div style={{marginBottom:16,textAlign:"center"}}><Badge text={cfg.label||solicitud.estado} color={cfg.color} bg={cfg.bg}/></div>

    {(solicitud.estado==="en_revision"||solicitud.estado==="pendiente")&&!modo&&<>
      <button onClick={()=>setModo("confirmar")} style={{width:"100%",padding:"13px",borderRadius:10,border:"none",background:C.green,color:"#fff",fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif",marginBottom:10}}>✓ Confirmar esta hora</button>
      <button onClick={()=>setModo("contraoferta")} style={{width:"100%",padding:"13px",borderRadius:10,border:`1.5px solid ${C.gold}`,background:C.goldLight,color:C.goldDark,fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif",marginBottom:10}}>🔄 Proponer otra hora</button>
      <button onClick={rechazar} style={{width:"100%",padding:"12px",borderRadius:10,border:`1px solid #F5B7B1`,background:C.redBg,color:C.red,fontSize:12,cursor:"pointer",fontFamily:"Georgia,serif"}}>✕ Rechazar solicitud</button>
    </>}

    {modo==="confirmar"&&<>
      <div style={{background:C.greenBg,borderRadius:12,padding:"14px",marginBottom:16,fontSize:13,color:C.green,lineHeight:1.7}}>
        ✓ Se confirmará: <strong>{fmtFecha(solicitud.fecha)} · {solicitud.hora}</strong>
      </div>
      <button onClick={confirmar} disabled={done} style={{width:"100%",padding:"13px",borderRadius:10,border:"none",background:done?C.green:C.charcoal,color:done?"#fff":C.gold,fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif",marginBottom:10}}>
        {done?"✓ Confirmado":"Confirmar y solicitar abono"}
      </button>
      <button onClick={()=>setModo(null)} style={{width:"100%",padding:"11px",borderRadius:10,border:`1px solid ${C.creamDeep}`,background:C.white,color:C.grayMed,fontSize:12,cursor:"pointer",fontFamily:"Georgia,serif"}}>Volver</button>
    </>}

    {modo==="contraoferta"&&<>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <Field label="Nueva fecha"><input style={inpSt} type="date" value={contraFecha} min={todayStr()} onChange={e=>setContraFecha(e.target.value)}/></Field>
        <Field label="Nueva hora"><input style={inpSt} type="time" value={contraHora} onChange={e=>setContraHora(e.target.value)}/></Field>
      </div>
      <button onClick={enviarContra} disabled={done} style={{width:"100%",padding:"13px",borderRadius:10,border:"none",background:done?C.green:C.charcoal,color:done?"#fff":C.gold,fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif",marginBottom:10}}>
        {done?"✓ Enviado":"Enviar contrapropuesta"}
      </button>
      <button onClick={()=>setModo(null)} style={{width:"100%",padding:"11px",borderRadius:10,border:`1px solid ${C.creamDeep}`,background:C.white,color:C.grayMed,fontSize:12,cursor:"pointer",fontFamily:"Georgia,serif"}}>Volver</button>
    </>}

    {solicitud.estado==="esperando_abono"&&<>
      <div style={{background:C.goldLight,borderRadius:12,padding:"14px",marginBottom:16,fontSize:12,color:C.goldDark,lineHeight:1.8}}>
        <strong>Esperando abono de {fmtCLP(config?.abono||10000)}</strong><br/>
        📅 {fmtFecha(solicitud.fechaConfirmada||solicitud.fecha)} · {solicitud.horaConfirmada||solicitud.hora}
      </div>
      <button onClick={whatsapp} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:"#25D366",color:"#fff",fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif",marginBottom:10}}>
        💬 Enviar datos de pago por WhatsApp
      </button>
    </>}

    {solicitud.estado==="abono_enviado"&&<>
      <div style={{background:C.greenBg,borderRadius:12,padding:"16px",marginBottom:16,fontSize:13,color:C.green,lineHeight:1.8,textAlign:"center"}}>
        <div style={{fontSize:24,marginBottom:8}}>💸</div>
        <strong>La clienta declaró haber pagado</strong><br/>
        <span style={{fontSize:12,color:C.grayMed}}>Revisa tu cuenta y confirma.</span>
      </div>
      <button onClick={confirmarAbono} disabled={done} style={{width:"100%",padding:"14px",borderRadius:10,border:"none",background:done?C.green:C.charcoal,color:done?"#fff":C.gold,fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif",marginBottom:10}}>
        {done?"✓ ¡Cita Agendada!":"✓ Pagó — Confirmar y agendar cita"}
      </button>
      <button onClick={()=>saveDoc("solicitudes",solicitud.id,{...solicitud,estado:"esperando_abono"})} style={{width:"100%",padding:"12px",borderRadius:10,border:`1px solid #F5B7B1`,background:C.redBg,color:C.red,fontSize:12,cursor:"pointer",fontFamily:"Georgia,serif"}}>
        ✕ No recibí el pago aún
      </button>
    </>}

    {!done&&<>
      <div style={{height:1,background:C.creamDeep,margin:"16px 0"}}/>
      <button onClick={cancelar} style={{width:"100%",padding:"12px",borderRadius:10,border:`1px solid #F5B7B1`,background:C.redBg,color:C.red,fontSize:12,cursor:"pointer",fontFamily:"Georgia,serif",marginBottom:8}}>
        ✕ Cancelar esta solicitud
      </button>
      <button onClick={eliminar} style={{width:"100%",padding:"11px",borderRadius:10,border:`1px solid ${C.creamDeep}`,background:C.white,color:C.grayMed,fontSize:12,cursor:"pointer",fontFamily:"Georgia,serif"}}>
        🗑️ Eliminar del historial
      </button>
    </>}
  </Modal>;
}

// ══════════════════════════════════════════════════════
// MODAL AGENDAR CITA DIRECTA
// ══════════════════════════════════════════════════════
function ModalAgendarCita({clientas,config,close}) {
  const [form,setForm] = useState({clientaId:"",servicio:"",profesional:"",fecha:todayStr(),hora:"10:00",obs:""});
  const [saved,setSaved] = useState(false);
  const f = (k,v) => setForm(p=>({...p,[k]:v}));
  const cl = clientas.find(c=>c.id===form.clientaId);
  const servSel = (config?.servicios||[]).find(s=>(s.nombre||s)===form.servicio);

  const submit = async () => {
    if(!form.clientaId||!form.servicio) return;
    const entry = {
      ...form, id:"ci"+Date.now(), estado:"confirmada",
      clientaNombre: cl?.nombre||"", telefono: cl?.telefono||"",
      email: cl?.email||"",
    };
    await saveDoc("citas",entry.id,entry);
    setSaved(true); setTimeout(close,1000);
  };

  return <Modal title="Agendar Cita Directa" onClose={close}>
    <Field label="Clienta">
      <select style={inpSt} value={form.clientaId} onChange={e=>f("clientaId",e.target.value)}>
        <option value="">Seleccionar clienta...</option>
        {[...clientas].sort(sortNombre).map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
      </select>
    </Field>
    {config?.profesionales?.length>0&&<Field label="Profesional">
      <select style={inpSt} value={form.profesional} onChange={e=>f("profesional",e.target.value)}>
        <option value="">Cualquier profesional</option>
        {config.profesionales.map(p=><option key={p}>{p}</option>)}
      </select>
    </Field>}
    <Field label="Servicio">
      <select style={inpSt} value={form.servicio} onChange={e=>f("servicio",e.target.value)}>
        <option value="">Seleccionar servicio...</option>
        {(config?.servicios||[]).map((s,i)=>{
          const n=s.nombre||s; const p=s.precio||0;
          return <option key={i} value={n}>{n}{p?` — ${fmtCLP(p)}`:""}</option>;
        })}
      </select>
    </Field>
    {servSel?.precio>0&&<div style={{background:C.goldLight,borderRadius:8,padding:"8px 12px",marginBottom:14,fontSize:12,color:C.goldDark}}>
      Precio referencial: {fmtCLP(servSel.precio)}
    </div>}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <Field label="Fecha"><input style={inpSt} type="date" value={form.fecha} onChange={e=>f("fecha",e.target.value)}/></Field>
      <Field label="Hora"><input style={inpSt} type="time" value={form.hora} onChange={e=>f("hora",e.target.value)}/></Field>
    </div>
    <Field label="Observaciones (opcional)">
      <textarea style={{...inpSt,height:60,resize:"none"}} placeholder="Notas adicionales..." value={form.obs} onChange={e=>f("obs",e.target.value)}/>
    </Field>
    <button onClick={submit} style={{width:"100%",padding:"14px",borderRadius:10,border:"none",cursor:"pointer",background:saved?C.green:C.charcoal,color:saved?"#fff":C.gold,fontSize:13,fontFamily:"Georgia,serif",letterSpacing:2}}>
      {saved?"✓ Agendada":"Agendar Cita"}
    </button>
  </Modal>;
}

// ══════════════════════════════════════════════════════
// MODAL CONFIRMAR ATENCIÓN
// ══════════════════════════════════════════════════════
function ModalConfirmar({data,clientas,config,close}) {
  const cl = clientas.find(c=>c.id===data.clientaId);
  const abonoPrevio = config?.abono||10000;
  const [form,setForm] = useState({abono:abonoPrevio, pago:"", metodo:"Transferencia", obs:""});
  const [saved,setSaved] = useState(false);
  const f = (k,v) => setForm(p=>({...p,[k]:v}));
  const total = (Number(form.abono)||0)+(Number(form.pago)||0);

  const submit = async () => {
    if(form.pago===""&&form.pago!==0) return;
    const mes = getMes(data.fecha);
    const reg = {
      id: Date.now(),
      clientaId: data.clientaId,
      clientaNombre: cl?.nombre||data.clientaNombre,
      servicio: data.servicio,
      profesional: data.profesional||"",
      fecha: data.fecha,
      mes,
      abono: Number(form.abono)||0,
      pago: Number(form.pago)||0,
      valor: total,
      metodo: form.metodo,
      obs: form.obs,
    };
    await saveDoc("registros",reg.id,reg);
    await saveDoc("citas",data.id,{...data,estado:"completada"});
    setSaved(true); setTimeout(close,1200);
  };

  const noAsistio = async () => {
    await saveDoc("citas",data.id,{...data,estado:"no_asistio"});
    close();
  };

  return <Modal title="Confirmar Atención" onClose={close}>
    <div style={{background:C.white,borderRadius:12,padding:"14px",marginBottom:18,border:`1px solid ${C.creamDeep}`,display:"flex",gap:12,alignItems:"center"}}>
      <Avatar nombre={cl?.nombre||data.clientaNombre} size={46}/>
      <div>
        <div style={{fontSize:15,fontWeight:700,color:C.charcoal}}>{cl?.nombre||data.clientaNombre}</div>
        <div style={{fontSize:12,color:C.grayMed,marginTop:1}}>{data.servicio} · {data.hora}</div>
        {data.profesional&&<div style={{fontSize:11,color:C.goldDark,marginTop:1}}>👤 {data.profesional}</div>}
        <div style={{fontSize:11,color:C.grayLight,marginTop:1}}>📅 {fmtFecha(data.fecha)}</div>
      </div>
    </div>

    <div style={{background:C.goldLight,borderRadius:12,padding:"16px",marginBottom:16,border:`1px solid ${C.gold}`}}>
      <div style={{fontSize:10,color:C.goldDark,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Desglose de esta visita</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <div>
          <div style={{fontSize:9,color:C.grayLight,letterSpacing:1,textTransform:"uppercase",marginBottom:6,fontFamily:"sans-serif"}}>Abono ya pagado</div>
          <input style={{...inpSt,textAlign:"right"}} type="number" min="0" value={form.abono} onChange={e=>f("abono",e.target.value)}/>
        </div>
        <div>
          <div style={{fontSize:9,color:C.grayLight,letterSpacing:1,textTransform:"uppercase",marginBottom:6,fontFamily:"sans-serif"}}>Pago en atención *</div>
          <input style={{...inpSt,textAlign:"right"}} type="number" min="0" placeholder="0" value={form.pago} onChange={e=>f("pago",e.target.value)}/>
        </div>
      </div>
      <div style={{background:C.charcoal,borderRadius:8,padding:"12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:11,color:C.gold,letterSpacing:1}}>TOTAL VISITA</div>
        <div style={{fontSize:22,fontWeight:700,color:C.gold}}>{fmtCLP(total)}</div>
      </div>
    </div>

    <Field label="Método de pago">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {METODOS.map(m=><button key={m} onClick={()=>f("metodo",m)} style={{padding:"10px",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"Georgia,serif",background:form.metodo===m?C.charcoal:C.white,color:form.metodo===m?C.gold:C.charcoal,border:form.metodo===m?`1px solid ${C.charcoal}`:`1px solid ${C.creamDeep}`}}>{m}</button>)}
      </div>
    </Field>
    <Field label="Observaciones"><textarea style={{...inpSt,height:60,resize:"none"}} value={form.obs} onChange={e=>f("obs",e.target.value)} placeholder="Notas adicionales..."/></Field>
    <button onClick={submit} disabled={form.pago===""} style={{width:"100%",padding:"14px",borderRadius:10,border:"none",cursor:form.pago===""?"not-allowed":"pointer",background:saved?C.green:form.pago===""?"#ccc":C.charcoal,color:saved?"#fff":form.pago===""?"#999":C.gold,fontSize:13,fontFamily:"Georgia,serif",letterSpacing:2,marginBottom:10}}>
      {saved?"✓ Registrado":"Confirmar y Registrar"}
    </button>
    <button onClick={noAsistio} style={{width:"100%",padding:"12px",borderRadius:10,border:`1px solid #F5B7B1`,background:C.redBg,color:C.red,fontSize:12,cursor:"pointer",fontFamily:"Georgia,serif"}}>
      😔 No asistió
    </button>
  </Modal>;
}

// ══════════════════════════════════════════════════════
// MODAL CONFIGURACIÓN DEL SALÓN
// ══════════════════════════════════════════════════════
function ModalConfigSalon({config,close}) {
  const [form,setForm] = useState({
    nombreSalon: config?.nombreSalon||"",
    abono: config?.abono||10000,
    profesionales: config?.profesionales?.length>0?config.profesionales:[""],
    servicios: config?.servicios?.length>0
      ? config.servicios.map(s=>typeof s==="string"?{nombre:s,precio:0}:s)
      : [{nombre:"",precio:""}],
    datosBanco: config?.datosBanco||{nombre:"",rut:"",banco:"",tipoCuenta:"",numeroCuenta:"",email:""},
  });
  const [saved,setSaved] = useState(false);
  const fb = (k,v) => setForm(p=>({...p,datosBanco:{...p.datosBanco,[k]:v}}));

  const addProf = () => setForm(p=>({...p,profesionales:[...p.profesionales,""]}));
  const setProf = (i,v) => setForm(p=>({...p,profesionales:p.profesionales.map((x,j)=>j===i?v:x)}));
  const delProf = (i) => setForm(p=>({...p,profesionales:p.profesionales.filter((_,j)=>j!==i)}));
  const addServ = () => setForm(p=>({...p,servicios:[...p.servicios,{nombre:"",precio:""}]}));
  const setServ = (i,k,v) => setForm(p=>({...p,servicios:p.servicios.map((x,j)=>j===i?{...x,[k]:v}:x)}));
  const delServ = (i) => setForm(p=>({...p,servicios:p.servicios.filter((_,j)=>j!==i)}));

  const guardar = async () => {
    const newConfig = {
      ...config,
      ...form,
      profesionales: form.profesionales.filter(p=>p.trim()),
      servicios: form.servicios.filter(s=>s.nombre.trim()).map(s=>({nombre:s.nombre.trim(),precio:Number(s.precio)||0})),
      configurado: true,
    };
    await saveDoc("config","salon",newConfig);
    setSaved(true); setTimeout(close,1000);
  };

  return <Modal title="Configuración del Salón" onClose={close}>
    <Field label="Nombre del salón"><input style={inpSt} value={form.nombreSalon} onChange={e=>setForm(p=>({...p,nombreSalon:e.target.value}))}/></Field>
    <Field label="Monto del abono ($)"><input style={inpSt} type="number" value={form.abono} onChange={e=>setForm(p=>({...p,abono:Number(e.target.value)}))}/></Field>

    <div style={{fontSize:10,color:C.goldDark,letterSpacing:2,textTransform:"uppercase",marginBottom:10,marginTop:4}}>Profesionales</div>
    {form.profesionales.map((p,i)=>(
      <div key={i} style={{display:"flex",gap:8,marginBottom:8}}>
        <input style={{...inpSt,flex:1}} placeholder={`Profesional ${i+1}`} value={p} onChange={e=>setProf(i,e.target.value)}/>
        {form.profesionales.length>1&&<button onClick={()=>delProf(i)} style={{width:36,borderRadius:8,border:`1px solid #F5B7B1`,background:C.redBg,color:C.red,cursor:"pointer"}}>✕</button>}
      </div>
    ))}
    <button onClick={addProf} style={{width:"100%",padding:"9px",borderRadius:8,border:`1.5px dashed ${C.gold}`,background:C.goldLight,color:C.goldDark,fontSize:12,cursor:"pointer",fontFamily:"Georgia,serif",marginBottom:16}}>+ Agregar profesional</button>

    <div style={{fontSize:10,color:C.goldDark,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Servicios y precios</div>
    {form.servicios.map((s,i)=>(
      <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
        <input style={{...inpSt,flex:2}} placeholder="Nombre del servicio" value={s.nombre} onChange={e=>setServ(i,"nombre",e.target.value)}/>
        <input style={{...inpSt,flex:1,textAlign:"right"}} type="number" placeholder="Precio $" value={s.precio||""} onChange={e=>setServ(i,"precio",e.target.value)}/>
        {form.servicios.length>1&&<button onClick={()=>delServ(i)} style={{width:36,flexShrink:0,borderRadius:8,border:`1px solid #F5B7B1`,background:C.redBg,color:C.red,cursor:"pointer"}}>✕</button>}
      </div>
    ))}
    <button onClick={addServ} style={{width:"100%",padding:"9px",borderRadius:8,border:`1.5px dashed ${C.gold}`,background:C.goldLight,color:C.goldDark,fontSize:12,cursor:"pointer",fontFamily:"Georgia,serif",marginBottom:20}}>+ Agregar servicio</button>

    <div style={{fontSize:10,color:C.goldDark,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Datos bancarios</div>
    <Field label="Nombre titular"><input style={inpSt} value={form.datosBanco.nombre} onChange={e=>fb("nombre",e.target.value)}/></Field>
    <Field label="RUT"><input style={inpSt} value={form.datosBanco.rut} onChange={e=>fb("rut",e.target.value)}/></Field>
    <Field label="Banco"><input style={inpSt} value={form.datosBanco.banco} onChange={e=>fb("banco",e.target.value)}/></Field>
    <Field label="Tipo de cuenta">
      <select style={inpSt} value={form.datosBanco.tipoCuenta} onChange={e=>fb("tipoCuenta",e.target.value)}>
        <option value="">Seleccionar...</option>
        <option>Cuenta Vista</option><option>Cuenta Corriente</option><option>Cuenta RUT</option><option>Chequera Electrónica</option>
      </select>
    </Field>
    <Field label="N° de cuenta"><input style={inpSt} value={form.datosBanco.numeroCuenta} onChange={e=>fb("numeroCuenta",e.target.value)}/></Field>
    <Field label="Correo"><input style={inpSt} type="email" value={form.datosBanco.email} onChange={e=>fb("email",e.target.value)}/></Field>

    <button onClick={guardar} style={{width:"100%",padding:"14px",borderRadius:10,border:"none",background:saved?C.green:C.charcoal,color:saved?"#fff":C.gold,fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif",letterSpacing:2}}>
      {saved?"✓ Guardado":"Guardar cambios"}
    </button>
  </Modal>;
}

// ══════════════════════════════════════════════════════
// MODAL DETALLE CLIENTA
// ══════════════════════════════════════════════════════
function ModalDetalleClienta({clienta,registros,citas,close,open}) {
  const regsC = registros.filter(r=>r.clientaId===clienta.id).sort((a,b)=>b.fecha?.localeCompare(a.fecha));
  const citasC = citas.filter(c=>c.clientaId===clienta.id&&c.estado==="confirmada"&&c.fecha>=todayStr()).sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const gastado = regsC.reduce((s,r)=>s+(Number(r.valor)||0),0);
  const visitas = regsC.length+(Number(clienta.atencionesPrevias)||0);

  return <Modal title="Perfil Clienta" onClose={close}>
    <div style={{background:C.charcoal,borderRadius:14,padding:"18px",marginBottom:18,display:"flex",gap:14,alignItems:"center"}}>
      <Avatar nombre={clienta.nombre} size={56}/>
      <div style={{flex:1}}>
        <div style={{fontSize:18,fontWeight:700,color:C.white}}>{clienta.nombre}</div>
        <div style={{fontSize:12,color:"#aaa",marginTop:3}}>{clienta.telefono||"Sin teléfono"}</div>
        {clienta.email&&<div style={{fontSize:11,color:"#888",marginTop:2}}>{clienta.email}</div>}
        <div style={{display:"flex",gap:16,marginTop:10}}>
          <div style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:700,color:C.gold}}>{visitas}</div><div style={{fontSize:9,color:"#777",letterSpacing:1}}>VISITAS</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:16,fontWeight:700,color:C.gold}}>{fmtCLP(gastado)}</div><div style={{fontSize:9,color:"#777",letterSpacing:1}}>TOTAL</div></div>
        </div>
      </div>
    </div>

    {clienta.obs&&<div style={{background:C.goldLight,borderRadius:10,padding:"11px 14px",marginBottom:14,fontSize:12,color:C.goldDark,lineHeight:1.6}}>
      📝 {clienta.obs}
    </div>}

    {citasC.length>0&&<>
      <div style={{fontSize:10,color:C.goldDark,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Próximas citas</div>
      {citasC.map(c=>(
        <div key={c.id} style={{background:C.greenBg,border:`1px solid #c3e6c3`,borderRadius:10,padding:"10px 14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:C.charcoal}}>{c.servicio}</div>
            <div style={{fontSize:11,color:C.grayMed}}>{fmtFecha(c.fecha)} · {c.hora}</div>
          </div>
          <span style={{fontSize:11,color:C.green,fontWeight:700}}>✓</span>
        </div>
      ))}
    </>}

    <div style={{fontSize:10,color:C.goldDark,letterSpacing:2,textTransform:"uppercase",marginBottom:10,marginTop:citasC.length>0?16:0}}>Últimas atenciones</div>
    {regsC.length===0
      ?<Empty text="Sin atenciones registradas"/>
      :regsC.slice(0,5).map((r,i)=>(
        <div key={r.id} style={{background:i%2===0?C.white:C.cream,border:`1px solid ${C.creamDeep}`,borderRadius:10,padding:"10px 14px",marginBottom:6,display:"flex",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:C.charcoal}}>{r.servicio}</div>
            <div style={{fontSize:10,color:C.grayLight}}>{fmtFecha(r.fecha)}{r.profesional?` · ${r.profesional}`:""}</div>
          </div>
          <div style={{fontSize:14,fontWeight:700,color:C.goldDark}}>{fmtCLP(r.valor)}</div>
        </div>
      ))
    }

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:16}}>
      <button onClick={()=>{close();open("nuevaClienta",clienta);}} style={{padding:"12px",borderRadius:10,border:`1px solid ${C.creamDeep}`,background:C.white,color:C.charcoal,fontSize:12,cursor:"pointer",fontFamily:"Georgia,serif"}}>✏️ Editar</button>
      <button onClick={()=>{close();open("eliminarClienta",clienta);}} style={{padding:"12px",borderRadius:10,border:`1px solid #F5B7B1`,background:C.redBg,color:C.red,fontSize:12,cursor:"pointer",fontFamily:"Georgia,serif"}}>🗑️ Eliminar</button>
    </div>
  </Modal>;
}

// ══════════════════════════════════════════════════════
// TAB INICIO
// ══════════════════════════════════════════════════════
function TabInicio({clientas,citas,solicitudes,registros,config,open}) {
  const citasHoy    = citas.filter(c=>c.fecha===todayStr()&&!["completada","no_asistio","cancelada"].includes(c.estado)).sort((a,b)=>a.hora.localeCompare(b.hora));
  const citasMañana = citas.filter(c=>c.fecha===tomorrowStr()&&!["completada","no_asistio","cancelada"].includes(c.estado)).sort((a,b)=>a.hora.localeCompare(b.hora));
  const solPendientes = solicitudes.filter(s=>["en_revision","pendiente","contraoferta","esperando_abono","abono_enviado"].includes(s.estado));
  const regsM = registros.filter(r=>r.mes===mesActual());
  const totalM = regsM.reduce((s,r)=>s+(Number(r.valor)||0),0);
  const clientasNuevas = clientas.filter(c=>{
    if(!c.creadaEn) return false;
    const d = new Date(c.creadaEn);
    const now = new Date();
    return now - d < 7*24*60*60*1000;
  }).length;

  return <div>
    {/* Resumen mes */}
    <div style={{background:C.charcoal,borderRadius:16,padding:"18px 20px",marginBottom:16}}>
      <div style={{fontSize:9,color:C.gold,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Ingresos {mesActual()}</div>
      <div style={{fontSize:28,fontWeight:700,color:C.gold}}>{fmtCLP(totalM)}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:14}}>
        <div style={{textAlign:"center"}}><div style={{fontSize:16,fontWeight:700,color:C.white}}>{regsM.length}</div><div style={{fontSize:8,color:"#777",letterSpacing:1,textTransform:"uppercase"}}>Atenciones</div></div>
        <div style={{textAlign:"center"}}><div style={{fontSize:16,fontWeight:700,color:C.white}}>{clientas.length}</div><div style={{fontSize:8,color:"#777",letterSpacing:1,textTransform:"uppercase"}}>Clientas</div></div>
        <div style={{textAlign:"center"}}><div style={{fontSize:16,fontWeight:700,color:clientasNuevas>0?C.gold:C.white}}>{clientasNuevas}</div><div style={{fontSize:8,color:"#777",letterSpacing:1,textTransform:"uppercase"}}>Nuevas 7d</div></div>
      </div>
    </div>

    {/* Solicitudes pendientes */}
    {solPendientes.length>0&&<>
      <div style={{fontSize:10,letterSpacing:2,color:C.grayLight,textTransform:"uppercase",marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
        <span style={{color:C.gold}}>◈</span> Solicitudes pendientes
        <span style={{background:C.red,color:"#fff",fontSize:9,minWidth:18,height:18,borderRadius:9,display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"0 4px"}}>{solPendientes.length}</span>
      </div>
      {solPendientes.slice(0,3).map(s=>{
        const cfg=ESTADO_CONFIG[s.estado]||{};
        return <div key={s.id} onClick={()=>open("solicitud",s)} style={{background:C.white,border:`1px solid ${C.creamDeep}`,borderLeft:`3px solid ${cfg.color||C.gold}`,borderRadius:12,padding:"13px 15px",marginBottom:8,cursor:"pointer"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:C.charcoal}}>{s.clientaNombre}</div>
              <div style={{fontSize:11,color:C.grayMed,marginTop:2}}>{s.servicio} · {fmtFecha(s.fecha)} {s.hora}</div>
              {s.profesional&&<div style={{fontSize:10,color:C.goldDark}}>👤 {s.profesional}</div>}
            </div>
            <Badge text={cfg.label||s.estado} color={cfg.color} bg={cfg.bg}/>
          </div>
        </div>;
      })}
      {solPendientes.length>3&&<div style={{fontSize:11,color:C.goldDark,textAlign:"center",marginBottom:8}}>+{solPendientes.length-3} solicitudes más →</div>}
    </>}

    {/* Citas hoy */}
    <div style={{fontSize:10,letterSpacing:2,color:C.grayLight,textTransform:"uppercase",marginBottom:10,marginTop:16,display:"flex",alignItems:"center",gap:8}}>
      <span style={{color:C.gold}}>◉</span> Hoy — {new Date().toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long"})} ({citasHoy.length})
    </div>
    {citasHoy.length===0
      ?<Empty text="Sin citas para hoy"/>
      :citasHoy.map(c=>(
        <div key={c.id} style={{background:C.white,border:`1px solid ${C.creamDeep}`,borderLeft:`3px solid ${C.gold}`,borderRadius:12,padding:"13px 15px",marginBottom:9}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <Avatar nombre={c.clientaNombre} size={38}/>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:C.charcoal}}>{c.clientaNombre}</div>
                <div style={{fontSize:11,color:C.grayMed,fontStyle:"italic"}}>{c.servicio}</div>
                {c.profesional&&<div style={{fontSize:10,color:C.goldDark}}>👤 {c.profesional}</div>}
              </div>
            </div>
            <div style={{fontSize:20,fontWeight:700,color:C.gold}}>{c.hora}</div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:10}}>
            {c.telefono&&<a href={`https://wa.me/56${c.telefono.replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{flex:1,textAlign:"center",padding:"8px",borderRadius:8,background:C.greenBg,color:C.green,fontSize:11,textDecoration:"none"}}>💬 WA</a>}
            <button onClick={()=>open("confirmar",c)} style={{flex:2,padding:"8px",borderRadius:8,border:"none",background:C.charcoal,color:C.gold,fontSize:11,cursor:"pointer",fontFamily:"Georgia,serif"}}>✓ Confirmar atención</button>
          </div>
        </div>
      ))
    }

    {/* Citas mañana */}
    {citasMañana.length>0&&<>
      <div style={{fontSize:10,letterSpacing:2,color:C.grayLight,textTransform:"uppercase",marginBottom:10,marginTop:16}}>
        <span style={{color:C.gold}}>◈</span> Mañana ({citasMañana.length})
      </div>
      {citasMañana.map(c=>(
        <div key={c.id} style={{background:C.cream,border:`1px solid ${C.creamDeep}`,borderRadius:12,padding:"13px 15px",marginBottom:9,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:C.charcoal}}>{c.clientaNombre}</div>
            <div style={{fontSize:11,color:C.grayMed}}>{c.servicio}{c.profesional?` · 👤 ${c.profesional}`:""}</div>
          </div>
          <div style={{fontSize:18,fontWeight:700,color:C.gold}}>{c.hora}</div>
        </div>
      ))}
    </>}

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:20}}>
      <button onClick={()=>open("nuevaClienta")} style={{padding:"14px",borderRadius:12,border:`1.5px dashed ${C.gold}`,background:C.goldLight,color:C.goldDark,fontSize:12,cursor:"pointer",fontFamily:"Georgia,serif"}}>✦ Nueva Clienta</button>
      <button onClick={()=>open("agendarCita")} style={{padding:"14px",borderRadius:12,border:"none",background:C.charcoal,color:C.gold,fontSize:12,cursor:"pointer",fontFamily:"Georgia,serif"}}>◈ Agendar Cita</button>
    </div>
  </div>;
}

// ══════════════════════════════════════════════════════
// TAB SOLICITUDES
// ══════════════════════════════════════════════════════
function TabSolicitudes({solicitudes,clientas,config,open}) {
  const [filtro,setFiltro] = useState("activas");
  const activas  = solicitudes.filter(s=>!["confirmada","rechazada","cancelada"].includes(s.estado)).sort((a,b)=>String(b.id).localeCompare(String(a.id)));
  const historial = solicitudes.filter(s=>["confirmada","rechazada","cancelada"].includes(s.estado)).sort((a,b)=>String(b.id).localeCompare(String(a.id)));
  const lista = filtro==="activas"?activas:historial;

  return <div>
    <div style={{fontSize:11,color:C.goldDark,letterSpacing:3,textTransform:"uppercase",marginBottom:16}}>Solicitudes de Citas</div>
    <div style={{display:"flex",gap:8,marginBottom:16}}>
      {[{id:"activas",label:`Activas (${activas.length})`},{id:"historial",label:`Historial (${historial.length})`}].map(f=>(
        <button key={f.id} onClick={()=>setFiltro(f.id)} style={{flex:1,padding:"9px",borderRadius:9,border:`1px solid ${C.creamDeep}`,background:filtro===f.id?C.charcoal:C.white,color:filtro===f.id?C.gold:C.grayMed,fontSize:11,cursor:"pointer",fontFamily:"Georgia,serif"}}>{f.label}</button>
      ))}
    </div>
    {lista.length===0
      ?<Empty text={filtro==="activas"?"No hay solicitudes activas":"Sin historial aún"}/>
      :lista.map(s=>{
        const cfg=ESTADO_CONFIG[s.estado]||{};
        return <div key={s.id} onClick={()=>open("solicitud",s)} style={{background:C.white,border:`1px solid ${C.creamDeep}`,borderLeft:`3px solid ${cfg.color||C.gold}`,borderRadius:12,padding:"14px 16px",marginBottom:9,cursor:"pointer"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
            <div style={{fontSize:14,fontWeight:700,color:C.charcoal}}>{s.clientaNombre}</div>
            <Badge text={cfg.label||s.estado} color={cfg.color} bg={cfg.bg}/>
          </div>
          <div style={{fontSize:12,color:C.grayMed}}>{s.servicio}</div>
          {s.profesional&&<div style={{fontSize:11,color:C.goldDark}}>👤 {s.profesional}</div>}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
            <div style={{fontSize:11,color:C.grayLight}}>📅 {fmtFecha(s.fecha)} · {s.hora}</div>
            {filtro==="historial"&&<button onClick={e=>{e.stopPropagation();open("eliminarSolicitud",s);}} style={{width:24,height:24,borderRadius:"50%",border:`1px solid #F5B7B1`,background:C.redBg,color:C.red,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>}
          </div>
        </div>;
      })
    }
  </div>;
}

// ══════════════════════════════════════════════════════
// TAB CLIENTAS
// ══════════════════════════════════════════════════════
function TabClientas({clientas,registros,citas,open}) {
  const [buscar,setBuscar] = useState("");
  const filtradas = [...clientas].filter(c=>c.nombre.toLowerCase().includes(buscar.toLowerCase())).sort(sortNombre);

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <div style={{fontSize:11,color:C.goldDark,letterSpacing:3,textTransform:"uppercase"}}>Clientas ({clientas.length})</div>
      <button onClick={()=>open("nuevaClienta")} style={{background:C.charcoal,color:C.gold,border:"none",borderRadius:8,padding:"9px 18px",fontSize:12,cursor:"pointer",fontFamily:"Georgia,serif"}}>+ Nueva</button>
    </div>
    <input style={{...inpSt,marginBottom:14}} placeholder="Buscar por nombre..." value={buscar} onChange={e=>setBuscar(e.target.value)}/>
    {filtradas.length===0
      ?<Empty text={clientas.length===0?"Aún no hay clientas registradas":"Sin resultados"}/>
      :filtradas.map((c,i)=>{
        const regsClienta = registros.filter(r=>r.clientaId===c.id);
        const gastado = regsClienta.reduce((s,r)=>s+(Number(r.valor)||0),0);
        const visitas = regsClienta.length+(Number(c.atencionesPrevias)||0);
        const tieneProxima = citas.some(ci=>ci.clientaId===c.id&&ci.estado==="confirmada"&&ci.fecha>=todayStr());
        return <div key={c.id} style={{background:i%2===0?C.white:C.cream,border:`1px solid ${C.creamDeep}`,borderRadius:12,padding:"13px 16px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",gap:12,alignItems:"center",flex:1,cursor:"pointer",minWidth:0}} onClick={()=>open("detalleClienta",c)}>
            <div style={{position:"relative"}}>
              <Avatar nombre={c.nombre} size={42}/>
              {tieneProxima&&<span style={{position:"absolute",bottom:0,right:0,width:10,height:10,borderRadius:"50%",background:C.green,border:`2px solid ${C.white}`}}/>}
            </div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:14,fontWeight:700,color:C.charcoal,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.nombre}</div>
              <div style={{fontSize:11,color:C.grayMed,marginTop:2}}>{c.telefono||"Sin teléfono"}</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}} onClick={()=>open("detalleClienta",c)}>
            <div style={{textAlign:"right",cursor:"pointer"}}>
              <div style={{fontSize:14,fontWeight:700,color:C.goldDark}}>{visitas}</div>
              <div style={{fontSize:9,color:C.grayLight,letterSpacing:1,textTransform:"uppercase"}}>visitas</div>
              <div style={{fontSize:10,color:C.grayLight}}>{fmtCLP(gastado)}</div>
            </div>
          </div>
        </div>;
      })
    }
  </div>;
}

// ══════════════════════════════════════════════════════
// TAB REPORTES
// ══════════════════════════════════════════════════════
function TabReportes({registros,clientas}) {
  const [mes,setMes] = useState(mesActual());
  const regs    = registros.filter(r=>r.mes===mes).sort((a,b)=>a.fecha?.localeCompare(b.fecha));
  const total   = regs.reduce((s,r)=>s+(Number(r.valor)||0),0);
  const totalAnual = registros.reduce((s,r)=>s+(Number(r.valor)||0),0);

  // Stats adicionales
  const porMetodo = METODOS.reduce((acc,m)=>{
    const t = regs.filter(r=>r.metodo===m).reduce((s,r)=>s+(Number(r.valor)||0),0);
    if(t>0) acc[m]=t; return acc;
  },{});
  const porProf = {};
  regs.forEach(r=>{ if(r.profesional){ porProf[r.profesional]=(porProf[r.profesional]||0)+(Number(r.valor)||0); } });

  const exportar = () => {
    const visitasMap = {};
    const totalAcumMap = {};
    registros.forEach(r => {
      const id = r.clientaId||r.clientaNombre||"";
      visitasMap[id]   = (visitasMap[id]||0)+1;
      totalAcumMap[id] = (totalAcumMap[id]||0)+(Number(r.valor)||0);
    });
    clientas.forEach(c => {
      if(c.atencionesPrevias>0) visitasMap[c.id] = (visitasMap[c.id]||0)+(Number(c.atencionesPrevias)||0);
    });
    const rows = [
      ["NOMBRE","SERVICIO","PROFESIONAL","FECHA","ABONO","PAGO ATENCIÓN","TOTAL","MÉTODO","VISITAS CLIENTA","TOTAL ACUMULADO CLIENTA"],
      ...regs.map(r=>{
        const id = r.clientaId||r.clientaNombre||"";
        return [r.clientaNombre||"",r.servicio||"",r.profesional||"",r.fecha||"",r.abono||0,r.pago||0,r.valor||0,r.metodo||"",visitasMap[id]||1,totalAcumMap[id]||r.valor||""];
      }),
    ];
    const csv  = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href=url; a.download=`Reporte_${mes}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return <div>
    <div style={{background:C.charcoal,borderRadius:16,padding:"18px",marginBottom:16,textAlign:"center"}}>
      <div style={{fontSize:9,color:C.gold,letterSpacing:3,textTransform:"uppercase",marginBottom:4}}>Total Anual</div>
      <div style={{fontSize:30,fontWeight:700,color:C.gold}}>{fmtCLP(totalAnual)}</div>
      <div style={{fontSize:11,color:"#888",marginTop:3}}>{registros.length} atenciones · {clientas.length} clientas</div>
    </div>
    <select style={{...inpSt,marginBottom:14}} value={mes} onChange={e=>setMes(e.target.value)}>
      {MESES.map(m=><option key={m}>{m}</option>)}
    </select>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
      <StatBox label={`Ingresos ${mes}`} value={fmtCLP(total)} color={C.goldDark}/>
      <StatBox label="Atenciones" value={regs.length}/>
    </div>

    {Object.keys(porMetodo).length>0&&<div style={{background:C.white,border:`1px solid ${C.creamDeep}`,borderRadius:12,padding:"14px",marginBottom:14}}>
      <div style={{fontSize:9,color:C.goldDark,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Por método de pago</div>
      {Object.entries(porMetodo).map(([m,v])=>(
        <div key={m} style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:12}}>
          <span style={{color:C.grayMed}}>{m}</span><span style={{fontWeight:700,color:C.charcoal}}>{fmtCLP(v)}</span>
        </div>
      ))}
    </div>}

    {Object.keys(porProf).length>0&&<div style={{background:C.white,border:`1px solid ${C.creamDeep}`,borderRadius:12,padding:"14px",marginBottom:14}}>
      <div style={{fontSize:9,color:C.goldDark,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Por profesional</div>
      {Object.entries(porProf).map(([p,v])=>(
        <div key={p} style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:12}}>
          <span style={{color:C.grayMed}}>👤 {p}</span><span style={{fontWeight:700,color:C.charcoal}}>{fmtCLP(v)}</span>
        </div>
      ))}
    </div>}

    <button onClick={exportar} style={{width:"100%",padding:"13px",borderRadius:10,border:`1.5px solid ${C.creamDeep}`,background:C.white,color:C.charcoal,fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
      📊 Exportar {mes} a CSV/Excel
    </button>

    {regs.length===0
      ?<Empty text={`Sin registros en ${mes}`}/>
      :regs.map((r,i)=>(
        <div key={r.id} style={{background:i%2===0?C.white:C.cream,border:`1px solid ${C.creamDeep}`,borderRadius:10,padding:"12px 14px",marginBottom:7}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:C.charcoal}}>{r.clientaNombre||"—"}</div>
              <div style={{fontSize:11,color:C.grayMed,fontStyle:"italic"}}>{r.servicio}{r.profesional?` · ${r.profesional}`:""}</div>
              <div style={{fontSize:10,color:C.grayLight}}>{fmtFecha(r.fecha)} · {r.metodo}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:15,fontWeight:700,color:C.goldDark}}>{fmtCLP(r.valor)}</div>
              {r.abono>0&&<div style={{fontSize:10,color:C.grayLight}}>Abono: {fmtCLP(r.abono)}</div>}
              {r.pago>0&&<div style={{fontSize:10,color:C.grayLight}}>Atención: {fmtCLP(r.pago)}</div>}
            </div>
          </div>
        </div>
      ))
    }
  </div>;
}

// ══════════════════════════════════════════════════════
// APP PRINCIPAL
// ══════════════════════════════════════════════════════
export default function App() {
  const [user,setUser]               = useState(null);
  const [authLoading,setAuthLoading] = useState(true);
  const [config,setConfig]           = useState(null);
  const [configLoading,setConfigLoading] = useState(true);
  const [tab,setTab]                 = useState("inicio");
  const [clientas,setClientas]       = useState([]);
  const [citas,setCitas]             = useState([]);
  const [registros,setRegistros]     = useState([]);
  const [solicitudes,setSolicitudes] = useState([]);
  const [modal,setModal]             = useState(null);
  const [mData,setMData]             = useState(null);
  const [toast,setToast]             = useState({msg:"",type:""});

  useEffect(()=>{
    const unsub = onAuthStateChanged(auth,u=>{ setUser(u); setAuthLoading(false); });
    return unsub;
  },[]);

  useEffect(()=>{
    const unsub = onSnapshot(doc(db,"config","salon"),snap=>{
      setConfig(snap.exists()?snap.data():null);
      setConfigLoading(false);
    });
    return unsub;
  },[]);

  useEffect(()=>{
    if(!user) return;
    const unsubs = [
      onSnapshot(collection(db,"clientas"),    snap=>setClientas(snap.docs.map(d=>d.data()))),
      onSnapshot(collection(db,"citas"),       snap=>setCitas(snap.docs.map(d=>d.data()))),
      onSnapshot(collection(db,"registros"),   snap=>setRegistros(snap.docs.map(d=>d.data()))),
      onSnapshot(collection(db,"solicitudes"), snap=>setSolicitudes(snap.docs.map(d=>d.data()))),
    ];
    return ()=>unsubs.forEach(u=>u());
  },[user]);

  const showToast = useCallback((msg,type="ok")=>{
    setToast({msg,type});
    setTimeout(()=>setToast({msg:"",type:""}),2500);
  },[]);

  const open  = (name,data=null) => { setMData(data); setModal(name); };
  const close = ()               => { setModal(null); setMData(null); };

  const solPendientes = solicitudes.filter(s=>["en_revision","pendiente","contraoferta","esperando_abono","abono_enviado"].includes(s.estado)).length;

  if(authLoading||configLoading) return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:C.cream,gap:20}}>
      <Logo lg nombre={config?.nombreSalon}/><div style={{fontSize:10,color:C.grayLight,letterSpacing:4}}>Cargando...</div>
    </div>
  );

  if(!user) return <PantallaLogin onLogin={u=>setUser(u)} salonNombre={config?.nombreSalon}/>;
  if(!config?.configurado) return <PantallaConfigInicial onGuardar={setConfig}/>;

  return (
    <div style={{minHeight:"100vh",background:C.cream,maxWidth:480,margin:"0 auto",paddingBottom:90,fontFamily:"Georgia,serif"}}>
      <Toast msg={toast.msg} type={toast.type}/>

      {/* Header */}
      <div style={{background:C.white,borderBottom:`1px solid ${C.creamDeep}`,padding:"14px 20px 12px",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 14px rgba(0,0,0,0.05)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <Logo nombre={config?.nombreSalon}/>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>open("configSalon")} style={{background:"none",border:`1px solid ${C.creamDeep}`,borderRadius:8,padding:"6px 10px",fontSize:16,cursor:"pointer"}} title="Configuración">⚙️</button>
          <button onClick={()=>signOut(auth)} style={{background:"none",border:`1px solid ${C.creamDeep}`,borderRadius:8,padding:"6px 12px",fontSize:10,color:C.grayLight,cursor:"pointer",fontFamily:"Georgia,serif"}}>Salir</button>
        </div>
      </div>

      {/* Contenido */}
      <div style={{padding:"22px 18px 0"}}>
        {tab==="inicio"      &&<TabInicio      clientas={clientas} citas={citas} solicitudes={solicitudes} registros={registros} config={config} open={open}/>}
        {tab==="solicitudes" &&<TabSolicitudes solicitudes={solicitudes} clientas={clientas} config={config} open={open}/>}
        {tab==="clientas"    &&<TabClientas    clientas={clientas} registros={registros} citas={citas} open={open}/>}
        {tab==="reportes"    &&<TabReportes    registros={registros} clientas={clientas}/>}
      </div>

      {/* Nav */}
      <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:C.white,borderTop:`1px solid ${C.creamDeep}`,display:"flex",padding:"9px 0 14px",boxShadow:"0 -4px 18px rgba(0,0,0,0.07)",zIndex:100}}>
        {[
          {id:"inicio",icon:"◉",label:"Inicio"},
          {id:"solicitudes",icon:"◈",label:"Solicitudes",badge:solPendientes},
          {id:"clientas",icon:"✦",label:"Clientas"},
          {id:"reportes",icon:"◇",label:"Reportes"},
        ].map(n=>(
          <button key={n.id} onClick={()=>setTab(n.id)} style={{flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,position:"relative"}}>
            {n.badge>0&&<span style={{position:"absolute",top:-2,right:"18%",background:C.red,color:"#fff",fontSize:9,minWidth:16,height:16,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px"}}>{n.badge}</span>}
            <span style={{fontSize:18,color:tab===n.id?C.gold:C.grayLight}}>{n.icon}</span>
            <span style={{fontSize:9,letterSpacing:1,textTransform:"uppercase",color:tab===n.id?C.goldDark:C.grayLight,fontFamily:"sans-serif"}}>{n.label}</span>
          </button>
        ))}
      </nav>

      {/* Modales */}
      {modal==="nuevaClienta"      &&<ModalNuevaClienta      data={mData} close={close} onToast={showToast}/>}
      {modal==="eliminarClienta"   &&<ModalEliminarClienta   data={mData} close={close}/>}
      {modal==="eliminarSolicitud" &&<ModalEliminarSolicitud data={mData} close={close}/>}
      {modal==="agendarCita"       &&<ModalAgendarCita       clientas={clientas} config={config} close={close}/>}
      {modal==="confirmar"         &&<ModalConfirmar         data={mData} clientas={clientas} config={config} close={close}/>}
      {modal==="solicitud"         &&<ModalSolicitud         solicitud={mData} clientas={clientas} config={config} close={close}/>}
      {modal==="configSalon"       &&<ModalConfigSalon       config={config} close={close}/>}
      {modal==="detalleClienta"    &&<ModalDetalleClienta    clienta={mData} registros={registros} citas={citas} close={close} open={open}/>}
    </div>
  );
}
