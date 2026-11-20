package cl.aquachile.backend.common.exception;

import org.springframework.http.*;import org.springframework.web.bind.annotation.*;import org.springframework.web.bind.MethodArgumentNotValidException;import org.springframework.web.server.ResponseStatusException;import jakarta.servlet.http.HttpServletRequest;import java.time.Instant;import java.util.*;
@RestControllerAdvice public class GlobalExceptionHandler {
 @ExceptionHandler(ResponseStatusException.class) public ResponseEntity<Map<String,Object>> status(ResponseStatusException ex,HttpServletRequest req){return ResponseEntity.status(ex.getStatusCode()).body(Map.of("timestamp",Instant.now().toString(),"status",ex.getStatusCode().value(),"message",Objects.toString(ex.getReason(),"Error"),"path",req.getRequestURI()));}
 @ExceptionHandler(MethodArgumentNotValidException.class) public ResponseEntity<Map<String,Object>> validation(MethodArgumentNotValidException ex,HttpServletRequest req){Map<String,Object> body=new LinkedHashMap<>();body.put("timestamp",Instant.now().toString());body.put("status",400);body.put("message","Datos invalidos");body.put("path",req.getRequestURI());body.put("errors",ex.getBindingResult().getFieldErrors().stream().map(e->Map.of("field",e.getField(),"message",Objects.toString(e.getDefaultMessage(),"Invalido"))).toList());return ResponseEntity.badRequest().body(body);}
}
