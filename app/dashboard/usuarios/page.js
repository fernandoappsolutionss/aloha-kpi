'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../../components/Sidebar'
import { supabase } from '../../../lib/supabase'

const CENTROS = ['BRISAS DEL GOLF','ANCLAS MALL','CALLE 50','COSTA DEL ESTE','CONDADO DEL REY','DAVID','AGUADULCE','SANTIAGO','CHITRE']
const ROLES = [{v:'administradora',l:'Administradora de Centro'},{v:'supervisor',l:'Supervisor Regional'},{v:'admin_general',l:'Administrador General'}]

export default function UsuariosPage() {
  const router = useRouter()
  const [usuarios, setUsuarios] = useState([])
  const [centros, setCentros] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [status, setStatus] = useState('')
  const [showForm, setShowForm] = useState(false)
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

  async function createUser(e) {
    e.preventDefault()
    if (!form.nombre || !form.email || !form.password) { setStatus('❌ Completa todos los campos.'); return }
    setCreating(true); setStatus('')
    try {
      // Create auth user via Supabase Admin API using service role
      // We use signUp which works with anon key + email confirmation disabled
      const { data: authData, error: authError } = await supabase.auth.admin 
        ? await supabase.auth.admin.createUser({ email: form.email, password: form.password, email_confirm: true, user_metadata: { nombre: form.nombre } })
        : await supabase.auth.signUp({ email: form.email, password: form.password })
      
      if (authError) throw authError

      // Insert into usuarios table
      const { error: userError } = await supabase.from('usuarios').insert({
        email: form.email,
        nombre: form.nombre,
        rol: form.rol,
        centro_id: form.centro_id || null
      })
      if (userError) throw userError

      setStatus('✅ Usuario ' + form.nombre + ' creado exitosamente.')
      setForm({ nombre:'', email:'', password:'', rol:'administradora', centro_id:'' })
      setShowForm(false)
      loadData()
    } catch (e) {
      setStatus('❌ Error: ' + (e.message || JSON.stringify(e)))
    }
    setCreating(false)
  }

  async function deleteUser(email, nombre) {
    if (!confirm('¿Eliminar a ' + nombre + '? Esta acción no se puede deshacer.')) return
    const { error } = await supabase.from('usuarios').delete().eq('email', email)
    if (error) { setStatus('❌ Error eliminando: ' + error.message); return }
    setStatus('✅ Usuario ' + nombre + ' eliminado.')
    loadData()
  }

  const ROL_LABELS = { admin_general: 'Admin General', supervisor: 'Supervisor', administradora: 'Administradora' }
  const ROL_COLORS = { admin_general: {bg:'#EEEDFE',color:'#533AB7'}, supervisor: {bg:'#FAEEDA',color:'#854F0B'}, administradora: {bg:'#E1F5EE',color:'#0F6E56'} }

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#f5f5f0'}}>
      <Sidebar rol="admin_general"/>
      <main style={{flex:1,padding:28,overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
          <div>
            <h1 style={{fontSize:20,fontWeight:600,marginBottom:4}}>Usuarios y centros</h1>
            <p style={{fontSize:12,color:'#888'}}>{usuarios.length} usuarios registrados</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            style={{padding:'9px 20px',background:'#533AB7',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer'}}>
            {showForm ? '✕ Cancelar' : '+ Nuevo usuario'}
          </button>
        </div>

        {status && (
          <div style={{padding:'10px 16px',borderRadius:8,marginBottom:16,background:status.includes('❌')?'#FAECE7':'#E1F5EE',color:status.includes('❌')?'#993C1D':'#0F6E56',fontSize:13,fontWeight:500}}>
            {status}
          </div>
        )}

        {showForm && (
          <div style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:12,padding:24,marginBottom:20}}>
            <h3 style={{fontSize:14,fontWeight:600,marginBottom:20,color:'#444'}}>Crear nuevo usuario</h3>
            <form onSubmit={createUser}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
                <div>
                  <label style={{fontSize:12,color:'#666',display:'block',marginBottom:6,fontWeight:500}}>Nombre completo *</label>
                  <input value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}
                    placeholder="Ej: Laura Martínez"
                    style={{width:'100%',padding:'9px 12px',border:'0.5px solid #e0e0dc',borderRadius:8,fontSize:13,outline:'none',background:'#fafaf8'}}/>
                </div>
                <div>
                  <label style={{fontSize:12,color:'#666',display:'block',marginBottom:6,fontWeight:500}}>Correo electrónico *</label>
                  <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}
                    placeholder="Ej: laura@aloha.com"
                    style={{width:'100%',padding:'9px 12px',border:'0.5px solid #e0e0dc',borderRadius:8,fontSize:13,outline:'none',background:'#fafaf8'}}/>
                </div>
                <div>
                  <label style={{fontSize:12,color:'#666',display:'block',marginBottom:6,fontWeight:500}}>Contraseña inicial *</label>
                  <input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}
                    placeholder="Mínimo 8 caracteres"
                    style={{width:'100%',padding:'9px 12px',border:'0.5px solid #e0e0dc',borderRadius:8,fontSize:13,outline:'none',background:'#fafaf8'}}/>
                </div>
                <div>
                  <label style={{fontSize:12,color:'#666',display:'block',marginBottom:6,fontWeight:500}}>Rol *</label>
                  <select value={form.rol} onChange={e=>setForm({...form,rol:e.target.value})}
                    style={{width:'100%',padding:'9px 12px',border:'0.5px solid #e0e0dc',borderRadius:8,fontSize:13,outline:'none',background:'#fafaf8'}}>
                    {ROLES.map(r=><option key={r.v} value={r.v}>{r.l}</option>)}
                  </select>
                </div>
                {form.rol === 'administradora' && (
                  <div style={{gridColumn:'span 2'}}>
                    <label style={{fontSize:12,color:'#666',display:'block',marginBottom:6,fontWeight:500}}>Centro asignado *</label>
                    <select value={form.centro_id} onChange={e=>setForm({...form,centro_id:e.target.value})}
                      style={{width:'100%',padding:'9px 12px',border:'0.5px solid #e0e0dc',borderRadius:8,fontSize:13,outline:'none',background:'#fafaf8'}}>
                      <option value="">— Selecciona un centro —</option>
                      {centros.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
                <button type="button" onClick={()=>setShowForm(false)}
                  style={{padding:'9px 20px',background:'none',border:'0.5px solid #ddd',borderRadius:8,fontSize:13,cursor:'pointer',color:'#666'}}>
                  Cancelar
                </button>
                <button type="submit" disabled={creating}
                  style={{padding:'9px 24px',background:'#533AB7',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer',opacity:creating?0.7:1}}>
                  {creating ? 'Creando...' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div style={{padding:40,textAlign:'center',color:'#888'}}>Cargando usuarios...</div>
        ) : (
          <div style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:12,padding:20}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead>
                <tr>{['Nombre','Correo','Rol','Centro','Acciones'].map(h=>
                  <th key={h} style={{padding:'8px 14px',textAlign:'left',fontSize:11,fontWeight:600,color:'#888',borderBottom:'0.5px solid #e8e8e4',textTransform:'uppercase',letterSpacing:'0.04em'}}>{h}</th>
                )}</tr>
              </thead>
              <tbody>
                {usuarios.map((u,i)=>(
                  <tr key={i} onMouseEnter={e=>e.currentTarget.style.background='#fafaf8'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'12px 14px',borderBottom:'0.5px solid #f5f5f2',fontWeight:500}}>{u.nombre}</td>
                    <td style={{padding:'12px 14px',borderBottom:'0.5px solid #f5f5f2',color:'#666'}}>{u.email}</td>
                    <td style={{padding:'12px 14px',borderBottom:'0.5px solid #f5f5f2'}}>
                      <span style={{fontSize:11,padding:'3px 10px',borderRadius:10,fontWeight:500,...(ROL_COLORS[u.rol]||{})}}>
                        {ROL_LABELS[u.rol] || u.rol}
                      </span>
                    </td>
                    <td style={{padding:'12px 14px',borderBottom:'0.5px solid #f5f5f2',color:u.centros?.nombre?'#333':'#bbb'}}>
                      {u.centros?.nombre || (u.rol==='admin_general'?'Todos los centros':'—')}
                    </td>
                    <td style={{padding:'12px 14px',borderBottom:'0.5px solid #f5f5f2'}}>
                      {u.email !== 'fperez@teamsolutionss.com' && (
                        <button onClick={()=>deleteUser(u.email, u.nombre)}
                          style={{padding:'4px 12px',border:'0.5px solid #F0997B',borderRadius:6,background:'none',color:'#993C1D',fontSize:11,cursor:'pointer'}}>
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {usuarios.length === 0 && (
              <div style={{textAlign:'center',padding:40,color:'#bbb',fontSize:13}}>
                No hay usuarios registrados aún. Crea el primero.
              </div>
            )}
          </div>
        )}

        <div style={{background:'#EEEDFE',borderRadius:10,padding:'14px 18px',marginTop:20,fontSize:12,color:'#533AB7',lineHeight:1.7}}>
          <strong>Instrucciones:</strong> Al crear un usuario, recibirá su correo y contraseña para acceder al sistema. 
          Las administradoras de centro solo verán los datos de su propio centro. 
          Los supervisores y administradores generales tienen acceso a todos los centros.
        </div>
      </main>
    </div>
  )
}
