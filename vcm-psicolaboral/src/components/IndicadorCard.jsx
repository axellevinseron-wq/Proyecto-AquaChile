function IndicadorCard({ valor, titulo }) {
  return (
    <div className="col-12 col-sm-6 col-xl-3">
      <article className="card h-100 shadow-sm">
        <div className="card-body">
          <p className="text-secondary mb-2">{titulo}</p>
          <p className="display-6 fw-semibold mb-0" aria-live="polite">{valor}</p>
        </div>
      </article>
    </div>
  );
}

export default IndicadorCard;
