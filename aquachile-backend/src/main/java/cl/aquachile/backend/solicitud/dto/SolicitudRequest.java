package cl.aquachile.backend.solicitud.dto;
import jakarta.validation.constraints.*;
import java.util.UUID;
import java.time.LocalDate;
public record SolicitudRequest(@NotNull UUID postulacionId,UUID evaluadorId,String estado,String observaciones,LocalDate fechaSolicitud,LocalDate fechaEvaluacion) {}
