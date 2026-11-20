package cl.aquachile.backend.solicitudacceso.controller;

import cl.aquachile.backend.solicitudacceso.dto.CrearSolicitudAccesoRequest;
import cl.aquachile.backend.solicitudacceso.entity.SolicitudAcceso;
import cl.aquachile.backend.solicitudacceso.repository.SolicitudAccesoRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.security.SecureRandom;
import java.util.*;

@RestController
@RequestMapping("/api/publico/solicitudes-acceso")
public class SolicitudAccesoController {
    private static final long MAX_CV = 10L * 1024 * 1024;
    private final SolicitudAccesoRepository repository;
    private final ObjectMapper mapper = new ObjectMapper();
    private final Validator validator;
    private final SecureRandom random = new SecureRandom();

    public SolicitudAccesoController(SolicitudAccesoRepository repository, Validator validator) {
        this.repository = repository;
        this.validator = validator;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> crear(@RequestPart("datos") String json,
                                     @RequestPart("cv") MultipartFile cv) throws IOException {
        CrearSolicitudAccesoRequest request;
        try {
            request = mapper.readValue(json, CrearSolicitudAccesoRequest.class);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Datos de solicitud invalidos");
        }
        Set<ConstraintViolation<CrearSolicitudAccesoRequest>> errores = validator.validate(request);
        if (!errores.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Completa correctamente todos los campos");
        if (!rutValido(request.rut())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "RUT invalido");
        if (!request.telefono().replaceAll("[\\s-]", "").matches("\\+?\\d{8,12}"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Telefono invalido");
        if (request.usuarioSolicitado().isBlank() || request.usuarioSolicitado().matches(".*\\s.*"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Usuario invalido");
        if (cv.isEmpty() || cv.getSize() > MAX_CV) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Adjunta un PDF de hasta 10 MB");
        byte[] contenido = cv.getBytes();
        if (contenido.length < 8 || contenido[0] != '%' || contenido[1] != 'P' || contenido[2] != 'D' || contenido[3] != 'F' || contenido[4] != '-')
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El CV debe ser un PDF valido");
        String original = Objects.toString(cv.getOriginalFilename(), "curriculum.pdf");
        String nombreSeguro = original.replace('\\', '/');
        nombreSeguro = nombreSeguro.substring(nombreSeguro.lastIndexOf('/') + 1).replaceAll("[^a-zA-Z0-9._-]", "_");
        if (!nombreSeguro.toLowerCase(Locale.ROOT).endsWith(".pdf"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El archivo debe tener extension PDF");
        String codigo;
        do { codigo = generarCodigo(); } while (repository.existsByCodigoSeguimiento(codigo));
        SolicitudAcceso solicitud = new SolicitudAcceso(
            request.nombre().trim(), request.apellido().trim(), request.rut().trim(),
            request.telefono().trim(), request.correo().trim().toLowerCase(Locale.ROOT),
            request.usuarioSolicitado().trim(), request.motivo().trim(), codigo
        );
        solicitud.adjuntarCv(nombreSeguro, contenido);
        repository.save(solicitud);
        return Map.of("mensaje", "Solicitud registrada correctamente", "codigoSeguimiento", codigo, "estado", solicitud.getEstado());
    }

    @PostMapping("/consultar")
    public Map<String, Object> consultar(@RequestBody Map<String, String> datos) {
        String correo = Objects.toString(datos.get("correo"), "").trim();
        String codigo = Objects.toString(datos.get("codigoSeguimiento"), "").trim();
        SolicitudAcceso solicitud = repository.findByCorreoIgnoreCaseAndCodigoSeguimiento(correo, codigo)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitud no encontrada"));
        Map<String, Object> resultado = new LinkedHashMap<>();
        resultado.put("estado", solicitud.getEstado());
        resultado.put("fechaCreacion", solicitud.getFechaCreacion());
        resultado.put("comentarioAdministrador", solicitud.getComentarioAdministrador());
        return resultado;
    }

    private boolean rutValido(String rut) {
        if (rut == null) return false;
        String limpio = rut.replaceAll("[.\\-\\s]", "").toUpperCase(Locale.ROOT);
        if (!limpio.matches("\\d{7,8}[0-9K]")) return false;
        int suma = 0, factor = 2;
        for (int i = limpio.length() - 2; i >= 0; i--) {
            suma += Character.digit(limpio.charAt(i), 10) * factor;
            factor = factor == 7 ? 2 : factor + 1;
        }
        int resto = 11 - suma % 11;
        char dv = resto == 11 ? '0' : resto == 10 ? 'K' : Character.forDigit(resto, 10);
        return limpio.charAt(limpio.length() - 1) == dv;
    }

    private String generarCodigo() {
        byte[] bytes = new byte[16];
        random.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes).toUpperCase(Locale.ROOT);
    }
}
