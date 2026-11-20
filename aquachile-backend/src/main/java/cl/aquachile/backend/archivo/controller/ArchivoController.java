package cl.aquachile.backend.archivo.controller;

import cl.aquachile.backend.archivo.service.ArchivoService;import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;import org.springframework.web.multipart.MultipartFile;import org.springframework.http.*;import java.util.*;
@SecurityRequirement(name="bearerAuth")
@RestController @RequestMapping("/api/archivos") public class ArchivoController {
 private final ArchivoService service;public ArchivoController(ArchivoService service){this.service=service;}
 @PostMapping(value="/cv",consumes=MediaType.MULTIPART_FORM_DATA_VALUE) public Map<String,UUID> subir(@RequestParam("file") MultipartFile file){return Map.of("id",service.guardar(file));}
 @GetMapping("/{id}") public ResponseEntity<byte[]> descargar(@PathVariable UUID id){return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM).header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=cv-"+id).body(service.leer(id));}
}
