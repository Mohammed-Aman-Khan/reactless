// Standard React Table (Flex-based)
interface Item {
  id: number;
  label: string;
}

export default function StandardTable({ data }: { data: Item[] }) {
  return (
    <div className="table-container">
      <h3>Standard React</h3>
      <div className="table">
        <div className="tbody">
          {data.map(item => (
            <div className="tr" key={item.id}>
              <div className="td">{item.id}</div>
              <div className="td">{item.label}</div>
              <div className="td">
                <span className="icon">⚛️</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
