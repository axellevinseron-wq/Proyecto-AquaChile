package cl.aquachile.backend.solicitud.repository;
import cl.aquachile.backend.solicitud.entity.Solicitud;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface SolicitudRepository extends JpaRepository<Solicitud, UUID> {
    default List<Solicitud> listar() { return findAll(); }
    default Optional<Solicitud> obtener(UUID id) { return findById(id); }
    default Solicitud guardar(Solicitud value) { return save(value); }
    default void eliminar(UUID id) { deleteById(id); }
}
