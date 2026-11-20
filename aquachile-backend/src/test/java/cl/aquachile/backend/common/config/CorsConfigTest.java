package cl.aquachile.backend.common.config;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class CorsConfigTest {

    // CorsRegistry exposes this method only to subclasses.
    static class InspectableCorsRegistry extends CorsRegistry {
        Map<String, CorsConfiguration> mappings() {
            return super.getCorsConfigurations();
        }
    }

    @Test
    void configuraRutasMetodosYOrigenes() {
        CorsConfig config = new CorsConfig();
        ReflectionTestUtils.setField(config, "origins", "http://localhost:5173,http://localhost:3000");

        InspectableCorsRegistry registry = new InspectableCorsRegistry();
        config.addCorsMappings(registry);

        Map<String, CorsConfiguration> mappings = registry.mappings();
        assertTrue(mappings.containsKey("/api/**"));
        CorsConfiguration cors = mappings.get("/api/**");
        assertNotNull(cors);
        assertEquals(2, cors.getAllowedOrigins().size());
        assertTrue(cors.getAllowedOrigins().contains("http://localhost:5173"));
        assertTrue(cors.getAllowedOrigins().contains("http://localhost:3000"));
        assertTrue(cors.getAllowedMethods().contains("DELETE"));
        assertTrue(cors.getAllowedMethods().contains("OPTIONS"));
    }
}
