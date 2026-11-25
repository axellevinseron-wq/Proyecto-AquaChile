package cl.aquachile.backend.entrevista.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import cl.aquachile.backend.archivo.repository.CvAdjuntoRepository;
import cl.aquachile.backend.entrevista.dto.EntrevistaRequest;
import cl.aquachile.backend.entrevista.repository.EntrevistaRepository;
import cl.aquachile.backend.oferta.repository.OfertaRepository;
import cl.aquachile.backend.postulacion.repository.PostulacionRepository;
import cl.aquachile.backend.postulacion.entity.Postulacion;
import cl.aquachile.backend.postulante.entity.Postulante;
import cl.aquachile.backend.postulante.repository.PostulanteRepository;
import cl.aquachile.backend.oferta.entity.Oferta;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class EntrevistaServiceTest {
    @Test
    void conservaFechaYMensajeAlActualizarEstado() {
        PostulacionRepository postulaciones = mock(PostulacionRepository.class);
        PostulanteRepository postulantes = mock(PostulanteRepository.class);
        OfertaRepository ofertas = mock(OfertaRepository.class);
        CvAdjuntoRepository adjuntos = mock(CvAdjuntoRepository.class);
        EntrevistaRepository entrevistas = mock(EntrevistaRepository.class);
        Instant fecha = Instant.parse("2030-04-02T18:00:00Z");
        UUID postulacionId = UUID.randomUUID();
        UUID postulanteId = UUID.randomUUID();
        UUID ofertaId = UUID.randomUUID();
        Postulacion existente = new Postulacion(
                postulacionId, ofertaId, postulanteId, "PENDIENTE", fecha, "Mensaje de prueba");
        AtomicReference<Postulacion> guardada = new AtomicReference<>();
        when(postulaciones.findById(postulacionId)).thenReturn(Optional.of(existente));
        when(postulaciones.save(any())).thenAnswer(invocation -> {
            guardada.set(invocation.getArgument(0));
            return guardada.get();
        });
        when(postulaciones.findAll()).thenAnswer(invocation ->
                List.of(guardada.get() == null ? existente : guardada.get()));
        when(postulantes.findAll()).thenReturn(List.of(
                new Postulante(postulanteId, "Candidata", "candidata@example.com", "", "")));
        when(ofertas.findAll()).thenReturn(List.of(
                new Oferta(ofertaId, "Analista", "Descripción", "Santiago", true)));
        when(adjuntos.findAll()).thenReturn(List.of());
        when(entrevistas.findAll()).thenReturn(List.of());
        EntrevistaService service = new EntrevistaService(
                postulaciones, postulantes, ofertas, adjuntos, entrevistas,
                mock(GoogleCalendarClient.class), new ObjectMapper());

        var resultado = service.actualizarEstado(postulacionId, "En revisión");

        assertEquals(fecha, guardada.get().fechaCreacion());
        assertEquals("Mensaje de prueba", guardada.get().mensaje());
        assertEquals(fecha, resultado.fecha());
        assertEquals("Mensaje de prueba", resultado.mensaje());
    }

    @Test
    void rechazaFechaInvalidaAntesDeConsultarGoogle() {
        GoogleCalendarClient google = mock(GoogleCalendarClient.class);
        EntrevistaService service = new EntrevistaService(
                mock(PostulacionRepository.class),
                mock(PostulanteRepository.class),
                mock(OfertaRepository.class),
                mock(CvAdjuntoRepository.class),
                mock(EntrevistaRepository.class),
                google,
                new ObjectMapper());

        assertThrows(ResponseStatusException.class, () -> service.agendar(
                UUID.randomUUID(),
                new EntrevistaRequest("un-token-google-valido-para-prueba", "fecha-invalida", "UTC", 30)));
        verifyNoInteractions(google);
    }

    @Test
    void agendaEntrevistaYDevuelveLosEnlacesDeGoogle() throws Exception {
        PostulacionRepository postulaciones = mock(PostulacionRepository.class);
        PostulanteRepository postulantes = mock(PostulanteRepository.class);
        OfertaRepository ofertas = mock(OfertaRepository.class);
        CvAdjuntoRepository adjuntos = mock(CvAdjuntoRepository.class);
        EntrevistaRepository entrevistas = mock(EntrevistaRepository.class);
        GoogleCalendarClient google = mock(GoogleCalendarClient.class);
        ObjectMapper mapper = new ObjectMapper();
        EntrevistaService service = new EntrevistaService(
                postulaciones, postulantes, ofertas, adjuntos, entrevistas, google, mapper);

        UUID postulacionId = UUID.randomUUID();
        UUID postulanteId = UUID.randomUUID();
        UUID ofertaId = UUID.randomUUID();
        Postulacion postulacion = new Postulacion(postulacionId, ofertaId, postulanteId, "Entrevista");
        Postulante candidata = new Postulante(postulanteId, "Candidata", "candidata@example.com", "", "");
        Oferta oferta = new Oferta(ofertaId, "Analista", "Descripción", "Santiago", true);
        AtomicReference<cl.aquachile.backend.entrevista.entity.Entrevista> guardada = new AtomicReference<>();

        when(postulaciones.findById(postulacionId)).thenReturn(Optional.of(postulacion));
        when(postulaciones.findAll()).thenReturn(List.of(postulacion));
        when(postulantes.findById(postulanteId)).thenReturn(Optional.of(candidata));
        when(postulantes.findAll()).thenReturn(List.of(candidata));
        when(ofertas.findById(ofertaId)).thenReturn(Optional.of(oferta));
        when(ofertas.findAll()).thenReturn(List.of(oferta));
        when(adjuntos.findAll()).thenReturn(List.of());
        when(entrevistas.buscarPorPostulacionParaActualizar(postulacionId)).thenReturn(Optional.empty());
        when(entrevistas.saveAndFlush(any())).thenAnswer(invocation -> {
            guardada.set(invocation.getArgument(0));
            return guardada.get();
        });
        when(entrevistas.save(any())).thenAnswer(invocation -> {
            guardada.set(invocation.getArgument(0));
            return guardada.get();
        });
        when(entrevistas.findAll()).thenAnswer(invocation ->
                guardada.get() == null ? List.of() : List.of(guardada.get()));
        when(google.obtenerOrganizador("token-de-google-con-suficiente-longitud"))
                .thenReturn("admin@example.com");
        when(google.crearEvento(eq("token-de-google-con-suficiente-longitud"), anyString(), any()))
                .thenReturn(mapper.readTree("""
                        {"htmlLink":"https://calendar.google.com/event","hangoutLink":"https://meet.google.com/abc"}
                        """));

        var resultado = service.agendar(postulacionId, new EntrevistaRequest(
                "token-de-google-con-suficiente-longitud",
                Instant.now().plusSeconds(3600).toString(),
                "America/Santiago",
                30));

        assertEquals("Agendada", resultado.entrevista().estado());
        assertEquals("https://calendar.google.com/event", resultado.entrevista().enlaceCalendar());
        assertEquals("https://meet.google.com/abc", resultado.entrevista().enlaceMeet());
        verify(google).crearEvento(eq("token-de-google-con-suficiente-longitud"), anyString(),
                argThat(body -> new String(body, java.nio.charset.StandardCharsets.UTF_8)
                        .contains("candidata@example.com")));
    }
}
