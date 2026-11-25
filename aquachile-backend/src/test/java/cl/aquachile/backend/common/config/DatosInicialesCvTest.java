package cl.aquachile.backend.common.config;
import cl.aquachile.backend.archivo.repository.CvAdjuntoRepository;
import cl.aquachile.backend.oferta.repository.OfertaRepository;
import cl.aquachile.backend.postulante.repository.PostulanteRepository;
import cl.aquachile.backend.postulacion.repository.PostulacionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.*;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
class DatosInicialesCvTest {
    @TempDir Path carpeta;
    @Test void cargaInicialYReinicio() throws Exception {
        var ofertas = mock(OfertaRepository.class);
        var personas = mock(PostulanteRepository.class);
        var postulaciones = mock(PostulacionRepository.class);
        var adjuntos = mock(CvAdjuntoRepository.class);
        var seed = new DatosInicialesCv(ofertas, personas, postulaciones, adjuntos, carpeta.toString());
        seed.run(null);
        verify(ofertas, times(3)).save(any());
        verify(personas, times(6)).save(any());
        verify(postulaciones, times(6)).save(any());
        verify(adjuntos, times(6)).save(any());
        try (var archivos = Files.list(carpeta)) { assertEquals(6, archivos.count()); }
        when(ofertas.existsById(any())).thenReturn(true);
        when(personas.existsById(any())).thenReturn(true);
        when(postulaciones.existsById(any())).thenReturn(true);
        when(adjuntos.findByPostulacionId(any())).thenReturn(Optional.of(mock(cl.aquachile.backend.archivo.entity.CvAdjunto.class)));
        seed.run(null);
        verify(ofertas, times(3)).save(any());
        verify(personas, times(6)).save(any());
        verify(postulaciones, times(6)).save(any());
        verify(adjuntos, times(6)).save(any());
    }
}
