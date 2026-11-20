package cl.aquachile.backend.usuario.service;

import cl.aquachile.backend.usuario.dto.*;
import cl.aquachile.backend.usuario.entity.Rol;
import cl.aquachile.backend.usuario.entity.Usuario;
import cl.aquachile.backend.usuario.repository.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class UsuarioService {
    private final UsuarioRepository repository;
    private final PasswordEncoder encoder;

    public UsuarioService(UsuarioRepository repository, PasswordEncoder encoder) {
        this.repository = repository;
        this.encoder = encoder;
    }

    public Usuario buscarPorCorreo(String correo) {
        return repository.buscarPorCorreo(correo)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
    }

    public boolean existePorCorreo(String correo) {
        return repository.existePorCorreo(correo);
    }

    public List<UsuarioResponse> listar() {
        return repository.listar().stream().map(UsuarioResponse::desde).toList();
    }

    public UsuarioResponse obtener(UUID id) {
        return UsuarioResponse.desde(buscar(id));
    }

    public synchronized UsuarioResponse crear(CrearUsuarioRequest request) {
        String correo = normalizarCorreo(request.correo());
        if (repository.existePorCorreo(correo)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El correo ya está registrado");
        }
        Usuario nuevo = new Usuario(UUID.randomUUID(), request.nombre().trim(), correo,
                encoder.encode(request.password()), request.rol(), true);
        return UsuarioResponse.desde(repository.guardar(nuevo));
    }

    public synchronized UsuarioResponse actualizar(UUID id, ActualizarUsuarioRequest request, String actorCorreo) {
        Usuario actual = buscar(id);
        String correo = normalizarCorreo(request.correo());
        repository.buscarPorCorreo(correo).ifPresent(otro -> {
            if (!otro.id().equals(id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "El correo ya está registrado");
            }
        });
        if (actual.correo().equalsIgnoreCase(actorCorreo) && actual.rol() == Rol.ADMIN
                && request.rol() != Rol.ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No puedes quitarte tu propio rol ADMIN");
        }
        if (actual.rol() == Rol.ADMIN && request.rol() != Rol.ADMIN &&
                repository.listar().stream().noneMatch(u -> !u.id().equals(id) && u.activo() && u.rol() == Rol.ADMIN)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debe existir al menos un administrador activo");
        }
        Usuario modificado = new Usuario(id, request.nombre().trim(), correo,
                actual.passwordHash(), request.rol(), actual.activo());
        return UsuarioResponse.desde(repository.guardar(modificado));
    }

    public synchronized UsuarioResponse cambiarEstado(UUID id, CambiarEstadoRequest request, String actorCorreo) {
        Usuario actual = buscar(id);
        if (actual.correo().equalsIgnoreCase(actorCorreo) && !request.activo()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No puedes desactivar tu propia cuenta");
        }
        if (!request.activo() && actual.rol() == Rol.ADMIN &&
                repository.listar().stream().noneMatch(u -> !u.id().equals(id) && u.activo() && u.rol() == Rol.ADMIN)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debe existir al menos un administrador activo");
        }
        Usuario modificado = new Usuario(id, actual.nombre(), actual.correo(),
                actual.passwordHash(), actual.rol(), request.activo());
        return UsuarioResponse.desde(repository.guardar(modificado));
    }

    public synchronized void cambiarPassword(UUID id, CambiarPasswordRequest request) {
        Usuario actual = buscar(id);
        repository.guardar(new Usuario(id, actual.nombre(), actual.correo(),
                encoder.encode(request.nuevaPassword()), actual.rol(), actual.activo()));
    }

    private Usuario buscar(UUID id) {
        return repository.buscarPorId(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
    }

    private String normalizarCorreo(String correo) {
        return correo.trim().toLowerCase(Locale.ROOT);
    }
}
