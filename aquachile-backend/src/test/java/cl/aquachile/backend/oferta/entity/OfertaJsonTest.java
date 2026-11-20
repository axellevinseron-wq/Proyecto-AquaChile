package cl.aquachile.backend.oferta.entity;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
class OfertaJsonTest {
 @Test void devuelveCamposRealesEnJson() throws Exception {
  Oferta oferta = new Oferta(UUID.randomUUID(), "Desarrollador Java", "Prueba", "Puerto Montt", true);
  String json = new ObjectMapper().writeValueAsString(oferta);
  assertTrue(json.contains("\"titulo\":\"Desarrollador Java\""));
  assertTrue(json.contains("\"publicada\":true"));
 }
}
