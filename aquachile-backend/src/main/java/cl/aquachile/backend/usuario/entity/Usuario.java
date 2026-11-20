package cl.aquachile.backend.usuario.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonAutoDetect;
import java.util.UUID;


@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY)
@Entity
@Table(name = "usuario")
public class Usuario {
    @Id
    private UUID id;
    private String nombre;
    @Column(nullable = false, unique = true, length = 254)
    private String correo;
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private Rol rol;
    private boolean activo;

    protected Usuario() {}

    public Usuario(UUID id, String nombre, String correo, String passwordHash, Rol rol, boolean activo) {
        this.id = id;
        this.nombre = nombre;
        this.correo = correo;
        this.passwordHash = passwordHash;
        this.rol = rol;
        this.activo = activo;
    }

    public UUID id() { return id; }
    public String nombre() { return nombre; }
    public String correo() { return correo; }
    public String passwordHash() { return passwordHash; }
    public Rol rol() { return rol; }
    public boolean activo() { return activo; }
}
