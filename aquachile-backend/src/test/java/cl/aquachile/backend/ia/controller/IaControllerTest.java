package cl.aquachile.backend.ia.controller;
import cl.aquachile.backend.ia.service.IaService;
import cl.aquachile.backend.ia.dto.EvaluacionRequest;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class IaControllerTest {
 @Test void analiza() {var s=mock(IaService.class);var r=mock(EvaluacionRequest.class);when(r.texto()).thenReturn("hola");when(s.analizar("hola")).thenReturn(Map.of("modo","test"));assertEquals("test",new IaController(s).analizar(r).get("modo"));}
}
