package cl.aquachile.backend.invitacion.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class CorreoInvitacionService {
    private static final Logger LOGGER = LoggerFactory.getLogger(CorreoInvitacionService.class);
    private final String apiKey;
    private final String remitente;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public CorreoInvitacionService(
            @Value("${app.mail.resend-api-key:}") String apiKey,
            @Value("${app.mail.from:AquaChile <onboarding@resend.dev>}") String remitente,
            ObjectMapper objectMapper) {
        this.apiKey = apiKey;
        this.remitente = remitente;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    }

    public boolean enviar(String correo, String nombre, String enlace) {
        if (apiKey.isBlank()) return false;
        try {
            byte[] body = objectMapper.writeValueAsBytes(Map.of(
                    "from", remitente,
                    "to", List.of(correo),
                    "subject", "Invitación para crear tu acceso a AquaChile",
                    "text", "Hola " + nombre + ",\n\nSe creó una cuenta para ti en el sistema AquaChile."
                            + "\n\nDefine tu contraseña en este enlace (válido por 24 horas):\n"
                            + enlace + "\n\nSi no esperabas esta invitación, puedes ignorar este mensaje."
            ));
            HttpRequest request = HttpRequest.newBuilder(URI.create("https://api.resend.com/emails"))
                    .timeout(Duration.ofSeconds(10))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                    .build();
            HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());
            if (response.statusCode() >= 200 && response.statusCode() < 300) return true;
            LOGGER.warn("Resend no aceptó el correo de invitación (HTTP {}).", response.statusCode());
        } catch (IOException exception) {
            LOGGER.warn("No se pudo enviar el correo de invitación: {}", exception.getMessage());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            LOGGER.warn("Se interrumpió el envío del correo de invitación.");
        }
        return false;
    }
}
