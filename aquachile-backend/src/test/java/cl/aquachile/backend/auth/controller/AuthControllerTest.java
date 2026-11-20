package cl.aquachile.backend.auth.controller;
import cl.aquachile.backend.auth.service.AuthService;
import cl.aquachile.backend.auth.dto.*;
import cl.aquachile.backend.usuario.dto.UsuarioResponse;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class AuthControllerTest {
 @Test void delegaLoginYMe() {
  var s=mock(AuthService.class);var c=new AuthController(s);var r=mock(LoginRequest.class);
  var response=mock(LoginResponse.class);var user=mock(UsuarioResponse.class);var auth=mock(Authentication.class);
  when(s.login(r)).thenReturn(response);when(auth.getName()).thenReturn("a@b.cl");when(s.obtenerUsuarioAutenticado("a@b.cl")).thenReturn(user);
  assertSame(response,c.login(r));assertSame(user,c.me(auth));
 }
}
