function SolicitudesPanel({solicitudes}){

  return(
    <section className="mt-5">
   <div className="d-flex flex-column flex-md-row
           justify-content-between gap-2 mb-3">

    <h2 className="h4 mb-0">
     Solicitudes recientes
    </h2>

    <button className="btn btn-primary">
     Nueva solicitud
    </button>
   </div>

   <div className="row g-2 mb-3">
    <div className="col-12 col-md-8">
     <input
      className="form-control"
      placeholder="Buscar candidato..."
     />
    </div>

    <div className="col-12 col-md-4">
     <select className="form-select">
      <option>Todos los estados</option>
      <option>Pendiente</option>
      <option>En proceso</option>
      <option>Finalizada</option>
     </select>
    </div>
   </div>

   <div className="table-responsive">
    <table className="table table-hover align-middle">
     <thead>
      <tr>
       <th>Candidato</th>
       <th>Cargo</th>
       <th>Estado</th>

       <th className="d-none d-lg-table-cell">
        Responsable
       </th>

      </tr>
     </thead>
    </table>
   </div>
  </section>
  );
}

export default SolicitudesPanel;