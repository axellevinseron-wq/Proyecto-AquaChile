package cl.aquachile.backend.usuario.service;
import cl.aquachile.backend.usuario.repository.UsuarioRepository;
import cl.aquachile.backend.usuario.entity.Usuario;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
class AdminBootstrapTest {
 @Test void creaAdminSoloCuandoNoExiste() throws Exception {
  var repo=mock(UsuarioRepository.class);var encoder=mock(PasswordEncoder.class);
  when(encoder.encode("clave")).thenReturn("hash");
  var bootstrap=new AdminBootstrap();
  bootstrap.initializeAdmin(repo,encoder,"admin@ejemplo.cl","clave").run(null);
  verify(repo).guardar(any(Usuario.class));
  reset(repo);when(repo.existePorCorreo("admin@ejemplo.cl")).thenReturn(true);
  bootstrap.initializeAdmin(repo,encoder,"admin@ejemplo.cl","clave").run(null);
  verify(repo,never()).guardar(any(Usuario.class));
  reset(repo);bootstrap.initializeAdmin(repo,encoder,"admin@ejemplo.cl","").run(null);
  verify(repo,never()).guardar(any(Usuario.class));
 }
}
