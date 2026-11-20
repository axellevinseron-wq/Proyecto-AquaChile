package cl.aquachile.backend.archivo.controller;
import cl.aquachile.backend.archivo.service.ArchivoService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class ArchivoControllerTest {
 @Test void subeYDescarga() {
  var service=mock(ArchivoService.class);var c=new ArchivoController(service);UUID id=UUID.randomUUID();
  var file=new MockMultipartFile("file","cv.pdf","application/pdf",new byte[]{1});
  when(service.guardar(file)).thenReturn(id);when(service.leer(id)).thenReturn(new byte[]{1});
  assertEquals(id,c.subir(file).get("id"));assertArrayEquals(new byte[]{1},c.descargar(id).getBody());
 }
}
