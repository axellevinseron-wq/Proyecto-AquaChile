package cl.aquachile.backend.auth.service;

import cl.aquachile.backend.auth.dto.LoginRequest;
import cl.aquachile.backend.auth.dto.LoginResponse;
import cl.aquachile.backend.usuario.dto.UsuarioResponse;
import cl.aquachile.backend.usuario.entity.Usuario;
import cl.aquachile.backend.usuario.repository.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
    private final AuthenticationManager authenticationManager;
    private final UsuarioRepository repository;
    private final JwtService jwtService;

    public AuthService(AuthenticationManager authenticationManager, UsuarioRepository repository,
                       JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.repository = repository;
        this.jwtService = jwtService;
    }

    public LoginResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(
                    request.correo().trim(), request.password()));
        } catch (BadCredentialsException | org.springframework.security.authentication.DisabledException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
        }
        Usuario usuario = repository.buscarPorCorreo(request.correo())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas"));
        return new LoginResponse(jwtService.generarToken(usuario.correo(), usuario.rol()),
                "Bearer", usuario.correo(), usuario.nombre(), usuario.rol(), jwtService.obtenerExpiracion());
    }

    public UsuarioResponse obtenerUsuarioAutenticado(String correo) {
        Usuario usuario = repository.buscarPorCorreo(correo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no disponible"));
        if (!usuario.activo()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario desactivado");
        }
        return UsuarioResponse.desde(usuario);
    }
}
