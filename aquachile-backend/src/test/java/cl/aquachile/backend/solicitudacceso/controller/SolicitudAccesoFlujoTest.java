package cl.aquachile.backend.solicitudacceso.controller;

import cl.aquachile.backend.solicitudacceso.entity.SolicitudAcceso;
import cl.aquachile.backend.solicitudacceso.repository.SolicitudAccesoRepository;
import cl.aquachile.backend.usuario.service.UsuarioService;
import cl.aquachile.backend.usuario.dto.CrearUsuarioRequest;
import cl.aquachile.backend.usuario.entity.Rol;
import jakarta.validation.Validation;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class SolicitudAccesoFlujoTest {
    final SolicitudAccesoRepository repo = mock(SolicitudAccesoRepository.class);
    final UsuarioService usuarios = mock(UsuarioService.class);
    final SolicitudAccesoAdminController admin = new SolicitudAccesoAdminController(repo, usuarios);
    final SolicitudAcceso s = new SolicitudAcceso("Ana", "Prueba", "12.345.678-5", "+56912345678", "ana@example.test", "ana", "Evaluar", "CODIGO");
    final byte[] pdf = "%PDF-1.4 prueba".getBytes(java.nio.charset.StandardCharsets.UTF_8);
    final String json = "{\"nombre\":\"Ana\",\"apellido\":\"Prueba\",\"rut\":\"12.345.678-5\",\"telefono\":\"+56912345678\",\"correo\":\"ANA@example.test\",\"usuarioSolicitado\":\"ana\",\"motivo\":\"Evaluar\"}";
    @BeforeEach void preparar() {
        when(repo.findById(s.getId())).thenReturn(Optional.of(s));
        when(repo.save(any(SolicitudAcceso.class))).thenAnswer(i -> i.getArgument(0));
    }
    MockMultipartFile archivo(String nombre, byte[] bytes) { return new MockMultipartFile("cv", nombre, "application/pdf", bytes); }
    void error(HttpStatus estado, org.junit.jupiter.api.function.Executable accion) {
        assertEquals(estado, assertThrows(ResponseStatusException.class, accion).getStatusCode());
    }
    @Test void registrarYConsultar() throws Exception {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var publico = new SolicitudAccesoController(repo, factory.getValidator());
            when(repo.existsByCodigoSeguimiento(anyString())).thenReturn(true, false);
            var resultado = publico.crear(json, archivo("../mi cv.pdf", pdf));
            var captor = org.mockito.ArgumentCaptor.forClass(SolicitudAcceso.class);
            verify(repo).save(captor.capture());
            var guardada = captor.getValue();
            assertEquals("ana@example.test", guardada.getCorreo());
            assertEquals("mi_cv.pdf", guardada.getCvNombre());
            assertArrayEquals(pdf, guardada.getCvPdf());
            assertEquals("PENDIENTE", resultado.get("estado"));
            assertEquals(guardada.getCodigoSeguimiento(), resultado.get("codigoSeguimiento"));
            assertEquals(32, guardada.getCodigoSeguimiento().length());
            when(repo.findByCorreoIgnoreCaseAndCodigoSeguimiento(guardada.getCorreo(), guardada.getCodigoSeguimiento())).thenReturn(Optional.of(guardada));
            var consulta = publico.consultar(Map.of("correo", guardada.getCorreo(), "codigoSeguimiento", guardada.getCodigoSeguimiento()));
            assertEquals("PENDIENTE", consulta.get("estado"));
            assertFalse(consulta.containsKey("cvPdf"));
            error(HttpStatus.NOT_FOUND, () -> publico.consultar(Map.of()));
        }
    }
    @Test void rechazarDatosInvalidos() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var c = new SolicitudAccesoController(repo, factory.getValidator());
            for (String datos : List.of("{", "{}", json.replace("12.345.678-5", "12.345.678-0"), json.replace("12.345.678-5", "abc"), json.replace("+56912345678", "abc"), json.replace("\"ana\"", "\"ana prueba\""))) {
                error(HttpStatus.BAD_REQUEST, () -> c.crear(datos, archivo("cv.pdf", pdf)));
            }
            error(HttpStatus.BAD_REQUEST, () -> c.crear(json, archivo("cv.pdf", new byte[0])));
            error(HttpStatus.BAD_REQUEST, () -> c.crear(json, archivo("cv.pdf", new byte[10*1024*1024+1])));
            error(HttpStatus.BAD_REQUEST, () -> c.crear(json, archivo("cv.pdf", "no es pdf".getBytes())));
            error(HttpStatus.BAD_REQUEST, () -> c.crear(json, archivo("cv.txt", pdf)));
            verify(repo, never()).save(any());
        }
    }
    @Test void listarComentarDescargarYRechazar() {
        when(repo.findAll()).thenReturn(List.of(s));
        assertEquals(s.getId(), admin.listar().getFirst().id());
        assertEquals("Respuesta", admin.comentar(s.getId(), new SolicitudAccesoAdminController.ComentarioRequest(" Respuesta ")).comentarioAdministrador());
        error(HttpStatus.BAD_REQUEST, () -> admin.comentar(s.getId(), new SolicitudAccesoAdminController.ComentarioRequest(" ")));
        error(HttpStatus.BAD_REQUEST, () -> admin.comentar(s.getId(), new SolicitudAccesoAdminController.ComentarioRequest("x".repeat(4001))));
        error(HttpStatus.NOT_FOUND, () -> admin.descargarCv(s.getId()));
        s.adjuntarCv("cv.pdf", pdf);
        assertArrayEquals(pdf, admin.descargarCv(s.getId()).getBody());
        assertEquals("RECHAZADA", admin.estado(s.getId(), new SolicitudAccesoAdminController.EstadoRequest("RECHAZADA")).estado());
        error(HttpStatus.CONFLICT, () -> admin.aprobar(s.getId(), new SolicitudAccesoAdminController.AprobarRequest(Rol.EVALUADOR)));
        error(HttpStatus.BAD_REQUEST, () -> admin.estado(s.getId(), new SolicitudAccesoAdminController.EstadoRequest("ACEPTADA")));
        error(HttpStatus.BAD_REQUEST, () -> admin.estado(s.getId(), new SolicitudAccesoAdminController.EstadoRequest("INVALIDO")));
        error(HttpStatus.NOT_FOUND, () -> admin.descargarCv(UUID.randomUUID()));
    }
    @Test void aprobarCuentaYProtegerRoles() {
        error(HttpStatus.BAD_REQUEST, () -> admin.aprobar(s.getId(), null));
        error(HttpStatus.BAD_REQUEST, () -> admin.aprobar(s.getId(), new SolicitudAccesoAdminController.AprobarRequest(Rol.ADMIN)));
        when(usuarios.existePorCorreo(s.getCorreo())).thenReturn(true, false);
        var solicitud = new SolicitudAccesoAdminController.AprobarRequest(Rol.EVALUADOR);
        error(HttpStatus.CONFLICT, () -> admin.aprobar(s.getId(), solicitud));
        var respuesta = admin.aprobar(s.getId(), solicitud);
        assertEquals("ACEPTADA", respuesta.solicitud().estado());
        assertEquals(32, respuesta.passwordTemporal().length());
        verify(usuarios).crear(new CrearUsuarioRequest("Ana Prueba", s.getCorreo(), respuesta.passwordTemporal(), Rol.EVALUADOR));
        error(HttpStatus.CONFLICT, () -> admin.estado(s.getId(), new SolicitudAccesoAdminController.EstadoRequest("PENDIENTE")));
    }
}
