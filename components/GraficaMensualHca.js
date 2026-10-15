'use client'
import { useMemo } from 'react'
import GraficaHca from './GraficaHca'
import { puntosMensuales } from '../lib/grafica-mensual-hca.mjs'

export default function GraficaMensualHca({ centroId, campo, rows, todas, meta, ...props }) {
  const puntos = useMemo(() => puntosMensuales(rows, campo, meta), [rows, campo, meta])
  // La sugerencia permanece estable al alternar los rangos de 3 y 12 meses.
  const baseEscala = useMemo(() => puntosMensuales(todas.slice(-12), campo, meta), [todas, campo, meta])
  return <GraficaHca {...props} puntos={puntos} baseEscala={baseEscala} storageKey={`aloha:escala-hca:${centroId}:${campo}`}/>
}
