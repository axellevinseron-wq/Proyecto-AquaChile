package cl.aquachile.backend.postulacion.controller;

import cl.aquachile.backend.archivo.entity.CvAdjunto;
import cl.aquachile.backend.archivo.repository.CvAdjuntoRepository;
import cl.aquachile.backend.oferta.repository.OfertaRepository;
import cl.aquachile.backend.postulante.entity.Postulante;
import cl.aquachile.backend.postulante.repository.PostulanteRepository;
import cl.aquachile.backend.postulacion.entity.Postulacion;
import cl.aquachile.backend.postulacion.repository.PostulacionRepository;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.nio.file.*;
import java.util.*;

@RestController
@RequestMapping("/api/publico/postulaciones")
public class PostulacionPublicaController {
    private static final long MAX_CV_BYTES = 10L * 1024 * 1024;
    private final OfertaRepository ofertas;
    private final PostulanteRepository postulantes;
    private final PostulacionRepository postulaciones;
    private final CvAdjuntoRepository adjuntos;
    private final Path root;
    public PostulacionPublicaController(OfertaRepository ofertas, PostulanteRepository postulantes,
            PostulacionRepository postulaciones, CvAdjuntoRepository adjuntos,
            @Value("${app.upload.dir:./uploads}") String dir) {
        this.ofertas=ofertas;this.postulantes=postulantes;this.postulaciones=postulaciones;
        this.adjuntos=adjuntos;this.root=Path.of(dir).toAbsolutePath().normalize();
    }
    @PostMapping(consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ResponseEntity<Map<String,String>> postular(@RequestParam UUID ofertaId,
            @RequestParam String nombre, @RequestParam String correo,
            @RequestParam(required=false,defaultValue="") String telefono,
            @RequestParam(required=false,defaultValue="") String rut,
            @RequestParam(value="cv", required=false) MultipartFile cv) {
        if (nombre.isBlank() || !correo.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Nombre o correo invalido");
        if (ofertas.findById(ofertaId).filter(o -> o.publicada()).isEmpty())
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Oferta no disponible");
        boolean adjuntoCv = cv != null && !cv.isEmpty();
        String nombreArchivo = null;
        UUID archivoId = null;
        Path destinoCv = null;
        if (adjuntoCv) {
            String original = Objects.toString(cv.getOriginalFilename(), "").replace('\\', '/');
            original = original.substring(original.lastIndexOf('/') + 1);
            String tipo = Objects.toString(cv.getContentType(), "");
            if (cv.getSize() > MAX_CV_BYTES)
                throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "El CV no puede superar los 10 MB");
            if (!original.toLowerCase(Locale.ROOT).endsWith(".pdf")
                    || (!tipo.isBlank() && !MediaType.APPLICATION_PDF_VALUE.equalsIgnoreCase(tipo)))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El CV debe ser un archivo PDF");
            try (var stream = cv.getInputStream()) {
                byte[] firma = stream.readNBytes(5);
                if (!Arrays.equals(firma, "%PDF-".getBytes(java.nio.charset.StandardCharsets.US_ASCII)))
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El archivo adjunto no es un PDF válido");
            } catch (IOException ex) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se pudo validar el archivo PDF");
            }
            nombreArchivo = original.replaceAll("[\\p{Cntrl}]", "").trim();
            if (nombreArchivo.isEmpty()) nombreArchivo = "curriculum.pdf";
            nombreArchivo = nombreArchivo.substring(0, Math.min(nombreArchivo.length(), 200));
            archivoId = UUID.randomUUID();
        }

        UUID postulanteId=UUID.randomUUID(), postulacionId=UUID.randomUUID();
        if (adjuntoCv) {
            String relative=postulanteId+"/"+postulacionId+"/"+archivoId+".pdf";
            destinoCv=root.resolve(relative).normalize();
            if (!destinoCv.startsWith(root))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ruta de almacenamiento no válida");
            try {
                Files.createDirectories(destinoCv.getParent());
                try (var stream=cv.getInputStream()) { Files.copy(stream,destinoCv); }
            } catch(IOException ex) {
                try { Files.deleteIfExists(destinoCv); } catch(IOException limpieza) { ex.addSuppressed(limpieza); }
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,"No se pudo almacenar el CV",ex);
            }
        }

        try {
            postulantes.save(new Postulante(postulanteId,nombre.trim(),correo.trim().toLowerCase(Locale.ROOT),telefono,rut));
            postulaciones.save(new Postulacion(postulacionId,ofertaId,postulanteId,"PENDIENTE"));
            if (adjuntoCv) {
                String relative=root.relativize(destinoCv).toString().replace('\\', '/');
                adjuntos.save(new CvAdjunto(archivoId,postulacionId,nombreArchivo,relative));
            }
        } catch(RuntimeException ex) {
            if (destinoCv != null) {
                try { Files.deleteIfExists(destinoCv); } catch(IOException limpieza) { ex.addSuppressed(limpieza); }
            }
            throw ex;
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("postulacionId",postulacionId.toString(),"estado","PENDIENTE"));
    }
}
