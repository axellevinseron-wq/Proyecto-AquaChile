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
            @RequestParam("cv") MultipartFile cv) {
        if (nombre.isBlank() || !correo.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Nombre o correo invalido");
        if (ofertas.findById(ofertaId).filter(o -> o.publicada()).isEmpty())
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Oferta no disponible");
        String original=Objects.toString(cv.getOriginalFilename(),"");
        String lower=original.toLowerCase(Locale.ROOT);
        if (cv.isEmpty() || cv.getSize()>5_000_000 || !(lower.endsWith(".pdf")||lower.endsWith(".docx")))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"CV PDF o DOCX, maximo 5 MB");
        String ext=lower.endsWith(".pdf")?".pdf":".docx";
        UUID postulanteId=UUID.randomUUID(), postulacionId=UUID.randomUUID(), archivoId=UUID.randomUUID();
        // Identificadores generados por el servidor; nunca usamos rutas aportadas por el usuario.
        String relative=postulanteId+"/"+postulacionId+"/"+archivoId+ext;
        Path dest=root.resolve(relative).normalize();
        try {
            Files.createDirectories(dest.getParent());
            try (var stream=cv.getInputStream()) { Files.copy(stream,dest); }
        } catch(IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,"No se pudo almacenar el CV");
        }
        try {
            postulantes.save(new Postulante(postulanteId,nombre.trim(),correo.trim().toLowerCase(Locale.ROOT),telefono,rut));
            postulaciones.save(new Postulacion(postulacionId,ofertaId,postulanteId,"PENDIENTE"));
            adjuntos.save(new CvAdjunto(archivoId,postulacionId,original.substring(0,Math.min(original.length(),200)),relative));
        } catch(RuntimeException ex) {
            try { Files.deleteIfExists(dest); } catch(IOException ignored) {}
            throw ex;
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("postulacionId",postulacionId.toString(),"estado","PENDIENTE"));
    }
}
