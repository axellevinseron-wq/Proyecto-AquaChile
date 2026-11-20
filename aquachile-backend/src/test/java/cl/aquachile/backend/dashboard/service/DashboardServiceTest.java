package cl.aquachile.backend.dashboard.service;
import cl.aquachile.backend.oferta.repository.OfertaRepository;
import cl.aquachile.backend.postulante.repository.PostulanteRepository;
import cl.aquachile.backend.postulacion.repository.PostulacionRepository;
import cl.aquachile.backend.solicitud.repository.SolicitudRepository;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class DashboardServiceTest {
 @Test void resumeConteos() {
  var o=mock(OfertaRepository.class);var p=mock(PostulanteRepository.class);var po=mock(PostulacionRepository.class);var s=mock(SolicitudRepository.class);
  when(o.listar()).thenReturn(List.of(mock(cl.aquachile.backend.oferta.entity.Oferta.class)));
  when(p.listar()).thenReturn(List.of());when(po.listar()).thenReturn(List.of());when(s.listar()).thenReturn(List.of());
  assertEquals(1,new DashboardService(o,p,po,s).resumen().get("ofertas"));
 }
}
