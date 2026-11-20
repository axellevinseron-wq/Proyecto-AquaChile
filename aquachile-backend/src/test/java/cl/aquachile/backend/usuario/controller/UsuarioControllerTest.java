package cl.aquachile.backend.usuario.controller;
import cl.aquachile.backend.usuario.service.UsuarioService;
import cl.aquachile.backend.usuario.dto.*;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class UsuarioControllerTest {
 @Test void endpointsDelegan() {
  var service=mock(UsuarioService.class);var c=new UsuarioController(service);UUID id=UUID.randomUUID();
  var usuario=mock(UsuarioResponse.class);var crear=mock(CrearUsuarioRequest.class);
  var actualizar=mock(ActualizarUsuarioRequest.class);var estado=mock(CambiarEstadoRequest.class);
  var clave=mock(CambiarPasswordRequest.class);var auth=mock(Authentication.class);
  when(auth.getName()).thenReturn("admin@b.cl");when(service.listar()).thenReturn(List.of(usuario));
  when(service.obtener(id)).thenReturn(usuario);when(service.crear(crear)).thenReturn(usuario);
  when(service.actualizar(id,actualizar,"admin@b.cl")).thenReturn(usuario);
  when(service.cambiarEstado(id,estado,"admin@b.cl")).thenReturn(usuario);
  assertEquals(1,c.listar().size());assertSame(usuario,c.obtener(id));
  assertEquals(201,c.crear(crear).getStatusCode().value());
  assertSame(usuario,c.actualizar(id,actualizar,auth));
  assertSame(usuario,c.cambiarEstado(id,estado,auth));
  assertEquals(204,c.cambiarPassword(id,clave).getStatusCode().value());
  verify(service).cambiarPassword(id,clave);
 }
}
