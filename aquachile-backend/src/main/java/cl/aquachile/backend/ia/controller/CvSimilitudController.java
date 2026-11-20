package cl.aquachile.backend.ia.controller;

import cl.aquachile.backend.archivo.repository.CvAdjuntoRepository;
import cl.aquachile.backend.ia.service.PdfTextoService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ia/postulaciones")
@SecurityRequirement(name = "bearerAuth")
public class CvSimilitudController {
    private final CvAdjuntoRepository repositorio;
    private final PdfTextoService extractor;
    private final Path raiz;

    public CvSimilitudController(CvAdjuntoRepository repositorio, PdfTextoService extractor,
                                @Value("${app.upload.dir:./uploads}") String directorio) {
        this.repositorio = repositorio;
        this.extractor = extractor;
        this.raiz = Path.of(directorio).toAbsolutePath().normalize();
    }

    @GetMapping("/{id}/similitud-cv")
    public Map<String, Object> comprobar(@PathVariable UUID id) {
        var objetivo = repositorio.findByPostulacionId(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "La postulacion no tiene CV asociado"));
        byte[] original = leer(objetivo.rutaRelativa());
        String huella = sha256(original);
        Set<String> palabras = tokens(original, objetivo.rutaRelativa());
        List<Map<String, Object>> coincidencias = new ArrayList<>();
        int revisados = 0;
        int omitidos = 0;
        // Limite para evitar recorrer indefinidamente el almacenamiento en una solicitud HTTP.
        for (var otro : repositorio.findAll()) {
            if (otro.postulacionId().equals(id)) continue;
            if (revisados >= 200) { omitidos++; continue; }
            revisados++;
            try {
                byte[] bytes = leer(otro.rutaRelativa());
                boolean identico = huella.equals(sha256(bytes));
                double similitud = identico ? 100 : porcentaje(palabras, tokens(bytes, otro.rutaRelativa()));
                if (identico || similitud >= 70) {
                    coincidencias.add(Map.of(
                            "postulacionId", otro.postulacionId().toString(),
                            "tipo", identico ? "ARCHIVO_IDENTICO" : "TEXTO_SIMILAR",
                            "similitud", Math.round(similitud)
                    ));
                }
            } catch (RuntimeException ex) {
                omitidos++;
            }
        }
        coincidencias.sort((a, b) -> Long.compare((Long) b.get("similitud"), (Long) a.get("similitud")));
        return Map.of("estado", omitidos == 0 ? "COMPLETO" : "PARCIAL",
                "comparados", revisados, "omitidos", omitidos,
                "coincidencias", coincidencias,
                "advertencia", "La similitud textual es orientativa; no demuestra copia ni plagio. Revision humana obligatoria.");
    }

    private byte[] leer(String ruta) {
        try {
            Path archivo = raiz.resolve(ruta).normalize();
            if (!archivo.startsWith(raiz)) throw new SecurityException("Ruta fuera del almacenamiento");
            if (!Files.isRegularFile(archivo) || Files.size(archivo) > 5_000_000)
                throw new IllegalStateException("Archivo ausente o demasiado grande");
            return Files.readAllBytes(archivo);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "CV no disponible para comparacion");
        }
    }

    private String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo calcular la huella", ex);
        }
    }

    private Set<String> tokens(byte[] bytes, String ruta) {
        if (!ruta.toLowerCase(Locale.ROOT).endsWith(".pdf")) return Set.of();
        try {
            String texto = extractor.extraerTexto(bytes).toLowerCase(Locale.ROOT)
                    .replaceAll("[^\\p{L}\\p{N}]+", " ").trim();
            String[] partes = texto.split("\\s+");
            Set<String> resultado = new HashSet<>();
            for (int i = 0; i + 2 < partes.length && i < 10000; i++) {
                resultado.add(partes[i] + " " + partes[i + 1] + " " + partes[i + 2]);
            }
            return resultado;
        } catch (RuntimeException ex) {
            return Set.of();
        }
    }

    private double porcentaje(Set<String> a, Set<String> b) {
        if (a.isEmpty() || b.isEmpty()) return 0;
        long interseccion = a.stream().filter(b::contains).count();
        return 100.0 * interseccion / (a.size() + b.size() - interseccion);
    }
}
