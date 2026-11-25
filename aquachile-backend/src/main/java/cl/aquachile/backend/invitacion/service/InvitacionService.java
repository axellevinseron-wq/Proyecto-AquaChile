package cl.aquachile.backend.invitacion.service;

import cl.aquachile.backend.invitacion.dto.*;
import cl.aquachile.backend.invitacion.entity.Invitacion;
import cl.aquachile.backend.invitacion.repository.InvitacionRepository;
import cl.aquachile.backend.usuario.dto.CrearUsuarioRequest;
import cl.aquachile.backend.usuario.entity.Rol;
import cl.aquachile.backend.usuario.service.UsuarioService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class InvitacionService {
    private static final Duration DURACION = Duration.ofHours(24);
    private static final SecureRandom RANDOM = new SecureRandom();
    private final InvitacionRepository invitaciones;
    private final UsuarioService usuarios;
    private final CorreoInvitacionService correoService;
    private final String frontendUrl;

    public InvitacionService(
            InvitacionRepository invitaciones,
            UsuarioService usuarios,
            CorreoInvitacionService correoService,
            @Value("${app.frontend-url:http://localhost:5173}") String frontendUrl) {
        this.invitaciones = invitaciones;
        this.usuarios = usuarios;
        this.correoService = correoService;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
    }

    @Transactional(readOnly = true)
    public List<InvitacionResponse> listar() {
        return invitaciones.findAllByOrderByCreadaDesc().stream().map(InvitacionResponse::desde).toList();
    }

    @Transactional
    public InvitacionCreadaResponse crear(CrearInvitacionRequest request, String actor) {
        String correoNormalizado = request.correo().trim().toLowerCase(Locale.ROOT);
        if (usuarios.existePorCorreo(correoNormalizado)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe una cuenta con ese correo.");
        }
        if (invitaciones.existsByCorreoIgnoreCaseAndUsadaIsNullAndRevocadaIsNullAndExpiraAfter(
                correoNormalizado, Instant.now())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya hay una invitación pendiente para ese correo.");
        }

        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant ahora = Instant.now();
        Invitacion invitacion = new Invitacion(UUID.randomUUID(), hash(token), request.nombre().trim(),
                correoNormalizado, request.rol(), actor, ahora, ahora.plus(DURACION));
        invitaciones.save(invitacion);

        String enlace = frontendUrl + "/invitacion/" + token;
        boolean correoEnviado = correoService.enviar(correoNormalizado, invitacion.nombre(), enlace);
        return new InvitacionCreadaResponse(InvitacionResponse.desde(invitacion), correoEnviado,
                correoEnviado ? null : enlace,
                correoEnviado ? "Invitación enviada por correo."
                        : "La invitación se creó, pero el correo no pudo enviarse. Comparte este enlace directamente.");
    }

    @Transactional(readOnly = true)
    public InvitacionPublicaResponse consultar(String token) {
        Invitacion invitacion = buscar(token, false);
        validarPendiente(invitacion);
        return InvitacionPublicaResponse.desde(invitacion);
    }

    @Transactional
    public void aceptar(String token, AceptarInvitacionRequest request) {
        Invitacion invitacion = buscar(token, true);
        validarPendiente(invitacion);
        if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La contraseña no puede superar 72 bytes UTF-8.");
        }
        usuarios.crear(new CrearUsuarioRequest(invitacion.nombre(), invitacion.correo(),
                request.password(), invitacion.rol()));
        invitacion.marcarUsada(Instant.now());
        invitaciones.save(invitacion);
    }

    @Transactional
    public void revocar(UUID id) {
        Invitacion invitacion = invitaciones.buscarPorIdParaActualizar(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invitación no encontrada."));
        validarPendiente(invitacion);
        invitacion.revocar(Instant.now());
        invitaciones.save(invitacion);
    }

    private Invitacion buscar(String token, boolean bloquear) {
        String tokenHash = hash(token);
        return (bloquear ? invitaciones.buscarPorHashParaActualizar(tokenHash) : invitaciones.findByTokenHash(tokenHash))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "La invitación no existe o no es válida."));
    }

    private void validarPendiente(Invitacion invitacion) {
        if (invitacion.usada() != null || invitacion.revocada() != null || !invitacion.expira().isAfter(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.GONE, "La invitación ya fue usada, revocada o venció.");
        }
    }

    private static String hash(String token) {
        if (token == null || token.length() > 128) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "La invitación no existe o no es válida.");
        }
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 no está disponible", exception);
        }
    }
}
