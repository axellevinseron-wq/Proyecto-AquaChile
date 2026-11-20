package cl.aquachile.backend.common.config;

import cl.aquachile.backend.archivo.entity.CvAdjunto;
import cl.aquachile.backend.archivo.repository.CvAdjuntoRepository;
import cl.aquachile.backend.oferta.entity.Oferta;
import cl.aquachile.backend.oferta.repository.OfertaRepository;
import cl.aquachile.backend.postulante.entity.Postulante;
import cl.aquachile.backend.postulante.repository.PostulanteRepository;
import cl.aquachile.backend.postulacion.entity.Postulacion;
import cl.aquachile.backend.postulacion.repository.PostulacionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.UUID;

/** Datos ficticios para la presentación. No crea usuarios ni toca registros ajenos. */
@Component
@ConditionalOnProperty(name = "app.seed.cv.enabled", havingValue = "true", matchIfMissing = true)
public class DatosInicialesCv implements ApplicationRunner {
    private final OfertaRepository ofertas;
    private final PostulanteRepository postulantes;
    private final PostulacionRepository postulaciones;
    private final CvAdjuntoRepository adjuntos;
    private final Path uploadDir;

    public DatosInicialesCv(OfertaRepository ofertas, PostulanteRepository postulantes,
                            PostulacionRepository postulaciones, CvAdjuntoRepository adjuntos,
                            @Value("${app.upload.dir:./uploads}") String uploadDir) {
        this.ofertas = ofertas;
        this.postulantes = postulantes;
        this.postulaciones = postulaciones;
        this.adjuntos = adjuntos;
        this.uploadDir = Path.of(uploadDir).toAbsolutePath().normalize();
    }

    private static UUID id(String value) {
        return UUID.nameUUIDFromBytes(("aquachile-seed-cv-v1:" + value).getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        Files.createDirectories(uploadDir);
        crearOferta("java", "Desarrollador Java", "Desarrollo backend con Java, Spring Boot, SQL y APIs REST", "Puerto Montt");
        crearOferta("datos", "Analista de Datos", "Análisis de información con SQL, Python y visualización", "Puerto Montt");
        crearOferta("fullstack", "Desarrollador Full Stack", "Aplicaciones web con React, APIs y bases de datos", "Remoto");

        crearCandidato("camila", "Camila Torres", "java", "camila.torres@ejemplo.invalid", "11.111.111-1");
        crearCandidato("diego", "Diego Morales", "java", "diego.morales@ejemplo.invalid", "22.222.222-2");
        crearCandidato("valentina", "Valentina Rojas", "datos", "valentina.rojas@ejemplo.invalid", "33.333.333-3");
        crearCandidato("matias", "Matías Herrera", "fullstack", "matias.herrera@ejemplo.invalid", "44.444.444-4");
        crearCandidato("fernanda", "Fernanda Soto", "java", "fernanda.soto@ejemplo.invalid", "55.555.555-5");
        crearCandidato("nicolas", "Nicolás Pérez", "datos", "nicolas.perez@ejemplo.invalid", "66.666.666-6");
        System.out.println("[AquaChile] Datos iniciales CV: 6 postulaciones ficticias verificadas.");
    }

    private void crearOferta(String key, String titulo, String descripcion, String ubicacion) {
        UUID uuid = id("oferta-" + key);
        if (!ofertas.existsById(uuid)) {
            ofertas.save(new Oferta(uuid, titulo, descripcion, ubicacion, true,
                    "Tecnología", "Híbrido", LocalDate.of(2026, 11, 1), 2,
                    descripcion, "Experiencia y conocimientos relacionados con el cargo",
                    "Desarrollo profesional", "A convenir"));
        }
    }

    private void crearCandidato(String key, String nombre, String oferta, String correo, String rut) throws Exception {
        UUID postulanteId = id("postulante-" + key);
        UUID postulacionId = id("postulacion-" + key);
        UUID archivoId = id("archivo-" + key);
        if (!postulantes.existsById(postulanteId)) {
            postulantes.save(new Postulante(postulanteId, nombre, correo, "+56 9 0000 0000", rut));
        }
        if (!postulaciones.existsById(postulacionId)) {
            postulaciones.save(new Postulacion(postulacionId, id("oferta-" + oferta), postulanteId, "PENDIENTE"));
        }
        String filename = archivoId + ".pdf";
        Path destination = uploadDir.resolve(filename);
        if (!Files.isRegularFile(destination)) {
            try (var in = new ClassPathResource("seed-cvs/" + key + ".pdf").getInputStream()) {
                Files.copy(in, destination, StandardCopyOption.REPLACE_EXISTING);
            }
        }
        if (adjuntos.findByPostulacionId(postulacionId).isEmpty()) {
            adjuntos.save(new CvAdjunto(archivoId, postulacionId, "CV-" + key + ".pdf", filename));
        }
    }
}
