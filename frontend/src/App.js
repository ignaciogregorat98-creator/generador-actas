import { useState } from "react";

const PUNTOS_DEF = [
  { id: "firma",        label: "Designación de dos socios para firmar el Acta de Reunión" },
  { id: "reforma",      label: "Reforma del Contrato Social" },
  { id: "autoridades",  label: "Designación de Gerente" },
  { id: "ratificacion", label: "Ratificación y rectificación de Acta anterior" },
  { id: "balance",      label: "Consideración y aprobación de Estados Contables" },
];

const MODELOS_DEFAULT = {
  firma:        "Acto seguido, se pone a consideración el NUMPUNTO del orden del día: Designación de dos socios para firmar el Acta de Reunión. Puesto a consideración el punto, por unanimidad se resuelve que el Acta será suscripta por ..., D.N.I. ... y ..., D.N.I. ...",
  reforma:      "Acto seguido se pone a consideración el NUMPUNTO del orden del día: Reforma del Contrato Social. Toma la palabra el Gerente y manifiesta la conveniencia de proceder a la modificación del Contrato Social en los siguientes términos: ... Sometido el punto a votación, por unanimidad de los socios presentes se resuelve modificar el Contrato Social, cuyo texto queda redactado de la siguiente manera: ... Se instruyó al Gerente para que proceda a realizar las gestiones registrales pertinentes ante el organismo de contralor correspondiente.",
  autoridades:  "Acto seguido se pone a consideración el NUMPUNTO del orden del día: Designación de Gerente. Por unanimidad se resuelve designar como Gerente de la sociedad, por el término de ..., al/a la señor/a ..., D.N.I. N° ..., con domicilio en ..., quien acepta el cargo y constituye domicilio especial en la sede social.",
  ratificacion: "Acto seguido se pone a consideración el NUMPUNTO del orden del día: Ratificación y rectificación del Acta N° ... de fecha ... Toma la palabra el Gerente e informa que en el Acta N° ... de fecha ... se consignó erróneamente ..., debiendo decir correctamente: ... Sometido el punto a votación, por unanimidad de los socios presentes se resuelve ratificar en todos sus términos el Acta N° ..., con la rectificación precedentemente indicada.",
  balance:      "Acto seguido se pone a consideración el NUMPUNTO del orden del día: Consideración y aprobación de los Estados Contables correspondientes al Ejercicio N° ... cerrado el ... El Gerente somete a consideración de los socios los Estados Contables del Ejercicio N° ..., compuestos por Estado de Situación Patrimonial, Estado de Resultados, Estado de Evolución del Patrimonio Neto, Notas y Anexos, auditados por el/la Contador/a ..., matrícula N° ... Sometidos a votación, por unanimidad se resuelve aprobarlos en todos sus términos, arrojando el ejercicio un resultado de ... por la suma de $ ...",
};

const PASO_DATOS   = "datos";
const PASO_ORDEN   = "orden";
const PASO_TEXTOS  = "textos";
const PASO_PREVIEW = "preview";

export default function App() {
  const [paso, setPaso] = useState(PASO_DATOS);
  const [datos, setDatos] = useState({
    nombre: "", lugar: "", fecha: new Date().toISOString().split("T")[0],
    hora: "", tipoReunion: "ord", participantes: "", autoridad: "",
  });
  const [seleccionados, setSeleccionados] = useState([]);
  const [textos, setTextos] = useState({ ...MODELOS_DEFAULT });
  const [preview, setPreview] = useState("");
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");

  function togglePunto(id) {
    setSeleccionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function actualizarTexto(id, valor) {
    setTextos(prev => ({ ...prev, [id]: valor }));
  }

  function buildPreview() {
    const d = datos;
    const fecha = d.fecha ? (() => {
      const [y,m,dia] = d.fecha.split("-");
      const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
      return `${parseInt(dia)} de ${meses[parseInt(m)-1]} de ${y}`;
    })() : "...";
    const tipoR = d.tipoReunion === "ord" ? "Ordinaria" : "Extraordinaria";
    const od = seleccionados.map((id,i) => `${i+1}.      ${PUNTOS_DEF.find(p=>p.id===id).label}.`).join("\n");
    const bloques = seleccionados.map((id,i) =>
      textos[id].replace("NUMPUNTO", `${i+1}°`)
    ).join("\n\n");
    return `${(d.nombre||"...").toUpperCase()}
Reunión de Socios ${tipoR} — Acta N° ...

En la ciudad de ${d.lugar||"..."}, a los ${fecha}, siendo las ${d.hora||"..."} horas, se reúnen en la sede social los socios de ${d.nombre||"..."}: ${d.participantes||"..."}, quienes representan el ...% del capital social.

Encontrándose presente el Gerente señor/a ${d.autoridad||"..."}, quien preside el acto, y habiéndose verificado el quórum necesario para sesionar, no habiendo objeciones en cuanto a la constitución del acto, se declara válidamente abierta la Reunión de Socios, procediéndose a considerar el siguiente Orden del Día:

${od}

${bloques}

No habiendo más asuntos que tratar, siendo las ... horas, se da por finalizada la Reunión de Socios, labrándose la presente Acta que, leída y hallada conforme, es firmada por los presentes.

...
...`;
  }

  function irA(nuevoPaso) {
    if (nuevoPaso === PASO_PREVIEW) setPreview(buildPreview());
    setPaso(nuevoPaso);
  }

  async function descargarWord() {
    setGenerando(true);
    setError("");
    try {
      const textosEditados = {};
      seleccionados.forEach((id, i) => {
        textosEditados[id] = textos[id].replace("NUMPUNTO", `${i+1}°`);
      });
      const resp = await fetch("http://localhost:3001/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...datos, puntos: seleccionados, textosEditados }),
      });
      if (!resp.ok) throw new Error("Error del servidor");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Acta_${datos.nombre.replace(/\s+/g,"_") || "acta"}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError("No se pudo conectar con el servidor. Verificá que el backend esté corriendo.");
    }
    setGenerando(false);
  }

  const s = {
    app: { maxWidth:680, margin:"0 auto", padding:"2rem 1rem", fontFamily:"Segoe UI, Arial, sans-serif", color:"#111827" },
    h1: { fontSize:22, fontWeight:600, marginBottom:4 },
    sub: { fontSize:14, color:"#6B7280", marginBottom:28 },
    tabs: { display:"flex", borderBottom:"1.5px solid #D1D5DB", marginBottom:24 },
    tab: (activo) => ({ padding:"8px 16px", fontSize:13, cursor:"pointer", color: activo?"#185FA5":"#6B7280", borderBottom: activo?"2.5px solid #185FA5":"2.5px solid transparent", fontWeight: activo?500:400, background:"none", border:"none" }),
    card: { background:"white", border:"1px solid #D1D5DB", borderRadius:8, padding:20, marginBottom:16 },
    label: { fontSize:13, color:"#6B7280", display:"block", marginBottom:4 },
    input: { width:"100%", padding:"8px 10px", fontSize:14, border:"1px solid #D1D5DB", borderRadius:6, fontFamily:"inherit", boxSizing:"border-box" },
    grid2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 },
    field: { display:"flex", flexDirection:"column" },
    puntoItem: (sel) => ({ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", border: sel?"1px solid #185FA5":"1px solid #D1D5DB", borderRadius:7, marginBottom:8, cursor:"pointer", background: sel?"#E6F1FB":"white", userSelect:"none" }),
    check: (sel) => ({ width:19, height:19, border: sel?"none":"1.5px solid #D1D5DB", borderRadius:4, background: sel?"#185FA5":"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }),
    badge: { fontSize:11, fontWeight:600, color:"#185FA5", background:"white", border:"1px solid #185FA5", padding:"2px 9px", borderRadius:99, marginLeft:"auto" },
    btnPrimary: { background:"#185FA5", color:"white", border:"none", borderRadius:6, padding:"9px 18px", fontSize:14, fontWeight:500, cursor:"pointer", fontFamily:"inherit" },
    btnSecondary: { background:"white", color:"#111827", border:"1px solid #D1D5DB", borderRadius:6, padding:"9px 18px", fontSize:14, cursor:"pointer", fontFamily:"inherit" },
    btnRow: { display:"flex", gap:10, marginTop:20, flexWrap:"wrap" },
    bloqueWrap: { border:"1px solid #D1D5DB", borderRadius:7, marginBottom:10, overflow:"hidden" },
    bloqueHead: { padding:"10px 14px", background:"#F9FAFB", fontSize:13, fontWeight:500 },
    bloqueTxt: { width:"100%", minHeight:120, padding:10, fontSize:13, lineHeight:1.7, border:"none", borderTop:"1px solid #D1D5DB", fontFamily:"Georgia, serif", resize:"vertical", boxSizing:"border-box" },
    preview: { background:"white", border:"1px solid #D1D5DB", borderRadius:8, padding:32, fontSize:13.5, lineHeight:2, fontFamily:"Georgia, serif", whiteSpace:"pre-wrap", maxHeight:480, overflowY:"auto" },
    alerta: { background:"#FAEEDA", border:"1px solid #EF9F27", borderRadius:6, padding:"10px 14px", fontSize:13, color:"#633806", marginBottom:16 },
    error: { background:"#FEE2E2", border:"1px solid #FCA5A5", borderRadius:6, padding:"10px 14px", fontSize:13, color:"#991B1B", marginTop:12 },
    cardTit: { fontSize:11, fontWeight:600, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 },
  };

  const pasos = [PASO_DATOS, PASO_ORDEN, PASO_TEXTOS, PASO_PREVIEW];
  const labels = ["1. Datos","2. Orden del día","3. Revisar textos","4. Vista previa"];

  return (
    <div style={s.app}>
      <h1 style={s.h1}>Generador de actas — S.R.L.</h1>
      <p style={s.sub}>Completá los datos, seleccioná el orden del día y descargá el Word.</p>
      <div style={s.tabs}>
        {pasos.map((p,i) => (
          <button key={p} style={s.tab(paso===p)} onClick={()=>irA(p)}>{labels[i]}</button>
        ))}
      </div>

      {paso === PASO_DATOS && (
        <div>
          <div style={s.card}>
            <div style={s.cardTit}>Datos de la entidad</div>
            <div style={s.grid2}>
              <div style={s.field}><label style={s.label}>Denominación social</label><input style={s.input} value={datos.nombre} onChange={e=>setDatos({...datos,nombre:e.target.value})} placeholder='Ej: "López y Cía S.R.L."'/></div>
              <div style={s.field}><label style={s.label}>Lugar de celebración</label><input style={s.input} value={datos.lugar} onChange={e=>setDatos({...datos,lugar:e.target.value})} placeholder="Ej: Córdoba, Pcia. de Córdoba"/></div>
            </div>
            <div style={s.grid2}>
              <div style={s.field}><label style={s.label}>Fecha</label><input style={s.input} type="date" value={datos.fecha} onChange={e=>setDatos({...datos,fecha:e.target.value})}/></div>
              <div style={s.field}><label style={s.label}>Hora de inicio</label><input style={s.input} type="time" value={datos.hora} onChange={e=>setDatos({...datos,hora:e.target.value})}/></div>
            </div>
            <div style={s.field}><label style={s.label}>Tipo de reunión</label>
              <select style={s.input} value={datos.tipoReunion} onChange={e=>setDatos({...datos,tipoReunion:e.target.value})}>
                <option value="ord">Ordinaria</option>
                <option value="ext">Extraordinaria</option>
              </select>
            </div>
          </div>
          <div style={s.card}>
            <div style={s.cardTit}>Participantes</div>
            <div style={s.field}><label style={s.label}>Socios presentes</label><textarea style={{...s.input,minHeight:70,resize:"vertical",lineHeight:1.6}} value={datos.participantes} onChange={e=>setDatos({...datos,participantes:e.target.value})} placeholder="Ej: Juan García (60%), María López (40%)"/></div>
            <div style={{...s.field,marginTop:12}}><label style={s.label}>Gerente</label><input style={s.input} value={datos.autoridad} onChange={e=>setDatos({...datos,autoridad:e.target.value})} placeholder="Nombre completo"/></div>
          </div>
          <div style={s.btnRow}><button style={s.btnPrimary} onClick={()=>irA(PASO_ORDEN)}>Siguiente → Orden del día</button></div>
        </div>
      )}

      {paso === PASO_ORDEN && (
        <div>
          <div style={s.card}>
            <div style={s.cardTit}>Seleccioná los puntos en orden</div>
            {PUNTOS_DEF.map(p => (
              <div key={p.id} style={s.puntoItem(seleccionados.includes(p.id))} onClick={()=>togglePunto(p.id)}>
                <div style={s.check(seleccionados.includes(p.id))}>
                  {seleccionados.includes(p.id) && <span style={{color:"white",fontSize:12,fontWeight:700}}>✓</span>}
                </div>
                <span style={{fontSize:14,flex:1}}>{p.label}</span>
                {seleccionados.includes(p.id) && <span style={s.badge}>{seleccionados.indexOf(p.id)+1}</span>}
              </div>
            ))}
          </div>
          <div style={s.btnRow}>
            <button style={s.btnSecondary} onClick={()=>irA(PASO_DATOS)}>← Atrás</button>
            <button style={s.btnPrimary} onClick={()=>irA(PASO_TEXTOS)}>Siguiente → Revisar textos</button>
          </div>
        </div>
      )}

      {paso === PASO_TEXTOS && (
        <div>
          <div style={s.alerta}>Revisá y editá los textos antes de generar. Los <strong>...</strong> son espacios que quedan en blanco en el Word.</div>
          {seleccionados.length === 0 && <p style={{fontSize:13,color:"#6B7280"}}>No seleccionaste ningún punto del orden del día.</p>}
          {seleccionados.map((id,i) => (
            <div key={id} style={s.bloqueWrap}>
              <div style={s.bloqueHead}>{i+1}. {PUNTOS_DEF.find(p=>p.id===id).label}</div>
              <textarea style={s.bloqueTxt} value={textos[id]} onChange={e=>actualizarTexto(id,e.target.value)} rows={5}/>
            </div>
          ))}
          <div style={s.btnRow}>
            <button style={s.btnSecondary} onClick={()=>irA(PASO_ORDEN)}>← Atrás</button>
            <button style={s.btnPrimary} onClick={()=>irA(PASO_PREVIEW)}>Generar vista previa →</button>
          </div>
        </div>
      )}

      {paso === PASO_PREVIEW && (
        <div>
          <div style={s.alerta}>Los espacios <strong>...</strong> deben completarse manualmente en el Word.</div>
          <div style={s.preview}>{preview}</div>
          <div style={s.btnRow}>
            <button style={s.btnSecondary} onClick={()=>irA(PASO_TEXTOS)}>← Atrás</button>
            <button style={s.btnPrimary} onClick={descargarWord} disabled={generando}>
              {generando ? "Generando..." : "⬇ Descargar Word"}
            </button>
          </div>
          {error && <div style={s.error}>{error}</div>}
        </div>
      )}
    </div>
  );
}