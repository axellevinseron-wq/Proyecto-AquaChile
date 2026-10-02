import IndicadorCard from "../components/IndicadorCard";
import CandidatoCard from "../components/CandidatoCard";

function DashboardPage(){
    const indicadores = [
        {id: 1, valor: 10, titulo: "Candidatos"},
        {id: 2, valor: 5, titulo: "Pendiente"},
        {id: 3, valor: 4, titulo: "En Proceso"},
        {id: 4, valor: 8, titulo: "Finalizadas"},
    ];

    const candidatos = [
        {
            id: 1,
            nombre: "Ana Torres",
            cargo: "Analista",
            estado: "Pendiente"
        },
        {
            id: 2,
            nombre: "Diego Soto",
            cargo: "Supervisor",
            estado: "En Proceso"
        },
        {
            id: 3,
            nombre: "Camila Rojas",
            cargo: "Operador",
            estado: "Finalizada"
        }
    ];

    return (
        <main className="container py-4">
            <section className="mb-4">
                <p className="text-secondary mb-1">
                    Proyecto VCM - FULLSTACK II
                </p>
                <h1 className="h3">Dashboard</h1>
            </section>

            <section className="row g-3 mb-5">
                {indicadores.map((indicador) => (
                    <IndicadorCard
                    key={indicador.id}
                    valor={indicador.valor}
                    titulo={indicador.titulo}
                    />
                ))}
            </section>

            <section>
                <h2 className="h4 mb-3">
                    Candidatos Recientes
                </h2>

                <div className="row g-3">
                    {candidatos.map((candidato) =>(
                        <CandidatoCard
                        key={candidato.id}
                        nombre={candidato.nombre}
                        cargo={candidato.cargo}
                        estado={candidato.estado}
                        />
                    ))}
                </div>
            </section>
        </main>
    );
}

export default DashboardPage;