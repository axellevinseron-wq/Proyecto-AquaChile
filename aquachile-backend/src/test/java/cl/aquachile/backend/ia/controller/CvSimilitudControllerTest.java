package cl.aquachile.backend.ia.controller;
import cl.aquachile.backend.archivo.entity.CvAdjunto;
import cl.aquachile.backend.archivo.repository.CvAdjuntoRepository;
import cl.aquachile.backend.ia.service.PdfTextoService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.nio.file.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
class CvSimilitudControllerTest {
    @TempDir Path carpeta;
    final CvAdjuntoRepository repo = mock(CvAdjuntoRepository.class);
    final PdfTextoService extractor = mock(PdfTextoService.class);
    CvAdjunto cv(String ruta) { return new CvAdjunto(UUID.randomUUID(), UUID.randomUUID(), ruta, ruta); }
    @Test void comparaIdenticosSimilaresYArchivosAusentes() throws Exception {
        var original = cv("original.pdf"); var igual = cv("igual.pdf"); var similar = cv("similar.pdf"); var distinto = cv("distinto.pdf"); var ausente = cv("ausente.pdf");
        Files.write(carpeta.resolve("original.pdf"), new byte[]{1});
        Files.write(carpeta.resolve("igual.pdf"), new byte[]{1});
        Files.write(carpeta.resolve("similar.pdf"), new byte[]{2});
        Files.write(carpeta.resolve("distinto.pdf"), new byte[]{3});
        when(extractor.extraerTexto(any(byte[].class))).thenAnswer(i -> ((byte[])i.getArgument(0))[0] == 3 ? "otro contenido diferente" : "java spring boot postgres desarrollo");
        when(repo.findByPostulacionId(original.postulacionId())).thenReturn(Optional.of(original));
        when(repo.findAll()).thenReturn(List.of(original, igual, similar, distinto, ausente));
        var c = new CvSimilitudController(repo, extractor, carpeta.toString());
        var r = c.comprobar(original.postulacionId());
        assertEquals("PARCIAL", r.get("estado")); assertEquals(4, r.get("comparados")); assertEquals(1, r.get("omitidos"));
        var coincidencias = (List<?>) r.get("coincidencias"); assertEquals(2, coincidencias.size());
        assertEquals("ARCHIVO_IDENTICO", ((Map<?,?>)coincidencias.get(0)).get("tipo"));
        assertEquals("TEXTO_SIMILAR", ((Map<?,?>)coincidencias.get(1)).get("tipo"));
        when(repo.findAll()).thenReturn(List.of(original));
        assertEquals("COMPLETO", c.comprobar(original.postulacionId()).get("estado"));
    }
    @Test void rechazaAusenciaYRutaExterna() {
        var c = new CvSimilitudController(repo, extractor, carpeta.toString());
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class, () -> c.comprobar(UUID.randomUUID())).getStatusCode());
        var externo = cv("../externo.pdf");
        when(repo.findByPostulacionId(externo.postulacionId())).thenReturn(Optional.of(externo));
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class, () -> c.comprobar(externo.postulacionId())).getStatusCode());
    }
}
