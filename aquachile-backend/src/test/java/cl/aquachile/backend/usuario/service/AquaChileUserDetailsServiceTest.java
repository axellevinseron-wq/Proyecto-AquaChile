package cl.aquachile.backend.usuario.service;
import cl.aquachile.backend.usuario.entity.*;
import cl.aquachile.backend.usuario.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class AquaChileUserDetailsServiceTest {
 @Test void usuarioActivoEInactivo() {
  var repo=mock(UsuarioRepository.class);var s=new AquaChileUserDetailsService(repo);
  when(repo.buscarPorCorreo("a@b.cl")).thenReturn(Optional.of(new Usuario(UUID.randomUUID(),"Ana","a@b.cl","hash",Rol.EVALUADOR,true)));
  var u=s.loadUserByUsername("a@b.cl");assertTrue(u.isEnabled());assertEquals("a@b.cl",u.getUsername());
  assertTrue(u.getAuthorities().stream().anyMatch(a->a.getAuthority().equals("ROLE_EVALUADOR")));
  when(repo.buscarPorCorreo("a@b.cl")).thenReturn(Optional.of(new Usuario(UUID.randomUUID(),"Ana","a@b.cl","hash",Rol.EVALUADOR,false)));
  assertFalse(s.loadUserByUsername("a@b.cl").isEnabled());
  assertThrows(UsernameNotFoundException.class,()->s.loadUserByUsername("ausente"));
 }
}
