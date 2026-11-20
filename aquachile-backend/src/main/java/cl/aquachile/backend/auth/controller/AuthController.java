package cl.aquachile.backend.auth.controller;

import cl.aquachile.backend.auth.dto.LoginRequest;
import cl.aquachile.backend.auth.dto.LoginResponse;
import cl.aquachile.backend.auth.service.AuthService;
import cl.aquachile.backend.usuario.dto.UsuarioResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService service;

    public AuthController(AuthService service) {
        this.service = service;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return service.login(request);
    }

    @GetMapping("/me")
    public UsuarioResponse me(Authentication authentication) {
        return service.obtenerUsuarioAutenticado(authentication.getName());
    }
}
