package cl.aquachile.backend.common.config;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class PasswordConfigTest {@Test void bcrypt() {var encoder=new PasswordConfig().passwordEncoder();String hash=encoder.encode("clave123");assertTrue(encoder.matches("clave123",hash));assertFalse(encoder.matches("otra",hash));}}
