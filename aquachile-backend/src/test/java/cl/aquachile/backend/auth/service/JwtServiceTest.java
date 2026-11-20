package cl.aquachile.backend.auth.service;
import cl.aquachile.backend.usuario.entity.Rol;
import org.junit.jupiter.api.Test;
import java.util.Base64;
import static org.junit.jupiter.api.Assertions.*;
class JwtServiceTest {
 final String secret=Base64.getEncoder().encodeToString("01234567890123456789012345678901".getBytes());
 @Test void tokenValido(){var jwt=new JwtService(secret,60000);var token=jwt.generarToken("ana@cl.cl",Rol.ADMIN);assertTrue(jwt.validarToken(token));assertEquals("ana@cl.cl",jwt.obtenerCorreo(token));assertEquals(60000,jwt.obtenerExpiracion());}
 @Test void tokenInvalido(){var jwt=new JwtService(secret,60000);assertFalse(jwt.validarToken("invalido"));}
 @Test void claveCorta(){assertThrows(IllegalArgumentException.class,()->new JwtService(Base64.getEncoder().encodeToString("corta".getBytes()),60000));}
}
