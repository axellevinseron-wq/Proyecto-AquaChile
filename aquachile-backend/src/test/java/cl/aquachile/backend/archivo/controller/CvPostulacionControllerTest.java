
package cl.aquachile.backend.archivo.controller;

import cl.aquachile.backend.archivo.entity.CvAdjunto;
import cl.aquachile.backend.archivo.repository.CvAdjuntoRepository;
import cl.aquachile.backend.postulacion.repository.PostulacionRepository;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CvPostulacionControllerTest {

 @TempDir
 Path tmp;

 @Test
 void descargaValidaYErrores() throws Exception {
  var repo = mock(CvAdjuntoRepository.class);
  var postulaciones = mock(PostulacionRepository.class);

  var controller = new CvPostulacionController(
          repo, postulaciones, tmp.toString()
  );

  UUID post = UUID.randomUUID();
  UUID file = UUID.randomUUID();

  assertEquals(404, assertThrows(
          ResponseStatusException.class,
          () -> controller.descargar(post)
  ).getStatusCode().value());

  when(repo.findByPostulacionId(post)).thenReturn(
          Optional.of(new CvAdjunto(file, post, "cv.pdf", "cv.pdf"))
  );

  assertEquals(404, assertThrows(
          ResponseStatusException.class,
          () -> controller.descargar(post)
  ).getStatusCode().value());

  Files.write(tmp.resolve("cv.pdf"), new byte[]{1, 2});

  assertArrayEquals(
          new byte[]{1, 2},
          controller.descargar(post).getBody()
  );

  when(repo.findByPostulacionId(post)).thenReturn(
          Optional.of(new CvAdjunto(
                  file, post, "cv.pdf", "../secreto.pdf"
          ))
  );

  assertEquals(403, assertThrows(
          ResponseStatusException.class,
          () -> controller.descargar(post)
  ).getStatusCode().value());
 }

 @Test
 void asociarPdfCorrectamente() throws Exception {
  var adjuntos = mock(CvAdjuntoRepository.class);
  var postulaciones = mock(PostulacionRepository.class);

  var controller = new CvPostulacionController(
          adjuntos, postulaciones, tmp.toString()
  );

  UUID postId = UUID.randomUUID();
  UUID archivoId = UUID.randomUUID();

  Files.write(
          tmp.resolve(archivoId + ".pdf"),
          new byte[]{1, 2, 3}
  );

  when(postulaciones.existsById(postId)).thenReturn(true);
  when(adjuntos.findByPostulacionId(postId))
          .thenReturn(Optional.empty());

  var resultado = controller.asociar(postId, archivoId);

  assertEquals(
          "CV asociado correctamente",
          resultado.get("mensaje")
  );

  assertEquals(postId, resultado.get("postulacionId"));
  assertEquals(archivoId, resultado.get("archivoId"));

  verify(adjuntos).save(argThat(cv ->
          cv.id().equals(archivoId)
                  && cv.postulacionId().equals(postId)
                  && cv.rutaRelativa().equals(archivoId + ".pdf")
  ));
 }

 @Test
 void asociarDocxCorrectamente() throws Exception {
  var adjuntos = mock(CvAdjuntoRepository.class);
  var postulaciones = mock(PostulacionRepository.class);

  var controller = new CvPostulacionController(
          adjuntos, postulaciones, tmp.toString()
  );

  UUID postId = UUID.randomUUID();
  UUID archivoId = UUID.randomUUID();

  Files.write(
          tmp.resolve(archivoId + ".docx"),
          new byte[]{4, 5, 6}
  );

  when(postulaciones.existsById(postId)).thenReturn(true);
  when(adjuntos.findByPostulacionId(postId))
          .thenReturn(Optional.empty());

  var resultado = controller.asociar(postId, archivoId);

  assertEquals(archivoId, resultado.get("archivoId"));

  verify(adjuntos).save(argThat(cv ->
          cv.rutaRelativa().equals(archivoId + ".docx")
  ));
 }

 @Test
 void asociarPostulacionInexistente() {
  var adjuntos = mock(CvAdjuntoRepository.class);
  var postulaciones = mock(PostulacionRepository.class);

  var controller = new CvPostulacionController(
          adjuntos, postulaciones, tmp.toString()
  );

  UUID postId = UUID.randomUUID();
  UUID archivoId = UUID.randomUUID();

  when(postulaciones.existsById(postId)).thenReturn(false);

  var error = assertThrows(
          ResponseStatusException.class,
          () -> controller.asociar(postId, archivoId)
  );

  assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());

  verify(adjuntos, never()).save(any());
 }

 @Test
 void asociarArchivoInexistente() {
  var adjuntos = mock(CvAdjuntoRepository.class);
  var postulaciones = mock(PostulacionRepository.class);

  var controller = new CvPostulacionController(
          adjuntos, postulaciones, tmp.toString()
  );

  UUID postId = UUID.randomUUID();
  UUID archivoId = UUID.randomUUID();

  when(postulaciones.existsById(postId)).thenReturn(true);

  var error = assertThrows(
          ResponseStatusException.class,
          () -> controller.asociar(postId, archivoId)
  );

  assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());

  verify(adjuntos, never()).save(any());
 }

 @Test
 void asociarCvDuplicado() throws Exception {
  var adjuntos = mock(CvAdjuntoRepository.class);
  var postulaciones = mock(PostulacionRepository.class);

  var controller = new CvPostulacionController(
          adjuntos, postulaciones, tmp.toString()
  );

  UUID postId = UUID.randomUUID();
  UUID archivoId = UUID.randomUUID();

  Files.write(
          tmp.resolve(archivoId + ".pdf"),
          new byte[]{1, 2, 3}
  );

  when(postulaciones.existsById(postId)).thenReturn(true);

  when(adjuntos.findByPostulacionId(postId)).thenReturn(
          Optional.of(new CvAdjunto(
                  UUID.randomUUID(),
                  postId,
                  "anterior.pdf",
                  "anterior.pdf"
          ))
  );

  var error = assertThrows(
          ResponseStatusException.class,
          () -> controller.asociar(postId, archivoId)
  );

  assertEquals(HttpStatus.CONFLICT, error.getStatusCode());

  verify(adjuntos, never()).save(any());
 }
}
