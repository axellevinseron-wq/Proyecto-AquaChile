package cl.aquachile.backend.archivo.service;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.nio.file.Path;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
class ArchivoServiceTest {
 @TempDir Path tmp;
 @Test void guardaYRecuperaPdfYDocx() {
  var s=new ArchivoService(tmp.toString());
  var pdf=new MockMultipartFile("file","cv.pdf","application/pdf",new byte[]{1,2,3});
  UUID id=s.guardar(pdf);assertArrayEquals(new byte[]{1,2,3},s.leer(id));
  var doc=new MockMultipartFile("file","cv.docx","application/octet-stream",new byte[]{4,5});
  assertArrayEquals(new byte[]{4,5},s.leer(s.guardar(doc)));
 }
 @Test void rechazaArchivosInvalidosYAusentes() {
  var s=new ArchivoService(tmp.toString());
  assertThrows(ResponseStatusException.class,()->s.guardar(new MockMultipartFile("file","mal.exe","application/octet-stream",new byte[]{1})));
  assertThrows(ResponseStatusException.class,()->s.guardar(new MockMultipartFile("file","vacio.pdf","application/pdf",new byte[0])));
  assertThrows(ResponseStatusException.class,()->s.guardar(new MockMultipartFile("file","grande.pdf","application/pdf",new byte[5_000_001])));
  assertThrows(ResponseStatusException.class,()->s.leer(UUID.randomUUID()));
 }
}
