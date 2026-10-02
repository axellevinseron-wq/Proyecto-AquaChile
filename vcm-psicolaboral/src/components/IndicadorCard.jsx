function IndicadorCard({valor, titulo}){
  return(
    <div className="col-12 col-md-6 col-xl-4">
      <div className="card h-100">
        <div className="card-body">

          <h2 className="h2">{valor}</h2>

          <p className="mb-0">{titulo}</p>

        </div>
      </div>
    </div>
  );
}
export default IndicadorCard;