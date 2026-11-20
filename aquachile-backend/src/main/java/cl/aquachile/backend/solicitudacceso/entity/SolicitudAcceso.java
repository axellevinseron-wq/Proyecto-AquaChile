package cl.aquachile.backend.solicitudacceso.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "solicitud_acceso")
public class SolicitudAcceso {
    @Id
    private UUID id;
    @Column(nullable = false) private String nombre;
    @Column(nullable = false) private String apellido;
    @Column(nullable = false) private String rut;
    @Column(nullable = false) private String telefono;
    @Column(nullable = false) private String correo;
    @Column(nullable = false) private String usuarioSolicitado;
    @Column(columnDefinition = "text", nullable = false) private String motivo;
    @Column(nullable = false) private String estado;
    @Column(nullable = false, unique = true) private String codigoSeguimiento;
    @Column(nullable = false) private LocalDateTime fechaCreacion;
    @Column(columnDefinition = "text") private String comentarioAdministrador;

    @JdbcTypeCode(SqlTypes.VARBINARY)
    @Column(name = "cv_pdf", columnDefinition = "bytea")
    private byte[] cvPdf;
    @Column(name = "cv_nombre")
    private String cvNombre;

    protected SolicitudAcceso() {}

    public SolicitudAcceso(String nombre, String apellido, String rut, String telefono,
                           String correo, String usuarioSolicitado, String motivo, String codigoSeguimiento) {
        this.id = UUID.randomUUID();
        this.nombre = nombre;
        this.apellido = apellido;
        this.rut = rut;
        this.telefono = telefono;
        this.correo = correo;
        this.usuarioSolicitado = usuarioSolicitado;
        this.motivo = motivo;
        this.codigoSeguimiento = codigoSeguimiento;
        this.estado = "PENDIENTE";
        this.fechaCreacion = LocalDateTime.now();
    }
    public UUID getId() { return id; }
    public String getNombre() { return nombre; }
    public String getApellido() { return apellido; }
    public String getRut() { return rut; }
    public String getTelefono() { return telefono; }
    public String getCorreo() { return correo; }
    public String getUsuarioSolicitado() { return usuarioSolicitado; }
    public String getMotivo() { return motivo; }
    public String getEstado() { return estado; }
    public String getCodigoSeguimiento() { return codigoSeguimiento; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public String getComentarioAdministrador() { return comentarioAdministrador; }
    public byte[] getCvPdf() { return cvPdf; }
    public String getCvNombre() { return cvNombre; }
    public void adjuntarCv(String nombre, byte[] contenido) {
        this.cvNombre = nombre;
        this.cvPdf = contenido;
    }
    public void cambiarEstado(String estado, String comentario) {
        this.estado = estado;
        this.comentarioAdministrador = comentario;
    }
}
