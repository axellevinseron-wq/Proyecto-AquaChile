package cl.aquachile.backend.invitacion.repository;

import cl.aquachile.backend.invitacion.entity.Invitacion;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InvitacionRepository extends JpaRepository<Invitacion, UUID> {
    Optional<Invitacion> findByTokenHash(String tokenHash);
    boolean existsByCorreoIgnoreCaseAndUsadaIsNullAndRevocadaIsNullAndExpiraAfter(String correo, Instant ahora);
    List<Invitacion> findAllByOrderByCreadaDesc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Invitacion i where i.tokenHash = :tokenHash")
    Optional<Invitacion> buscarPorHashParaActualizar(@Param("tokenHash") String tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Invitacion i where i.id = :id")
    Optional<Invitacion> buscarPorIdParaActualizar(@Param("id") UUID id);
}
