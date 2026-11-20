package cl.aquachile.backend.usuario.service;
import cl.aquachile.backend.usuario.repository.UsuarioRepository;
import cl.aquachile.backend.usuario.entity.*;
import cl.aquachile.backend.usuario.dto.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class UsuarioServiceTest {
 final UsuarioRepository repo=mock(UsuarioRepository.class);
 final PasswordEncoder encoder=mock(PasswordEncoder.class);
 final UsuarioService service=new UsuarioService(repo,encoder);
 final UUID id=UUID.randomUUID();
 final Usuario admin=new Usuario(id,"Admin","admin@cl.cl","hash",Rol.ADMIN,true);
 @Test void buscar(){when(repo.buscarPorCorreo("admin@cl.cl")).thenReturn(Optional.of(admin));assertEquals(id,service.buscarPorCorreo("admin@cl.cl").id());}
 @Test void noBuscar(){assertThrows(ResponseStatusException.class,()->service.buscarPorCorreo("nadie"));}
 @Test void existe(){when(repo.existePorCorreo("admin@cl.cl")).thenReturn(true);assertTrue(service.existePorCorreo("admin@cl.cl"));}
 @Test void lista(){when(repo.listar()).thenReturn(List.of(admin));assertEquals(1,service.listar().size());}
 @Test void obtiene(){when(repo.buscarPorId(id)).thenReturn(Optional.of(admin));assertEquals(id,service.obtener(id).id());}
 @Test void crea(){when(repo.guardar(any())).thenAnswer(i->i.getArgument(0));when(encoder.encode("password123")).thenReturn("hash");var r=new CrearUsuarioRequest(" Ana "," ANA@CL.CL ","password123",Rol.EVALUADOR);assertEquals("ana@cl.cl",service.crear(r).correo());}
 @Test void duplicado(){when(repo.existePorCorreo("admin@cl.cl")).thenReturn(true);assertThrows(ResponseStatusException.class,()->service.crear(new CrearUsuarioRequest("Admin","admin@cl.cl","password123",Rol.ADMIN)));}
 @Test void actualiza(){when(repo.buscarPorId(id)).thenReturn(Optional.of(admin));when(repo.guardar(any())).thenAnswer(i->i.getArgument(0));assertEquals(id,service.actualizar(id,new ActualizarUsuarioRequest("Nuevo","admin@cl.cl",Rol.ADMIN),"otro@cl.cl").id());}
 @Test void noPuedeQuitarSuRol(){when(repo.buscarPorId(id)).thenReturn(Optional.of(admin));assertThrows(ResponseStatusException.class,()->service.actualizar(id,new ActualizarUsuarioRequest("Admin","admin@cl.cl",Rol.EVALUADOR),"admin@cl.cl"));}
 @Test void noPuedeDesactivarse(){when(repo.buscarPorId(id)).thenReturn(Optional.of(admin));assertThrows(ResponseStatusException.class,()->service.cambiarEstado(id,new CambiarEstadoRequest(false),"admin@cl.cl"));}
 @Test void cambiaEstado(){when(repo.buscarPorId(id)).thenReturn(Optional.of(admin));when(repo.guardar(any())).thenAnswer(i->i.getArgument(0));assertTrue(service.cambiarEstado(id,new CambiarEstadoRequest(true),"otro@cl.cl").activo());}
 @Test void cambiaPassword(){when(repo.buscarPorId(id)).thenReturn(Optional.of(admin));when(encoder.encode("nuevoPassword123")).thenReturn("nuevoHash");service.cambiarPassword(id,new CambiarPasswordRequest("nuevoPassword123"));verify(repo).guardar(argThat(u->u.passwordHash().equals("nuevoHash")));}
}
