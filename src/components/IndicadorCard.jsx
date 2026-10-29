function IndicadorCard({ valor, titulo, color = "azul" }) {
  return (
    <div className="col-12 col-sm-6 col-xl-3">
      <article className={`small-box small-box--${color}`}>
        <p className="small-box__valor" aria-live="polite">{valor}</p>
        <p className="small-box__titulo">{titulo}</p>
      </article>
    </div>
  );
}

export default IndicadorCard;
