package cl.aquachile.backend;

import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
@SecurityScheme(name="bearerAuth", type=SecuritySchemeType.HTTP, scheme="bearer", bearerFormat="JWT")
@SpringBootApplication public class AquachileBackendApplication {
 public static void main(String[] args){SpringApplication.run(AquachileBackendApplication.class,args);}
}
