function claseEstado(estado) {
  switch (estado) {
    case "Pendiente":
      return "text-bg-warning";
    case "En proceso":
      return "text-bg-primary";
    case "Finalizada":
      return "text-bg-success";
    default:
      return "text-bg-secondary";
  }
}

function CandidatoCard({ nombre, cargo, estado }) {
  return (
    <div className="col-12 col-md-6 col-xl-3">
      <article className="card h-100 shadow-sm">
        <div className="card-body">
          <h3 className="h5">{nombre}</h3>
          <p className="text-secondary mb-3">{cargo}</p>
          <span className={`badge ${claseEstado(estado)}`}>{estado}</span>
        </div>
      </article>
    </div>
  );
}

export default CandidatoCard;
