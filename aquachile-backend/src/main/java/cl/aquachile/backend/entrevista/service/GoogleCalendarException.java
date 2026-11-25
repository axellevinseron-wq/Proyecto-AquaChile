package cl.aquachile.backend.entrevista.service;

public class GoogleCalendarException extends RuntimeException {
    private final int status;

    public GoogleCalendarException(String message, int status) {
        super(message);
        this.status = status;
    }

    public int status() { return status; }
}
