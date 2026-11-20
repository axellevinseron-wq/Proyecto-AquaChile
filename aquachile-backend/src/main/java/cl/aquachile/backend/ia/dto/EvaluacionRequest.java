package cl.aquachile.backend.ia.dto;

import jakarta.validation.constraints.NotBlank;
public record EvaluacionRequest(@NotBlank String texto){}
