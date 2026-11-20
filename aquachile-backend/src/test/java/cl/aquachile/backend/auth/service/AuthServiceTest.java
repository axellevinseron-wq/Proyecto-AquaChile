package cl.aquachile.backend.auth.service;
import cl.aquachile.backend.auth.dto.LoginRequest;
import cl.aquachile.backend.usuario.entity.*;
import cl.aquachile.backend.usuario.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
class AuthServiceTest {
 @Test void loginValidoYUsuarioActual() {
  var manager=mock(AuthenticationManager.class);var repo=mock(UsuarioRepository.class);var jwt=mock(JwtService.class);
  var s=new AuthService(manager,repo,jwt);
  var user=new Usuario(UUID.randomUUID(),"Admin","admin@ejemplo.cl","hash",Rol.ADMIN,true);
  when(repo.buscarPorCorreo("admin@ejemplo.cl")).thenReturn(Optional.of(user));
  when(jwt.generarToken("admin@ejemplo.cl",Rol.ADMIN)).thenReturn("token");
  assertEquals("token",s.login(new LoginRequest("admin@ejemplo.cl","clave")).token());
  assertEquals("admin@ejemplo.cl",s.obtenerUsuarioAutenticado("admin@ejemplo.cl").correo());
 }
 @Test void erroresDeAutenticacion() {
  var manager=mock(AuthenticationManager.class);var repo=mock(UsuarioRepository.class);var jwt=mock(JwtService.class);
  var s=new AuthService(manager,repo,jwt);
  when(manager.authenticate(any())).thenThrow(new BadCredentialsException("incorrecto"));
  assertThrows(ResponseStatusException.class,()->s.login(new LoginRequest("a@b.cl","x")));
  reset(manager);
  assertThrows(ResponseStatusException.class,()->s.login(new LoginRequest("a@b.cl","x")));
  assertThrows(ResponseStatusException.class,()->s.obtenerUsuarioAutenticado("a@b.cl"));
  var disabled=new Usuario(UUID.randomUUID(),"X","a@b.cl","hash",Rol.ADMIN,false);
  when(repo.buscarPorCorreo("a@b.cl")).thenReturn(Optional.of(disabled));
  assertThrows(ResponseStatusException.class,()->s.obtenerUsuarioAutenticado("a@b.cl"));
 }
}
