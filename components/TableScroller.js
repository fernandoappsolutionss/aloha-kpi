export default function TableScroller({ label, stickyFirstColumn = false, children }) {
  return (
    <div className={`table-scroller${stickyFirstColumn ? ' table-scroller--sticky' : ''}`}
      role="region" aria-label={label} tabIndex={0} data-horizontal-scroll="">
      <p className="table-scroller__hint">Desliza para comparar →</p>
      <div className="table-scroller__viewport">{children}</div>
    </div>
  )
}
