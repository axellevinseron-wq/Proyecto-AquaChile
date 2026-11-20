
package cl.aquachile.backend.ia.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;

@Service
public class PdfTextoService {

    public String extraerTexto(byte[] contenido) {

        if (contenido == null || contenido.length == 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El PDF esta vacio"
            );
        }

        try (var documento = Loader.loadPDF(contenido)) {

            String texto = new PDFTextStripper().getText(documento);

            if (texto == null || texto.isBlank()) {
                throw new ResponseStatusException(
                        HttpStatus.UNPROCESSABLE_ENTITY,
                        "El PDF no contiene texto extraible"
                );
            }

            return texto.strip();

        } catch (ResponseStatusException ex) {
            throw ex;

        } catch (IOException ex) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "No fue posible leer el PDF"
            );
        }
    }
}
