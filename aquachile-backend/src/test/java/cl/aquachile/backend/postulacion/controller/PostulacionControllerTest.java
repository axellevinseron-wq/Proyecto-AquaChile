package cl.aquachile.backend.postulacion.controller;
import cl.aquachile.backend.postulacion.service.PostulacionService;
import cl.aquachile.backend.postulacion.dto.PostulacionRequest;
import cl.aquachile.backend.postulacion.entity.Postulacion;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.*;
class PostulacionControllerTest {
 @Test void operacionesCrudDeleganEnServicio() {
  PostulacionService service=mock(PostulacionService.class);
  PostulacionController c=new PostulacionController(service);
  UUID id=UUID.randomUUID();
  Postulacion item=mock(Postulacion.class);
  PostulacionRequest request=mock(PostulacionRequest.class);
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
