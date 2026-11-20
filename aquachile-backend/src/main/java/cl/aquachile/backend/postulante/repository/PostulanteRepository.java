package cl.aquachile.backend.postulante.repository;
import cl.aquachile.backend.postulante.entity.Postulante;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface PostulanteRepository extends JpaRepository<Postulante, UUID> {
    default List<Postulante> listar() { return findAll(); }
    default Optional<Postulante> obtener(UUID id) { return findById(id); }
    default Postulante guardar(Postulante value) { return save(value); }
    default void eliminar(UUID id) { deleteById(id); }
}
