package cl.aquachile.backend.usuario.service;

import cl.aquachile.backend.usuario.entity.Rol;
import cl.aquachile.backend.usuario.entity.Usuario;
import cl.aquachile.backend.usuario.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.UUID;

@Configuration
public class AdminBootstrap {
    @Bean
    ApplicationRunner initializeAdmin(UsuarioRepository repository, PasswordEncoder encoder,
            @Value("${app.admin.email:admin@aquachile.cl}") String email,
            @Value("${app.admin.initial-password:}") String password) {
        return args -> {
            if (!repository.existePorCorreo(email) && password != null && !password.isBlank()) {
                repository.guardar(new Usuario(UUID.randomUUID(), "Administrador AquaChile",
                        email.trim().toLowerCase(java.util.Locale.ROOT), encoder.encode(password), Rol.ADMIN, true));
            }
        };
    }
}
