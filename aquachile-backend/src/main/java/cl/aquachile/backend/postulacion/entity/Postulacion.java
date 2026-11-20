package cl.aquachile.backend.postulacion.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonAutoDetect;
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

    protected Postulacion() {}

    public Postulacion(UUID id, UUID ofertaId, UUID postulanteId, String estado) {
        this.id = id;
        this.ofertaId = ofertaId;
        this.postulanteId = postulanteId;
        this.estado = estado;
    }

    public UUID id() { return id; }
    public UUID ofertaId() { return ofertaId; }
    public UUID postulanteId() { return postulanteId; }
    public String estado() { return estado; }
}
