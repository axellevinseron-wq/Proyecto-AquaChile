package cl.aquachile.backend.oferta.entity;

import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class OfertaTest {
    @Test void conservaTodosLosCamposDelAviso() {
        UUID id = UUID.randomUUID();
        LocalDate fecha = LocalDate.of(2026, 11, 18);
        Oferta oferta = new Oferta(id, "Analista", "Descripción", "Puerto Montt", true,
                "Tecnología", "Híbrida", fecha, 2, "Analizar", "Java", "Seguro", "$1.000.000");
        assertAll(() -> assertEquals(id, oferta.id()),
                () -> assertEquals("Analista", oferta.titulo()),
                () -> assertEquals("Descripción", oferta.descripcion()),
                () -> assertEquals("Puerto Montt", oferta.ubicacion()),
                () -> assertTrue(oferta.publicada()),
                () -> assertEquals("Tecnología", oferta.categoria()),
                () -> assertEquals("Híbrida", oferta.modalidad()),
                () -> assertEquals(fecha, oferta.fechaPublicacion()),
                () -> assertEquals(2, oferta.cupos()),
                () -> assertEquals("Analizar", oferta.funcionesPrincipales()),
                () -> assertEquals("Java", oferta.requisitos()),
                () -> assertEquals("Seguro", oferta.beneficios()),
                () -> assertEquals("$1.000.000", oferta.rangoSalarial()));
    }
    @Test void constructorAnteriorMantieneCompatibilidad() {
        Oferta oferta = new Oferta(UUID.randomUUID(), "Operario", "Texto", "Chiloé", false);
        assertFalse(oferta.publicada());
        assertNull(oferta.categoria());
        assertNull(oferta.fechaPublicacion());
        assertNull(oferta.rangoSalarial());
    }
}
