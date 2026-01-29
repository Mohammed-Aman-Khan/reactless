/* @reactless */
function OptimizedRow({ id, label }: { id: number; label: string }) {
  return (
    <div className="tr">
      <div className="td">{id}</div>
      <div className="td">{label}</div>
      <div className="td">
        <span className="icon">⚡</span>
      </div>
    </div>
  );
}

export default function OptimizedTable({ data }: { data: any[] }) {
  return (
    <div className="table-container">
      <h3>Reactless Optimized</h3>
      <div className="table">
        <div className="tbody">
          {data.map(item => (
            <OptimizedRow key={item.id} id={item.id} label={item.label} />
          ))}
        </div>
      </div>
    </div>
  );
}
