'use client'
import { useState, useEffect } from 'react'
import Sidebar from '../../../components/Sidebar'
import { supabase } from '../../../lib/supabase'

const A = { blue:'#1B4580', blueMid:'#1D5FA6', green:'#4A8C3F', gray:'#F5F7FA', text:'#1A2744' }
const ROLES = [ { val:'admin_general', label:'Administrador General' }, { val:'administradora', label:'Usuario Centro' } ]

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([])
  const [centros, setCentros] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState({ nombre:'', email:'', password:'', rol:'administradora', centro_id:'' })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [u, c] = await Promise.all([
      supabase.from('usuarios').select('*, centros(nombre)').order('nombre'),
      supabase.from('centros').select('id, nombre').order('nombre')
    ])
    setUsuarios(u.data || [])
    setCentros(c.data || [])
    setLoading(false)
  }

  async function saveUser(e) {
    e.preventDefault()
    if (!form.nombre.trim() || !form.email.trim()) { setStatus('❌ Nombre y email son requeridos.'); return }
    if (!editing && !form.password.trim()) { setStatus('❌ La contraseña es requerida.'); return }
    setSaving(true); setStatus('')
    try {
      if (editing) {
        const upd = { nombre: form.nombre, rol: form.rol, centro_id: form.rol==='admin_general' ? null : (form.centro_id || null) }
        const { error } = await supabase.from('usuarios').update(upd).eq('id', editing)
        if (error) throw error
        setStatus('✅ Usuario actualizado.')
      } else {
        // Create auth user
        const { data: authData, error: authErr } = await supabase.auth.admin
          ? await supabase.auth.signUp({ email: form.email, password: form.password })
          : await supabase.auth.signUp({ email: form.email, password: form.password })
        if (authErr && !authErr.message.includes('already registered')) throw authErr
        // Insert into usuarios table
        const { error } = await supabase.from('usuarios').insert({
          nombre: form.nombre,
          email: form.email,
          rol: form.rol,
          centro_id: form.rol==='admin_general' ? null : (form.centro_id || null)
        })
        if (error) throw error
        setStatus('✅ Usuario creado. Se enviará email de confirmación.')
      }
      setShowForm(false); setEditing(null)
      setForm({ nombre:'', email:'', password:'', rol:'administradora', centro_id:'' })
      loadData()
    } catch(e) { setStatus('❌ Error: ' + e.message) }
    setSaving(false)
  }

  async function deleteUser(id, nombre) {
    if (!confirm(`¿Eliminar usuario "${nombre}"? Esta acción no se puede deshacer.`)) return
    setDeleting(id); setStatus('')
    try {
      const { error } = await supabase.from('usuarios').delete().eq('id', id)
      if (error) throw error
      setStatus(`✅ Usuario "${nombre}" eliminado.`)
      loadData()
    } catch(e) { setStatus('❌ Error: ' + e.message) }
    setDeleting(null)
  }

  function editUser(u) {
    setEditing(u.id)
    setForm({ nombre: u.nombre, email: u.email, password:'', rol: u.rol, centro_id: u.centro_id || '' })
    setShowForm(true)
  }

  const rolLabel = r => ROLES.find(x=>x.val===r)?.label || r

  return (
    <div style={{display:'flex',minHeight:'100vh',background:A.gray}}>
      <Sidebar rol="admin_general"/>
      <main style={{flex:1,padding:28,overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
          <div>
            <h1 style={{fontSize:20,fontWeight:700,color:A.text,marginBottom:4}}>Gestión de usuarios</h1>
            <p style={{fontSize:12,color:'#8896A9'}}>{usuarios.length} usuarios registrados</p>
          </div>
          <button onClick={()=>{ setEditing(null); setForm({nombre:'',email:'',password:'',rol:'administradora',centro_id:''}); setShowForm(!showForm) }}
            style={{padding:'9px 20px',background:`linear-gradient(135deg,${A.blue},${A.blueMid})`,color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',boxShadow:'0 4px 12px rgba(27,69,128,0.25)'}}>
            {showForm ? '✕ Cancelar' : '+ Nuevo usuario'}
          </button>
        </div>

        {status && (
          <div style={{padding:'10px 16px',borderRadius:8,marginBottom:16,background:status.includes('❌')?'#FBE8E8':'#E6F4EC',color:status.includes('❌')?'#D63C3C':'#2D7D46',fontSize:13,fontWeight:500}}>
            {status}
          </div>
        )}

        {showForm && (
          <div style={{background:'#fff',border:'1px solid #E8EBF0',borderRadius:12,padding:24,marginBottom:20,boxShadow:'0 2px 12px rgba(27,69,128,0.08)'}}>
            <h3 style={{fontSize:14,fontWeight:700,color:A.text,marginBottom:20}}>{editing ? 'Editar usuario' : 'Crear nuevo usuario'}</h3>
            <form onSubmit={saveUser}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
                {[['Nombre completo *','nombre','text','Ej: Laura Méndez'],['Correo electrónico *','email','email','usuario@ejemplo.com']].map(([label,key,type,ph])=>(
                  <div key={key}>
                    <label style={{fontSize:12,color:'#4A5568',fontWeight:600,display:'block',marginBottom:6}}>{label}</label>
                    <input type={type} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}
                      placeholder={ph} disabled={editing && key==='email'}
                      style={{width:'100%',padding:'10px 12px',border:'1.5px solid #E8EBF0',borderRadius:8,fontSize:13,background:editing&&key==='email'?'#F0F0F0':'#F5F7FA',boxSizing:'border-box'}}/>
                  </div>
                ))}
                {!editing && (
                  <div>
                    <label style={{fontSize:12,color:'#4A5568',fontWeight:600,display:'block',marginBottom:6}}>Contraseña *</label>
                    <input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}
                      placeholder="Mínimo 6 caracteres"
                      style={{width:'100%',padding:'10px 12px',border:'1.5px solid #E8EBF0',borderRadius:8,fontSize:13,background:'#F5F7FA',boxSizing:'border-box'}}/>
                  </div>
                )}
                <div>
                  <label style={{fontSize:12,color:'#4A5568',fontWeight:600,display:'block',marginBottom:6}}>Rol</label>
                  <select value={form.rol} onChange={e=>setForm({...form,rol:e.target.value,centro_id:''})}
                    style={{width:'100%',padding:'10px 12px',border:'1.5px solid #E8EBF0',borderRadius:8,fontSize:13,background:'#F5F7FA'}}>
                    {ROLES.map(r=><option key={r.val} value={r.val}>{r.label}</option>)}
                  </select>
                </div>
                {form.rol !== 'admin_general' && (
                  <div>
                    <label style={{fontSize:12,color:'#4A5568',fontWeight:600,display:'block',marginBottom:6}}>Centro asignado</label>
                    <select value={form.centro_id} onChange={e=>setForm({...form,centro_id:e.target.value})}
                      style={{width:'100%',padding:'10px 12px',border:'1.5px solid #E8EBF0',borderRadius:8,fontSize:13,background:'#F5F7FA'}}>
                      <option value="">— Sin asignar —</option>
                      {centros.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
                <button type="button" onClick={()=>setShowForm(false)}
                  style={{padding:'9px 20px',background:'none',border:'1px solid #E8EBF0',borderRadius:8,fontSize:13,cursor:'pointer',color:'#4A5568'}}>Cancelar</button>
                <button type="submit" disabled={saving}
                  style={{padding:'9px 24px',background:`linear-gradient(135deg,${A.blue},${A.blueMid})`,color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',opacity:saving?0.7:1}}>
                  {saving ? 'Guardando...' : (editing ? 'Actualizar' : 'Crear usuario')}
                </button>
              </div>
            </form>
          </div>
        )}

        <div style={{background:'#fff',border:'1px solid #E8EBF0',borderRadius:12,overflow:'hidden',boxShadow:'0 2px 12px rgba(27,69,128,0.06)'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead style={{background:`linear-gradient(135deg,${A.blue},${A.blueMid})`}}>
              <tr>{['Nombre','Correo','Rol','Centro asignado','Acciones'].map(h=>
                <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.9)',textTransform:'uppercase',letterSpacing:'0.06em'}}>{h}</th>
              )}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{padding:40,textAlign:'center',color:'#8896A9'}}>Cargando...</td></tr>
              ) : usuarios.map((u,i)=>(
                <tr key={u.id} style={{background:i%2===0?'#fff':'#F9FAFC'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#EEF3FB'}
                  onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'#fff':'#F9FAFC'}>
                  <td style={{padding:'13px 16px',borderBottom:'1px solid #F0F2F6',fontWeight:600,color:A.text}}>{u.nombre}</td>
                  <td style={{padding:'13px 16px',borderBottom:'1px solid #F0F2F6',color:'#4A5568',fontSize:12}}>{u.email}</td>
                  <td style={{padding:'13px 16px',borderBottom:'1px solid #F0F2F6'}}>
                    <span style={{padding:'2px 10px',borderRadius:12,fontSize:11,fontWeight:700,
                      background:u.rol==='admin_general'?'#E8F4FF':'#E8F5E9',
                      color:u.rol==='admin_general'?A.blueMid:A.green}}>
                      {u.rol==='admin_general'?'Administrador':'Usuario Centro'}
                    </span>
                  </td>
                  <td style={{padding:'13px 16px',borderBottom:'1px solid #F0F2F6',color:'#4A5568',fontSize:12}}>
                    {u.centros?.nombre || (u.rol==='admin_general' ? <span style={{color:'#8896A9',fontStyle:'italic'}}>Todos los centros</span> : <span style={{color:'#8896A9',fontStyle:'italic'}}>Sin asignar</span>)}
                  </td>
                  <td style={{padding:'13px 16px',borderBottom:'1px solid #F0F2F6'}}>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>editUser(u)}
                        style={{padding:'5px 14px',border:`1px solid ${A.blueMid}`,borderRadius:6,background:'none',color:A.blueMid,fontSize:12,cursor:'pointer'}}>
                        Editar
                      </button>
                      {u.rol !== 'admin_general' && (
                        <button onClick={()=>deleteUser(u.id, u.nombre)} disabled={deleting===u.id}
                          style={{padding:'5px 14px',border:'1px solid #D63C3C',borderRadius:6,background:'none',color:'#D63C3C',fontSize:12,cursor:deleting===u.id?'wait':'pointer',opacity:deleting===u.id?0.6:1}}>
                          {deleting===u.id ? 'Eliminando...' : 'Eliminar'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && usuarios.length===0 && (
                <tr><td colSpan={5} style={{padding:40,textAlign:'center',color:'#8896A9'}}>No hay usuarios.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
