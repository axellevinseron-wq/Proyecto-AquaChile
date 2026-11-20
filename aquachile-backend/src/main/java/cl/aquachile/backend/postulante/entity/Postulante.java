package cl.aquachile.backend.postulante.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonAutoDetect;
import java.util.UUID;

@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY)
@Entity
@Table(name = "postulante")
public class Postulante {
    @Id
    private UUID id;
    private String nombre;
    private String correo;
    private String telefono;
    private String rut;

    protected Postulante() {}

    public Postulante(UUID id, String nombre, String correo, String telefono, String rut) {
        this.id = id;
        this.nombre = nombre;
        this.correo = correo;
        this.telefono = telefono;
        this.rut = rut;
    }

    public UUID id() { return id; }
    public String nombre() { return nombre; }
    public String correo() { return correo; }
    public String telefono() { return telefono; }
    public String rut() { return rut; }
}
