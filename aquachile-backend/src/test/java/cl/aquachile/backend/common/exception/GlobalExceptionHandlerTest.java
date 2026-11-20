package cl.aquachile.backend.common.exception;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
class GlobalExceptionHandlerTest {
 @Test void convierteExcepcionARespuesta() {
  var req=new MockHttpServletRequest("GET","/api/ofertas/1");
  var r=new GlobalExceptionHandler().status(new ResponseStatusException(HttpStatus.NOT_FOUND,"No encontrado"),req);
  assertEquals(404,r.getStatusCode().value());assertEquals("/api/ofertas/1",r.getBody().get("path"));
  assertEquals("No encontrado",r.getBody().get("message"));
 }
}
