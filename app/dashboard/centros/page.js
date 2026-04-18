'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../../components/Sidebar'
import { supabase } from '../../../lib/supabase'

const REGIONES = ['Ciudad de Panamá','Chiriquí','Coclé','Veraguas','Herrera','Los Santos','Colón','Darién','Panamá Oeste']

export default function CentrosPage() {
  const [centros, setCentros] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [status, setStatus] = useState('')
  const [form, setForm] = useState({ nombre: '', region: 'Ciudad de Panamá' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadCentros() }, [])

  async function loadCentros() {
    setLoading(true)
    const { data } = await supabase.from('centros').select('*, usuarios(count)').order('nombre')
    setCentros(data || [])
    setLoading(false)
  }

  async function saveCentro(e) {
    e.preventDefault()
    if (!form.nombre.trim()) { setStatus('❌ El nombre es requerido.'); return }
    setSaving(true); setStatus('')
    try {
      if (editing) {
        const { error } = await supabase.from('centros').update({ nombre: form.nombre.toUpperCase(), region: form.region }).eq('id', editing)
        if (error) throw error
        setStatus('✅ Centro actualizado.')
      } else {
        const { error } = await supabase.from('centros').insert({ nombre: form.nombre.toUpperCase(), region: form.region })
        if (error) throw error
        setStatus('✅ Centro creado.')
      }
      setShowForm(false); setEditing(null); setForm({ nombre: '', region: 'Ciudad de Panamá' })
      loadCentros()
    } catch (e) { setStatus('❌ Error: ' + e.message) }
    setSaving(false)
  }

  async function deleteCenter(id, nombre) {
    if (!confirm(`¿Eliminar "${nombre}"? Esta acción también eliminará todos sus datos.`)) return
    const { error } = await supabase.from('centros').delete().eq('id', id)
    if (error) { setStatus('❌ Error: ' + error.message); return }
    setStatus('✅ Centro eliminado.')
    loadCentros()
  }

  function editCentro(c) {
    setEditing(c.id); setForm({ nombre: c.nombre, region: c.region || 'Ciudad de Panamá' }); setShowForm(true)
  }

  const A = { blue:'#1B4580', blueMid:'#1D5FA6', green:'#4A8C3F', greenLime:'#B8D432', gray:'#F5F7FA', text:'#1A2744' }

  return (
    <div style={{display:'flex',minHeight:'100vh',background:A.gray}}>
      <Sidebar rol="admin_general"/>
      <main style={{flex:1,padding:28,overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
          <div>
            <h1 style={{fontSize:20,fontWeight:700,color:A.text,marginBottom:4}}>Gestión de centros</h1>
            <p style={{fontSize:12,color:'#8896A9'}}>{centros.length} centros registrados</p>
          </div>
          <button onClick={() => { setEditing(null); setForm({nombre:'',region:'Ciudad de Panamá'}); setShowForm(!showForm) }}
            style={{padding:'9px 20px',background:`linear-gradient(135deg,${A.blue},${A.blueMid})`,color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',boxShadow:'0 4px 12px rgba(27,69,128,0.25)'}}>
            {showForm ? '✕ Cancelar' : '+ Nuevo centro'}
          </button>
        </div>

        {status && <div style={{padding:'10px 16px',borderRadius:8,marginBottom:16,background:status.includes('❌')?'#FBE8E8':'#E6F4EC',color:status.includes('❌')?'#D63C3C':'#2D7D46',fontSize:13,fontWeight:500}}>{status}</div>}

        {showForm && (
          <div style={{background:'#fff',border:'1px solid #E8EBF0',borderRadius:12,padding:24,marginBottom:20,boxShadow:'0 2px 12px rgba(27,69,128,0.08)'}}>
            <h3 style={{fontSize:14,fontWeight:700,color:A.text,marginBottom:20}}>{editing ? 'Editar centro' : 'Crear nuevo centro'}</h3>
            <form onSubmit={saveCentro}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
                <div>
                  <label style={{fontSize:12,color:'#4A5568',fontWeight:600,display:'block',marginBottom:6}}>Nombre del centro *</label>
                  <input value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}
                    placeholder="Ej: BRISAS DEL GOLF"
                    style={{width:'100%',padding:'10px 12px',border:'1.5px solid #E8EBF0',borderRadius:8,fontSize:13,outline:'none',background:'#F5F7FA',boxSizing:'border-box'}}/>
                </div>
                <div>
                  <label style={{fontSize:12,color:'#4A5568',fontWeight:600,display:'block',marginBottom:6}}>Región / Provincia</label>
                  <select value={form.region} onChange={e=>setForm({...form,region:e.target.value})}
                    style={{width:'100%',padding:'10px 12px',border:'1.5px solid #E8EBF0',borderRadius:8,fontSize:13,outline:'none',background:'#F5F7FA'}}>
                    {REGIONES.map(r=><option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
                <button type="button" onClick={()=>setShowForm(false)}
                  style={{padding:'9px 20px',background:'none',border:'1px solid #E8EBF0',borderRadius:8,fontSize:13,cursor:'pointer',color:'#4A5568'}}>Cancelar</button>
                <button type="submit" disabled={saving}
                  style={{padding:'9px 24px',background:`linear-gradient(135deg,${A.blue},${A.blueMid})`,color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',opacity:saving?0.7:1}}>
                  {saving ? 'Guardando...' : (editing ? 'Actualizar' : 'Crear centro')}
                </button>
              </div>
            </form>
          </div>
        )}

        <div style={{background:'#fff',border:'1px solid #E8EBF0',borderRadius:12,overflow:'hidden',boxShadow:'0 2px 12px rgba(27,69,128,0.06)'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead style={{background:`linear-gradient(135deg,${A.blue},${A.blueMid})`}}>
              <tr>{['Centro','Región','Usuarios','Acciones'].map(h=>
                <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.9)',textTransform:'uppercase',letterSpacing:'0.06em'}}>{h}</th>
              )}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{padding:40,textAlign:'center',color:'#8896A9'}}>Cargando...</td></tr>
              ) : centros.map((c,i) => (
                <tr key={c.id} style={{background:i%2===0?'#fff':'#F9FAFC'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#EEF3FB'}
                  onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'#fff':'#F9FAFC'}>
                  <td style={{padding:'13px 16px',borderBottom:'1px solid #F0F2F6'}}>
                    <div style={{fontWeight:600,color:A.text}}>{c.nombre}</div>
                  </td>
                  <td style={{padding:'13px 16px',borderBottom:'1px solid #F0F2F6',color:'#4A5568'}}>{c.region || '—'}</td>
                  <td style={{padding:'13px 16px',borderBottom:'1px solid #F0F2F6'}}>
                    <span style={{background:'#EEF3FB',color:A.blueMid,padding:'2px 10px',borderRadius:12,fontSize:12,fontWeight:600}}>
                      {c.usuarios?.[0]?.count || 0} usuarios
                    </span>
                  </td>
                  <td style={{padding:'13px 16px',borderBottom:'1px solid #F0F2F6'}}>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>editCentro(c)}
                        style={{padding:'5px 14px',border:`1px solid ${A.blueMid}`,borderRadius:6,background:'none',color:A.blueMid,fontSize:12,cursor:'pointer',fontWeight:500}}>
                        Editar
                      </button>
                      <button onClick={()=>deleteCenter(c.id, c.nombre)}
                        style={{padding:'5px 14px',border:'1px solid #D63C3C',borderRadius:6,background:'none',color:'#D63C3C',fontSize:12,cursor:'pointer'}}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && centros.length === 0 && (
                <tr><td colSpan={4} style={{padding:40,textAlign:'center',color:'#8896A9'}}>No hay centros. Crea el primero.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
