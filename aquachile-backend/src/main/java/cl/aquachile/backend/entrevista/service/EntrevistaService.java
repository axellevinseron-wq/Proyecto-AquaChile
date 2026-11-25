package cl.aquachile.backend.entrevista.service;

import cl.aquachile.backend.archivo.entity.CvAdjunto;
import cl.aquachile.backend.archivo.repository.CvAdjuntoRepository;
import cl.aquachile.backend.entrevista.dto.*;
import cl.aquachile.backend.entrevista.entity.Entrevista;
import cl.aquachile.backend.entrevista.repository.EntrevistaRepository;
import cl.aquachile.backend.oferta.entity.Oferta;
import cl.aquachile.backend.oferta.repository.OfertaRepository;
import cl.aquachile.backend.postulacion.entity.Postulacion;
import cl.aquachile.backend.postulacion.repository.PostulacionRepository;
import cl.aquachile.backend.postulante.entity.Postulante;
import cl.aquachile.backend.postulante.repository.PostulanteRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class EntrevistaService {
    private static final List<String> ESTADOS = List.of(
            "Recibida", "En revisión", "Entrevista", "Seleccionada", "No seleccionada");
    private final PostulacionRepository postulaciones;
    private final PostulanteRepository postulantes;
    private final OfertaRepository ofertas;
    private final CvAdjuntoRepository adjuntos;
    private final EntrevistaRepository entrevistas;
    private final GoogleCalendarClient google;
    private final ObjectMapper objectMapper;

    public EntrevistaService(PostulacionRepository postulaciones, PostulanteRepository postulantes,
            OfertaRepository ofertas, CvAdjuntoRepository adjuntos, EntrevistaRepository entrevistas,
            GoogleCalendarClient google, ObjectMapper objectMapper) {
        this.postulaciones = postulaciones;
        this.postulantes = postulantes;
        this.ofertas = ofertas;
        this.adjuntos = adjuntos;
        this.entrevistas = entrevistas;
        this.google = google;
        this.objectMapper = objectMapper;
    }

    public List<PostulacionAdminResponse> listar() {
        Map<UUID, Postulante> candidatos = postulantes.findAll().stream()
                .collect(java.util.stream.Collectors.toMap(Postulante::id, p -> p));
        Map<UUID, Oferta> cargos = ofertas.findAll().stream()
                .collect(java.util.stream.Collectors.toMap(Oferta::id, o -> o));
        Map<UUID, CvAdjunto> cvs = adjuntos.findAll().stream()
                .collect(java.util.stream.Collectors.toMap(CvAdjunto::postulacionId, cv -> cv));
        Map<UUID, Entrevista> citas = entrevistas.findAll().stream()
                .collect(java.util.stream.Collectors.toMap(Entrevista::postulacionId, cita -> cita));

        return postulaciones.findAll().stream().map(postulacion -> {
            Postulante candidato = candidatos.get(postulacion.postulanteId());
            Oferta oferta = cargos.get(postulacion.ofertaId());
            CvAdjunto cv = cvs.get(postulacion.id());
            return new PostulacionAdminResponse(postulacion.id(),
                    candidato == null ? "" : candidato.nombre(),
                    candidato == null ? "" : candidato.correo(),
                    candidato == null ? "" : candidato.telefono(),
                    oferta == null ? "" : oferta.titulo(),
                    estadoVisible(postulacion.estado()),
                    postulacion.fechaCreacion(),
                    postulacion.mensaje(),
                    cv == null ? null : new CvResumen(cv.nombreArchivo()),
                    EntrevistaResumen.desde(citas.get(postulacion.id())));
        }).toList();
    }

    public PostulacionAdminResponse actualizarEstado(UUID id, String estado) {
        if (estado == null || !ESTADOS.contains(estado)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El estado de postulación no es válido.");
        }
        Postulacion actual = obtenerPostulacion(id);
        postulaciones.save(new Postulacion(actual.id(), actual.ofertaId(), actual.postulanteId(),
                estado, actual.fechaCreacion(), actual.mensaje()));
        return listar().stream().filter(item -> item.id().equals(id)).findFirst().orElseThrow();
    }

    public PostulacionAdminResponse agendar(UUID id, EntrevistaRequest request) {
        DatosCita datos = validar(request);
        Postulacion postulacion = obtenerPostulacion(id);
        if (!"ENTREVISTA".equalsIgnoreCase(postulacion.estado())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Cambia el estado de la postulación a Entrevista antes de agendar.");
        }
        Postulante candidato = postulantes.findById(postulacion.postulanteId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Postulante no encontrado."));
        Oferta oferta = ofertas.findById(postulacion.ofertaId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Oferta no encontrada."));
        String organizador = google.obtenerOrganizador(datos.token());
        Entrevista existente = entrevistas.buscarPorPostulacionParaActualizar(id).orElse(null);
        if (existente != null && "Agendada".equals(existente.estado())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Esta postulación ya tiene una entrevista agendada.");
        }
        if (existente != null && !"Cancelada".equals(existente.estado())
                && !existente.organizador().equals(organizador)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Solo la cuenta que inició esta entrevista puede reintentarla.");
        }
        String eventId = existente != null && "Error".equals(existente.estado())
                ? existente.eventoId() : UUID.randomUUID().toString().replace("-", "");
        String conferenceId = existente != null && "Error".equals(existente.estado())
                ? existente.solicitudMeetId() : UUID.randomUUID().toString();
        Entrevista cita = existente == null
                ? new Entrevista(UUID.randomUUID(), id, eventId, "Agendando", organizador, datos.inicio(),
                        datos.fin(), datos.zona(), null, null, conferenceId)
                : new Entrevista(existente.id(), id, eventId, "Agendando", organizador, datos.inicio(),
                        datos.fin(), datos.zona(), existente.enlaceCalendar(), existente.enlaceMeet(), conferenceId);
        entrevistas.saveAndFlush(cita);

        try {
            byte[] evento = objectMapper.writeValueAsBytes(Map.of(
                    "id", eventId,
                    "summary", "Entrevista AquaChile - " + oferta.titulo(),
                    "description", "Entrevista de selección con " + candidato.nombre()
                            + " para el cargo " + oferta.titulo() + ".",
                    "start", Map.of("dateTime", datos.inicio().toString(), "timeZone", datos.zona()),
                    "end", Map.of("dateTime", datos.fin().toString(), "timeZone", datos.zona()),
                    "attendees", List.of(Map.of("email", candidato.correo())),
                    "conferenceData", Map.of("createRequest", Map.of(
                            "requestId", conferenceId,
                            "conferenceSolutionKey", Map.of("type", "hangoutsMeet")))));
            JsonNode resultado = google.crearEvento(datos.token(), eventId, evento);
            cita.agendada(resultado.path("htmlLink").asText(""),
                    enlaceMeet(resultado));
            entrevistas.save(cita);
        } catch (JsonProcessingException exception) {
            cita.marcarError();
            entrevistas.save(cita);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo preparar el evento de Calendar.");
        } catch (GoogleCalendarException exception) {
            cita.marcarError();
            entrevistas.save(cita);
            throw errorGoogle(exception);
        }
        return listar().stream().filter(item -> item.id().equals(id)).findFirst().orElseThrow();
    }

    public PostulacionAdminResponse reprogramar(UUID id, EntrevistaRequest request) {
        DatosCita datos = validar(request);
        Entrevista cita = entrevistas.buscarPorPostulacionParaActualizar(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "No hay una entrevista agendada."));
        if (!"Agendada".equals(cita.estado())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No hay una entrevista agendada para reprogramar.");
        }
        validarOrganizador(datos.token(), cita);
        try {
            byte[] cambio = objectMapper.writeValueAsBytes(Map.of(
                    "start", Map.of("dateTime", datos.inicio().toString(), "timeZone", datos.zona()),
                    "end", Map.of("dateTime", datos.fin().toString(), "timeZone", datos.zona())));
            JsonNode evento = google.actualizarEvento(datos.token(), cita.eventoId(), cambio);
            cita.reprogramar(datos.inicio(), datos.fin(), datos.zona(),
                    evento.path("htmlLink").asText(null), enlaceMeet(evento));
            entrevistas.save(cita);
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo preparar la actualización del evento.");
        } catch (GoogleCalendarException exception) {
            throw errorGoogle(exception);
        }
        return listar().stream().filter(item -> item.id().equals(id)).findFirst().orElseThrow();
    }

    public PostulacionAdminResponse cancelar(UUID id, EntrevistaRequest request) {
        String token = validarToken(request);
        Entrevista cita = entrevistas.buscarPorPostulacionParaActualizar(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "No hay una entrevista agendada."));
        if (!"Agendada".equals(cita.estado())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No hay una entrevista agendada para cancelar.");
        }
        validarOrganizador(token, cita);
        try {
            google.eliminarEvento(token, cita.eventoId());
            cita.cancelar();
            entrevistas.save(cita);
        } catch (GoogleCalendarException exception) {
            throw errorGoogle(exception);
        }
        return listar().stream().filter(item -> item.id().equals(id)).findFirst().orElseThrow();
    }

    private void validarOrganizador(String token, Entrevista cita) {
        try {
            if (!google.obtenerOrganizador(token).equals(cita.organizador())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Solo la cuenta que organizó esta entrevista puede modificarla.");
            }
        } catch (GoogleCalendarException exception) {
            throw errorGoogle(exception);
        }
    }

    private DatosCita validar(EntrevistaRequest request) {
        String token = validarToken(request);
        if (request == null || request.inicio() == null || request.zonaHoraria() == null || request.zonaHoraria().length() > 80
                || request.duracionMinutos() == null || request.duracionMinutos() < 15 || request.duracionMinutos() > 180) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La fecha, zona horaria o duración no son válidas.");
        }
        Instant inicio;
        ZoneId zona;
        try {
            inicio = OffsetDateTime.parse(request.inicio()).toInstant();
            zona = ZoneId.of(request.zonaHoraria());
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La fecha o zona horaria no son válidas.");
        }
        if (!inicio.isAfter(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La entrevista debe programarse para una fecha futura.");
        }
        Instant fin = inicio.plus(Duration.ofMinutes(request.duracionMinutos()));
        return new DatosCita(token, inicio, fin, zona.getId());
    }

    private String validarToken(EntrevistaRequest request) {
        String token = request == null ? null : request.googleAccessToken();
        if (token == null || token.length() < 20 || token.length() > 4096) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Autoriza Google Calendar para continuar.");
        }
        return token;
    }

    private Postulacion obtenerPostulacion(UUID id) {
        return postulaciones.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "La postulación no existe."));
    }

    private ResponseStatusException errorGoogle(GoogleCalendarException exception) {
        int status = exception.status() == 401 || exception.status() == 403
                ? HttpStatus.BAD_REQUEST.value() : HttpStatus.BAD_GATEWAY.value();
        String mensaje = status == HttpStatus.BAD_REQUEST.value()
                ? "La autorización de Google venció o no tiene los permisos necesarios. Autoriza nuevamente."
                : exception.getMessage();
        return new ResponseStatusException(HttpStatus.valueOf(status), mensaje);
    }

    private String estadoVisible(String estado) {
        if (estado == null) return "Recibida";
        String normalizado = estado.trim().toUpperCase(Locale.ROOT);
        return switch (normalizado) {
            case "PENDIENTE", "RECIBIDA" -> "Recibida";
            case "EN_REVISION", "EN REVISIÓN", "EN REVISION" -> "En revisión";
            case "ENTREVISTA" -> "Entrevista";
            case "SELECCIONADA" -> "Seleccionada";
            case "NO_SELECCIONADA", "NO SELECCIONADA" -> "No seleccionada";
            default -> estado;
        };
    }

    private String enlaceMeet(JsonNode evento) {
        String enlace = evento.path("hangoutLink").asText("");
        if (!enlace.isBlank()) return enlace;
        for (JsonNode punto : evento.path("conferenceData").path("entryPoints")) {
            if ("video".equals(punto.path("entryPointType").asText())) return punto.path("uri").asText("");
        }
        return "";
    }

    private record DatosCita(String token, Instant inicio, Instant fin, String zona) {}
}
