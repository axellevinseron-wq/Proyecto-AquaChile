package cl.aquachile.backend.postulacion.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonAutoDetect;
import java.time.Instant;
import java.util.UUID;

@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY)
@Entity
@Table(name = "postulaciones")
public class Postulacion {
    @Id
    private UUID id;
    @Column(name = "oferta_id")
    private UUID ofertaId;
    @Column(name = "postulante_id")
    private UUID postulanteId;
    private String estado;
    @Column(name = "fecha_creacion")
    private Instant fechaCreacion;
    @Column(columnDefinition = "text")
    private String mensaje;

    protected Postulacion() {}

    public Postulacion(UUID id, UUID ofertaId, UUID postulanteId, String estado) {
        this(id, ofertaId, postulanteId, estado, Instant.now(), "");
    }

    public Postulacion(UUID id, UUID ofertaId, UUID postulanteId, String estado,
            Instant fechaCreacion, String mensaje) {
        this.id = id;
        this.ofertaId = ofertaId;
        this.postulanteId = postulanteId;
        this.estado = estado;
        this.fechaCreacion = fechaCreacion;
        this.mensaje = mensaje;
    }

    public UUID id() { return id; }
    public UUID ofertaId() { return ofertaId; }
    public UUID postulanteId() { return postulanteId; }
    public String estado() { return estado; }
    public Instant fechaCreacion() { return fechaCreacion; }
    public String mensaje() { return mensaje; }
}
