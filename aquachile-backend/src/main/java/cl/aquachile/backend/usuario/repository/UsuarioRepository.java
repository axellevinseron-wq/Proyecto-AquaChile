package cl.aquachile.backend.usuario.repository;
import cl.aquachile.backend.usuario.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {
    default Optional<Usuario> buscarPorId(UUID id) { return findById(id); }
    Optional<Usuario> findByCorreoIgnoreCase(String correo);
    boolean existsByCorreoIgnoreCase(String correo);
    default Optional<Usuario> buscarPorCorreo(String correo) {
        return correo == null ? Optional.empty() : findByCorreoIgnoreCase(correo.trim());
    }
    default boolean existePorCorreo(String correo) {
        return correo != null && existsByCorreoIgnoreCase(correo.trim());
    }
    default List<Usuario> listar() { return findAll(org.springframework.data.domain.Sort.by("nombre").ascending()); }
    default Usuario guardar(Usuario usuario) { return save(usuario); }
}
