
package cl.aquachile.backend.ia.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.font.PDType1Font;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

class PdfTextoServiceTest {

    private PdfTextoService service;

    @BeforeEach
    void configurar() {
        service = new PdfTextoService();
    }

    @Test
    void debeExtraerTextoDePdfValido() throws Exception {

        byte[] pdf = crearPdfConTexto(
                "Experiencia en Java y Spring Boot"
        );

        String resultado = service.extraerTexto(pdf);

        assertNotNull(resultado);
        assertTrue(resultado.contains("Java"));
        assertTrue(resultado.contains("Spring Boot"));
    }

    @Test
    void debeRechazarContenidoNulo() {

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.extraerTexto(null)
        );

        assertEquals(
                HttpStatus.BAD_REQUEST,
                ex.getStatusCode()
        );
    }

    @Test
    void debeRechazarArchivoVacio() {

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.extraerTexto(new byte[0])
        );

        assertEquals(
                HttpStatus.BAD_REQUEST,
                ex.getStatusCode()
        );
    }

    @Test
    void debeRechazarPdfSinTexto() throws Exception {

        byte[] pdf;

        try (PDDocument documento = new PDDocument();
             ByteArrayOutputStream salida =
                     new ByteArrayOutputStream()) {

            documento.addPage(new PDPage());
            documento.save(salida);

            pdf = salida.toByteArray();
        }

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.extraerTexto(pdf)
        );

        assertEquals(
                HttpStatus.UNPROCESSABLE_ENTITY,
                ex.getStatusCode()
        );
    }

    @Test
    void debeRechazarArchivoNoPdf() {

        byte[] contenido = "Esto no es un PDF"
                .getBytes(StandardCharsets.UTF_8);

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.extraerTexto(contenido)
        );

        assertEquals(
                HttpStatus.UNPROCESSABLE_ENTITY,
                ex.getStatusCode()
        );
    }

    private byte[] crearPdfConTexto(String texto)
            throws Exception {

        try (PDDocument documento = new PDDocument();
             ByteArrayOutputStream salida =
                     new ByteArrayOutputStream()) {

            PDPage pagina = new PDPage();
            documento.addPage(pagina);

            PDType1Font fuente = new PDType1Font(
                    Standard14Fonts.FontName.HELVETICA
            );

            try (PDPageContentStream contenido =
                         new PDPageContentStream(
                                 documento,
                                 pagina
                         )) {

                contenido.beginText();
                contenido.setFont(fuente, 12);
                contenido.newLineAtOffset(50, 700);
                contenido.showText(texto);
                contenido.endText();
            }

            documento.save(salida);

            return salida.toByteArray();
        }
    }
}
