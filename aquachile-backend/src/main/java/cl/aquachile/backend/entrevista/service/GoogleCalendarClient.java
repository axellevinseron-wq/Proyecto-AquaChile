package cl.aquachile.backend.entrevista.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.NullNode;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class GoogleCalendarClient {
    private static final String CALENDAR_API = "https://www.googleapis.com/calendar/v3";
    private static final String USER_INFO_API = "https://www.googleapis.com/oauth2/v3/userinfo";
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public GoogleCalendarClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    }

    public String obtenerOrganizador(String token) {
        JsonNode usuario = solicitar(USER_INFO_API, token, "GET", null);
        if (usuario.path("email_verified").asBoolean(false) != true
                || !usuario.path("email").isTextual()) {
            throw new GoogleCalendarException("Google no confirmó el correo de la cuenta organizadora.", 403);
        }
        return usuario.path("email").asText().trim().toLowerCase(Locale.ROOT);
    }

    public JsonNode crearEvento(String token, String eventId, byte[] body) {
        String url = CALENDAR_API + "/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all";
        try {
            return solicitar(url, token, "POST", body);
        } catch (GoogleCalendarException exception) {
            if (exception.status() != 409) throw exception;
            return solicitar(CALENDAR_API + "/calendars/primary/events/" + eventId, token, "GET", null);
        }
    }

    public JsonNode actualizarEvento(String token, String eventId, byte[] body) {
        return solicitar(CALENDAR_API + "/calendars/primary/events/" + eventId
                + "?conferenceDataVersion=1&sendUpdates=all", token, "PATCH", body);
    }

    public void eliminarEvento(String token, String eventId) {
        try {
            solicitar(CALENDAR_API + "/calendars/primary/events/" + eventId + "?sendUpdates=all",
                    token, "DELETE", null);
        } catch (GoogleCalendarException exception) {
            if (exception.status() != 404) throw exception;
        }
    }

    private JsonNode solicitar(String url, String token, String method, byte[] body) {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(15))
                .header("Accept", "application/json")
                .header("Authorization", "Bearer " + token);
        if (body != null) builder.header("Content-Type", "application/json");
        HttpRequest.BodyPublisher publisher = body == null
                ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofByteArray(body);
        try {
            HttpResponse<String> response = httpClient.send(
                    builder.method(method, publisher).build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 204) return NullNode.getInstance();
            JsonNode data = response.body().isBlank() ? NullNode.getInstance() : objectMapper.readTree(response.body());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String message = data.path("error").path("message").asText();
                if (message.isBlank() || message.length() > 240) {
                    message = "Google Calendar rechazó la operación. Revisa la autorización e inténtalo nuevamente.";
                }
                throw new GoogleCalendarException(message, response.statusCode());
            }
            return data;
        } catch (IOException exception) {
            throw new GoogleCalendarException("No se pudo conectar con Google Calendar. Inténtalo nuevamente.", 503);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new GoogleCalendarException("La solicitud a Google Calendar fue interrumpida.", 503);
        }
    }
}
