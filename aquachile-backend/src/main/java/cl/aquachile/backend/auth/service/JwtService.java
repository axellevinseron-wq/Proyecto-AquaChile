package cl.aquachile.backend.auth.service;

import cl.aquachile.backend.usuario.entity.Rol;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.util.Date;

@Service
public class JwtService {
    private final SecretKey clave;
    private final long expiracion;

    public JwtService(@Value("${app.jwt.secret}") String secreto,
                      @Value("${app.jwt.expiration}") long expiracion) {
        byte[] bytes = Decoders.BASE64.decode(secreto);
        if (bytes.length < 32) throw new IllegalArgumentException("JWT_SECRET requiere al menos 32 bytes");
        this.clave = Keys.hmacShaKeyFor(bytes);
        this.expiracion = expiracion;
    }

    public String generarToken(String correo, Rol rol) {
        Date ahora = new Date();
        return Jwts.builder()
                .subject(correo)
                .claim("rol", rol.name())
                .issuedAt(ahora)
                .expiration(new Date(ahora.getTime() + expiracion))
                .signWith(clave)
                .compact();
    }

    public String obtenerCorreo(String token) {
        return claims(token).getSubject();
    }

    public boolean validarToken(String token) {
        try {
            return obtenerCorreo(token) != null;
        } catch (Exception ex) {
            return false;
        }
    }

    public long obtenerExpiracion() {
        return expiracion;
    }

    private Claims claims(String token) {
        return Jwts.parser().verifyWith(clave).build()
                .parseSignedClaims(token).getPayload();
    }
}
