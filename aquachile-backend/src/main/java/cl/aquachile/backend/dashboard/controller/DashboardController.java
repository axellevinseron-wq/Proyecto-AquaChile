package cl.aquachile.backend.dashboard.controller;

import cl.aquachile.backend.dashboard.service.DashboardService;import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;import java.util.*;
@SecurityRequirement(name="bearerAuth")
@RestController @RequestMapping("/api/dashboard") public class DashboardController {private final DashboardService service;public DashboardController(DashboardService service){this.service=service;}@GetMapping("/resumen")public Map<String,Integer> resumen(){return service.resumen();}}
