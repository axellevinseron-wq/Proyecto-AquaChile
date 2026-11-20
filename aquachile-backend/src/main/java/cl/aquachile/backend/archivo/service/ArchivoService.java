package cl.aquachile.backend.archivo.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.*;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

@Service
public class ArchivoService {
    private final Path root;
    public ArchivoService(@Value("${app.upload.dir:./uploads}") String dir) {
        root = Path.of(dir).toAbsolutePath().normalize();
    }
    public UUID guardar(MultipartFile file) {
        String name = Objects.toString(file.getOriginalFilename(), "").toLowerCase(Locale.ROOT);
        if (file.isEmpty() || file.getSize() > 5_000_000 ||
                !(name.endsWith(".pdf") || name.endsWith(".docx"))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CV debe ser PDF o DOCX, maximo 5 MB");
        }
        UUID id = UUID.randomUUID();
        String ext = name.endsWith(".pdf") ? ".pdf" : ".docx";
        try {
            Files.createDirectories(root);
            Files.copy(file.getInputStream(), root.resolve(id + ext));
            return id;
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo guardar el CV");
        }
    }
    public byte[] leer(UUID id) {
        for (String ext : new String[]{".pdf", ".docx"}) {
            Path file = root.resolve(id + ext);
            if (Files.isRegularFile(file)) {
                try { return Files.readAllBytes(file); }
                catch (IOException ex) { throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo leer el CV"); }
            }
        }
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "CV no encontrado");
    }
}
