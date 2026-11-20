package cl.aquachile.backend.postulacion.controller;
import cl.aquachile.backend.oferta.entity.Oferta;
import cl.aquachile.backend.oferta.repository.OfertaRepository;
import cl.aquachile.backend.postulante.repository.PostulanteRepository;
import cl.aquachile.backend.postulacion.repository.PostulacionRepository;
import cl.aquachile.backend.archivo.repository.CvAdjuntoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.nio.file.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
class PostulacionPublicaControllerTest {
 @TempDir Path tmp;
 @Test void postulacionValidaYRechazos() {
  var ofertas=mock(OfertaRepository.class);var personas=mock(PostulanteRepository.class);
  var postulaciones=mock(PostulacionRepository.class);var adjuntos=mock(CvAdjuntoRepository.class);
  var c=new PostulacionPublicaController(ofertas,personas,postulaciones,adjuntos,tmp.toString());
  UUID id=UUID.randomUUID();var cv=new MockMultipartFile("cv","cv.pdf","application/pdf",new byte[]{1,2});
  assertThrows(ResponseStatusException.class,()->c.postular(id,"","a@b.cl","","",cv));
  assertThrows(ResponseStatusException.class,()->c.postular(id,"Ana","invalido","","",cv));
  assertThrows(ResponseStatusException.class,()->c.postular(id,"Ana","a@b.cl","","",cv));
  var oferta=mock(Oferta.class);when(oferta.publicada()).thenReturn(true);
  when(ofertas.findById(id)).thenReturn(Optional.of(oferta));
  var bad=new MockMultipartFile("cv","cv.txt","text/plain",new byte[]{1});
  assertThrows(ResponseStatusException.class,()->c.postular(id,"Ana","a@b.cl","","",bad));
  assertEquals(201,c.postular(id," Ana ","A@B.CL","","",cv).getStatusCode().value());
  verify(personas).save(any());verify(postulaciones).save(any());verify(adjuntos).save(any());
 }
 @Test void eliminaArchivoSiFallaPersistencia() {
  var ofertas=mock(OfertaRepository.class);var personas=mock(PostulanteRepository.class);
  var postulaciones=mock(PostulacionRepository.class);var adjuntos=mock(CvAdjuntoRepository.class);
  var c=new PostulacionPublicaController(ofertas,personas,postulaciones,adjuntos,tmp.toString());
  UUID id=UUID.randomUUID();var oferta=mock(Oferta.class);when(oferta.publicada()).thenReturn(true);when(ofertas.findById(id)).thenReturn(Optional.of(oferta));
  when(personas.save(any())).thenThrow(new IllegalStateException("db"));
  var cv=new MockMultipartFile("cv","cv.docx","application/octet-stream",new byte[]{1});
  assertThrows(IllegalStateException.class,()->c.postular(id,"Ana","a@b.cl","","",cv));
 }
}
