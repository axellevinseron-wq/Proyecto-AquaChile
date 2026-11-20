package cl.aquachile.backend.oferta.entity;
import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonAutoDetect;
import java.time.LocalDate;
import java.util.UUID;
@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY)
@Entity @Table(name="oferta")
public class Oferta {
 @Id private UUID id;
 @Column(nullable=false) private String titulo;
 @Column(columnDefinition="text") private String descripcion;
 private String ubicacion;
 private boolean publicada;
 private String categoria;
 private String modalidad;
 private LocalDate fechaPublicacion;
 private Integer cupos;
 @Column(columnDefinition="text") private String funcionesPrincipales;
 @Column(columnDefinition="text") private String requisitos;
 @Column(columnDefinition="text") private String beneficios;
 private String rangoSalarial;
 protected Oferta() {}
 public Oferta(UUID id,String titulo,String descripcion,String ubicacion,boolean publicada){this(id,titulo,descripcion,ubicacion,publicada,null,null,null,null,null,null,null,null);}
 public Oferta(UUID id,String titulo,String descripcion,String ubicacion,boolean publicada,String categoria,String modalidad,LocalDate fechaPublicacion,Integer cupos,String funcionesPrincipales,String requisitos,String beneficios,String rangoSalarial){
 this.id=id;this.titulo=titulo;this.descripcion=descripcion;this.ubicacion=ubicacion;this.publicada=publicada;this.categoria=categoria;this.modalidad=modalidad;this.fechaPublicacion=fechaPublicacion;this.cupos=cupos;this.funcionesPrincipales=funcionesPrincipales;this.requisitos=requisitos;this.beneficios=beneficios;this.rangoSalarial=rangoSalarial;}
 public UUID id(){return id;} public String titulo(){return titulo;} public String descripcion(){return descripcion;} public String ubicacion(){return ubicacion;} public boolean publicada(){return publicada;}
 public String categoria(){return categoria;} public String modalidad(){return modalidad;} public LocalDate fechaPublicacion(){return fechaPublicacion;} public Integer cupos(){return cupos;}
 public String funcionesPrincipales(){return funcionesPrincipales;} public String requisitos(){return requisitos;} public String beneficios(){return beneficios;} public String rangoSalarial(){return rangoSalarial;}
}
