
package cl.aquachile.backend.common.config;

import cl.aquachile.backend.auth.service.JwtAuthenticationFilter;
import cl.aquachile.backend.usuario.service.AquaChileUserDetailsService;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SecurityConfigTest {

 @Test
 void configuraAutenticacionYCors() {
  var config = new SecurityConfig(
          mock(JwtAuthenticationFilter.class)
  );

  var details = mock(AquaChileUserDetailsService.class);
  var encoder = mock(PasswordEncoder.class);

  var provider = config.authenticationProvider(
          details, encoder
  );

  assertNotNull(provider);
  assertNotNull(config.authenticationManager(provider));

  var cors = config.corsConfigurationSource(
          "http://localhost:5173, http://localhost:3000"
  );

  var configuration = cors.getCorsConfiguration(
          new MockHttpServletRequest()
  );

  assertNotNull(configuration);

  assertTrue(configuration.getAllowedOrigins()
          .contains("http://localhost:5173"));

  assertTrue(configuration.getAllowedOrigins()
          .contains("http://localhost:3000"));

  assertTrue(configuration.getAllowedMethods()
          .contains("POST"));

  assertTrue(configuration.getAllowedMethods()
          .contains("GET"));

  assertTrue(configuration.getAllowedHeaders()
          .contains("Authorization"));

  assertEquals(3600L, configuration.getMaxAge());
 }

 @Test
 void corsIgnoraOrigenesVacios() {
  var config = new SecurityConfig(
          mock(JwtAuthenticationFilter.class)
  );

  var cors = config.corsConfigurationSource(
          " , http://localhost:5173, "
  );

  var configuration = cors.getCorsConfiguration(
          new MockHttpServletRequest()
  );

  assertNotNull(configuration);

  assertEquals(
          1,
          configuration.getAllowedOrigins().size()
  );

  assertEquals(
          "http://localhost:5173",
          configuration.getAllowedOrigins().get(0)
  );
 }
}
