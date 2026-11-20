
package cl.aquachile.backend.ia.controller;

import cl.aquachile.backend.archivo.repository.CvAdjuntoRepository;
import cl.aquachile.backend.ia.service.IaService;
import cl.aquachile.backend.ia.service.PdfTextoService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/ia")
@SecurityRequirement(name = "bearerAuth")
public class IaCvController {

    private final CvAdjuntoRepository adjuntos;
    private final PdfTextoService pdfTextoService;
    private final IaService iaService;
    private final Path root;

    public IaCvController(
            CvAdjuntoRepository adjuntos,
            PdfTextoService pdfTextoService,
            IaService iaService,
            @Value("${app.upload.dir:./uploads}") String dir
    ) {
        this.adjuntos = adjuntos;
        this.pdfTextoService = pdfTextoService;
        this.iaService = iaService;
        this.root = Path.of(dir).toAbsolutePath().normalize();
    }

    @PostMapping("/postulaciones/{id}/analizar-cv")
    public Map<String, Object> analizarCv(
            @PathVariable UUID id
    ) {

        var cv = adjuntos.findByPostulacionId(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "La postulacion no tiene CV asociado"
                ));

        Path archivo = root.resolve(
                cv.rutaRelativa()
        ).normalize();

        if (!archivo.startsWith(root)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Ruta de archivo no permitida"
            );
        }

        if (!archivo.getFileName().toString()
                .toLowerCase(java.util.Locale.ROOT)
                .endsWith(".pdf")) {

            throw new ResponseStatusException(
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "El analisis de IA admite PDF"
            );
        }

        try {
            byte[] contenido = Files.readAllBytes(archivo);

            String texto = pdfTextoService.extraerTexto(contenido);

            // IaService admite como maximo 3000 caracteres.
            // Se limita el texto antes de enviarlo a Groq.
            if (texto.length() > 3000) {
                texto = texto.substring(0, 3000);
            }

            return iaService.analizar(texto);

        } catch (IOException ex) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "No fue posible recuperar el CV"
            );
        }
    }
}
