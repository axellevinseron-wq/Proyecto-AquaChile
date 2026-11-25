package cl.aquachile.backend.entrevista.repository;

import cl.aquachile.backend.entrevista.entity.Entrevista;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EntrevistaRepository extends JpaRepository<Entrevista, UUID> {
    Optional<Entrevista> findByPostulacionId(UUID postulacionId);
    List<Entrevista> findAllByOrderByInicioAsc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Entrevista e where e.postulacionId = :postulacionId")
    Optional<Entrevista> buscarPorPostulacionParaActualizar(@Param("postulacionId") UUID postulacionId);
}
