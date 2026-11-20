package cl.aquachile.backend.solicitudacceso.repository;

import cl.aquachile.backend.solicitudacceso.entity.SolicitudAcceso;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface SolicitudAccesoRepository extends JpaRepository<SolicitudAcceso, UUID> {
    Optional<SolicitudAcceso> findByCorreoIgnoreCaseAndCodigoSeguimiento(String correo, String codigoSeguimiento);
    boolean existsByCodigoSeguimiento(String codigoSeguimiento);
}
