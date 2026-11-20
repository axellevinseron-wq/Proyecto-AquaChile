package cl.aquachile.backend.solicitud.entity;

import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class SolicitudTest {
    @Test void constructorCompletoConservaDatosYFechas() {
        UUID id = UUID.randomUUID(), postulacion = UUID.randomUUID(), evaluador = UUID.randomUUID();
        LocalDate solicitada = LocalDate.of(2026, 11, 18);
        LocalDate evaluada = solicitada.plusDays(3);
        Solicitud s = new Solicitud(id, postulacion, evaluador, "FINALIZADA", "Revisado", solicitada, evaluada);
        assertAll(() -> assertEquals(id, s.id()),
                () -> assertEquals(postulacion, s.postulacionId()),
                () -> assertEquals(evaluador, s.evaluadorId()),
                () -> assertEquals("FINALIZADA", s.estado()),
                () -> assertEquals("Revisado", s.observaciones()),
                () -> assertEquals(solicitada, s.fechaSolicitud()),
                () -> assertEquals(evaluada, s.fechaEvaluacion()));
    }
    @Test void constructorCompatibleMantieneFechasNulas() {
        Solicitud s = new Solicitud(UUID.randomUUID(), UUID.randomUUID(), null, "PENDIENTE", null);
        assertEquals("PENDIENTE", s.estado());
        assertNull(s.evaluadorId());
        assertNull(s.fechaSolicitud());
        assertNull(s.fechaEvaluacion());
    }
}
