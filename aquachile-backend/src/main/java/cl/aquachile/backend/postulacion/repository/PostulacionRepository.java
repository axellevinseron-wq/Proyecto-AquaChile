package cl.aquachile.backend.postulacion.repository;
import cl.aquachile.backend.postulacion.entity.Postulacion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface PostulacionRepository extends JpaRepository<Postulacion, UUID> {
    default List<Postulacion> listar() { return findAll(); }
    default Optional<Postulacion> obtener(UUID id) { return findById(id); }
    default Postulacion guardar(Postulacion value) { return save(value); }
    default void eliminar(UUID id) { deleteById(id); }
}
