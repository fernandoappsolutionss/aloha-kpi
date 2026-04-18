'use client'
import { useState, useEffect } from 'react'
import Sidebar from '../../../components/Sidebar'
import { supabase } from '../../../lib/supabase'

// Roles: admin_general = ve todo | administradora = ve solo su centro
const ROLES = [
  { v:'admin_general', l:'Administrador', desc:'Acceso completo a todos los centros' },
  { v:'administradora', l:'Usuario de Centro', desc:'Solo ve su centro asignado' }
]

const A = { blue:'#1B4580', blueMid:'#1D5FA6', green:'#4A8C3F', greenLime:'#B8D432', gray:'#F5F7FA', text:'#1A2744' }

const ROL_BADGE = {
  admin_general: { bg:'#EEF3FB', color:'#1D5FA6', label:'Administrador' },
  supervisor:    { bg:'#FEF3CD', color:'#D97706', label:'Supervisor' },
  administradora:{ bg:'#E6F4EC', color:'#2D7D46', label:'Usuario Centro' }
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([])
  const [centros, setCentros] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [status, setStatus] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [form, setForm] = useState({ nombre:'', email:'', password:'', rol:'administradora', centro_id:'' })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [{ data: users }, { data: cts }] = await Promise.all([
      supabase.from('usuarios').select('*, centros(nombre)').order('nombre'),
      supabase.from('centros').select('id, nombre').order('nombre')
    ])
    setUsuarios(users || [])
    setCentros(cts || [])
    setLoading(false)
  }

  async function saveUser(e) {
    e.preventDefault()
    if (!form.nombre || !form.email) { setStatus('❌ Completa nombre y correo.'); return }
    if (!editingUser && !form.password) { setStatus('❌ La contraseña es requerida.'); return }
    if (form.rol === 'administradora' && !form.centro_id) { setStatus('❌ Selecciona un centro para el usuario.'); return }
    setCreating(true); setStatus('')
    try {
      if (editingUser) {
        // Update existing user
        const updates = { nombre: form.nombre, rol: form.rol, centro_id: form.centro_id || null }
        const { error } = await supabase.from('usuarios').update(updates).eq('email', editingUser.email)
        if (error) throw error
        setStatus('✅ Usuario ' + form.nombre + ' actualizado.')
      } else {
        // Create new auth user via signUp
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: form.email, password: form.password,
          options: { data: { nombre: form.nombre } }
        })
        if (authError) throw authError
        const { error: userError } = await supabase.from('usuarios').upsert({
          email: form.email, nombre: form.nombre, rol: form.rol,
          centro_id: form.centro_id || null
        })
        if (userError) throw userError
        setStatus('✅ Usuario ' + form.nombre + ' creado. Se enviará un correo de confirmación.')
      }
      setForm({ nombre:'', email:'', password:'', rol:'administradora', centro_id:'' })
      setShowForm(false); setEditingUser(null)
      loadData()
    } catch (e) { setStatus('❌ Error: ' + (e.message || JSON.stringify(e))) }
    setCreating(false)
  }

  async function deleteUser(email, nombre) {
    if (!confirm('¿Eliminar a ' + nombre + '? Esta acción no se puede deshacer.')) return
    const { error } = await supabase.from('usuarios').delete().eq('email', email)
    if (error) { setStatus('❌ Error: ' + error.message); return }
    setStatus('✅ ' + nombre + ' eliminado.')
    loadData()
  }

  function startEdit(u) {
    setEditingUser(u)
    setForm({ nombre: u.nombre, email: u.email, password: '', rol: u.rol, centro_id: u.centro_id || '' })
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false); setEditingUser(null)
    setForm({ nombre:'', email:'', password:'', rol:'administradora', centro_id:'' })
  }

  return (
    <div style={{display:'flex',minHeight:'100vh',background:A.gray}}>
      <Sidebar rol="admin_general"/>
      <main style={{flex:1,padding:28,overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
          <div>
            <h1 style={{fontSize:20,fontWeight:700,color:A.text,marginBottom:4}}>Gestión de usuarios</h1>
            <p style={{fontSize:12,color:'#8896A9'}}>{usuarios.length} usuarios registrados</p>
          </div>
          <button onClick={() => { cancelForm(); setShowForm(!showForm) }}
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
            <h3 style={{fontSize:14,fontWeight:700,color:A.text,marginBottom:6}}>{editingUser ? 'Editar usuario' : 'Crear nuevo usuario'}</h3>
            <p style={{fontSize:12,color:'#8896A9',marginBottom:20}}>
              <strong>Administrador</strong> — acceso completo a todos los centros · <strong>Usuario de Centro</strong> — solo ve su centro
            </p>
            <form onSubmit={saveUser}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
                <div>
                  <label style={{fontSize:12,color:'#4A5568',fontWeight:600,display:'block',marginBottom:6}}>Nombre completo *</label>
                  <input value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}
                    placeholder="Ej: Laura Martínez"
                    style={{width:'100%',padding:'10px 12px',border:'1.5px solid #E8EBF0',borderRadius:8,fontSize:13,outline:'none',background:'#F5F7FA',boxSizing:'border-box'}}/>
                </div>
                <div>
                  <label style={{fontSize:12,color:'#4A5568',fontWeight:600,display:'block',marginBottom:6}}>Correo electrónico *</label>
                  <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}
                    disabled={!!editingUser}
                    placeholder="correo@aloha.com"
                    style={{width:'100%',padding:'10px 12px',border:'1.5px solid #E8EBF0',borderRadius:8,fontSize:13,outline:'none',background:editingUser?'#F0F2F6':'#F5F7FA',boxSizing:'border-box',cursor:editingUser?'not-allowed':'text'}}/>
                </div>
                {!editingUser && (
                  <div>
                    <label style={{fontSize:12,color:'#4A5568',fontWeight:600,display:'block',marginBottom:6}}>Contraseña inicial *</label>
                    <input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}
                      placeholder="Mínimo 8 caracteres"
                      style={{width:'100%',padding:'10px 12px',border:'1.5px solid #E8EBF0',borderRadius:8,fontSize:13,outline:'none',background:'#F5F7FA',boxSizing:'border-box'}}/>
                  </div>
                )}
                <div>
                  <label style={{fontSize:12,color:'#4A5568',fontWeight:600,display:'block',marginBottom:6}}>Rol de acceso *</label>
                  <select value={form.rol} onChange={e=>setForm({...form,rol:e.target.value})}
                    style={{width:'100%',padding:'10px 12px',border:'1.5px solid #E8EBF0',borderRadius:8,fontSize:13,outline:'none',background:'#F5F7FA'}}>
                    {ROLES.map(r=><option key={r.v} value={r.v}>{r.l} — {r.desc}</option>)}
                  </select>
                </div>
                {form.rol === 'administradora' && (
                  <div style={{gridColumn:'span 2'}}>
                    <label style={{fontSize:12,color:'#4A5568',fontWeight:600,display:'block',marginBottom:6}}>Centro asignado *</label>
                    <select value={form.centro_id} onChange={e=>setForm({...form,centro_id:e.target.value})}
                      style={{width:'100%',padding:'10px 12px',border:'1.5px solid #E8EBF0',borderRadius:8,fontSize:13,outline:'none',background:'#F5F7FA'}}>
                      <option value="">— Selecciona un centro —</option>
                      {centros.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
                <button type="button" onClick={cancelForm}
                  style={{padding:'9px 20px',background:'none',border:'1px solid #E8EBF0',borderRadius:8,fontSize:13,cursor:'pointer',color:'#4A5568'}}>Cancelar</button>
                <button type="submit" disabled={creating}
                  style={{padding:'9px 24px',background:`linear-gradient(135deg,${A.blue},${A.blueMid})`,color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',opacity:creating?0.7:1}}>
                  {creating ? 'Guardando...' : (editingUser ? 'Actualizar' : 'Crear usuario')}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div style={{padding:40,textAlign:'center',color:'#8896A9'}}>Cargando...</div>
        ) : (
          <div style={{background:'#fff',border:'1px solid #E8EBF0',borderRadius:12,overflow:'hidden',boxShadow:'0 2px 12px rgba(27,69,128,0.06)'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead style={{background:`linear-gradient(135deg,${A.blue},${A.blueMid})`}}>
                <tr>{['Nombre','Correo','Rol','Centro asignado','Acciones'].map(h=>
                  <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.9)',textTransform:'uppercase',letterSpacing:'0.06em'}}>{h}</th>
                )}</tr>
              </thead>
              <tbody>
                {usuarios.map((u,i)=>(
                  <tr key={i} style={{background:i%2===0?'#fff':'#F9FAFC'}}
                    onMouseEnter={e=>e.currentTarget.style.background='#EEF3FB'}
                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'#fff':'#F9FAFC'}>
                    <td style={{padding:'12px 16px',borderBottom:'1px solid #F0F2F6',fontWeight:600,color:A.text}}>{u.nombre}</td>
                    <td style={{padding:'12px 16px',borderBottom:'1px solid #F0F2F6',color:'#4A5568',fontSize:12}}>{u.email}</td>
                    <td style={{padding:'12px 16px',borderBottom:'1px solid #F0F2F6'}}>
                      <span style={{fontSize:11,padding:'3px 10px',borderRadius:12,fontWeight:600,...(ROL_BADGE[u.rol]||{})}}>
                        {ROL_BADGE[u.rol]?.label || u.rol}
                      </span>
                    </td>
                    <td style={{padding:'12px 16px',borderBottom:'1px solid #F0F2F6',color:u.centros?.nombre?A.text:'#B0BAC9',fontSize:12}}>
                      {u.centros?.nombre || (u.rol==='admin_general'?'Todos los centros':'—')}
                    </td>
                    <td style={{padding:'12px 16px',borderBottom:'1px solid #F0F2F6'}}>
                      <div style={{display:'flex',gap:8}}>
                        <button onClick={()=>startEdit(u)}
                          style={{padding:'5px 12px',border:`1px solid ${A.blueMid}`,borderRadius:6,background:'none',color:A.blueMid,fontSize:12,cursor:'pointer',fontWeight:500}}>
                          Editar
                        </button>
                        {u.email !== 'fperez@teamsolutionss.com' && (
                          <button onClick={()=>deleteUser(u.email, u.nombre)}
                            style={{padding:'5px 12px',border:'1px solid #D63C3C',borderRadius:6,background:'none',color:'#D63C3C',fontSize:12,cursor:'pointer'}}>
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
