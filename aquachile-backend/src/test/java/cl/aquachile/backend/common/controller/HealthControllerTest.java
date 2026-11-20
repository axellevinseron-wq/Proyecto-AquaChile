package cl.aquachile.backend.common.controller;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class HealthControllerTest { @Test void estado() {assertEquals("UP",new HealthController().health().get("status"));}}
