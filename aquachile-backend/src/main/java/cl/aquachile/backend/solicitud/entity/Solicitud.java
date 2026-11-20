package cl.aquachile.backend.solicitud.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonAutoDetect;
import java.util.UUID;
import java.time.LocalDate;

@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY)
@Entity
@Table(name = "solicitud")
public class Solicitud {
    @Id
    private UUID id;
    @Column(name = "postulacion_id")
    private UUID postulacionId;
    @Column(name = "evaluador_id")
    private UUID evaluadorId;
    private String estado;
    @Column(columnDefinition = "text")
    private String observaciones;

    private LocalDate fechaSolicitud;
    private LocalDate fechaEvaluacion;
    protected Solicitud() {}

    public Solicitud(UUID id, UUID postulacionId, UUID evaluadorId, String estado, String observaciones) {
        this.id = id;
        this.postulacionId = postulacionId;
        this.evaluadorId = evaluadorId;
        this.estado = estado;
        this.observaciones = observaciones;
    }
    public Solicitud(UUID id,UUID postulacionId,UUID evaluadorId,String estado,String observaciones,LocalDate fechaSolicitud,LocalDate fechaEvaluacion){
        this(id,postulacionId,evaluadorId,estado,observaciones);
        this.fechaSolicitud=fechaSolicitud;
        this.fechaEvaluacion=fechaEvaluacion;
    }

    public LocalDate fechaSolicitud(){return fechaSolicitud;}
    public LocalDate fechaEvaluacion(){return fechaEvaluacion;}
    public UUID id() { return id; }
    public UUID postulacionId() { return postulacionId; }
    public UUID evaluadorId() { return evaluadorId; }
    public String estado() { return estado; }
    public String observaciones() { return observaciones; }
}
