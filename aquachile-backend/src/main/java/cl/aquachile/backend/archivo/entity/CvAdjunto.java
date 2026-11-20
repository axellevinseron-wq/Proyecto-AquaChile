package cl.aquachile.backend.archivo.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonAutoDetect;
import java.util.UUID;

@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY)
@Entity
@Table(name = "cv_adjunto")
public class CvAdjunto {
    @Id private UUID id;
    @Column(name="postulacion_id",nullable=false,unique=true) private UUID postulacionId;
    @Column(name="nombre_archivo",nullable=false) private String nombreArchivo;
    @Column(name="ruta_relativa",nullable=false) private String rutaRelativa;
    protected CvAdjunto() {}
    public CvAdjunto(UUID id,UUID postulacionId,String nombreArchivo,String rutaRelativa) {
        this.id=id;this.postulacionId=postulacionId;this.nombreArchivo=nombreArchivo;this.rutaRelativa=rutaRelativa;
    }
    public UUID id(){return id;}
    public UUID postulacionId(){return postulacionId;}
    public String nombreArchivo(){return nombreArchivo;}
    public String rutaRelativa(){return rutaRelativa;}
}
