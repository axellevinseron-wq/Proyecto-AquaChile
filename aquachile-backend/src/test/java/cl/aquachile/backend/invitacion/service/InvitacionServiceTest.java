package cl.aquachile.backend.invitacion.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import cl.aquachile.backend.invitacion.dto.AceptarInvitacionRequest;
import cl.aquachile.backend.invitacion.dto.CrearInvitacionRequest;
import cl.aquachile.backend.invitacion.entity.Invitacion;
import cl.aquachile.backend.invitacion.repository.InvitacionRepository;
import cl.aquachile.backend.usuario.entity.Rol;
import cl.aquachile.backend.usuario.service.UsuarioService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InvitacionServiceTest {
    @Mock private InvitacionRepository invitaciones;
    @Mock private UsuarioService usuarios;
    @Mock private CorreoInvitacionService correo;
    private InvitacionService service;

    @BeforeEach
    void setUp() {
        service = new InvitacionService(invitaciones, usuarios, correo, "https://app.example/");
    }

    @Test
    void crearGuardaTokenHasheadoYDevuelveEnlaceDeRespaldo() {
        when(usuarios.existePorCorreo("persona@example.com")).thenReturn(false);
        when(invitaciones.existsByCorreoIgnoreCaseAndUsadaIsNullAndRevocadaIsNullAndExpiraAfter(
                eq("persona@example.com"), any(Instant.class))).thenReturn(false);
        when(invitaciones.save(any(Invitacion.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(correo.enviar(anyString(), anyString(), anyString())).thenReturn(false);

        var resultado = service.crear(new CrearInvitacionRequest(
                "Persona Ejemplo", " Persona@Example.com ", Rol.EVALUADOR), "admin@example.com");

        ArgumentCaptor<Invitacion> captor = ArgumentCaptor.forClass(Invitacion.class);
        verify(invitaciones).save(captor.capture());
        String token = resultado.enlace().substring(resultado.enlace().lastIndexOf('/') + 1);
        assertNotEquals(token, captor.getValue().tokenHash());
        assertEquals("persona@example.com", captor.getValue().correo());
        assertTrue(resultado.enlace().startsWith("https://app.example/invitacion/"));
        assertFalse(resultado.correoEnviado());
    }

    @Test
    void aceptarInvitacionCreaLaCuentaYMarcaElTokenComoUsado() throws Exception {
        String token = "token-unico-de-prueba";
        String tokenHash = HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        Invitacion invitacion = new Invitacion(java.util.UUID.randomUUID(), tokenHash,
                "Persona Ejemplo", "persona@example.com", Rol.EVALUADOR, "admin@example.com",
                Instant.now(), Instant.now().plusSeconds(3600));
        when(invitaciones.buscarPorHashParaActualizar(tokenHash)).thenReturn(Optional.of(invitacion));
        when(invitaciones.save(any(Invitacion.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.aceptar(token, new AceptarInvitacionRequest("una-clave-segura-123"));

        verify(usuarios).crear(argThat(request ->
                request.correo().equals("persona@example.com") && request.rol() == Rol.EVALUADOR));
        assertNotNull(invitacion.usada());
    }
}
