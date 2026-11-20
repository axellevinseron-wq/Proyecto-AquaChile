package cl.aquachile.backend.oferta.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
public record OfertaRequest(@NotBlank String titulo,String descripcion,String ubicacion,boolean publicada,String categoria,
 @Pattern(regexp="(?i)PRESENCIAL|HIBRIDA|REMOTA",message="Modalidad debe ser PRESENCIAL, HIBRIDA o REMOTA") String modalidad,
 LocalDate fechaPublicacion,@Positive Integer cupos,String funcionesPrincipales,String requisitos,String beneficios,String rangoSalarial) {}
