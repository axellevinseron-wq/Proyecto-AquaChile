package cl.aquachile.backend.ia.controller;

import cl.aquachile.backend.ia.service.IaService;import cl.aquachile.backend.ia.dto.EvaluacionRequest;import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;import jakarta.validation.Valid;import java.util.*;
@SecurityRequirement(name="bearerAuth")
@RestController @RequestMapping("/api/ia") public class IaController {private final IaService service;public IaController(IaService service){this.service=service;}@PostMapping("/analizar")public Map<String,Object> analizar(@Valid @RequestBody EvaluacionRequest r){return service.analizar(r.texto());}}
