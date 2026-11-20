package cl.aquachile.backend.auth.service;
import cl.aquachile.backend.usuario.service.AquaChileUserDetailsService;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class JwtAuthenticationFilterTest {
 @Test void autorizaTokenValido() throws Exception {
  SecurityContextHolder.clearContext();
  var jwt=mock(JwtService.class);var details=mock(AquaChileUserDetailsService.class);
  when(jwt.validarToken("token")).thenReturn(true);when(jwt.obtenerCorreo("token")).thenReturn("a@b.cl");
  when(details.loadUserByUsername("a@b.cl")).thenReturn(User.withUsername("a@b.cl").password("hash").roles("ADMIN").build());
  var request=new MockHttpServletRequest();request.addHeader("Authorization","Bearer token");
  var chain=mock(FilterChain.class);new JwtAuthenticationFilter(jwt,details).doFilter(request,new MockHttpServletResponse(),chain);
  assertEquals("a@b.cl",SecurityContextHolder.getContext().getAuthentication().getName());
  verify(chain).doFilter(any(),any());SecurityContextHolder.clearContext();
 }
 @Test void ignoraTokenInvalidoOUsuarioAusente() throws Exception {
  SecurityContextHolder.clearContext();
  var jwt=mock(JwtService.class);var details=mock(AquaChileUserDetailsService.class);
  var filter=new JwtAuthenticationFilter(jwt,details);var chain=mock(FilterChain.class);
  var request=new MockHttpServletRequest();request.addHeader("Authorization","Bearer invalido");
  filter.doFilter(request,new MockHttpServletResponse(),chain);
  assertNull(SecurityContextHolder.getContext().getAuthentication());
  when(jwt.validarToken("invalido")).thenReturn(true);when(jwt.obtenerCorreo("invalido")).thenReturn("ausente");
  when(details.loadUserByUsername("ausente")).thenThrow(new UsernameNotFoundException("ausente"));
  filter.doFilter(request,new MockHttpServletResponse(),chain);
  assertNull(SecurityContextHolder.getContext().getAuthentication());
  verify(chain,times(2)).doFilter(any(),any());SecurityContextHolder.clearContext();
 }
}
