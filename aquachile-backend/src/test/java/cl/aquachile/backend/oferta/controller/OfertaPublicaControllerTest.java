package cl.aquachile.backend.oferta.controller;
import cl.aquachile.backend.oferta.entity.Oferta;
import cl.aquachile.backend.oferta.repository.OfertaRepository;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class OfertaPublicaControllerTest {
 @Test void filtrosYDetallePublico() {
  var repo=mock(OfertaRepository.class);var c=new OfertaPublicaController(repo);
  var a=mock(Oferta.class);var b=mock(Oferta.class);UUID id=UUID.randomUUID();
  when(a.titulo()).thenReturn("Ingeniero Java");when(a.categoria()).thenReturn("TI");when(a.descripcion()).thenReturn("Desarrollo");when(a.publicada()).thenReturn(true);
  when(b.titulo()).thenReturn("Analista");when(b.categoria()).thenReturn("RRHH");when(b.descripcion()).thenReturn("Personas");
  when(repo.findByPublicadaTrueOrderByTituloAsc()).thenReturn(List.of(a,b));
  assertEquals(2,c.listar(null,null).size());
  assertEquals(List.of(a),c.listar("ti",null));
  assertEquals(List.of(a),c.listar(null,"java"));
  assertEquals(List.of(a),c.listar(null,"DESARROLLO"));
  assertTrue(c.listar("finanzas",null).isEmpty());
  when(repo.findById(id)).thenReturn(Optional.of(a));assertSame(a,c.detalle(id));
  when(repo.findById(id)).thenReturn(Optional.of(b));assertThrows(ResponseStatusException.class,()->c.detalle(id));
  when(repo.findById(id)).thenReturn(Optional.empty());assertThrows(ResponseStatusException.class,()->c.detalle(id));
 }
}
