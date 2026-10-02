function CandidatoCard({ nombre, cargo, estado }) {
    return (
        <div className="col-md-6 col-lg-4">
            <div className="card h-100">
                <div className="card-body">
                    <h3 className="h5">{nombre}</h3>

                    <p className="text-secondary mb-2">
                        {cargo}
                    </p>

                    <span className="badge text-bg-secondary">
                        {estado}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default CandidatoCard;