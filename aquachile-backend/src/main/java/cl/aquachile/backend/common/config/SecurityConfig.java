
package cl.aquachile.backend.common.config;

import cl.aquachile.backend.auth.service.JwtAuthenticationFilter;
import cl.aquachile.backend.usuario.service.AquaChileUserDetailsService;

import org.springframework.context.annotation.Bean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider(
            AquaChileUserDetailsService detailsService,
            PasswordEncoder encoder) {

        DaoAuthenticationProvider provider =
                new DaoAuthenticationProvider(detailsService);

        provider.setPasswordEncoder(encoder);
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(
            DaoAuthenticationProvider provider) {

        return new ProviderManager(provider);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${app.cors.origins:http://localhost:5173,http://localhost:5174}")
            String origins) {

        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOrigins(
                Arrays.stream(origins.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .toList()
        );

        config.setAllowedMethods(
                List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
        );

        config.setAllowedHeaders(
                List.of("Authorization", "Content-Type", "Accept")
        );

        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", config);

        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            DaoAuthenticationProvider provider) throws Exception {

        return http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )
                .authenticationProvider(provider)
                .authorizeHttpRequests(auth -> auth

                        // Preflight CORS
                        .requestMatchers(HttpMethod.OPTIONS, "/**")
                        .permitAll()

                        // Inicio de sesión público
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/auth/login"
                        ).permitAll()

                        // Documentación Swagger
                        .requestMatchers(
                                HttpMethod.GET,
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).permitAll()

                        // Endpoints públicos
                        .requestMatchers(
                                "/api/health",
                                "/api/publico/ofertas/**"
                        ).permitAll()

                        // Postulaciones públicas
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/publico/postulaciones"
                        ).permitAll()

                        // Solicitudes públicas de acceso
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/publico/solicitudes-acceso",
                                "/api/publico/solicitudes-acceso/consultar"
                        ).permitAll()

                        // Administración de solicitudes de acceso
                        // y descarga de CV: solo ADMIN
                        .requestMatchers(
                                "/api/admin/solicitudes-acceso/**"
                        ).hasRole("ADMIN")

                        // Administración de usuarios: solo ADMIN
                        .requestMatchers(
                                "/api/usuarios/**"
                        ).hasRole("ADMIN")

                        // NUEVO:
                        // ADMIN, ANALISTA y EVALUADOR pueden
                        // CONSULTAR ofertas de trabajo.
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/ofertas",
                                "/api/ofertas/**"
                        ).hasAnyRole(
                                "ADMIN",
                                "ANALISTA_RECLUTAMIENTO",
                                "EVALUADOR"
                        )

                        // Crear, editar y eliminar ofertas:
                        // solo ADMIN y ANALISTA.
                        .requestMatchers(
                                "/api/ofertas",
                                "/api/ofertas/**"
                        ).hasAnyRole(
                                "ADMIN",
                                "ANALISTA_RECLUTAMIENTO"
                        )

                        // Solicitudes de evaluación
                        .requestMatchers(
                                "/api/solicitudes/**"
                        ).hasAnyRole(
                                "ADMIN",
                                "EVALUADOR"
                        )

                        // Postulantes, postulaciones, archivos,
                        // IA e indicadores
                        .requestMatchers(
                                "/api/postulantes/**",
                                "/api/postulaciones/**",
                                "/api/archivos/**",
                                "/api/ia/**",
                                "/api/dashboard/**"
                        ).hasAnyRole(
                                "ADMIN",
                                "ANALISTA_RECLUTAMIENTO",
                                "EVALUADOR"
                        )

                        // Otros endpoints requieren autenticación
                        .anyRequest().authenticated()
                )
                .addFilterBefore(
                        jwtFilter,
                        UsernamePasswordAuthenticationFilter.class
                )
                .build();
    }
}