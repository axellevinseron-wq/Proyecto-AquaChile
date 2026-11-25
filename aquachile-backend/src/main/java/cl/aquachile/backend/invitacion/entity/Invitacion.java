package cl.aquachile.backend.invitacion.entity;

import cl.aquachile.backend.usuario.entity.Rol;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "invitacion")
public class Invitacion {
    @Id
    private UUID id;
    @Column(nullable = false, unique = true, length = 64)
    private String tokenHash;
    @Column(nullable = false, length = 120)
    private String nombre;
    @Column(nullable = false, length = 254)
    private String correo;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private Rol rol;
    @Column(nullable = false, length = 254)
    private String creadaPor;
    @Column(nullable = false)
    private Instant creada;
    @Column(nullable = false)
    private Instant expira;
    private Instant usada;
    private Instant revocada;

    protected Invitacion() {}

    public Invitacion(UUID id, String tokenHash, String nombre, String correo, Rol rol,
            String creadaPor, Instant creada, Instant expira) {
        this.id = id;
        this.tokenHash = tokenHash;
        this.nombre = nombre;
        this.correo = correo;
        this.rol = rol;
        this.creadaPor = creadaPor;
        this.creada = creada;
        this.expira = expira;
    }

    public UUID id() { return id; }
    public String tokenHash() { return tokenHash; }
    public String nombre() { return nombre; }
    public String correo() { return correo; }
    public Rol rol() { return rol; }
    public String creadaPor() { return creadaPor; }
    public Instant creada() { return creada; }
    public Instant expira() { return expira; }
    public Instant usada() { return usada; }
    public Instant revocada() { return revocada; }

    public void marcarUsada(Instant instante) { usada = instante; }
    public void revocar(Instant instante) { revocada = instante; }
}
