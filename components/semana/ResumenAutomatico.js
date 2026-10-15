const mostrar = valor => valor == null ? 'No disponible' : Number(valor).toLocaleString('es-PA')

export default function ResumenAutomatico({ datos }) {
  return <section className="panel semana-resultados" id="resultados-mes" data-tour="ruta.resultados" aria-labelledby="resultados-mes-title">
    <div className="panel__head"><div><p className="label">Actualización automática · {datos.fechaDatos}</p><h2 id="resultados-mes-title" className="panel__title">Resultados del mes · {datos.fechaDatos?.slice(0, 7)}</h2></div></div>
    <p className="h-sub">Del día 1 al {datos.fechaDatos}. Inscritos, retiros y asistencias del mes calendario; activos y facturas vencidas al corte. Se cargan desde los registros del centro, Clases de Prueba y Zoho.</p>
    <dl className="semana-resultados__grid">{datos.catalogo.map(meta => {
      const resultado = datos.resultadosMes?.[meta.codigo]
      return <div key={meta.codigo}><dt>{meta.codigo === 'ninos_activos' ? 'Niños activos al día' : meta.nombre}</dt><dd className="num">{mostrar(resultado?.valor)}</dd>
        {resultado?.detalle?.error && <p className="h-sub">{resultado.detalle.error}</p>}
        {resultado?.detalle?.aviso && <p className="h-sub">{resultado.detalle.aviso}</p>}
      </div>
    })}</dl>
    <p className="h-sub">Las metas y cuotas se pueden ajustar dentro del plan de batalla.</p>
  </section>
}
