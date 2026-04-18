'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Sidebar from '../../components/Sidebar'

export default function PerfilPage() {
  const router = useRouter()
  const [rol, setRol] = useState('')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [centroId, setCentroId] = useState('')
  const [form, setForm] = useState({ actual: '', nueva: '', confirmar: '' })
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setRol(localStorage.getItem('aloha_rol') || '')
    setNombre(localStorage.getItem('aloha_nombre') || '')
    setEmail(localStorage.getItem('aloha_email') || '')
    setCentroId(localStorage.getItem('aloha_centro_id') || '')
  }, [])

  async function cambiarPassword(e) {
    e.preventDefault()
    if (form.nueva.length < 8) { setStatus('❌ La contraseña debe tener al menos 8 caracteres.'); return }
    if (form.nueva !== form.confirmar) { setStatus('❌ Las contraseñas no coinciden.'); return }
    setLoading(true); setStatus('')
    try {
      const { error } = await supabase.auth.updateUser({ password: form.nueva })
      if (error) throw error
      setStatus('✅ Contraseña actualizada exitosamente.')
      setForm({ actual: '', nueva: '', confirmar: '' })
    } catch (err) {
      setStatus('❌ Error: ' + err.message)
    }
    setLoading(false)
  }

  const isAdmin = rol === 'admin_general' || rol === 'supervisor'

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#f5f5f0'}}>
      <Sidebar rol={rol} centroNombre={nombre} centroId={centroId}/>
      <main style={{flex:1,padding:28,maxWidth:600}}>
        <div style={{marginBottom:24}}>
          <h1 style={{fontSize:20,fontWeight:600,marginBottom:4}}>Mi perfil</h1>
          <p style={{fontSize:12,color:'#888'}}>Información de tu cuenta y seguridad</p>
        </div>

        {/* Info de usuario */}
        <div style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:12,padding:24,marginBottom:20}}>
          <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:20}}>
            <div style={{width:56,height:56,borderRadius:28,background:'#EEEDFE',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:700,color:'#533AB7'}}>
              {nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{fontSize:16,fontWeight:600}}>{nombre}</div>
              <div style={{fontSize:12,color:'#888',marginTop:2}}>{email}</div>
              <span style={{fontSize:11,padding:'2px 10px',borderRadius:10,fontWeight:500,marginTop:4,display:'inline-block',
                background:isAdmin?'#EEEDFE':'#E1F5EE',color:isAdmin?'#533AB7':'#0F6E56'}}>
                {isAdmin ? 'Administrador General' : 'Administradora de Centro'}
              </span>
            </div>
          </div>
        </div>

        {/* Cambio de contraseña */}
        <div style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:12,padding:24}}>
          <h3 style={{fontSize:14,fontWeight:600,marginBottom:4}}>Cambiar contraseña</h3>
          <p style={{fontSize:12,color:'#888',marginBottom:20}}>Usa mínimo 8 caracteres. Te recomendamos usar letras, números y símbolos.</p>

          <form onSubmit={cambiarPassword} style={{display:'flex',flexDirection:'column',gap:16}}>
            <div>
              <label style={{fontSize:12,color:'#555',fontWeight:600,display:'block',marginBottom:6}}>Nueva contraseña</label>
              <input type="password" value={form.nueva} onChange={e=>setForm({...form,nueva:e.target.value})}
                placeholder="Mínimo 8 caracteres" required
                style={{width:'100%',padding:'10px 14px',border:'1px solid #e0e0dc',borderRadius:8,fontSize:14,outline:'none',background:'#fafaf8'}}/>
            </div>
            <div>
              <label style={{fontSize:12,color:'#555',fontWeight:600,display:'block',marginBottom:6}}>Confirmar contraseña</label>
              <input type="password" value={form.confirmar} onChange={e=>setForm({...form,confirmar:e.target.value})}
                placeholder="Repite la nueva contraseña" required
                style={{width:'100%',padding:'10px 14px',border:'1px solid #e0e0dc',borderRadius:8,fontSize:14,outline:'none',background:'#fafaf8'}}/>
            </div>

            {form.nueva && form.confirmar && (
              <div style={{padding:'8px 12px',borderRadius:8,fontSize:12,
                background:form.nueva===form.confirmar?'#E1F5EE':'#FAECE7',
                color:form.nueva===form.confirmar?'#0F6E56':'#993C1D'}}>
                {form.nueva===form.confirmar ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
              </div>
            )}

            {status && (
              <div style={{padding:'10px 14px',borderRadius:8,fontSize:13,fontWeight:500,
                background:status.includes('❌')?'#FAECE7':'#E1F5EE',
                color:status.includes('❌')?'#993C1D':'#0F6E56'}}>
                {status}
              </div>
            )}

            <button type="submit" disabled={loading||form.nueva!==form.confirmar||form.nueva.length<8}
              style={{padding:'11px',background:'#533AB7',color:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:500,cursor:'pointer',
                opacity:(loading||form.nueva!==form.confirmar||form.nueva.length<8)?0.5:1}}>
              {loading ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
