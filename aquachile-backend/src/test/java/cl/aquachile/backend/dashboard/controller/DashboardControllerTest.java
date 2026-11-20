package cl.aquachile.backend.dashboard.controller;
import cl.aquachile.backend.dashboard.service.DashboardService;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class DashboardControllerTest {
 @Test void resumen() {var s=mock(DashboardService.class);when(s.resumen()).thenReturn(Map.of("ofertas",2));assertEquals(2,new DashboardController(s).resumen().get("ofertas"));}
}
