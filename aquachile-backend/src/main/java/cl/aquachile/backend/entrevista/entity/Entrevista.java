package cl.aquachile.backend.entrevista.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "entrevista")
public class Entrevista {
    @Id
    private UUID id;
    @Column(name = "postulacion_id", nullable = false, unique = true)
    private UUID postulacionId;
    @Column(nullable = false, length = 32)
    private String eventoId;
    @Column(nullable = false, length = 40)
    private String estado;
    @Column(nullable = false, length = 254)
    private String organizador;
    @Column(nullable = false)
    private Instant inicio;
    @Column(nullable = false)
    private Instant fin;
    @Column(nullable = false, length = 80)
    private String zonaHoraria;
    @Column(length = 1000)
    private String enlaceCalendar;
    @Column(length = 1000)
    private String enlaceMeet;
    @Column(nullable = false, length = 36)
    private String solicitudMeetId;

    protected Entrevista() {}

    public Entrevista(UUID id, UUID postulacionId, String eventoId, String estado, String organizador,
            Instant inicio, Instant fin, String zonaHoraria, String enlaceCalendar,
            String enlaceMeet, String solicitudMeetId) {
        this.id = id;
        this.postulacionId = postulacionId;
        this.eventoId = eventoId;
        this.estado = estado;
        this.organizador = organizador;
        this.inicio = inicio;
        this.fin = fin;
        this.zonaHoraria = zonaHoraria;
        this.enlaceCalendar = enlaceCalendar;
        this.enlaceMeet = enlaceMeet;
        this.solicitudMeetId = solicitudMeetId;
    }

    public UUID id() { return id; }
    public UUID postulacionId() { return postulacionId; }
    public String eventoId() { return eventoId; }
    public String estado() { return estado; }
    public String organizador() { return organizador; }
    public Instant inicio() { return inicio; }
    public Instant fin() { return fin; }
    public String zonaHoraria() { return zonaHoraria; }
    public String enlaceCalendar() { return enlaceCalendar; }
    public String enlaceMeet() { return enlaceMeet; }
    public String solicitudMeetId() { return solicitudMeetId; }

    public void agendada(String enlaceEvento, String enlaceReunion) {
        estado = "Agendada";
        enlaceCalendar = enlaceEvento;
        enlaceMeet = enlaceReunion;
    }

    public void marcarError() { estado = "Error"; }

    public void reprogramar(Instant nuevoInicio, Instant nuevoFin, String nuevaZona,
            String enlaceEvento, String enlaceReunion) {
        inicio = nuevoInicio;
        fin = nuevoFin;
        zonaHoraria = nuevaZona;
        if (enlaceEvento != null && !enlaceEvento.isBlank()) enlaceCalendar = enlaceEvento;
        if (enlaceReunion != null && !enlaceReunion.isBlank()) enlaceMeet = enlaceReunion;
    }

    public void cancelar() { estado = "Cancelada"; }
}
