
package cl.aquachile.backend.ia.service;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class IaServiceTest {

    private HttpClient httpClient;
    private HttpResponse<String> response;
    private IaService service;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void configurar() {

        httpClient = mock(HttpClient.class);
        response = mock(HttpResponse.class);

        service = new IaService(
                httpClient,
                new ObjectMapper()
        );
    }

    private void configurarClave() {
        ReflectionTestUtils.setField(
                service,
                "apiKey",
                "clave-ficticia-para-pruebas"
        );
    }

    @Test
    void debeRechazarTextoNulo() {

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.analizar(null)
        );

        assertEquals(
                HttpStatus.BAD_REQUEST,
                ex.getStatusCode()
        );
    }

    @Test
    void debeRechazarTextoVacio() {

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.analizar("")
        );

        assertEquals(
                HttpStatus.BAD_REQUEST,
                ex.getStatusCode()
        );
    }

    @Test
    void debeRechazarTextoConEspacios() {

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.analizar("   ")
        );

        assertEquals(
                HttpStatus.BAD_REQUEST,
                ex.getStatusCode()
        );
    }

    @Test
    void debeRechazarTextoMayorA3000Caracteres() {

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.analizar("A".repeat(3001))
        );

        assertEquals(
                HttpStatus.BAD_REQUEST,
                ex.getStatusCode()
        );
    }

    @Test
    void debeExigirClaveDeGroq() {

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.analizar("Experiencia en Java")
        );

        assertEquals(
                HttpStatus.SERVICE_UNAVAILABLE,
                ex.getStatusCode()
        );
    }

    @Test
    void debeAnalizarTextoCorrectamente() throws Exception {

        configurarClave();

        String respuestaJson = """
                {
                  "choices": [
                    {
                      "message": {
                        "content": "Resumen y preguntas de entrevista"
                      }
                    }
                  ]
                }
                """;

        when(response.statusCode()).thenReturn(200);
        when(response.body()).thenReturn(respuestaJson);

        when(httpClient.send(
                any(HttpRequest.class),
                any(HttpResponse.BodyHandler.class)
        )).thenReturn(response);

        Map<String, Object> resultado =
                service.analizar("Experiencia en Java");

        assertEquals("MODELO_REAL", resultado.get("modo"));
        assertEquals("GROQ", resultado.get("proveedor"));
        assertEquals(
                "Resumen y preguntas de entrevista",
                resultado.get("resultado")
        );
        assertEquals(
                true,
                resultado.get("revisionHumanaObligatoria")
        );

        verify(httpClient).send(
                any(HttpRequest.class),
                any(HttpResponse.BodyHandler.class)
        );
    }

    @Test
    void debeRechazarErrorHttpDeGroq() throws Exception {

        configurarClave();

        when(response.statusCode()).thenReturn(429);

        when(httpClient.send(
                any(HttpRequest.class),
                any(HttpResponse.BodyHandler.class)
        )).thenReturn(response);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.analizar("Experiencia en Java")
        );

        assertEquals(
                HttpStatus.BAD_GATEWAY,
                ex.getStatusCode()
        );
    }

    @Test
    void debeRechazarRespuestaVacia() throws Exception {

        configurarClave();

        when(response.statusCode()).thenReturn(200);
        when(response.body()).thenReturn("""
                {
                  "choices": [
                    {
                      "message": {
                        "content": ""
                      }
                    }
                  ]
                }
                """);

        when(httpClient.send(
                any(HttpRequest.class),
                any(HttpResponse.BodyHandler.class)
        )).thenReturn(response);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.analizar("Experiencia en Java")
        );

        assertEquals(
                HttpStatus.BAD_GATEWAY,
                ex.getStatusCode()
        );
    }

    @Test
    void debeRechazarJsonInvalido() throws Exception {

        configurarClave();

        when(response.statusCode()).thenReturn(200);
        when(response.body()).thenReturn("{json-invalido");

        when(httpClient.send(
                any(HttpRequest.class),
                any(HttpResponse.BodyHandler.class)
        )).thenReturn(response);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.analizar("Experiencia en Java")
        );

        assertEquals(
                HttpStatus.BAD_GATEWAY,
                ex.getStatusCode()
        );
    }

    @Test
    void debeManejarErrorDeConexion() throws Exception {

        configurarClave();

        when(httpClient.send(
                any(HttpRequest.class),
                any(HttpResponse.BodyHandler.class)
        )).thenThrow(new IOException("Conexion fallida"));

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.analizar("Experiencia en Java")
        );

        assertEquals(
                HttpStatus.BAD_GATEWAY,
                ex.getStatusCode()
        );
    }

    @Test
    void debeManejarInterrupcion() throws Exception {

        configurarClave();

        when(httpClient.send(
                any(HttpRequest.class),
                any(HttpResponse.BodyHandler.class)
        )).thenThrow(
                new InterruptedException("Solicitud interrumpida")
        );

        try {
            ResponseStatusException ex = assertThrows(
                    ResponseStatusException.class,
                    () -> service.analizar("Experiencia en Java")
            );

            assertEquals(
                    HttpStatus.BAD_GATEWAY,
                    ex.getStatusCode()
            );

            assertTrue(Thread.currentThread().isInterrupted());

        } finally {
            Thread.interrupted();
        }
    }

    @Test
    void debeAceptarTextoDe3000Caracteres() throws Exception {

        configurarClave();

        when(response.statusCode()).thenReturn(200);
        when(response.body()).thenReturn("""
                {
                  "choices": [
                    {
                      "message": {
                        "content": "Analisis generado"
                      }
                    }
                  ]
                }
                """);

        when(httpClient.send(
                any(HttpRequest.class),
                any(HttpResponse.BodyHandler.class)
        )).thenReturn(response);

        Map<String, Object> resultado =
                service.analizar("A".repeat(3000));

        assertEquals(
                "Analisis generado",
                resultado.get("resultado")
        );
    }
}
