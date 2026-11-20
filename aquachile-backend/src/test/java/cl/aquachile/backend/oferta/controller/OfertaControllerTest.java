package cl.aquachile.backend.oferta.controller;
import cl.aquachile.backend.oferta.service.OfertaService;
import cl.aquachile.backend.oferta.dto.OfertaRequest;
import cl.aquachile.backend.oferta.entity.Oferta;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.*;
class OfertaControllerTest {
 @Test void operacionesCrudDeleganEnServicio() {
  OfertaService service=mock(OfertaService.class);
  OfertaController c=new OfertaController(service);
  UUID id=UUID.randomUUID();
  Oferta item=mock(Oferta.class);
  OfertaRequest request=mock(OfertaRequest.class);
  when(service.listar()).thenReturn(List.of(item));
  when(service.obtener(id)).thenReturn(item);
  when(service.crear(request)).thenReturn(item);
  when(service.actualizar(id,request)).thenReturn(item);
  assertEquals(1,c.listar().size());
  assertSame(item,c.obtener(id));
  assertEquals(201,c.crear(request).getStatusCode().value());
  assertSame(item,c.actualizar(id,request));
  c.eliminar(id);
  verify(service).eliminar(id);
 }
}
