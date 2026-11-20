package cl.aquachile.backend.oferta.repository;
import cl.aquachile.backend.oferta.entity.Oferta;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface OfertaRepository extends JpaRepository<Oferta, UUID> {
    List<Oferta> findByPublicadaTrueOrderByTituloAsc();
    default List<Oferta> listar() { return findAll(); }
    default Optional<Oferta> obtener(UUID id) { return findById(id); }
    default Oferta guardar(Oferta value) { return save(value); }
    default void eliminar(UUID id) { deleteById(id); }
}
