import IndicadorCard from "../components/IndicadorCard";
import CandidatoCard from "../components/CandidatoCard";
import SolicitudesPanel from "../components/SolicitudesPanel";

function DashboardPage(){

  const indicadores = [

    {id:1, valor: 12, titulo:"candidato"},

    {id:2, valor: 5, titulo:"Pendiente"},

    {id:3, valor: 4, titulo:"En proceso"},

    {id:4, valor: 3, titulo:"Finalizado"}

  ];

  const candidatos =[

    {id:1, nombre: "Diego Diaz", cargo:"Analista Informatico", estado:"Pendiente"},

    {id:2, nombre: "Felipe Barra", cargo:"Analista de datos", estado:"En proceso"},

    {id:3, nombre: "Zonjge wue", cargo:"CEO AquaChile", estado:"Finalizado"},

    {id:4, nombre: "Camilo", cargo:"experto en Excel", estado:"Finalizado"}

  ];

  const solicitudes= [

    {
      id: 1,
      candidato: "Ana Torres",
      cargo: "Analista",
      estado: "Pendiente",
      responsable: "Laura Pérez"
    },
    {
      id: 2,
      candidato: "Diego Soto",
      cargo: "Supervisor",
      estado: "En proceso",
      responsable: "Carlos Díaz"
    },
    {
      id: 3,
      candidato: "Camila Rojas",
      cargo: "Operador",
      estado: "Finalizada",
      responsable: "Laura Pérez"
    }
  ];

  return(

    <main className="container py-4">
      <section className="mb-4">
        <p className="text-secondary mb-1">Proyecto VCM FULL STACK II</p>
        <h1 className="h3">Dashboard</h1>
      </section>

      <section className="row g-3 mb-5">
        {indicadores.map((indicador)=>(
          <IndicadorCard
            key={indicador.id}
            valor={indicador.valor}
            titulo={indicador.titulo}
          />
        ))}
      </section>

      <section>
        <h2 className="h4 mb-3">
          Candidatos recientes
        </h2>
        <div className="row g-3">
          {candidatos.map((candidato)=> (
            <CandidatoCard
              key={candidato.id}
              nombre={candidato.nombre}
              cargo={candidato.cargo}
              estado={candidato.estado}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="h4 mb-3">Solicitudes</h2>
        <div className="row g-3">
          {solicitudes.map((solicitudes)=>(
            <SolicitudesPanel
              key={solicitudes.id}
              nombre={solicitudes.nombre}
              cargo={solicitudes.cargo}
              estado={solicitudes.estado}
              />
          ))}
        </div>
      </section>
    </main>
  )
}
export default DashboardPage;