package cl.aquachile.backend.ia.controller;

import cl.aquachile.backend.archivo.entity.CvAdjunto;
import cl.aquachile.backend.archivo.repository.CvAdjuntoRepository;
import cl.aquachile.backend.ia.service.IaService;
import cl.aquachile.backend.ia.service.PdfTextoService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.AdditionalMatchers.aryEq;

class IaCvControllerTest {

    @TempDir
    Path carpetaTemporal;

    private CvAdjuntoRepository adjuntos;
    private PdfTextoService pdfTextoService;
    private IaService iaService;
    private IaCvController controller;

    private UUID postulacionId;

    @BeforeEach
    void configurar() {

        adjuntos = mock(CvAdjuntoRepository.class);
        pdfTextoService = mock(PdfTextoService.class);
        iaService = mock(IaService.class);

        controller = new IaCvController(
                adjuntos,
                pdfTextoService,
                iaService,
                carpetaTemporal.toString()
        );

        postulacionId = UUID.randomUUID();
    }

    @Test
    void debeAnalizarCvPdfValido() throws Exception {

        byte[] contenido = "PDF ficticio"
                .getBytes(StandardCharsets.UTF_8);

        Files.write(
                carpetaTemporal.resolve("cv.pdf"),
                contenido
        );

        configurarCv("cv.pdf");

        when(pdfTextoService.extraerTexto(any(byte[].class)))
                .thenReturn("Experiencia en Java");

        Map<String, Object> respuesta = Map.of(
                "modo", "MODELO_REAL",
                "proveedor", "GROQ",
                "resultado", "Preguntas de entrevista",
                "revisionHumanaObligatoria", true
        );

        when(iaService.analizar("Experiencia en Java"))
                .thenReturn(respuesta);

        Map<String, Object> resultado =
                controller.analizarCv(postulacionId);

        assertEquals("MODELO_REAL", resultado.get("modo"));
        assertEquals("GROQ", resultado.get("proveedor"));
        assertEquals(
                "Preguntas de entrevista",
                resultado.get("resultado")
        );

        verify(pdfTextoService).extraerTexto(
                aryEq(contenido)
        );

        verify(iaService).analizar("Experiencia en Java");
    }

    @Test
    void debeRechazarPostulacionSinCv() {

        when(adjuntos.findByPostulacionId(postulacionId))
                .thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> controller.analizarCv(postulacionId)
        );

        assertEquals(
                HttpStatus.NOT_FOUND,
                ex.getStatusCode()
        );

        verifyNoInteractions(pdfTextoService, iaService);
    }

    @Test
    void debeRechazarRutaFueraDeUploads() {

        configurarCv("../archivo-externo.pdf");

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> controller.analizarCv(postulacionId)
        );

        assertEquals(
                HttpStatus.FORBIDDEN,
                ex.getStatusCode()
        );

        verifyNoInteractions(pdfTextoService, iaService);
    }

    @Test
    void debeRechazarArchivoQueNoEsPdf() {

        configurarCv("curriculum.docx");

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> controller.analizarCv(postulacionId)
        );

        assertEquals(
                HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                ex.getStatusCode()
        );

        verifyNoInteractions(pdfTextoService, iaService);
    }

    @Test
    void debeRechazarArchivoPdfInexistente() {

        configurarCv("no-existe.pdf");

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> controller.analizarCv(postulacionId)
        );

        assertEquals(
                HttpStatus.NOT_FOUND,
                ex.getStatusCode()
        );

        verifyNoInteractions(pdfTextoService, iaService);
    }

    @Test
    void debeLimitarTextoA3000Caracteres() throws Exception {

        Files.write(
                carpetaTemporal.resolve("extenso.pdf"),
                new byte[]{1, 2, 3}
        );

        configurarCv("extenso.pdf");

        String textoExtenso = "A".repeat(3500);
        String textoEsperado = "A".repeat(3000);

        when(pdfTextoService.extraerTexto(any(byte[].class)))
                .thenReturn(textoExtenso);

        when(iaService.analizar(textoEsperado))
                .thenReturn(Map.of(
                        "modo", "MODELO_REAL"
                ));

        Map<String, Object> resultado =
                controller.analizarCv(postulacionId);

        assertEquals("MODELO_REAL", resultado.get("modo"));

        verify(iaService).analizar(textoEsperado);
    }

    private void configurarCv(String rutaRelativa) {

        CvAdjunto cv = new CvAdjunto(
                UUID.randomUUID(),
                postulacionId,
                "curriculum.pdf",
                rutaRelativa
        );

        when(adjuntos.findByPostulacionId(postulacionId))
                .thenReturn(Optional.of(cv));
    }
}
