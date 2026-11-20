package cl.aquachile.backend.dashboard.service;

import org.springframework.stereotype.Service;import java.util.*;import cl.aquachile.backend.oferta.repository.OfertaRepository;import cl.aquachile.backend.postulante.repository.PostulanteRepository;import cl.aquachile.backend.postulacion.repository.PostulacionRepository;import cl.aquachile.backend.solicitud.repository.SolicitudRepository;
@Service public class DashboardService {private final OfertaRepository ofertas;private final PostulanteRepository postulantes;private final PostulacionRepository postulaciones;private final SolicitudRepository solicitudes;
 public DashboardService(OfertaRepository o,PostulanteRepository p,PostulacionRepository po,SolicitudRepository s){ofertas=o;postulantes=p;postulaciones=po;solicitudes=s;}
 public Map<String,Integer> resumen(){return Map.of("ofertas",ofertas.listar().size(),"postulantes",postulantes.listar().size(),"postulaciones",postulaciones.listar().size(),"solicitudes",solicitudes.listar().size());}}
