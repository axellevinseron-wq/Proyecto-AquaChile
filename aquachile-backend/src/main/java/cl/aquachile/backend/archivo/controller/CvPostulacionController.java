
package cl.aquachile.backend.archivo.controller;

import cl.aquachile.backend.archivo.entity.CvAdjunto;
import cl.aquachile.backend.archivo.repository.CvAdjuntoRepository;
import cl.aquachile.backend.postulacion.repository.PostulacionRepository;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.beans.factory.annotation.Autowired;

import java.io.IOException;
import java.nio.file.*;
import java.util.Map;
import java.util.UUID;

@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/postulaciones")
public class CvPostulacionController {

    private final CvAdjuntoRepository adjuntos;
    private final PostulacionRepository postulaciones;
    private final Path root;

    @Autowired
    public CvPostulacionController(
            CvAdjuntoRepository adjuntos,
            PostulacionRepository postulaciones,
            @Value("${app.upload.dir:./uploads}") String dir
    ) {
        this.adjuntos = adjuntos;
        this.postulaciones = postulaciones;
        this.root = Path.of(dir).toAbsolutePath().normalize();
    }

    // Constructor compatible con las pruebas anteriores
    public CvPostulacionController(
            CvAdjuntoRepository adjuntos,
            String dir
    ) {
        this(adjuntos, null, dir);
    }

    @PutMapping("/{id}/cv/{archivoId}")
    public Map<String, Object> asociar(
            @PathVariable UUID id,
            @PathVariable UUID archivoId
    ) {
        if (!postulaciones.existsById(id)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Postulacion no encontrada"
            );
        }

        Path pdf = root.resolve(archivoId + ".pdf");
        Path docx = root.resolve(archivoId + ".docx");

        Path archivo;

        if (Files.isRegularFile(pdf)) {
            archivo = pdf;
        } else if (Files.isRegularFile(docx)) {
            archivo = docx;
        } else {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Archivo CV no encontrado"
            );
        }

        var existente = adjuntos.findByPostulacionId(id);

        if (existente.isPresent()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "La postulacion ya tiene un CV asociado"
            );
        }

        CvAdjunto cv = new CvAdjunto(
                archivoId,
                id,
                archivo.getFileName().toString(),
                archivo.getFileName().toString()
        );

        adjuntos.save(cv);

        return Map.of(
                "mensaje", "CV asociado correctamente",
                "postulacionId", id,
                "archivoId", archivoId
        );
    }

    @GetMapping("/{id}/cv")
    public ResponseEntity<byte[]> descargar(@PathVariable UUID id) {

        var cv = adjuntos.findByPostulacionId(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "CV no encontrado"
                ));

        Path path = root.resolve(cv.rutaRelativa()).normalize();

        if (!path.startsWith(root)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Ruta no permitida"
            );
        }

        try {
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .header(
                            HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"cv-" + cv.id() + "\""
                    )
                    .body(Files.readAllBytes(path));

        } catch (IOException ex) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "CV no disponible"
            );
        }
    }
}
