package cl.aquachile.backend.archivo.repository;
import cl.aquachile.backend.archivo.entity.CvAdjunto;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface CvAdjuntoRepository extends JpaRepository<CvAdjunto,UUID> {
    Optional<CvAdjunto> findByPostulacionId(UUID postulacionId);
}
