package cl.aquachile.backend.solicitudacceso.controller;

import cl.aquachile.backend.solicitudacceso.entity.SolicitudAcceso;
import cl.aquachile.backend.solicitudacceso.repository.SolicitudAccesoRepository;
import cl.aquachile.backend.usuario.dto.CrearUsuarioRequest;
import cl.aquachile.backend.usuario.entity.Rol;
import cl.aquachile.backend.usuario.service.UsuarioService;
import org.springframework.security.access.prepost.PreAuthorize;
import java.security.SecureRandom;
import java.util.Base64;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@RestController
@RequestMapping("/api/admin/solicitudes-acceso")
public class SolicitudAccesoAdminController {
    private final SolicitudAccesoRepository repository;
    private final UsuarioService usuarioService;
    private final SecureRandom random = new SecureRandom();

    public SolicitudAccesoAdminController(SolicitudAccesoRepository repository, UsuarioService usuarioService) {
        this.repository = repository;
        this.usuarioService = usuarioService;
    }

    public record Resumen(UUID id, String nombre, String apellido, String rut,
                          String telefono, String correo, String usuarioSolicitado,
                          String motivo, String estado, String fechaCreacion,
                          String comentarioAdministrador, String cvNombre) {}

    private Resumen resumen(SolicitudAcceso s) {
        return new Resumen(s.getId(), s.getNombre(), s.getApellido(), s.getRut(),
                s.getTelefono(), s.getCorreo(), s.getUsuarioSolicitado(),
                s.getMotivo(), s.getEstado(), s.getFechaCreacion().toString(),
                s.getComentarioAdministrador(), s.getCvNombre());
    }

    private SolicitudAcceso buscar(UUID id) {
        return repository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitud no encontrada"));
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<Resumen> listar() {
        return repository.findAll().stream()
                .sorted(Comparator.comparing(SolicitudAcceso::getFechaCreacion).reversed())
                .map(this::resumen).toList();
    }

    public record EstadoRequest(String estado) {}

    @PatchMapping("/{id}/estado")
    @Transactional
    public Resumen estado(@PathVariable UUID id, @RequestBody EstadoRequest request) {
        if (request == null || request.estado() == null ||
                !Set.of("PENDIENTE", "ACEPTADA", "RECHAZADA").contains(request.estado())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado invalido");
        }
        if ("ACEPTADA".equals(request.estado())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Para aceptar y crear la cuenta utiliza el endpoint /aprobar");
        }
        SolicitudAcceso s = buscar(id);
        if ("ACEPTADA".equals(s.getEstado())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Una solicitud aprobada no puede revertirse; desactiva la cuenta desde Usuarios");
        }
        s.cambiarEstado(request.estado(), s.getComentarioAdministrador());
        return resumen(repository.save(s));
    }

    // La clave temporal solo se devuelve al administrador que aprueba; no se guarda en texto plano.
    public record AprobarRequest(Rol rol) {}
    public record AprobacionResponse(Resumen solicitud, String correo, String passwordTemporal) {}

    @PatchMapping("/{id}/aprobar")
    @Transactional
    public synchronized AprobacionResponse aprobar(@PathVariable UUID id,
                                                    @RequestBody AprobarRequest request) {
        if (request == null || request.rol() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecciona un rol");
        }
        // No se permite otorgar ADMIN mediante una solicitud pública.
        if (request.rol() == Rol.ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El rol ADMIN debe asignarse por otro procedimiento administrativo");
        }
        SolicitudAcceso s = buscar(id);
        if ("RECHAZADA".equals(s.getEstado())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "La solicitud fue rechazada; vuelve a Pendiente antes de aprobar");
        }
        if (usuarioService.existePorCorreo(s.getCorreo())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El correo ya tiene una cuenta; revisa Usuarios y permisos");
        }
        byte[] bytes = new byte[24];
        random.nextBytes(bytes);
        String password = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        usuarioService.crear(new CrearUsuarioRequest(
                (s.getNombre() + " " + s.getApellido()).trim(),
                s.getCorreo(), password, request.rol()));
        s.cambiarEstado("ACEPTADA", s.getComentarioAdministrador());
        return new AprobacionResponse(resumen(repository.save(s)), s.getCorreo(), password);
    }

    public record ComentarioRequest(String comentario) {}

    @PatchMapping("/{id}/comentario")
    @Transactional
    public Resumen comentar(@PathVariable UUID id, @RequestBody ComentarioRequest request) {
        if (request == null || request.comentario() == null || request.comentario().isBlank()
                || request.comentario().length() > 4000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Comentario invalido (maximo 4000 caracteres)");
        }
        SolicitudAcceso s = buscar(id);
        s.cambiarEstado(s.getEstado(), request.comentario().trim());
        return resumen(repository.save(s));
    }

    @GetMapping("/{id}/cv")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> descargarCv(@PathVariable UUID id) {
        SolicitudAcceso s = buscar(id);
        if (s.getCvPdf() == null || s.getCvPdf().length == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "CV no disponible");
        }
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"curriculum.pdf\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(s.getCvPdf());
    }
}
